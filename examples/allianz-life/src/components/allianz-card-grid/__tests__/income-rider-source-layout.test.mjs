import { assertWysiwygCanvas } from './wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./income-rider-source-layout.fixture.json', import.meta.url)));
const filename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
const Cards = loadSource(filename), params = fixture.oracleParams;
const sha = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
function envelope(state = 'filled') {
  const data = structuredClone(fixture.syntheticSdkEnvelope);
  for (const name of ['heading', 'subheading', 'body', 'primaryLink']) {
    if (state === 'absent') delete data[name];
    else if (state === 'cleared') data[name].jsonValue.value = name === 'primaryLink' ? { href: '' } : '';
  }
  for (const card of data.children.results) {
    if (state === 'absent') card.fieldCollection = [];
    else if (state === 'cleared') for (const field of card.fieldCollection) {
      if (field.name === 'Links') for (const link of field.jsonValue) link.fields.Link.value = { href: '', text: '' };
      else field.jsonValue.value = '';
    }
  }
  return data;
}
function riderEnvelope() {
  const data = envelope();
  for (const [index, card] of data.children.results.entries()) {
    const source = fixture.sourceCards[index];
    card.fieldCollection.find(field => field.name === 'Heading').jsonValue.value = source.heading;
    card.fieldCollection.find(field => field.name === 'Subheading').jsonValue.value = '';
    card.fieldCollection.find(field => field.name === 'Body').jsonValue.value = source.sourceBody;
    const links = card.fieldCollection.find(field => field.name === 'Links');
    if (index) links.jsonValue = [];
    else {
      const link = source.sourceLinks[0];
      links.jsonValue[0].fields.Link.value = { href: link.href, text: link.caption,
        target: link.target, ariaLabel: link.ariaLabel, linktype: 'external' };
    }
  }
  return data;
}
function observedModule(calls) {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript');
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
      ...Object.fromEntries(['Text', 'RichText', 'Link'].map(name => [name, props => {
        calls.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])) };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

test('all historical Default, Iap, NF and Select visitor oracles remain byte-identical and editing follows WYSIWYG', () => {
  assert.equal(fixture.baseline.CardGridSHA256, '7817c3232d1a26c4f4e1e038635a7507fcfce2c2bb2b013bf5d718f493c88f9e');
  assert.equal(fixture.oracles.length, 48);
  for (const oracle of fixture.oracles) {
    const data = freeze(envelope(oracle.state)), visitor = render(Cards[oracle.variant], data, false, params);
    if (!oracle.editing) assert.equal(sha(visitor), oracle.SHA256, `${oracle.variant}/${oracle.state}/visitor`);
    else assertWysiwygCanvas(visitor, render(Cards[oracle.variant], data, true, params), data, `${oracle.variant}/${oracle.state}/editing`);
  }
});

test('Income rider differs from Select rider only by witnessed H4 and match-height row', () => {
  assert.deepEqual(fixture.geometry.headingTags, ['h4', 'h4', 'h4']);
  assert.equal(fixture.geometry.rowClass, 'l-grid__row match-height-row');
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state));
    const actual = render(Cards.IncomeRiderFeatures, data, editing, params);
    const normalized = actual.replace(/<(\/?)h4\b/g, '<$1h3').replaceAll('tag="h4"', 'tag="h3"')
      .replace('l-grid__row match-height-row', 'l-grid__row');
    assert.equal(normalized, render(Cards.SelectRiderFeatures, data, editing, params));
  }
});

