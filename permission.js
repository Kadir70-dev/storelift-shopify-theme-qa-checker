'use strict';
// Requests the optional host permission from a normal tab instead of the popup:
// Chrome closes an action popup when its permission prompt appears, which
// dropped the pending request.
const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
let origin = '';
try {
  const url = new URL(params.get('origin') || '');
  if (!/^https?:$/.test(url.protocol)) throw Error('bad protocol');
  origin = url.origin;
} catch { origin = ''; }
const purpose = {
  tabs: "StoreLift needs permission to read this store's already-open tabs for the open-tab audit.",
  links: "StoreLift needs permission to send HEAD requests to this store's own internal links."
}[params.get('for')] || $('purpose').textContent;
$('purpose').textContent = purpose;
$('origin').textContent = origin || 'Invalid store address';
if (!origin) $('allow').disabled = true;
$('allow').addEventListener('click', async () => {
  $('allow').disabled = true;
  try {
    const granted = await chrome.permissions.request({ origins: [origin + '/*'] });
    $('result').textContent = granted
      ? 'Access granted. Close this tab, go back to the store tab, open StoreLift and press the same button again.'
      : 'Access was not granted. You can still scan the current page.';
    if (!granted) $('allow').disabled = false;
  } catch (e) {
    $('result').textContent = 'Could not request access: ' + (e.message || e);
    $('allow').disabled = false;
  }
});
