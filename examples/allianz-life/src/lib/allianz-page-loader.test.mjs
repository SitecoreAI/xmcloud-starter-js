import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadSource as loadSdkSource } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const { PREVIEW_COOKIES } = require('@sitecore-content-sdk/nextjs/editing');
const { DesignLibraryMode } = require('@sitecore-content-sdk/content/editing');
const { getRouteMatcher } = require('next/dist/shared/lib/router/utils/route-matcher');
const { getRouteRegex } = require('next/dist/shared/lib/router/utils/route-regex');
const { getDynamicParam } = require('next/dist/shared/lib/router/utils/get-dynamic-param');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const routeFile = path.join(sourceRoot, 'app/[site]/[locale]/[[...path]]/page.tsx');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { PathnameContext } = require('next/dist/shared/lib/hooks-client-context.shared-runtime');
const { Default: LegacyRichText } = loadSdkSource(path.join(sourceRoot, 'components/allianz-legacy-rich-text/AllianzLegacyRichText.tsx'));

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
function harness(t, { draft = false, connected = true, nodeEnv = 'test', contentMode = connected ? 'connected' : 'fixture', authorization, cookie, mode = 'edit', editingHeader = true, missing = false, deliveryMissing = false, error, expectedContentPath } = {}) {
  const previousMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  const previousNodeEnv = process.env.NODE_ENV;
  if (contentMode === null) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = contentMode;
  process.env.NODE_ENV = nodeEnv;
  t.after(() => {
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previousMode;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
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
  if (deliveryMissing) deliveryLayout.sitecore.route = null;
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
      if (error) throw error;
      if (expectedContentPath !== undefined && contentPath !== expectedContentPath) {
        return { sitecore: { ...deliveryLayout.sitecore, route: null } };
      }
      return preview ? authoringLayout : deliveryLayout;
    } },
    async getData() { throw new Error('No automatic rendering exists in this layout fixture'); },
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
  return { ...load(routeFile), ...load(path.join(sourceRoot, 'lib/allianz-page-loader.ts')), ...load(path.join(sourceRoot, 'lib/allianz-page.ts')), ...load(path.join(sourceRoot, 'lib/collection-completeness.ts')), calls, requestReads, previewData, deliveryLayout };
}

const props = (segments = ['products', 'annuities']) => ({ params: Promise.resolve({ site: 'allianz-life', locale: 'en', path: segments }) });
const renderedPage = (element) => element.props.children.props.page;

const pressPath = '/about/newsroom/2026-press-releases/allianz-life-invests-$750000-to-help-address-growing-housing-and-food-insecurity-in-the-twin-cities';
const matchAppRoute = getRouteMatcher(getRouteRegex('/[site]/[locale]/[[...path]]'));

for (const draft of [false, true]) {
  for (const publicPath of [pressPath, pressPath.replace('$', '%24')]) {
    test(`encoded press route resolves for page and metadata (draft=${draft}, url=${publicPath.includes('%24') ? 'encoded' : 'raw'})`, async (t) => {
      // Use the installed Next.js matcher and page-param conversion, rather than
      // assuming raw '$' requests produce decoded page params. Metadata receives
      // the original interpolated params; page construction encodes them.
      const matched = matchAppRoute(`/allianz-life/en${publicPath}`);
      const pagePath = getDynamicParam(matched, 'path', 'oc', null, null).value;
      assert.ok(pagePath.at(-1).includes('%24'));
      assert.ok(matched.path.at(-1).includes('$'));
      const h = harness(t, { draft, editingHeader: false, expectedContentPath: pressPath });
      const element = await h.default(props(pagePath));
      const metadata = await h.generateMetadata(props(matched.path));
      assert.equal(metadata.title, renderedPage(element).layout.sitecore.route.fields.pageTitle.value);
      assert.equal(metadata.alternates.canonical, `https://render-host.invalid${pressPath}`);
      const reads = h.calls.filter((call) => call.backend !== 'component-props');
      assert.ok(reads.length > 0);
      for (const call of reads) {
        assert.equal(call.contentPath, pressPath);
        assert.equal(call.backend, draft ? 'authoring-navigation' : 'delivery');
        assert.deepEqual(call.fetchOptions, draft ? { headers: { sc_previewMode: 'true', sc_site: 'allianz-life' } } : undefined);
      }
    });
  }
}

