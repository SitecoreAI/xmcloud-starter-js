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
const directory = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();

// Use the installed SDK, transpiling only the application's TypeScript sidecars.
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

const data = load(path.join(directory, 'document-automatic-data.props.ts'));
const { enrichDocumentComponentMap } = load(path.join(directory, 'document-automatic-server.props.ts'));
const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
const normalized = data.normalizeDocumentId;
const field = (value) => ({ jsonValue: { value, editable: `<span>${value}</span>` } });
const routeId = id(1);
const rootId = id(2);
const unavailable = { items: [], complete: false, status: 'unavailable', error: 'unavailable' };
const invalidScope = { ...unavailable, error: 'invalid-scope' };
const ready = (items = []) => ({ items, complete: true, status: 'ready' });
const componentName = (kind) => kind === 'documents' ? 'ProspectusDocumentTable' : 'ProspectusProductDirectory';
const collectionName = (kind) => kind === 'documents' ? 'automaticDocuments' : 'automaticProducts';

function pageRoot(number = 1) {
  return { id: id(number), path: `/sitecore/content/Allianz/Home/prospectuses-${number}`, url: { path: `/prospectuses-${number}` } };
}
function documentRoot(owner = pageRoot(), number = 2) {
  return { id: id(number), path: `${owner.path}/Data/Documents`, url: { path: `${owner.url.path}/data/documents` }, parent: { parent: { id: owner.id } } };
}
function document(number, owner = documentRoot(), extra = {}) {
  return { id: id(number), name: `document-${String(number).padStart(5, '0')}`, parent: { id: owner.id },
    template: { id: data.DOCUMENT_ROW_TEMPLATE_ID }, language: 'en', latestVersion: true,
    sortOrder: field('0'), documentLink: { jsonValue: { value: { href: `/documents/document-${number}.pdf`, text: `Document ${number}` }, editable: '<a>Editable document</a>' } },
    contractNote: field(`Note ${number}`), revisionDate: field('2026-10-02'), fileSize: field('1 MB'), ...extra };
}
function product(number, owner = pageRoot(), extra = {}) {
  return { id: id(number), name: `product-${String(number).padStart(5, '0')}`, parent: { id: owner.id },
    path: `${owner.path}/product-${number}`, url: { path: `${owner.url.path}/product-${number}` },
    template: { id: data.PROSPECTUS_PAGE_TEMPLATE_ID }, language: 'en', latestVersion: true,
    sortOrder: field('0'), prospectusDirectoryTitle: field(`Product ${number}`), prospectusDirectoryGroup: field(number % 2 ? 'past' : 'current'), ...extra };
}
function dataset(count = 23) {
  const page = pageRoot(), source = documentRoot(page);
  return { roots: [page, source], documents: Array.from({ length: count }, (_, i) => document(100 + i, source)),
    products: Array.from({ length: count }, (_, i) => product(200 + i, page)) };
}
function queryInputs(query) {
  const operation = parse(query).definitions[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  const root = operation.selectionSet.selections.find((selection) => selection.alias?.value === 'root');
  const children = root.selectionSet.selections.find((selection) => selection.name.value === 'children');
  const args = (selection) => Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)]));
  return { name: operation.name.value, root: args(root), ...args(children) };
}
function clientHarness(records = dataset(), { responseChange, failure } = {}) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    componentPropsService: new ComponentPropsService(),
    graphQLClient: { async request(query, variables, fetchOptions) {
      const args = queryInputs(query);
      const kind = args.name.endsWith('Documents') ? 'documents' : 'products';
      calls.push({ query, args, kind, variables, fetchOptions });
      if (failure) throw failure;
      // Native children supplies the complete direct-child sequence, including other templates.
      const rows = records[kind].filter((row) => normalized(row.parent?.id) === normalized(args.root.path)
        && row.language === args.root.language && row.latestVersion);
      const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
      const root = records.roots.find((item) => normalized(item.id) === normalized(args.root.path));
      const response = { root: root && { ...root, children: { total: rows.length, results: rows.slice(offset, offset + args.first),
        pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } } };
      return responseChange ? responseChange(structuredClone(response), args, kind) : response;
    } },
  });
  return { client, calls };
}
function componentMap(dynamic = false) {
  const entry = () => dynamic
    ? { componentType: 'client', dynamicModule: async () => ({ Default: () => null, marker: 'original-module' }) }
    : { componentType: 'client', Default: () => null };
  return new Map([['Container', { Default: () => null }], ['Untouched', entry()],
    ['ProspectusDocumentTable', entry()], ['ProspectusProductDirectory', entry()]]);
}
function rendering(kind, uid = kind, datasource = rootId) {
  return { uid, componentName: componentName(kind), dataSource: datasource,
    fields: { data: { datasource: { id: datasource, heading: field(`Authored ${uid}`) } } } };
}
function layout({ site = 'allianz-life', language = 'en', route = routeId,
  renderings = [rendering('documents'), rendering('products')] } = {}) {
  return { sitecore: { context: { language, site: { name: site } }, route: { itemId: route, itemLanguage: 'de', fields: {},
    placeholders: { 'headless-main': [{ uid: 'container', componentName: 'Container', placeholders: { nested: renderings } }] } } } };
}
function readHookProps(props, uid) {
  function Probe() {
    return React.createElement('output', null, JSON.stringify(useComponentProps(uid)));
  }
  return renderToStaticMarkup(React.createElement(ComponentPropsContext, { value: props }, React.createElement(Probe)));
}
async function fetchCollection(kind, records = dataset(), harnessOptions = {}) {
  const { client, calls } = clientHarness(records, harnessOptions);
  const props = await client.getComponentData(layout({ renderings: [rendering(kind)] }), {},
    enrichDocumentComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  return { collection: props[kind][collectionName(kind)], props, calls };
}

test('real SDK transports every page through UID context, forwarding preview options without leaking them', async () => {
  const records = dataset(), { client, calls } = clientHarness(records);
  const preview = { cache: 'no-store', headers: { Authorization: 'synthetic-authoring-token', sc_previewMode: 'true', sc_site: 'allianz-life' } };
  const original = componentMap(), page = layout(), before = structuredClone(page);
  const props = await client.getComponentData(page, {}, enrichDocumentComponentMap(original,
    { getData: client.getData.bind(client), fetchOptions: preview }));
  for (const kind of ['documents', 'products']) {
    assert.deepEqual(props[kind][collectionName(kind)], ready(records[kind]));
    assert.deepEqual(calls.filter((call) => call.kind === kind).map((call) => call.args.after), [undefined, '10', '20']);
    assert.equal(original.get(componentName(kind)).getComponentServerProps, undefined);
    assert.match(readHookProps(props, kind), /complete/);
  }
  assert.equal(props.documents.automaticDocuments.items[0].documentLink.jsonValue, records.documents[0].documentLink.jsonValue);
  assert.equal(props.products.automaticProducts.items[0].prospectusDirectoryTitle.jsonValue, records.products[0].prospectusDirectoryTitle.jsonValue);
  assert.match(readHookProps(props, 'documents'), /Document 122/);
  assert.doesNotMatch(readHookProps(props, 'documents'), /Product 222/);
  assert.match(readHookProps(props, 'products'), /Product 222/);
  assert.doesNotMatch(readHookProps(props, 'products'), /Document 122/);
  assert.deepEqual(page, before);
  assert.ok(calls.every((call) => call.fetchOptions === preview && call.variables === undefined));
  assert.doesNotMatch(JSON.stringify(props) + readHookProps(props, 'documents'), /synthetic-authoring-token|Authorization|sc_previewMode|fetchOptions/);
});

test('queries project native item children in context language without search, template or sorting arguments', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(1), make = kind === 'documents' ? document : product;
    const owner = kind === 'documents' ? records.roots[1] : records.roots[0];
    records[kind].push(make(900, owner, { parent: { id: id(999) } }), make(901, owner, { template: { id: id(999) } }),
      make(902, owner, { language: 'fr' }), make(903, owner, { latestVersion: false }));
    const { collection, calls } = await fetchCollection(kind, records);
    assert.deepEqual(collection, ready([records[kind][0]]));
    assert.deepEqual(calls[0].args.root, { path: normalized(owner.id), language: 'en' });
    assert.equal(calls[0].args.first, 10);
    const selections = parse(calls[0].query).definitions[0].selectionSet.selections;
    assert.equal(selections.length, 1);
    assert.equal(selections[0].name.value, 'item');
    const projection = (selection) => selection.selectionSet
      ? Object.fromEntries(selection.selectionSet.selections.map((child) => [child.alias?.value ?? child.name.value, projection(child)])) : true;
    const expectedResults = { id: true, name: true, parent: { id: true }, template: { id: true },
      ...(kind === 'documents'
        ? { documentLink: { jsonValue: true }, contractNote: { jsonValue: true }, revisionDate: { jsonValue: true }, fileSize: { jsonValue: true } }
        : { path: true, url: { path: true }, prospectusDirectoryTitle: { jsonValue: true }, prospectusDirectoryGroup: { jsonValue: true } }) };
    assert.deepEqual(projection(selections[0]), { id: true, path: true, url: { path: true }, parent: { parent: { id: true } },
      children: { total: true, pageInfo: { hasNext: true, endCursor: true }, results: expectedResults } });
    const children = selections[0].selectionSet.selections.find((selection) => selection.name.value === 'children');
    assert.deepEqual(children.arguments.map((argument) => argument.name.value), ['first']);
    const resultFields = children.selectionSet.selections.find((selection) => selection.name.value === 'results').selectionSet.selections;
    for (const selection of resultFields.filter((selection) => selection.alias)) {
      assert.equal(selection.name.value, 'field');
      assert.deepEqual(selection.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', selection.alias.value]]);
    }
    assert.doesNotMatch(calls[0].query, /search|selectedProducts|selectedDocuments|_path|sortOrder|__Sortorder|orderBy|_templates|_parent|_latestversion/);
  }
});

