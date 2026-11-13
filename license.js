'use strict';
/**
 * StoreLift Pro licensing (Lemon Squeezy License API).
 *
 * The License API is public (no API key) and CORS-enabled, so the extension
 * talks to it directly; there is no StoreLift server. Only the licence key and
 * a random per-browser instance name are sent. The stored record never holds
 * the buyer's name or email.
 *
 * Every function takes `deps` = { fetch, storage, config, now, instanceName }
 * so the logic runs unchanged under Node tests.
 */
(function (root) {
  const STORAGE_KEY = 'storeliftLicense';
  const DAY = 24 * 60 * 60 * 1000;
  const REVALIDATE_AFTER = 7 * DAY;   // re-check with Lemon Squeezy weekly
  const OFFLINE_GRACE = 30 * DAY;     // keep Pro if the API is unreachable
  const TIMEOUT = 10000;

  // The single place that defines what Pro unlocks.
  const PLANS = Object.freeze({
    free: Object.freeze({ name: 'Free', pagesPerSession: 3, openTabAudit: false, linkCheck: false, agencyReport: false, export: false }),
    pro: Object.freeze({ name: 'Pro', pagesPerSession: 20, openTabAudit: true, linkCheck: true, agencyReport: true, export: true })
  });

  class LicenseError extends Error {
    constructor(message, transient = false) { super(message); this.name = 'LicenseError'; this.transient = transient; }
  }

  function normalizeKey(raw) {
    const key = String(raw ?? '').trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) throw new LicenseError('Enter the licence key from your purchase email (letters, numbers and dashes).');
    return key;
  }
  function isConfigured(cfg) {
    return Boolean(cfg) && Number.isInteger(cfg.storeId) && cfg.storeId > 0
      && Array.isArray(cfg.productIds) && cfg.productIds.length > 0 && cfg.productIds.every(Number.isInteger)
      && /^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/(buy|checkout)\/[A-Za-z0-9-]+/.test(cfg.checkoutUrl || '');
  }
  function matchesProduct(meta, cfg) {
    return Boolean(meta) && meta.store_id === cfg.storeId && cfg.productIds.includes(meta.product_id);
  }
  function isPro(lic, now) {
    if (!lic || lic.status !== 'active' || !Number.isFinite(lic.validatedAt)) return false;
    if (now - lic.validatedAt > OFFLINE_GRACE) return false;
    return !lic.expiresAt || Date.parse(lic.expiresAt) > now;
  }
  const planFor = (lic, now) => (isPro(lic, now) ? PLANS.pro : PLANS.free);
  const needsRevalidation = (lic, now) => Boolean(lic?.instanceId) && now - (lic.validatedAt || 0) >= REVALIDATE_AFTER;

  function friendly(error) {
    const e = String(error || '').toLowerCase();
    if (e.includes('not found')) return 'That licence key was not found. Check it against your purchase email.';
    if (e.includes('activation limit')) return 'This key is already active on its maximum number of browsers. Deactivate it in another browser first, or contact support.';
    if (e.includes('expired')) return 'This licence has expired. Renew it to keep using Pro.';
    if (e.includes('disabled')) return 'This licence has been disabled (for example after a refund). Contact support if this is a mistake.';
    return 'The licence could not be activated' + (error ? `: ${String(error).slice(0, 120)}` : '.');
  }

  async function call(deps, action, params) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    let res;
    try {
      res = await deps.fetch(`${deps.config.apiBase}/${action}`, {
        method: 'POST', headers: { Accept: 'application/json' }, body: new URLSearchParams(params),
        credentials: 'omit', cache: 'no-store', signal: controller.signal
      });
    } catch { throw new LicenseError('Could not reach the licence server. Check your connection and try again.', true); }
    finally { clearTimeout(timer); }
    if (res.status === 429 || res.status >= 500) throw new LicenseError('The licence server is busy. Try again in a minute.', true);
    try { return await res.json(); } catch { throw new LicenseError('Unexpected reply from the licence server.', true); }
  }

  async function load(deps) {
    const stored = await deps.storage.get(STORAGE_KEY);
    const lic = stored?.[STORAGE_KEY];
    return lic && typeof lic.key === 'string' ? lic : null;
  }
  async function save(deps, lic) { await deps.storage.set({ [STORAGE_KEY]: lic }); return lic; }

  async function activate(deps, rawKey) {
    if (!isConfigured(deps.config)) throw new LicenseError('StoreLift Pro is not on sale yet.');
    const key = normalizeKey(rawKey);
    const data = await call(deps, 'activate', { license_key: key, instance_name: deps.instanceName });
    if (!data?.activated || !data.instance?.id) throw new LicenseError(friendly(data?.error));
    if (!matchesProduct(data.meta, deps.config)) {
      // A key from someone else's Lemon Squeezy store: give the seat back.
      await call(deps, 'deactivate', { license_key: key, instance_id: data.instance.id }).catch(() => {});
      throw new LicenseError('This key is not a StoreLift Pro licence.');
    }
    return save(deps, {
      key, instanceId: data.instance.id, status: data.license_key?.status || 'active',
      expiresAt: data.license_key?.expires_at || null, validatedAt: deps.now(),
      variantName: String(data.meta.variant_name || '').slice(0, 80)
    });
  }

  async function revalidate(deps, lic) {
    let data;
    try { data = await call(deps, 'validate', { license_key: lic.key, instance_id: lic.instanceId }); }
    catch (e) { if (e.transient) return lic; throw e; }   // offline: keep the grace period running
    const ok = data?.valid && matchesProduct(data.meta, deps.config);
    return save(deps, {
      ...lic,
      status: ok ? (data.license_key?.status || 'active') : (data?.license_key?.status && data.license_key.status !== 'active' ? data.license_key.status : 'invalid'),
      expiresAt: data?.license_key?.expires_at ?? lic.expiresAt ?? null,
      validatedAt: ok ? deps.now() : lic.validatedAt,
      error: ok ? undefined : friendly(data?.error || data?.license_key?.status)
    });
  }

  /** Stored licence, refreshed against the API when a weekly check is due. */
  async function current(deps) {
    const lic = await load(deps);
    if (lic && needsRevalidation(lic, deps.now()) && isConfigured(deps.config)) return revalidate(deps, lic);
    return lic;
  }

  /** Frees this browser's seat and forgets the key. Returns false if the seat could not be freed remotely. */
  async function deactivate(deps) {
    const lic = await load(deps);
    let freed = true;
    if (lic?.instanceId) {
      try { const data = await call(deps, 'deactivate', { license_key: lic.key, instance_id: lic.instanceId }); freed = Boolean(data?.deactivated); }
      catch { freed = false; }
    }
    await deps.storage.remove(STORAGE_KEY);
    return freed;
  }

  function browserDeps() {
    return {
      fetch: (...a) => fetch(...a),
      storage: chrome.storage.local,
      config: root.StoreLiftLicenseConfig,
      now: () => Date.now(),
      instanceName: 'StoreLift Chrome ' + (root.crypto?.randomUUID?.().slice(0, 8) || Date.now().toString(36))
    };
  }

  root.StoreLiftLicense = {
    STORAGE_KEY, PLANS, REVALIDATE_AFTER, OFFLINE_GRACE, LicenseError,
    normalizeKey, isConfigured, matchesProduct, isPro, planFor, needsRevalidation,
    load, activate, revalidate, current, deactivate, browserDeps
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.StoreLiftLicense;
})(typeof globalThis !== 'undefined' ? globalThis : this);