for (const [name, publicSegment, nativeSegment] of [
  ['literal percent dollar', 'literal-%2524', 'literal-%24'],
  ['literal percent slash', 'literal-%252F', 'literal-%2F'],
  ['literal percent Unicode', 'literal-%25C3%25A9', 'literal-%C3%A9'],
  ['literal percent dot segments', '%252e%252e', '%2e%2e'],
  ['Unicode', 'caf%C3%A9', 'café'],
  ['raw Unicode and emoji', 'café-💶', 'café-💶'],
  ['encoded Unicode and emoji', 'caf%C3%A9-%F0%9F%92%B6', 'café-💶'],
  ['question hash and plus', 'what%3Ftag%23sum%2B', 'what?tag#sum+'],
  ['encoded slash', 'section%2Fchild', 'section/child'],
  ['literal malformed escape', 'broken-%25zz', 'broken-%zz'],
  ['mixed dollar and malformed escape', 'cost%24-and-broken%25zz', 'cost$-and-broken%zz'],
]) {
  for (const mode of ['delivery', 'navigation', 'fixture']) {
    test(`page and metadata agree on ${name} in ${mode}`, async (t) => {
      const matched = matchAppRoute(`/allianz-life/en/about/${publicSegment}`);
      const pagePath = getDynamicParam(matched, 'path', 'oc', null, null).value;
      const expectedContentPath = `/about/${nativeSegment}`;
      const h = harness(t, { draft: mode === 'navigation', editingHeader: false,
        connected: mode !== 'fixture', expectedContentPath });
      if (mode === 'fixture') {
        h.fixtureContent.routes[expectedContentPath.toLowerCase()] = {
          ...h.fixtureContent.routes['/'], title: `Native ${name}`, description: `Description ${name}`,
        };
      }
      const originalPagePath = [...pagePath];
      const originalMetadataPath = [...matched.path];
      const element = await h.default(props(pagePath));
      const metadata = await h.generateMetadata(props(matched.path));
      const fields = renderedPage(element).layout.sitecore.route.fields;
      assert.equal(metadata.title, mode === 'fixture' ? fields.Title.value : fields.pageTitle.value);
      assert.deepEqual(pagePath, originalPagePath);
      assert.deepEqual(matched.path, originalMetadataPath);
      if (mode === 'fixture') {
        assert.equal(metadata.title, `Native ${name}`);
        assert.deepEqual(h.calls, []);
      } else {
        const reads = h.calls.filter((call) => call.backend !== 'component-props');
        assert.ok(reads.length > 0);
        for (const call of reads) assert.equal(call.contentPath, expectedContentPath);
      }
    });
  }
}

for (const draft of [false, true]) {
  test(`the shared loader preserves native percent literals and home paths (draft=${draft})`, async (t) => {
    const h = harness(t, { draft, editingHeader: false });
    await h.loadAllianzPage('allianz-life', 'en', 'about', 'literal-%24', 'literal-%2F', 'literal-%C3%A9', 'broken-%zz');
    assert.equal(h.calls[0].contentPath, '/about/literal-%24/literal-%2F/literal-%C3%A9/broken-%zz');
    await h.loadAllianzPage('allianz-life', 'en');
    assert.equal(h.calls[1].contentPath, '/');
  });
}

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

for (const contentMode of [null, 'fixture', 'unknown']) {
  test(`production mode ${contentMode ?? 'unset'} uses CMS rendering, metadata and component hooks`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', contentMode });
    assert.equal(renderedPage(await h.default(props())).layout.sitecore.route.fields.pageTitle.value, 'Published delivery title');
    assert.equal((await h.generateMetadata(props())).title, 'Published delivery title');
    assert.ok(h.calls.some((call) => call.backend === 'component-props'));
    assert.ok(h.calls.filter((call) => call.backend !== 'component-props').every((call) => call.backend === 'delivery'));
    assert.deepEqual(h.requestReads, { headers: 0, cookies: 0 });
  });
}

