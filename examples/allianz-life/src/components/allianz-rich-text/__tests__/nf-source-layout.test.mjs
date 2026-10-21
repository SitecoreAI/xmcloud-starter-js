import { assertWysiwygCanvas } from '../../allianz-card-grid/__tests__/wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./nf-source-layout.fixture.json', import.meta.url)));
const richFilename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const cardsFilename = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
const Rich = loadSource(richFilename), Cards = loadSource(cardsFilename);
const sha = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const envelope = (kind, state = 'filled') => {
  const data = structuredClone(fixture.syntheticSdkEnvelopes[kind]);
  for (const name of ['heading', 'subheading', 'body', 'primaryLink']) {
    if (state === 'absent') delete data[name];
    else if (state === 'cleared') data[name].jsonValue.value = name === 'primaryLink' ? { href: '' } : '';
  }
  if (kind === 'cards') for (const card of data.children.results) {
    if (state === 'absent') card.fieldCollection = [];
    else if (state === 'cleared') for (const field of card.fieldCollection) {
      if (field.name === 'Links') for (const link of field.jsonValue) link.fields.Link.value = { href: '', text: '' };
      else field.jsonValue.value = '';
    }
  }
  return freeze(data);
};
const params = { RenderingIdentifier: 'fixture-nf-layout', headingLevel: 'h1', theme: 'blue-soft',
  layout: 'stacked', alignment: 'left', spacing: 'none' };
const normalize = html => html.replace(/<(\/?)([A-Z][\w-]*)\b/g, (_, slash, name) => `<${slash}${name.toLowerCase()}`)
  .replace(/class="([^"]*)"/g, (_, value) => `class="${value.trim().split(/\s+/).join(' ')}"`)
  .replace(/>\s+</g, '><').trim();
const replaceHeading = (html, from, to) => html.replace(new RegExp(`(<\\/?)${from}\\b`, 'g'), `$1${to}`)
  .replaceAll(`tag="${from}"`, `tag="${to}"`);
const ownerMarkup = html => html.match(/<div class="l-grid__column-medium-12">([\s\S]*)<\/div><\/div><\/div><\/div>$/)?.[1];
const field = (name, value) => ({ jsonValue: { value, metadata: { itemId: 'fixture-only-nf-owner',
  fieldId: `fixture-only-${name}`, fieldType: name === 'heading' ? 'Single-Line Text' : 'Rich Text', fixtureOnly: true } } });

