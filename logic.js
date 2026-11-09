/* StoreLift: honest evidence-only, self-contained audit helpers. No network calls. */
(function (root) { 'use strict';
  const clean = x => String(x ?? '').replace(/\s+/g, ' ').trim();
  function analyze(page) {
    const issues = [];
    const add = (severity, title, evidence, fix, kind = 'review') => issues.push({ severity, title, evidence: clean(evidence), fix, kind, category: 'qa', url: page.url });
    const title = clean(page.title), description = clean(page.description), canonical = clean(page.canonical);
    if (!title) add('high', 'Missing page title', 'No <title> text detected.', 'Add a unique page-specific title.', 'confirmed');
    else if (title.length < 25 || title.length > 70) add('medium', 'Page title length review', `Title length: ${title.length} characters.`, 'Review title clarity; search snippets do not have a fixed character limit.');
    if (!description) add('high', 'Missing meta description', 'No meta description detected.', 'Write an accurate page-specific description.', 'confirmed');
    else if (description.length < 70 || description.length > 170) add('medium', 'Meta description length review', `Meta description length: ${description.length} characters.`, 'Review relevance and brevity; search snippet limits vary.');
    if (!canonical) add('medium', 'No canonical tag', 'No rel=canonical link in current DOM.', 'Confirm the preferred canonical URL is specified.');
    else try {
      const resolved = new URL(canonical, page.url);
      if (resolved.hostname !== new URL(page.url).hostname) add('medium', 'Cross-host canonical', `Points to ${resolved.hostname}.`, 'Check this cross-domain canonical is intentional.');
    } catch { add('medium', 'Invalid canonical tag', canonical, 'Use a valid absolute canonical URL.', 'confirmed'); }
    if (page.h1Count === 0) add('high', 'Missing H1 heading', 'No H1 element in the loaded DOM.', 'Use a clear main heading.', 'confirmed');
    else if (page.h1Count > 1) add('low', 'Multiple H1 headings', `${page.h1Count} H1 headings found.`, 'Check semantic hierarchy; multiple H1s are not inherently a problem.');
    if (/\bnoindex\b/i.test(page.robots)) add('high', 'Noindex directive detected', `Robots: ${page.robots}`, 'Confirm this page should not be indexed.');
    if ((page.missingAlt || 0) > 0) add('medium', 'Images without alt attribute', `${page.missingAlt}/${page.images || 0} img elements lack an alt attribute.`, 'Use descriptive alt for informative images; alt="" for decorative ones.', 'confirmed');
    if ((page.badImages || []).length) add('high', 'Loaded images appear broken', (page.badImages || []).slice(0, 3).map(i => `${i.element}: ${i.src}`).join(' | '), 'Verify URLs and image responses; lazy-unloaded images are not counted.', 'confirmed');
    if ((page.lazyImagesUnverified || 0) > 0) add('low', 'Lazy images not verified', `${page.lazyImagesUnverified} deferred images not fully loaded at scan time.`, 'Scroll and revisit the page to verify loading.');
    if ((page.unusableLinks || []).length) add('medium', 'Empty or non-navigating links', (page.unusableLinks || []).slice(0, 4).map(l => `${l.element} ${l.text || '(no label)'} → ${l.raw || '(empty)'}`).join(' | '), 'Review whether each is a functional control or a navigation link.');
    const badLinks = (page.linkChecks || []).filter(x => x.status === 404 || x.status === 410);
    if (badLinks.length) add('high', 'Potentially broken internal URLs (HTTP HEAD)', badLinks.slice(0, 5).map(x => `${x.status}: ${x.url}`).join(' | '), 'Open each URL in a browser and confirm; some sites handle HEAD differently from GET.');
    const unresolvedLinks = (page.linkChecks || []).filter(x => x.status === 'unverified');
    if (unresolvedLinks.length) add('low', 'Some link responses unverified', `${unresolvedLinks.length} HEAD requests blocked, failed, timed out or redirected.`, 'Check them manually; never infer a broken link from timeouts or 403/405 responses.');
    if ((page.placeholders || []).length) add('medium', 'Possible placeholder content', page.placeholders.map(p => p.phrase).join(', '), 'Review whether these phrases are intentionally published.');
    if ((page.documentWidth || 0) > (page.viewportWidth || Infinity) + 3) add('medium', 'Horizontal page overflow', `DOM width ${page.documentWidth}px; current viewport ${page.viewportWidth}px. Elements: ${(page.overflowExamples || []).map(x => x.element).join(', ') || 'not isolated'}.`, 'Inspect at this viewport; scrollable carousels and visual effects can be intentional.');
    if (page.isProduct && !page.hasProductSchema) add('medium', 'Product JSON-LD not detected', 'No parsable JSON-LD Product in the current DOM.', 'Validate structured data in Google Rich Results Test; other formats may exist.');
    if (page.isProduct && !page.hasCartAction) add('medium', 'Add-to-cart control not recognized', 'Recognized button/form was not detected.', 'Manually test variants, cart and stock states.');
    if (page.isProduct && !page.hasShippingLink) add('low', 'Shipping details not obvious', 'No clear shipping text/link in current DOM.', 'Make shipping policies easy to find.');
    if (page.isProduct && !page.hasReturnLink) add('low', 'Return details not obvious', 'No clear return/refund text/link in current DOM.', 'Make returns/refund policies easy to find.');
    // Score measures detectable DOM observations only; unverified checks have no claimed impact.
    const weights = { high: 14, medium: 6, low: 2 };
    const score = Math.max(0, 100 - issues.reduce((sum, x) => sum + weights[x.severity], 0));
    return { ...page, issues, score, scoreLabel: 'Local QA heuristic (not Lighthouse, rankings, revenue, or conversion)',
      performance: 'Not measured', auditedAt: new Date().toISOString() };
  }
  const safeFilename = input => clean(input).replace(/[^a-z0-9.-]+/gi, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 65) || 'store';
  function comparison(a, b) {
    if (new URL(a.url).hostname !== new URL(b.url).hostname) throw Error('Same store required.');
    return { older: a.auditedAt, newer: b.auditedAt, scoreDelta: b.score - a.score,
      issueDelta: (b.issues?.length || 0) - (a.issues?.length || 0),
      note: 'DOM heuristic changes only; not a ranking or revenue measurement.' };
  }
  function normalizePageUrl(input) {
    const u = new URL(input); if (!['https:', 'http:'].includes(u.protocol)) throw Error('Use a normal website URL.');
    return u.origin + u.pathname.replace(/\/+$/, '') || u.origin + '/';
  }
  function aggregate(session) {
    const pages = Array.isArray(session.pages) ? session.pages : [];
    const items = pages.flatMap(p => (p.issues || []).map(issue => ({ ...issue, url: p.url })));
    const counts = { high: 0, medium: 0, low: 0, confirmed: 0, review: 0 };
    for (const i of items) { counts[i.severity]++; counts[i.kind === 'confirmed' ? 'confirmed' : 'review']++; }
    return { pages: pages.length, issues: items, counts,
      averageScore: pages.length ? Math.round(pages.reduce((s, x) => s + (x.score || 0), 0) / pages.length) : null,
      isMobileVerified: pages.some(p => p.viewportWidth > 0 && p.viewportWidth <= 600) };
  }
  function isSameStore(a, b) { try { return new URL(a).hostname === new URL(b).hostname; } catch { return false; } }
  function upsertPage(pages, page, limit = 20) {
    const k = normalizePageUrl(page.url);
    return [...(pages || []).filter(p => normalizePageUrl(p.url) !== k), page].slice(-limit);
  }
  const CHECKLIST = [
    { id: 'home', title: 'Homepage layout and featured content' },
    { id: 'navigation', title: 'Header, menu and footer navigation' },
    { id: 'products', title: 'Product variants, price and availability' },
    { id: 'cart', title: 'Add-to-cart and cart drawer/page' },
    { id: 'checkout', title: 'Checkout flow (test order only)' },
    { id: 'mobile', title: 'Mobile 375px and 768px viewport inspection' },
    { id: 'forms', title: 'Contact / newsletter forms' },
    { id: 'policy', title: 'Shipping, refunds and privacy policies' },
    { id: 'a11y', title: 'Keyboard navigation and accessibility' },
    { id: 'speed', title: 'Core Web Vitals checked separately' }
  ];
  root.StoreLiftLogic = { clean, analyze, safeFilename, comparison, normalizePageUrl, aggregate, isSameStore, upsertPage, CHECKLIST };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.StoreLiftLogic;
})(typeof globalThis !== 'undefined' ? globalThis : this);
