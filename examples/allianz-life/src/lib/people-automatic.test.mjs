import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { parse, visit, getLocation } = require('graphql');
const { ClientError } = require('graphql-request');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider, ComponentPropsService, ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only' || specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile());
      if (resolved) return load(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return compiled.exports;
}
const data = load(path.join(sourceRoot, 'lib/people-automatic-data.ts'));
const { enrichPeopleComponentMap } = load(path.join(sourceRoot, 'lib/people-automatic-server.ts'));
const ExecutiveDirectory = load(path.join(sourceRoot, 'components/executive-directory/ExecutiveDirectory.tsx')).Default;
const ExpertDirectory = load(path.join(sourceRoot, 'components/expert-directory/ExpertDirectory.tsx')).Default;
const contract = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'components/executive-directory/__tests__/directory-source-contract.json'), 'utf8'));
const id = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const diagnosticKeys = ['responseFormat', 'envelope', 'dataShape', 'graphqlErrorCount', 'countTruncated', 'errorSummaries'];
function assertResponseDiagnostic(value) {
  assert.ok(['json', 'text', 'other', 'unknown'].includes(value.responseFormat));
  assert.ok(['object-errors', 'string-json-errors', 'text-body', 'missing-data', 'other'].includes(value.envelope));
  assert.ok(['absent', 'null', 'object', 'array', 'scalar'].includes(value.dataShape));
  assert.ok(Number.isInteger(value.graphqlErrorCount) && value.graphqlErrorCount >= 0 && value.graphqlErrorCount <= 32);
  assert.equal(typeof value.countTruncated, 'boolean');
  assert.ok(Array.isArray(value.errorSummaries) && value.errorSummaries.length <= 8);
  for (const summary of value.errorSummaries) assert.deepEqual(Object.keys(summary).sort(), ['code', 'signature', 'fieldCategory'].sort());
}
const field = (value, name = 'heading', itemId = id(2), fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: { fieldType, fieldId: `test-${name}`, itemId } } });
const scope = (kind = 'executives', language = 'en') => ({ kind, language, rootId: id(1), datasourceId: id(2) });
function dataset(kind = 'experts') {
  const current = scope(kind), definition = data.PEOPLE_DIRECTORY_CONTRACTS[kind];
  const root = { id: current.rootId, path: `/sitecore/content/allianz/allianz-life/Home${definition.url}`, url: { path: definition.url } };
  const datasource = { id: current.datasourceId, template: { id: definition.directoryTemplateId, name: definition.directoryTemplate }, parent: { name: 'Data', parent: { id: root.id } } };
  const categories = kind === 'experts' ? contract.categories.map((category, i) => ({ id: id(100 + i), heading: field(category.heading.jsonValue.value, `category-${i}`, id(100 + i)), introduction: field(category.introduction.jsonValue.value, `introduction-${i}`, id(100 + i), 'Rich Text'),
    sortOrder: { jsonValue: { value: category.sortOrder } }, template: { id: data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID, name: 'ExpertDirectoryCategory' }, parent: { id: datasource.id }, key: category.key })) : [];
  const biographies = contract[kind].map((row) => ({ id: row.datasourceId, template: row.datasourceId === 'cfda4244-202d-4c67-bc42-2451a05d3f20'
    ? { id: 'a687b00f-291f-45b7-930a-ed4d2a8f164b', baseTemplateIds: [definition.templateId] }
    : { id: definition.templateId, baseTemplateIds: [] }, ...structuredClone(row.sourceFields),
    directoryOrder: field(row.directoryOrder), directorySummary: row.directorySummary,
    directoryCategory: { targetItem: categories.find((category) => category.key === row.categoryKey) },
    parent: { name: 'Data', parent: { id: row.pageId, path: `/sitecore/content/allianz/allianz-life/Home${row.route}`, url: { path: row.route },
      template: { id: data.BIOGRAPHY_PAGE_TEMPLATE_ID }, parent: { id: root.id } } },
  }));
  return { current, root, datasource, categories, biographies };
}
// The fake native index models _templates membership, including transitive base IDs.
function indexedTemplateMatches(row, baseTemplateId) {
  return [row.template?.id, ...(row.template?.baseTemplateIds ?? [])].some((id) =>
    data.normalizePeopleId(id) === data.normalizePeopleId(baseTemplateId));
}
function nativeBiographyProjection(row) {
  const { template: _template, ...fields } = row;
  const owner = row.parent?.parent;
  const { template: _ownerTemplate, ...page } = owner ?? {};
  return { ...fields, ownerPages: owner && indexedTemplateMatches(owner, data.BIOGRAPHY_PAGE_TEMPLATE_ID) ? [{ id: owner.id }] : [],
    parent: row.parent ? { ...row.parent, parent: owner ? page : undefined } : undefined };
}
function nativeProjection(kind, row) {
  if (kind === 'biographies') return nativeBiographyProjection(row);
  const { template: _template, ...fields } = row;
  return fields;
}
function fixtureSearchResult(current, kind, rows) {
  const baseTemplateId = kind === 'biographies' ? data.PEOPLE_DIRECTORY_CONTRACTS[current.kind].templateId : data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID;
  return { items: rows.filter((row) => indexedTemplateMatches(row, baseTemplateId)).map((row) => nativeProjection(kind, row)), complete: true, queryKind: kind, baseTemplateId, scope: current };
}
function selectFixtureDirectory(current, biographies, categories) {
  return data.selectPeopleDirectory(current, fixtureSearchResult(current, 'biographies', biographies),
    categories ? fixtureSearchResult(current, 'categories', categories) : undefined);
}
function queryArgs(query) {
  const operation = parse(query).definitions[0], selection = operation.selectionSet.selections[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { name: operation.name.value, args: Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])) };
}
function harness(records, change, { rejectTemplateProjection = false } = {}) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), { componentPropsService: new ComponentPropsService(), graphQLClient: {
    async request(query, variables, fetchOptions) {
      const { name, args } = queryArgs(query); calls.push({ name, args, variables, fetchOptions });
      if (rejectTemplateProjection) {
        const nodes = []; visit(parse(query), { Field(node) { if (node.name.value === 'template') nodes.push(node); } });
        if (nodes.length) throw new ClientError({ status: 200, headers: new Headers({ 'content-type': 'application/json' }),
          data: { root: records.root, datasource: records.datasource }, errors: nodes.map((node) => ({
            message: 'Template identity resolver failed', locations: [getLocation(node.loc.source, node.loc.start)],
          })) }, { query, variables });
      }
      if (name === 'AutomaticPeopleScope') return change ? change({ root: records.root, datasource: records.datasource }, name, args) : { root: records.root, datasource: records.datasource };
      const kind = name === 'AutomaticPeopleBiographies' ? 'biographies' : 'categories';
      const source = kind === 'biographies' ? records.biographies : records.categories;
      const predicate = args.where.AND.find((filter) => filter.name === '_templates');
      assert.equal(predicate.operator, 'CONTAINS');
      const rows = source.filter((row) => indexedTemplateMatches(row, predicate.value)).map((row) => nativeProjection(kind, row));
      const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
      const response = { search: { total: rows.length, results: rows.slice(offset, offset + args.first), pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } };
      return change ? change(response, name, args) : response;
    },
  } });
  return { client, calls };
}
function layout(kind = 'experts', overrides = {}, repeat = false) {
  const name = kind === 'experts' ? 'ExpertDirectory' : 'ExecutiveDirectory';
  const rendering = { componentName: name, dataSource: id(2), uid: 'directory', fields: { data: { datasource: { id: id(2) } } } };
  return { sitecore: { context: { language: 'en', site: { name: 'allianz-life' }, ...overrides }, route: { itemId: id(1), fields: {}, placeholders: { 'headless-main': [rendering, ...(repeat ? [{ ...rendering, uid: 'repeat' }] : [])] } } } };
}
function componentMap(dynamic = false) {
  return new Map([['ExecutiveDirectory', { Default: ExecutiveDirectory, componentType: 'client' }], ['ExpertDirectory', dynamic ? { dynamicModule: async () => ({ Default: ExpertDirectory }), componentType: 'client' } : { Default: ExpertDirectory, componentType: 'client' }]]);
}
function render(Component, componentProps, datasource, editing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life', layout: layout() },
    api: {}, componentMap: componentMap(), loadImportMap: async () => ({}),
  }, React.createElement(ComponentPropsContext, { value: { directory: { automaticPeople: componentProps } } },
    React.createElement(Component, { rendering: { uid: 'directory' }, params: {}, fields: { data: { datasource } } }))));
}

