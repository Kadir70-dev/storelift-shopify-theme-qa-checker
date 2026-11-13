'use strict';
const $ = id => document.getElementById(id);
const Logic = globalThis.StoreLiftLogic;
let activeSession = null;
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = String(text); if (className) node.className = className; return node; }
function cell(tr, text, tag = 'td') { const td = el(tag, text); tr.append(td); }
function csvSafe(value) {
  let s = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s; // prevent spreadsheet formula execution
  return '"' + s.replace(/"/g, '""') + '"';
}
function exportCsv() {
  if (!activeSession) return;
  const rows = [['Page', 'Severity', 'Evidence type', 'Finding', 'Evidence', 'Recommendation']];
  for (const page of activeSession.pages) for (const issue of page.issues || []) rows.push([page.url, issue.severity, issue.kind, issue.title, issue.evidence, issue.fix]);
  const content = '\uFEFF' + rows.map(r => r.map(csvSafe).join(',')).join('\r\n');
  const u = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = el('a'); a.href = u; a.download = 'storelift-findings-' + Logic.safeFilename(activeSession.hostname) + '.csv'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1800);
}
async function storeSession() {
  if (!activeSession || activeSession.legacy) return;
  const stored = await chrome.storage.local.get('storeliftSessions');
  const sessions = Array.isArray(stored.storeliftSessions) ? stored.storeliftSessions : [];
  activeSession.updatedAt = new Date().toISOString();
  await chrome.storage.local.set({ storeliftSessions: sessions.map(s => s.id === activeSession.id ? activeSession : s) });
}
function setupFields() {
  if (!activeSession || activeSession.legacy) { document.querySelector('.client-fields').classList.add('hidden'); return; }
  $('client-name').value = activeSession.clientName || '';
  $('notes').value = activeSession.notes || '';
  for (const [id, field] of [['client-name', 'clientName'], ['notes', 'notes']]) {
    $(id).addEventListener('change', async () => { activeSession[field] = $(id).value; await storeSession(); });
  }
}
function renderChecklist() {
  const container = $('checklist'); container.replaceChildren();
  for (const row of Logic.CHECKLIST) {
    const wrap = el('div', undefined, 'check-item');
    const label = el('label', row.title);
    const sel = el('select'); sel.setAttribute('aria-label', row.title);
    for (const [v, name] of [['pending', 'Not tested'], ['pass', 'Passed manually'], ['fail', 'Needs fix']]) {
      const option = el('option', name); option.value = v; sel.append(option);
    }
    sel.value = activeSession.checklist?.[row.id] || 'pending'; sel.disabled = Boolean(activeSession.legacy);
    sel.addEventListener('change', async () => { activeSession.checklist[row.id] = sel.value; await storeSession(); });
    wrap.append(label, sel); container.append(wrap);
  }
}
function render() {
  const s = activeSession;
  const agg = Logic.aggregate(s);
  $('domain').textContent = s.hostname;
  $('date').textContent = new Date(s.updatedAt || s.createdAt).toLocaleString();
  $('page-summary').textContent = `${agg.pages} page${agg.pages !== 1 ? 's' : ''} observed`;
  $('score').textContent = agg.averageScore ?? '—';
  $('count').textContent = agg.issues.length;
  $('review-count').textContent = agg.counts.review;
  $('mobile-checked').textContent = agg.isMobileVerified ? 'Yes' : 'No';
  const pages = $('pages'); pages.replaceChildren();
  for (const page of s.pages) {
    const row = el('tr'); cell(row, page.url); cell(row, page.viewportWidth ? `${page.viewportWidth}px` : 'Not measured'); cell(row, page.issues?.length || 0); cell(row, `${page.score}/100`); pages.append(row);
  }
  const output = $('issues'); output.replaceChildren();
  if (!agg.issues.length) output.append(el('p', 'No issues identified by the checks performed. This does not certify a defect-free store.'));
  const sort = { high: 0, medium: 1, low: 2 };
  for (const issue of [...agg.issues].sort((a, b) => sort[a.severity] - sort[b.severity])) {
    const article = el('article', undefined, 'issue');
    const head = el('h3'); const badge = el('span', issue.severity, 'severity ' + issue.severity); head.append(badge, document.createTextNode(issue.title));
    const page = el('div', issue.url, 'issue-url');
    const kind = el('div', issue.kind === 'confirmed' ? 'OBSERVED DOM FACT' : 'MANUAL REVIEW REQUIRED', 'issue-kind');
    const evidence = el('p', 'Evidence: ' + issue.evidence);
    const fix = el('p', 'Recommendation: ' + issue.fix, 'recommendation');
    article.append(head, page, kind, evidence, fix); output.append(article);
  }
  setupFields(); renderChecklist();
}
async function start() {
  const q = new URLSearchParams(location.search);
  const key = q.get('mode') === 'single' ? 'storeliftReports' : 'storeliftSessions';
  const id = q.get('id');
  const s = await chrome.storage.local.get(key);
  const records = Array.isArray(s[key]) ? s[key] : [];
  if (key === 'storeliftReports') {
    const old = records.find(r => r.id === id);
    if (old) activeSession = { id, hostname: old.hostname, updatedAt: old.auditedAt, pages: [old], checklist: {}, legacy: true };
  } else activeSession = records.find(s => s.id === id) || (!id && records.length === 1 ? records[0] : null);
  if (!activeSession) { document.querySelector('.report').textContent = 'Local report not found. Reopen the StoreLift extension and run an audit.'; return; }
  // Agency report, PDF and CSV are Pro; an old single snapshot stays viewable on Free.
  const License = globalThis.StoreLiftLicense;
  const pro = License.isPro(await License.load(License.browserDeps()), Date.now());
  if (!pro && !activeSession.legacy) { showUpgrade(); return; }
  if (!pro) document.querySelector('.top .controls').classList.add('hidden');
  render();
}
function showUpgrade() {
  const box = document.querySelector('.report'); box.replaceChildren();
  box.append(el('p', 'STORELIFT PRO', 'eyebrow'), el('h1', 'Agency report is a Pro feature'),
    el('p', 'Upgrade to StoreLift Pro to open the client handover report, save it as PDF and export issues as CSV. Your audit is saved and will be here after you upgrade.', 'subtitle'));
  const wrap = el('div', undefined, 'controls upgrade'); const button = el('button', 'See StoreLift Pro');
  button.type = 'button'; button.addEventListener('click', () => chrome.runtime.openOptionsPage());
  wrap.append(button); box.append(wrap);
  document.querySelector('.top .controls').classList.add('hidden');
}
$('print').addEventListener('click', () => window.print());
$('export-csv').addEventListener('click', exportCsv);
start().catch(() => { document.querySelector('.report').textContent = 'Report could not load; please retry.'; });
