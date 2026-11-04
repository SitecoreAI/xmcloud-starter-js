'use strict';
// The original widget loads only this public static workbook. Never transmit inputs.
(function installRmdStaticWorkbookBoundary(global) {
  const path = '/~/Media/Files/Global/ToolShed/dx-required-minimum-distribution-general-ed/dx-required-minimum-distribution-general-ed-xlsx.xlsx';
  const expectedBytes = 77007;
  const expectedSha256 = '49d0b4ebd9f78d9beafa7ff50a047c1bca2e1340c32c9e7e05626841880769a5';
  let failed = false;
  const root = global.document.getElementById('allianz-rmd-frame');
  const mark = (state) => {
    if (state === 'failed') failed = true;
    if (root && (!failed || state === 'failed')) root.setAttribute('data-rmd-static-load', state);
  };
  mark('pending');
  function permitted(method, value) {
    try {
      const url = new URL(value, global.location.href);
      return String(method || 'GET').toUpperCase() === 'GET' &&
        url.origin === global.location.origin && url.pathname === path &&
        !url.search && !url.hash && !url.username && !url.password;
    } catch { return false; }
  }
  function reject() { throw new Error('RMD_STATIC_REQUEST_BLOCKED'); }
  async function verify(buffer) {
    if (failed) return;
    try {
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== expectedBytes) { mark('failed'); return; }
      const digest = await global.crypto.subtle.digest('SHA-256', buffer);
      const hex = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      mark(hex === expectedSha256 ? 'verified' : 'failed');
    } catch { mark('failed'); }
  }
  const originalFetch = global.fetch;
  if (originalFetch) global.fetch = function staticWorkbookFetch(input, init) {
    const method = init?.method || input?.method || 'GET';
    const url = typeof input === 'string' || input instanceof URL ? input : input?.url;
    if (!permitted(method, url) || init?.body != null || input?.body != null) return reject();
    return originalFetch.call(this, input, { ...init, credentials: 'omit' }).then((response) => {
      if (!response.ok) mark('failed');
      else response.clone().arrayBuffer().then(verify, () => mark('failed'));
      return response;
    }, (error) => { mark('failed'); throw error; });
  };
  const prototype = global.XMLHttpRequest?.prototype;
  if (prototype) {
    const originalOpen = prototype.open;
    const originalSend = prototype.send;
    const allowed = new WeakSet();
    prototype.open = function staticWorkbookOpen(method, url, ...rest) {
      allowed.delete(this);
      if (!permitted(method, url) || rest[1] != null || rest[2] != null) return reject();
      allowed.add(this);
      return originalOpen.call(this, method, url, ...rest);
    };
    prototype.send = function staticWorkbookSend(body) {
      if (!allowed.has(this) || body != null) return reject();
      allowed.delete(this);
      this.addEventListener('loadend', () => {
        if (this.status < 200 || this.status >= 300) mark('failed');
        else verify(this.response);
      }, { once: true });
      return originalSend.call(this, null);
    };
  }
})(window);