test('recovered source/native crosswalk retains 8 executives in source order, 29 experts and all 6 editable topics', () => {
  assert.equal(contract.executives.length, 8); assert.equal(contract.experts.length, 29); assert.equal(contract.categories.length, 6);
  assert.deepEqual(contract.executives.map((row) => row.route.split('/').pop()), ['jasmine-jirele', 'adam-brown', 'gretchen-cepek', 'luca-gallo', 'bill-gaumond', 'jenny-guldseth', 'jean-roch-sibille', 'eric-thomes']);
  const records = dataset(), actual = selectFixtureDirectory(records.current, records.biographies.reverse(), records.categories.reverse());
  assert.deepEqual(actual.groups.map((group) => group.heading.jsonValue.value), contract.categories.map((category) => category.heading.jsonValue.value));
  assert.deepEqual(actual.groups.flatMap((group) => group.items.map((row) => row.href)), contract.experts.map((row) => row.route));
  assert.equal(actual.unassigned.length, 0);
  assert.deepEqual(actual.items.filter((person) => !person.portrait.jsonValue.value.src).map((person) => person.href).sort(), contract.experts.filter((row) => row.portraitIntentionallyAbsent).map((row) => row.route).sort());
});

test('captured inherited executive identity renders among all eight without a subtype-specific production rule', async () => {
  const records = dataset('executives');
  const linked = records.biographies.find((row) => row.id === 'cfda4244-202d-4c67-bc42-2451a05d3f20');
  assert.equal(linked.template.id, 'a687b00f-291f-45b7-930a-ed4d2a8f164b');
  assert.deepEqual(linked.template.baseTemplateIds, ['0fc2896e-316f-45fb-83ef-5fe7773cc31b']);
  assert.equal(records.biographies.filter((row) => row.template.id === data.PEOPLE_DIRECTORY_CONTRACTS.executives.templateId).length, 7);
  const { client } = harness(records);
  const output = await client.getComponentData(layout('executives'), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  const result = output.directory.automaticPeople;
  assert.deepEqual(result.items.map((person) => person.href), contract.executives.map((row) => row.route));
  assert.equal(result.items.length, 8);
  assert.equal(result.items[3].name, linked.name);
  assert.equal(result.items[3].role, linked.role);
  assert.equal(result.items[3].portrait, linked.portrait);
  assert.equal(result.missingOrder, 0);
});

test('multiple and nested native template descendants remain automatic for executives and experts', async () => {
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind), base = data.PEOPLE_DIRECTORY_CONTRACTS[kind].templateId;
    const nativeTemplateChain = [base, id(501), id(502), id(503)];
    for (let i = 0; i < 3; i++) {
      records.biographies[i].template = { id: nativeTemplateChain[i + 1], baseTemplateIds: nativeTemplateChain.slice(0, i + 1) };
    }
    const { client, calls } = harness(records);
    const output = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(true), { getData: client.getData.bind(client) }));
    assert.equal(output.directory.automaticPeople.items.length, kind === 'executives' ? 8 : 29);
    const actual = output.directory.automaticPeople;
    const ordered = kind === 'experts' ? actual.groups.flatMap((group) => group.items) : actual.items;
    assert.deepEqual(ordered.map((item) => item.href), contract[kind].map((item) => item.route));
    const inheritedReads = calls.filter((call) => call.name === 'AutomaticPeopleBiographies');
    assert.ok(inheritedReads.every((call) => call.args.where.AND.some((filter) => filter.name === '_templates' &&
      filter.value === data.normalizePeopleId(base) && filter.operator === 'CONTAINS')));
    assert.equal(inheritedReads.length, kind === 'executives' ? 1 : 3);
  }
});

