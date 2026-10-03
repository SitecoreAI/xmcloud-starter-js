import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { parse } = require('graphql');
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
const field = (value, name = 'heading', itemId = id(2), fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: { fieldType, fieldId: `test-${name}`, itemId } } });
const scope = (kind = 'executives', language = 'en') => ({ kind, language, rootId: id(1), datasourceId: id(2) });
function dataset(kind = 'experts') {
  const current = scope(kind), definition = data.PEOPLE_DIRECTORY_CONTRACTS[kind];
  const root = { id: current.rootId, path: `/sitecore/content/allianz/allianz-life/Home${definition.url}`, url: { path: definition.url } };
  const datasource = { id: current.datasourceId, template: { id: definition.directoryTemplateId, name: definition.directoryTemplate }, parent: { name: 'Data', parent: { id: root.id } } };
  const categories = kind === 'experts' ? contract.categories.map((category, i) => ({ id: id(100 + i), heading: field(category.heading.jsonValue.value, `category-${i}`, id(100 + i)), introduction: field(category.introduction.jsonValue.value, `introduction-${i}`, id(100 + i), 'Rich Text'),
    sortOrder: { jsonValue: { value: category.sortOrder } }, template: { id: data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID, name: 'ExpertDirectoryCategory' }, parent: { id: datasource.id }, key: category.key })) : [];
  const biographies = contract[kind].map((row) => ({ id: row.datasourceId, template: { id: definition.templateId }, ...structuredClone(row.sourceFields),
    directoryOrder: field(row.directoryOrder), directorySummary: row.directorySummary,
    directoryCategory: { targetItem: categories.find((category) => category.key === row.categoryKey) },
    parent: { name: 'Data', parent: { id: row.pageId, path: `/sitecore/content/allianz/allianz-life/Home${row.route}`, url: { path: row.route },
      template: { id: data.BIOGRAPHY_PAGE_TEMPLATE_ID }, parent: { id: root.id } } },
  }));
  return { current, root, datasource, categories, biographies };
}
function queryArgs(query) {
  const operation = parse(query).definitions[0], selection = operation.selectionSet.selections[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)]))
    : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { name: operation.name.value, args: Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])) };
}
function harness(records, change) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), { componentPropsService: new ComponentPropsService(), graphQLClient: {
    async request(query, variables, fetchOptions) {
      const { name, args } = queryArgs(query); calls.push({ name, args, variables, fetchOptions });
      if (name === 'AutomaticPeopleScope') return change ? change({ root: records.root, datasource: records.datasource }, name, args) : { root: records.root, datasource: records.datasource };
      const rows = name === 'AutomaticPeopleBiographies' ? records.biographies : records.categories;
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
  const records = dataset(), actual = data.selectPeopleDirectory(records.current, records.biographies.reverse(), records.categories.reverse());
  assert.deepEqual(actual.groups.map((group) => group.heading.jsonValue.value), contract.categories.map((category) => category.heading.jsonValue.value));
  assert.deepEqual(actual.groups.flatMap((group) => group.items.map((row) => row.href)), contract.experts.map((row) => row.route));
  assert.equal(actual.unassigned.length, 0);
  assert.deepEqual(actual.items.filter((person) => !person.portrait.jsonValue.value.src).map((person) => person.href).sort(), contract.experts.filter((row) => row.portraitIntentionallyAbsent).map((row) => row.route).sort());
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
  assert.equal(calls.filter((call) => call.name === 'AutomaticPeopleBiographies').length, 2);
  assert.ok(calls.every((call) => call.fetchOptions === fetchOptions && call.variables === undefined));
  for (const call of calls.filter((entry) => entry.args.where)) assert.ok(call.args.where.AND.some((filter) => filter.name === '_language' && filter.value === 'en-GB'));
  assert.equal(page.sitecore.route.placeholders['headless-main'][0].fields.data.datasource, authored);
  assert.doesNotMatch(JSON.stringify(result), /synthetic-preview-token|Authorization|fetchOptions/);
});

test('normal executive render derives canonical page links and untouched primary fields, with no substitute portrait', () => {
  const records = dataset('executives'), result = data.selectPeopleDirectory(records.current, records.biographies.reverse());
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
  const records = dataset(), result = data.selectPeopleDirectory(records.current, records.biographies, records.categories);
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
  const records = dataset(), result = data.selectPeopleDirectory(records.current, records.biographies, records.categories);
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
  const records = dataset(), result = data.selectPeopleDirectory(records.current, records.biographies, records.categories);
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
  const html = render(ExecutiveDirectory, data.selectPeopleDirectory(executive.current, executive.biographies), obsoleteFields, true);
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
    (records) => { records.root.path = '/sitecore/content/other/Home/about/subject-matter-experts'; }, (records) => { records.datasource.template.id = id(999); records.datasource.template.name = 'ExpertDirectory'; }]) {
    const records = dataset(); mutate(records); const { client, calls } = harness(records);
    const result = await client.getComponentData(layout(), {}, enrichPeopleComponentMap(componentMap(), { getData: client.getData.bind(client) }));
    assert.equal(result.directory.automaticPeople.error, 'invalid-scope'); assert.equal(calls.length, 1);
  }
});

