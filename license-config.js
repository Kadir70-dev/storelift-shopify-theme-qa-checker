'use strict';
// Seller settings for paid licensing. Filled in by the owner after the
// Lemon Squeezy store and product exist; nothing here is secret (the License
// API needs no API key). While storeId is null, Pro cannot be bought or
// activated and build_release.py --release refuses to package.
globalThis.StoreLiftLicenseConfig = Object.freeze({
  provider: 'lemonsqueezy',
  apiBase: 'https://api.lemonsqueezy.com/v1/licenses',
  storeId: 522451,        // number, Lemon Squeezy store ID
  productIds: [1522663],  // numbers, product(s) whose keys unlock Pro
  checkoutUrl: 'https://storelift.lemonsqueezy.com/checkout/buy/3a6cc901-7bee-4587-b9fc-05c2ffb4b9cb',
  manageUrl: 'https://app.lemonsqueezy.com/my-orders',
  priceLabel: 'US$29 one-time · lifetime licence · up to 3 browsers',
  termsUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/terms.html',
  refundUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/refund.html',
  privacyUrl: 'https://kadir70-dev.github.io/storelift-shopify-theme-qa-checker/privacy.html'
});
