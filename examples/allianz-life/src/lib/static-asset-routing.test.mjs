import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

// Next's test utility normally runs after the framework initializes this global.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const { unstable_doesMiddlewareMatch: matches } = require('next/experimental/testing/server');
const { PreviewProxy, defineProxy } = require('@sitecore-content-sdk/nextjs/proxy');
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceFile = path.join(appRoot, 'src/proxy.ts');
function load(filename) {
  const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = compiled.require.bind(compiled);
  compiled.require = specifier => {
    if (specifier === '.sitecore/sites.json') return { __esModule: true, default: [] };
    if (specifier === 'sitecore.config') return { __esModule: true, default: { api: { edge: {}, local: {} }, multisite: {}, redirects: {}, personalize: {} } };
    if (specifier === './i18n/routing') return { routing: { locales: ['en'] } };
    if (specifier === './lib/sitecore-client') return { __esModule: true, default: { getPage: () => { throw new Error('Unexpected real pipeline call in fixture test'); } } };
    if (specifier === './lib/allianz-content-mode') return load(path.join(appRoot, 'src/lib/allianz-content-mode.ts'));
    return original(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}
const current = load(sourceFile);
// Independent pinned 904d226 matcher. Retain this witness of the original bug.
const before = { matcher: ['/', '/((?!api/|\\.well-known/|sitemap|robots|llms|_next/|healthz|sitecore/api/|-/|allianz-assets/|allianz-legacy-assets/|fonts/|favicon.ico|sc_logo.svg|ai/).*)'] };
const asset = '/allianz-ui/video-placeholder.svg';
const doesMatch = (config, url, extra = {}) => matches({ config, nextConfig: {}, url, ...extra });
function env(t, values) {
  for (const [key, value] of Object.entries(values)) {
    const old = process.env[key]; process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
}

test('only the verified static video graphic bypasses the page proxy', () => {
  for (const url of [asset, `${asset}?v=review`, `https://editing.example.invalid${asset}?v=review`]) {
    assert.equal(doesMatch(before, url), true);
    assert.equal(doesMatch(current.config, url), false);
  }
});

test('the exact-file exemption does not cover other files, suffixes, or catch-all pages', () => {
  for (const url of ['/allianz-ui', '/allianz-ui/', '/allianz-ui/en/private', '/allianz-ui/other.svg',
    '/allianz-ui/video-placeholderXsvg', '/allianz-ui/video-placeholder.svg.exe',
    '/allianz-ui/video-placeholder.svg/extra', '/allianz-ui/video-placeholder.svg/',
    '/allianz-ui/video-placeholder.svgx', '/ALLIANZ-UI/video-placeholder.svg']) {
    assert.equal(doesMatch(current.config, url), true, url);
  }
});

test('existing page and service proxy coverage remains unchanged', () => {
  for (const url of ['/', '/about', '/new-york/about', '/new-york/about/our-spirit', '/login',
    '/new-york/login', '/account', '/allianz-life/en/about', '/api', '/healthz-extra']) {
    assert.equal(doesMatch(current.config, url), doesMatch(before, url), url);
  }
});

test('all previous static/API exclusions remain unchanged', () => {
  for (const url of ['/api/editing/render', '/api/editing/config', '/sitecore/api/layout/render',
    '/_next/static/chunk.js', '/allianz-assets/source-style.css', '/allianz-legacy-assets/legacy-style.css',
    '/fonts/allianz/AllianzNeoW01-Regular.woff2', '/favicon.ico', '/sc_logo.svg', '/.well-known/ai.txt']) {
    assert.equal(doesMatch(current.config, url), false, url);
    assert.equal(doesMatch(before, url), false, url);
  }
});

test('cookies and headers cannot widen the exact static-file exception', () => {
  for (const extra of [{}, { cookies: { sc_site: 'allianz-life', sc_headless_mode: 'preview' } },
    { headers: { 'x-sitecore-editing-params': '{"mode":"edit"}' } }]) {
    assert.equal(doesMatch(current.config, asset, extra), false);
    assert.equal(doesMatch(current.config, '/allianz-ui/en/private', extra), true);
    assert.equal(doesMatch(current.config, '/new-york/about', extra), true);
  }
});

test('the installed PreviewProxy reproduces the old static-asset 403 without any network calls', async t => {
  env(t, { SITECORE: '1' });
  const calls = [];
  const preview = new PreviewProxy({ client: { getPage: async pathname => { calls.push(pathname); return null; } } });
  let subsequentCalls = 0;
  const pipeline = defineProxy(preview, { handle: async (_req, res) => { subsequentCalls++; return res; } });
  const request = new NextRequest(`https://editing.example.invalid${asset}`);
  assert.equal(doesMatch(before, asset), true);
  const response = await pipeline.exec(request);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { html: 'Preview content is not found or access is denied' });
  assert.deepEqual(calls, [asset]);
  assert.equal(subsequentCalls, 0);
});

test('the new matcher leaves the static file to Next instead of entering PreviewProxy', async t => {
  env(t, { SITECORE: '1' });
  let cmsCalls = 0;
  const pipeline = defineProxy(new PreviewProxy({ client: { getPage: async () => { cmsCalls++; return null; } } }));
  const response = doesMatch(current.config, asset)
    ? await pipeline.exec(new NextRequest(`https://editing.example.invalid${asset}`))
    : NextResponse.next();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-middleware-next'), '1');
  assert.equal(response.headers.get('x-middleware-rewrite'), null);
  assert.equal(cmsCalls, 0);
  // A pass-through response is not proof of deployed filesystem delivery.
});

test('normal CMS routes still enter PreviewProxy and retain its denial behavior', async t => {
  env(t, { SITECORE: '1' });
  const calls = [];
  const pipeline = defineProxy(new PreviewProxy({ client: { getPage: async pathname => { calls.push(pathname); return null; } } }));
  for (const url of ['/login', '/new-york/about', '/allianz-ui/en/private']) {
    assert.equal(doesMatch(current.config, url), true);
    const response = await pipeline.exec(new NextRequest(`https://editing.example.invalid${url}`));
    assert.equal(response.status, 403);
  }
  assert.deepEqual(calls, ['/login', '/new-york/about', '/allianz-ui/en/private']);
});

test('fixture mode no longer rewrites the static image into a CMS page route', async t => {
  env(t, { NODE_ENV: 'test', NEXT_PUBLIC_ALLIANZ_CONTENT_MODE: 'fixture' });
  const request = new NextRequest(`https://fixture.example.invalid${asset}`);
  assert.equal(doesMatch(before, asset), true);
  const oldResponse = await current.default(request);
  assert.equal(new URL(oldResponse.headers.get('x-middleware-rewrite')).pathname, `/allianz-life/en${asset}`);
  assert.equal(doesMatch(current.config, asset), false);
  assert.equal(doesMatch(current.config, '/new-york/about'), true);
  const pageResponse = await current.default(new NextRequest('https://fixture.example.invalid/new-york/about'));
  assert.equal(new URL(pageResponse.headers.get('x-middleware-rewrite')).pathname, '/allianz-life/en/new-york/about');
});
