import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const shellFile = 'src/app/[site]/[locale]/search/NationwideSearchUtilityShell.tsx';
const utility = React.createElement('main', { id: 'main' }, 'Search utility');

function home(mode = {}) {
  return {
    siteName: 'allianz-life',
    mode: { isNormal: true, isEditing: false, isPreview: false, isDesignLibrary: false, ...mode },
    layout: { sitecore: { context: { itemPath: '/', language: 'en' }, route: {
      name: 'Home', itemId: 'home-id', templateId: 'home-template',
      fields: { sourceBodyClasses: { value: 'home-only' } },
      placeholders: {
        'headless-header': [{ uid: 'header', componentName: 'FixtureHeader' }],
        'headless-main': [{ uid: 'home-main', componentName: 'FixtureHome' }],
        'headless-footer': [{ uid: 'footer', componentName: 'FixtureFooter' }],
        'headless-sidebar': [{ uid: 'sidebar', componentName: 'FixtureSidebar' }],
      },
    } } },
  };
}

function harness({ page = home(), needsComponentData = true, complete = true, loaderError = false, componentError = false } = {}) {
  const calls = { loader: [], data: [], locale: [], providers: [], placeholders: [] };
  const missing = new Error('NEXT_NOT_FOUND');
  const client = {
    getData: () => { throw new Error('Unexpected network read'); },
    getComponentData: async (layout, context, map) => {
      calls.data.push({ layout, context, map });
      if (componentError) throw new Error('Component delivery failed');
      return { resolved: true };
    },
  };
  const mocks = {
    'server-only': {},
    'next/navigation': { notFound() { throw missing; } },
    'next-intl': { NextIntlClientProvider: ({ children }) => children },
    'next-intl/server': { setRequestLocale: (value) => calls.locale.push(value) },
    './search-data': { isLocalSearchScope: (site, locale) => site === 'allianz-life' && locale === 'en' },
    'lib/allianz-page-loader': { loadAllianzPage: async (...args) => {
      calls.loader.push(args);
      if (loaderError) throw new Error('Home delivery failed');
      return { page, needsComponentData, componentFetchOptions: { cache: 'no-store' } };
    } },
    'lib/allianz-automatic-components': { enrichAllianzComponentMap: (map, options) => ({ map, options }) },
    'src/lib/sitecore-client': client,
    '.sitecore/component-map': new Map(),
    'src/Providers': ({ children, page: value, componentProps }) => {
      calls.providers.push({ page: value, componentProps }); return children;
    },
    '@sitecore-content-sdk/nextjs': {
      AppPlaceholder: ({ name, rendering }) => {
        calls.placeholders.push(name);
        return React.createElement(React.Fragment, null, ...(rendering.placeholders[name] ?? []).map((item) => {
          const tag = item.componentName === 'FixtureHeader' ? 'header' : item.componentName === 'FixtureFooter' ? 'footer' : 'aside';
          return React.createElement(tag, { key: item.uid }, item.componentName);
        }));
      },
      DesignLibraryApp: () => React.createElement('div', null, 'Design library'),
    },
    'src/Scripts': () => null,
    'components/content-sdk/SitecoreStyles': () => null,
    'components/content-sdk/ConsentControls': () => null,
    'components/content-sdk/ServiceUnavailable': () => null,
    'src/content/source-body-classes.json': [],
    'lib/collection-completeness': { collectionsComplete: () => complete },
    'lib/allianz-content-mode': { isConnected: () => true },
    'lib/allianz-new-york-page': { isNewYorkHomePage: () => false },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.join(app, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === 'src/Layout') return load('src/Layout.tsx');
      return require(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return { calls, client, missing, shell: load(shellFile).default };
}

test('nationwide search uses the real Layout with Home header and footer but no Home identity or main', async () => {
  const original = home();
  const before = JSON.stringify(original);
  const h = harness({ page: original });
  const html = renderToStaticMarkup(await h.shell({ site: 'allianz-life', locale: 'en', children: utility }));
  assert.deepEqual(h.calls.loader, [['allianz-life', 'en']]);
  assert.deepEqual(h.calls.locale, ['allianz-life_en']);
  assert.equal(h.calls.data.length, 1);
  assert.equal(h.calls.data[0].layout, h.calls.providers[0].page.layout);
  const view = h.calls.providers[0].page;
  assert.equal(view.layout.sitecore.context.itemPath, '/search');
  assert.equal(view.layout.sitecore.route.name, 'search');
  assert.equal(view.layout.sitecore.route.itemId, undefined);
  assert.equal(view.layout.sitecore.route.templateId, undefined);
  assert.deepEqual(view.layout.sitecore.route.fields, {});
  assert.deepEqual(view.layout.sitecore.route.placeholders['headless-main'], []);
  assert.equal(JSON.stringify(original), before);
  assert.match(html, /<header>FixtureHeader<\/header>/);
  assert.match(html, /<footer>FixtureFooter<\/footer>/);
  assert.match(html, /<main id="main">Search utility<\/main>/);
  assert.doesNotMatch(html, /FixtureHome|FixtureSidebar|home-only/);
  assert.deepEqual(h.calls.placeholders, ['headless-header', 'headless-footer']);
});

test('invalid scope is rejected before the Home page is loaded', async () => {
  const h = harness();
  await assert.rejects(h.shell({ site: 'another-site', locale: 'en', children: utility }), (error) => error === h.missing);
  await assert.rejects(h.shell({ site: 'allianz-life', locale: 'fr', children: utility }), (error) => error === h.missing);
  assert.equal(h.calls.loader.length, 0);
});

test('a missing Home page or a non-normal mode leaves the utility usable without Home authoring', async () => {
  for (const page of [null, home({ isNormal: false, isEditing: true }), home({ isNormal: false, isPreview: true }), home({ isNormal: false, isDesignLibrary: true })]) {
    const h = harness({ page });
    assert.equal(await h.shell({ site: 'allianz-life', locale: 'en', children: utility }), utility);
    assert.equal(h.calls.data.length, 0);
    assert.equal(h.calls.providers.length, 0);
  }
});

test('failed Home or component-data reads leave the standalone search utility usable', async () => {
  for (const options of [{ loaderError: true }, { componentError: true }]) {
    const h = harness(options);
    assert.equal(await h.shell({ site: 'allianz-life', locale: 'en', children: utility }), utility);
    assert.equal(h.calls.providers.length, 0);
  }
});

test('already integrated shell data skips extra fetching and incomplete shell fails closed', async () => {
  const integrated = harness({ needsComponentData: false });
  const html = renderToStaticMarkup(await integrated.shell({ site: 'allianz-life', locale: 'en', children: utility }));
  assert.equal(integrated.calls.data.length, 0);
  assert.match(html, /FixtureHeader/);
  const incomplete = harness({ complete: false });
  const unavailable = renderToStaticMarkup(await incomplete.shell({ site: 'allianz-life', locale: 'en', children: utility }));
  assert.match(unavailable, /Some page content is temporarily unavailable/);
  assert.doesNotMatch(unavailable, /Search utility/);
});