test('query construction validates scope and safely quotes opaque cursors', () => {
  const scope = { language: 'en-US', rootId, routeId };
  const cursor = 'opaque\\cursor"\npage';
  assert.equal(queryInputs(data.buildDocumentQuery('documents', scope, cursor)).after, cursor);
  for (const invalid of [{ rootId: 'not-an-id' }, { routeId: 'not-an-id' }, { language: 'en"query' }, { language: '' }]) {
    assert.throws(() => data.buildDocumentQuery('documents', { ...scope, ...invalid }));
  }
  for (const invalid of ['', null, 10]) assert.throws(() => data.buildDocumentQuery('documents', scope, invalid));
});

test('native child sequence survives tied, blank and nonsense sort metadata, names and GUIDs across pages', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(23);
    const sortValues = [undefined, '', '0', '0', '-2', '1.5', '9007199254740992', 'not-a-number', null, 10];
    records[kind].reverse().forEach((item, i) => {
      item.name = i % 3 ? 'Tied name' : `Reverse ${String(99 - i)}`;
      const value = sortValues[i % sortValues.length];
      item.sortOrder = value === undefined ? undefined : field(value);
    });
    const expected = records[kind].map((item) => item.id);
    const { collection, calls } = await fetchCollection(kind, records);
    assert.deepEqual(collection, ready(records[kind]));
    assert.deepEqual(collection.items.map((item) => item.id), expected);
    assert.equal(calls.length, 3);
  }
});

