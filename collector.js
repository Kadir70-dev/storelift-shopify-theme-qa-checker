/* StoreLift collector runs only after a user gesture via chrome.scripting. Read-only DOM. */
(function () {
  'use strict';
  globalThis.__storeliftCollect = function collect() {
    const all = (sel) => Array.from(document.querySelectorAll(sel));
    const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const sameSite = (href) => {
      try { const url = new URL(href, location.href); return ['http:', 'https:'].includes(url.protocol) && url.origin === location.origin; }
      catch { return false; }
    };
    const safePath = (url) => {
      try {
        const u = new URL(url, location.href);
        if (u.origin !== location.origin || u.search || /\/(?:cart|checkout|account|admin|logout|login|apps|challenge|orders|wallet|password)(?:\/|$)/i.test(u.pathname)) return false;
        return /^(?:\/$|\/(?:products|collections|pages|blogs|policies|search|about|contact)(?:\/|$))/i.test(u.pathname);
      } catch { return false; }
    };
    const elementRef = (el) => {
      if (!el) return '';
      if (el.id && /^[a-z0-9_-]{1,45}$/i.test(el.id)) return '#' + el.id;
      const cls = [...(el.classList || [])].filter(c => /^[a-z0-9_-]{2,32}$/i.test(c)).slice(0, 2);
      return String(el.tagName || '').toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
    };
    const meta = (name) => { const n = all('meta[name]').find(el => clean(el.getAttribute('name')).toLowerCase() === name); return clean(n?.content); };
    const canonical = all('link[rel]').find(el => clean(el.getAttribute('rel')).toLowerCase().split(/\s+/).includes('canonical'));
    const productPath = /\/products?\/[^/?#]+/.test(location.pathname);
    const cartForm = all('form[action]').some(el => /\/cart\/add\b/i.test(el.getAttribute('action') || ''));
    const addToCart = all('button,input[type=submit]').some(el => /\b(add to cart|buy now|add to bag)\b/i.test(clean(el.textContent || el.value || el.getAttribute('aria-label'))));
    const anchorEls = all('a').slice(0, 900);
    const links = anchorEls.map(el => ({
      raw: clean(el.getAttribute('href')),
      href: el.hasAttribute('href') && sameSite(el.href) ? el.href.split('#')[0] : '',
      text: clean(el.innerText || el.textContent || el.getAttribute('aria-label')).slice(0, 95),
      element: elementRef(el),
      role: clean(el.getAttribute('role')),
      label: clean(el.getAttribute('aria-label'))
    }));
    const linkTexts = links.map(x => (x.text + ' ' + x.raw).toLowerCase());
    const linkCandidates = [...new Set(links.map(x => x.href).filter(x => x && safePath(x)))].slice(0, 28);
    const imgs = all('img').slice(0, 900);
    const badImages = [];
    const unloadedImages = [];
    for (const img of imgs) {
      const src = clean(img.currentSrc || img.src || img.getAttribute('data-src'));
      const row = { src: src.slice(0, 230), alt: clean(img.alt).slice(0, 85), element: elementRef(img) };
      // Hidden or 1-2px images (analytics beacons such as Bing's #batBeacon) are not storefront imagery.
      const box = img.getBoundingClientRect();
      const invisible = img.getClientRects().length === 0 || (box.width <= 2 && box.height <= 2);
      if (img.complete && img.naturalWidth === 0 && src && !src.startsWith('data:') && !invisible) badImages.push(row);
      else if (!img.complete && img.loading === 'lazy') unloadedImages.push(row);
    }
    function findProduct(node, depth) {
      if (depth > 9 || node === null || typeof node !== 'object') return false;
      if (Array.isArray(node)) return node.some(x => findProduct(x, depth + 1));
      const type = node['@type'];
      if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return true;
      return Object.values(node).some(x => findProduct(x, depth + 1));
    }
    let hasProductSchema = false;
    for (const script of all('script[type="application/ld+json"]').slice(0, 30)) {
      if ((script.textContent || '').length > 100000) continue;
      try { if (findProduct(JSON.parse(script.textContent || ''), 0)) { hasProductSchema = true; break; } } catch { /* malformed JSON-LD */ }
    }
    const selectors = all('body *').slice(0, 3000);
    const viewportWidth = Math.max(0, window.innerWidth || 0);
    const documentWidth = document.documentElement.scrollWidth || 0;
    const overflowExamples = [];
    // This is a CURRENT viewport check, not a claim that mobile was emulated.
    if (viewportWidth > 0 && documentWidth > viewportWidth + 3) {
      for (const el of selectors) {
        if (overflowExamples.length >= 6) break;
        if (/^(SCRIPT|STYLE|META|LINK|NOSCRIPT|SVG|PATH|BR)$/.test(el.tagName)) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.position === 'fixed') continue;
        const rect = el.getBoundingClientRect();
        if (!(rect.width > 12 && rect.height > 2) || rect.top > window.innerHeight * 3 || rect.bottom < 0) continue;
        if (rect.right <= viewportWidth + 3 && rect.left >= -3) continue;
        let parent = el.parentElement, intentionallyScrollable = false;
        for (let d = 0; parent && d < 4; d++, parent = parent.parentElement) {
          const ov = getComputedStyle(parent).overflowX;
          if (['auto', 'scroll', 'hidden', 'clip'].includes(ov) && parent !== document.body && parent !== document.documentElement) { intentionallyScrollable = true; break; }
        }
        if (!intentionallyScrollable) overflowExamples.push({ element: elementRef(el), right: Math.round(rect.right), left: Math.round(rect.left) });
      }
    }
    const bodyCopy = clean(document.body?.innerText).slice(0, 80000);
    const patterns = [
      ['Lorem ipsum', /\blorem\s+ipsum\b/i],
      ['Placeholder text', /\b(?:insert (?:your|text)|your (?:headline|brand name) here|replace (?:this|with your) text)\b/i],
      ['Demo product text', /\b(?:example product|sample product|dummy product)\b/i],
      ['Coming soon', /\bcoming soon\b/i]
    ];
    const placeholders = patterns.flatMap(([label, re]) => re.test(bodyCopy) ? [{ phrase: label, context: (bodyCopy.match(re)?.[0] || label) }] : []);
    const gen = meta('generator');
    const shopifyHints = !!globalThis.Shopify || /shopify/i.test(gen) || all('script[src],img[src],link[href]').some(el => /(?:cdn\.shopify\.com|shopifycdn\.net)/i.test(el.src || el.href || ''));
    const h1 = all('h1');
    return {
      url: location.origin + location.pathname, hostname: location.hostname,
      origin: location.origin, title: document.title || '', description: meta('description'),
      canonical: canonical?.href || '', robots: meta('robots'),
      h1Count: h1.length, h1Texts: h1.slice(0, 4).map(el => clean(el.textContent).slice(0, 140)),
      images: imgs.length, missingAlt: imgs.filter(el => !el.hasAttribute('alt')).length,
      badImages: badImages.slice(0, 20), lazyImagesUnverified: unloadedImages.length,
      linkCount: links.length,
      unusableLinks: links.filter(x => !x.raw || x.raw === '#' || /^javascript:/i.test(x.raw) && x.raw !== 'javascript:void(0)').slice(0, 18),
      linkCandidates, linkChecks: [],
      placeholders,
      viewportWidth, documentWidth, overflowExamples,
      isProduct: productPath || cartForm, hasProductSchema, hasCartAction: cartForm || addToCart,
      hasShippingLink: linkTexts.some(s => /(shipping|delivery|dispatch)/i.test(s)),
      hasReturnLink: linkTexts.some(s => /(returns?|refund|exchange)/i.test(s)),
      shopifyHints,
      scope: 'User-triggered read-only scan of currently loaded DOM. Only current viewport layout is measured.'
    };
  };
})();
