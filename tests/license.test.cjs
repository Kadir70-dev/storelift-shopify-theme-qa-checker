'use strict';
/**
 * StoreLift license.js tests — Node.js, no network (fetch is mocked).
 * Run: node tests/license.test.cjs
 */
const assert = require('assert');
const L = require('../license.js');

let passed = 0, failed = 0;
const queue = [];
async function test(label, fn) {
  try { await fn(); passed++; console.log('  PASS', label); }
  catch (e) { failed++; console.error('  FAIL', label, '\n       ', e.message); }
}
const t = (label, fn) => queue.push([label, fn]);

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-12T10:00:00Z');
const KEY = '38B1460A-5104-4067-A91D-77B872934D51';
const CONFIG = Object.freeze({
  apiBase: 'https://api.lemonsqueezy.com/v1/licenses', storeId: 111, productIds: [222],
  checkoutUrl: 'https://storelift.lemonsqueezy.com/buy/abc-123'
});
const META = { store_id: 111, product_id: 222, variant_name: 'Pro', customer_email: 'buyer@example.com', customer_name: 'Buyer' };

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    async get(k) { return k in data ? { [k]: data[k] } : {}; },
    async set(obj) { Object.assign(data, obj); },
    async remove(k) { delete data[k]; }
  };
}
/** Mock fetch: replies[action] is a body object, an Error to throw, or {status, body}. */
function mockFetch(replies) {
  const calls = [];
  const fn = async (url, init) => {
    const action = url.split('/').pop();
    calls.push({ action, url, init, params: Object.fromEntries(init.body) });
    const r = replies[action];
    if (r instanceof Error) throw r;
    const status = r && r.status ? r.status : 200;
    const body = r && r.status ? r.body : r;
    return { status, json: async () => { if (body === undefined) throw Error('no json'); return body; } };
  };
  fn.calls = calls;
  return fn;
}
function deps(replies, storage = memoryStorage(), config = CONFIG, now = NOW) {
  return { fetch: mockFetch(replies), storage, config, now: () => now, instanceName: 'StoreLift Chrome test' };
}
const activeLic = (over = {}) => ({ key: KEY, instanceId: 'inst-1', status: 'active', expiresAt: null, validatedAt: NOW, ...over });

console.log('\n=== plans & pure helpers ===');
t('free plan locks the four Pro features', () => {
  const f = L.PLANS.free;
  assert.deepStrictEqual([f.openTabAudit, f.linkCheck, f.agencyReport, f.export], [false, false, false, false]);
  assert.strictEqual(f.pagesPerSession, 3);
});
t('pro plan unlocks them with 20 pages', () => {
  const p = L.PLANS.pro;
  assert.ok(p.openTabAudit && p.linkCheck && p.agencyReport && p.export);
  assert.strictEqual(p.pagesPerSession, 20);
});
t('plans are frozen', () => assert.ok(Object.isFrozen(L.PLANS.free) && Object.isFrozen(L.PLANS.pro)));
t('normalizeKey trims', () => assert.strictEqual(L.normalizeKey(`  ${KEY} \n`), KEY));
t('normalizeKey rejects junk', () => assert.throws(() => L.normalizeKey('abc def<script>'), L.LicenseError));
t('normalizeKey rejects empty', () => assert.throws(() => L.normalizeKey(''), /licence key/));
t('normalizeKey rejects over 64 chars', () => assert.throws(() => L.normalizeKey('a'.repeat(65))));
t('isConfigured false for shipped placeholder', () => assert.strictEqual(L.isConfigured({ storeId: null, productIds: [], checkoutUrl: '' }), false));
t('isConfigured true for full config', () => assert.strictEqual(L.isConfigured(CONFIG), true));
t('isConfigured rejects non-Lemon checkout', () => assert.strictEqual(L.isConfigured({ ...CONFIG, checkoutUrl: 'https://evil.example/buy/x' }), false));
t('matchesProduct needs store and product', () => {
  assert.ok(L.matchesProduct(META, CONFIG));
  assert.ok(!L.matchesProduct({ ...META, store_id: 999 }, CONFIG));
  assert.ok(!L.matchesProduct({ ...META, product_id: 999 }, CONFIG));
  assert.ok(!L.matchesProduct(null, CONFIG));
});
t('isPro for fresh active licence', () => assert.ok(L.isPro(activeLic(), NOW)));
t('isPro false with no licence', () => assert.ok(!L.isPro(null, NOW)));
t('isPro false when disabled', () => assert.ok(!L.isPro(activeLic({ status: 'disabled' }), NOW)));
t('isPro false after expiry date', () => assert.ok(!L.isPro(activeLic({ expiresAt: '2026-11-01T00:00:00Z' }), NOW)));
t('isPro true before expiry date', () => assert.ok(L.isPro(activeLic({ expiresAt: '2027-11-01T00:00:00Z' }), NOW)));
t('isPro keeps 29-day-old check (offline grace)', () => assert.ok(L.isPro(activeLic({ validatedAt: NOW - 29 * DAY }), NOW)));
t('isPro drops after 31 days without a check', () => assert.ok(!L.isPro(activeLic({ validatedAt: NOW - 31 * DAY }), NOW)));
t('planFor maps to plan objects', () => {
  assert.strictEqual(L.planFor(activeLic(), NOW), L.PLANS.pro);
  assert.strictEqual(L.planFor(null, NOW), L.PLANS.free);
});
t('needsRevalidation after 7 days only', () => {
  assert.ok(!L.needsRevalidation(activeLic({ validatedAt: NOW - 6 * DAY }), NOW));
  assert.ok(L.needsRevalidation(activeLic({ validatedAt: NOW - 7 * DAY }), NOW));
});

