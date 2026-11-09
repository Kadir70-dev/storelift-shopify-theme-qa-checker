'use strict';
const $ = id => document.getElementById(id);
const Logic = globalThis.StoreLiftLogic;
const state = { current: null, session: null, sessions: [], history: [], activeTab: null };
const LIMIT_PAGES = 20, LIMIT_SESSIONS = 24, MAX_TABS = 12;
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const status = message => { $('status').textContent = message; };
const txt = (id, value) => { $(id).textContent = String(value); };

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw Error('Open a regular http(s) storefront tab first.');
  return tab;
}
async function collectTab(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['collector.js'] });
  const results = await chrome.scripting.executeScript({ target: { tabId }, func: () => globalThis.__storeliftCollect() });
  if (!results?.[0]?.result?.hostname) throw Error('Unable to read page DOM. Refresh and retry.');
  return Logic.analyze(results[0].result);
}
function createSession(hostname) {
  return { id: makeId(), hostname, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pages: [], checklist: {}, clientName: '', notes: '' };
}
async function saveSession() {
  state.session.updatedAt = new Date().toISOString();
  state.sessions = [...state.sessions.filter(s => s.id !== state.session.id), state.session].slice(-LIMIT_SESSIONS);
  await chrome.storage.local.set({ storeliftSessions: state.sessions });
}
async function addPage(page) {
  if (!state.session || state.session.hostname !== page.hostname) {
    state.session = [...state.sessions].reverse().find(s => s.hostname === page.hostname) || createSession(page.hostname);
  }
  state.session.pages = Logic.upsertPage(state.session.pages, page, LIMIT_PAGES);
  state.current = page;
  await saveSession();
  render(page);
  renderSession();
}
async function scanOne() {
  $('scan').disabled = true;
  status('Reading the current visible page...');
  try {
    const tab = await activeTab();
    const page = await collectTab(tab.id);
    await addPage(page);
    status((page.shopifyHints ? 'Shopify signals detected. ' : 'Shopify platform not confirmed. ') + 'One page added to this local handover session.');
  } catch (e) { status('Could not audit: ' + (e.message || e)); }
  finally { $('scan').disabled = false; }
}
async function requestOrigin(url) {
  const origin = new URL(url).origin + '/*';
  return await chrome.permissions.request({ origins: [origin] });
}
async function scanOpenTabs() {
  $('scan-tabs').disabled = true;
  try {
    const active = await activeTab();
    const origin = new URL(active.url).origin;
    status('Chrome will ask permission for this store only; no other site is scanned.');
    if (!await requestOrigin(active.url)) throw Error('Site permission declined. You can still scan the active tab.');
    const tabs = (await chrome.tabs.query({ currentWindow: true }))
      .filter(t => t?.id && !t.discarded && t.status === 'complete' && t.url && new URL(t.url).origin === origin)
      .slice(0, MAX_TABS);
    if (!tabs.length) throw Error('No loaded storefront tabs found.');
    let ok = 0, failed = 0;
    for (const tab of tabs) {
      try {
        const page = await collectTab(tab.id);
        if (page.origin !== origin) throw Error('Tab navigated to another origin.');
        await addPage(page);
        ok++;
      } catch { failed++; }
    }
    status(`${ok} open tabs audited; ${failed} skipped. No background crawling or new tabs. Review findings in agency report.`);
  } catch (e) { status('Open-tab audit: ' + (e.message || e)); }
  finally { $('scan-tabs').disabled = false; }
}
function render(page) {
  $('results').classList.remove('hidden');
  txt('score', page.score);
  txt('site', page.hostname);
  txt('issue-count', page.issues.length);
  txt('scanned-at', new Date(page.auditedAt).toLocaleString());
  txt('bad-img-count', (page.badImages || []).length);
  txt('alt-count', `${page.missingAlt}/${page.images}`);
  txt('link-count', (page.unusableLinks || []).length);
  txt('viewport', page.viewportWidth ? `${page.viewportWidth}px${page.viewportWidth <= 600 ? ' · mobile-sized' : ''}` : 'Unknown');
  txt('cart-status', page.isProduct ? (page.hasCartAction ? 'Detected' : 'Review') : 'Not product');
  txt('schema-status', page.isProduct ? (page.hasProductSchema ? 'Detected' : 'Review') : 'Not product');
  txt('found-label', `${page.issues.filter(i => i.kind === 'confirmed').length} confirmed DOM observations`);
  const out = $('findings'); out.replaceChildren();
  if (!page.issues.length) { const n = document.createElement('p'); n.className = 'empty'; n.textContent = 'No issues flagged in the checks run. This does not guarantee a defect-free store.'; out.append(n); }
  for (const i of page.issues.slice(0, 28)) {
    const a = document.createElement('article'); a.className = 'finding';
    const head = document.createElement('div'); head.className = 'finding-head';
    const badge = document.createElement('span'); badge.className = 'tag ' + i.severity; badge.textContent = i.severity;
    const name = document.createElement('strong'); name.textContent = i.title;
    const evidence = document.createElement('p'); evidence.textContent = i.evidence;
    const fix = document.createElement('p'); fix.textContent = `Suggested: ${i.fix}`;
    const kind = document.createElement('small'); kind.className = 'finding-kind'; kind.textContent = i.kind === 'confirmed' ? 'Observed in this DOM' : 'Requires manual review';
    head.append(badge, name); a.append(head, kind, evidence, fix); out.append(a);
  }
}
function renderSession() {
  const s = state.session;
  if (!s) { $('session-section').classList.add('hidden'); return; }
  $('session-section').classList.remove('hidden');
  const a = Logic.aggregate(s);
  txt('session-host', s.hostname); txt('page-count', a.pages); txt('total-findings', a.issues.length); txt('review-findings', a.counts.review);
  const pages = $('session-pages'); pages.replaceChildren();
  for (const page of s.pages) {
    const row = document.createElement('div'); row.className = 'page-row';
    const label = document.createElement('div'); label.textContent = new URL(page.url).pathname || '/';
    const count = document.createElement('span'); count.textContent = `${page.issues.length} findings · ${page.score}/100`;
    row.append(label, count); pages.append(row);
  }
  const checklist = $('checklist'); checklist.replaceChildren();
  for (const item of Logic.CHECKLIST) {
    const row = document.createElement('label'); row.className = 'check-row';
    const name = document.createElement('span'); name.textContent = item.title;
    const sel = document.createElement('select'); sel.setAttribute('aria-label', item.title);
    for (const [v, title] of [['pending', 'Not tested'], ['pass', 'Passed manually'], ['fail', 'Needs fix']]) {
      const opt = document.createElement('option'); opt.value = v; opt.textContent = title; sel.append(opt);
    }
    sel.value = s.checklist[item.id] || 'pending';
    sel.addEventListener('change', async () => { s.checklist[item.id] = sel.value; await saveSession(); status('Manual checklist saved locally.'); });
    row.append(name, sel); checklist.append(row);
  }
}
async function verifyLinks() {
  if (!state.current) return status('Scan a page first.');
  const button = $('verify-links'); button.disabled = true;
  try {
    const active = await activeTab();
    if (!Logic.isSameStore(active.url, state.current.url)) throw Error('Return to the audited store tab first.');
    if (!await requestOrigin(state.current.url)) throw Error('Site permission declined; no HTTP requests made.');
    const urls = (state.current.linkCandidates || []).slice(0, 24);
    if (!urls.length) { status('No safe internal page links found to verify.'); return; }
    status(`Checking ${urls.length} public internal links with HEAD only (no cookies)...`);
    const findings = [];
    // Small sequential batches: bounded load; GET is intentionally never used.
    for (let i = 0; i < urls.length; i += 4) {
      const batch = await Promise.all(urls.slice(i, i + 4).map(async url => {
        const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(url, { method: 'HEAD', credentials: 'omit', redirect: 'manual', cache: 'no-store', signal: controller.signal });
          return { url, status: [404, 410].includes(res.status) ? res.status : (res.ok ? res.status : 'unverified') };
        } catch { return { url, status: 'unverified' }; }
        finally { clearTimeout(timer); }
      }));
      findings.push(...batch);
    }
    const raw = { ...state.current, linkChecks: findings };
    await addPage(Logic.analyze(raw));
    status(`HEAD checked ${findings.length} same-origin URLs (no cookies): ${findings.filter(x => x.status === 404 || x.status === 410).length} potential 404/410, ${findings.filter(x => x.status === 'unverified').length} unverified. HEAD is not a full GET check.`);
  } catch (e) { status('Link check: ' + (e.message || e)); }
  finally { button.disabled = false; }
}
async function saveSnapshot() {
  if (!state.current) return status('Scan a page first.');
  const snapshot = { ...state.current, id: makeId() };
  state.history = [...state.history, snapshot].slice(-70);
  await chrome.storage.local.set({ storeliftReports: state.history });
  renderHistory(); status('Previous-version compatible snapshot saved locally.');
}
function renderHistory() {
  const c = $('history-list'); c.replaceChildren();
  if (!state.history.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No older snapshots saved.'; c.append(p); $('compare').classList.add('hidden'); return; }
  for (const item of [...state.history].reverse().slice(0, 10)) {
    const row = document.createElement('div'); row.className = 'history-item';
    const name = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = item.hostname;
    const sub = document.createElement('span'); sub.textContent = `${new Date(item.auditedAt).toLocaleString()} · ${item.score}/100`;
    const view = document.createElement('button'); view.textContent = 'View'; view.addEventListener('click', () => openReport(item.id, true));
    name.append(strong, sub); row.append(name, view); c.append(row);
  }
  const last = state.history.at(-1), prev = [...state.history].slice(0, -1).reverse().find(x => x.hostname === last.hostname);
  if (prev) {
    try { const cmp = Logic.comparison(prev, last); txt('compare', `${last.hostname}: score ${cmp.scoreDelta >= 0 ? '+' : ''}${cmp.scoreDelta}; findings ${cmp.issueDelta >= 0 ? '+' : ''}${cmp.issueDelta}. ${cmp.note}`); $('compare').classList.remove('hidden'); }
    catch { $('compare').classList.add('hidden'); }
  } else $('compare').classList.add('hidden');
}
async function openReport(id, single = false) {
  if (!id) return status('Scan a page first.');
  await chrome.tabs.create({ url: chrome.runtime.getURL('report.html') + '?mode=' + (single ? 'single' : 'session') + '&id=' + encodeURIComponent(id) });
}
function download(name, content, mime) {
  const u = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
}
async function startNewSession() {
  if (!state.current) return status('Scan a store before creating a handover session.');
  state.session = createSession(state.current.hostname); await saveSession(); renderSession(); status('New empty handover session started. Scan pages to add them.');
}
async function clearEverything() {
  if (!confirm('Delete every StoreLift audit and manual checklist saved on this browser?')) return;
  state.current = null; state.session = null; state.sessions = []; state.history = [];
  await chrome.storage.local.remove(['storeliftReports', 'storeliftSessions']);
  $('results').classList.add('hidden'); renderSession(); renderHistory(); status('All StoreLift local data deleted.');
}
async function init() {
  const stored = await chrome.storage.local.get(['storeliftReports', 'storeliftSessions']);
  state.history = Array.isArray(stored.storeliftReports) ? stored.storeliftReports : [];
  state.sessions = Array.isArray(stored.storeliftSessions) ? stored.storeliftSessions : [];
  state.session = state.sessions.at(-1) || null;
  renderSession(); renderHistory();
  $('scan').addEventListener('click', scanOne);
  $('scan-tabs').addEventListener('click', scanOpenTabs);
  $('verify-links').addEventListener('click', verifyLinks);
  $('save').addEventListener('click', () => saveSnapshot().catch(e => status(e.message)));
  $('full-report').addEventListener('click', () => openReport(state.session?.id));
  $('export').addEventListener('click', () => state.session && download('storelift-handover-' + Logic.safeFilename(state.session.hostname) + '.json', JSON.stringify(state.session, null, 2), 'application/json'));
  $('new-session').addEventListener('click', () => startNewSession().catch(e => status(e.message)));
  $('clear').addEventListener('click', () => clearEverything().catch(e => status(e.message)));
}
document.addEventListener('DOMContentLoaded', () => init().catch(e => status('Extension initialization error: ' + (e.message || e))));
