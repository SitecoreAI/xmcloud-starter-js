import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import os from 'node:os';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { parse, visit, getLocation } = require('graphql'), postcss = require('postcss');
const { ClientError } = require('graphql-request');
const { GraphQLRequestClient } = require('@sitecore-content-sdk/core');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider, ComponentPropsService, ComponentPropsContext } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename); compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only' || specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : /^(lib|components)\//.test(specifier) ? path.join(root, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile());
      if (resolved) return /\.tsx?$/.test(resolved) ? load(resolved) : require(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}
const data = load(path.join(root, 'lib/investment-portfolio-data.ts'));
const { enrichInvestmentPortfolioComponentMap } = load(path.join(root, 'lib/investment-portfolio-server.ts'));
const Component = load(path.join(root, 'components/investment-portfolio/InvestmentPortfolio.tsx')).Default;
const { investmentWebsiteField } = load(path.join(root, 'components/investment-portfolio/investment-portfolio-fields.props.ts'));
const evidencePath = path.join(root, 'components/investment-portfolio/__tests__');
const source = JSON.parse(fs.readFileSync(path.join(evidencePath, 'source-inventory.json'), 'utf8'));
const id = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const bindings = { datasourceTemplateId: id(3), investmentTemplateId: id(4), siteName: 'allianz-life', siteRootPath: '/sitecore/content/allianz/allianz-life' };
const scope = { rootId: id(1), datasourceId: id(2), language: 'en' };
const field = (value, name, itemId = id(2), fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: { fieldType, fieldId: `test-${name}`, itemId } } });
function dataset() {
  return {
    root: { id: id(1), path: `${bindings.siteRootPath}/Home/about/ventures/portfolio` },
    datasource: { id: id(2), template: { id: bindings.datasourceTemplateId }, parent: { name: 'Data', parent: { id: id(1) } }, activeHeading: field(source.activeHeading, 'activeHeading'), exitedHeading: field(source.exitedHeading, 'exitedHeading') },
    items: source.items.map((row, index) => {
      const itemId = id(100 + index);
      return { id: itemId, parent: { id: id(2) }, template: { id: bindings.investmentTemplateId, baseTemplateIds: [] },
        name: field(row.name, 'name', itemId), investmentStatus: field(row.investmentStatus, 'investmentStatus', itemId, 'Droplist'),
        details: field(row.detailsHtml, 'details', itemId, 'Rich Text'), logo: field({ src: row.logo.sourceUrl, alt: row.logo.alt }, 'logo', itemId, 'Image'),
        websiteLink: field(row.websiteLink ? { href: row.websiteLink.href, text: row.websiteLink.text, target: row.websiteLink.target, linktype: 'external' } : { href: '', text: '', target: '', linktype: 'external' }, 'websiteLink', itemId, 'General Link') };
    }),
  };
}
function queryArgs(query) {
  const operation = parse(query).definitions[0], selection = operation.selectionSet.selections[0];
  const value = (node) => node.kind === 'ObjectValue' ? Object.fromEntries(node.fields.map((field) => [field.name.value, value(field.value)])) : node.kind === 'ListValue' ? node.values.map(value) : node.kind === 'IntValue' ? Number(node.value) : node.value;
  return { name: operation.name.value, args: Object.fromEntries(selection.arguments.map((argument) => [argument.name.value, value(argument.value)])) };
}
function nativeInvestmentProjection(row) {
  const { template: _template, ...projection } = row;
  return projection;
}
function harness(records, change) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), { componentPropsService: new ComponentPropsService(), graphQLClient: { async request(query, variables, fetchOptions) {
    const { name, args } = queryArgs(query), call = { query, name, args, variables, fetchOptions }; calls.push(call);
    if (name === 'InvestmentPortfolioScope') {
      const response = { root: records.root, datasource: { id: records.datasource.id, parent: records.datasource.parent } };
      call.response = change ? change(response, name, args) : response;
      return call.response;
    }
    const template = args.where.AND.find((entry) => entry.name === '_templates'), parent = args.where.AND.find((entry) => entry.name === '_parent');
    const rows = records.items.filter((item) => [item.template?.id, ...(item.template?.baseTemplateIds ?? [])].some((value) => data.normalizeInvestmentId(value) === template.value) && data.normalizeInvestmentId(item.parent?.id) === parent.value);
    const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
    const result = { search: { total: rows.length, results: rows.slice(offset, offset + args.first).map(nativeInvestmentProjection), pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } };
    call.response = change ? change(result, name, args) : result;
    return call.response;
  } } });
  return { client, calls };
}
function layout(overrides = {}, repeat = false) {
  const rendering = { componentName: 'InvestmentPortfolio', dataSource: id(2), uid: 'portfolio', fields: { data: { datasource: { id: id(2) } } } };
  return { sitecore: { context: { language: 'en', site: { name: 'allianz-life' }, ...overrides }, route: { itemId: id(1), fields: {}, placeholders: { 'headless-main': [rendering, ...(repeat ? [{ ...rendering, uid: 'repeat' }] : [])] } } } };
}
const componentMap = (dynamic = false) => new Map([['InvestmentPortfolio', dynamic ? { dynamicModule: async () => ({ Default: Component }), componentType: 'client' } : { Default: Component, componentType: 'client' }]]);
async function read(records, mutate, options = {}, page = layout()) {
  const { client, calls } = harness(records, mutate);
  const output = await client.getComponentData(page, {}, enrichInvestmentPortfolioComponentMap(componentMap(true), { getData: client.getData.bind(client), bindings, ...options }));
  return { result: output.portfolio.investmentPortfolio, output, calls };
}
const collection = (records) => ({ complete: true, scope, baseTemplateId: bindings.investmentTemplateId, items: records.items.map(nativeInvestmentProjection) });
const select = (records) => data.selectInvestmentPortfolio(scope, bindings, collection(records));
function render(result, datasource, editing = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life', layout: layout() }, api: {}, componentMap: componentMap(), loadImportMap: async () => ({}),
  }, React.createElement(ComponentPropsContext, { value: { portfolio: { investmentPortfolio: result } } }, React.createElement(Component, { rendering: { uid: 'portfolio' }, params, fields: { data: { datasource } } }))));
}
const decode = (html) => html.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");

