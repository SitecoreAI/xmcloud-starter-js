/** Offline proposal integration tests. Real Layout and LegacyHeader/Footer; no network or native acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const candidateApp = path.resolve(here, '../../../../..');
// The applied test resolves its own app by default; sparse proposals may supply a source fallback.
const sourceApp = process.env.ALLIANZ_SOURCE_APP ? path.resolve(process.env.ALLIANZ_SOURCE_APP) : candidateApp;
const dependencyRequire = createRequire(path.join(sourceApp, 'package.json'));
const ts = dependencyRequire('typescript');
const React = dependencyRequire('react');
const { renderToStaticMarkup } = dependencyRequire('react-dom/server');
const field = (value) => ({ jsonValue: { value } });
const connection = (results) => ({ total: results.length, pageInfo: { hasNext: false }, results });
const shellFile = 'src/app/[site]/[locale]/search/NewYorkSearchUtilityShell.tsx';
const basicFile = 'src/app/[site]/[locale]/new-york/search/page.tsx';
const advancedFile = 'src/app/[site]/[locale]/new-york/search/advanced-search/page.tsx';

function fixturePage(mode = {}) {
  const header = {
    uid: 'fixture-header', componentName: 'AllianzLegacyHeader', params: { market: 'new-york' },
    fields: { data: { datasource: {
      id: 'fixture-header-owner', heading: field('Allianz Life Insurance Company of New York'),
      link: field({ href: '/new-york', text: 'New York home' }),
      primaryNav: { targetItems: [{ id: 'fixture-nav', title: field('NY annuities'), link: field({ href: '/new-york/annuities' }) }] },
      utilityNav: { targetItems: [{ id: 'fixture-contact', title: field('NY contact'), link: field({ href: '/new-york/contact-us' }) }] },
    } } },
  };
  const footer = {
    uid: 'fixture-footer', componentName: 'AllianzLegacyFooter', params: {},
    fields: { data: { datasource: {
      id: 'fixture-footer-owner', copyright: field('Fixture New York copyright'),
      primaryNav: { targetItems: [{ id: 'fixture-footer-group', title: field('Customer service'), children: connection([
        { id: 'fixture-footer-link', title: field('NY privacy'), link: field({ href: '/new-york/privacy-policy' }) },
      ]) }] },
    } } },
  };
  return {
    siteName: 'allianz-life', mode: { isNormal: true, isEditing: false, isPreview: false, isDesignLibrary: false, ...mode },
    layout: { sitecore: { context: {}, route: {
      itemId: 'fixture-ny-search-page', name: 'Fixture NY search',
      fields: { shellFamily: { value: 'legacy' }, legacySharedKey: { value: 'new-york' } },
      placeholders: {
        'headless-header': [header], 'headless-main': [{ uid: 'fixture-native-main', componentName: 'NativeSearchFixture', fields: { marker: { value: 'native metadata retained' } } }],
        'headless-footer': [footer], 'headless-sidebar': [], 'headless-right-rail': [],
      },
    } } },
  };
}

function harness({ page = fixturePage(), needsComponentData = true, fetchOptions = { cache: 'no-store', retries: 0 }, reactOverride } = {}) {
  const PageContext = React.createContext(null);
  const calls = { loader: [], componentData: [], enrichment: [], locales: [], providers: [], placeholders: [], routerPushes: [] };
  const componentMap = new Map();
  const notFound = new Error('FIXTURE_NEXT_NOT_FOUND');
  const componentProps = { fixture: { resolved: true } };
  const sdk = {
    useSitecore: () => ({ page: React.useContext(PageContext) }),
    Text: ({ field: f, tag = 'span', editable, ...props }) => React.createElement(tag, props, f?.value ?? ''),
    RichText: ({ field: f, tag = 'div', editable, ...props }) => React.createElement(tag, { ...props, dangerouslySetInnerHTML: { __html: f?.value || '' } }),
    Link: ({ field: f, editable, renderChildrenWhenEmpty, children, ...props }) => React.createElement('a', {
      ...props, href: f?.value?.href || '', ...(f?.value?.target ? { target: f.value.target } : {}),
    }, children ?? f?.value?.text ?? ''),
    Image: ({ field: f, editable, ...props }) => React.createElement('img', { ...props, src: f?.value?.src || '', alt: f?.value?.alt || '' }),
    AppPlaceholder: ({ name, rendering }) => {
      calls.placeholders.push(name);
      return React.createElement(React.Fragment, null, ...(rendering?.placeholders?.[name] || []).map((r, i) => {
        if (r.componentName === 'NativeSearchFixture') return React.createElement('section', { key: i, 'data-native-search': 'preserved' }, 'Native CMS search');
        const Component = componentMap.get(r.componentName);
        assert.ok(Component, `Unexpected fixture component ${r.componentName}`);
        return React.createElement(Component, { key: i, ...r });
      }));
    },
    DesignLibraryApp: ({ page: p }) => React.createElement(sdk.AppPlaceholder, { name: 'headless-main', rendering: p.layout.sitecore.route }),
  };
  const client = {
    getData: () => { throw new Error('Unexpected network-like getData call'); },
    getComponentData: async (layout, context, map) => {
      calls.componentData.push({ layout, context, map });
      return componentProps;
    },
  };
  const mocks = {
    'server-only': {},
    react: reactOverride || React,
    '@sitecore-content-sdk/nextjs': sdk,
    'next/link': ({ href, children, ...props }) => React.createElement('a', { ...props, href: typeof href === 'string' ? href : href?.pathname }, children),
    'next/navigation': { notFound() { throw notFound; }, useRouter: () => ({ push: (href) => calls.routerPushes.push(href) }) },
    'next-intl': { NextIntlClientProvider: ({ children }) => React.createElement(React.Fragment, null, children) },
    'next-intl/server': { setRequestLocale: (locale) => calls.locales.push(locale) },
    'src/lib/sitecore-client': client,
    'lib/sitecore-client': client,
    'lib/allianz-page-loader': { loadAllianzPage: async (...args) => { calls.loader.push(args); return { page, needsComponentData, componentFetchOptions: fetchOptions }; } },
    'lib/allianz-content-mode': { isConnected: () => true },
    'lib/allianz-automatic-components': { enrichAllianzComponentMap: (map, options) => { const enriched = { map, options }; calls.enrichment.push(enriched); return enriched; } },
    '.sitecore/component-map': componentMap,
    'src/Providers': ({ children, page: p, componentProps: props }) => {
      calls.providers.push({ page: p, componentProps: props });
      return React.createElement(PageContext.Provider, { value: p }, children);
    },
    'src/Scripts': () => null,
    'components/content-sdk/SitecoreStyles': () => null,
    'components/content-sdk/ConsentControls': () => null,
    'components/content-sdk/ServiceUnavailable': () => null,
  };
  const modules = new Map();
  function resolveLocal(relative) {
    const rel = relative.replaceAll(path.sep, '/');
    for (const app of [candidateApp, sourceApp]) {
      for (const suffix of ['', '.ts', '.tsx', '.json']) {
        const filename = path.join(app, rel + suffix);
        if (fs.existsSync(filename) && fs.statSync(filename).isFile()) return filename;
      }
    }
    throw new Error(`Missing proposal or source module ${rel}`);
  }
  function load(relative) {
    const filename = resolveLocal(relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(path.join(sourceApp, 'package.json')));
    modules.set(filename, compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) {
        const value = mocks[specifier];
        return value?.default ? value : value;
      }
      if (specifier.endsWith('.module.css')) return new Proxy({}, { get: (_o, key) => String(key) });
      if (specifier.endsWith('.css')) return {};
      let local;
      if (specifier.startsWith('.')) {
        const app = filename.startsWith(candidateApp + path.sep) ? candidateApp : sourceApp;
        local = path.relative(app, path.resolve(path.dirname(filename), specifier));
      } else if (/^(?:src|lib|components)\//.test(specifier)) local = specifier.startsWith('src/') ? specifier : 'src/' + specifier;
      if (local) return load(local);
      return dependencyRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  componentMap.set('AllianzLegacyHeader', load('src/components/allianz-legacy-header/AllianzLegacyHeader.tsx').Default);
  componentMap.set('AllianzLegacyFooter', load('src/components/allianz-legacy-footer/AllianzLegacyFooter.tsx').Default);
  return { page, calls, client, fetchOptions, componentProps, componentMap, load, notFound, render: (element) => renderToStaticMarkup(element) };
}

const customMain = () => React.createElement('div', { 'data-utility-wrapper': 'true' }, React.createElement('main', { id: 'main' }, 'UTILITY_CONTENT_ONCE'));
const pageParams = () => Promise.resolve({ site: 'allianz-life', locale: 'en' });
const count = (html, pattern) => (html.match(pattern) || []).length;

test('normal wrapper renders the actual native NY shell and replaces its entire main once, without mutating the Page', async () => {
  const original = fixturePage();
  // Unused native main is incomplete: it must not be queried or included in global completeness checks.
  original.layout.sitecore.route.placeholders['headless-main'][0].fields.unused = { children: { total: 10, pageInfo: { hasNext: true }, results: [] } };
  const before = JSON.stringify(original), h = harness({ page: original });
  const shell = h.load(shellFile).default;
  const html = h.render(await shell({ site: 'allianz-life', locale: 'en', kind: 'search', children: customMain() }));
  assert.deepEqual(h.calls.loader, [['allianz-life', 'en', 'new-york', 'search']]);
  assert.deepEqual(h.calls.locales, ['allianz-life_en']);
  assert.equal(h.calls.componentData.length, 1);
  const viewed = h.calls.providers[0].page;
  assert.notEqual(viewed, original);
  assert.deepEqual(viewed.layout.sitecore.route.placeholders['headless-main'], []);
  for (const key of ['headless-header', 'headless-footer', 'headless-sidebar', 'headless-right-rail']) {
    assert.equal(viewed.layout.sitecore.route.placeholders[key], original.layout.sitecore.route.placeholders[key]);
  }
  assert.equal(h.calls.componentData[0].layout, viewed.layout);
  assert.equal(h.calls.enrichment[0].options.fetchOptions, h.fetchOptions);
  assert.equal(h.calls.componentData[0].map, h.calls.enrichment[0]);
  assert.equal(h.calls.providers[0].componentProps, h.componentProps);
  assert.equal(JSON.stringify(original), before);
  assert.equal(count(html, /<main\b/g), 1);
  assert.equal(count(html, /UTILITY_CONTENT_ONCE/g), 1);
  assert.equal(count(html, /<header\b/g), 1);
  assert.equal(count(html, /<footer\b/g), 1);
  assert.match(html, /allianz-legacy new-york/);
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /aria-label="Footer navigation"/);
  for (const href of ['/new-york/annuities', '/new-york/contact-us', '/new-york/privacy-policy']) assert.ok(html.includes(`href="${href}"`));
  assert.doesNotMatch(html, /Native CMS search|data-native-search|temporarily unavailable/);
  assert.ok(!h.calls.placeholders.includes('headless-main'));
});

test('normal wrapper skips component fetching when integrated data is already available', async () => {
  const h = harness({ needsComponentData: false });
  const html = h.render(await h.load(shellFile).default({ site: 'allianz-life', locale: 'en', kind: 'advanced', children: customMain() }));
  assert.deepEqual(h.calls.loader, [['allianz-life', 'en', 'new-york', 'search', 'advanced-search']]);
  assert.equal(h.calls.componentData.length, 0);
  assert.match(html, /UTILITY_CONTENT_ONCE/);
  assert.match(html, /Footer navigation/);
});

test('invalid site or locale fails before the loader, and a missing native Page fails closed', async () => {
  for (const [site, locale] of [['other-site', 'en'], ['allianz-life', 'fr']]) {
    const h = harness();
    await assert.rejects(h.load(shellFile).default({ site, locale, kind: 'search', children: customMain() }), (error) => error === h.notFound);
    assert.equal(h.calls.loader.length, 0);
    assert.equal(h.calls.componentData.length, 0);
  }
  const h = harness({ page: null });
  await assert.rejects(h.load(shellFile).default({ site: 'allianz-life', locale: 'en', kind: 'search', children: customMain() }), (error) => error === h.notFound);
  assert.equal(h.calls.componentData.length, 0);
  assert.equal(h.calls.providers.length, 0);
});

for (const mode of ['isEditing', 'isPreview', 'isDesignLibrary']) {
  test(`${mode} preserves the original native Page, main metadata and component-data layout`, async () => {
    const original = fixturePage({ isNormal: false, [mode]: true });
    const before = JSON.stringify(original), h = harness({ page: original });
    const html = h.render(await h.load(shellFile).default({ site: 'allianz-life', locale: 'en', kind: 'search', children: customMain() }));
    assert.equal(h.calls.componentData[0].layout, original.layout);
    assert.equal(h.calls.providers[0].page, original);
    assert.equal(JSON.stringify(original), before);
    assert.match(html, /Native CMS search/);
    assert.doesNotMatch(html, /UTILITY_CONTENT_ONCE/);
    assert.ok(h.calls.placeholders.includes('headless-main'));
  });
}

test('real basic and advanced routes retain their utility forms and NY-only results inside the real shell', async () => {
  for (const [file, searchParams, expectedForm] of [
    [basicFile, { q: 'annuities' }, /aria-label="Search imported public content"/],
    [advancedFile, { q: 'annuities', within: 'titles', sort: 'title', size: '12' }, /Search words/],
  ]) {
    const h = harness();
    const html = h.render(await h.load(file).default({ params: pageParams(), searchParams: Promise.resolve(searchParams) }));
    assert.equal(count(html, /<main\b/g), 1);
    assert.equal(count(html, /<header\b/g), 1);
    assert.equal(count(html, /<footer\b/g), 1);
    assert.match(html, expectedForm);
    assert.match(html, /<form\b/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /href="\/new-york/);
    assert.doesNotMatch(html, /data-native-search|Native CMS search|href="\/what-we-offer/);
    assert.ok(!h.calls.placeholders.includes('headless-main'));
  }
});

test('global shell collection completeness still fails closed instead of showing a partial utility page', async () => {
  for (const placeholder of ['headless-header', 'headless-footer']) {
    const original = fixturePage();
    const navItem = original.layout.sitecore.route.placeholders[placeholder][0].fields.data.datasource.primaryNav.targetItems[0];
    navItem.children = { total: 1, pageInfo: { hasNext: true }, results: [] };
    const h = harness({ page: original });
    const html = h.render(await h.load(shellFile).default({ site: 'allianz-life', locale: 'en', kind: 'search', children: customMain() }));
    assert.match(html, /Some page content is temporarily unavailable/);
    assert.doesNotMatch(html, /UTILITY_CONTENT_ONCE/);
  }
});

test('Layout without an override retains the ordinary native main path', () => {
  const h = harness();
  const Layout = h.load('src/Layout.tsx').default;
  const Providers = ({ children }) => React.createElement(React.Fragment, null, children);
  const html = h.render(React.createElement(Providers, null, React.createElement(Layout, { page: h.page })));
  assert.match(html, /Native CMS search/);
  assert.ok(h.calls.placeholders.includes('headless-main'));
});

function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [node, ...flatten(node.props.children)];
}
test('actual basic and advanced client forms still prevent submissions and navigate within NY', () => {
  const hookReact = { ...React, useId: () => 'fixture-search', useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}], useTransition: () => [false, (callback) => callback()] };
  const h = harness({ reactOverride: hookReact });
  const basic = h.load('src/app/[site]/[locale]/search/LocalSearchUtility.tsx').default;
  const advanced = h.load('src/app/[site]/[locale]/search/LocalAdvancedSearchUtility.tsx').default;
  const fixtures = [
    [basic, { query: 'income', matches: [], market: 'new-york' }, '/new-york/search?q=income'],
    [advanced, { state: { query: 'income', within: 'titles', sort: 'title', pageSize: '12' }, matches: [] }, '/new-york/search/advanced-search?q=income&within=titles&sort=title'],
  ];
  for (const [Component, props, expected] of fixtures) {
    const form = flatten(Component(props)).find((node) => node.type === 'form');
    assert.ok(form);
    let prevented = false;
    form.props.onSubmit({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(h.calls.routerPushes.at(-1), expected);
  }
});