console.log('\n=== activate ===');
t('activate stores licence without buyer name/email', async () => {
  const d = deps({ activate: { activated: true, error: null, license_key: { status: 'active', expires_at: null }, instance: { id: 'inst-9' }, meta: META } });
  const lic = await L.activate(d, KEY);
  assert.strictEqual(lic.instanceId, 'inst-9');
  assert.strictEqual(lic.validatedAt, NOW);
  const stored = d.storage.data[L.STORAGE_KEY];
  assert.ok(stored && stored.key === KEY);
  assert.ok(!JSON.stringify(stored).includes('buyer@example.com') && !JSON.stringify(stored).includes('Buyer"'));
});
t('activate sends only key + instance name, no cookies, POST', async () => {
  const d = deps({ activate: { activated: true, license_key: { status: 'active' }, instance: { id: 'i' }, meta: META } });
  await L.activate(d, KEY);
  const c = d.fetch.calls[0];
  assert.strictEqual(c.url, 'https://api.lemonsqueezy.com/v1/licenses/activate');
  assert.strictEqual(c.init.method, 'POST');
  assert.strictEqual(c.init.credentials, 'omit');
  assert.deepStrictEqual(Object.keys(c.params).sort(), ['instance_name', 'license_key']);
});
t('activate refuses when store not configured (no network)', async () => {
  const d = deps({}, memoryStorage(), { ...CONFIG, storeId: null });
  await assert.rejects(L.activate(d, KEY), /not on sale/);
  assert.strictEqual(d.fetch.calls.length, 0);
});
t('activate maps not-found error', async () => {
  const d = deps({ activate: { status: 404, body: { activated: false, error: 'license_key not found.' } } });
  await assert.rejects(L.activate(d, KEY), /not found/);
});
t('activate maps activation limit error', async () => {
  const d = deps({ activate: { status: 400, body: { activated: false, error: 'This license key has reached the activation limit.' } } });
  await assert.rejects(L.activate(d, KEY), /maximum number of browsers/);
});
t('activate rejects key from another store and frees the seat', async () => {
  const d = deps({ activate: { activated: true, license_key: { status: 'active' }, instance: { id: 'x' }, meta: { ...META, store_id: 5 } }, deactivate: { deactivated: true } });
  await assert.rejects(L.activate(d, KEY), /not a StoreLift Pro licence/);
  assert.deepStrictEqual(d.fetch.calls.map(c => c.action), ['activate', 'deactivate']);
  assert.strictEqual(d.storage.data[L.STORAGE_KEY], undefined);
});
t('activate network failure is transient and stores nothing', async () => {
  const d = deps({ activate: new TypeError('Failed to fetch') });
  await assert.rejects(L.activate(d, KEY), e => e.transient === true);
  assert.strictEqual(d.storage.data[L.STORAGE_KEY], undefined);
});
t('activate 500 is transient', async () => {
  const d = deps({ activate: { status: 503, body: {} } });
  await assert.rejects(L.activate(d, KEY), e => e.transient === true);
});