test('exact live-source witness retains 19 active, 9 exited, 28 logos and all source links', () => {
  const witness = fs.readFileSync(path.join(evidencePath, 'portfolio.source.html'));
  assert.equal(crypto.createHash('sha256').update(witness).digest('hex'), source.canonicalFixtureSha256);
  assert.equal(witness.length, source.canonicalFixtureByteCount);
  assert.equal(source.canonicalFixtureLineEndings, 'LF');
  assert.equal(witness.includes(Buffer.from('\r\n')), false);
  assert.equal(source.sourceSha256, '48f056bc557e6f8e47639136227ada4f3ac19980a742e7d4ee7e3eeec00bdd1b');
  assert.equal(source.sourceByteCount, 135763);
  assert.equal(source.items.length, 28);
  for (const status of ['Active', 'Exited']) {
    const names = source.items.filter((item) => item.investmentStatus === status).map((item) => item.name);
    assert.equal(names.length, status === 'Active' ? 19 : 9);
    assert.deepEqual(names, [...names].sort(new Intl.Collator('en', { sensitivity: 'base' }).compare));
  }
  for (const row of source.items) {
    assert.equal(row.nativeId, null); assert.ok(witness.toString().includes(row.detailsHtml));
    assert.ok(witness.toString().includes(new URL(row.logo.sourceUrl).pathname));
    if (row.websiteLink) assert.ok(witness.toString().includes(`href="${row.websiteLink.href}"`));
  }
  assert.equal(source.items.find((row) => row.name === 'Jump').websiteLink.href, 'http://www.jump.ai/');
  assert.equal(source.items.find((row) => row.name === 'Vanilla').websiteLink.target, '');
  assert.ok(source.items.filter((row) => row.investmentStatus === 'Exited').every((row) => row.websiteLink === null));
});

test('real SDK hook consumes all three pages with original field identities and untouched input objects', async () => {
  const records = dataset(), original = JSON.stringify(records), { result, calls } = await read(records);
  assert.equal(result.complete, true); assert.equal(result.active.length, 19); assert.equal(result.exited.length, 9);
  assert.deepEqual(calls.filter((call) => call.name === 'InvestmentPortfolioItems').map((call) => call.args.after), [undefined, '10', '20']);
  assert.deepEqual(result.active.map((item) => item.name.jsonValue.value), source.items.slice(0, 19).map((item) => item.name));
  assert.equal(result.active[0], calls.find((call) => call.name === 'InvestmentPortfolioItems').response.search.results[0]);
  assert.equal(result.active[0].logo, records.items[0].logo); assert.equal(result.active[0].investmentStatus, records.items[0].investmentStatus);
  assert.ok([...result.active, ...result.exited].every((item) => !Object.hasOwn(item, 'template')));
  assert.equal(JSON.stringify(records), original);
});

test('request-local hook copies maps, supports dynamic modules, shares repeated reads and propagates exact preview context', async () => {
  const records = dataset(), { client, calls } = harness(records), original = componentMap(true);
  const fetchOptions = { headers: { Authorization: 'synthetic-secret', sc_previewMode: 'true', sc_site: 'allianz-life' }, cache: 'no-store' };
  const output = await client.getComponentData(layout({ language: 'en-GB' }, true), {}, enrichInvestmentPortfolioComponentMap(original, { getData: client.getData.bind(client), bindings, fetchOptions }));
  assert.equal(output.portfolio.investmentPortfolio, output.repeat.investmentPortfolio); assert.equal(calls.length, 4);
  assert.equal(original.get('InvestmentPortfolio').getComponentServerProps, undefined);
  assert.ok(calls.every((call) => call.fetchOptions === fetchOptions && call.variables === undefined));
  assert.ok(calls.filter((call) => call.args.where).every((call) => call.args.where.AND.some((entry) => entry.name === '_language' && entry.value === 'en-GB')));
  assert.doesNotMatch(JSON.stringify(output), /synthetic-secret|Authorization|fetchOptions/);
  await client.getComponentData(layout(), {}, enrichInvestmentPortfolioComponentMap(original, { getData: client.getData.bind(client), bindings }));
  assert.equal(calls.length, 8);
});

