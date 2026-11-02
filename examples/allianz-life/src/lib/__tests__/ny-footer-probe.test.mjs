import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { SitecoreClient } = require('@sitecore-content-sdk/nextjs/client');
const sourceFile = fileURLToPath(new URL('../allianz-ny-footer-probe.ts', import.meta.url));
const compiled = new Module(sourceFile);
compiled.filename = sourceFile;
compiled.paths = Module._nodeModulePaths(path.dirname(sourceFile));
compiled._compile(ts.transpileModule(fs.readFileSync(sourceFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, sourceFile);
const { summarizeNyFooterProbe: summarize } = compiled.exports;

const OWNER = '1A13FF5E-35DD-4468-8B21-5C149140F127';
const PIMCO = '3DEF0D8F-31E3-4EEB-9413-DE850D3D1B9F';
const GROUP = 'A02BFA68-1C77-43BC-B745-F4C0A05E740C';
const PIMCO_URL = 'https://www.pimco.com/us/en';
const GROUP_URL = 'https://www.allianz.com/en_GB.html';
const ROUTES = {
  '/new-york': '214D3628E161533797F72F74DB7DD027',
  '/new-york/about': '44A05D23855849DAA95AC586AC19189A',
  '/new-york/annuities': '98AB9D72554D453DB8D7AF46AF20AB61',
};
const leaf = (id, href) => ({ id, link: { jsonValue: { value: { href, anchor: '', querystring: '', target: '' } } } });
const footer = (pimco = PIMCO_URL, group = GROUP_URL) => ({
  componentName: 'AllianzLegacyFooter', dataSource: OWNER, uid: 'synthetic-footer',
  fields: { data: { datasource: { id: OWNER, primaryNav: { targetItems: [
    { id: 'synthetic-group', children: { results: [leaf(PIMCO, pimco), leaf(GROUP, group)] } },
  ] } } } },
});
const layout = (renderings = [footer()], routePath = '/new-york') => ({ sitecore: {
  context: { site: { name: 'allianz-life' }, language: 'en' },
  route: { itemId: ROUTES[routePath], placeholders: { 'headless-footer': renderings } },
} });
const datasource = value => value.fields.data.datasource;
const entries = value => datasource(value).primaryNav.targetItems[0].children.results;
const field = (value, index = 0) => entries(value)[index].link.jsonValue.value;
const summarizeFooter = value => summarize(layout([value]), '/new-york');
const noPositiveLinks = view => {
  assert.equal(view.pimco.hrefCorrect, false);
  assert.equal(view.allianzGroup.hrefCorrect, false);
};

test('projects only the exact native route, footer and two primary-navigation leaves', () => {
  const value = layout();
  const before = JSON.stringify(value);
  const result = summarize(value, '/new-york');
  assert.equal(result.scope, 'allowed');
  assert.equal(result.current.status, 'complete');
  assert.equal(result.current.pimco.status, 'correct');
  assert.equal(result.current.allianzGroup.status, 'correct');
  assert.deepEqual(result.current, result.effectiveDefault);
  assert.equal(JSON.stringify(value), before);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
});

for (const [routePath, routeId] of Object.entries(ROUTES)) {
  test(`supports a Page envelope and the verified ${routePath} identity`, () => {
    const value = layout([footer()], routePath);
    value.sitecore.route.itemId = `{${routeId.toLowerCase()}}`;
    const result = summarize({ layout: value }, routePath.slice(1).split('/'));
    assert.equal(result.scope, 'allowed');
    assert.equal(result.current.pimco.hrefCorrect, true);
  });
}

test('actual installed SDK default selection changes the fixed projection without another read', async () => {
  const original = footer();
  original.experiences = { _default: footer('#demo-unavailable', '#demo-unavailable') };
  const raw = layout([original]);
  const originalJSON = JSON.stringify(raw);
  let reads = 0;
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    initOptions: { defaultSite: 'allianz-life', defaultLanguage: 'en', rewriteMediaUrls: false },
    layoutService: { async fetchLayoutData() { reads += 1; return structuredClone(raw); } },
  });
  const before = summarize(raw, '/new-york');
  const page = await client.getPage('/new-york', { site: 'allianz-life', locale: 'en' });
  const after = summarize(page, '/new-york');
  assert.equal(reads, 1);
  assert.equal(before.current.pimco.status, 'correct');
  assert.equal(before.effectiveDefault.pimco.status, 'unavailable');
  assert.equal(before.effectiveDefault.footerDefaultSelected, true);
  assert.equal(after.variantDefault, true);
  assert.equal(after.current.pimco.status, 'unavailable');
  assert.notEqual(before.digest, after.digest);
  assert.equal(JSON.stringify(raw), originalJSON);
});