test('explicit production fixture flag cannot hide CMS failures with sample content', async (t) => {
  const error = new Error('CMS configuration or request failed');
  const h = harness(t, { nodeEnv: 'production', contentMode: 'fixture', error });
  await assert.rejects(h.loadAllianzPage('allianz-life', 'en'), (actual) => actual === error);
  assert.ok(h.calls.every((call) => call.backend === 'delivery'));
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


test('automatic component reads inherit authoring routing only in server-local options', async (t) => {
  for (const mode of ['edit', 'preview']) {
    const h = harness(t, { draft: true, mode, authorization: 'synthetic-component-authorization' });
    const loaded = await h.loadAllianzPage('allianz-life', 'en', 'about', 'newsroom');
    assert.deepEqual(loaded.componentFetchOptions, { headers: {
      Authorization: 'synthetic-component-authorization', sc_layoutKind: 'Final',
      sc_editMode: String(mode === 'edit'), sc_previewMode: String(mode === 'preview'), sc_site: 'allianz-life',
    } });
    const element = await h.default(props(['about', 'newsroom']));
    assert.doesNotMatch(JSON.stringify(element), /synthetic-component-authorization|componentFetchOptions|sc_editMode/);
  }
  const normal = harness(t);
  assert.equal((await normal.loadAllianzPage('allianz-life', 'en', 'about', 'newsroom')).componentFetchOptions, undefined);
});

const cashPaths = [
  '/what-we-offer/annuities/investment-strategies/cash-equivalent',
  '/new-york/annuities/investment-strategies/cash-equivalent',
];

for (const cashPath of cashPaths) {
  const segments = cashPath.slice(1).split('/');

  test(`${cashPath}: absent production delivery uses the exact approved snapshot without mutating its model`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', deliveryMissing: true });
    const before = JSON.stringify(h.fixtureContent);
    const raw = h.getFixturePage(segments, 'allianz-life', 'en');
    assert.equal(h.collectionsComplete(raw.layout, true), false, 'bundled shells lack native query metadata');

    const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
    const { page } = loaded;
    const route = page.layout.sitecore.route;
    assert.equal(loaded.needsComponentData, false);
    assert.equal(loaded.componentFetchOptions, undefined);
    assert.equal(Object.hasOwn(route, 'itemId'), false, 'captured datasource IDs are not native page identities');
    assert.deepEqual(page.layout.sitecore.context.allianzContentSource, {
      kind: 'approved-cash-bundled-snapshot', canonicalPath: cashPath, nativePublicationVerified: false,
    });
    assert.equal(page.mode.isNormal, true);
    assert.equal(page.mode.isEditing, false);
    assert.equal(page.mode.isPreview, false);
    assert.equal(h.collectionsComplete(page.layout, true), true, 'connected validation accepts complete bundled arrays');
    assert.deepEqual(route.fields, raw.layout.sitecore.route.fields);
    assert.deepEqual(route.placeholders['headless-main'], h.fixtureContent.routes[cashPath].components);
    assert.equal(route.placeholders['headless-main'].length, 5);

    // The only shell changes describe the arrays present in this copied snapshot.
    const expectedShell = (value) => {
      if (Array.isArray(value)) return value.map(expectedShell);
      if (!value || typeof value !== 'object') return value;
      const copy = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, expectedShell(entry)]));
      if (copy.children && Array.isArray(copy.children.results)) {
        copy.children.total = copy.children.results.length;
        copy.children.pageInfo = { hasNext: false };
      }
      return copy;
    };
    for (const slot of ['headless-header', 'headless-footer']) {
      assert.deepEqual(route.placeholders[slot], expectedShell(raw.layout.sitecore.route.placeholders[slot]));
    }
    assert.deepEqual(route.placeholders['headless-sidebar'], raw.layout.sitecore.route.placeholders['headless-sidebar']);

    const element = await h.default(props(segments));
    const metadata = await h.generateMetadata(props(segments));
    assert.deepEqual(renderedPage(element).layout.sitecore.route.fields, route.fields);
    assert.deepEqual(element.props.children.props.componentProps, {});
    assert.equal(metadata.title, route.fields.Title.value);
    assert.equal(metadata.description, route.fields.metadataDescription.value);
    assert.equal(metadata.alternates.canonical, `https://render-host.invalid${cashPath}`);
    assert.deepEqual(metadata.robots, { index: false, follow: false, noarchive: true });
    assert.ok(h.calls.length > 0);
    assert.ok(h.calls.every((call) => call.backend === 'delivery' && call.contentPath === cashPath));
    assert.deepEqual(h.requestReads, { headers: 0, cookies: 0 });
    assert.equal(JSON.stringify(h.fixtureContent), before);
    route.placeholders['headless-main'][0].fields.data.datasource.heading.jsonValue.value = 'Changed copy';
    assert.equal(JSON.stringify(h.fixtureContent), before, 'even later snapshot edits cannot mutate the bundled model');
  });

  test(`${cashPath}: available native delivery wins and retains its completeness checks`, async (t) => {
    const h = harness(t, { nodeEnv: 'production' });
    h.deliveryLayout.sitecore.route.fields.example = { children: { results: [] } };
    const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
    assert.equal(loaded.page.layout.sitecore.route.fields.pageTitle.value, 'Published delivery title');
    assert.equal(loaded.needsComponentData, true);
    assert.equal(loaded.page.layout.sitecore.context.allianzContentSource, undefined);
    assert.equal(h.collectionsComplete(loaded.page.layout, true), false, 'native incomplete results remain rejected');
    assert.deepEqual(h.deliveryLayout.sitecore.route.fields.example, { children: { results: [] } });
  });

  for (const status of [401, 403, 404, 500]) {
    test(`${cashPath}: thrown delivery ${status} is not treated as an absent route`, async (t) => {
      const error = Object.assign(new Error(`Synthetic delivery ${status}`), { status });
      const h = harness(t, { nodeEnv: 'production', error });
      await assert.rejects(h.default(props(segments)), (actual) => actual === error);
      await assert.rejects(h.generateMetadata(props(segments)), (actual) => actual === error);
      assert.ok(h.calls.every((call) => call.backend === 'delivery'));
    });
  }

  for (const [mode, editingHeader, backend] of [
    ['edit', true, 'authoring'],
    ['preview', true, 'authoring'],
    [DesignLibraryMode.Metadata, true, 'design-library'],
    ['edit', false, 'authoring-navigation'],
  ]) {
    test(`${cashPath}: missing ${backend}/${mode} content never selects the public snapshot`, async (t) => {
      const h = harness(t, { nodeEnv: 'production', draft: true, mode, editingHeader, missing: true, deliveryMissing: true });
      const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
      assert.equal(loaded.page?.layout.sitecore.route ?? null, null);
      assert.equal(loaded.needsComponentData, true);
      assert.equal(loaded.page?.layout.sitecore.context.allianzContentSource, undefined);
      assert.equal((await h.generateMetadata(props(segments))).title, 'Page');
      assert.ok(h.calls.length > 0);
      assert.ok(h.calls.every((call) => call.backend === backend));
    });
  }
}

