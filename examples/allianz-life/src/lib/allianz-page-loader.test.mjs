import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const { PREVIEW_COOKIES } = require('@sitecore-content-sdk/nextjs/editing');
const { DesignLibraryMode } = require('@sitecore-content-sdk/content/editing');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const routeFile = path.join(sourceRoot, 'app/[site]/[locale]/[[...path]]/page.tsx');

function layout(title, description) {
  return { sitecore: {
    context: { language: 'en', site: { name: 'allianz-life' } },
    route: { name: title, fields: {
      pageTitle: { value: title }, metaDescription: { value: description },
      metadataKeywords: { value: 'draft, current' },
    }, placeholders: {} },
  } };
}

/** Exercise real SDK routing, editing-header parsing and FetchOptions forwarding. */
function harness(t, { draft = false, connected = true, authorization, cookie, mode = 'edit', editingHeader = true, missing = false, error } = {}) {
  const previousMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = connected ? 'connected' : 'fixture';
  t.after(() => {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previousMode;
  });

  const calls = [];
  const requestReads = { headers: 0, cookies: 0 };
  const previewData = { mode, site: 'allianz-life', language: 'en', itemId: 'unit-test-item', version: 'latest', layoutKind: 'Final' };
  const requestHeaders = new Headers();
  if (editingHeader) requestHeaders.set('x-sitecore-editing-params', JSON.stringify(previewData));
  if (authorization !== undefined) requestHeaders.set('authorization', authorization);
  const authoringLayout = layout('Current authoring title', 'Current authoring description');
  const deliveryLayout = layout('Published delivery title', 'Published delivery description');
  if (missing) authoringLayout.sitecore.route = null;
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    initOptions: { defaultSite: 'allianz-life', defaultLanguage: 'en', rewriteMediaUrls: false },
    editingService: { async fetchEditingData(data, fetchOptions) {
      calls.push({ backend: 'authoring', data, fetchOptions });
      if (error) throw error;
      return { layoutData: authoringLayout };
    } },
    componentService: { async fetchComponentData(data, fetchOptions) {
      calls.push({ backend: 'design-library', data, fetchOptions });
      return authoringLayout;
    } },
    layoutService: { async fetchLayoutData(contentPath, options, fetchOptions) {
      const preview = fetchOptions?.headers?.sc_previewMode === 'true';
      calls.push({ backend: preview ? 'authoring-navigation' : 'delivery', contentPath, options, fetchOptions });
      if (preview && error) throw error;
      return preview ? authoringLayout : deliveryLayout;
    } },
    async getComponentData(pageLayout) {
      calls.push({ backend: 'component-props', pageLayout });
      return { component: { value: 'test props' } };
    },
  });
  const modules = new Map();
  const overrides = {
    'server-only': {},
    'next/headers': {
      draftMode: async () => ({ isEnabled: draft }),
      headers: async () => { requestReads.headers += 1; return requestHeaders; },
      cookies: async () => {
        requestReads.cookies += 1;
        return { get(name) {
          assert.equal(name, PREVIEW_COOKIES.PREVIEW_TOKEN);
          return cookie === undefined ? undefined : { value: cookie };
        } };
      },
    },
    'next/navigation': { notFound() { throw new Error('NEXT_NOT_FOUND'); } },
    'sitecore.config': { defaultSite: 'allianz-life' },
    'src/lib/sitecore-client': client,
    './sitecore-client': client,
    'src/Layout': { __esModule: true, default: () => null },
    'src/Providers': { __esModule: true, default: () => null },
    '.sitecore/component-map': new Map(),
    '.sitecore/sites.json': [],
    'src/i18n/routing': { routing: { locales: ['en'] } },
    'next-intl': { NextIntlClientProvider: () => null },
    'next-intl/server': { setRequestLocale() {} },
    'lib/utils': { getBaseUrl: () => 'https://render-host.invalid' },
  };
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      let local;
      if (specifier.startsWith('.')) local = path.resolve(path.dirname(filename), specifier);
      if (specifier.startsWith('lib/')) local = path.join(sourceRoot, specifier);
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
        if (resolved?.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return { ...load(routeFile), ...load(path.join(sourceRoot, 'lib/allianz-page-loader.ts')), calls, requestReads, previewData };
}