test('native inherited filtering excludes unrelated templates and independent owner guards exclude misplaced descendants', async () => {
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind), base = data.PEOPLE_DIRECTORY_CONTRACTS[kind].templateId;
    const unrelated = structuredClone(records.biographies[0]); unrelated.id = id(601);
    unrelated.template = { id: id(602), name: kind === 'executives' ? 'ExecutiveBiography' : 'ExpertBiography', baseTemplateIds: [id(603)] };
    const misplaced = structuredClone(records.biographies[0]); misplaced.id = id(604);
    misplaced.template = { id: id(605), baseTemplateIds: [base, id(606)] };
    misplaced.parent.parent.parent.id = id(607);
    records.biographies.push(unrelated, misplaced);
    const { client } = harness(records);
    const output = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(output.directory.automaticPeople.items.length, kind === 'executives' ? 8 : 29);
    assert.ok(output.directory.automaticPeople.items.every((row) => row.id !== unrelated.id && row.id !== misplaced.id));
  }
});

test('expert categories follow the same inherited native search while retaining their owning datasource boundary', async () => {
  const records = dataset('experts'), base = data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID;
  records.categories[0].template = { id: id(801), baseTemplateIds: [base] };
  records.categories[1].template = { id: id(802), baseTemplateIds: [base, id(801)] };
  const unrelated = structuredClone(records.categories[0]); unrelated.id = id(803);
  unrelated.template = { id: id(804), name: 'ExpertDirectoryCategory', baseTemplateIds: [] };
  const misplaced = structuredClone(records.categories[1]); misplaced.id = id(805); misplaced.parent.id = id(806);
  records.categories.push(unrelated, misplaced);
  const { client } = harness(records);
  const output = await client.getComponentData(layout('experts'), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  const actual = output.directory.automaticPeople;
  assert.equal(actual.groups.length, 6);
  assert.deepEqual(actual.groups.map((group) => group.heading.jsonValue.value), contract.categories.map((category) => category.heading.jsonValue.value));
  assert.deepEqual(actual.groups.flatMap((group) => group.items.map((person) => person.href)), contract.experts.map((person) => person.route));
});

test('directory selection requires complete inherited-search provenance for the same base, route and locale', () => {
  const records = dataset('executives'), valid = fixtureSearchResult(records.current, 'biographies', records.biographies);
  assert.throws(() => data.selectPeopleDirectory(records.current, records.biographies), /provenance/);
  for (const mutate of [(result) => { result.complete = false; }, (result) => { result.queryKind = 'categories'; },
    (result) => { result.baseTemplateId = id(701); }, (result) => { result.scope.rootId = id(702); },
    (result) => { result.scope.datasourceId = id(703); }, (result) => { result.scope.language = 'de'; },
    (result) => { result.scope.kind = 'experts'; }]) {
    const invalid = structuredClone(valid); mutate(invalid);
    assert.throws(() => data.selectPeopleDirectory(records.current, invalid), /provenance/);
  }
});

test('real SDK getComponentData paginates 29 biographies and scopes draft credentials/language without serializing them', async () => {
  const records = dataset(), { client, calls } = harness(records), original = componentMap(true);
  const fetchOptions = { headers: { Authorization: 'synthetic-preview-token', sc_previewMode: 'true', sc_site: 'allianz-life' } };
  const enriched = enrichPeopleComponentMap(original, { getData: client.getData.bind(client), fetchOptions });
  const page = layout('experts', { language: 'en-GB' }, true), authored = page.sitecore.route.placeholders['headless-main'][0].fields.data.datasource;
  const result = await client.getComponentData(page, {}, enriched);
  assert.equal(result.directory.automaticPeople.items.length, 29);
  assert.equal(result.directory.automaticPeople, result.repeat.automaticPeople);
  assert.equal(original.get('ExpertDirectory').getComponentServerProps, undefined);
  const biographyCalls = calls.filter((call) => call.name === 'AutomaticPeopleBiographies');
  assert.deepEqual(biographyCalls.map((call) => call.args.first), [10, 10, 10]);
  assert.deepEqual(biographyCalls.map((call) => call.args.after), [undefined, '10', '20']);
  assert.ok(calls.every((call) => call.fetchOptions === fetchOptions && call.variables === undefined));
  for (const call of calls.filter((entry) => entry.args.where)) assert.ok(call.args.where.AND.some((filter) => filter.name === '_language' && filter.value === 'en-GB'));
  assert.equal(page.sitecore.route.placeholders['headless-main'][0].fields.data.datasource, authored);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-preview-token|Authorization|fetchOptions/);
});