for (const [site, locale, segments] of [
  ['other-site', 'en', cashPaths[0].slice(1).split('/')],
  ['allianz-life', 'fr', cashPaths[0].slice(1).split('/')],
  ['allianz-life', 'en', ['new-york']],
  ['allianz-life', 'en', ['what-we-offer', 'annuities', 'investment-strategies']],
  ['allianz-life', 'en', [...cashPaths[0].slice(1).split('/'), 'extra']],
  ['allianz-life', 'en', ['WHAT-WE-OFFER', 'annuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer/annuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer%2Fannuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer%252Fannuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer', '', 'annuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer', '.', 'annuities', 'investment-strategies', 'cash-equivalent']],
  ['allianz-life', 'en', ['what-we-offer', 'annuities', 'investment-strategies', 'cash-equivalent/']],
]) {
  test(`Cash snapshot rejects other site/locale/path: ${site}/${locale}/${segments.join('|')}`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', deliveryMissing: true });
    const loaded = await h.loadAllianzPage(site, locale, ...segments);
    assert.equal(loaded.page, null);
    assert.equal(loaded.needsComponentData, true);
    const requestProps = { params: Promise.resolve({ site, locale, path: segments }) };
    await assert.rejects(h.default(requestProps), /NEXT_NOT_FOUND/);
    assert.equal((await h.generateMetadata(requestProps)).title, 'Page');
  });
}


const deathClaimPaths = ['/report-a-death', '/new-york/report-a-death'];