const props = (segments = ['products', 'annuities']) => ({ params: Promise.resolve({ site: 'allianz-life', locale: 'en', path: segments }) });
const renderedPage = (element) => element.props.children.props.page;

for (const connected of [true, false]) {
  test(`draft rendering and metadata use current authoring content with header priority (connected=${connected})`, async (t) => {
    const h = harness(t, { draft: true, connected, authorization: 'synthetic-request-authorization', cookie: 'synthetic-cookie-authorization' });
    const element = await h.default(props());
    const metadata = await h.generateMetadata(props());
    assert.equal(renderedPage(element).layout.sitecore.route.fields.pageTitle.value, 'Current authoring title');
    assert.equal(metadata.title, 'Current authoring title');
    assert.equal(metadata.description, 'Current authoring description');
    assert.equal(metadata.openGraph.title, 'Current authoring title');
    assert.deepEqual(metadata.keywords, ['draft', 'current']);
    assert.equal(metadata.alternates.canonical, 'https://render-host.invalid/products/annuities');
    const reads = h.calls.filter((call) => call.backend !== 'component-props');
    assert.ok(reads.length > 0);
    for (const call of reads) {
      assert.equal(call.backend, 'authoring');
      assert.equal(call.data.itemId, h.previewData.itemId);
      assert.equal(call.data.version, 'latest');
      assert.deepEqual(call.fetchOptions, { headers: { Authorization: 'synthetic-request-authorization' } });
    }
    assert.equal(h.requestReads.cookies, 0, 'header takes priority without consulting cookies');
    assert.equal(h.calls.find((call) => call.backend === 'component-props').pageLayout, renderedPage(element).layout);
    assert.doesNotMatch(JSON.stringify({ element, metadata }), /synthetic-(?:request|cookie)-authorization/);
  });
}

for (const mode of ['preview', DesignLibraryMode.Metadata]) {
  test(`${mode}: preview cookie supplies authorization to rendering and metadata`, async (t) => {
    const h = harness(t, { draft: true, mode, cookie: 'synthetic-cookie-authorization' });
    const element = await h.default(props());
    const metadata = await h.generateMetadata(props());
    assert.equal(metadata.title, renderedPage(element).layout.sitecore.route.fields.pageTitle.value);
    for (const call of h.calls.filter((call) => call.backend !== 'component-props')) {
      assert.equal(call.backend, mode === 'preview' ? 'authoring' : 'design-library');
      assert.deepEqual(call.fetchOptions, { headers: { Authorization: 'synthetic-cookie-authorization' } });
    }
    assert.ok(h.requestReads.cookies > 0);
  });
}

for (const mode of ['edit', DesignLibraryMode.Metadata]) {
  test(`${mode}: missing authorization supplies no credential override or delivery fallback`, async (t) => {
    const h = harness(t, { draft: true, mode });
    await h.default(props());
    assert.equal((await h.generateMetadata(props())).title, 'Current authoring title');
    const backend = mode === 'edit' ? 'authoring' : 'design-library';
    assert.ok(h.calls.some((call) => call.backend === backend));
    assert.ok(h.calls.every((call) => call.backend === backend || call.backend === 'component-props'));
    assert.ok(h.calls.filter((call) => call.backend === backend).every((call) => call.fetchOptions === undefined));
  });
}

