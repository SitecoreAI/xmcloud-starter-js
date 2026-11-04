import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const script = fs.readFileSync(path.join(app, 'public/allianz-assets/rmd/static-workbook-boundary.js'), 'utf8');
const workbookPath = '/~/Media/Files/Global/ToolShed/dx-required-minimum-distribution-general-ed/dx-required-minimum-distribution-general-ed-xlsx.xlsx';
const bytes = fs.readFileSync(path.join(app, 'public', workbookPath));
const arrayBuffer = (raw = bytes) => raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);

function fixture({ status = 200, raw = bytes, fetchReject = false } = {}) {
  const attributes = new Map(), dispatched = [], fetches = [];
  let notify;
  const root = { setAttribute(name, value) { attributes.set(name, value); notify?.(value); } };
  class Xhr extends EventTarget {
    open(...args) { this.opened = args; }
    send(body) { dispatched.push({ xhr: this, body }); }
  }
  const response = { ok: status >= 200 && status < 300, status,
    clone: () => ({ arrayBuffer: async () => arrayBuffer(raw) }) };
  const window = { document: { getElementById: (id) => id === 'allianz-rmd-frame' ? root : null },
    location: { href: 'https://demo.invalid/allianz-assets/rmd/index.html', origin: 'https://demo.invalid' },
    crypto: webcrypto, XMLHttpRequest: Xhr,
    fetch: async (...args) => { fetches.push(args); if (fetchReject) throw new Error('synthetic transport failure'); return response; } };
  vm.runInNewContext(script, { window, URL, ArrayBuffer, Uint8Array, WeakSet, Error, Promise }, { timeout: 1000 });
  const state = () => attributes.get('data-rmd-static-load');
  const awaitState = (wanted, action) => new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`Expected ${wanted}, got ${state()}`)), 1000);
    notify = (value) => { if (value === wanted) { clearTimeout(deadline); notify = undefined; resolve(); } };
    action();
    if (state() === wanted) { clearTimeout(deadline); notify = undefined; resolve(); }
  });
  const xhr = () => { const x = new window.XMLHttpRequest(); x.status = status; x.response = arrayBuffer(raw); return x; };
  return { window, xhr, state, awaitState, dispatched, fetches, response };
}

test('only exact same-origin bodyless workbook GET reaches fetch, preserving original response', async () => {
  const f = fixture();
  assert.equal(f.state(), 'pending');
  let response;
  await f.awaitState('verified', () => { f.window.fetch(workbookPath).then((r) => { response = r; }); });
  assert.equal(response, f.response);
  assert.equal(f.fetches.length, 1);
  assert.equal(f.fetches[0][1].credentials, 'omit');
  assert.equal(Object.keys(f.window).some((key) => /RMD|DEBUG|QA/.test(key)), false);
});

test('external, query, fragment, credential-bearing, wrong-path and body/method requests never dispatch', () => {
  const f = fixture();
  for (const target of ['https://other.invalid'+workbookPath, workbookPath+'?x=1', workbookPath+'#x',
    'https://name:password@demo.invalid'+workbookPath, '/api/calculate', undefined]) {
    assert.throws(() => f.window.fetch(target), /RMD_STATIC_REQUEST_BLOCKED/);
  }
  assert.throws(() => f.window.fetch(workbookPath, { method: 'POST' }), /RMD_STATIC_REQUEST_BLOCKED/);
  assert.throws(() => f.window.fetch(workbookPath, { body: '' }), /RMD_STATIC_REQUEST_BLOCKED/);
  assert.equal(f.fetches.length, 0);
});

test('exact XHR verifies already-received bytes without replacing original callbacks or response', async () => {
  const f = fixture(), x = f.xhr();
  const response = x.response;
  let callbacks = 0;
  x.addEventListener('loadend', () => callbacks++);
  x.open('GET', workbookPath, true); x.send(null);
  assert.deepEqual(x.opened, ['GET', workbookPath, true]);
  assert.equal(f.dispatched.length, 1);
  await f.awaitState('verified', () => x.dispatchEvent(new Event('loadend')));
  assert.equal(x.response, response);
  assert.equal(callbacks, 1);
});

test('XHR rejects body, unknown opens, methods and user/password arguments before send', () => {
  const f = fixture();
  assert.throws(() => f.xhr().send(), /RMD_STATIC_REQUEST_BLOCKED/);
  for (const args of [['POST', workbookPath, true], ['GET', '/api/calculate', true],
    ['GET', workbookPath, true, 'name', 'password']]) assert.throws(() => f.xhr().open(...args), /RMD_STATIC_REQUEST_BLOCKED/);
  const x = f.xhr(); x.open('GET', workbookPath, true);
  assert.throws(() => x.send(''), /RMD_STATIC_REQUEST_BLOCKED/);
  assert.equal(f.dispatched.length, 0);
});

test('404 failure is fixed before any misleading source form can be considered ready', () => {
  const f = fixture({ status: 404 }), x = f.xhr();
  x.open('GET', workbookPath, true); x.send(); x.dispatchEvent(new Event('loadend'));
  assert.equal(f.state(), 'failed');
});

test('200 truncated workbook is rejected', async () => {
  const f = fixture({ raw: bytes.subarray(0, bytes.length - 1) }), x = f.xhr();
  x.open('GET', workbookPath, true); x.send();
  await f.awaitState('failed', () => x.dispatchEvent(new Event('loadend')));
});

test('200 corrupt same-length workbook is rejected by hash', async () => {
  const corrupt = Buffer.from(bytes); corrupt[30] ^= 1;
  const f = fixture({ raw: corrupt }), x = f.xhr();
  x.open('GET', workbookPath, true); x.send();
  await f.awaitState('failed', () => x.dispatchEvent(new Event('loadend')));
});

test('fetch HTTP and transport failure are retained without adding retry', async () => {
  const f = fixture({ status: 404 });
  assert.equal((await f.window.fetch(workbookPath)).status, 404);
  assert.equal(f.state(), 'failed'); assert.equal(f.fetches.length, 1);
  const g = fixture({ fetchReject: true });
  await assert.rejects(g.window.fetch(workbookPath), /synthetic transport failure/);
  assert.equal(g.state(), 'failed'); assert.equal(g.fetches.length, 1);
});

test('a later successful read cannot clear a prior failure in the same source document', async () => {
  const f = fixture({ status: 404 }), x = f.xhr();
  x.open('GET', workbookPath, true); x.send(); x.dispatchEvent(new Event('loadend'));
  const y = f.xhr(); y.status = 200;
  y.open('GET', workbookPath, true); y.send(); y.dispatchEvent(new Event('loadend'));
  await new Promise(setImmediate);
  assert.equal(f.state(), 'failed');
});