for (const claimPath of deathClaimPaths) {
  const segments = claimPath.slice(1).split('/');

  test(`${claimPath}: absent production delivery uses only the cloned demo snapshot`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', deliveryMissing: true });
    const before = JSON.stringify(h.fixtureContent);
    const raw = h.getFixturePage(segments, 'allianz-life', 'en');
    const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
    const route = loaded.page.layout.sitecore.route;
    const expectedCollections = (value) => {
      if (Array.isArray(value)) return value.map(expectedCollections);
      if (!value || typeof value !== 'object') return value;
      const copy = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, expectedCollections(entry)]));
      if (copy.children && Array.isArray(copy.children.results)) {
        copy.children.total = copy.children.results.length;
        copy.children.pageInfo = { hasNext: false };
      }
      return copy;
    };
    assert.equal(loaded.needsComponentData, false);
    assert.equal(loaded.componentFetchOptions, undefined);
    assert.equal(Object.hasOwn(route, 'itemId'), false);
    assert.deepEqual(loaded.page.layout.sitecore.context.allianzContentSource, {
      kind: 'approved-death-claim-bundled-snapshot', canonicalPath: claimPath, nativePublicationVerified: false,
    });
    assert.equal(loaded.page.mode.isNormal, true);
    assert.equal(loaded.page.mode.isEditing, false);
    assert.equal(loaded.page.mode.isPreview, false);
    assert.equal(h.collectionsComplete(loaded.page.layout, true), true);
    assert.deepEqual(route.fields, raw.layout.sitecore.route.fields);
    assert.deepEqual(route.placeholders, expectedCollections(raw.layout.sitecore.route.placeholders));
    assert.equal(route.placeholders['headless-main'].length, claimPath.startsWith('/new-york') ? 4 : 3);
    const form = route.placeholders['headless-main'].find((component) => component.componentName === 'AllianzForm');
    assert.equal(form.fields.data.datasource.schemaKey.jsonValue.value, 'death-claim');
    assert.equal(form.integrationPolicy.mode, 'mock-only');
    assert.equal(form.integrationPolicy.productionSubmission, false);
    assert.equal(route.placeholders['headless-main'].some((component) => /Hero/.test(component.componentName)), false);
    const element = await h.default(props(segments));
    const metadata = await h.generateMetadata(props(segments));
    assert.deepEqual(renderedPage(element).layout.sitecore.route, route);
    assert.deepEqual(element.props.children.props.componentProps, {});
    assert.equal(metadata.title, route.fields.Title.value);
    assert.equal(metadata.description, route.fields.metadataDescription.value);
    assert.equal(metadata.alternates.canonical, `https://render-host.invalid${claimPath}`);
    assert.deepEqual(metadata.robots, { index: false, follow: false, noarchive: true });
    assert.ok(h.calls.length > 0);
    assert.ok(h.calls.every((call) => call.backend === 'delivery' && call.contentPath === claimPath));
    assert.deepEqual(h.requestReads, { headers: 0, cookies: 0 });
    assert.equal(JSON.stringify(h.fixtureContent), before);
    route.placeholders['headless-main'][0].fields.data.datasource.heading.jsonValue.value = 'Changed snapshot';
    assert.equal(JSON.stringify(h.fixtureContent), before);
  });

  test(`${claimPath}: available native delivery wins without snapshot changes`, async (t) => {
    const h = harness(t, { nodeEnv: 'production' });
    h.deliveryLayout.sitecore.route.fields.example = { children: { results: [] } };
    h.deliveryLayout.sitecore.route.itemId = '11111111-1111-4111-8111-111111111111';
    const before = structuredClone(h.deliveryLayout.sitecore.route);
    const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
    assert.equal(loaded.page.layout.sitecore.route.fields.pageTitle.value, 'Published delivery title');
    assert.equal(loaded.needsComponentData, true);
    assert.equal(loaded.page.layout.sitecore.context.allianzContentSource, undefined);
    assert.equal(h.collectionsComplete(loaded.page.layout, true), false);
    assert.equal(loaded.page.layout.sitecore.route.itemId, before.itemId);
    assert.deepEqual(loaded.page.layout.sitecore.route, before);
    assert.deepEqual(h.deliveryLayout.sitecore.route, before);
  });

  for (const status of [401, 403, 404, 500]) {
    test(`${claimPath}: thrown delivery ${status} never selects a snapshot`, async (t) => {
      const error = Object.assign(new Error(`Synthetic delivery ${status}`), { status });
      const h = harness(t, { nodeEnv: 'production', error });
      await assert.rejects(h.default(props(segments)), (actual) => actual === error);
      await assert.rejects(h.generateMetadata(props(segments)), (actual) => actual === error);
    });
  }

  for (const [mode, editingHeader, backend] of [
    ['edit', true, 'authoring'],
    ['preview', true, 'authoring'],
    [DesignLibraryMode.Metadata, true, 'design-library'],
    ['edit', false, 'authoring-navigation'],
  ]) {
    test(`${claimPath}: missing ${backend}/${mode} never selects a demo snapshot`, async (t) => {
      const h = harness(t, { nodeEnv: 'production', draft: true, mode, editingHeader, missing: true, deliveryMissing: true });
      const loaded = await h.loadAllianzPage('allianz-life', 'en', ...segments);
      assert.equal(loaded.page?.layout.sitecore.route ?? null, null);
      assert.equal(loaded.needsComponentData, true);
      assert.equal(loaded.page?.layout.sitecore.context.allianzContentSource, undefined);
      assert.ok(h.calls.length > 0);
      assert.ok(h.calls.every((call) => call.backend === backend));
    });
  }
}

