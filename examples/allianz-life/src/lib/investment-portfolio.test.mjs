import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const { parse } = require('graphql'), postcss = require('postcss');
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
      if (resolved) return load(resolved);
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
function harness(records, change) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), { componentPropsService: new ComponentPropsService(), graphQLClient: { async request(query, variables, fetchOptions) {
    const { name, args } = queryArgs(query); calls.push({ query, name, args, variables, fetchOptions });
    if (name === 'InvestmentPortfolioScope') return change ? change({ root: records.root, datasource: records.datasource }, name, args) : { root: records.root, datasource: records.datasource };
    const template = args.where.AND.find((entry) => entry.name === '_templates'), parent = args.where.AND.find((entry) => entry.name === '_parent');
    const rows = records.items.filter((item) => [item.template?.id, ...(item.template?.baseTemplateIds ?? [])].some((value) => data.normalizeInvestmentId(value) === template.value) && data.normalizeInvestmentId(item.parent?.id) === parent.value);
    const offset = Number(args.after ?? 0), hasNext = offset + args.first < rows.length;
    const result = { search: { total: rows.length, results: rows.slice(offset, offset + args.first), pageInfo: { hasNext, endCursor: hasNext ? String(offset + args.first) : null } } };
    return change ? change(result, name, args) : result;
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
const collection = (records) => ({ complete: true, scope, baseTemplateId: bindings.investmentTemplateId, items: records.items });
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
  assert.equal(result.active[0], records.items[0]); assert.equal(result.active[0].logo, records.items[0].logo); assert.equal(result.active[0].investmentStatus, records.items[0].investmentStatus);
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

test('collection is reusable on another actual page but rejects foreign sites, owners and name-only template impostors', async () => {
  const reusable = dataset(); reusable.root.path = `${bindings.siteRootPath}/Home/another/portfolio-page`;
  assert.equal((await read(reusable)).result.active.length, 19);
  for (const mutate of [(x) => { x.root.path = '/sitecore/content/unrelated/Home'; }, (x) => { x.root.path = `${bindings.siteRootPath}/Homeward`; },
    (x) => { x.datasource.parent.parent.id = id(999); }, (x) => { x.datasource.template = { name: 'InvestmentPortfolio', id: id(999) }; },
    (x) => { x.datasource.parent.name = 'Other'; }, (x) => { x.root.id = id(999); }]) {
    const records = dataset(); mutate(records); const { result, calls } = await read(records); assert.equal(result.error, 'invalid-scope'); assert.equal(calls.length, 1);
  }
  for (const override of [{ language: 'en"bad' }, { site: { name: 'foreign' } }]) {
    const { result, calls } = await read(dataset(), undefined, {}, layout(override)); assert.equal(result.error, 'invalid-scope'); assert.equal(calls.length, 0);
  }
});

test('inherited Investment templates participate through native query provenance, with direct-parent boundary', async () => {
  const records = dataset(); records.items[0].template = { id: id(501), baseTemplateIds: [bindings.investmentTemplateId] };
  records.items[1].template = { id: id(502), baseTemplateIds: [bindings.investmentTemplateId, id(501)] };
  const unrelated = structuredClone(records.items[0]); unrelated.id = id(503); unrelated.template = { id: id(504), name: 'Investment', baseTemplateIds: [] }; records.items.push(unrelated);
  const nested = structuredClone(records.items[0]); nested.id = id(505); nested.parent.id = records.items[0].id; records.items.push(nested);
  const { result, calls } = await read(records); assert.equal(result.active.length + result.exited.length, 28);
  assert.equal(result.active[0], records.items[0]);
  assert.ok(calls.filter((call) => call.args.where).every((call) => call.args.where.AND.some((entry) => entry.name === '_templates' && entry.operator === 'CONTAINS')));
  const invalid = await read(dataset(), (response, name) => { if (name === 'InvestmentPortfolioItems') response.search.results[0] = { ...response.search.results[0], parent: { id: id(999) } }; return response; });
  assert.equal(invalid.result.complete, false); assert.deepEqual(invalid.result.active, []);
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
  const { result, calls } = await read(records); assert.equal(result.active[0], records.items[0]);
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

test('editable root and child Field metadata survives the actual SDK editing renderer, including cleared optional fields', () => {
  const records = dataset(), result = select(records); records.datasource.activeHeading.jsonValue.value = '';
  records.items[0].details.jsonValue.value = ''; records.items[0].logo.jsonValue.value = { src: '', alt: '' }; records.items[0].websiteLink.jsonValue.value = { href: '', text: '' };
  const before = JSON.stringify(records), html = decode(render(result, records.datasource, true));
  for (const name of ['activeHeading', 'exitedHeading', 'name', 'details', 'logo', 'websiteLink']) assert.ok(html.includes(`"fieldId":"test-${name}"`), name);
  assert.ok(html.includes(`"itemId":"${records.items[0].id}"`)); assert.equal(JSON.stringify(records), before);
  const normal = render(result, records.datasource); assert.doesNotMatch(normal, /alt="Blaise"|Go to Blaise|Add or edit Investment/);
});

test('unavailable and empty collections preserve authored headings and never use manual or source-fixture children', async () => {
  const records = dataset(); records.datasource.children = { results: records.items };
  const unavailable = render(data.unavailableInvestmentPortfolio('unconfigured'), records.datasource, true);
  assert.match(unavailable, /Configure the verified native/); assert.doesNotMatch(unavailable, /Blaise|Dili/); assert.match(unavailable, /Active Investments/);
  const empty = { ...records, items: [] }, { result, calls } = await read(empty);
  assert.equal(result.complete, true); assert.equal(calls.length, 2); assert.deepEqual(result.active, []); assert.deepEqual(result.exited, []);
  const html = render(result, records.datasource); assert.doesNotMatch(html, /temporarily unavailable|Blaise|<img/); assert.match(html, /Exited investments/);
  assert.match(render(undefined, undefined), /Add a datasource for Investment Portfolio/);
});

test('queries parse, escape cursors, use compact editable field projections and never assume finite row counts', () => {
  parse(data.buildInvestmentPortfolioScopeQuery(scope));
  const query = data.buildInvestmentPortfolioSearchQuery(scope, bindings, 'cursor"\\escaped'); parse(query);
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

test('unsafe or deliberately unlabelled company CTAs never become clickable visitor links and remain editor-reported', () => {
  const records = dataset(); records.items = records.items.slice(0, 1);
  records.items[0].websiteLink.jsonValue.value = { href: 'javascript:alert(1)', text: 'unsafe' };
  let result = select(records); assert.doesNotMatch(render(result, records.datasource), /javascript:|class="a-link"/);
  assert.match(render(result, records.datasource, true), /without embedded credentials/);
  records.items[0].websiteLink.jsonValue.value = { href: 'https://valid-company.example/', text: '' };
  result = select(records); assert.doesNotMatch(render(result, records.datasource), /class="a-link"/);
  const editing = decode(render(result, records.datasource, true)); assert.match(editing, /accessible link label/); assert.match(editing, /"fieldId":"test-websiteLink"/);
});
