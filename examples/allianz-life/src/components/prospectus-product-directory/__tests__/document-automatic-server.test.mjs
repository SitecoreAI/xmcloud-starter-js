import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { parse, visit } = require('graphql');
const { ClientError } = require('graphql-request');
const { renderToStaticMarkup } = require('react-dom/server');
const { ComponentPropsService, ComponentPropsContext, useComponentProps } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const { GraphQLRequestClient } = require('@sitecore-content-sdk/core');
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
const { classifyQueryFailure } = load(path.join(directory, '../../lib/allianz-query-failure.ts'));
const id = (number) => `00000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`;
const normalized = data.normalizeDocumentId;
const field = (value) => ({ jsonValue: { value, editable: `<span>${value}</span>` } });
const routeId = id(1);
const rootId = id(2);
const unavailable = { items: [], complete: false, status: 'unavailable', error: 'unavailable' };
const diagnosticKeys = ['responseFormat', 'envelope', 'dataShape', 'graphqlErrorCount', 'countTruncated', 'errorSummaries'];
function assertUnavailable(value, message) {
  const { failureStage, failureKind, httpStatus, responseFormat, envelope, dataShape, graphqlErrorCount, countTruncated, errorSummaries, ...content } = value;
  assert.deepEqual(content, unavailable, message);
  assert.match(failureStage, /^(children-request|children-validation|selection-validation)$/);
  assert.ok(['graphql-validation', 'complexity-limit', 'authentication', 'authorization', 'rate-limit', 'upstream', 'network', 'unknown'].includes(failureKind));
  if (httpStatus !== undefined) assert.ok(Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599);
  assert.ok(['json', 'text', 'other', 'unknown'].includes(responseFormat));
  assert.ok(['object-errors', 'string-json-errors', 'text-body', 'missing-data', 'other'].includes(envelope));
  assert.ok(['absent', 'null', 'object', 'array', 'scalar'].includes(dataShape));
  assert.ok(Number.isInteger(graphqlErrorCount) && graphqlErrorCount >= 0 && graphqlErrorCount <= 32);
  assert.equal(typeof countTruncated, 'boolean');
  assert.ok(Array.isArray(errorSummaries) && errorSummaries.length <= 8);
  for (const summary of errorSummaries) assert.deepEqual(Object.keys(summary).sort(), ['code', 'signature', 'fieldCategory'].sort());
}
const invalidScope = { ...unavailable, error: 'invalid-scope' };
const projectedChild = ({ template, language, latestVersion, sortOrder, ...item }) => item;
const ready = (items = []) => ({ items: items.map(projectedChild), complete: true, status: 'ready' });
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
function nativeTemplateMatches(records, row, baseTemplate) {
  const pending = [row.template?.id], seen = new Set();
  while (pending.length) {
    const template = normalized(pending.pop());
    if (!template || seen.has(template)) continue;
    if (template === normalized(baseTemplate)) return true;
    seen.add(template);
    pending.push(...(records.templateBases?.[template] ?? []));
  }
  return false;
}
function clientHarness(records = dataset(), { responseChange, failure, rejectTemplateProjection = true } = {}) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    componentPropsService: new ComponentPropsService(),
    graphQLClient: { async request(query, variables, fetchOptions) {
      const args = queryInputs(query);
      const kind = args.name.endsWith('Documents') ? 'documents' : 'products';
      calls.push({ query, args, kind, variables, fetchOptions });
      if (failure) throw failure;
      // Native children filters inherited base-template membership before counting/pagination.
      const rows = records[kind].filter((row) => normalized(row.parent?.id) === normalized(args.root.path)
        && row.language === args.root.language && row.latestVersion
        && (args.includeTemplateIDs === undefined || nativeTemplateMatches(records, row, args.includeTemplateIDs)));
      const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
      const root = records.roots.find((item) => normalized(item.id) === normalized(args.root.path));
      const page = rows.slice(offset, offset + args.first);
      const response = { root: root && { ...root, children: { total: rows.length, results: page.map(projectedChild),
        pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } } };
      let templateField;
      visit(parse(query), { Field(node) { if (node.name.value === 'template') templateField = node; } });
      if (rejectTemplateProjection && templateField) {
        response.root.children.results.forEach((item) => { item.template = null; });
        throw new ClientError({ status: 200, headers: new Headers({ 'content-type': 'application/json' }), data: response,
          errors: page.map((_, index) => ({ message: 'Template identity resolution failed.',
            locations: [{ line: templateField.loc.startToken.line, column: templateField.loc.startToken.column }],
            path: ['root', 'children', 'results', index, 'template'],
          })) }, { query });
      }
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

test('document transport failures carry only fixed stage, classification and numeric status', async () => {
  const privateText = 'synthetic-private-document-credentials';
  const failure = Object.assign(new Error(privateText), {
    request: { url: privateText, query: privateText, headers: { Authorization: privateText } },
    response: { status: 400, errors: [{ message: `Unknown argument "${privateText}" on field "children".` }] },
  });
  for (const kind of ['documents', 'products']) {
    const { collection, props } = await fetchCollection(kind, dataset(), { failure });
    assertUnavailable(collection);
    assert.equal(collection.failureStage, 'children-request');
    assert.equal(collection.failureKind, 'graphql-validation');
    assert.equal(collection.httpStatus, 400);
    assert.deepEqual(Object.keys(collection).sort(), ['items', 'complete', 'status', 'error', 'failureStage', 'failureKind', 'httpStatus', ...diagnosticKeys].sort());
    assert.doesNotMatch(JSON.stringify(props), /synthetic-private|Authorization|\"(?:request|response|query|headers|url|stack)\"/);
  }
  const records = dataset();
  records.products[0].prospectusDirectoryGroup = field('invalid');
  const selected = (await fetchCollection('products', records)).collection;
  assert.equal(selected.failureStage, 'selection-validation');
  assert.equal(selected.failureKind, 'unknown');
  const validation = (await fetchCollection('documents', dataset(), { responseChange(response) { delete response.root.children.total; return response; } })).collection;
  assert.equal(validation.failureStage, 'children-validation');
  assert.equal(validation.failureKind, 'unknown');
});

test('child request failures expose their AST field category while preserving fail-closed collections', async () => {
  const { ClientError } = require('graphql-request');
  const secret = 'never-return-private-child-response';
  for (const kind of ['documents', 'products']) {
    const current = { language: 'en', routeId, rootId: kind === 'documents' ? rootId : routeId };
    const query = data.buildDocumentQuery(kind, current);
    const offset = query.indexOf('children('), prefix = query.slice(0, offset).split('\n');
    const location = { line: prefix.length, column: prefix.at(-1).length + 1 };
    const failure = new ClientError({ status: 200, headers: new Headers({ 'content-type': 'application/json' }), errors: [{
      message: `Unknown argument "${secret}" on field "children".`, extensions: { code: 'UNKNOWN_ARGUMENT', private: secret },
      locations: [location], path: ['root', 'children'],
    }] }, { query: secret, variables: { token: secret } });
    const { collection, props, calls } = await fetchCollection(kind, dataset(), { failure });
    assertUnavailable(collection);
    assert.equal(collection.failureStage, 'children-request');
    assert.equal(collection.responseFormat, 'json');
    assert.equal(collection.envelope, 'object-errors');
    assert.equal(collection.dataShape, 'absent');
    assert.equal(collection.graphqlErrorCount, 1);
    assert.deepEqual(collection.errorSummaries, [{ code: 'UNKNOWN_ARGUMENT', signature: 'unknown-argument', fieldCategory: 'children-connection' }]);
    assert.equal(calls.length, 1);
    assert.doesNotMatch(JSON.stringify(props), /never-return-private|\"(?:request|response|query|headers|variables)\"\s*:/);
  }
});

test('installed SDK rejects template projection with HTTP 200 errors and partial data, while filtered queries complete', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(), { client, calls } = clientHarness(records);
    const backend = client.graphQLClient;
    client.graphQLClient = new GraphQLRequestClient('https://synthetic-edge.invalid/graphql', {
      retries: 0, debugger: () => {},
      fetch: async (_url, options) => {
        const { query, variables } = JSON.parse(options.body);
        let envelope;
        try { envelope = { data: await backend.request(query, variables) }; }
        catch (error) {
          if (!(error instanceof ClientError)) throw error;
          envelope = { data: error.response.data, errors: error.response.errors };
        }
        return new Response(JSON.stringify(envelope), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    const scope = { language: 'en', routeId, rootId: kind === 'documents' ? rootId : routeId };
    const legacyProjection = (query) => query.replace(/includeTemplateIDs: "[^"]+", /, '')
      .replace('id name parent { id }', 'id name template { id } parent { id }');
    const legacyQuery = legacyProjection(data.buildDocumentQuery(kind, scope));
    await assert.rejects(client.getData(legacyQuery), (error) => {
      assert.ok(error instanceof ClientError);
      assert.equal(error.response.status, 200);
      assert.equal(error.response.errors.length, 10);
      assert.equal(error.response.data.root.children.results.length, 10);
      assert.ok(error.response.data.root.children.results.every((item) => item.template === null));
      const diagnostic = classifyQueryFailure(error, legacyQuery);
      assert.equal(diagnostic.errorSummaries.length, 8);
      assert.ok(diagnostic.errorSummaries.every((summary) => summary.fieldCategory === 'template-identity'));
      return true;
    });
    const page = layout({ renderings: [rendering(kind)] });
    const failed = await client.getComponentData(page, {}, enrichDocumentComponentMap(componentMap(),
      { getData: (query, variables, fetchOptions) => client.getData(legacyProjection(query), variables, fetchOptions) }));
    const collection = failed[kind][collectionName(kind)];
    assertUnavailable(collection);
    assert.equal(collection.failureStage, 'children-request');
    assert.equal(collection.httpStatus, 200);
    assert.equal(collection.responseFormat, 'json');
    assert.equal(collection.envelope, 'object-errors');
    assert.equal(collection.dataShape, 'object');
    assert.equal(collection.graphqlErrorCount, 10);
    assert.equal(collection.errorSummaries.length, 8);
    const corrected = await client.getComponentData(page, {}, enrichDocumentComponentMap(componentMap(),
      { getData: client.getData.bind(client) }));
    assert.deepEqual(corrected[kind][collectionName(kind)], ready(records[kind]));
    const correctedCalls = calls.slice(2);
    assert.deepEqual(correctedCalls.map((call) => call.args.after), [undefined, '10', '20']);
    assert.ok(correctedCalls.every((call) => call.args.includeTemplateIDs === normalized(kind === 'documents'
      ? data.DOCUMENT_ROW_TEMPLATE_ID : data.PROSPECTUS_PAGE_TEMPLATE_ID)));
    assert.ok(corrected[kind][collectionName(kind)].items.every((item) => !('template' in item)));
  }
});

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

test('queries filter native item children by base template and context language without template projection or sorting', async () => {
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
    const expectedResults = { id: true, name: true, parent: { id: true },
      ...(kind === 'documents'
        ? { documentLink: { jsonValue: true }, contractNote: { jsonValue: true }, revisionDate: { jsonValue: true }, fileSize: { jsonValue: true } }
        : { path: true, url: { path: true }, prospectusDirectoryTitle: { jsonValue: true }, prospectusDirectoryGroup: { jsonValue: true } }) };
    assert.deepEqual(projection(selections[0]), { id: true, path: true, url: { path: true }, parent: { parent: { id: true } },
      children: { total: true, pageInfo: { hasNext: true, endCursor: true }, results: expectedResults } });
    const children = selections[0].selectionSet.selections.find((selection) => selection.name.value === 'children');
    assert.deepEqual(children.arguments.map((argument) => argument.name.value), ['includeTemplateIDs', 'first']);
    assert.equal(calls[0].args.includeTemplateIDs, normalized(kind === 'documents'
      ? data.DOCUMENT_ROW_TEMPLATE_ID : data.PROSPECTUS_PAGE_TEMPLATE_ID));
    const resultFields = children.selectionSet.selections.find((selection) => selection.name.value === 'results').selectionSet.selections;
    for (const selection of resultFields.filter((selection) => selection.alias)) {
      assert.equal(selection.name.value, 'field');
      assert.deepEqual(selection.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', selection.alias.value]]);
    }
    assert.doesNotMatch(calls[0].query, /search|selectedProducts|selectedDocuments|_path|sortOrder|__Sortorder|orderBy|_templates|_parent|_latestversion|\btemplate\s*\{/);
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

test('native base-template filtering includes multiple and nested derived templates in order across every filtered page', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(23), make = kind === 'documents' ? document : product;
    const owner = kind === 'documents' ? records.roots[1] : records.roots[0];
    const base = kind === 'documents' ? data.DOCUMENT_ROW_TEMPLATE_ID : data.PROSPECTUS_PAGE_TEMPLATE_ID;
    const otherBase = kind === 'documents' ? data.PROSPECTUS_PAGE_TEMPLATE_ID : data.DOCUMENT_ROW_TEMPLATE_ID;
    const templates = [base, id(900), id(901), id(902), id(903)];
    records.templateBases = {
      [normalized(id(900))]: [base], [normalized(id(901))]: [base],
      [normalized(id(902))]: [id(900)], [normalized(id(903))]: [id(999), id(902)],
      [normalized(id(904))]: [otherBase],
    };
    records[kind].reverse().forEach((item, i) => {
      item.template = { id: templates[i % templates.length] };
    });
    const expected = [...records[kind]];
    records[kind] = expected.flatMap((item, i) => {
      const unrelated = make(1000 + i, owner, { template: { id: i % 2 ? id(999) : id(904) } });
      if (kind === 'products') {
        // Unrelated native children need no valid public URL or directory metadata.
        delete unrelated.path;
        delete unrelated.url;
        delete unrelated.prospectusDirectoryTitle;
        unrelated.prospectusDirectoryGroup = field('not-a-directory-page');
      }
      return [item, unrelated];
    });
    records[kind].push(make(2000, owner, { template: { id: id(903) }, parent: { id: id(998) } }),
      make(2001, owner, { template: { id: id(902) }, parent: { id: expected[0].id } }),
      make(2002, owner, { template: { id: id(901) }, language: 'fr' }),
      make(2003, owner, { template: { id: id(900) }, latestVersion: false }));
    const totals = [], pageSizes = [];
    const { collection, calls } = await fetchCollection(kind, records, { responseChange(response) {
      totals.push(response.root.children.total);
      pageSizes.push(response.root.children.results.length);
      return response;
    } });
    assert.deepEqual(collection, ready(expected));
    assert.deepEqual(calls.map((call) => call.args.after), [undefined, '10', '20']);
    assert.ok(calls.every((call) => call.args.includeTemplateIDs === normalized(base)));
    assert.deepEqual(totals, [expected.length, expected.length, expected.length]);
    assert.deepEqual(pageSizes, [10, 10, 3]);
    assert.deepEqual(collection.items.map((item) => item.id), expected.map((item) => item.id));
    assert.equal(collection.items.at(-1).id, expected.at(-1).id);
  }
});

test('nonmatching children are excluded from native totals and every filtered cursor page remains required', async () => {
  for (const kind of ['documents', 'products']) {
    const records = dataset(43);
    records[kind].forEach((item, i) => { if (i < 20) item.template = { id: id(999) }; });
    const result = await fetchCollection(kind, records);
    assert.deepEqual(result.collection, ready(records[kind].slice(20)));
    assert.equal(result.calls.length, 3);
    const missingFinal = await fetchCollection(kind, records, { responseChange: (response, args) => {
      if (args.after === '20') response.root.children.results.pop();
      return response;
    } });
    assertUnavailable(missingFinal.collection);
    records[kind].forEach((item) => { item.template = { id: id(999) }; });
    const noMatches = await fetchCollection(kind, records);
    assert.deepEqual(noMatches.collection, ready());
    assert.equal(noMatches.calls.length, 1);
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
      assertUnavailable((await fetchCollection('products', records)).collection);
    });
  }
  for (const title of [undefined, field(null), field(42)]) {
    const records = dataset(2);
    records.products[1].prospectusDirectoryTitle = title;
    assertUnavailable((await fetchCollection('products', records)).collection);
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
  assertUnavailable(wrongRoute.documents.automaticDocuments, 'a document root from another route cannot reuse cached data');
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
    ['documents', 'missing direct child parent', (response) => { delete response.root.children.results[0].parent; }],
    ['products', 'foreign direct child', (response) => { response.root.children.results[0].parent.id = id(999); }],
    ['products', 'missing direct child parent', (response) => { delete response.root.children.results[0].parent; }],
    ['products', 'missing content path', (response) => { delete response.root.children.results[0].path; }],
    ['products', 'missing public URL', (response) => { delete response.root.children.results[0].url; }],
    ['products', 'missing route URL', (response) => { delete response.root.url; }],
    ['products', 'nested content path', (response) => { response.root.children.results[0].path += '/grandchild'; }],
    ['products', 'sibling content path', (response) => { response.root.children.results[0].path = `${response.root.path}-other/product`; }],
    ['products', 'nested public URL', (response) => { response.root.children.results[0].url.path += '/grandchild'; }],
    ['products', 'sibling public URL', (response) => { response.root.children.results[0].url.path = `${response.root.url.path}-other/product`; }],
    ['products', 'protocol-relative public URL', (response) => { response.root.children.results[0].url.path = '//example.com/product'; }],
    ['products', 'unsafe route root', (response) => { response.root.url.path = '/account'; response.root.children.results[0].url.path = '/account/product'; }],
  ];
  for (const [kind, label, change] of scenarios) await t.test(`${kind}: ${label}`, async () => {
    const records = dataset(1), base = kind === 'documents' ? data.DOCUMENT_ROW_TEMPLATE_ID : data.PROSPECTUS_PAGE_TEMPLATE_ID;
    records.templateBases = { [normalized(id(900))]: [base], [normalized(id(901))]: [id(900)] };
    records[kind][0].template = { id: id(901) };
    const { collection } = await fetchCollection(kind, records, { responseChange: (response) => { change(response); return response; } });
    assertUnavailable(collection);
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
  ];
  for (const kind of ['documents', 'products']) {
    for (const [label, change, onlyKind] of scenarios) {
      if (onlyKind && onlyKind !== kind) continue;
      await t.test(`${kind}: ${label}`, async () => {
        const { collection, calls } = await fetchCollection(kind, dataset(), {
          responseChange: (response, args) => { change(response, args); return response; },
        });
        assertUnavailable(collection);
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
      assertUnavailable(collection);
      assert.doesNotMatch(JSON.stringify(props) + readHookProps(props, kind), /synthetic-secret|endpoint-internal|stack/);
    }
    assert.equal((await fetchCollection(kind)).collection.complete, true);
  }
});