console.log('\n=== revalidate / current ===');
t('revalidate success refreshes validatedAt', async () => {
  const d = deps({ validate: { valid: true, license_key: { status: 'active', expires_at: null }, meta: META } }, memoryStorage(), CONFIG, NOW + 8 * DAY);
  const lic = await L.revalidate(d, activeLic());
  assert.strictEqual(lic.validatedAt, NOW + 8 * DAY);
  assert.ok(L.isPro(lic, NOW + 8 * DAY));
});
t('revalidate sends instance_id', async () => {
  const d = deps({ validate: { valid: true, license_key: { status: 'active' }, meta: META } });
  await L.revalidate(d, activeLic());
  assert.strictEqual(d.fetch.calls[0].params.instance_id, 'inst-1');
});
t('revalidate refunded/disabled key drops Pro', async () => {
  const d = deps({ validate: { valid: false, error: null, license_key: { status: 'disabled' }, meta: META } });
  const lic = await L.revalidate(d, activeLic());
  assert.strictEqual(lic.status, 'disabled');
  assert.ok(!L.isPro(lic, NOW));
});
t('revalidate unknown key becomes invalid', async () => {
  const d = deps({ validate: { status: 404, body: { valid: false, error: 'license_key not found.' } } });
  const lic = await L.revalidate(d, activeLic());
  assert.strictEqual(lic.status, 'invalid');
  assert.ok(!L.isPro(lic, NOW));
});
t('revalidate offline keeps licence unchanged', async () => {
  const before = activeLic({ validatedAt: NOW - 10 * DAY });
  const d = deps({ validate: new TypeError('offline') });
  const lic = await L.revalidate(d, before);
  assert.deepStrictEqual(lic, before);
  assert.ok(L.isPro(lic, NOW));
});
t('current skips network when check is fresh', async () => {
  const d = deps({}, memoryStorage({ [L.STORAGE_KEY]: activeLic({ validatedAt: NOW - DAY }) }));
  await L.current(d);
  assert.strictEqual(d.fetch.calls.length, 0);
});
t('current revalidates when a week old', async () => {
  const d = deps({ validate: { valid: true, license_key: { status: 'active' }, meta: META } }, memoryStorage({ [L.STORAGE_KEY]: activeLic({ validatedAt: NOW - 8 * DAY }) }));
  const lic = await L.current(d);
  assert.strictEqual(d.fetch.calls.length, 1);
  assert.strictEqual(lic.validatedAt, NOW);
});
t('current ignores malformed stored record', async () => {
  const d = deps({}, memoryStorage({ [L.STORAGE_KEY]: { key: 42 } }));
  assert.strictEqual(await L.current(d), null);
});

console.log('\n=== deactivate ===');
t('deactivate frees seat and clears storage', async () => {
  const d = deps({ deactivate: { deactivated: true } }, memoryStorage({ [L.STORAGE_KEY]: activeLic() }));
  assert.strictEqual(await L.deactivate(d), true);
  assert.strictEqual(d.storage.data[L.STORAGE_KEY], undefined);
});
t('deactivate offline still clears locally, reports seat not freed', async () => {
  const d = deps({ deactivate: new TypeError('offline') }, memoryStorage({ [L.STORAGE_KEY]: activeLic() }));
  assert.strictEqual(await L.deactivate(d), false);
  assert.strictEqual(d.storage.data[L.STORAGE_KEY], undefined);
});

(async () => {
  for (const [label, fn] of queue) await test(label, fn);
  console.log(`\nlicense.js: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
