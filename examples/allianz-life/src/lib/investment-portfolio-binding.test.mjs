import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { parse, visit } = require('graphql');
const { ComponentPropsService } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const { PREVIEW_COOKIES } = require('@sitecore-content-sdk/nextjs/editing');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const routeFile = path.join(sourceRoot, 'app/[site]/[locale]/[[...path]]/page.tsx');
const bindings = {
  datasourceTemplateId: 'e0d28f7b-050f-4656-b866-98edfcdf1ec5',
  investmentTemplateId: 'a81701f3-f3e3-4dce-b434-662ed99210f5',
  siteName: 'allianz-life',
  siteRootPath: '/sitecore/content/allianz/allianz-life',
};
const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
const normalizeId = (value) => value?.replace(/[{}-]/g, '').toLowerCase();
const field = (value, owner, name) => ({ jsonValue: { value, metadata: {
  itemId: owner, fieldId: `synthetic-${name}`, fieldType: 'Single-Line Text',
} } });

/** Synthetic native rows model inherited membership independently of response projection. */
function dataset(rootId = id(1), datasourceId = id(2), publicPath = '/about/ventures/portfolio') {
  const root = { id: rootId, path: `${bindings.siteRootPath}/Home${publicPath}` };
  const datasource = { id: datasourceId, parent: { name: 'Data', parent: { id: rootId } } };
  const items = Array.from({ length: 23 }, (_, index) => {
    const itemId = id(100 + index);
    return { id: itemId, parent: { id: datasourceId },
      nativeTemplates: index === 0 || index === 21
        ? [id(900 + index), bindings.investmentTemplateId] : [bindings.investmentTemplateId],
      name: field(`Investment ${String(index).padStart(2, '0')}`, itemId, 'name'),
      investmentStatus: field(index % 3 === 0 ? 'Exited' : 'Active', itemId, 'investmentStatus'),
      details: field('<p>Native details</p>', itemId, 'details'),
      logo: { jsonValue: { value: { src: '', alt: '' }, metadata: { itemId, fieldType: 'Image' } } },
      websiteLink: { jsonValue: { value: { href: '', text: '', target: '' }, metadata: { itemId, fieldType: 'General Link' } } },
    };
  });
  // Neither an unrelated concrete template nor a nested Investment belongs to this collection.
  items.push({ ...items[0], id: id(800), nativeTemplates: [id(801)] });
  items.push({ ...items[21], id: id(802), parent: { id: items[21].id } });
  return { root, datasource, items, publicPath };
}

function inputs(query) {
  const operation = parse(query).definitions[0];
  const value = (node) => node.kind === 'ObjectValue'
    ? Object.fromEntries(node.fields.map((entry) => [entry.name.value, value(entry.value)]))
    : node.kind === 'ListValue' ? node.values.map(value)
      : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { operation: operation.name.value, selections: operation.selectionSet.selections.map((selection) => ({
    alias: selection.alias?.value ?? selection.name.value,
    args: Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])),
  })) };
}