test('failed operations expose only a fixed stage marker without request, response or exception contents', async () => {
  const privateError = () => Object.assign(Error('synthetic-private-message'), {
    request: { headers: { Authorization: 'synthetic-private-authorization' } },
    response: { errors: [{ message: 'synthetic-private-response' }] },
  });
  const cases = [
    { kind: 'executives', expected: 'scope-request', mutate(response, name) { if (name === 'AutomaticPeopleScope') throw privateError(); return response; } },
    { kind: 'executives', expected: 'scope-validation', mutate(response, name) { if (name === 'AutomaticPeopleScope') response.root.url.path = {}; return response; } },
    { kind: 'executives', expected: 'biographies-request', mutate(response, name) { if (name === 'AutomaticPeopleBiographies') throw privateError(); return response; } },
    { kind: 'executives', expected: 'biographies-validation', mutate(response, name) { if (name === 'AutomaticPeopleBiographies') delete response.search.total; return response; } },
    { kind: 'experts', expected: 'categories-request', mutate(response, name) { if (name === 'AutomaticPeopleCategories') throw privateError(); return response; } },
    { kind: 'experts', expected: 'categories-validation', mutate(response, name) { if (name === 'AutomaticPeopleCategories') delete response.search.pageInfo; return response; } },
    { kind: 'executives', expected: 'selection-validation', mutate(response, name) { if (name === 'AutomaticPeopleBiographies') { response.search.results.push({ ...response.search.results[0], id: id(999) }); response.search.total++; } return response; } },
  ];
  for (const record of cases) {
    const { client, calls } = harness(dataset(record.kind), record.mutate);
    const result = await client.getComponentData(layout(record.kind), {}, enrichPeopleComponentMap(componentMap(true), { getData: client.getData.bind(client), fetchOptions: { headers: { Authorization: 'synthetic-private-authorization' } } }));
    const output = result.directory.automaticPeople;
    assert.equal(output.complete, false);
    assert.equal(output.error, 'unavailable');
    assert.equal(output.failureStage, record.expected);
    assert.equal(output.failureKind, 'unknown');
    assert.deepEqual(Object.keys(output).sort(), ['complete', 'error', 'failureStage', 'failureKind', 'groups', 'items', 'status', 'unassigned', ...diagnosticKeys].sort());
    assertResponseDiagnostic(output);
    assert.deepEqual(output.items, []);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-private|Authorization|\"(?:request|response|stack|query|headers)\"\s*:/);
    if (record.expected.startsWith('categories')) {
      assert.ok(calls.some((call) => call.name === 'AutomaticPeopleBiographies'));
    }
  }
  const success = harness(dataset('executives'));
  const complete = await success.client.getComponentData(layout('executives'), {}, enrichPeopleComponentMap(componentMap(), { getData: success.client.getData.bind(success.client) }));
  assert.equal(complete.directory.automaticPeople.items.length, 8);
  assert.equal(Object.hasOwn(complete.directory.automaticPeople, 'failureStage'), false);
  const invalid = harness(dataset('executives'), (response, name) => { if (name === 'AutomaticPeopleScope') response.datasource.parent.parent.id = id(999); return response; });
  const rejected = await invalid.client.getComponentData(layout('executives'), {}, enrichPeopleComponentMap(componentMap(), { getData: invalid.client.getData.bind(invalid.client) }));
  assert.equal(rejected.directory.automaticPeople.error, 'invalid-scope');
  assert.equal(Object.hasOwn(rejected.directory.automaticPeople, 'failureStage'), false);
});

test('scope transport failures expose fixed GraphQL classification and numeric status through the real SDK', async () => {
  const secret = 'synthetic-private-context-and-query';
  const privateError = Object.assign(new Error(secret), { request: { query: secret, headers: { 'x-sitecore-contextid': secret } },
    response: { status: 400, errors: [{ message: `Cannot query field "private-field-${secret}" on type "Item".` }], headers: { Authorization: secret } } });
  const records = dataset('executives');
  const { client, calls } = harness(records, (response, name) => { if (name === 'AutomaticPeopleScope') throw privateError; return response; });
  const result = await client.getComponentData(layout('executives'), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  const output = result.directory.automaticPeople;
  assert.equal(output.failureStage, 'scope-request');
  assert.equal(output.failureKind, 'graphql-validation');
  assert.equal(output.httpStatus, 400);
  assert.equal(output.complete, false);
  assert.deepEqual(output.items, []);
  assert.equal(calls.length, 1);
  assertResponseDiagnostic(output);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private|private-field|Authorization|x-sitecore-contextid|\"(?:request|response|query|headers|stack)\"/);
});

test('scope failure metadata distinguishes text-encoded validation from a missing data envelope', async () => {
  const { ClientError } = require('graphql-request');
  const records = dataset('executives');
  const query = data.buildPeopleScopeQuery(records.current);
  const offset = query.indexOf('parent');
  const prefix = query.slice(0, offset).split('\n');
  const location = { line: prefix.length, column: prefix.at(-1).length + 1 };
  const secret = 'never-return-private-response-or-request';
  const cases = [
    { response: { status: 200, headers: new Headers({ 'content-type': 'text/plain' }), error: JSON.stringify({ errors: [
      { message: `Field "parent" argument "required" of type "String!" is required, but it was not provided. ${secret}`,
        extensions: { code: 'PROVIDED_REQUIRED_ARGUMENTS', privateToken: secret }, locations: [location] },
    ] }) }, envelope: 'string-json-errors', format: 'text', count: 1, shape: 'absent' },
    { response: { status: 200, headers: new Headers({ 'content-type': 'application/json' }), data: null },
      envelope: 'missing-data', format: 'json', count: 0, shape: 'null' },
  ];
  for (const record of cases) {
    const error = new ClientError(record.response, { query: secret, variables: { context: secret } });
    const { client, calls } = harness(records, (response, name) => { if (name === 'AutomaticPeopleScope') throw error; return response; });
    const props = await client.getComponentData(layout('executives'), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    const value = props.directory.automaticPeople;
    assertResponseDiagnostic(value);
    assert.equal(value.failureStage, 'scope-request');
    assert.equal(value.envelope, record.envelope);
    assert.equal(value.responseFormat, record.format);
    assert.equal(value.dataShape, record.shape);
    assert.equal(value.graphqlErrorCount, record.count);
    assert.equal(value.httpStatus, 200);
    assert.deepEqual(value.items, []);
    assert.equal(calls.length, 1);
    if (record.count) assert.deepEqual(value.errorSummaries, [{ code: 'PROVIDED_REQUIRED_ARGUMENTS', signature: 'required-argument', fieldCategory: 'parent-traversal' }]);
    assert.doesNotMatch(JSON.stringify(props), /never-return-private|privateToken|\"(?:request|response|query|headers|variables)\"\s*:/);
  }
});

test('ten-item biography requests retain every executive and expert field through complete pagination', async () => {
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind), { client, calls } = harness(records, (response, name, args) => {
      if (name === 'AutomaticPeopleBiographies') assert.equal(args.first, 10);
      if (name === 'AutomaticPeopleCategories') assert.equal(args.first, 20);
      return response;
    });
    const result = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(true), { getData: client.getData.bind(client) }));
    const actual = result.directory.automaticPeople;
    assert.equal(actual.complete, true);
    assert.equal(Object.hasOwn(actual, 'failureStage'), false);
    assert.deepEqual(actual.items, selectFixtureDirectory(records.current, records.biographies, records.categories).items);
    assert.equal(actual.items.length, kind === 'executives' ? 8 : 29);
    assert.equal(calls.filter((call) => call.name === 'AutomaticPeopleBiographies').length, kind === 'executives' ? 1 : 3);
  }
});