function observedModule(filename, calls) {
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

test('NF finite card and index heading variants match the witnessed source levels and change no other Iap markup', () => {
  assert.deepEqual(fixture.headings.contract.tags, ['h2', 'h2', 'h2']);
  assert.deepEqual(fixture.headings.support.tags, ['h3', 'h3', 'h3']);
  assert.deepEqual(fixture.headings.indexDefinitions.tags, ['h2']);
  for (const state of ['filled', 'cleared', 'absent']) for (const editing of [false, true]) {
    for (const [nf, iap, tag] of [['NfContractTools', 'IapContractTools', 'h2'], ['NfSupport', 'IapSupport', 'h3']]) {
      const data = envelope('cards', state), before = JSON.stringify(data);
      const actual = render(Cards[nf], data, editing, params), old = render(Cards[iap], data, editing, params);
      assert.equal(replaceHeading(actual, tag, 'h4'), old);
      assert.doesNotMatch(actual, /<h1\b|t-bg-blue-soft/);
      if (state === 'filled') assert.equal((actual.match(new RegExp(`<${tag}>`, 'g')) || []).length, 3);
      assert.equal(JSON.stringify(data), before);
    }
    const data = envelope('rich', state);
    const actual = render(Rich.NfIndexDefinitionsHeading, data, editing, params);
    assert.equal(replaceHeading(actual, 'h2', 'h3'), render(Rich.IapIndexDefinitionsHeading, data, editing, params));
  }
});

test('three NF resources reproduce each exact source owner and one shared XL top/bottom boundary', () => {
  assert.equal(fixture.source.sha256, '7467a1a973d6265e966b89d79b04e265259f465270af38a922590a76b6322e80');
  const html = fixture.resources.owners.map(owner => {
    assert.equal(sha(owner.body), owner.bodySha256);
    assert.equal(sha(owner.ownerMarkup), owner.ownerMarkupSha256);
    const data = freeze({ body: field('body', owner.body), heading: field('heading', 'Do not synthesize a resource heading'),
      subheading: field('subheading', '<p>Unused native subheading</p>') });
    const markup = render(Rich[owner.variant], data, false, params);
    assert.equal(normalize(ownerMarkup(markup)), normalize(owner.ownerMarkup), owner.variant);
    assert.doesNotMatch(markup, /Do not synthesize|Unused native|u-margin-bottom-lg|u-padding-top-lg|t-bg-grey-muted/);
    return markup;
  }).join('');
  assert.equal((html.match(/u-padding-top-xl/g) || []).length, 1);
  assert.equal((html.match(/u-padding-bottom-xl/g) || []).length, 1);
  assert.equal((html.match(/t-bg-grey-soft/g) || []).length, 3);
  assert.equal((html.match(/class="l-grid__row/g) || []).length, 3, 'One non-empty row per existing owner; no spacer row');
  assert.ok(html.indexOf('Additional resources') < html.indexOf('different risk/return consideration'));
  assert.ok(html.indexOf('different risk/return consideration') < html.indexOf('While no product fee'));
  assert.equal((html.match(/0\.20% rider fee/g) || []).length, 1);
});

test('the existing IapIntroduction selected for NF matches its authentic source and omits a cleared Body control', () => {
  assert.equal(sha(fixture.introduction.body), fixture.introduction.bodySha256);
  assert.equal(sha(fixture.introduction.sourceMarkup), fixture.introduction.sourceMarkupSha256);
  const data = freeze({ body: field('body', fixture.introduction.body) });
  const html = render(Rich.IapIntroduction, data, false, params).replace(' allianz-iap-introduction', '').replace(' id="fixture-nf-layout"', '');
  assert.equal(normalize(html), normalize(fixture.introduction.sourceMarkup));
  const calls = [], Observed = observedModule(richFilename, calls);
  for (const value of [fixture.introduction.body, '']) for (const editing of [false, true]) {
    calls.length = 0; const data = freeze({ body: field('body', value) });
    render(Observed.IapIntroduction, data, editing, params);
    assert.equal(calls.length, value ? 1 : 0);
    if (calls.length) { assert.equal(calls[0].name, 'RichText'); assert.equal(calls[0].field, data.body.jsonValue); assert.equal(calls[0].editable, editing); }
  }
});

test('NF variants pass original populated fields to SDK and omit cleared canvas controls', () => {
  const calls = [], ObservedRich = observedModule(richFilename, calls), ObservedCards = observedModule(cardsFilename, calls);
  for (const editing of [false, true]) for (const value of ['<p>Full <strong>authored</strong> body</p>', '']) {
    for (const name of ['NfResourcesStart', 'NfResourcesMiddle', 'NfResourcesEnd']) {
      calls.length = 0; const data = freeze({ body: field('body', value) });
      render(ObservedRich[name], data, editing, params);
      assert.equal(calls.length, value ? 1 : 0);
      if (calls.length) { assert.equal(calls[0].name, 'RichText'); assert.equal(calls[0].field, data.body.jsonValue); assert.equal(calls[0].editable, editing); }
    }
    calls.length = 0; const data = envelope('rich', value ? 'filled' : 'cleared');
    render(ObservedRich.NfIndexDefinitionsHeading, data, editing, params);
    for (const name of ['heading', 'body']) {
      const call = calls.find(call => call.field === data[name].jsonValue);
      assert.equal(Boolean(call), Boolean(value));
      if (call) assert.equal(call.editable, editing);
    }
    for (const name of ['NfContractTools', 'NfSupport']) {
      calls.length = 0; const data = envelope('cards', value ? 'filled' : 'cleared');
      render(ObservedCards[name], data, editing, params);
      for (const card of data.children.results) for (const native of card.fieldCollection.filter(field => field.name !== 'Links')) {
        const call = calls.find(call => call.field === native.jsonValue);
        assert.equal(Boolean(call), Boolean(value));
        if (call) assert.equal(call.editable, editing);
      }
      if (editing && value) for (const card of data.children.results) for (const link of card.fieldCollection.find(field => field.name === 'Links').jsonValue)
        assert.ok(calls.some(call => call.name === 'Link' && call.field === link.fields.Link));
    }
  }
});

test('absent NF fields do not become editable fabricated fields or content, and missing datasources retain fallback', () => {
  const calls = [], modules = [observedModule(richFilename, calls), observedModule(cardsFilename, calls)];
  for (const editing of [false, true]) {
    for (const name of ['NfResourcesStart', 'NfResourcesMiddle', 'NfResourcesEnd', 'NfIndexDefinitionsHeading', 'NfContractTools', 'NfSupport']) {
      const module = name === 'NfContractTools' || name === 'NfSupport' ? modules[1] : modules[0];
      calls.length = 0; const html = render(module[name], envelope(module === modules[1] ? 'cards' : 'rich', 'absent'), editing, params);
      assert.equal(calls.length, 0, name); assert.doesNotMatch(html, /<h[1-6]>|Authored|scEmptyField/);
      assert.doesNotThrow(() => render(module[name], undefined, editing, params));
    }
  }
});

test('NF cards preserve five authored links and deliberate unavailable and local calculator behavior', () => {
  const data = envelope('cards');
  const html = render(Cards.NfContractTools, data, false, params);
  assert.equal((html.match(/class="tileLink"/g) || []).length, 5);
  for (const marker of ['Keep disabled login', 'Keep disabled rates', 'Authored local calculator', 'Authored downside mock', '/index-advantage-plus-nf/calculator', '/define-your-downside']) assert.ok(html.includes(marker));
  assert.equal(replaceHeading(html, 'h2', 'h4'), render(Cards.IapContractTools, data, false, params));
});

test('affected Iap and Default visitor oracles stay pinned and editing follows WYSIWYG', () => {
  assert.equal(fixture.baseline.head, 'a6d08d00a5a90c265e55adabe830d07c42dc571e');
  for (const item of fixture.baseline.renders) {
    const module = item.kind === 'cards' ? Cards : Rich;
    const data = envelope(item.kind, item.state), before = JSON.stringify(data);
    const visitor = render(module[item.variant], data, false, params);
    if (!item.editing) assert.equal(sha(visitor), item.sha256, `${item.kind}.${item.variant}/${item.state}/visitor`);
    else assertWysiwygCanvas(visitor, render(module[item.variant], data, true, params), data, `${item.kind}.${item.variant}/${item.state}/editing`);
    assert.equal(JSON.stringify(data), before);
  }
});