/** Run the actual page, loader, composition and installed SDK; replace only runtime services/UI. */
function harness({ records = dataset(), variant = 'normal', language = 'en-GB', site = bindings.siteName,
  routeId = records.root.id, datasourceId = records.datasource.id, dropBindings = false } = {}) {
  const calls = [], pageReads = [], enrichments = [], componentReads = [], locales = [];
  let dynamicLoads = 0;
  const runtimeUid = `native-portfolio-${routeId}`;
  const rendering = { componentName: 'InvestmentPortfolio', uid: runtimeUid, dataSource: datasourceId };
  const layout = { sitecore: { context: { language, site: { name: site } }, route: {
    itemId: routeId, name: 'Synthetic portfolio page', fields: {}, placeholders: { main: [
      rendering, { ...rendering, uid: `${runtimeUid}-repeat` },
      { componentName: 'SectionNavigation', uid: 'native-section', params: {} },
      { componentName: 'Stock', uid: 'native-stock' },
    ] },
  } } };
  const originalMap = new Map([
    ['InvestmentPortfolio', { componentType: 'client', dynamicModule: async () => {
      dynamicLoads += 1; return { Default: () => null };
    } }],
    ['SectionNavigation', { componentType: 'client', Default: () => null }],
    ['Stock', { Default: () => null, getComponentServerProps: async (item, incomingLayout) => ({
      marker: item.uid, rootId: incomingLayout.sitecore.route.itemId,
    }) }],
  ]);
  const requestHeaders = new Headers();
  const previewData = { mode: variant === 'preview' ? 'preview' : 'edit', site, language,
    itemId: routeId, version: 'latest', layoutKind: 'Final', previewTime: '2026-10-04T02:00:00Z' };
  if (variant === 'editing' || variant === 'preview') {
    requestHeaders.set('x-sitecore-editing-params', JSON.stringify(previewData));
    requestHeaders.set('Authorization', 'synthetic-header-authorization');
  }
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    initOptions: { defaultSite: site, defaultLanguage: language, rewriteMediaUrls: false },
    componentPropsService: new ComponentPropsService(),
    layoutService: { async fetchLayoutData(contentPath, options, fetchOptions) {
      pageReads.push({ backend: 'layout', contentPath, options, fetchOptions });
      return layout;
    } },
    editingService: { async fetchEditingData(data, fetchOptions) {
      pageReads.push({ backend: 'editing', data, fetchOptions });
      return { layoutData: layout };
    } },
    graphQLClient: { async request(query, variables, fetchOptions) {
      const args = inputs(query), call = { query, ...args, variables, fetchOptions };
      calls.push(call);
      if (args.operation === 'InvestmentPortfolioScope') {
        call.response = { root: records.root, datasource: records.datasource };
        return call.response;
      }
      assert.equal(args.operation, 'InvestmentPortfolioItems');
      const search = args.selections[0].args;
      const template = search.where.AND.find((entry) => entry.name === '_templates');
      const parent = search.where.AND.find((entry) => entry.name === '_parent');
      const rows = records.items.filter((item) => item.nativeTemplates.some((value) => normalizeId(value) === template.value)
        && normalizeId(item.parent.id) === parent.value);
      const offset = Number(search.after ?? 0), hasNext = offset + search.first < rows.length;
      call.response = { search: { total: rows.length,
        results: rows.slice(offset, offset + search.first).map((item) => {
          const row = { ...item }; delete row.nativeTemplates; return row;
        }),
        pageInfo: { hasNext, endCursor: hasNext ? String(offset + search.first) : null },
      } };
      return call.response;
    } },
    async getComponentData(incomingLayout, context, components) {
      componentReads.push({ layout: incomingLayout, context, components });
      return SitecoreClient.prototype.getComponentData.call(this, incomingLayout, context, components);
    },
  });
  const modules = new Map();
  const overrides = {
    'server-only': {},
    'next/headers': {
      draftMode: async () => ({ isEnabled: variant !== 'normal' }),
      headers: async () => requestHeaders,
      cookies: async () => ({ get(name) {
        assert.equal(name, PREVIEW_COOKIES.PREVIEW_TOKEN);
        return { value: 'synthetic-cookie-authorization' };
      } }),
    },
    'next/navigation': { notFound() { throw new Error('NEXT_NOT_FOUND'); } },
    // Content-mode/fixture selection has its own suite; this regression exercises connected pages.
    './allianz-page': { isConnected: () => true, getFixturePage() { throw new Error('Unexpected fixture read'); } },
    './sitecore-client': client,
    'src/lib/sitecore-client': client,
    'sitecore.config': { defaultSite: bindings.siteName },
    'src/Layout': { __esModule: true, default: () => null },
    'src/Providers': { __esModule: true, default: () => null },
    '.sitecore/component-map': originalMap,
    '.sitecore/sites.json': [],
    'src/i18n/routing': { routing: { locales: [language] } },
    'next-intl': { NextIntlClientProvider: () => null },
    'next-intl/server': { setRequestLocale: (locale) => locales.push(locale) },
    'lib/utils': { getBaseUrl: () => 'https://synthetic-render-host.invalid' },
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
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  const actual = load(path.join(sourceRoot, 'lib/allianz-automatic-components.ts'));
  overrides['lib/allianz-automatic-components'] = { ...actual, enrichAllianzComponentMap(components, options) {
    enrichments.push({ components, options });
    if (dropBindings) {
      const unconfigured = { ...options }; delete unconfigured.investmentPortfolioBindings;
      return actual.enrichAllianzComponentMap(components, unconfigured);
    }
    return actual.enrichAllianzComponentMap(components, options);
  } };
  const page = load(routeFile);
  async function render() {
    const element = await page.default({ params: Promise.resolve({ site, locale: language,
      path: records.publicPath.slice(1).split('/'),
    }) });
    return element.props.children.props;
  }
  return { page, render, calls, pageReads, enrichments, componentReads, locales, layout,
    originalMap, runtimeUid, records, get dynamicLoads() { return dynamicLoads; } };
}

