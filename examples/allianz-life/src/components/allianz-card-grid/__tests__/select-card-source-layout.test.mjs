import { assertWysiwygCanvas } from './wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./select-card-source-layout.fixture.json', import.meta.url)));
const filename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
const Cards = loadSource(filename);
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
const params = fixture.oracleParams;
const variants = ['SelectContractTools', 'SelectSupport', 'SelectRiderFeatures'];
const svgs = markup => markup.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [];
const paths = svg => [...svg.matchAll(/<path\b[^>]*\sd="([^"]*)"/g)].map(match => match[1]);
const pathHash = svg => sha(JSON.stringify(paths(svg)));
const witnessedHash = name => fixture.exactGlyphs.find(glyph => glyph.name === name).pathListSha256;

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

test('historical Default, Iap and NF visitor hashes stay pinned and editing follows the same visible DOM', () => {
  assert.equal(fixture.baseline.cardGridSHA256, '8b1ddf896515988da7c765a7fed39cc732f0d2da96f83dfd37c9f7e5704d980d');
  assert.equal(fixture.oracles.length, 30);
  for (const oracle of fixture.oracles) {
    const data = freeze(envelope(oracle.state));
    const visitor = render(Cards[oracle.variant], data, false, params);
    if (!oracle.editing) assert.equal(sha(visitor), oracle.SHA256, `${oracle.variant}/${oracle.state}/visitor`);
    else assertWysiwygCanvas(visitor, render(Cards[oracle.variant], data, true, params), data, `${oracle.variant}/${oracle.state}/editing`);
  }
});

test('Select tools match source bottom XL spacing and third-card Body link placement', () => {
  assert.equal(fixture.source.sha256, '8fe6d596749100391f339280abbf78a6e997eef4a5196f4d187fa2a489e0acd8');
  assert.equal(fixture.roles.SelectContractTools.rowClass, 'l-grid__row match-height-row u-padding-bottom-xl');
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state));
    const html = render(Cards.SelectContractTools, data, editing, params);
    const nf = render(Cards.NfContractTools, data, editing, params);
    const articles = html.match(/<article\b[\s\S]*?<\/article>/g), nfArticles = nf.match(/<article\b[\s\S]*?<\/article>/g);
    assert.deepEqual(articles.slice(0, 2), nfArticles.slice(0, 2));
    assert.doesNotMatch(articles[2], /<footer>/);
    assert.ok(articles[2].includes('tileBody u-font-size-md'));
    assert.deepEqual(html.match(/<a\b[^>]*>/g), nf.match(/<a\b[^>]*>/g));
    if (state === 'filled') assert.ok(articles[2].indexOf('tileBody u-font-size-md') < articles[2].indexOf('tileLink'));
  }
  const html = render(Cards.SelectContractTools, envelope(), false, params);
  assert.equal((html.match(/<h2>/g) ?? []).length, 3);
  for (const name of ['Laptop', 'Light Bulb', 'Calculator']) assert.ok(svgs(html).some(svg => pathHash(svg) === witnessedHash(name)));
  assert.deepEqual(fixture.roles.SelectContractTools.sourceAnchorCounts, [1, 1, 4]);
  assert.match(fixture.roles.SelectContractTools.qualification, /do not fabricate/);
});

test('Select support changes only the first decorative glyph to exact source Phone Call', () => {
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state));
    const html = render(Cards.SelectSupport, data, editing, params);
    const nf = render(Cards.NfSupport, data, editing, params);
    assert.equal(pathHash(svgs(html)[0]), witnessedHash('PhoneCall'));
    assert.notEqual(pathHash(svgs(html)[0]), pathHash(svgs(nf)[0]));
    assert.equal(html.replace(svgs(html)[0], svgs(nf)[0]), nf);
  }
  const html = render(Cards.SelectSupport, envelope(), false, params);
  assert.equal((html.match(/<h3>/g) ?? []).length, 3);
  assert.match(html, /l-grid__row match-height-row u-padding-bottom-xl/);
  for (const name of ['User', 'Question']) assert.ok(svgs(html).some(svg => pathHash(svg) === witnessedHash(name)));
});

