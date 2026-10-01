import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { EDITING_ALLOWED_ORIGINS } = require('@sitecore-content-sdk/content/editing');
const { getAllowedOriginsFromEnv } = require('@sitecore-content-sdk/core/tools');
const { NodeNextRequest, NodeNextResponse } = require('next/dist/server/base-http/node');
const { sendResponse } = require('next/dist/server/send-response');
const { buildCustomRoute } = require('next/dist/server/lib/router-utils/filesystem');
const { hasRemoteMatch } = require('next/dist/shared/lib/match-remote-pattern');
const configFile = fileURLToPath(new URL('../../next.config.ts', import.meta.url));
const editingScriptOrigins = [
  'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io',
  'https://feaasstatic.blob.core.windows.net',
  'https://pages.sitecorecloud.io',
];

// Independently retain the visitor policy that preceded the editing-only fix.
const priorVisitorCsp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.sitecorecloud.io https://*.sitecore.io; font-src 'self' data:; connect-src 'self' https://*.sitecorecloud.io https://*.sitecore.io; frame-src 'self'; form-action 'none'; base-uri 'self'; object-src 'none'";
const contentHubPublicImages = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/';
const visitorCsp = priorVisitorCsp.replace('https://*.sitecore.io; font-src', `https://*.sitecore.io ${contentHubPublicImages}; font-src`);

function loadConfig(t, { nodeEnv = 'production', allowedOrigins = '' } = {}) {
  for (const [key, value] of Object.entries({ NODE_ENV: nodeEnv, JSS_ALLOWED_ORIGINS: allowedOrigins })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  const compiled = new Module(configFile);
  compiled.filename = configFile;
  compiled.paths = Module._nodeModulePaths(path.dirname(configFile));
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => specifier === 'next-intl/plugin'
    ? { __esModule: true, default: () => (config) => config }
    : nativeRequire(specifier);
  compiled._compile(ts.transpileModule(fs.readFileSync(configFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, configFile);
  return compiled.exports.default;
}

function cspFromRule(rule) {
  return rule.headers.find(({ key }) => key.toLowerCase() === 'content-security-policy').value;
}

function directives(policy) {
  return new Map(policy.split(';').map((value) => value.trim()).filter(Boolean)
    .map((value) => {
      const [name, ...sources] = value.split(/\s+/);
      return [name, sources];
    }));
}

test('production visitor CSP adds only the verified public-image path', async (t) => {
  const rules = await loadConfig(t).headers();
  assert.equal(rules[0].source, '/:path*');
  assert.equal(cspFromRule(rules[0]), visitorCsp);
  const current = directives(cspFromRule(rules[0]));
  for (const [name, sources] of directives(priorVisitorCsp)) {
    assert.deepEqual(current.get(name), name === 'img-src' ? [...sources, contentHubPublicImages] : sources);
  }
  assert.equal(current.size, directives(priorVisitorCsp).size);
  assert.deepEqual(rules[0].headers.filter(({ key }) => key !== 'Content-Security-Policy'), [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ]);
});

test('Next image matching permits public Content Hub originals and excludes gateway thumbnails', (t) => {
  const patterns = loadConfig(t).images.remotePatterns;
  assert.equal(hasRemoteMatch([], patterns, new URL(`${contentHubPublicImages}verified-original?v=synthetic`)), true);
  for (const url of [
    'https://thlt-demo.sitecoresandbox.cloud/api/gateway/113648/thumbnail',
    'https://thlt-demo.sitecoresandbox.cloud/api/public/other/verified-original',
    'https://other.sitecoresandbox.cloud/api/public/content/verified-original',
    'http://thlt-demo.sitecoresandbox.cloud/api/public/content/verified-original',
    'https://thlt-demo.sitecoresandbox.cloud:444/api/public/content/verified-original',
  ]) assert.equal(hasRemoteMatch([], patterns, new URL(url)), false);
});

test('development retains only the existing development unsafe-eval exception', async (t) => {
  const rules = await loadConfig(t, { nodeEnv: 'development' }).headers();
  assert.equal(cspFromRule(rules[0]), visitorCsp.replace("'unsafe-inline'; style-src", "'unsafe-inline' 'unsafe-eval'; style-src"));
});

test('only the exact editing render route adds the three witnessed script origins', async (t) => {
  const rules = await loadConfig(t).headers();
  assert.equal(rules.length, 2);
  assert.equal(rules[1].source, '/api/editing/render');
  assert.equal(rules[1].headers.length, 1);
  const policy = directives(cspFromRule(rules[1]));
  assert.deepEqual(policy.get('script-src'), ["'self'", "'unsafe-inline'", ...editingScriptOrigins]);
  assert.ok(!policy.get('script-src').includes("'unsafe-eval'"));
  assert.ok(policy.get('script-src').every((source) => !source.includes('*')));
});

test('editing preserves every non-script visitor directive and SDK frame ancestors', async (t) => {
  const rules = await loadConfig(t).headers();
  const policy = directives(cspFromRule(rules[1]));
  for (const [directive, sources] of directives(visitorCsp)) {
    if (directive !== 'script-src') assert.deepEqual(policy.get(directive), sources);
  }
  assert.deepEqual(policy.get('frame-ancestors'), ["'self'", ...EDITING_ALLOWED_ORIGINS]);
  assert.equal(policy.size, directives(visitorCsp).size + 1);
});

test('existing SDK additional framing origins are preserved without entering script-src', async (t) => {
  const rules = await loadConfig(t, { allowedOrigins: 'https://editor.example.test, https://other-editor.example.test' }).headers();
  const policy = directives(cspFromRule(rules[1]));
  assert.deepEqual(policy.get('frame-ancestors'), ["'self'", ...getAllowedOriginsFromEnv(), ...EDITING_ALLOWED_ORIGINS]);
  assert.deepEqual(policy.get('script-src'), ["'self'", "'unsafe-inline'", ...editingScriptOrigins]);
});

test('installed Next Node transport retains the last matching config policy over SDK Response CSP', async (t) => {
  const rules = (await loadConfig(t).headers()).map((rule) => buildCustomRoute('header', rule));
  const sdkCsp = `frame-ancestors 'self' ${[...getAllowedOriginsFromEnv(), ...EDITING_ALLOWED_ORIGINS].join(' ')}`;
  const server = http.createServer(async (req, res) => {
    // Use Next's real route matchers and sender with the documented ordered config headers.
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname !== '/without-config') {
      for (const rule of rules) {
        if (rule.match(pathname)) {
          for (const { key, value } of rule.headers) res.setHeader(key, value);
        }
      }
    }
    await sendResponse(new NodeNextRequest(req), new NodeNextResponse(res), new Response('safe fixture', {
      headers: { 'Content-Security-Policy': sdkCsp },
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [pathname, expected] of [
    ['/api/editing/render', cspFromRule(rules[1])],
    ['/', visitorCsp],
    ['/api/editing/config', visitorCsp],
    ['/api/editing/render/extra', visitorCsp],
    ['/without-config', sdkCsp],
  ]) {
    const response = await fetch(base + pathname);
    assert.equal(response.headers.get('content-security-policy'), expected, pathname);
    await response.text();
  }
});
