'use strict';
/**
 * StoreLift logic.js unit tests — Node.js (CommonJS).
 * Run: node tests/logic.test.cjs
 * No test runner dependency; uses only Node assert.
 */
const assert = require('assert');
require('../logic.js');
const L = globalThis.StoreLiftLogic;

let passed = 0, failed = 0;
function test(label, fn) {
  try { fn(); passed++; console.log('  PASS', label); }
  catch (e) { failed++; console.error('  FAIL', label, '\n       ', e.message); }
}
function section(title) { console.log('\n===', title, '==='); }

// ── helpers ──────────────────────────────────────────────────────────────────
section('clean()');
test('trims whitespace', () => assert.strictEqual(L.clean('  hello  '), 'hello'));
test('collapses inner whitespace', () => assert.strictEqual(L.clean('hello   world'), 'hello world'));
test('handles null/undefined', () => assert.strictEqual(L.clean(null), ''));
test('handles number', () => assert.strictEqual(L.clean(123), '123'));

// ── normalizePageUrl ──────────────────────────────────────────────────────────
section('normalizePageUrl()');
test('strips trailing slash', () => assert.strictEqual(L.normalizePageUrl('https://store.example.com/products/shirt/'), 'https://store.example.com/products/shirt'));
test('preserves root path', () => assert.strictEqual(L.normalizePageUrl('https://store.example.com/'), 'https://store.example.com'));
test('rejects non-http', () => assert.throws(() => L.normalizePageUrl('ftp://example.com'), /normal website/));
test('strips query string', () => assert.strictEqual(L.normalizePageUrl('https://store.example.com/products/shirt?variant=1'), 'https://store.example.com/products/shirt'));

// ── isSameStore ──────────────────────────────────────────────────────────────
section('isSameStore()');
test('same hostname → true', () => assert.ok(L.isSameStore('https://a.myshopify.com/products/x', 'https://a.myshopify.com/pages/about')));
test('different hostname → false', () => assert.ok(!L.isSameStore('https://a.myshopify.com/', 'https://b.myshopify.com/')));
test('invalid URL → false', () => assert.ok(!L.isSameStore('not a url', 'https://a.myshopify.com/')));

// ── safeFilename ─────────────────────────────────────────────────────────────
section('safeFilename()');
test('replaces spaces', () => assert.ok(!/\s/.test(L.safeFilename('hello world'))));
test('strips leading/trailing dashes', () => assert.ok(!/^[-.]|[-.]$/.test(L.safeFilename('--hello--'))));
test('falls back to store for empty', () => assert.strictEqual(L.safeFilename(''), 'store'));
test('truncates long strings', () => assert.ok(L.safeFilename('a'.repeat(100)).length <= 65));
test('no formula injection chars', () => assert.ok(!/^[=+\-@]/.test(L.safeFilename('=HYPERLINK("evil")'))));

// ── upsertPage ───────────────────────────────────────────────────────────────
section('upsertPage()');
const p1 = { url: 'https://a.com/products/shirt', hostname: 'a.com', score: 80, issues: [] };
const p2 = { url: 'https://a.com/products/shoes', hostname: 'a.com', score: 70, issues: [] };
const p1updated = { ...p1, score: 90 };
test('adds first page', () => { const r = L.upsertPage([], p1); assert.strictEqual(r.length, 1); });
test('adds second distinct page', () => { const r = L.upsertPage([p1], p2); assert.strictEqual(r.length, 2); });
test('replaces same-URL page (upsert)', () => { const r = L.upsertPage([p1, p2], p1updated); assert.strictEqual(r.find(x => x.url === p1.url).score, 90); assert.strictEqual(r.length, 2); });
test('respects page limit', () => {
  const pages = Array.from({ length: 20 }, (_, i) => ({ ...p1, url: `https://a.com/products/item-${i}` }));
  const r = L.upsertPage(pages, { ...p1, url: 'https://a.com/products/new' }, 20);
  assert.strictEqual(r.length, 20);
});
test('trailing slash treated same as no slash', () => {
  const p = { url: 'https://a.com/products/shirt/', hostname: 'a.com', score: 95, issues: [] };
  const r = L.upsertPage([p1], p);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].score, 95);
});

