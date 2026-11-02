import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { personalizeLayout } = require('@sitecore-content-sdk/content/personalize');
const ROOT = new URL('../', import.meta.url);
const FOOTER = '1A13FF5E-35DD-4468-8B21-5C149140F127';
const ROUTE = '214D3628-E161-5337-97F7-2F74DB7DD027';
const PIMCO = '3DEF0D8F-31E3-4EEB-9413-DE850D3D1B9F';
const GROUP = 'A02BFA68-1C77-43BC-B745-F4C0A05E740C';
const RUNTIME = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/allianz-ny-footer-projection-20261102' };
const ARGS = [['new-york'], { site: 'allianz-life', locale: 'en' }];

function compile(name, mocks = {}) {
  const filename = fileURLToPath(new URL(name, ROOT));
  const source = fs.readFileSync(filename, 'utf8');
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(fileURLToPath(ROOT));
  mod.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : createRequire(filename)(id);
  mod._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}

const projection = compile('allianz-ny-footer-probe.ts');
const completeness = compile('collection-completeness.ts');

test('the diagnostic is imported only from the existing server-only page loader', () => {
  const imports = (name) => ts.preProcessFile(fs.readFileSync(new URL(name, ROOT), 'utf8')).importedFiles.map((entry) => entry.fileName);
  assert.ok(imports('allianz-page-loader.ts').includes('server-only'));
  assert.ok(imports('allianz-page-loader.ts').includes('./allianz-ny-footer-client'));
  assert.equal(imports('sitecore-client.ts').some((name) => name.includes('ny-footer')), false);
});

function leaf(id, href) {
  return { id, link: { jsonValue: { value: { href, anchor: '', querystring: '', target: '' } } } };
}
function footer(stale = false) {
  return {
    componentName: 'AllianzLegacyFooter', uid: 'synthetic-footer', dataSource: FOOTER,
    fields: { data: { datasource: { id: FOOTER, primaryNav: { targetItems: [{
      children: { total: 2, pageInfo: { hasNext: false }, results: [
        leaf(PIMCO, stale ? '#demo-unavailable' : 'https://www.pimco.com/us/en'),
        leaf(GROUP, stale ? '#demo-unavailable' : 'https://www.allianz.com/en_GB.html'),
      ] },
    }] } } } },
  };
}
function layout(staleDefault = true) {
  const rendering = footer();
  if (staleDefault) rendering.experiences = { _default: footer(true) };
  return { sitecore: { context: { site: { name: 'allianz-life' }, pageState: 'normal' }, route: {
    itemId: ROUTE, placeholders: { 'headless-footer': [rendering] },
  } } };
}

function harness({ source = layout(), normal = true, design = false, failure } = {}) {
  const calls = [];
  let constructed = 0;
  const service = { async fetchLayoutData(...args) {
    calls.push(args);
    if (failure) throw failure;
    return source;
  } };
  const originalRead = service.fetchLayoutData;
  class MockSdkClient {
    constructor() { constructed++; this.layoutService = service; }
    async getPage(path, options, fetchOptions) {
      const raw = await this.layoutService.fetchLayoutData(path, options, fetchOptions);
      personalizeLayout(raw, '_default', []);
      return {
        layout: raw, siteName: options.site, locale: options.locale,
        mode: { isNormal: normal, isEditing: !normal, isPreview: false, isDesignLibrary: design },
      };
    }
  }
  const adapter = compile('allianz-ny-footer-client.ts', {
    'server-only': {},
    '@sitecore-content-sdk/nextjs/client': { SitecoreClient: MockSdkClient },
    './allianz-ny-footer-probe': projection,
  });
  return { adapter, source, calls, service, originalRead, constructed: () => constructed };
}

test('one normal request preserves the response while capturing before/default/after selection', async () => {
  const h = harness();
  const result = await h.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail('fallback'), RUNTIME);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0], [ARGS[0], ARGS[1], undefined]);
  assert.equal(h.service.fetchLayoutData, h.originalRead);
  assert.equal(result.layout, h.source);
  const proof = result.layout.sitecore.context.allianzNyFooterProbe;
  assert.equal(proof.before.current.pimco.status, 'correct');
  assert.equal(proof.before.effectiveDefault.pimco.status, 'unavailable');
  assert.equal(proof.after.current.pimco.status, 'unavailable');
  assert.equal(proof.after.current.allianzGroup.status, 'unavailable');
  assert.equal(proof.after.variantDefault, true);
  assert.notEqual(proof.before.digest, proof.after.digest);
});