test('default selection on an ancestor replaces its entire nested footer branch', async () => {
  const ancestor = { componentName: 'PartialDesignDynamicPlaceholder',
    placeholders: { nested: [footer()] }, experiences: {
      _default: { componentName: 'PartialDesignDynamicPlaceholder', placeholders: {
        nested: [footer('#demo-unavailable', GROUP_URL)],
      } },
    } };
  const raw = layout([ancestor]);
  const before = summarize(raw, '/new-york');
  assert.equal(before.current.pimco.status, 'correct');
  assert.equal(before.effectiveDefault.pimco.status, 'unavailable');
  assert.equal(before.effectiveDefault.ancestorDefaultSelected, true);
  assert.equal(before.effectiveDefault.footerDefaultSelected, false);
  const client = Object.assign(Object.create(SitecoreClient.prototype), {
    initOptions: { defaultSite: 'allianz-life', defaultLanguage: 'en', rewriteMediaUrls: false },
    layoutService: { async fetchLayoutData() { return structuredClone(raw); } },
  });
  const selected = summarize(await client.getPage('/new-york', { site: 'allianz-life', locale: 'en' }), '/new-york');
  assert.equal(selected.current.pimco.status, before.effectiveDefault.pimco.status);
});

test('does not activate a named experience when checking the default projection', () => {
  const value = footer();
  value.experiences = { privateNamedVariant: footer('#demo-unavailable', '#demo-unavailable') };
  const result = summarizeFooter(value);
  assert.equal(result.effectiveDefault.pimco.status, 'correct');
  assert.equal(result.effectiveDefault.defaultSelectionCount, 'none');
  assert.doesNotMatch(JSON.stringify(result), /privateNamedVariant/);
});

test('mirrors an SDK hidden default experience without retaining its base footer', () => {
  const value = footer();
  value.experiences = { _default: { componentName: null, dataSource: null } };
  const result = summarizeFooter(value);
  assert.equal(result.current.status, 'complete');
  assert.equal(result.effectiveDefault.status, 'missing');
  noPositiveLinks(result.effectiveDefault);
});

test('captures both ancestor and footer default selection without exposing variant names', () => {
  const selectedFooter = footer();
  selectedFooter.experiences = { _default: footer('#demo-unavailable') };
  const parent = { componentName: 'Container', experiences: { _default: {
    componentName: 'Container', placeholders: { nested: [selectedFooter] },
  } } };
  const result = summarize(layout([parent]), '/new-york').effectiveDefault;
  assert.equal(result.ancestorDefaultSelected, true);
  assert.equal(result.footerDefaultSelected, true);
  assert.equal(result.defaultSelectionCount, 'multiple');
});

test('distinguishes a correct href with an unavailable anchor from a correct destination', () => {
  const value = footer();
  field(value).anchor = 'demo-unavailable';
  const result = summarizeFooter(value).current.pimco;
  assert.equal(result.hrefCorrect, true);
  assert.equal(result.unavailableAnchor, true);
  assert.equal(result.status, 'unavailable');
});

test('a correct nested href is not source-external when authored as an anchor link', () => {
  const value = footer();
  field(value).linktype = 'anchor';
  const result = summarizeFooter(value).current.pimco;
  assert.equal(result.hrefCorrect, true);
  assert.equal(result.linkTypeCategory, 'anchor');
  assert.equal(result.sourceExternal, false);
  assert.notEqual(result.status, 'correct');
});

test('absent linktype requires no native value.id, while explicit external allows it', () => {
  const value = footer();
  field(value).id = '{BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB}';
  const missingType = summarizeFooter(value).current.pimco;
  assert.equal(missingType.linkTypeCategory, 'missing');
  assert.equal(missingType.missingValueId, false);
  assert.equal(missingType.sourceExternal, false);
  assert.notEqual(missingType.status, 'correct');
  field(value).linktype = 'EXTERNAL';
  const explicit = summarizeFooter(value).current.pimco;
  assert.equal(explicit.linkTypeCategory, 'external');
  assert.equal(explicit.sourceExternal, true);
  assert.equal(explicit.status, 'correct');
});

for (const [href, category, status] of [
  ['#demo-unavailable', 'unavailable', 'unavailable'],
  ['https://private-example.invalid/not-approved', 'other', 'other'],
  [PIMCO_URL, 'correct', 'correct'],
  ['', 'empty', 'correct'],
]) {
  test(`classifies a top-level jsonValue.href shadow as ${category}`, () => {
    const value = footer();
    entries(value)[0].link.jsonValue.href = href;
    const result = summarizeFooter(value).current.pimco;
    assert.equal(result.hrefCorrect, true);
    assert.equal(result.topLevelHrefPresent, href !== '');
    assert.equal(result.topLevelHrefCategory, category);
    assert.equal(result.status, status);
    assert.equal(result.topLevelDestinationCorrect, category === 'correct');
    assert.doesNotMatch(JSON.stringify(result), /private-example|not-approved|https?:/);
  });
}