// ── analyze() ────────────────────────────────────────────────────────────────
const BASE = {
  url: 'https://store.example.com/products/shirt',
  title: 'Classic Shirt — Great Store', description: 'A classic everyday shirt crafted from soft cotton, designed for all-day comfort and casual style.',
  canonical: 'https://store.example.com/products/shirt', robots: '', h1Count: 1, h1Texts: ['Classic Shirt'],
  images: 3, missingAlt: 0, badImages: [], lazyImagesUnverified: 0, unusableLinks: [], linkCandidates: [], linkChecks: [],
  placeholders: [], viewportWidth: 1280, documentWidth: 1280, overflowExamples: [],
  isProduct: true, hasProductSchema: true, hasCartAction: true, hasShippingLink: true, hasReturnLink: true,
  shopifyHints: true, scope: 'test'
};
function analyze(overrides) { return L.analyze({ ...BASE, overrides, ...overrides }); }

section('analyze() — no issues for a healthy page');
test('healthy product page scores 100', () => { const r = analyze({}); assert.strictEqual(r.score, 100); });
test('healthy page has 0 issues', () => { const r = analyze({}); assert.strictEqual(r.issues.length, 0); });
test('result includes auditedAt', () => { const r = analyze({}); assert.ok(r.auditedAt); });
test('scoreLabel is present and not a ranking claim', () => {
  const r = analyze({});
  assert.ok(r.scoreLabel && !/ranking|revenue|conversion|lighthouse/i.test(r.scoreLabel) || /not/i.test(r.scoreLabel));
});

section('analyze() — title checks');
test('missing title → high issue', () => { const r = analyze({ title: '' }); assert.ok(r.issues.some(i => i.severity === 'high' && /title/i.test(i.title))); });
test('short title (< 25 chars) → medium issue', () => { const r = analyze({ title: 'Short' }); assert.ok(r.issues.some(i => i.severity === 'medium' && /title/i.test(i.title))); });
test('long title (> 70 chars) → medium issue', () => { const r = analyze({ title: 'A'.repeat(71) }); assert.ok(r.issues.some(i => i.severity === 'medium' && /title/i.test(i.title))); });
test('good title (25–70 chars) → no title issue', () => { const r = analyze({ title: 'Classic Shirt — Great Store Quality' }); assert.ok(!r.issues.some(i => /title/i.test(i.title))); });

section('analyze() — description checks');
test('missing description → high issue', () => { const r = analyze({ description: '' }); assert.ok(r.issues.some(i => i.severity === 'high' && /description/i.test(i.title))); });
test('short description → medium issue', () => { const r = analyze({ description: 'Too short' }); assert.ok(r.issues.some(i => i.severity === 'medium' && /description/i.test(i.title))); });
test('long description (> 170) → medium issue', () => { const r = analyze({ description: 'A'.repeat(171) }); assert.ok(r.issues.some(i => i.severity === 'medium' && /description/i.test(i.title))); });

section('analyze() — canonical checks');
test('missing canonical → medium issue', () => { const r = analyze({ canonical: '' }); assert.ok(r.issues.some(i => /canonical/i.test(i.title))); });
test('cross-host canonical → medium issue', () => { const r = analyze({ canonical: 'https://other-domain.com/products/shirt' }); assert.ok(r.issues.some(i => /canonical/i.test(i.title) && /cross/i.test(i.title))); });
test('invalid canonical → confirmed issue', () => { const r = analyze({ canonical: 'http://[::bad' }); assert.ok(r.issues.some(i => i.kind === 'confirmed' && /canonical/i.test(i.title))); });
test('same-host canonical → no canonical issue', () => { const r = analyze({ canonical: 'https://store.example.com/products/shirt' }); assert.ok(!r.issues.some(i => /canonical/i.test(i.title))); });

section('analyze() — H1 checks');
test('missing H1 → high confirmed issue', () => { const r = analyze({ h1Count: 0 }); assert.ok(r.issues.some(i => i.severity === 'high' && i.kind === 'confirmed')); });
test('multiple H1s → low review issue', () => { const r = analyze({ h1Count: 3 }); assert.ok(r.issues.some(i => i.severity === 'low' && /h1/i.test(i.title))); });
test('single H1 → no H1 issue', () => { const r = analyze({ h1Count: 1 }); assert.ok(!r.issues.some(i => /h1/i.test(i.title))); });

section('analyze() — robots');
test('noindex → high issue', () => { const r = analyze({ robots: 'noindex, nofollow' }); assert.ok(r.issues.some(i => i.severity === 'high' && /noindex/i.test(i.title))); });
test('index,follow → no robots issue', () => { const r = analyze({ robots: 'index, follow' }); assert.ok(!r.issues.some(i => /noindex/i.test(i.title))); });