for (const [site, locale, segments] of [
  ['other-site', 'en', ['report-a-death']],
  ['allianz-life', 'fr', ['report-a-death']],
  ['allianz-life', 'en-US', ['new-york', 'report-a-death']],
  ['allianz-life', 'en', []],
  ['allianz-life', 'en', ['new-york']],
  ['allianz-life', 'en', ['report-a-death', 'claim-fail']],
  ['allianz-life', 'en', ['new-york', 'report-a-death', 'claim-fail']],
  ['allianz-life', 'en', ['new-york', 'report-a-death', 'extra']],
  ['allianz-life', 'en', ['REPORT-A-DEATH']],
  ['allianz-life', 'en', ['new-york/report-a-death']],
  ['allianz-life', 'en', ['new-york%2Freport-a-death']],
  ['allianz-life', 'en', ['new-york%252Freport-a-death']],
  ['allianz-life', 'en', ['new-york', '', 'report-a-death']],
  ['allianz-life', 'en', ['new-york', '.', 'report-a-death']],
  ['allianz-life', 'en', ['new-york', 'report-a-death/']],
  ['allianz-life', 'en', ['report-a-death?copy=1']],
]) {
  test(`Death-claim snapshot rejects other site/locale/path: ${site}/${locale}/${segments.join('|')}`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', deliveryMissing: true });
    const loaded = await h.loadAllianzPage(site, locale, ...segments);
    assert.equal(loaded.page, null);
    assert.equal(loaded.needsComponentData, true);
    assert.equal((await h.generateMetadata({ params: Promise.resolve({ site, locale, path: segments }) })).title, 'Page');
  });
}


for (const claimPath of deathClaimPaths) {
  test(`${claimPath}: real SDK intro uses loader canonical path with modeled unrelated pathname`, async (t) => {
    const h = harness(t, { nodeEnv: 'production', deliveryMissing: true });
    const before = JSON.stringify(h.fixtureContent);
    const { page } = await h.loadAllianzPage('allianz-life', 'en', ...claimPath.slice(1).split('/'));
    const intro = page.layout.sitecore.route.placeholders['headless-main'].find((component) =>
      component.componentName === 'AllianzLegacyRichText');
    assert.ok(intro, 'render the actual loader-provided introduction');
    const originalBody = intro.fields.data.datasource.body.jsonValue.value;
    // This is an explicit unrelated-path model, not captured production hook state.
    // Do not inject itemPath: the actual loader must provide canonical snapshot data.
    const html = renderToStaticMarkup(React.createElement(PathnameContext.Provider, { value: '/' },
      React.createElement(SitecoreProvider, {
        page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
      }, React.createElement(LegacyRichText, { params: intro.params, fields: intro.fields }))));
    assert.match(html, /Completing this demo does not report a death/);
    assert.doesNotMatch(html, /Once submitted|Please use this form to notify|register or log in/);
    assert.equal(page.layout.sitecore.context.itemPath, claimPath);
    assert.equal(page.layout.sitecore.context.allianzContentSource.canonicalPath, claimPath);
    assert.equal(page.layout.sitecore.context.allianzContentSource.nativePublicationVerified, false);
    assert.equal(intro.fields.data.datasource.body.jsonValue.value, originalBody);
    assert.equal(JSON.stringify(h.fixtureContent), before);
  });
}