test('actual native directory/category template IDs survive renamed labels and reject name-only impostors', async () => {
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
      const selected = data.selectPeopleDirectory(records.current, records.biographies, records.categories);
      assert.equal(selected.groups.length, 5);
      assert.equal(selected.unassigned.length, 4);
      assert.equal(selected.items.length, 29);
    }
    records.datasource.template = { name: data.PEOPLE_DIRECTORY_CONTRACTS[kind].directoryTemplate };
    assert.equal(data.validPeopleScope(records.current, records), false);
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
    data.selectPeopleDirectory(records.current, records.biographies, records.categories);
    assert.equal(JSON.stringify(records.biographies), before);
  }
  assert.match(data.buildPeopleScopeQuery(scope()), /template \{ id \}/);
  const { args } = queryArgs(data.buildPeopleSearchQuery('categories', scope('experts')));
  assert.ok(args.where.AND.some((filter) => filter.name === '_templates' && filter.value === data.normalizePeopleId(data.EXPERT_DIRECTORY_CATEGORY_TEMPLATE_ID)));
});

test('unrelated templates, nested descendants, unsafe URLs and duplicate primary biographies are rejected', () => {
  for (const mutate of [(row) => { row.template.id = id(999); }, (row) => { row.parent.name = 'Other'; },
    (row) => { row.parent.parent.template.id = id(999); }, (row) => { row.parent.parent.parent.id = id(999); },
    (row) => { row.parent.parent.url.path = '//evil.example/'; }, (row) => { row.parent.parent.url.path = '/about/subject-matter-experts/deeper/child'; },
    (row) => { row.parent.parent.url.path = '/about/subject-matter-experts/..'; }]) {
    const records = dataset(); mutate(records.biographies[0]);
    assert.equal(data.selectPeopleDirectory(records.current, records.biographies, records.categories).items.length, 28);
  }
  const records = dataset(); const duplicate = structuredClone(records.biographies[0]); duplicate.id = id(999); records.biographies.push(duplicate);
  assert.throws(() => data.selectPeopleDirectory(records.current, records.biographies, records.categories), /Multiple biography/);
});

test('missing category is editor-reported and excluded from visitor groups; missing order sorts last deterministically', () => {
  const records = dataset(), row = records.biographies[0]; row.directoryCategory = { targetItem: { id: id(999) } }; row.directoryOrder = field('invalid');
  const result = data.selectPeopleDirectory(records.current, records.biographies, records.categories);
  assert.equal(result.items.at(-1).id, row.id); assert.equal(result.missingOrder, 1); assert.equal(result.unassigned.length, 1);
  const html = render(ExpertDirectory, result, { heading: field('Experts'), unassignedHeading: field('More experts') });
  assert.doesNotMatch(html, /More experts/); assert.ok(!html.includes(`href="${row.parent.parent.url.path}"`));
  const editing = render(ExpertDirectory, result, { id: id(2) }, true);
  assert.match(editing, /need a directory category before they can appear/);
  assert.ok(!editing.includes(`href="${row.parent.parent.url.path}"`));
  row.directoryOrder = field(1);
  assert.equal(data.selectPeopleDirectory(records.current, records.biographies, records.categories).items[0].id, row.id);
});

test('structural root never renders heading prompts or manual children and an empty complete directory is valid', () => {
  const datasource = { heading: field('Editable directory'), children: { results: [{ heading: field('Forbidden duplicate') }] } };
  const html = render(ExecutiveDirectory, data.unavailablePeople(), datasource, true).replaceAll('&quot;', '"');
  assert.match(html, /temporarily unavailable/); assert.doesNotMatch(html, /test-heading|Editable directory|Forbidden duplicate/);
  const records = dataset('executives'), result = data.selectPeopleDirectory(records.current, []);
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