section('analyze() — image alt');
test('images missing alt → medium confirmed issue', () => { const r = analyze({ images: 5, missingAlt: 2 }); assert.ok(r.issues.some(i => i.severity === 'medium' && i.kind === 'confirmed' && /alt/i.test(i.title))); });
test('all alts present → no alt issue', () => { const r = analyze({ images: 5, missingAlt: 0 }); assert.ok(!r.issues.some(i => /alt/i.test(i.title))); });

section('analyze() — broken images');
test('bad images → high confirmed issue', () => {
  const r = analyze({ badImages: [{ src: 'https://store.example.com/broken.jpg', alt: '', element: 'img' }] });
  assert.ok(r.issues.some(i => i.severity === 'high' && i.kind === 'confirmed' && /broken/i.test(i.title)));
});
test('broken image evidence truncated to 3', () => {
  const bads = Array.from({ length: 6 }, (_, i) => ({ src: `https://store.example.com/img${i}.jpg`, alt: '', element: 'img' }));
  const r = analyze({ badImages: bads });
  const issue = r.issues.find(i => /broken/i.test(i.title));
  assert.ok(issue.evidence.split('|').length <= 3);
});
test('no bad images → no broken image issue', () => { const r = analyze({ badImages: [] }); assert.ok(!r.issues.some(i => /broken/i.test(i.title))); });

section('analyze() — empty / non-navigating links');
test('unusable links flagged', () => {
  const r = analyze({ unusableLinks: [{ raw: '', text: 'Click', element: 'a' }, { raw: '#', text: 'Top', element: 'a' }] });
  assert.ok(r.issues.some(i => /link/i.test(i.title) && i.kind !== 'confirmed'));
});
test('zero unusable links → no link issue', () => { const r = analyze({ unusableLinks: [] }); assert.ok(!r.issues.some(i => /non-navigating/i.test(i.title))); });

section('analyze() — placeholder text');
test('lorem ipsum detected', () => {
  const r = analyze({ placeholders: [{ phrase: 'Lorem ipsum', context: 'Lorem ipsum dolor' }] });
  assert.ok(r.issues.some(i => /placeholder/i.test(i.title)));
});
test('no placeholders → clean', () => { const r = analyze({ placeholders: [] }); assert.ok(!r.issues.some(i => /placeholder/i.test(i.title))); });

section('analyze() — horizontal overflow');
test('overflow detected → medium issue', () => {
  const r = analyze({ documentWidth: 1400, viewportWidth: 1280, overflowExamples: [{ element: 'div.hero', right: 1390, left: 10 }] });
  assert.ok(r.issues.some(i => /overflow/i.test(i.title)));
});
test('no overflow → no overflow issue', () => { const r = analyze({ documentWidth: 1280, viewportWidth: 1280 }); assert.ok(!r.issues.some(i => /overflow/i.test(i.title))); });
test('3px tolerance respected → no overflow for 3px difference', () => {
  const r = analyze({ documentWidth: 1283, viewportWidth: 1280 });
  assert.ok(!r.issues.some(i => /overflow/i.test(i.title)));
});

section('analyze() — product page checks');
test('product missing JSON-LD → medium review', () => { const r = analyze({ isProduct: true, hasProductSchema: false }); assert.ok(r.issues.some(i => /json-ld/i.test(i.title))); });
test('product missing cart control → medium review', () => { const r = analyze({ isProduct: true, hasCartAction: false }); assert.ok(r.issues.some(i => /cart/i.test(i.title))); });
test('product missing shipping link → low', () => { const r = analyze({ isProduct: true, hasShippingLink: false }); assert.ok(r.issues.some(i => i.severity === 'low' && /shipping/i.test(i.title))); });
test('product missing return link → low', () => { const r = analyze({ isProduct: true, hasReturnLink: false }); assert.ok(r.issues.some(i => i.severity === 'low' && /return/i.test(i.title))); });
test('non-product page no product issues', () => {
  const r = analyze({ isProduct: false, hasProductSchema: false, hasCartAction: false });
  assert.ok(!r.issues.some(i => /json-ld|add-to-cart|shipping|return/i.test(i.title)));
});

