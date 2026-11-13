'use strict';
const $ = id => document.getElementById(id);
const L = globalThis.StoreLiftLicense;
const cfg = globalThis.StoreLiftLicenseConfig;
const deps = L.browserDeps();
const say = text => { $('result').textContent = text; };
const mask = key => key.length > 8 ? '••••' + key.slice(-6) : '••••';
const STATUS = { active: 'Active', inactive: 'Inactive', expired: 'Expired', disabled: 'Disabled', invalid: 'Not valid' };

function render(lic) {
  const pro = L.isPro(lic, Date.now());
  $('plan-line').textContent = pro
    ? `You're on StoreLift Pro${lic.variantName ? ` (${lic.variantName})` : ''}. Thank you!`
    : 'You are on the Free plan.';
  $('active-box').classList.toggle('hidden', !lic);
  $('activate-box').classList.toggle('hidden', pro);
  if (lic) {
    $('lic-status').textContent = (STATUS[lic.status] || lic.status) + (lic.expiresAt ? ` · until ${new Date(lic.expiresAt).toLocaleDateString()}` : '');
    $('lic-key').textContent = mask(lic.key);
    $('lic-checked').textContent = lic.validatedAt ? new Date(lic.validatedAt).toLocaleString() : '—';
    if (!pro && lic.error) say(lic.error);
  }
}
async function guarded(button, task) {
  button.disabled = true;
  try { await task(); }
  catch (e) { say(e instanceof L.LicenseError ? e.message : 'Something went wrong: ' + (e.message || e)); }
  finally { button.disabled = false; }
}

$('free-pages').textContent = L.PLANS.free.pagesPerSession;
$('pro-pages').textContent = L.PLANS.pro.pagesPerSession;
$('price').textContent = cfg.priceLabel || '';
for (const id of ['terms', 'refund', 'privacy']) $(id).href = cfg[id + 'Url'];
$('manage').href = cfg.manageUrl;
if (!L.isConfigured(cfg)) {
  $('buy').disabled = true; $('activate').disabled = true;
  $('price').textContent = 'StoreLift Pro is not on sale yet.';
}

$('buy').addEventListener('click', () => { if (L.isConfigured(cfg)) chrome.tabs.create({ url: cfg.checkoutUrl }); });
$('activate').addEventListener('click', () => guarded($('activate'), async () => {
  say('Activating…');
  const lic = await L.activate(deps, $('key').value);
  $('key').value = '';
  render(lic);
  say('Pro is active on this browser. Reopen StoreLift to use it.');
}));
$('recheck').addEventListener('click', () => guarded($('recheck'), async () => {
  const lic = await L.load(deps);
  if (!lic) return render(null);
  say('Checking…');
  const next = await L.revalidate(deps, lic);
  render(next);
  if (L.isPro(next, Date.now())) say(next.validatedAt === lic.validatedAt ? 'Could not reach the licence server; Pro stays active during the offline grace period.' : 'Licence confirmed.');
}));
$('deactivate').addEventListener('click', () => guarded($('deactivate'), async () => {
  if (!confirm('Remove StoreLift Pro from this browser? You can activate the same key again later.')) return;
  const freed = await L.deactivate(deps);
  render(null);
  say(freed ? 'Deactivated. This browser seat is free for another browser.' : 'Removed from this browser, but the licence server could not be reached to free the seat. Contact support if you hit the activation limit.');
}));
$('key').addEventListener('keydown', e => { if (e.key === 'Enter') $('activate').click(); });

L.current(deps).then(render).catch(() => render(null));