test('an oversized biography page and a later request failure expose no partial profiles', async () => {
  const oversized = harness(dataset(), (response, name) => {
    if (name === 'AutomaticPeopleBiographies') response.search.results.push(dataset().biographies[10]);
    return response;
  });
  const invalid = await oversized.client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: oversized.client.getData.bind(oversized.client) }));
  assert.equal(invalid.directory.automaticPeople.failureStage, 'biographies-validation');
  assert.deepEqual(invalid.directory.automaticPeople.items, []);
  const later = harness(dataset(), (response, name, args) => {
    if (name === 'AutomaticPeopleBiographies' && args.after === '20') throw Error('synthetic-third-page-failure');
    return response;
  });
  const failed = await later.client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: later.client.getData.bind(later.client) }));
  assert.equal(failed.directory.automaticPeople.failureStage, 'biographies-request');
  assert.deepEqual(failed.directory.automaticPeople.items, []);
  assert.doesNotMatch(JSON.stringify(failed), /synthetic-third-page-failure/);
});

test('normal executive render derives canonical page links and untouched primary fields, with no substitute portrait', () => {
  const records = dataset('executives'), result = selectFixtureDirectory(records.current, records.biographies.reverse());
  assert.deepEqual(result.items.map((person) => person.href), contract.executives.map((row) => row.route));
  const html = render(ExecutiveDirectory, result, { id: id(2) });
  for (const row of contract.executives) {
    assert.ok(html.includes(`href="${row.route}"`));
    assert.ok(html.includes(row.sourceFields.role.jsonValue.value));
  }
  assert.equal((html.match(/<img\b/g) ?? []).length, 8);
  assert.match(html, /max-width:100%;height:auto/); assert.match(html, /alt=""/);
  assert.doesNotMatch(html, /data-sc-field/);
  assert.equal(result.items[0].name, records.biographies.find((row) => row.parent.parent.url.path.endsWith('jasmine-jirele')).name);
});

test('expert grouping preserves the exact editorial summaries, all portrait omissions and editable category/title metadata', () => {
  const records = dataset(), result = selectFixtureDirectory(records.current, records.biographies, records.categories);
  const original = JSON.stringify(result), datasource = { id: id(2) };
  const html = render(ExpertDirectory, result, datasource, true).replaceAll('&quot;', '"');
  for (let i = 0; i < 6; i++) assert.ok(html.includes(`"fieldId":"test-category-${i}"`));
  for (const row of contract.experts) assert.ok(html.includes(row.directorySummary.jsonValue.value));
  assert.equal((html.match(/<img\b/g) ?? []).length, 26);
  assert.equal(JSON.stringify(result), original);
  assert.doesNotMatch(html, /people-directory__link--stretched/);
  assert.doesNotMatch(render(ExpertDirectory, result, datasource), /<h2><\/h2>|Other experts/);
});

test('all six source category introductions are preserved exactly before their profile cards', () => {
  const recovered = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8'));
  const sections = recovered.routes['/about/subject-matter-experts'].components.filter((component) => component.componentName === 'AllianzCardGrid');
  assert.equal(sections.length, 6);
  const records = dataset(), result = selectFixtureDirectory(records.current, records.biographies, records.categories);
  const html = render(ExpertDirectory, result, { id: id(2) });
  for (let index = 0; index < 6; index++) {
    const expected = sections[index].fields.data.datasource.body.jsonValue.value;
    assert.ok(expected.startsWith('<p>') && expected.endsWith('</p>'));
    assert.equal(contract.categories[index].introduction.jsonValue.value, expected);
    assert.equal(result.groups[index].introduction, records.categories[index].introduction);
    assert.ok(html.includes(expected));
    const position = html.indexOf(expected);
    const heading = result.groups[index].heading.jsonValue.value.replaceAll('&', '&amp;');
    assert.ok(position > html.indexOf(heading));
    assert.ok(position < html.indexOf(`href="${result.groups[index].items[0].href}"`));
  }
  assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
});