test('actual page options inject exactly the verified four-key model through SDK composition', async () => {
  const h = harness(), rendered = await h.render();
  assert.equal(h.page.revalidate, 60);
  assert.deepEqual(h.enrichments[0].options.investmentPortfolioBindings, bindings);
  assert.deepEqual(Object.keys(h.enrichments[0].options).sort(), ['fetchOptions', 'getData', 'investmentPortfolioBindings']);
  assert.equal(h.enrichments[0].components, h.originalMap);
  assert.equal(h.originalMap.get('InvestmentPortfolio').getComponentServerProps, undefined);
  assert.notEqual(h.componentReads[0].components, h.originalMap);
  assert.equal(h.componentReads[0].layout, rendered.page.layout);
  assert.deepEqual(h.componentReads[0].context, {});
  assert.equal(h.dynamicLoads, 2, 'both runtime renderings load the actual enriched dynamic module');
  assert.equal(rendered.componentProps[h.runtimeUid].investmentPortfolio.complete, true);
  assert.equal(rendered.componentProps[h.runtimeUid].investmentPortfolio,
    rendered.componentProps[`${h.runtimeUid}-repeat`].investmentPortfolio);
  assert.equal(h.calls.length, 4, 'request-local repeated rendering reads share all three cursor pages');
  assert.equal(rendered.componentProps['native-section'].automaticSectionNavigation.error, 'unbound');
  assert.deepEqual(rendered.componentProps['native-stock'], { marker: 'native-stock', rootId: h.records.root.id });
});

for (const variant of ['normal', 'editing', 'preview', 'draft-navigation']) {
  test(`actual ${variant} page retains native owner, inherited membership, all cursors and incoming fetchOptions`, async () => {
    const h = harness({ variant }), rendered = await h.render();
    const result = rendered.componentProps[h.runtimeUid].investmentPortfolio;
    assert.equal(result.complete, true); assert.equal(result.active.length, 15); assert.equal(result.exited.length, 8);
    const scope = h.calls[0];
    assert.deepEqual(scope.selections, [
      { alias: 'root', args: { path: normalizeId(h.records.root.id), language: 'en-GB' } },
      { alias: 'datasource', args: { path: normalizeId(h.records.datasource.id), language: 'en-GB' } },
    ]);
    assert.deepEqual(h.calls.slice(1).map((call) => call.selections[0].args.after), [undefined, '10', '20']);
    for (const call of h.calls.slice(1)) {
      assert.deepEqual(call.selections[0].args.where.AND, [
        { name: '_templates', value: normalizeId(bindings.investmentTemplateId), operator: 'CONTAINS' },
        { name: '_parent', value: normalizeId(h.records.datasource.id), operator: 'EQ' },
        { name: '_language', value: 'en-GB', operator: 'EQ' },
        { name: '_latestversion', value: 'true', operator: 'EQ' },
      ]);
    }
    for (const call of h.calls) {
      assert.equal(call.variables, undefined);
      assert.equal(call.fetchOptions, h.enrichments[0].options.fetchOptions);
      visit(parse(call.query), { Field(node) { assert.notEqual(node.name.value, 'template'); } });
    }
    assert.deepEqual(h.locales, ['allianz-life_en-GB']);
    const headers = variant === 'normal' ? undefined : variant === 'draft-navigation'
      ? { Authorization: 'synthetic-cookie-authorization', sc_previewMode: 'true', sc_site: 'allianz-life' }
      : { Authorization: 'synthetic-header-authorization', sc_layoutKind: 'Final',
        sc_editMode: variant === 'editing' ? 'true' : 'false', sc_previewMode: variant === 'preview' ? 'true' : 'false',
        sc_site: 'allianz-life', sc_previewTime: '2026-10-04T02:00:00Z' };
    assert.deepEqual(h.enrichments[0].options.fetchOptions, headers ? { headers } : undefined);
    assert.equal(h.pageReads[0].backend, variant === 'normal' || variant === 'draft-navigation' ? 'layout' : 'editing');
    const selected = [...result.active, ...result.exited];
    assert.ok(selected.some((row) => row.id === h.records.items[0].id));
    assert.ok(selected.some((row) => row.id === h.records.items[21].id));
    assert.ok(selected.every((row) => row.id !== id(800) && row.id !== id(802)));
    for (const row of selected) {
      const native = h.records.items.find((item) => item.id === row.id);
      assert.equal(row.name, native.name); assert.equal(row.logo, native.logo); assert.equal(row.websiteLink, native.websiteLink);
      assert.equal(Object.hasOwn(row, 'nativeTemplates'), false);
    }
    assert.doesNotMatch(JSON.stringify(rendered.componentProps), /synthetic-(?:header|cookie)-authorization|Authorization|fetchOptions/);
  });
}