test('Income source glyphs, transparent cards, chart footer and exact financial bodies stay intact', () => {
  assert.equal(fixture.source.fragmentSHA256, 'dda6b708560b4ecbe16e477b2cb35a6209999ff9e714817c1ce161113dfc389a');
  const data = freeze(riderEnvelope()), before = JSON.stringify(data);
  const html = render(Cards.IncomeRiderFeatures, data, false, params);
  assert.equal((html.match(/<h4>/g) ?? []).length, 3);
  assert.equal((html.match(/m-axlTile match-height -is--stacked t-bg-transparent/g) ?? []).length, 3);
  assert.equal((html.match(/l-grid__column-medium-4/g) ?? []).length, 3);
  assert.equal((html.match(/tileBody u-font-size-md/g) ?? []).length, 3);
  assert.doesNotMatch(html, /u-padding-|u-margin-|t-bg-primary-white|Legacy\+|Dynamic Income/);
  assert.equal((html.match(/<footer>/g) ?? []).length, 1);
  const hashes = (html.match(/<svg\b[\s\S]*?<\/svg>/g) ?? []).map(svg => {
    assert.match(svg, /aria-hidden="true"/); assert.match(svg, /focusable="false"/);
    return sha(JSON.stringify([...svg.matchAll(/<path\b[^>]*\sd="([^"]*)"/g)].map(match => match[1])));
  });
  assert.deepEqual(hashes, fixture.sourceGlyphs.map(glyph => glyph.pathListSHA256));
  for (const card of fixture.sourceCards) assert.ok(html.includes(card.sourceBody));
  assert.ok(html.includes('Increasing Income'));
  assert.ok(html.includes('Income Multiplier Benefit'));
  assert.ok(html.includes('<sup>2</sup>')); assert.ok(html.includes('<sup>3</sup>'));
  const editing = render(Cards.IncomeRiderFeatures, data, true, params);
  assert.match(editing, /target="_blank"/);
  assert.ok(editing.includes(fixture.sourceCards[0].sourceLinks[0].href));
  assert.equal(html.match(/<a\b[^>]*>/)?.[0], render(Cards.SelectRiderFeatures, data, false, params).match(/<a\b[^>]*>/)?.[0],
    'The existing safeLink outcome is preserved; this test makes no delivery availability claim');
  assert.equal(JSON.stringify(data), before);
});

test('Income rider keeps populated SDK field identity, omits cleared controls and retains the unavailable policy', () => {
  const calls = [], Observed = observedModule(calls);
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state)), before = JSON.stringify(data);
    calls.length = 0; render(Observed.IncomeRiderFeatures, data, editing, params);
    for (const card of data.children.results) for (const field of card.fieldCollection.filter(field => field.name !== 'Links')) {
      const call = calls.find(call => call.field === field.jsonValue);
      assert.equal(Boolean(call), state === 'filled');
      if (call) assert.equal(call.editable, editing);
    }
    if (editing && state === 'filled') for (const card of data.children.results) for (const link of card.fieldCollection.find(field => field.name === 'Links').jsonValue)
      assert.ok(calls.some(call => call.name === 'Link' && call.field === link.fields.Link));
    assert.equal(JSON.stringify(data), before);
  }
  const data = envelope();
  data.children.results[0].fieldCollection.find(field => field.name === 'Links').jsonValue[0].fields.Link.value.href = '/Login#demo-unavailable';
  const html = render(Cards.IncomeRiderFeatures, freeze(data), false, params);
  assert.match(html, /href="#service-unavailable"/); assert.doesNotMatch(html, /href="\/Login/);
  assert.deepEqual(html.match(/<a\b[^>]*>/g), render(Cards.SelectRiderFeatures, data, false, params).match(/<a\b[^>]*>/g));
  assert.ok(render(Cards.IncomeRiderFeatures, undefined, false, params).length > 0);
});

test('unchanged Iap tools retain all three supplied links inside the third card footer', () => {
  const data = freeze(envelope()), html = render(Cards.IapContractTools, data, false, params);
  const third = html.match(/<article\b[\s\S]*?<\/article>/g)[2];
  const footer = third.match(/<footer>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer); assert.equal((footer.match(/class="tileLink"/g) ?? []).length, 3);
  assert.equal((html.match(/<h4>/g) ?? []).length, 3);
});