test('real SDK preserves category introduction metadata and cleared-field authoring without root-heading prompts', () => {
  const records = dataset(), result = selectFixtureDirectory(records.current, records.biographies, records.categories);
  const obsoleteFields = { id: id(2), heading: field('Unused root heading', 'retired-root-heading'), unassignedHeading: field('Unused unassigned heading', 'retired-unassigned') };
  for (const group of result.groups) {
    const original = group.introduction.jsonValue;
    const normal = render(ExpertDirectory, result, obsoleteFields);
    assert.ok(normal.includes(original.value));
    const editing = render(ExpertDirectory, result, obsoleteFields, true).replaceAll('&quot;', '"');
    assert.ok(editing.includes(`"fieldId":"${original.metadata.fieldId}"`));
    assert.ok(editing.includes(`"itemId":"${original.metadata.itemId}"`));
    assert.doesNotMatch(editing, /retired-root-heading|retired-unassigned|Unused root heading|Unused unassigned heading/);
    group.introduction = { jsonValue: { ...original, value: '' } };
    const cleared = render(ExpertDirectory, result, { id: id(2) }, true).replaceAll('&quot;', '"');
    assert.ok(cleared.includes(`"fieldId":"${original.metadata.fieldId}"`));
    assert.ok(!render(ExpertDirectory, result, { id: id(2) }).includes(original.value));
    group.introduction = { jsonValue: original };
  }
  const executive = dataset('executives');
  const html = render(ExecutiveDirectory, selectFixtureDirectory(executive.current, executive.biographies), obsoleteFields, true);
  assert.doesNotMatch(html, /retired-root-heading|retired-unassigned|Unused root heading|Unused unassigned heading|<h2/);
});

test('new, moved, renamed and removed actual biography pages are reflected by the next request', async () => {
  const records = dataset('executives'), { client } = harness(records), page = layout('executives');
  const read = () => client.getComponentData(page, {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal((await read()).directory.automaticPeople.items.length, 8);
  const added = structuredClone(records.biographies[0]); added.id = id(901); added.parent.parent.id = id(902);
  added.parent.parent.url.path = '/about/executives/new-leader'; added.parent.parent.path = '/sitecore/content/allianz/allianz-life/Home/about/executives/new-leader';
  added.directoryOrder = field('900'); records.biographies.push(added);
  assert.ok((await read()).directory.automaticPeople.items.some((person) => person.href.endsWith('new-leader')));
  added.name = field('Changed person'); added.parent.parent.url.path = '/about/executives/renamed-leader';
  added.parent.parent.path = '/sitecore/content/allianz/allianz-life/Home/about/executives/renamed-leader';
  assert.ok((await read()).directory.automaticPeople.items.some((person) => person.href.endsWith('renamed-leader') && person.name.jsonValue.value === 'Changed person'));
  added.parent.parent.parent.id = id(999);
  assert.equal((await read()).directory.automaticPeople.items.length, 8);
  records.biographies.splice(0, 1);
  assert.equal((await read()).directory.automaticPeople.items.length, 7);
});

test('incomplete pagination, duplicate rows, changing totals and repeated cursors fail closed', async () => {
  for (const mutation of [
    (response) => { response.search.results = []; },
    (response) => { response.search.results.push(response.search.results[0]); },
    (response) => { response.search.total++; },
    (response) => { response.search.pageInfo = { hasNext: true, endCursor: '20' }; },
  ]) {
    const records = dataset(), { client } = harness(records, (response, name, args) => {
      if (name === 'AutomaticPeopleBiographies' && args.after) mutation(response); return response;
    });
    const result = await client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(result.directory.automaticPeople.complete, false); assert.deepEqual(result.directory.automaticPeople.items, []);
  }
});

test('category pagination completes beyond 20 and a category-page failure hides the whole collection', async () => {
  const records = dataset();
  records.categories.push(...Array.from({ length: 20 }, (_, index) => ({ id: id(300 + index), heading: field(`New category ${index}`),
    sortOrder: field(700 + index), template: { id: data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID, name: 'ExpertDirectoryCategory' }, parent: { id: records.datasource.id } })));
  const { client, calls } = harness(records);
  const result = await client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
  assert.equal(result.directory.automaticPeople.groups.length, 26);
  assert.equal(result.directory.automaticPeople.items.length, 29);
  assert.equal(calls.filter((call) => call.name === 'AutomaticPeopleCategories').length, 2);
  const failed = harness(records, (response, name, args) => {
    if (name === 'AutomaticPeopleCategories' && args.after) throw new Error('Transport failed');
    return response;
  });
  const unavailable = await failed.client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: failed.client.getData.bind(failed.client) }));
  assert.equal(unavailable.directory.automaticPeople.complete, false);
  assert.deepEqual(unavailable.directory.automaticPeople.items, []);
});

