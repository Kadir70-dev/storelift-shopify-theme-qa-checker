'use strict';
// Seller settings for paid licensing. Filled in by the owner after the
// Lemon Squeezy store and product exist; nothing here is secret (the License
// API needs no API key). While storeId is null, Pro cannot be bought or
// activated and build_release.py --release refuses to package.
globalThis.StoreLiftLicenseConfig = Object.freeze({
  provider: 'lemonsqueezy',
  apiBase: 'https://api.lemonsqueezy.com/v1/licenses',
  storeId: null,          // number, Lemon Squeezy store ID
  productIds: [],         // numbers, product(s) whose keys unlock Pro
  checkoutUrl: '',        // https://<store>.lemonsqueezy.com/buy/<variant-uuid>
  manageUrl: 'https://app.lemonsqueezy.com/my-orders',
  priceLabel: '',         // shown on the upgrade card, e.g. owner-approved price text
  termsUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/terms.html',
  refundUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/refund.html',
  privacyUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html'
});