for (const [name, authorization, cookie, expectedAuthorization] of [
  ['request-header priority', 'synthetic-request-authorization', 'synthetic-cookie-authorization', 'synthetic-request-authorization'],
  ['cookie fallback', undefined, 'synthetic-cookie-authorization', 'synthetic-cookie-authorization'],
  ['missing authorization', undefined, undefined, undefined],
]) {
  test(`draft navigation without editing parameters uses preview-scoped getPage for rendering and metadata: ${name}`, async (t) => {
    const h = harness(t, { draft: true, editingHeader: false, authorization, cookie });
    const element = await h.default(props());
    const metadata = await h.generateMetadata(props());
    assert.equal(renderedPage(element).layout.sitecore.route.fields.pageTitle.value, 'Current authoring title');
    assert.equal(metadata.title, 'Current authoring title');
    assert.equal(metadata.description, 'Current authoring description');
    const reads = h.calls.filter((call) => call.backend !== 'component-props');
    assert.ok(reads.length > 0);
    for (const call of reads) {
      assert.equal(call.backend, 'authoring-navigation');
      assert.equal(call.contentPath, '/products/annuities');
      assert.deepEqual(call.options, { site: 'allianz-life', locale: 'en' });
      assert.deepEqual(call.fetchOptions, { headers: {
        ...(expectedAuthorization ? { Authorization: expectedAuthorization } : {}),
        sc_previewMode: 'true', sc_site: 'allianz-life',
      } });
    }
    if (authorization) assert.equal(h.requestReads.cookies, 0);
    else assert.ok(h.requestReads.cookies > 0);
    assert.doesNotMatch(JSON.stringify({ element, metadata }), /synthetic-(?:request|cookie)-authorization/);
  });
}

test('normal connected rendering and metadata use delivery without reading or forwarding preview credentials', async (t) => {
  const h = harness(t, { authorization: 'synthetic-request-authorization', cookie: 'synthetic-cookie-authorization' });
  assert.equal(renderedPage(await h.default(props())).layout.sitecore.route.fields.pageTitle.value, 'Published delivery title');
  const metadata = await h.generateMetadata(props());
  assert.equal(metadata.title, 'Published delivery title');
  assert.equal(metadata.description, 'Published delivery description');
  for (const call of h.calls.filter((call) => call.backend !== 'component-props')) {
    assert.equal(call.backend, 'delivery');
    assert.equal(call.contentPath, '/products/annuities');
    assert.deepEqual(call.options, { site: 'allianz-life', locale: 'en' });
    assert.equal(call.fetchOptions, undefined);
  }
  assert.deepEqual(h.requestReads, { headers: 0, cookies: 0 });
});

test('normal fixture rendering and metadata keep the real local adapter and make no SDK reads', async (t) => {
  const h = harness(t, { connected: false });
  const homeProps = () => ({ params: Promise.resolve({ site: 'allianz-life', locale: 'en' }) });
  const element = await h.default(homeProps());
  const fields = renderedPage(element).layout.sitecore.route.fields;
  const homeMetadata = await h.generateMetadata(homeProps());
  assert.equal(homeMetadata.title, fields.Title.value);
  assert.equal(homeMetadata.description, fields.metadataDescription.value);
  assert.equal(homeMetadata.alternates.canonical, 'https://render-host.invalid');
  assert.deepEqual(element.props.children.props.componentProps, {});
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.requestReads, { headers: 0, cookies: 0 });
});

test('authoring missing content preserves rendering 404 and metadata defaults without delivery fallback', async (t) => {
  const h = harness(t, { draft: true, missing: true });
  await assert.rejects(h.default(props()), /NEXT_NOT_FOUND/);
  assert.equal((await h.generateMetadata(props())).title, 'Page');
  assert.ok(h.calls.every((call) => call.backend === 'authoring'));
});

test('authoring failures propagate to rendering and metadata without hiding them with delivery content', async (t) => {
  const error = new Error('synthetic authoring service failure');
  const h = harness(t, { draft: true, error });
  await assert.rejects(h.default(props()), (actual) => actual === error);
  await assert.rejects(h.generateMetadata(props()), (actual) => actual === error);
  assert.ok(h.calls.every((call) => call.backend === 'authoring'));
});