for (const [name, args, runtime] of [
  ['production', ARGS, { ...RUNTIME, VERCEL_ENV: 'production' }],
  ['missing environment', ARGS, {}],
  ['another branch', ARGS, { ...RUNTIME, VERCEL_GIT_COMMIT_REF: 'allianz-life' }],
  ['another route', [['about'], ARGS[1]], RUNTIME],
  ['encoded or extra path', [['new-york', '%61bout'], ARGS[1]], RUNTIME],
  ['another site', [ARGS[0], { ...ARGS[1], site: 'other' }], RUNTIME],
  ['another language', [ARGS[0], { ...ARGS[1], locale: 'fr-FR' }], RUNTIME],
  ['explicit personalization', [ARGS[0], { ...ARGS[1], personalize: { variantId: 'named', componentVariantIds: [] } }], RUNTIME],
  ['any fetch options', [...ARGS, {}], RUNTIME],
  ['native navigation headers', [...ARGS, { headers: { Authorization: 'SYNTHETIC_SECRET', sc_previewMode: 'true' } }], RUNTIME],
]) test(`${name} uses the untouched fallback without constructing a diagnostic client`, async () => {
  const h = harness();
  const sentinel = {};
  let forwarded;
  const result = await h.adapter.readPageWithNyFooterProbe({}, args, async (...a) => { forwarded = a; return sentinel; }, runtime);
  assert.equal(result, sentinel);
  assert.deepEqual(forwarded, args);
  assert.equal(h.constructed(), 0);
  assert.equal(h.calls.length, 0);
});

test('wrong native route ID and non-normal page modes never expose a receipt', async () => {
  for (const invalid of ['route', 'mode', 'context', 'design']) {
    const source = layout();
    if (invalid === 'route') source.sitecore.route.itemId = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF';
    if (invalid === 'context') source.sitecore.context.pageEditing = true;
    const h = harness({ source, normal: invalid !== 'mode', design: invalid === 'design' });
    const result = await h.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME);
    assert.equal(Object.hasOwn(result.layout.sitecore.context, 'allianzNyFooterProbe'), false);
  }
});

test('the original request error propagates unchanged without retry or diagnostic logging', async () => {
  const failure = new Error('SYNTHETIC_PRIVATE_ERROR');
  const h = harness({ failure });
  await assert.rejects(h.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME), (error) => error === failure);
  assert.equal(h.calls.length, 1);
});

test('context is the only page change and collection validation is unchanged', async () => {
  const expected = layout();
  personalizeLayout(expected, '_default', []);
  const originalComplete = completeness.collectionsComplete(expected, true);
  const h = harness();
  const result = await h.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME);
  assert.equal(completeness.collectionsComplete(result.layout, true), originalComplete);
  delete result.layout.sitecore.context.allianzNyFooterProbe;
  assert.deepEqual(result.layout, expected);
});

test('only fixed projected facts are serialized, never input text, credentials or script fragments', async () => {
  const source = layout();
  source.sitecore.context.privateMarker = 'SYNTHETIC_SECRET_</script>?token=PRIVATE_VALUE';
  source.sitecore.route.fields = { arbitrary: { value: 'SYNTHETIC_PRIVATE_CUSTOMER' } };
  const h = harness({ source });
  const result = await h.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME);
  const text = JSON.stringify(result.layout.sitecore.context.allianzNyFooterProbe);
  assert.doesNotMatch(text, /SYNTHETIC|PRIVATE|<|token=|children/);
  assert.ok(text.length < 6000);
});

test('concurrent calls retain independent primitive snapshots', async () => {
  const first = harness({ source: layout(true) });
  const second = harness({ source: layout(false) });
  const [a, b] = await Promise.all([
    first.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME),
    second.adapter.readPageWithNyFooterProbe({}, ARGS, () => assert.fail(), RUNTIME),
  ]);
  assert.equal(a.layout.sitecore.context.allianzNyFooterProbe.after.current.pimco.status, 'unavailable');
  assert.equal(b.layout.sitecore.context.allianzNyFooterProbe.after.current.pimco.status, 'correct');
  assert.equal(first.calls.length, 1);
  assert.equal(second.calls.length, 1);
});

for (const [category, api] of [
  ['platform-context', { edge: { contextId: 'SYNTHETIC_SECRET_CONTEXT' }, local: { apiKey: 'SYNTHETIC_SECRET_KEY', apiHost: 'https://edge.sitecorecloud.io' } }],
  ['other-context', { edge: { contextId: 'SYNTHETIC_SECRET_CONTEXT', edgeUrl: 'https://synthetic.invalid' } }],
  ['direct-edge', { local: { apiKey: 'SYNTHETIC_SECRET_KEY', apiHost: 'https://edge.sitecorecloud.io' } }],
  ['sitecore-cm', { local: { apiKey: 'SYNTHETIC_SECRET_KEY', apiHost: 'https://xmc-synthetic.sitecorecloud.io' } }],
  ['other-local-api', { local: { apiKey: 'SYNTHETIC_SECRET_KEY', apiHost: 'https://synthetic.invalid' } }],
  ['unclassified', {}],
]) test(`connection metadata is only the fixed ${category} category`, async () => {
  const h = harness();
  const result = await h.adapter.readPageWithNyFooterProbe({ api }, ARGS, () => assert.fail(), RUNTIME);
  const proof = result.layout.sitecore.context.allianzNyFooterProbe;
  assert.equal(proof.connection, category);
  assert.doesNotMatch(JSON.stringify(proof), /SYNTHETIC|SECRET|https?:|contextId|apiKey|apiHost|edgeUrl/);
  assert.equal(h.calls.length, 1);
});
