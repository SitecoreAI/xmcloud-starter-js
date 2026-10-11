import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url), ts = require('typescript');
const { parse } = require('graphql'), { ClientError } = require('graphql-request');
const { ComponentPropsService } = require('@sitecore-content-sdk/nextjs');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), modules = new Map();
function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
  compiled.require = (specifier) => {
    if (specifier === 'server-only') return {};
    if (specifier.startsWith('.')) return load(path.resolve(path.dirname(filename), `${specifier}.ts`));
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, filename);
  return compiled.exports;
}
const data = load(path.join(sourceRoot, 'lib/ventures-team-data.ts'));
const { enrichVenturesTeamComponentMap, createVenturesTeamServer } = load(path.join(sourceRoot, 'lib/ventures-team-server.ts'));
const id = (n) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
// Native template IDs are verified; synthetic item IDs remain confined to these test fixtures.
const bindings = { datasourceTemplateId: '22B14DAC-84AD-4D93-83EF-4AA5A958E554', listingTemplateId: '957B8746-E591-4140-B021-BEEB040BC053' };
const home = '/sitecore/content/allianz/allianz-life/Home';
const source = [
  { name: 'Collin Bhojwani', slug: 'collin-bhojwani', pageId: '28D33103-FDC6-42C5-A621-A1496E3B907E', biographyId: 'A5352B71-3311-4DFB-8A5B-001AF2F9B2A3',
    role: 'Head of Allianz Life Ventures', canonicalRole: 'Managing Director',
    summary: 'Collin leads the Ventures program, shaping investment strategy and forging partnerships that advance the long‑term priorities of Allianz Life.',
    focus: ['Investment strategy and portfolio direction', 'Partnerships aligned to enterprise priorities', 'Founder support and long‑term value creation'],
    bioLinkText: "View Collin's bio", social: 'https://www.linkedin.com/in/collin-bhojwani/',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/3382a990da5c4fc2a5f874398e9a0290?v=c84d72f7', alt: 'collin bhojwani', width: '768', height: '960' } },
  { name: 'Ron Gonen', slug: 'ron-gonen', pageId: '663C4CEA-343B-4050-A2A4-174CC8DB9933', biographyId: 'C0A932D8-9F09-49F8-B825-EF0B87AA1D5E',
    role: 'Managing Director', canonicalRole: 'Managing Director',
    summary: 'Ron sources and evaluates new investment opportunities while supporting portfolio companies with strategic guidance and venture experience.',
    focus: ['Deal sourcing and evaluation', 'Portfolio support and growth strategy', 'Market and technology insights'],
    bioLinkText: "View Ron's bio", social: 'https://www.linkedin.com/in/rongonen/',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/9dde33e00c044699bed91ef3323b3681?v=8057c8f9', alt: 'ron gonen', width: '768', height: '960' } },
  { name: 'Taylor Sieverling', slug: 'taylor-sieverling', pageId: '04CE0ACF-6EE6-4770-ACE5-AB2052243D7C', biographyId: 'EDB4DA37-AA2D-42B4-90C7-8CB8AD7FE812',
    role: 'Senior Analyst', canonicalRole: 'Senior Analyst',
    summary: 'Taylor supports sourcing, analysis, and portfolio management, helping assess emerging technologies and new market opportunities.',
    focus: ['Deal sourcing and evaluation', 'Financial and strategic analysis', 'Portfolio monitoring and reporting'],
    bioLinkText: "View Taylor's bio", social: 'https://www.linkedin.com/in/taylor-sieverling',
    portrait: { src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/17c1d4bb13db448ba905ce9b4b44887c?v=67379090', width: '768', height: '960' } },
  { name: 'Clay Bottensek', slug: 'clay-bottensek', pageId: '241A667E-C7BE-4863-A694-34D56790264C', biographyId: '80DB5A2A-730E-45B4-BFF7-69B7395BA304',
    role: 'Ventures Analyst', canonicalRole: 'Ventures Analyst',
    summary: 'Clay supports Ventures investment activities, helping source and evaluate innovative startups and emerging technologies.',
    focus: ['Insurtech, fintech, and AI startups', 'Venture capital market and technology trends', 'Early-stage company evaluation and due diligence'],
    bioLinkText: 'View Clay’s bio', social: 'https://www.linkedin.com/in/clay-bottensek/', portrait: {} },
];
const field = (value, name, itemId, fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: { fieldType, fieldId: `test-${name}`, itemId } } });
const scope = { rootId: data.VENTURES_TEAM_PAGE_ID, datasourceId: id(1), language: 'en' };
function dataset() {
  const root = { id: scope.rootId, path: `${home}/about/ventures/team`, url: { path: '/about/ventures/team' } };
  const datasource = { id: scope.datasourceId, path: `${root.path}/Data/Ventures team`, template: { id: bindings.datasourceTemplateId }, parent: { name: 'Data', parent: { id: root.id } }, profiles: field(source.map((row) => row.pageId).join('|'), 'profiles', scope.datasourceId, 'Treelist') };
  const profiles = source.map((row, i) => {
    const page = { id: row.pageId, path: `${home}/about/ventures/${row.slug}`, url: { path: `/about/ventures/${row.slug}` }, template: { id: data.VENTURES_BIOGRAPHY_BASE_TEMPLATE_ID } };
    const biography = { id: row.biographyId, path: `${page.path}/Data/Expert Biography`, template: { id: data.VENTURES_BIOGRAPHY_TEMPLATE_ID }, parent: { name: 'Data', parent: { id: page.id } },
      name: field(row.name, 'name', row.biographyId), role: field(`<div>${row.canonicalRole}</div>\n<div>Allianz Life Ventures</div>`, 'role', row.biographyId, 'Rich Text'), portrait: field(structuredClone(row.portrait), 'portrait', row.biographyId, 'Image'),
      focus: field(`<ul><li>Visible detail focus ${i}</li></ul>`, 'focus', row.biographyId, 'Rich Text'), biography: field(`<p>Visible detail biography ${i}</p>`, 'biography', row.biographyId, 'Rich Text'), downloadLink: field({ href: `/allianz-assets/detail-${i}.pdf`, text: 'Download bio', target: '_blank' }, 'downloadLink', row.biographyId, 'General Link') };
    const listingId = id(200 + i), listing = { id: listingId, path: `${page.path}/Data/Team Listing`, template: { id: bindings.listingTemplateId }, parent: { name: 'Data', parent: { id: page.id } },
      roleMode: field('override', 'teamListingRoleMode', listingId), listingRole: field(row.role, 'teamListingRole', listingId), summary: field(`<p>${row.summary}</p>`, 'teamListingSummary', listingId, 'Rich Text'),
      focus: field(`<p>Focus areas:</p><ul>${row.focus.map((text) => `<li>${text}</li>`).join('')}</ul>`, 'teamListingFocus', listingId, 'Rich Text'), bioLinkText: field(row.bioLinkText, 'teamBioLinkText', listingId), socialLink: field({ href: row.social, text: `Connect with ${row.name.split(' ')[0]} on LinkedIn`, target: '_blank' }, 'teamSocialLink', listingId, 'General Link') };
    page.rendered = { sitecore: { context: { language: 'en', site: { name: 'allianz-life' } }, route: { itemId: page.id, placeholders: { 'headless-main': [{ componentName: 'ExpertBiography', dataSource: biography.path, fields: { data: { datasource: biography } } }] } } } };
    return { page, biography, listing };
  });
  return { root, datasource, profiles };
}
function queryInfo(query) {
  const operation = parse(query).definitions[0];
  return { name: operation.name.value, selections: operation.selectionSet.selections.map((node) => ({ alias: node.alias?.value ?? node.name.value, args: Object.fromEntries(node.arguments.map((arg) => [arg.name.value, arg.value.value])) })) };
}
function nativeBiography(row) {
  const { id, path, template, parent, name, role, portrait } = row;
  return { id, path, template, parent, name, role, portrait };
}
function harness(records, change) {
  const calls = [];
  const client = Object.assign(Object.create(SitecoreClient.prototype), { componentPropsService: new ComponentPropsService(), graphQLClient: {
    async request(query, variables, fetchOptions) {
      const info = queryInfo(query), requested = info.selections[0].args.path; calls.push({ query, ...info, variables, fetchOptions });
      let response;
      const same = (value) => data.normalizeVenturesTeamId(value) && data.normalizeVenturesTeamId(value) === data.normalizeVenturesTeamId(requested) || typeof value === 'string' && value.toLowerCase() === requested.toLowerCase();
      if (info.name === 'VenturesTeamScope') response = { root: records.root, datasource: records.datasource };
      else if (info.name === 'VenturesTeamPage') response = { page: records.profiles.find((row) => same(row.page.id))?.page };
      else if (info.name === 'VenturesTeamBiography') { const row = records.profiles.find((row) => same(row.biography.id) || same(row.biography.path)); response = { biography: row && nativeBiography(row.biography) }; }
      else if (info.name === 'VenturesTeamListing') response = { listing: records.profiles.find((row) => same(row.listing.path))?.listing };
      else throw new Error('Unexpected test query');
      return change ? change(response, info.name, info, calls) : response;
    },
  } });
  return { client, calls };
}
function layout(records, { repeat = false, datasourcePath = false, context = {} } = {}) {
  const rendering = { componentName: 'VenturesTeam', dataSource: datasourcePath ? records.datasource.path : records.datasource.id, uid: 'team', fields: { data: { datasource: { id: records.datasource.id } } } };
  return { sitecore: { context: { language: 'en', site: { name: 'allianz-life' }, ...context }, route: { itemId: records.root.id, placeholders: { 'headless-main': [rendering, ...(repeat ? [{ ...rendering, uid: 'repeat' }] : [])] } } } };
}
function componentMap(dynamic = false) {
  return new Map([['VenturesTeam', dynamic ? { componentType: 'client', dynamicModule: async () => ({ Default: () => null }) } : { componentType: 'client', Default: () => null }]]);
}
async function read(records = dataset(), change, options = {}, layoutOptions = {}, dynamic = false) {
  const { client, calls } = harness(records, change);
  const map = enrichVenturesTeamComponentMap(componentMap(dynamic), { bindings, getData: client.getData.bind(client), ...options });
  const props = await client.getComponentData(layout(records, layoutOptions), {}, map);
  return { result: props.team.automaticVenturesTeam, props, calls };
}

test('actual installed SDK resolves four page-backed profiles, canonical fields, source order and exact page URLs', async () => {
  const records = dataset(), before = JSON.stringify(records), { result, calls } = await read(records);
  assert.equal(result.complete, true); assert.equal(result.status, 'ready'); assert.equal(result.items.length, 4);
  assert.deepEqual(result.items.map((row) => row.href), source.map((row) => `/about/ventures/${row.slug}`));
  assert.deepEqual(result.items.map((row) => row.name.jsonValue.value), source.map((row) => row.name));
  assert.deepEqual(result.items.map((row) => row.role.jsonValue.value), source.map((row) => row.role));
  for (const [i, row] of result.items.entries()) {
    assert.equal(row.name, records.profiles[i].biography.name); assert.equal(row.portrait, records.profiles[i].biography.portrait);
    assert.equal(row.summary, records.profiles[i].listing.summary); assert.equal(row.focus, records.profiles[i].listing.focus);
    assert.equal(row.bioLinkText.jsonValue.value, source[i].bioLinkText); assert.equal(row.socialLink.jsonValue.value.href, source[i].social);
    assert.equal(row.roleFormat, 'text'); assert.equal(Object.hasOwn(row, 'downloadLink'), false);
  }
  assert.deepEqual(result.items[3].portrait.jsonValue.value, {}); assert.equal(Object.hasOwn(result.items[2].portrait.jsonValue.value, 'alt'), false);
  assert.equal(JSON.stringify(records), before); assert.equal(calls.length, 13);
});

test('canonical name and portrait edits propagate on a fresh request; listing-only edits preserve every detail field', async () => {
  const records = dataset(), detailBefore = JSON.stringify(records.profiles.map((row) => row.biography));
  records.profiles[0].listing.listingRole.jsonValue.value = 'Listing role changed'; records.profiles[0].listing.summary.jsonValue.value = '<p>Listing summary changed</p>';
  records.profiles[0].listing.focus.jsonValue.value = '<p>Listing focus changed</p>'; records.profiles[0].listing.bioLinkText.jsonValue.value = 'Open biography';
  let result = (await read(records)).result;
  assert.equal(result.items[0].role.jsonValue.value, 'Listing role changed'); assert.equal(result.items[0].bioLinkText.jsonValue.value, 'Open biography');
  assert.equal(JSON.stringify(records.profiles.map((row) => row.biography)), detailBefore);
  records.profiles[0].biography.name.jsonValue.value = 'Canonical name changed'; records.profiles[0].biography.portrait.jsonValue.value.src = 'https://example.test/new-portrait.png';
  result = (await read(records)).result; assert.equal(result.items[0].name.jsonValue.value, 'Canonical name changed'); assert.equal(result.items[0].portrait.jsonValue.value.src, 'https://example.test/new-portrait.png');
  assert.match(records.profiles[0].biography.role.jsonValue.value, /Managing Director/); assert.doesNotMatch(records.profiles[0].biography.role.jsonValue.value, /Listing role changed/);
});

test('shared, override and hidden role modes keep intentional clears without synthesizing content', async () => {
  const records = dataset(); records.profiles[0].listing.roleMode.jsonValue.value = ''; records.profiles[1].listing.roleMode.jsonValue.value = 'shared';
  records.profiles[2].listing.roleMode.jsonValue.value = 'hidden'; records.profiles[3].listing.listingRole.jsonValue.value = '';
  const { result } = await read(records); assert.equal(result.complete, true);
  for (const i of [0, 1]) { assert.equal(result.items[i].role, records.profiles[i].biography.role); assert.equal(result.items[i].roleFormat, 'rich-text'); }
  assert.equal(Object.hasOwn(result.items[2], 'role'), false); assert.equal(result.items[3].role.jsonValue.value, '');
  const cleared = dataset(); for (const key of ['summary', 'focus', 'bioLinkText']) cleared.profiles[0].listing[key].jsonValue.value = '';
  cleared.profiles[0].listing.socialLink.jsonValue.value = {}; cleared.profiles[0].biography.name.jsonValue.value = ''; cleared.profiles[0].biography.portrait.jsonValue.value = {};
  const empty = (await read(cleared)).result; assert.equal(empty.complete, true); assert.equal(empty.items[0].summary.jsonValue.value, ''); assert.deepEqual(empty.items[0].socialLink.jsonValue.value, {});
});

test('ordered selection changes do not reorder by names, fixture order, IDs or canonical details', async () => {
  const records = dataset(); records.datasource.profiles = { jsonValue: { value: [source[3].pageId, { id: source[1].pageId }, source[0].pageId] } };
  const result = (await read(records)).result; assert.deepEqual(result.items.map((row) => row.name.jsonValue.value), ['Clay Bottensek', 'Ron Gonen', 'Collin Bhojwani']);
  records.datasource.profiles = { jsonValue: [{ id: source[2].pageId }, { id: source[0].pageId }] };
  assert.deepEqual((await read(records)).result.items.map((row) => row.href), ['/about/ventures/taylor-sieverling', '/about/ventures/collin-bhojwani']);
});

test('cleared selections stay empty, while absent, malformed, duplicate and unresolved references fail with zero partial rows', async () => {
  for (const value of ['', []]) { const records = dataset(); records.datasource.profiles = { jsonValue: { value }, targetItems: records.profiles.map((row) => row.page) };
    const { result, calls } = await read(records); assert.equal(result.complete, true); assert.deepEqual(result.items, []); assert.equal(calls.length, 1); }
  for (const value of [undefined, null, { jsonValue: null }, { jsonValue: { value: null } }, { jsonValue: 'bad-id' }, { jsonValue: `${source[0].pageId}|bad` }, { jsonValue: `${source[0].pageId}|${source[0].pageId}` }, { jsonValue: [source[0].pageId, {}] }, { jsonValue: id(999) }]) {
    const records = dataset(); records.datasource.profiles = value; const { result } = await read(records); assert.equal(result.complete, false); assert.deepEqual(result.items, []);
  }
});

test('unverified new templates remain unbound with no CMS queries, including under installed lazy modules', async () => {
  for (const value of [undefined, {}, { ...bindings, listingTemplateId: 'proposed' }, { ...bindings, datasourceTemplateId: 'new-template' }, { ...bindings, biographyPageTemplateId: 'unknown' }]) {
    const { result, calls } = await read(dataset(), undefined, { bindings: value }, {}, true); assert.equal(result.error, 'unbound'); assert.equal(calls.length, 0);
  }
});

test('same page-owned native datasource GUIDs and paths resolve; foreign sites, roots, templates and ownership reject', async () => {
  assert.equal((await read(dataset(), undefined, {}, { datasourcePath: true })).result.complete, true);
  for (const context of [{ language: 'en"bad' }, { site: { name: 'foreign' } }]) { const { result, calls } = await read(dataset(), undefined, {}, { context }); assert.equal(result.error, 'invalid-scope'); assert.equal(calls.length, 0); }
  for (const mutate of [(r) => { r.root.id = id(999); }, (r) => { r.root.path = `${home}/about/other`; }, (r) => { r.root.url.path = '/about/other'; },
    (r) => { r.datasource.parent.parent.id = id(999); }, (r) => { r.datasource.template.id = id(999); }, (r) => { r.datasource.parent.name = 'Other'; }]) {
    const records = dataset(); mutate(records); const { result } = await read(records); assert.equal(result.error, 'invalid-scope'); assert.deepEqual(result.items, []);
  }
});

test('canonical biography source must be unique, actually bound, correct template and owned by the selected native page', async () => {
  const guid = dataset(); guid.profiles[0].page.rendered = JSON.stringify(guid.profiles[0].page.rendered);
  const serialized = JSON.parse(guid.profiles[0].page.rendered); serialized.sitecore.route.placeholders['headless-main'][0].dataSource = guid.profiles[0].biography.id; guid.profiles[0].page.rendered = serialized;
  assert.equal((await read(guid)).result.complete, true);
  const nested = dataset(), row = nested.profiles[0]; row.page.rendered.sitecore.route.placeholders = { 'headless-main': [{ componentName: 'Container', placeholders: { content: [{ componentName: 'ExpertBiography', dataSource: row.biography.path }] } }] };
  assert.equal((await read(nested)).result.complete, true);
  for (const mutate of [
    (r) => { r.profiles[0].page.rendered = null; }, (r) => { r.profiles[0].page.template.id = id(999); },
    (r) => { r.profiles[0].page.url.path = '/about/ventures/../bad'; }, (r) => { r.profiles[0].page.rendered.sitecore.context.language = 'de'; },
    (r) => { r.profiles[0].page.rendered.sitecore.route.itemId = id(999); }, (r) => { r.profiles[0].page.rendered.sitecore.route.placeholders = {}; },
    (r) => { r.profiles[0].page.rendered.sitecore.route.placeholders['headless-main'].push(r.profiles[0].page.rendered.sitecore.route.placeholders['headless-main'][0]); },
    (r) => { r.profiles[0].page.rendered.sitecore.route.placeholders['headless-main'][0].dataSource = r.profiles[1].biography.path; },
    (r) => { r.profiles[0].page.rendered.sitecore.route.placeholders['headless-main'][0].dataSource = r.profiles[1].biography.id; },
    (r) => { r.profiles[0].biography.parent.parent.id = r.profiles[1].page.id; }, (r) => { r.profiles[0].biography.template.id = id(999); },
  ]) { const records = dataset(); mutate(records); const { result } = await read(records); assert.equal(result.complete, false); assert.deepEqual(result.items, []); }
});

test('every selected page needs complete native listing fields and the correctly owned Team Listing child', async () => {
  for (const mutate of [(r) => { r.profiles[0].listing.path = `${r.profiles[0].page.path}/Data/Other Listing`; }, (r) => { r.profiles[0].listing.template.id = id(999); },
    (r) => { r.profiles[0].listing.parent.parent.id = id(999); }, (r) => { r.profiles[0].listing.roleMode.jsonValue.value = 'default'; },
    (r) => { r.profiles[0].biography.portrait.jsonValue.value.src = 42; }, (r) => { r.profiles[0].listing.socialLink.jsonValue.value.href = 42; }]) {
    const records = dataset(); mutate(records); const result = (await read(records)).result; assert.equal(result.complete, false); assert.deepEqual(result.items, []);
  }
  for (const key of ['roleMode', 'listingRole', 'summary', 'focus', 'bioLinkText', 'socialLink']) {
    const records = dataset(); delete records.profiles[3].listing[key]; const result = (await read(records)).result; assert.equal(result.complete, false); assert.deepEqual(result.items, []);
  }
  for (const key of ['name', 'role', 'portrait']) { const records = dataset(); delete records.profiles[0].biography[key]; const result = (await read(records)).result; assert.equal(result.complete, false); assert.deepEqual(result.items, []); }
});

test('per-request caching handles repeated placements and never carries canonical edits into the next request', async () => {
  const records = dataset(), { result, props, calls } = await read(records, undefined, {}, { repeat: true }, true);
  assert.equal(result, props.repeat.automaticVenturesTeam); assert.equal(calls.length, 13);
  records.profiles[0].biography.name.jsonValue.value = 'Fresh author edit'; assert.equal((await read(records)).result.items[0].name.jsonValue.value, 'Fresh author edit');
  const hook = createVenturesTeamServer({ bindings, getData: async () => { throw Error('should not query'); } });
  const invalid = await hook({ dataSource: '/sitecore/content/foreign/Data/Team' }, layout(records)); assert.equal(invalid.automaticVenturesTeam.error, 'invalid-scope');
});

test('selection requires matching complete provenance and exact selected page order', async () => {
  const records = dataset(), { client } = harness(records), ids = source.map((row) => data.normalizeVenturesTeamId(row.pageId));
  const collection = await data.collectVenturesTeamProfiles(client.getData.bind(client), scope, bindings, ids); assert.equal(data.selectVenturesTeam(scope, bindings, collection).items.length, 4);
  for (const mutate of [(c) => { c.complete = false; }, (c) => { c.scope.language = 'de'; }, (c) => { c.scope.datasourceId = id(999); },
    (c) => { c.listingTemplateId = id(999); }, (c) => { c.selectedIds.reverse(); }, (c) => { c.profiles.pop(); }]) {
    const value = structuredClone(collection); mutate(value); assert.throws(() => data.selectVenturesTeam(scope, bindings, value));
  }
});

test('request failures expose fixed diagnostic categories and stages, never SDK request headers, response content or partial rows', async () => {
  for (const [operation, stage] of [['VenturesTeamScope', 'scope-request'], ['VenturesTeamPage', 'profile-request'], ['VenturesTeamBiography', 'biography-request'], ['VenturesTeamListing', 'listing-request']]) {
    const { result } = await read(dataset(), (response, name) => { if (name === operation) throw new ClientError({ status: 200, headers: new Headers({ 'content-type': 'application/json' }), data: response, errors: [{ message: 'Query is too complex to execute.', extensions: { code: 'INVALID_OPERATION' } }] }, { query: 'private transport document', variables: { token: 'private-token' }, headers: { authorization: 'secret' } }); return response; });
    assert.equal(result.complete, false); assert.equal(result.failureStage, stage); assert.equal(result.failureKind, 'complexity-limit'); assert.equal(result.httpStatus, 200); assert.deepEqual(result.items, []);
    assert.doesNotMatch(JSON.stringify(result), /private|secret|transport|Collin|too complex|"(?:headers|query|variables|request|response)"\s*:/);
  }
});

test('queries parse supported item/field/rendered schema; canonical projection excludes detail content and production imports no fixture data', () => {
  for (const query of [data.buildVenturesTeamScopeQuery(scope), data.buildVenturesTeamPageQuery(source[0].pageId, 'en'), data.buildVenturesTeamListingQuery(`${home}/about/ventures/collin-bhojwani`, 'en'), data.buildVenturesTeamBiographyQuery(`${home}/about/ventures/collin-bhojwani/Data/Expert Biography`, 'en')]) parse(query);
  const scopeDocument = parse(data.buildVenturesTeamScopeQuery(scope));
  const datasourceProjection = scopeDocument.definitions[0].selectionSet.selections.find((node) => node.alias?.value === 'datasource');
  const profilesProjection = datasourceProjection.selectionSet.selections.find((node) => node.alias?.value === 'profiles');
  assert.equal(profilesProjection.name.value, 'field');
  assert.deepEqual(profilesProjection.arguments.map((arg) => [arg.name.value, arg.value.value]), [['name', '33c1daa9-7214-4f94-8e5b-c20dedc57d33']]);
  assert.equal(data.VENTURES_TEAM_PROFILES_FIELD_ID, '33c1daa9-7214-4f94-8e5b-c20dedc57d33');
  assert.equal(data.validVenturesTeamBindings(bindings), true);
  const listingDocument = parse(data.buildVenturesTeamListingQuery(`${home}/about/ventures/collin-bhojwani`, 'en'));
  const listingProjection = listingDocument.definitions[0].selectionSet.selections.find((node) => node.alias?.value === 'listing');
  const listingFields = listingProjection.selectionSet.selections.filter((node) => node.name.value === 'field');
  const expectedListingFields = {
    roleMode: '0ce2e70e-5abd-4819-9e57-2b422cf08615',
    listingRole: '1ba806dc-2db9-4052-bd88-59d8508f58a5',
    summary: '8c25bd44-db7a-4454-8c8f-ad7b1d3eb790',
    focus: 'bc3cebb8-418b-4a96-a8bb-ae3398274ca9',
    bioLinkText: 'cd5b6979-c8cf-4cb1-add5-101bc3bfe2f6',
    socialLink: '4e447395-1f2d-4dcd-9b2b-0973809ff347',
  };
  assert.deepEqual(Object.fromEntries(listingFields.map((node) => [node.alias.value, node.arguments[0].value.value])), expectedListingFields);
  for (const node of listingFields) {
    assert.equal(node.arguments.length, 1); assert.equal(node.arguments[0].name.value, 'name');
    assert.deepEqual(node.selectionSet.selections.map((field) => field.name.value), ['jsonValue']);
  }
  const { listingRole, ...sameAliases } = expectedListingFields;
  assert.deepEqual(data.VENTURES_TEAM_LISTING_FIELD_IDS, { ...sameAliases, role: listingRole });
  const query = data.buildVenturesTeamBiographyQuery(source[0].biographyId, 'en'); assert.doesNotMatch(query, /focus:|biography: field|downloadLink:|directory/);
  for (const fieldId of Object.values(data.VENTURES_CANONICAL_FIELD_IDS)) assert.ok(query.includes(fieldId));
  for (const filename of ['ventures-team-data.ts', 'ventures-team-server.ts']) assert.doesNotMatch(fs.readFileSync(path.join(sourceRoot, 'lib', filename), 'utf8'), /NATIVE-BASELINE|native-content|fixtures\.json|collin-bhojwani|ron-gonen|taylor-sieverling|clay-bottensek|teamBiographySource/);
});
