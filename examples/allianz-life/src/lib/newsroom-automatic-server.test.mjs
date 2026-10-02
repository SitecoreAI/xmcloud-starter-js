import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { parse } = require('graphql');
const { renderToStaticMarkup } = require('react-dom/server');
const { ComponentPropsService, ComponentPropsContext, useComponentProps } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const directory = fileURLToPath(new URL('.', import.meta.url));
const modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only') return {};
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), `${specifier}.ts`));
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return compiled.exports;
}
const data = load(path.join(directory, 'newsroom-automatic-data.ts'));
const { enrichNewsroomComponentMap } = load(path.join(directory, 'newsroom-automatic-server.ts'));
const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
const normalized = data.normalizeNewsroomId;
const year = (number) => ({ id: id(number), name: `${number}-press-releases`,
  path: `/sitecore/content/Allianz/Home/about/Newsroom/${number}-press-releases`,
  url: { path: `/about/newsroom/${number}-press-releases` }, parent: { id: data.NEWSROOM_ROOT_ID },
  navigationTitle: { jsonValue: { value: String(number), editable: `<span data-field-id="${data.NEWSROOM_NAVIGATION_TITLE_FIELD_ID}">${number}</span>` } },
  indexTemplate: data.NEWSROOM_YEAR_PAGE_TEMPLATE_ID });
const page = (number, parent) => ({ id: id(number), path: `${parent.path}/article-${number}`,
  url: { path: `${parent.url.path}/article-${number}` }, parent: { id: parent.id },
  ancestors: [data.NEWSROOM_ROOT_ID, parent.id], indexTemplate: data.NEWSROOM_PAGE_TEMPLATE_ID });
const source = (number, owner, value) => ({ id: id(number), title: { jsonValue: { value: `Release ${number}`, editable: `<span>Release ${number}</span>` } },
  summary: { jsonValue: { value: '<p>Summary</p>' } }, releaseDate: { jsonValue: { value } },
  parent: { parent: { id: owner.id, url: owner.url, parent: owner.parent } },
  ancestors: [data.NEWSROOM_ROOT_ID, owner.parent.id, owner.id], indexTemplate: data.PRESS_RELEASE_TEMPLATE_ID });
function queryInputs(query) {
  const operation = parse(query).definitions[0];
  const selection = operation.selectionSet.selections[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { name: operation.name.value, ...Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])) };
}
function dataset(count = 26) {
  const years = [year(2025), year(2026)];
  const pages = Array.from({ length: count }, (_, i) => page(i + 1, years[i % 2]));
  const sources = pages.map((owner, i) => source(i + 101, owner, `2026-01-${String(i + 1).padStart(2, '0')}`));
  return { years, pages, sources };
}
function clientHarness(records, { failure, responseChange } = {}) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    componentPropsService: new ComponentPropsService(),
    graphQLClient: { async request(query, variables, fetchOptions) {
      const args = queryInputs(query);
      calls.push({ args, variables, fetchOptions });
      if (failure) throw failure;
      const kind = args.name.endsWith('Years') ? 'years' : args.name.endsWith('Pages') ? 'pages' : 'sources';
      const filters = args.where.AND;
      const rows = records[kind].filter((row) => filters.every((filter) => {
        if (filter.name === '_templates') return normalized(row.indexTemplate) === normalized(filter.value);
        if (filter.name === '_parent') return normalized(row.parent?.id) === normalized(filter.value);
        if (filter.name === '_path') return row.ancestors?.some((ancestor) => normalized(ancestor) === normalized(filter.value));
        return true;
      }));
      const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
      const response = { search: { total: rows.length, results: rows.slice(offset, offset + args.first),
        pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } };
      return responseChange ? responseChange(response, args) : response;
    } },
  });
  return { client, calls };
}
const componentMap = (dynamic = false) => new Map([
  ['Container', { Default: () => null }],
  ['PressReleaseArchive', { Default: () => null, componentType: 'client' }],
  ['NewsroomRecentReleases', dynamic ? { dynamicModule: async () => ({ Default: () => null }), componentType: 'client' } : { Default: () => null, componentType: 'client' }],
  ['NewsroomYearNavigation', { Default: () => null, componentType: 'client' }],
]);
function layout({ language = 'en', site = 'allianz-life', routeId = id(2026), components = ['PressReleaseArchive', 'NewsroomRecentReleases', 'NewsroomYearNavigation'] } = {}) {
  return { sitecore: { context: { language, site: { name: site } }, route: { itemId: routeId, itemLanguage: 'fr', fields: {},
    placeholders: { 'headless-main': [{ uid: 'container', componentName: 'Container', placeholders: {
      nested: components.map((componentName, i) => ({ uid: `rendering-${i}`, componentName, dataSource: id(500 + i),
        fields: { data: { datasource: { heading: { jsonValue: { value: 'Editable heading', editable: '<span>Editable heading</span>' } } } } } })),
    } }] } } } };
}
const renderings = (pageLayout) => pageLayout.sitecore.route.placeholders['headless-main'][0].placeholders.nested;
function readHookProps(componentProps, uid) {
  function Probe() {
    const result = useComponentProps(uid);
    return React.createElement('output', null, JSON.stringify(result));
  }
  return renderToStaticMarkup(React.createElement(ComponentPropsContext, { value: componentProps }, React.createElement(Probe)));
}