test('template filtering preserves native order after counting every interleaved child across all pages', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(23);
    records[kind].reverse().forEach((item, i) => {
      if (i % 3 !== 1) item.template = { id: id(999) };
      if (kind === 'products' && i % 3 !== 1) {
        // Non-page children may have no public page URL or directory metadata.
        delete item.path;
        delete item.url;
        delete item.prospectusDirectoryTitle;
        item.prospectusDirectoryGroup = field('not-a-directory-page');
      }
    });
    const expected = records[kind].filter((_, i) => i % 3 === 1);
    const { collection, calls } = await fetchCollection(kind, records);
    assert.deepEqual(collection, ready(expected));
    assert.deepEqual(calls.map((call) => call.args.after), [undefined, '10', '20']);
    assert.equal(collection.items.at(-1).id, expected.at(-1).id);
  }
});

test('an entire nonmatching child page cannot end collection early or satisfy the final total', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(23);
    records[kind].forEach((item, i) => { if (i < 20) item.template = { id: id(999) }; });
    const result = await fetchCollection(kind, records);
    assert.deepEqual(result.collection, ready(records[kind].slice(20)));
    assert.equal(result.calls.length, 3);
    const missingFinal = await fetchCollection(kind, records, { responseChange: (response, args) => {
      if (args.after === '20') response.root.children.results.pop();
      return response;
    } });
    assert.deepEqual(missingFinal.collection, unavailable);
    records[kind].forEach((item) => { item.template = { id: id(999) }; });
    const noMatches = await fetchCollection(kind, records);
    assert.deepEqual(noMatches.collection, ready());
    assert.equal(noMatches.calls.length, 3);
  }
});