test('invalid site, locale, root URL, scope and datasource owner cannot read other directories', async () => {
  for (const overrides of [{ site: { name: 'unrelated' } }, { language: 'en" injection' }]) {
    const { client, calls } = harness(dataset());
    const result = await client.getComponentData(layout('experts', overrides), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(result.directory.automaticPeople.error, 'invalid-scope'); assert.equal(calls.length, 0);
  }
  for (const mutate of [(records) => { records.root.url.path = '/about/ventures'; }, (records) => { records.datasource.parent.parent.id = id(999); },
    (records) => { records.root.path = '/sitecore/content/other/Home/about/subject-matter-experts'; }, (records) => { records.datasource.id = id(999); }]) {
    const records = dataset(); mutate(records); const { client, calls } = harness(records);
    const result = await client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(result.directory.automaticPeople.error, 'invalid-scope'); assert.equal(calls.length, 1);
  }
});

test('native inherited filters survive renamed labels without returning virtual template metadata', async () => {
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind);
    records.datasource.template.name = 'Author-renamed directory label';
    records.datasource.template.id = `{${records.datasource.template.id.toUpperCase()}}`;
    for (const category of records.categories) {
      category.template.name = 'Author-renamed category label';
      category.template.id = data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID.replaceAll('-', '').toUpperCase();
    }
    const { client } = harness(records);
    const result = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(result.directory.automaticPeople.complete, true);
    assert.equal(result.directory.automaticPeople.items.length, kind === 'executives' ? 8 : 29);
    if (kind === 'experts') {
      assert.equal(result.directory.automaticPeople.groups.length, 6);
      assert.equal(result.directory.automaticPeople.groups[0].heading, records.categories[0].heading);
      assert.equal(result.directory.automaticPeople.items.find((person) => person.id === records.biographies[0].id).directorySummary, records.biographies[0].directorySummary);
      records.categories[0].template = { id: id(999), name: 'ExpertDirectoryCategory' };
      const selected = selectFixtureDirectory(records.current, records.biographies, records.categories);
      assert.equal(selected.groups.length, 5);
      assert.equal(selected.unassigned.length, 4);
      assert.equal(selected.items.length, 29);
    }
    delete records.datasource.template;
    assert.equal(data.validPeopleScope(records.current, records), true, 'the native rendering supplies its configured datasource contract');
  }
});

test('native metadata reads use the four confirmed GUID selectors without changing public aliases or Field objects', () => {
  const expected = {
    executives: { directoryOrder: 'b6a7493c-740f-45b5-8bae-b90b80d5aff3' },
    experts: { directoryOrder: '7ec198c6-9914-4f31-8144-b47933cdb165', directoryCategory: '2b371226-4ba2-4b89-b0a1-2819f61cd2fe', directorySummary: '52bd7e33-c42d-466b-897d-54d6304a3f01' },
  };
  for (const kind of ['executives', 'experts']) {
    const query = data.buildPeopleSearchQuery('biographies', scope(kind));
    const search = parse(query).definitions[0].selectionSet.selections[0];
    const fields = search.selectionSet.selections.find((node) => node.name.value === 'results').selectionSet.selections;
    const metadata = Object.fromEntries(fields.filter((node) => node.alias?.value.startsWith('directory')).map((node) => [node.alias.value, node.arguments.find((argument) => argument.name.value === 'name').value.value]));
    assert.deepEqual(metadata, expected[kind]);
    for (const name of ['name', 'role', 'portrait']) assert.equal(fields.find((node) => node.alias?.value === name).arguments[0].value.value, name);
    for (const name of ['directoryOrder', ...(kind === 'experts' ? ['directorySummary'] : [])]) {
      assert.deepEqual(fields.find((node) => node.alias?.value === name).selectionSet.selections.map((node) => node.name.value), ['jsonValue']);
    }
    const records = dataset(kind), before = JSON.stringify(records.biographies);
    selectFixtureDirectory(records.current, records.biographies, records.categories);
    assert.equal(JSON.stringify(records.biographies), before);
  }
  assert.doesNotMatch(data.buildPeopleScopeQuery(scope()), /template\s*\{/);
  const { args } = queryArgs(data.buildPeopleSearchQuery('categories', scope('experts')));
  assert.ok(args.where.AND.some((filter) => filter.name === '_templates' && filter.value === data.normalizePeopleId(data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID)));
});

test('resolver-level template identity errors with partial data disappear without losing inherited profiles', async () => {
  const { GraphQLRequestClient } = require('@sitecore-content-sdk/core');
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind), { client, calls } = harness(records, undefined, { rejectTemplateProjection: true });
    const backend = client.graphQLClient;
    client.graphQLClient = new GraphQLRequestClient('https://synthetic.example/graphql', { retries: 0, debugger: () => {},
      fetch: async (_url, options) => {
        const { query, variables } = JSON.parse(options.body);
        let body;
        try { body = { data: await backend.request(query, variables) }; }
        catch (error) {
          if (!(error instanceof ClientError)) throw error;
          body = { errors: error.response.errors, data: error.response.data };
        }
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    });
    const oldQuery = `query AutomaticPeopleScope { datasource: item(path: "${id(2)}", language: "en") { template { id } } }`;
    await assert.rejects(client.getData(oldQuery), (error) => error instanceof ClientError && error.response.status === 200 &&
      error.response.errors.length === 1 && typeof error.response.data === 'object');
    calls.length = 0;
    const props = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    const value = props.directory.automaticPeople;
    assert.equal(value.complete, true);
    assert.equal(value.items.length, kind === 'executives' ? 8 : 29);
    assert.deepEqual(value.items, selectFixtureDirectory(records.current, records.biographies, records.categories).items);
    assert.equal(Object.hasOwn(value, 'failureStage'), false);
    assert.equal(calls.length, kind === 'executives' ? 2 : 5, 'no extra membership request is introduced');
    if (kind === 'experts') assert.equal(value.groups.length, 6);
  }
});