test('real SDK getData/getComponentData/context transports complete automatic data and preserves authored fields', async () => {
  const records = dataset(), { client, calls } = clientHarness(records);
  const options = { headers: { Authorization: 'synthetic-authoring-token', sc_previewMode: 'true', sc_site: 'allianz-life' } };
  const originalMap = componentMap();
  const enriched = enrichNewsroomComponentMap(originalMap, { getData: client.getData.bind(client), fetchOptions: options });
  const pageLayout = layout();
  const heading = renderings(pageLayout)[0].fields.data.datasource.heading.jsonValue;
  const props = await client.getComponentData(pageLayout, {}, enriched);
  assert.equal(originalMap.get('PressReleaseArchive').getComponentServerProps, undefined);
  assert.equal(props['rendering-0'].automaticReleases.items.length, 13);
  assert.equal(props['rendering-0'].automaticReleases.items[0].id, id(126));
  assert.deepEqual(props['rendering-1'].automaticReleases.items.map((item) => item.id), [126, 125, 124, 123, 122, 121].map(id));
  assert.deepEqual(props['rendering-2'].automaticYears.items.map((item) => item.year), [2026, 2025]);
  assert.equal(props['rendering-2'].automaticYears.currentId, id(2026));
  assert.equal(props['rendering-1'].automaticReleases.items[0].title.jsonValue, records.sources[25].title.jsonValue);
  assert.equal(renderings(pageLayout)[0].fields.data.datasource.heading.jsonValue, heading);
  assert.ok(calls.every((call) => call.fetchOptions === options && call.variables === undefined));
  assert.equal(calls.filter((call) => call.args.name.endsWith('Years')).length, 1);
  assert.equal(calls.filter((call) => call.args.name.endsWith('Releases') && call.args.where.AND[1].value === normalized(data.NEWSROOM_ROOT_ID)).length, 3);
  const html = readHookProps(props, 'rendering-1');
  assert.match(html, /Release 126/);
  assert.doesNotMatch(JSON.stringify(props) + html, /synthetic-authoring-token|Authorization|sc_previewMode|fetchOptions/);
});

test('request-local memoization shares repeated renderings but re-reads after a request boundary', async () => {
  const records = dataset(2), { client, calls } = clientHarness(records);
  const pageLayout = layout({ components: ['NewsroomRecentReleases', 'NewsroomRecentReleases', 'NewsroomYearNavigation'] });
  const firstMap = enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) });
  const first = await client.getComponentData(pageLayout, {}, firstMap);
  assert.equal(calls.length, 3);
  assert.equal(first['rendering-0'].automaticReleases, first['rendering-1'].automaticReleases);
  const owner = page(3, records.years[1]);
  records.pages.push(owner); records.sources.push(source(103, owner, '2026-12-01'));
  const second = await client.getComponentData(pageLayout, {}, enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(calls.length, 6);
  assert.equal(second['rendering-0'].automaticReleases.items[0].id, id(103));
  records.pages.pop(); records.sources.pop();
  const third = await client.getComponentData(pageLayout, {}, enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(third['rendering-0'].automaticReleases.items.length, 2);
});

test('hook enrichment works through real SDK dynamic-module resolution', async () => {
  const { client } = clientHarness(dataset(1));
  const props = await client.getComponentData(layout({ components: ['NewsroomRecentReleases'] }), {},
    enrichNewsroomComponentMap(componentMap(true), { getData: client.getData.bind(client) }));
  assert.equal(props['rendering-0'].automaticReleases.complete, true);
  assert.equal(props['rendering-0'].automaticReleases.items.length, 1);
});