test('unknown native bindings stay unconfigured without queries or invented IDs', async () => {
  for (const value of [undefined, { ...bindings, investmentTemplateId: 'placeholder' }, { ...bindings, siteRootPath: '/sitecore/content/../other' }]) {
    const { result, calls } = await read(dataset(), undefined, { bindings: value });
    assert.equal(result.error, 'unconfigured'); assert.equal(calls.length, 0); assert.deepEqual(result.active, []);
  }
});

test('collection is reusable on another actual page but rejects foreign sites and datasource owners', async () => {
  const reusable = dataset(); reusable.root.path = `${bindings.siteRootPath}/Home/another/portfolio-page`;
  assert.equal((await read(reusable)).result.active.length, 19);
  for (const mutate of [(x) => { x.root.path = '/sitecore/content/unrelated/Home'; }, (x) => { x.root.path = `${bindings.siteRootPath}/Homeward`; },
    (x) => { x.datasource.parent.parent.id = id(999); }, (x) => { x.datasource.id = id(999); },
    (x) => { x.datasource.parent.name = 'Other'; }, (x) => { x.root.id = id(999); }]) {
    const records = dataset(); mutate(records); const { result, calls } = await read(records); assert.equal(result.error, 'invalid-scope'); assert.equal(calls.length, 1);
  }
  for (const override of [{ language: 'en"bad' }, { site: { name: 'foreign' } }]) {
    const { result, calls } = await read(dataset(), undefined, {}, layout(override)); assert.equal(result.error, 'invalid-scope'); assert.equal(calls.length, 0);
  }
});