test('native ancestor membership accepts derived biography pages and excludes unrelated owners', async () => {
  for (const kind of ['executives', 'experts']) {
    const records = dataset(kind);
    records.biographies[0].parent.parent.template = { id: id(901), baseTemplateIds: [data.BIOGRAPHY_PAGE_TEMPLATE_ID] };
    records.biographies[1].parent.parent.template = { id: id(902), baseTemplateIds: [id(901), data.BIOGRAPHY_PAGE_TEMPLATE_ID] };
    const { client } = harness(records, undefined, { rejectTemplateProjection: true });
    const props = await client.getComponentData(layout(kind), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(props.directory.automaticPeople.items.length, kind === 'executives' ? 8 : 29);
    records.biographies[0].parent.parent.template = { id: id(903), baseTemplateIds: [] };
    assert.equal(selectFixtureDirectory(records.current, records.biographies, records.categories).items.length, kind === 'executives' ? 7 : 28);
    const search = parse(data.buildPeopleSearchQuery('biographies', records.current)).definitions[0].selectionSet.selections[0];
    const results = search.selectionSet.selections.find((node) => node.name.value === 'results');
    const owners = results.selectionSet.selections.find((node) => node.alias?.value === 'ownerPages');
    assert.equal(owners.name.value, 'ancestors');
    assert.equal(owners.arguments.find((arg) => arg.name.value === 'includeTemplateIDs').value.value, data.normalizePeopleId(data.BIOGRAPHY_PAGE_TEMPLATE_ID));
  }
});

test('unrelated templates, nested descendants, unsafe URLs and duplicate primary biographies are rejected', () => {
  for (const mutate of [(row) => { row.template.id = id(999); }, (row) => { row.parent.name = 'Other'; },
    (row) => { row.parent.parent.template.id = id(999); }, (row) => { row.parent.parent.parent.id = id(999); },
    (row) => { row.parent.parent.url.path = '//evil.example/'; }, (row) => { row.parent.parent.url.path = '/about/subject-matter-experts/deeper/child'; },
    (row) => { row.parent.parent.url.path = '/about/subject-matter-experts/..'; }]) {
    const records = dataset(); mutate(records.biographies[0]);
    assert.equal(selectFixtureDirectory(records.current, records.biographies, records.categories).items.length, 28);
  }
  const records = dataset(); const duplicate = structuredClone(records.biographies[0]); duplicate.id = id(999); records.biographies.push(duplicate);
  assert.throws(() => selectFixtureDirectory(records.current, records.biographies, records.categories), /Multiple biography/);
});

test('missing category is editor-reported and excluded from visitor groups; missing order sorts last deterministically', () => {
  const records = dataset(), row = records.biographies[0]; row.directoryCategory = { targetItem: { id: id(999) } }; row.directoryOrder = field('invalid');
  const result = selectFixtureDirectory(records.current, records.biographies, records.categories);
  assert.equal(result.items.at(-1).id, row.id); assert.equal(result.missingOrder, 1); assert.equal(result.unassigned.length, 1);
  const html = render(ExpertDirectory, result, { heading: field('Experts'), unassignedHeading: field('More experts') });
  assert.doesNotMatch(html, /More experts/); assert.ok(!html.includes(`href="${row.parent.parent.url.path}"`));
  const editing = render(ExpertDirectory, result, { id: id(2) }, true);
  assert.match(editing, /need a directory category before they can appear/);
  assert.ok(!editing.includes(`href="${row.parent.parent.url.path}"`));
  row.directoryOrder = field(1);
  assert.equal(selectFixtureDirectory(records.current, records.biographies, records.categories).items[0].id, row.id);
});

test('structural root never renders heading prompts or manual children and an empty complete directory is valid', () => {
  const datasource = { heading: field('Editable directory'), children: { results: [{ heading: field('Forbidden duplicate') }] } };
  const html = render(ExecutiveDirectory, data.unavailablePeople(), datasource, true).replaceAll('&quot;', '"');
  assert.match(html, /temporarily unavailable/); assert.doesNotMatch(html, /test-heading|Editable directory|Forbidden duplicate/);
  const records = dataset('executives'), result = selectFixtureDirectory(records.current, []);
  assert.equal(result.complete, true); assert.deepEqual(result.items, []);
  assert.doesNotMatch(render(ExecutiveDirectory, result, { heading: field('') }), /temporarily unavailable|Editable directory|<h2/);
});

test('purpose queries have valid GraphQL, no fixture IDs or author collection fallback, and proper template/language restrictions', () => {
  for (const kind of ['executives', 'experts']) {
    const current = scope(kind);
    parse(data.buildPeopleScopeQuery(current));
    for (const type of ['biographies', 'categories']) {
      const query = data.buildPeopleSearchQuery(type, current, 'cursor"\\escaped'); parse(query);
      const { args } = queryArgs(query);
      assert.ok(args.where.AND.some((filter) => filter.name === '_latestversion' && filter.value === 'true'));
      assert.ok(args.where.AND.some((filter) => filter.name === '_language' && filter.value === 'en'));
      assert.equal(args.after, 'cursor"\\escaped');
      if (type === 'biographies') assert.ok(args.where.AND.some((filter) => filter.name === '_templates' && filter.value === data.normalizePeopleId(data.PEOPLE_DIRECTORY_CONTRACTS[kind].templateId)));
    }
  }
  for (const name of ['executive-directory', 'expert-directory']) {
    const query = fs.readFileSync(path.join(sourceRoot, `components/${name}/${name}.graphql`), 'utf8'); parse(query);
    assert.doesNotMatch(query, /children|targetItems/);
    const datasource = parse(query).definitions[0].selectionSet.selections[0];
    assert.deepEqual(datasource.selectionSet.selections.map((node) => node.name.value), ['id']);
  }
  const categories = parse(data.buildPeopleSearchQuery('categories', scope('experts'))).definitions[0].selectionSet.selections[0];
  const introduction = categories.selectionSet.selections.find((node) => node.name.value === 'results').selectionSet.selections.find((node) => node.alias?.value === 'introduction');
  assert.ok(introduction);
  assert.equal(introduction.arguments.find((argument) => argument.name.value === 'name').value.value, data.PEOPLE_CATEGORY_INTRODUCTION_FIELD_ID);
  assert.deepEqual(introduction.selectionSet.selections.map((node) => node.name.value), ['jsonValue']);
});