test('Select rider cards retain exact source geometry, glyphs and whole authored body', () => {
  const data = envelope();
  for (const [index, card] of data.children.results.entries()) {
    card.fieldCollection.find(field => field.name === 'Heading').jsonValue.value = fixture.sourceRiderCards[index].heading;
    card.fieldCollection.find(field => field.name === 'Subheading').jsonValue.value = '';
    card.fieldCollection.find(field => field.name === 'Body').jsonValue.value = fixture.sourceRiderCards[index].body;
    card.fieldCollection.find(field => field.name === 'Links').jsonValue = index ? [] : [{ id: 'fixture-only-chart', fields: { Link: {
      value: { href: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/5dbeb5a163224c799659eb4204e88d26?v=fbe47d40',
        text: 'Download native chart (PDF)', target: '_blank', linktype: 'external' },
    } } }];
  }
  const before = JSON.stringify(data), html = render(Cards.SelectRiderFeatures, freeze(data), false, params);
  assert.equal((html.match(/m-axlTile match-height -is--stacked t-bg-transparent/g) ?? []).length, 3);
  assert.equal((html.match(/l-grid__column-medium-4/g) ?? []).length, 3);
  assert.equal((html.match(/<h3>/g) ?? []).length, 3);
  assert.equal((html.match(/tileBody u-font-size-md/g) ?? []).length, 3);
  assert.doesNotMatch(html, /match-height-row|u-padding-|u-margin-|t-bg-primary-white|Authored fixture heading/);
  for (const name of ['Line Graph', 'Receive', 'Money', 'Download']) assert.ok(svgs(html).some(svg => pathHash(svg) === witnessedHash(name)), name);
  assert.equal((html.match(/<footer>/g) ?? []).length, 1);
  for (const card of fixture.sourceRiderCards) assert.ok(html.includes(card.body));
  assert.ok(html.indexOf(fixture.sourceRiderCards[0].heading) < html.indexOf(fixture.sourceRiderCards[1].heading));
  assert.ok(html.includes('life‘s what-ifs'));
  assert.equal(html.match(/<a\b[^>]*>/)?.[0], render(Cards.NfContractTools, data, false, params).match(/<a\b[^>]*>/)?.[0],
    'Chart destination keeps the inherited structured-link policy, including unavailable results');
  assert.match(render(Cards.SelectRiderFeatures, data, true, params), /target="_blank"/);
  assert.equal(JSON.stringify(data), before);
  for (const svg of svgs(html)) { assert.match(svg, /aria-hidden="true"/); assert.match(svg, /focusable="false"/); }
});

test('new Select variants preserve populated SDK field identity and omit cleared canvas controls', () => {
  const calls = [], Observed = observedModule(calls);
  for (const variant of variants) for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    const data = freeze(envelope(state)), before = JSON.stringify(data);
    calls.length = 0; render(Observed[variant], data, editing, params);
    for (const card of data.children.results) for (const field of card.fieldCollection.filter(field => field.name !== 'Links')) {
      const call = calls.find(call => call.field === field.jsonValue);
      assert.equal(Boolean(call), state === 'filled', `${variant}/${field.name}/${state}/${editing}`);
      if (call) assert.equal(call.editable, editing);
    }
    if (editing && state === 'filled') for (const card of data.children.results) for (const link of card.fieldCollection.find(field => field.name === 'Links').jsonValue)
      assert.ok(calls.some(call => call.name === 'Link' && call.field === link.fields.Link));
    assert.equal(JSON.stringify(data), before);
    assert.ok(calls.every(call => ![data.heading?.jsonValue, data.subheading?.jsonValue, data.body?.jsonValue].includes(call.field)), 'No new root-field ownership');
  }
});

test('Select variants retain the inherited destination and unavailable policy and missing-data fallback', () => {
  for (const variant of variants) {
    const data = envelope();
    data.children.results[0].fieldCollection.find(field => field.name === 'Links').jsonValue[0].fields.Link.value.href = '/Login#demo-unavailable';
    freeze(data);
    const html = render(Cards[variant], data, false, params);
    assert.match(html, /href="#service-unavailable"/);
    assert.doesNotMatch(html, /href="\/Login/);
    assert.deepEqual(html.match(/<a\b[^>]*>/g), render(Cards.NfContractTools, data, false, params).match(/<a\b[^>]*>/g),
      'No local/mock destination or disabled result is changed by a new presentation');
    const missing = render(Cards[variant], undefined, false, params);
    assert.ok(missing.length > 0);
    assert.doesNotMatch(missing, /Phone Call|Income Calculator|life‘s what-ifs/);
  }
});