test('the same model works on another correctly owned native page without route or datasource configuration', async () => {
  const h = harness({ records: dataset(id(501), id(502), '/another-section/portfolio-two') });
  const rendered = await h.render();
  assert.deepEqual(h.enrichments[0].options.investmentPortfolioBindings, bindings);
  assert.equal(rendered.page.layout.sitecore.route.itemId, id(501));
  assert.equal(rendered.componentProps[h.runtimeUid].investmentPortfolio.complete, true);
  assert.equal(h.calls[0].selections[0].args.path, normalizeId(id(501)));
  assert.ok(h.calls.slice(1).every((call) => call.selections[0].args.where.AND[1].value === normalizeId(id(502))));
});

test('configured page integration still rejects foreign site, root and datasource ownership', async () => {
  const outside = dataset(); outside.root.path = '/sitecore/content/other/site/Home/portfolio';
  const wrongOwner = dataset(); wrongOwner.datasource.parent.parent.id = id(999);
  for (const [options, expectedReads] of [
    [{ site: 'foreign-site' }, 0], [{ records: outside }, 1], [{ records: wrongOwner }, 1],
    [{ datasourceId: 'unresolved-datasource' }, 0], [{ routeId: 'unresolved-page' }, 0],
  ]) {
    const h = harness(options), rendered = await h.render();
    const result = rendered.componentProps[h.runtimeUid].investmentPortfolio;
    assert.equal(result.error, 'invalid-scope'); assert.deepEqual(result.active, []); assert.deepEqual(result.exited, []);
    assert.equal(h.calls.length, expectedReads);
  }
});

test('removing the real page binding at the integration boundary makes Portfolio unconfigured without reads', async () => {
  const h = harness({ dropBindings: true }), rendered = await h.render();
  assert.deepEqual(h.enrichments[0].options.investmentPortfolioBindings, bindings);
  assert.equal(rendered.componentProps[h.runtimeUid].investmentPortfolio.error, 'unconfigured');
  assert.equal(h.calls.length, 0);
});

test('page enrichment caches repeated renderings only within one request and reads subsequent native changes', async () => {
  const h = harness({ variant: 'editing' });
  const first = (await h.render()).componentProps[h.runtimeUid].investmentPortfolio;
  h.records.items[0].investmentStatus = field('Active', h.records.items[0].id, 'investmentStatus');
  const second = (await h.render()).componentProps[h.runtimeUid].investmentPortfolio;
  assert.equal(first.exited.length, 8); assert.equal(second.exited.length, 7); assert.equal(second.active.length, 16);
  assert.notEqual(first, second); assert.equal(h.calls.length, 8);
  assert.notEqual(h.componentReads[0].components, h.componentReads[1].components);
  assert.notEqual(h.componentReads[0].components.get('InvestmentPortfolio').getComponentServerProps,
    h.componentReads[1].components.get('InvestmentPortfolio').getComponentServerProps);
  assert.ok(h.calls.slice(0, 4).every((call) => call.fetchOptions === h.enrichments[0].options.fetchOptions));
  assert.ok(h.calls.slice(4).every((call) => call.fetchOptions === h.enrichments[1].options.fetchOptions));
});