section('analyze() — HEAD link checks');
test('404 link → high issue', () => {
  const r = analyze({ linkChecks: [{ url: 'https://store.example.com/products/gone', status: 404 }] });
  assert.ok(r.issues.some(i => i.severity === 'high' && /broken.*url/i.test(i.title)));
});
test('410 link → high issue', () => {
  const r = analyze({ linkChecks: [{ url: 'https://store.example.com/products/removed', status: 410 }] });
  assert.ok(r.issues.some(i => i.severity === 'high' && /broken.*url/i.test(i.title)));
});
test('unverified link → low caveat issue', () => {
  const r = analyze({ linkChecks: [{ url: 'https://store.example.com/products/unknown', status: 'unverified' }] });
  assert.ok(r.issues.some(i => i.severity === 'low' && /unverified/i.test(i.title)));
});
test('403 HEAD does NOT become a broken-link confirmed issue', () => {
  const r = analyze({ linkChecks: [{ url: 'https://store.example.com/products/protected', status: 403 }] });
  assert.ok(!r.issues.some(i => i.kind === 'confirmed' && /broken.*url/i.test(i.title)));
});
test('200 link → no issue', () => {
  const r = analyze({ linkChecks: [{ url: 'https://store.example.com/products/ok', status: 200 }] });
  assert.ok(!r.issues.some(i => /broken.*url/i.test(i.title)));
});
test('broken link evidence is truncated to 5', () => {
  const checks = Array.from({ length: 8 }, (_, i) => ({ url: `https://store.example.com/products/item-${i}`, status: 404 }));
  const r = analyze({ linkChecks: checks });
  const issue = r.issues.find(i => /broken.*url/i.test(i.title));
  assert.ok(issue.evidence.split('|').length <= 5);
});

section('analyze() — scoring');
test('score is 0–100', () => { const r = analyze({}); assert.ok(r.score >= 0 && r.score <= 100); });
test('missing title + H1 reduces score below 100', () => { const r = analyze({ title: '', h1Count: 0 }); assert.ok(r.score < 100); });
test('score floors at 0 (not negative)', () => {
  const r = analyze({ title: '', description: '', canonical: '', h1Count: 0, robots: 'noindex', missingAlt: 10,
    badImages: Array.from({length:5}, (_, i) => ({src:`https://s.example.com/${i}.jpg`,alt:'',element:'img'})),
    linkChecks: Array.from({length:5}, (_, i) => ({url:`https://s.example.com/${i}`,status:404})) });
  assert.ok(r.score >= 0);
});

section('comparison()');
test('same hostname → returns delta', () => {
  const a = { ...BASE, score: 60, issues: [{}, {}], auditedAt: '2026-01-01T00:00:00Z' };
  const b = { ...BASE, score: 80, issues: [{}], auditedAt: '2026-02-01T00:00:00Z' };
  const c = L.comparison(a, b);
  assert.strictEqual(c.scoreDelta, 20);
  assert.strictEqual(c.issueDelta, -1);
});
test('different hostnames → throws', () => {
  const a = { ...BASE, url: 'https://a.com/', auditedAt: '' };
  const b = { ...BASE, url: 'https://b.com/', auditedAt: '' };
  assert.throws(() => L.comparison(a, b));
});
test('comparison note does not make ranking claims', () => {
  const a = { ...BASE, score: 50, issues: [], auditedAt: '2026-01-01T00:00:00Z' };
  const b = { ...BASE, score: 70, issues: [], auditedAt: '2026-02-01T00:00:00Z' };
  const c = L.comparison(a, b);
  assert.ok(c.note && !/ranking|revenue|conversion/i.test(c.note) || /not/i.test(c.note));
});

section('aggregate()');
test('empty session → 0 pages', () => {
  const r = L.aggregate({ pages: [] });
  assert.strictEqual(r.pages, 0);
  assert.strictEqual(r.issues.length, 0);
});
test('averageScore computed correctly', () => {
  const p1 = analyze({ url: 'https://store.example.com/', ...BASE });
  const p2 = analyze({ url: 'https://store.example.com/pages/about', ...BASE });
  const r = L.aggregate({ pages: [p1, p2] });
  assert.strictEqual(r.averageScore, 100);
});
test('isMobileVerified false without ≤600px viewport', () => {
  const p = analyze({ viewportWidth: 1280 });
  const r = L.aggregate({ pages: [p] });
  assert.ok(!r.isMobileVerified);
});
test('isMobileVerified true when any page ≤600px', () => {
  const mobile = analyze({ viewportWidth: 375 });
  const r = L.aggregate({ pages: [mobile] });
  assert.ok(r.isMobileVerified);
});

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
section('CHECKLIST');
test('has 10 items', () => assert.strictEqual(L.CHECKLIST.length, 10));
test('contains cart and checkout items', () => {
  assert.ok(L.CHECKLIST.some(c => c.id === 'cart'));
  assert.ok(L.CHECKLIST.some(c => c.id === 'checkout'));
});
test('no item references automated results as proof', () => {
  for (const item of L.CHECKLIST) assert.ok(!/automated|guaranteed|proven/i.test(item.title));
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error('FAILURES above.'); process.exit(1); }
else console.log('All tests PASSED.');
