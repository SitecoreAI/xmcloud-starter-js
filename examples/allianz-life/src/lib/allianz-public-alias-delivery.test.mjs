import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { permanentRedirect } = require('next/navigation');
const filename = fileURLToPath(new URL('./allianz-page-loader.ts', import.meta.url));
const routeIndex = JSON.parse(fs.readFileSync(new URL('../../content/public-route-index.json', import.meta.url)));
const aliases = Object.entries(routeIndex).filter(([alias, canonical]) => alias !== canonical);

function loader({ draft = false, connected = true, result = null } = {}) {
  const calls = [];
  const overrides = {
    'server-only': {},
    react: { cache: (fn) => fn },
    'next/navigation': { permanentRedirect },
    'next/headers': {
      draftMode: async () => ({ isEnabled: draft }),
      headers: async () => new Headers(),
      cookies: async () => ({ get: () => undefined }),
    },
    './allianz-page': {
      isConnected: () => connected,
      getFixturePage: (...args) => { calls.push({ backend: 'fixture', args }); return result; },
    },
    './sitecore-client': { __esModule: true, default: {
      getPage: async (...args) => { calls.push({ backend: 'cms', args }); return result; },
    } },
  };
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled.require = (specifier) => Object.hasOwn(overrides, specifier)
    ? overrides[specifier] : require(specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : specifier);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return { load: compiled.exports.loadAllianzPage, calls };
}

test('the recorded alias registry contains exactly the three observed 404s', () => {
  assert.deepEqual(aliases, [
    ['/for-financial-professionals/resources/4-ways-to-help-clients-fight-inflation', '/for-financial-professionals/resources'],
    ['/get-answers/supplemental-retirement-income-with-fiul', '/get-answers'],
    ['/what-we-offer/life-insurance/foreign-national-program', '/what-we-offer/life-insurance'],
  ]);
});

for (const [alias, canonical] of aliases) {
  for (const connected of [true, false]) {
    test(`public ${connected ? 'CMS' : 'fixture'} alias redirects to ${canonical}`, async () => {
      const h = loader({ connected });
      await assert.rejects(h.load('allianz-life', 'en', ...alias.slice(1).split('/')), (error) => {
        assert.equal(error.digest, `NEXT_REDIRECT;replace;${canonical};308;`);
        return true;
      });
      assert.deepEqual(h.calls, [], 'an alias must not query a nonexistent CMS item or use snapshot content');
    });
  }
  test(`authoring navigation keeps the native alias path ${alias}`, async () => {
    const h = loader({ draft: true });
    const segments = alias.slice(1).split('/');
    await h.load('allianz-life', 'en', ...segments);
    assert.deepEqual(h.calls, [{ backend: 'cms', args: [segments, { site: 'allianz-life', locale: 'en' },
      { headers: { sc_previewMode: 'true', sc_site: 'allianz-life' } }] }]);
  });
}

for (const [site, locale, segments] of [
  ['another-site', 'en', aliases[0][0].slice(1).split('/')],
  ['allianz-life', 'fr', aliases[0][0].slice(1).split('/')],
  ['allianz-life', 'en', ['not-a-recorded-alias']],
  ['allianz-life', 'en', ['get-answers', 'supplemental-retirement-income-with-fiul%2F']],
  ['allianz-life', 'en', ['https:', '', 'example.invalid', 'get-answers']],
]) {
  test(`unrecorded or out-of-scope path remains a CMS lookup: ${site}/${locale}/${segments.join('/')}`, async () => {
    const h = loader();
    const result = await h.load(site, locale, ...segments);
    assert.equal(result.page, null, 'missing content remains missing rather than falling back to captured content');
    assert.deepEqual(h.calls, [{ backend: 'cms', args: [segments, { site, locale }] }]);
  });
}

test('canonical routes remain direct CMS reads and preserve percent literals', async () => {
  const page = { published: true };
  const h = loader({ result: page });
  for (const canonical of [...new Set(aliases.map(([, target]) => target))]) {
    const segments = canonical.slice(1).split('/');
    assert.equal((await h.load('allianz-life', 'en', ...segments)).page, page);
  }
  await h.load('allianz-life', 'en', 'about', 'literal-%24');
  assert.deepEqual(h.calls.at(-1).args[0], ['about', 'literal-%24']);
  assert.equal(h.calls.length, 4);
});

test('recorded canonical targets with missing CMS content stay missing', async () => {
  const h = loader();
  for (const canonical of [...new Set(aliases.map(([, target]) => target))]) {
    const segments = canonical.slice(1).split('/');
    assert.equal((await h.load('allianz-life', 'en', ...segments)).page, null);
    assert.deepEqual(h.calls.at(-1), { backend: 'cms', args: [segments, { site: 'allianz-life', locale: 'en' }] });
  }
  assert.equal(h.calls.length, 3);
});