test('configured native rendering supplies its datasource-template contract without a template identity read', async () => {
  const records = dataset(); records.datasource.template = { id: id(510), baseTemplateIds: [bindings.datasourceTemplateId] };
  assert.equal((await read(records)).result.complete, true);
  delete records.datasource.template;
  const { result, calls } = await read(records);
  assert.equal(result.complete, true); assert.equal(result.active.length, 19); assert.equal(result.exited.length, 9);
  assert.doesNotMatch(calls[0].query, /template\s*\{/);
  assert.equal(data.validInvestmentPortfolioScope(scope, bindings, calls[0].response), true);
});

test('inherited Investment templates participate through native query provenance, with direct-parent boundary', async () => {
  const records = dataset(); records.items[0].template = { id: id(501), baseTemplateIds: [bindings.investmentTemplateId] };
  records.items[1].template = { id: id(502), baseTemplateIds: [bindings.investmentTemplateId, id(501)] };
  const unrelated = structuredClone(records.items[0]); unrelated.id = id(503); unrelated.template = { id: id(504), name: 'Investment', baseTemplateIds: [] }; records.items.push(unrelated);
  const nested = structuredClone(records.items[0]); nested.id = id(505); nested.parent.id = records.items[0].id; records.items.push(nested);
  const { result, calls } = await read(records); assert.equal(result.active.length + result.exited.length, 28);
  assert.deepEqual(result.active[0], nativeInvestmentProjection(records.items[0]));
  assert.ok([...result.active, ...result.exited].every((item) => !Object.hasOwn(item, 'template')));
  assert.ok(calls.filter((call) => call.args.where).every((call) => call.args.where.AND.some((entry) => entry.name === '_templates' && entry.operator === 'CONTAINS')));
  const invalid = await read(dataset(), (response, name) => { if (name === 'InvestmentPortfolioItems') response.search.results[0] = { ...response.search.results[0], parent: { id: id(999) } }; return response; });
  assert.equal(invalid.result.complete, false); assert.deepEqual(invalid.result.active, []);
});

test('installed SDK rejects template-resolver errors with partial data while inherited filtered portfolios complete', async () => {
  const records = dataset();
  records.items[0].template = { id: id(520), baseTemplateIds: [bindings.investmentTemplateId] };
  records.items[1].template = { id: id(521), baseTemplateIds: [id(520), bindings.investmentTemplateId] };
  const { client, calls } = harness(records), backend = client.graphQLClient;
  client.graphQLClient = new GraphQLRequestClient('https://synthetic-edge.invalid/graphql', {
    retries: 0, debugger: () => {},
    fetch: async (_url, options) => {
      const { query, variables } = JSON.parse(options.body), response = await backend.request(query, variables);
      const templateNodes = []; visit(parse(query), { Field(node) { if (node.name.value === 'template') templateNodes.push(node); } });
      const envelope = { data: response };
      if (templateNodes.length) {
        const locations = [getLocation(templateNodes[0].loc.source, templateNodes[0].loc.start)];
        if (queryArgs(query).name === 'InvestmentPortfolioScope') {
          envelope.data.datasource = { ...response.datasource, template: null };
          envelope.errors = [{ message: 'Template identity resolver failed', path: ['datasource', 'template'], locations }];
        } else {
          envelope.data.search.results = response.search.results.map((row) => ({ ...row, template: null }));
          envelope.errors = response.search.results.map((_row, index) => ({ message: 'Template identity resolver failed', path: ['search', 'results', index, 'template'], locations }));
        }
      }
      return new Response(JSON.stringify(envelope), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const legacyScope = (query) => query.replace('id parent { name parent { id } }', 'id template { id } parent { name parent { id } }');
  const legacyItems = (query) => query.replace('id parent { id }', 'id template { id } parent { id }');
  for (const [legacyQuery, count] of [[legacyScope(data.buildInvestmentPortfolioScopeQuery(scope)), 1], [legacyItems(data.buildInvestmentPortfolioSearchQuery(scope, bindings)), 10]]) {
    await assert.rejects(client.getData(legacyQuery), (error) => {
      assert.ok(error instanceof ClientError); assert.equal(error.response.status, 200); assert.equal(error.response.errors.length, count);
      if (count === 1) { assert.equal(error.response.data.datasource.id, records.datasource.id); assert.equal(error.response.data.datasource.template, null); }
      else { assert.equal(error.response.data.search.results.length, 10); assert.ok(error.response.data.search.results.every((row) => row.template === null)); }
      return true;
    });
  }
  for (const [legacyProjection, failureStage] of [[legacyScope, 'scope-request'], [legacyItems, 'items-request']]) {
    const failed = await client.getComponentData(layout(), {}, enrichInvestmentPortfolioComponentMap(componentMap(), {
      bindings, getData: (query, variables, fetchOptions) => client.getData(legacyProjection(query), variables, fetchOptions),
    }));
    assert.equal(failed.portfolio.investmentPortfolio.failureStage, failureStage);
    assert.deepEqual(failed.portfolio.investmentPortfolio.active, []); assert.deepEqual(failed.portfolio.investmentPortfolio.exited, []);
    assert.doesNotMatch(JSON.stringify(failed), /resolver failed|Blaise|\"(?:request|response|query|headers|variables)\"\s*:/);
  }
  calls.length = 0;
  const props = await client.getComponentData(layout(), {}, enrichInvestmentPortfolioComponentMap(componentMap(), { bindings, getData: client.getData.bind(client) }));
  assert.deepEqual(props.portfolio.investmentPortfolio, select(records));
  assert.equal(props.portfolio.investmentPortfolio.active.length, 19); assert.equal(props.portfolio.investmentPortfolio.exited.length, 9);
  assert.equal(calls.length, 4); assert.ok(calls.every((call) => !/template\s*\{/.test(call.query)));
  assert.deepEqual(calls.slice(1).map((call) => call.args.after), [undefined, '10', '20']);
});

test('selection requires complete matching scope/template/language provenance rather than manual child arrays', () => {
  const records = dataset(); assert.throws(() => data.selectInvestmentPortfolio(scope, bindings, records.items), /provenance/);
  for (const mutate of [(x) => { x.complete = false; }, (x) => { x.scope.language = 'de'; }, (x) => { x.scope.rootId = id(999); },
    (x) => { x.scope.datasourceId = id(999); }, (x) => { x.baseTemplateId = id(999); }]) {
    const input = structuredClone(collection(records)); mutate(input); assert.throws(() => data.selectInvestmentPortfolio(scope, bindings, input), /provenance/);
  }
});

test('alphabetical grouping ignores case and normalizes comparison only, with deterministic native-ID ties', () => {
  const records = dataset(); records.items = records.items.slice(0, 4);
  for (const [index, name] of [' beta ', 'Álpha', 'a\u0301lpha', 'ALPHA'].entries()) records.items[index].name.jsonValue.value = name;
  const original = JSON.stringify(records.items), sorted = select({ ...records, items: [...records.items].reverse() });
  assert.deepEqual(sorted.active.map((item) => item.id), [records.items[1].id, records.items[2].id, records.items[3].id, records.items[0].id]);
  assert.equal(sorted.active.at(-1).name.jsonValue.value, ' beta '); assert.equal(JSON.stringify(records.items), original);
});

test('name and business-status changes reorder automatically; adding/removing native records requires no reference list', async () => {
  const records = dataset(); const moved = records.items[0]; moved.investmentStatus.jsonValue.value = 'Exited'; moved.name.jsonValue.value = 'ZZZ renamed';
  let result = (await read(records)).result; assert.equal(result.active.length, 18); assert.equal(result.exited.at(-1).id, moved.id);
  const added = structuredClone(records.items[1]); added.id = id(990); added.name.jsonValue.value = 'AAA added'; records.items.push(added);
  result = (await read(records)).result; assert.equal(result.active[0].id, added.id);
  records.items = records.items.filter((item) => item.id !== moved.id);
  result = (await read(records)).result; assert.equal(result.exited.length, 9); assert.ok(!result.exited.includes(moved));
});

test('no application publication or hasLayout rules override what the native endpoint returns', async () => {
  const records = dataset(); records.items[0].published = false; records.items[0].workflowState = 'Draft'; records.items[0].hasLayout = false;
  const { result, calls } = await read(records); assert.deepEqual(result.active[0], nativeInvestmentProjection(records.items[0]));
  for (const call of calls.filter((call) => call.args.where)) {
    assert.deepEqual(call.args.where.AND.map((entry) => entry.name), ['_templates', '_parent', '_language', '_latestversion']);
    assert.doesNotMatch(call.query, /hasLayout|workflow|publish|orderBy/);
  }
});

test('all pagination failures, duplicate IDs and malformed content fail closed with no partial rows', async () => {
  const failures = [
    (response) => { delete response.search.total; }, (response) => { response.search.total++; },
    (response) => { response.search.results = []; }, (response) => { response.search.results[0] = { ...response.search.results[0], id: id(100) }; },
    (response) => { response.search.pageInfo.hasNext = false; }, (response) => { response.search.pageInfo.endCursor = '10'; },
    (response) => { response.search.pageInfo.endCursor = ''; }, (response) => { response.search.pageInfo.hasNext = 'true'; },
  ];
  for (const mutation of failures) {
    const { result } = await read(dataset(), (response, name, args) => { if (name === 'InvestmentPortfolioItems' && args.after) mutation(response); return response; });
    assert.equal(result.complete, false); assert.deepEqual(result.active, []); assert.deepEqual(result.exited, []);
  }
  for (const mutation of [(row) => { row.name.jsonValue.value = ' '; }, (row) => { row.investmentStatus.jsonValue.value = 'active'; },
    (row) => { row.investmentStatus.jsonValue.value = ''; }, (row) => { row.investmentStatus.jsonValue.value = 'Published'; }]) {
    const records = dataset(); mutation(records.items[0]); const { result } = await read(records);
    assert.equal(result.complete, false); assert.equal(result.failureStage, 'selection-validation');
  }
});

test('request failures serialize a fixed stage only, never credentials, error content or partial source records', async () => {
  for (const name of ['InvestmentPortfolioScope', 'InvestmentPortfolioItems']) {
    const { result } = await read(dataset(), (response, operation, args) => { if (operation === name && (name === 'InvestmentPortfolioScope' || args.after === '20')) throw Object.assign(Error('private transport'), { headers: { Authorization: 'private-token' } }); return response; });
    assert.equal(result.failureStage, name === 'InvestmentPortfolioScope' ? 'scope-request' : 'items-request');
    assert.deepEqual(result.active, []); assert.deepEqual(result.exited, []); assert.doesNotMatch(JSON.stringify(result), /private|Authorization|Blaise/);
  }
});

test('purpose-specific website validator preserves original HTTP(S) fields, targets and blanks without host exceptions', () => {
  for (const href of ['http://any-company.example/path', 'https://different.example/?q=1#part', '']) {
    const native = field({ href, target: '_blank', text: 'Company' }, 'websiteLink').jsonValue;
    assert.equal(investmentWebsiteField(native), native);
  }
  for (const href of ['javascript:alert(1)', 'data:text/html,abc', '//example.com', '/internal', 'mailto:a@example.com', 'https://user:pass@example.com', 'https://user@example.com', 'https://', 'https://exam\nple.com', 'https://example.com/a b']) {
    assert.equal(investmentWebsiteField(field({ href }, 'websiteLink').jsonValue), undefined, href);
  }
});

test('real SDK render preserves every caption, logo, active CTA and exited inline link with original targets', () => {
  const records = dataset(), result = select(records), before = JSON.stringify(result), html = render(result, records.datasource);
  assert.equal((html.match(/<h3>/g) ?? []).length, 28); assert.equal((html.match(/<img\b/g) ?? []).length, 28); assert.equal((html.match(/class="a-link"/g) ?? []).length, 19);
  for (const item of source.items) { assert.ok(html.includes(item.detailsHtml)); assert.ok(html.includes(`src="${item.logo.sourceUrl}"`)); assert.ok(html.includes(`alt="${item.logo.alt}"`)); }
  assert.match(html, /href="http:\/\/www.jump.ai\/"[^>]*target="_blank"/); assert.match(html, /href="https:\/\/www.justvanilla.com\/"/);
  assert.doesNotMatch(html, /service-unavailable|demo-unavailable|data-sc-field/);
  assert.ok(html.indexOf('<h2>Active Investments') < html.indexOf('<h2>Exited investments'));
  assert.equal(JSON.stringify(result), before);
});

test('populated investment fields retain SDK metadata while cleared optional fields stay off the canvas', () => {
  const records = dataset(), result = select(records); records.datasource.activeHeading.jsonValue.value = '';
  records.items[0].details.jsonValue.value = ''; records.items[0].logo.jsonValue.value = { src: '', alt: '' }; records.items[0].websiteLink.jsonValue.value = { href: '', text: '' };
  const before = JSON.stringify(records), html = decode(render(result, records.datasource, true));
  for (const name of ['exitedHeading', 'name', 'details', 'logo', 'websiteLink']) assert.ok(html.includes(`"fieldId":"test-${name}"`), name);
  assert.doesNotMatch(html, /"fieldId":"test-activeHeading"|No text in field|scEmptyImage/);
  const markers = [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(match[1]));
  assert.deepEqual(markers.filter(marker => marker.itemId === records.items[0].id).map(marker => marker.fieldId), ['test-name']);
  assert.ok(html.includes(`"itemId":"${records.items[0].id}"`)); assert.equal(JSON.stringify(records), before);
  const normal = render(result, records.datasource); assert.doesNotMatch(normal, /alt="Blaise"|Go to Blaise|Add or edit Investment/);
});

test('native Image dimensions, Original source, blank alt and metadata survive the real SDK renderer', () => {
  const records = dataset(), item = records.items[0];
  Object.assign(item.logo.jsonValue.value, { width: '256', height: '240', alt: '' });
  const before = JSON.stringify(records), result = select(records);
  for (const editing of [false, true]) {
    const html = decode(render(result, records.datasource, editing));
    const image = (html.match(/<img\b[^>]*>/g) ?? []).find((tag) => tag.includes(`src="${item.logo.jsonValue.value.src}"`));
    assert.ok(image); assert.match(image, /\bwidth="256"/); assert.match(image, /\bheight="240"/); assert.match(image, /\balt=""/);
    if (editing) {
      assert.ok(html.includes('"fieldId":"test-logo"')); assert.ok(html.includes(`"itemId":"${item.id}"`));
    }
  }
  assert.equal(result.active[0].logo, item.logo);
  assert.equal(JSON.stringify(records), before);
});

test('computed fixture keeps intrinsic logos and 1/2/2/4 columns across mobile, tablet and desktop boundaries', async (context) => {
  // This isolated SDK/CSS fixture does not substitute for live CMS/browser acceptance.
  if (process.env.PORTFOLIO_TEST_BROWSER !== '1') {
    context.skip('Set PORTFOLIO_TEST_BROWSER=1 to opt into the isolated Chrome regression');
    return;
  }
  const chrome = [process.env.PORTFOLIO_TEST_CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((file) => file && fs.existsSync(file));
  if (!chrome) { context.skip('A local Chrome/Chromium executable is required for computed CSS regression'); return; }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-computed-regression-'));
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pending = new Map(); let browser, ws, stderr = '', nextId = 0;
  const diagnostic = () => stderr.replace(/(?:https?|wss?|file|blob|data):[^\s<>"'`]+/gi, '[URL removed]').replace(/(?:\/Users|\/tmp|\/var)\/[^\s():]+/g, '[local path removed]').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(-300);
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId, timer = setTimeout(() => { pending.delete(id); reject(new Error(`Fixture CDP ${method} timed out`)); }, 10000);
    pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
  });
  try {
    const records = dataset();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="240" viewBox="0 0 256 240"><rect width="256" height="240" fill="white"/><rect x="8" y="8" width="240" height="224" fill="#003781"/></svg>';
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    for (const item of records.items) Object.assign(item.logo.jsonValue.value, { src, width: '256', height: '240' });
    const before = JSON.stringify(records);
    // Load inherited legacy CSS last to exercise the actual teaser-height cascade.
    const css = ['assets/allianz-source.css', 'components/investment-portfolio/InvestmentPortfolio.css', 'assets/allianz-legacy.css'].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
    const measure = async () => {
      const images = [...document.querySelectorAll('.investment-portfolio img')];
      await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; })));
      const rect = (node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, width: r.width, height: r.height }; };
      const rows = [...document.querySelectorAll('.investment-portfolio__items')].map((group) => {
        const children = [...group.children], top = children[0].getBoundingClientRect().top;
        return { count: children.length, columns: children.filter((child) => Math.abs(child.getBoundingClientRect().top - top) < 1).length };
      });
      const logos = images.map((image) => ({ image: rect(image), picture: rect(image.closest('picture')), card: rect(image.closest('article')), loaded: image.complete && image.naturalWidth > 0, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: image.getAttribute('width'), height: image.getAttribute('height'), fit: getComputedStyle(image).objectFit, maxHeight: getComputedStyle(image).maxHeight }));
      document.getElementById('portfolio-computed').textContent = JSON.stringify({ width: innerWidth, rows, logos });
    };
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'"><style>html,body{margin:0}${css}</style></head><body class="allianz-legacy"><main class="mfe">${render(select(records), records.datasource)}</main><pre id="portfolio-computed" hidden></pre><script>(${measure.toString()})()</script></body></html>`;
    const filename = path.join(temp, 'portfolio.html'); fs.writeFileSync(filename, html);
    // Use an owned CDP browser: recent macOS Chrome can finish dump-dom yet wait indefinitely to exit.
    const profile = path.join(temp, 'chrome-profile');
    browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-domain-reliability', '--disable-sync', '--disable-features=MediaRouter,OptimizationHints,AutofillServerCommunication', '--safebrowsing-disable-auto-update', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    browser.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4096); });
    browser.on('error', (error) => { stderr = `Browser launch error: ${error.code ?? 'unknown'}`; });
    const portfile = path.join(profile, 'DevToolsActivePort'), deadline = Date.now() + 25000;
    while (!fs.existsSync(portfile) && Date.now() < deadline && browser.exitCode === null && browser.signalCode === null) await delay(100);
    assert.ok(fs.existsSync(portfile), `Fixture Chrome launch did not become ready within25s: ${diagnostic()}`);
    const port = Number(fs.readFileSync(portfile, 'utf8').split('\n')[0]);
    assert.ok(Number.isInteger(port) && port > 0);
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT', signal: AbortSignal.timeout(10000) })).json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture browser connection timed out')), 10000);
      ws.onopen = () => { clearTimeout(timer); resolve(); }; ws.onerror = () => { clearTimeout(timer); reject(new Error('Fixture browser connection failed')); };
    });
    ws.onmessage = ({ data }) => {
      const event = JSON.parse(data), entry = pending.get(event.id); if (!entry) return;
      clearTimeout(entry.timer); pending.delete(event.id);
      event.error ? entry.reject(new Error('Fixture browser protocol request failed')) : entry.resolve(event.result);
    };
    await send('Page.enable'); await send('Runtime.enable');
    await send('Page.navigate', { url: pathToFileURL(filename).href });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = await send('Runtime.evaluate', { expression: "document.readyState === 'complete' && document.querySelectorAll('.investment-portfolio img').length === 28", returnByValue: true });
      if (result.result.value === true) { ready = true; break; } await delay(100);
    }
    assert.ok(ready, 'Fixture document and all28 image elements became ready');
    const matrix = [];
    for (const wrapper of ['legacy', 'modern']) for (const [width, columns] of [[703, 1], [704, 2], [991, 2], [992, 4]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 2000, deviceScaleFactor: 1, mobile: false });
      const measured = await send('Runtime.evaluate', {
        expression: `document.body.className=${JSON.stringify(wrapper === 'legacy' ? 'allianz-legacy' : 'prod-mode allianz-modern')};document.querySelector('main').className=${JSON.stringify(wrapper === 'legacy' ? 'mfe' : '')};(${measure.toString()})().then(()=>document.getElementById('portfolio-computed').textContent)`, returnByValue: true, awaitPromise: true,
      });
      assert.ok(!measured.exceptionDetails, `${wrapper} ${width}px: browser measurement completed`);
      const report = JSON.parse(measured.result.value);
      assert.equal(report.width, width); assert.deepEqual(report.rows.map((row) => row.count), [19, 9]);
      assert.deepEqual(report.rows.map((row) => row.columns), [columns, columns], `${wrapper} ${width}px: computed group columns`);
      assert.equal(report.logos.length, 28);
      for (const [index, logo] of report.logos.entries()) {
        const label = `${wrapper} ${width}px logo ${index}`;
        assert.equal(logo.loaded, true, label); assert.deepEqual([logo.naturalWidth, logo.naturalHeight], [256, 240], label);
        assert.deepEqual([logo.width, logo.height], ['256', '240'], label); assert.equal(logo.fit, 'contain', label);
        assert.ok(logo.image.width > 0 && logo.image.height > 0, label);
        const cap = Number.parseFloat(logo.maxHeight);
        const expectedHeight = Math.min(logo.image.width * 240 / 256, Number.isFinite(cap) ? cap : Infinity);
        assert.ok(Math.abs(logo.image.height - expectedHeight) < 1, `${label}: intrinsic sizing respects inherited mobile cap`);
        assert.ok(Math.abs(logo.picture.height - logo.image.height) < 1, `${label}: picture follows image height`);
        assert.ok(logo.image.left >= logo.card.left - 1 && logo.image.right <= logo.card.right + 1, `${label}: image stays inside card`);
      }
      matrix.push({ wrapper, width, columns: report.rows.map((row) => row.columns), logos: report.logos.length, loaded: report.logos.filter((logo) => logo.loaded).length });
    }
    context.diagnostic(`Computed synthetic fixture: ${JSON.stringify(matrix)}`);
    assert.equal(JSON.stringify(records), before);
  } finally {
    for (const entry of pending.values()) clearTimeout(entry.timer);
    ws?.close();
    if (browser && browser.exitCode === null && browser.signalCode === null) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => { browser.kill('SIGKILL'); resolve(); }, 5000);
        browser.once('exit', () => { clearTimeout(timer); resolve(); });
        browser.kill('SIGTERM'); // Only the child launched above with this test's unique profile.
      });
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('unavailable and empty collections preserve authored headings and never use manual or source-fixture children', async () => {
  const records = dataset(); records.datasource.children = { results: records.items };
  const unavailable = render(data.unavailableInvestmentPortfolio('unconfigured'), records.datasource, true);
  assert.match(unavailable, /The investment portfolio is temporarily unavailable/);
  assert.doesNotMatch(unavailable, /Configure the verified native|Add or edit Investment|Check its child items/); assert.doesNotMatch(unavailable, /Blaise|Dili/); assert.match(unavailable, /Active Investments/);
  const empty = { ...records, items: [] }, { result, calls } = await read(empty);
  assert.equal(result.complete, true); assert.equal(calls.length, 2); assert.deepEqual(result.active, []); assert.deepEqual(result.exited, []);
  const html = render(result, records.datasource); assert.doesNotMatch(html, /temporarily unavailable|Blaise|<img/); assert.match(html, /Exited investments/);
  assert.match(render(undefined, undefined), /Add a datasource for Investment Portfolio/);
});

