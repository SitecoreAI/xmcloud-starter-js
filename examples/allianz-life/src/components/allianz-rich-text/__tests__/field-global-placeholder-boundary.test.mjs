import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import { compile, filename, field, fixture, freeze, params, renderSDK, metadata, attribute, sourceRoot, require } from './optional-icons-fixture.mjs';
import { loadSource } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// Text/XML and the Editing DOM href are observed. The remaining JSON shape and
// metadata below are controlled fixtures, not a captured native SDK DTO.
const OWNER = 'D1DF6FA9-4906-41B8-8888-C176F8DA3926';
const LABEL = 'Learn about all eight stadiums';
const XML = '<link text="Learn about all eight stadiums" linktype="external" url="#" anchor="" target="_blank" />';
const BODY = '<span id="global"></span><p>Allianz Field® is just one of eight Allianz® stadiums around the world. But ours may boast the coldest game-day temperature (3 degrees Fahrenheit at the USMNT World Cup Qualifier on February 1, 2022).</p>';
const components = compile(fs.readFileSync(filename, 'utf8'));
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
// Portable immutable full a363 Git blob, compressed only to keep this test self-contained.
const oracleBytes = gunzipSync(Buffer.from('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', 'base64'));
assert.equal(createHash('sha256').update(oracleBytes).digest('hex'), '882d699eff34dcf8baa0cebf302c04a0dac728f3cf20e8401a896d98d62dd658');
// Compile the immutable a363 source with identical local dependencies. Only the
// formatter differs; no production module or global loader is replaced.
const oracleName = path.join(sourceRoot, 'lib/__test_only_baseline_fields.ts');
const oracleModule = new Module(oracleName);
oracleModule.filename = oracleName;
oracleModule.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
oracleModule.require = specifier => {
  const local = specifier.startsWith('.') ? path.resolve(path.dirname(oracleName), specifier)
    : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
  if (local) {
    const resolved = [local, `${local}.ts`, `${local}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (resolved) return /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved);
  }
  return require(specifier);
};
const ts = require('typescript');
oracleModule._compile(ts.transpileModule(oracleBytes.toString(), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText, oracleName);
const baselineSafeLink = oracleModule.exports.safeLink;
const value = (extra = {}) => ({ href: 'http://#', text: LABEL, linktype: 'external', target: '_blank', ...extra });
const linkField = extra => freeze({ value: value(extra), metadata: {
  itemId: OWNER, fieldId: 'fixture-primaryLink', fieldType: 'General Link', fixtureOnly: true,
} });
const data = input => {
  const result = fixture({ owner: OWNER, iconState: 'cleared' });
  result.heading = field(OWNER, 'heading', 'Meet our global family of stadiums');
  result.subheading = field(OWNER, 'subheading', '', 'Rich Text');
  result.body = field(OWNER, 'body', BODY, 'Rich Text');
  result.primaryLink = { jsonValue: input };
  return freeze(result);
};
const lastLink = html => [...html.matchAll(/<a\b[^>]*>/g)].at(-1)?.[0];
const outcome = (fn, input) => { try { return { kind: 'value', value: fn(input) }; }
  catch (error) { return { kind: 'error', name: error.name }; } };

// These are genuine contract regressions: the exact Field consumer previously
// showed #service-unavailable for this controlled SDK representation.
test('observed Field text and formatter href use the ordinary literal-hash SDK contract', () => {
  assert.equal(XML.length, 100); assert.equal(BODY.length, 232);
  for (const attributes of [{ anchor: '' }, { id: '', querystring: '', anchor: '' }]) {
    const input = linkField(attributes), original = JSON.stringify(input);
    assert.equal(baselineSafeLink(input).value.href, '#service-unavailable');
    assert.equal(safeLink(input).value.href, '#');
    for (const mode of ['normal', 'preview', 'editing']) {
      const observed = [];
      const html = renderSDK(compile(fs.readFileSync(filename, 'utf8'), { observe: observed }).FieldGlobalStadiumsIntroduction, data(input), params(), mode);
      const link = lastLink(html), call = observed.find(row => row.name === 'Link');
      assert.ok(html.includes(BODY));
      assert.equal((html.match(/Learn about all eight stadiums/g) ?? []).length, 1);
      assert.match(html, /<footer><div class="tileLink">/);
      assert.equal((html.match(/class="a-link__icon" aria-hidden="true"/g) ?? []).length, 1);
      assert.equal(attribute(link, 'href'), mode === 'editing' ? 'http://#' : '#');
      assert.equal(attribute(link, 'target'), mode === 'editing' ? '_blank' : '');
      assert.strictEqual(call.field.metadata, input.metadata);
      if (mode === 'editing') {
        assert.strictEqual(call.field, input);
        assert.equal(metadata(html).filter(row => row.itemId === OWNER && row.fieldId === 'fixture-primaryLink').length, 1);
        assert.strictEqual(allianzLinkField(input, true), input);
        assert.strictEqual(safeLinkRenderProps(input, true).field, input);
      } else {
        const ordinary = freeze({ ...input, value: { ...input.value, href: '#' } });
        assert.equal(html, renderSDK(components.FieldGlobalStadiumsIntroduction, data(ordinary), params(), mode));
        assert.doesNotMatch(link, /service-unavailable|demo-unavailable/);
      }
    }
    assert.equal(JSON.stringify(input), original);
  }
});

test('all nonmatching transport and policy controls equal the immutable a363 formatter oracle', () => {
  const controls = [
    ...['internal', 'media', 'anchor', 'External', '', undefined, null].map(linktype => ({ linktype })),
    ...['bound-item', ' ', null, false, 0, {}].map(id => ({ id })),
    ...['x=1', '?x=1', ' ', null, false, 0, {}].map(querystring => ({ querystring })),
    ...['section', '#', ' ', null, false, 0, {}].map(anchor => ({ anchor })),
    ...['', 'file.pdf', false, undefined, null].map(download => ({ download })),
    ...['HTTP://#', 'https://#', ' http://#', 'http://# ', 'http://##', 'http://#section', 'http://#?x=1',
      'http://#@example.invalid', 'http://example.invalid/#', '//example.invalid/path',
      'javascript:alert(1)', 'data:text/html,no', '/Login', '/api/private', '/sitecore/shell',
      '/about', '/new-york', '/search?q=stadium', '?x=1#section', '#', '#global', '#demo-unavailable',
      'https://www.allianzlife.com/Login', 'https://www.allianzlife.com/about',
      'https://external.example.invalid/register'].map(href => ({ href })),
  ];
  for (const extra of controls) {
    const input = linkField(extra), before = JSON.stringify(input);
    assert.deepEqual(outcome(safeLink, input), outcome(baselineSafeLink, input), JSON.stringify(extra));
    assert.strictEqual(allianzLinkField(input, true), input);
    assert.equal(JSON.stringify(input), before);
  }
  const inherited = Object.assign(Object.create({ download: false }), value());
  assert.deepEqual(outcome(safeLink, { value: inherited }), outcome(baselineSafeLink, { value: inherited }));
  for (const input of [undefined, { value: { href: '' } }, { value: {} }])
    assert.deepEqual(outcome(safeLink, input), outcome(baselineSafeLink, input));
});

test('Field consumer preserves rejected intents, cleared links, body ownership and source arrow', () => {
  for (const extra of [{ id: 'bound-item' }, { querystring: 'x=1' }, { anchor: 'section' }, { download: '' },
    { linktype: 'internal' }, { href: 'https://unregistered.example/' }]) {
    const input = linkField(extra);
    for (const mode of ['normal', 'preview']) {
      const html = renderSDK(components.FieldGlobalStadiumsIntroduction, data(input), params(), mode);
      assert.equal(attribute(lastLink(html), 'href'), '#service-unavailable');
      assert.ok(html.includes(BODY));
      assert.equal((html.match(/Learn about all eight stadiums/g) ?? []).length, 1);
    }
  }
  for (const mode of ['normal', 'preview', 'editing']) {
    const input = linkField({ href: '' });
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, data(input), params(), mode);
    assert.doesNotMatch(html, /<footer>|a-link__icon|Learn about all eight stadiums/);
    assert.ok(html.includes(BODY));
  }
});