test('empty collections are complete and group filtering retains native sequence while excluding blank memberships', async () => {
  assert.deepEqual((await fetchCollection('documents', dataset(0))).collection, ready());
  assert.deepEqual((await fetchCollection('products', dataset(0))).collection, ready());
  const records = dataset(23);
  records.products.reverse().forEach((item, i) => {
    if (i % 3 === 0) item.prospectusDirectoryGroup = undefined;
    if (i % 3 === 1) item.prospectusDirectoryGroup = field('');
  });
  const { collection, calls } = await fetchCollection('products', records);
  assert.deepEqual(collection, ready(records.products.filter((_, i) => i % 3 === 2)));
  assert.equal(calls.length, 3, 'blank memberships cannot terminate pagination early');
});

test('invalid directory groups and missing titles make the entire collection unavailable', async (t) => {
  for (const group of ['unknown', 'CURRENT', ' ', null, 42]) {
    await t.test(`reject group ${JSON.stringify(group)}`, async () => {
      const records = dataset(23);
      records.products[22].prospectusDirectoryGroup = field(group);
      assert.deepEqual((await fetchCollection('products', records)).collection, unavailable);
    });
  }
  for (const title of [undefined, field(null), field(42)]) {
    const records = dataset(2);
    records.products[1].prospectusDirectoryTitle = title;
    assert.deepEqual((await fetchCollection('products', records)).collection, unavailable);
  }
});