test('queries parse, escape cursors, use compact editable field projections and never assume finite row counts', () => {
  parse(data.buildInvestmentPortfolioScopeQuery(scope));
  const query = data.buildInvestmentPortfolioSearchQuery(scope, bindings, 'cursor"\\escaped'); parse(query);
  assert.doesNotMatch(data.buildInvestmentPortfolioScopeQuery(scope), /template\s*\{/); assert.doesNotMatch(query, /template\s*\{/);
  assert.equal(queryArgs(query).args.after, 'cursor"\\escaped'); assert.equal(queryArgs(query).args.first, 10);
  for (const name of ['name', 'investmentStatus', 'details', 'logo', 'websiteLink']) assert.ok(query.includes(`${name}: field(name: "${name}") { jsonValue }`));
  parse(fs.readFileSync(path.join(root, 'components/investment-portfolio/investment-portfolio.graphql'), 'utf8'));
  for (const file of ['lib/investment-portfolio-data.ts', 'lib/investment-portfolio-server.ts', 'components/investment-portfolio/InvestmentPortfolio.tsx']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8'); assert.doesNotMatch(text, /source-inventory|native-content|fixtures\.json|Blaise|MyoLab|\/about\/ventures\/portfolio|directoryOrder/);
  }
});

test('source-backed fixed presentation uses responsive native grid, exact arrow geometry and no manual row list', () => {
  const sourceHtml = fs.readFileSync(path.join(evidencePath, 'portfolio.source.html'), 'utf8');
  const sourceArrow = sourceHtml.slice(sourceHtml.indexOf('Active Investments')).match(/<path fill-rule="evenodd" d="([^"]+)"/)[1];
  const records = dataset(), html = render(select(records), records.datasource, false, { columns: '1', theme: 'green-soft', headingLevel: 'h6' });
  assert.ok(html.includes(`d="${sourceArrow}"`)); assert.equal((html.match(/investment-portfolio__items/g) ?? []).length, 2);
  assert.equal((html.match(/l-grid__column-medium-3/g) ?? []).length, 28); assert.doesNotMatch(html, /t-bg-green-soft|<h6/);
  const css = postcss.parse(fs.readFileSync(path.join(root, 'assets/allianz-source.css'), 'utf8'));
  let wrap = false, breakpoint = false;
  css.walkRules((rule) => { if (rule.selector === '.l-grid__row' && rule.nodes.some((node) => node.prop === 'flex-wrap' && node.value === 'wrap')) wrap = true;
    if (rule.selector === '.l-grid__column-medium-3' && rule.parent.params === '(min-width:704px)' && rule.nodes.some((node) => node.prop === 'max-width' && node.value === '25%')) breakpoint = true; });
  assert.ok(wrap); assert.ok(breakpoint);
  const ownCss = fs.readFileSync(path.join(root, 'components/investment-portfolio/InvestmentPortfolio.css'), 'utf8'); assert.match(ownCss, /height: auto/); assert.doesNotMatch(ownCss, /object-fit:\s*cover|nth-child/);
});

test('unsafe or unlabelled company CTAs stay absent in both modes without canvas diagnostics', () => {
  const records = dataset(); records.items = records.items.slice(0, 1);
  records.items[0].websiteLink.jsonValue.value = { href: 'javascript:alert(1)', text: 'unsafe' };
  let result = select(records); assert.doesNotMatch(render(result, records.datasource), /javascript:|class="a-link"/);
  assert.doesNotMatch(render(result, records.datasource, true), /without embedded credentials|javascript:|class="a-link"/);
  records.items[0].websiteLink.jsonValue.value = { href: 'https://valid-company.example/', text: '' };
  result = select(records); assert.doesNotMatch(render(result, records.datasource), /class="a-link"/);
  const editing = decode(render(result, records.datasource, true)); assert.doesNotMatch(editing, /accessible link label|"fieldId":"test-websiteLink"|class="a-link"/);
});

test('complete and unavailable investment layouts match normal mode while populated native fields stay editable', () => {
  const records = dataset();
  for (const result of [select(records), data.unavailableInvestmentPortfolio('unconfigured')]) {
    const normal = render(result, records.datasource), editing = render(result, records.datasource, true);
    assert.equal(editing.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ''), normal);
    assert.doesNotMatch(editing, /Add or edit Investment|Configure the verified native|Check its child items/);
    assert.match(decode(editing), /"fieldId":"test-activeHeading"/);
    assert.match(decode(editing), /"fieldId":"test-exitedHeading"/);
  }
});