test('a correct shadowing href still rejects its own unavailable anchor, query or target', () => {
  for (const [key, value, unavailable] of [
    ['anchor', 'demo-unavailable', true],
    ['querystring', 'private-token-query', false],
    ['target', '_blank', false],
  ]) {
    const item = footer();
    const rootField = entries(item)[0].link.jsonValue;
    rootField.href = PIMCO_URL;
    rootField[key] = value;
    const result = summarizeFooter(item).current.pimco;
    assert.equal(result.topLevelHrefCategory, 'correct');
    assert.equal(result.topLevelDestinationCorrect, false);
    assert.equal(result.topLevelUnavailable, unavailable);
    assert.notEqual(result.status, 'correct');
    assert.doesNotMatch(JSON.stringify(result), /private-token-query|_blank/);
  }
});

test('malformed linktype, native value.id or top-level href values fail closed privately', () => {
  for (const mutate of [
    value => { field(value).linktype = { secret: 'private-linktype' }; },
    value => { field(value).id = { secret: 'private-id' }; },
    value => { entries(value)[0].link.jsonValue.href = { secret: 'private-shadow' }; },
  ]) {
    const value = footer(); mutate(value);
    const result = summarizeFooter(value);
    assert.equal(result.current.status, 'invalid');
    noPositiveLinks(result.current);
    assert.doesNotMatch(JSON.stringify(result), /private/);
  }
});

test('query values and targets are represented only by fixed correctness booleans', () => {
  const first = footer();
  field(first).querystring = 'private-one';
  field(first).target = '_blank';
  const second = structuredClone(first);
  field(second).querystring = 'private-two';
  const a = summarizeFooter(first), b = summarizeFooter(second);
  assert.equal(a.current.pimco.status, 'other');
  assert.equal(a.current.pimco.queryPresent, true);
  assert.equal(a.current.pimco.sameTab, false);
  assert.equal(a.digest, b.digest);
  assert.doesNotMatch(JSON.stringify(a), /private|_blank|pimco\.com/);
});

test('wrong component, footer owner and explicit source identity cannot impersonate the footer', () => {
  for (const mutate of [
    value => { value.componentName = 'AllianzFooter'; },
    value => { datasource(value).id = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA'; },
    value => { value.dataSource = 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA'; },
  ]) {
    const value = footer(); mutate(value);
    const result = summarizeFooter(value).current;
    assert.notEqual(result.status, 'complete');
    noPositiveLinks(result);
  }
});

test('known leaf IDs outside the exact primaryNav group child path do not count', () => {
  const value = footer();
  datasource(value).unrelated = { secret: entries(value) };
  datasource(value).primaryNav.targetItems = [];
  const result = summarizeFooter(value).current;
  assert.equal(result.status, 'partial');
  noPositiveLinks(result);
});

test('duplicate footer owners fail closed even when both copies are valid', () => {
  const result = summarize(layout([footer(), footer()]), '/new-york').current;
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.footerCount, 'multiple');
  noPositiveLinks(result);
});

test('duplicate leaf IDs across primary groups fail closed', () => {
  const value = footer();
  datasource(value).primaryNav.targetItems.push({ children: { results: [leaf(PIMCO, PIMCO_URL)] } });
  const result = summarizeFooter(value).current;
  assert.equal(result.status, 'ambiguous');
  noPositiveLinks(result);
});

test('unmatched leaf IDs cannot be recovered from correct-looking labels or URLs', () => {
  const value = footer();
  entries(value)[0].id = 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB';
  entries(value)[0].title = { jsonValue: { value: 'PIMCO' } };
  const result = summarizeFooter(value).current;
  assert.equal(result.status, 'partial');
  assert.equal(result.pimco.status, 'missing');
  assert.equal(result.pimco.hrefCorrect, false);
});

test('never executes getters on inspected fields or emits their failure data', () => {
  const value = footer();
  let getterCalls = 0;
  Object.defineProperty(field(value), 'href', { get() { getterCalls += 1; throw Error('private-token'); } });
  const result = summarizeFooter(value);
  assert.equal(getterCalls, 0);
  assert.equal(result.current.status, 'invalid');
  assert.doesNotMatch(JSON.stringify(result), /private-token/);
});

test('ignores unrelated properties, getters, toJSON methods and opaque private errors', () => {
  const value = layout();
  let calls = 0;
  value.headers = { Authorization: 'private-token' };
  value.toJSON = () => { calls += 1; return 'private-payload'; };
  Object.defineProperty(value.sitecore.context, 'secret', { get() { calls += 1; return 'private-cookie'; } });
  const result = summarize(value, '/new-york');
  assert.equal(calls, 0);
  assert.equal(result.digest, summarize(layout(), '/new-york').digest);
  assert.doesNotMatch(JSON.stringify(result), /private|Authorization|headers|toJSON/);
});

test('proxy errors are reduced to fixed invalid categories', () => {
  const input = new Proxy({}, { getOwnPropertyDescriptor() { throw Error('private-session-value'); } });
  const result = summarize(input, '/new-york');
  assert.equal(result.scope, 'invalid');
  assert.doesNotMatch(JSON.stringify(result), /private-session-value/);
});

test('placeholder cycles and default-experience cycles fail closed', () => {
  const cyclic = { componentName: 'Container' };
  cyclic.placeholders = { nested: [cyclic] };
  const direct = footer(); direct.experiences = { _default: direct };
  for (const value of [cyclic, direct]) {
    const result = summarize(layout([value]), '/new-york');
    assert.equal(result.effectiveDefault.status, 'invalid');
    noPositiveLinks(result.effectiveDefault);
  }
});

test('bounds placeholder depth, key count and rendering count', () => {
  let deep = footer();
  for (let index = 0; index < 18; index += 1) deep = { componentName: 'Container', placeholders: { nested: [deep] } };
  const manyNames = layout(); manyNames.sitecore.route.placeholders = Object.fromEntries(Array.from({ length: 33 }, (_, i) => [`slot${i}`, []]));
  const manyRenderings = layout(); manyRenderings.sitecore.route.placeholders = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`slot${i}`, Array.from({ length: 64 }, () => ({ componentName: 'Other' }))]));
  for (const value of [layout([deep]), manyNames, manyRenderings]) {
    const result = summarize(value, '/new-york');
    assert.equal(result.current.status, 'limited');
    noPositiveLinks(result.current);
  }
});