test('repeated component instances share request-local reads while different UIDs keep their datasource results', async () => {
  const records = dataset(1), otherRoot = documentRoot(records.roots[0], 3);
  records.roots.push(otherRoot);
  records.documents.push(document(999, otherRoot));
  const { client, calls } = clientHarness(records);
  const renderings = [rendering('documents', 'first'), rendering('documents', 'second', `{${rootId.toUpperCase()}}`),
    rendering('documents', 'other', otherRoot.id), rendering('products', 'directory-a'), rendering('products', 'directory-b')];
  const props = await client.getComponentData(layout({ renderings }), {},
    enrichDocumentComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(calls.length, 3);
  assert.equal(props.first.automaticDocuments, props.second.automaticDocuments);
  assert.equal(props['directory-a'].automaticProducts, props['directory-b'].automaticProducts);
  assert.deepEqual(props.other.automaticDocuments.items.map((item) => item.id), [id(999)]);
  assert.notEqual(props.first.automaticDocuments, props.other.automaticDocuments);
  assert.match(readHookProps(props, 'other'), /Document 999/);
  assert.doesNotMatch(readHookProps(props, 'first'), /Document 999/);
});

test('new request maps observe child additions and removals instead of reusing stale collections', async () => {
  const records = dataset(1), { client, calls } = clientHarness(records);
  const fetch = () => client.getComponentData(layout(), {},
    enrichDocumentComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal((await fetch()).documents.automaticDocuments.items.length, 1);
  records.documents.push(document(900)); records.products.push(product(901));
  const second = await fetch();
  assert.equal(second.documents.automaticDocuments.items.length, 2);
  assert.equal(second.products.automaticProducts.items.length, 2);
  records.documents.splice(0); records.products.splice(0);
  const third = await fetch();
  assert.deepEqual(third.documents.automaticDocuments, ready());
  assert.deepEqual(third.products.automaticProducts, ready());
  assert.equal(calls.length, 6);
});

test('layout site, language and route isolate results even when a map is reused', async () => {
  const records = dataset(1), otherPage = pageRoot(8), otherRoot = documentRoot(otherPage, 9);
  records.roots.push(otherPage, otherRoot);
  records.documents.push(document(800, otherRoot), document(801, records.roots[1], { language: 'en-US' }));
  records.products.push(product(802, otherPage), product(803, records.roots[0], { language: 'en-US' }));
  const { client, calls } = clientHarness(records);
  const map = enrichDocumentComponentMap(componentMap(), { getData: client.getData.bind(client) });
  const first = await client.getComponentData(layout(), {}, map);
  assert.equal(first.documents.automaticDocuments.items[0].id, id(100));
  const localized = await client.getComponentData(layout({ language: 'en-US' }), {}, map);
  assert.deepEqual(localized.documents.automaticDocuments.items.map((item) => item.id), [id(801)]);
  assert.deepEqual(localized.products.automaticProducts.items.map((item) => item.id), [id(803)]);
  assert.ok(calls.slice(2).every((call) => call.args.root.language === 'en-US'));
  const other = await client.getComponentData(layout({ route: otherPage.id,
    renderings: [rendering('documents', 'documents', otherRoot.id), rendering('products')] }), {}, map);
  assert.deepEqual(other.documents.automaticDocuments.items.map((item) => item.id), [id(800)]);
  assert.deepEqual(other.products.automaticProducts.items.map((item) => item.id), [id(802)]);
  const readCount = calls.length;
  for (const invalid of [{ site: 'other-site' }, { language: '' }, { language: 'en"query' }, { language: null }, { route: 'invalid-id' }]) {
    const props = await client.getComponentData(layout(invalid), {}, map);
    assert.deepEqual(props.documents.automaticDocuments, invalidScope);
    assert.deepEqual(props.products.automaticProducts, invalidScope);
  }
  assert.equal(calls.length, readCount, 'invalid layout context must never issue a query or reuse cached data');
  const wrongRoute = await client.getComponentData(layout({ route: otherPage.id, renderings: [rendering('documents')] }), {}, map);
  assert.deepEqual(wrongRoute.documents.automaticDocuments, unavailable, 'a document root from another route cannot reuse cached data');
});

test('datasource item ID takes precedence and rendering dataSource is a validated fallback', async () => {
  const { client, calls } = clientHarness(dataset(1));
  const authoritative = rendering('documents', 'authoritative');
  authoritative.dataSource = 'local:/Data/Documents';
  const fallback = rendering('documents', 'fallback');
  delete fallback.fields;
  const invalid = rendering('documents', 'invalid', 'local:/Data/Documents');
  const props = await client.getComponentData(layout({ renderings: [authoritative, fallback, invalid] }), {},
    enrichDocumentComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(props.authoritative.automaticDocuments.complete, true);
  assert.equal(props.authoritative.automaticDocuments, props.fallback.automaticDocuments);
  assert.deepEqual(props.invalid.automaticDocuments, invalidScope);
  assert.equal(calls.length, 1);
});

test('enrichment copies static and dynamic entries, preserves exports and leaves unrelated components unchanged', async () => {
  for (const dynamic of [false, true]) {
    const original = componentMap(dynamic), { client } = clientHarness(dataset(1));
    const map = enrichDocumentComponentMap(original, { getData: client.getData.bind(client) });
    assert.notEqual(map, original);
    assert.equal(map.get('Untouched'), original.get('Untouched'));
    for (const kind of ['documents', 'products']) {
      const name = componentName(kind);
      assert.notEqual(map.get(name), original.get(name));
      assert.equal(map.get(name).componentType, 'client');
      assert.equal(original.get(name).getComponentServerProps, undefined);
      if (dynamic) {
        const before = await original.get(name).dynamicModule();
        const after = await map.get(name).dynamicModule();
        assert.equal(before.getComponentServerProps, undefined);
        assert.equal(after.marker, 'original-module');
        assert.equal(after.getComponentServerProps, map.get(name).getComponentServerProps);
        assert.equal(typeof after.Default, 'function');
      } else assert.equal(map.get(name).Default, original.get(name).Default);
    }
    const props = await client.getComponentData(layout(), {}, map);
    assert.equal(props.documents.automaticDocuments.items.length, 1);
    assert.equal(props.products.automaticProducts.items.length, 1);
    const partial = enrichDocumentComponentMap(new Map([['Untouched', original.get('Untouched')]]), { getData: client.getData.bind(client) });
    assert.deepEqual([...partial.keys()], ['Untouched']);
  }
});

test('ownership validation rejects foreign roots, indirect children and unsafe product URLs', async (t) => {
  const scenarios = [
    ['documents', 'foreign route owner', (response) => { response.root.parent.parent.id = id(999); }],
    ['documents', 'missing route owner', (response) => { delete response.root.parent; }],
    ['documents', 'foreign direct child', (response) => { response.root.children.results[0].parent.id = id(999); }],
    ['products', 'foreign direct child', (response) => { response.root.children.results[0].parent.id = id(999); }],
    ['products', 'nested content path', (response) => { response.root.children.results[0].path += '/grandchild'; }],
    ['products', 'sibling content path', (response) => { response.root.children.results[0].path = `${response.root.path}-other/product`; }],
    ['products', 'nested public URL', (response) => { response.root.children.results[0].url.path += '/grandchild'; }],
    ['products', 'sibling public URL', (response) => { response.root.children.results[0].url.path = `${response.root.url.path}-other/product`; }],
    ['products', 'protocol-relative public URL', (response) => { response.root.children.results[0].url.path = '//example.com/product'; }],
    ['products', 'unsafe route root', (response) => { response.root.url.path = '/account'; response.root.children.results[0].url.path = '/account/product'; }],
  ];
  for (const [kind, label, change] of scenarios) await t.test(`${kind}: ${label}`, async () => {
    const { collection } = await fetchCollection(kind, dataset(1), { responseChange: (response) => { change(response); return response; } });
    assert.deepEqual(collection, unavailable);
  });
});

test('pagination and malformed response failures discard all partial data for both listing kinds', async (t) => {
  const scenarios = [
    ['changed total', (response, args) => { if (args.after) response.root.children.total += 1; }],
    ['stale final total', (response) => { response.root.children.total += 1; }],
    ['count exceeds total', (response) => { response.root.children.total = 0; }],
    ['premature final page', (response) => { response.root.children.pageInfo.hasNext = false; }],
    ['missing cursor', (response) => { delete response.root.children.pageInfo.endCursor; }],
    ['empty cursor', (response) => { response.root.children.pageInfo.endCursor = ''; }],
    ['numeric cursor', (response) => { response.root.children.pageInfo.endCursor = 10; }],
    ['repeated cursor', (response, args) => { if (args.after) response.root.children.pageInfo.endCursor = args.after; }],
    ['empty intermediate page', (response) => { response.root.children.results = []; }],
    ['missing page info', (response) => { delete response.root.children.pageInfo; }],
    ['invalid hasNext', (response) => { response.root.children.pageInfo.hasNext = 'true'; }],
    ['invalid total', (response) => { response.root.children.total = '23'; }],
    ['missing result list', (response) => { delete response.root.children.results; }],
    ['overfull page', (response) => { response.root.children.results.push(response.root.children.results[0]); }],
    ['missing root', (response) => { delete response.root; }],
    ['wrong root ID', (response) => { response.root.id = id(999); }],
    ['root path changes', (response, args) => { if (args.after) response.root.path += '-changed'; }],
    ['root URL changes', (response, args) => { if (args.after) response.root.url.path += '-changed'; }],
    ['duplicate canonical ID', (response, args) => { if (args.after) response.root.children.results[0].id = `{${id(100).toUpperCase()}}`; }, 'documents'],
    ['duplicate canonical ID', (response, args) => { if (args.after) response.root.children.results[0].id = `{${id(200).toUpperCase()}}`; }, 'products'],
    ['invalid child ID', (response) => { response.root.children.results[0].id = 'invalid-id'; }],
    ['empty native name', (response) => { response.root.children.results[0].name = ''; }],
    ['missing child template', (response) => { delete response.root.children.results[0].template; }],
    ['missing template ID', (response) => { response.root.children.results[0].template = {}; }],
    ['invalid child template', (response) => { response.root.children.results[0].template = { id: 'invalid-template' }; }],
  ];
  for (const kind of ['documents', 'products']) {
    for (const [label, change, onlyKind] of scenarios) {
      if (onlyKind && onlyKind !== kind) continue;
      await t.test(`${kind}: ${label}`, async () => {
        const { collection, calls } = await fetchCollection(kind, dataset(), {
          responseChange: (response, args) => { change(response, args); return response; },
        });
        assert.deepEqual(collection, unavailable);
        assert.ok(calls.length <= 3, 'broken pagination must terminate without retry loops');
      });
    }
  }
});

test('SDK transport errors, including later pages, produce sanitized failures without poisoning a new request', async () => {
  const secret = 'synthetic-secret endpoint-internal';
  for (const kind of ['documents', 'products']) {
    for (const harnessOptions of [
      { failure: new Error(secret) },
      { responseChange: (response, args) => { if (args.after) throw new Error(secret); return response; } },
    ]) {
      const { collection, props } = await fetchCollection(kind, dataset(), harnessOptions);
      assert.deepEqual(collection, unavailable);
      assert.doesNotMatch(JSON.stringify(props) + readHookProps(props, kind), /synthetic-secret|endpoint-internal|stack/);
    }
    assert.equal((await fetchCollection(kind)).collection.complete, true);
  }
});