test('empty catalogs are ready; unsupported site/language/archives are unavailable without unscoped reads', async () => {
  const { client, calls } = clientHarness({ years: [], pages: [], sources: [] });
  let props = await client.getComponentData(layout({ components: ['NewsroomRecentReleases', 'NewsroomYearNavigation'] }), {},
    enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.deepEqual(props['rendering-0'].automaticReleases, { items: [], complete: true, status: 'ready', missingDates: 0, missingSources: 0 });
  assert.deepEqual(props['rendering-1'].automaticYears, { items: [], complete: true, status: 'ready' });
  const initialReads = calls.length;
  for (const invalid of [{ site: 'other-site' }, { language: 'invalid"language' }]) {
    props = await client.getComponentData(layout(invalid), {}, enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.ok(Object.values(props).every((value) => (value.automaticReleases ?? value.automaticYears).error === 'invalid-scope'));
  }
  assert.equal(calls.length, initialReads);
  props = await client.getComponentData(layout({ components: ['PressReleaseArchive'], routeId: 'invalid-id' }), {},
    enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(props['rendering-0'].automaticReleases.error, 'invalid-scope');
  assert.equal(calls.length, initialReads);
});

test('hooks derive language from the actual layout context and never send caller credentials to component props', async () => {
  const { client, calls } = clientHarness(dataset(1));
  const props = await client.getComponentData(layout({ language: 'en-US', components: ['NewsroomRecentReleases'] }), {},
    enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.ok(calls.every((call) => call.args.where.AND.find((filter) => filter.name === '_language').value === 'en-US'));
  assert.ok(calls.every((call) => call.fetchOptions === undefined));
  assert.equal(props['rendering-0'].automaticReleases.complete, true);
});

test('explicit News template queries exclude unrelated pages even when release datasources exist beneath them', async () => {
  const records = dataset(1), unrelated = { ...page(50, records.years[1]), indexTemplate: data.NEWSROOM_YEAR_PAGE_TEMPLATE_ID };
  const nested = { ...page(51, records.years[1]), parent: { id: id(900) } };
  records.pages.push(unrelated, nested);
  records.sources.push(source(150, unrelated, '2026-12-31'), source(151, nested, '2026-12-30'));
  const { client } = clientHarness(records);
  const props = await client.getComponentData(layout({ components: ['NewsroomRecentReleases'] }), {},
    enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(props['rendering-0'].automaticReleases.complete, true);
  assert.deepEqual(props['rendering-0'].automaticReleases.items.map((item) => item.id), [id(101)]);
});

test('failed or incomplete reads, changed totals and duplicate owned sources produce sanitized unavailable states', async () => {
  const cases = [
    { options: { failure: new Error('Authorization synthetic-secret query with internal endpoint') } },
    { options: { responseChange: (response) => ({ search: { ...response.search, pageInfo: undefined } }) } },
    { options: { responseChange: (response, args) => args.after ? { search: { ...response.search, total: response.search.total + 1 } } : response } },
    { change: (records) => records.sources.push(source(999, records.pages[0], '2026-01-01')) },
  ];
  for (const scenario of cases) {
    const records = dataset(); scenario.change?.(records);
    const { client } = clientHarness(records, scenario.options);
    const props = await client.getComponentData(layout({ components: ['NewsroomRecentReleases'] }), {},
      enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client), fetchOptions: { headers: { Authorization: 'synthetic-secret' } } }));
    assert.deepEqual(props['rendering-0'].automaticReleases, { items: [], complete: false, status: 'unavailable', error: 'unavailable' });
    assert.doesNotMatch(JSON.stringify(props) + readHookProps(props, 'rendering-0'), /synthetic-secret|Authorization|internal endpoint|query with/);
  }
});

test('a page awaiting its Press Release datasource leaves existing releases visible through the real SDK hook', async () => {
  const records = dataset(2);
  records.pages.push(page(3, records.years[1]));
  const { client } = clientHarness(records);
  const props = await client.getComponentData(layout({ components: ['NewsroomRecentReleases', 'PressReleaseArchive'] }), {},
    enrichNewsroomComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(props['rendering-0'].automaticReleases.complete, true);
  assert.equal(props['rendering-0'].automaticReleases.items.length, 2);
  assert.equal(props['rendering-0'].automaticReleases.missingSources, 1);
  assert.equal(props['rendering-1'].automaticReleases.items.length, 1);
  assert.equal(props['rendering-1'].automaticReleases.missingSources, 1);
});