test('malformed collections and link values fail closed', () => {
  for (const mutate of [
    value => { datasource(value).primaryNav.targetItems = 'private-collection'; },
    value => { entries(value)[0].link.jsonValue.value = 'private-value'; },
    value => { field(value).href = { secret: 'private-value' }; },
  ]) {
    const value = footer(); mutate(value);
    const result = summarizeFooter(value);
    assert.equal(result.current.status, 'invalid');
    noPositiveLinks(result.current);
    assert.doesNotMatch(JSON.stringify(result), /private/);
  }
});

test('requires exact path and actual native item identity, never a supplied label alone', () => {
  for (const routePath of ['/new-york?secret=private', '/new-york/', '/new-york/private', '/about', 123, null]) {
    const result = summarize(layout(), routePath);
    assert.equal(result.scope, 'outside');
    assert.equal(result.route, 'outside');
    assert.doesNotMatch(JSON.stringify(result), /private|secret=/);
  }
  const value = layout(); value.sitecore.route.itemId = 'private-fixture-id';
  assert.equal(summarize(value, '/new-york').scope, 'invalid');
});

test('rejects malformed input envelopes, identities and variant data', () => {
  for (const value of [null, [], new Date(), { sitecore: null }, { layout: layout(), sitecore: {} }]) {
    assert.equal(summarize(value, '/new-york').scope, 'invalid');
  }
  const malformed = layout(); malformed.sitecore.context.variantId = { private: 'value' };
  assert.equal(summarize(malformed, '/new-york').scope, 'invalid');
});

test('variant values are reduced to fixed categories', () => {
  for (const [variantId, category] of [['_default', 'default'], ['private-named-variant', 'other'], ['', 'missing']]) {
    const value = layout(); value.sitecore.context.variantId = variantId;
    const result = summarize(value, '/new-york');
    assert.equal(result.variantCategory, category);
    assert.equal(result.variantDefault, category === 'default');
    assert.doesNotMatch(JSON.stringify(result), /private-named-variant/);
  }
});

test('returns frozen detached snapshots and no collection-guard children key', () => {
  const value = layout();
  const before = summarize(value, '/new-york');
  field(value.sitecore.route.placeholders['headless-footer'][0]).href = '#demo-unavailable';
  const after = summarize(value, '/new-york');
  assert.equal(before.current.pimco.status, 'correct');
  assert.equal(after.current.pimco.status, 'unavailable');
  assert.notEqual(before.digest, after.digest);
  for (const object of [before, before.current, before.current.pimco]) assert.equal(Object.isFrozen(object), true);
  assert.doesNotMatch(JSON.stringify(before), /"children"|1A13|3DEF|A02B|https?:|itemId|headers|credentials|errorMessage/);
});

test('helper has no logger, network, environment or input serialization access', () => {
  const source = fs.readFileSync(sourceFile, 'utf8');
  assert.doesNotMatch(source, /\bconsole\s*\.|\bfetch\s*\(|process\.env|JSON\.stringify\(input\)|JSON\.stringify\(layout\)/);
});
