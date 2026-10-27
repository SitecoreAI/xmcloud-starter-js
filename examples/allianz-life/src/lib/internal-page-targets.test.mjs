import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'fixture';
const field = (href, target = '_blank') => ({
  value: { href, target, text: 'Original caption', linktype: 'internal' },
  metadata: { itemId: 'test-owner', fieldId: 'test-link', fieldType: 'General Link' },
});

function render(input, editing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false },
      siteName: 'allianz-life', locale: 'en',
      layout: { sitecore: { context: {}, route: { name: 'Target test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { ...safeLinkRenderProps(input, editing) })));
}

test('local pages, official-domain internal pages, fragments and queries do not request new contexts', () => {
  for (const href of ['/about', 'https://www.allianzlife.com/about?one=1&one=2#team', '#details', '?view=one#details']) {
    for (const target of ['_blank', '_BLANK', 'named-window', '_new']) {
      const input = field(href, target), before = JSON.stringify(input);
      const output = safeLink(input);
      assert.equal(output.value.target, '');
      assert.strictEqual(output.metadata, input.metadata);
      assert.equal(JSON.stringify(input), before);
      assert.doesNotMatch(render(input), /target="(?:_blank|named-window|_new)"/i);
      assert.match(render(input), />Original caption<\/a>/);
    }
  }
});

test('native SDK editing and field adapters retain the exact authored object', () => {
  const input = field('/about', '_blank');
  assert.strictEqual(safeLinkRenderProps(input, true).field, input);
  assert.strictEqual(allianzLinkField(input, true), input);
  assert.match(render(input, true), /target="_blank"/);
  assert.match(render(input, true), /test-link/);
  assert.equal(allianzLinkField(input, false).value.target, '');
});

test('document targets, explicit downloads and existing same-tab targets retain authored behavior', () => {
  for (const href of ['/allianz-assets/source.pdf', '/allianz-assets/worksheet.xlsx']) {
    const input = field(href);
    assert.equal(safeLink(input).value.target, '_blank');
    assert.match(render(input), /target="_blank"/);
  }
  const download = field('/about'); download.value.download = '';
  assert.equal(safeLink(download).value.target, '_blank');
  for (const target of ['', '_self', undefined]) {
    const input = field('/about');
    if (target === undefined) delete input.value.target; else input.value.target = target;
    assert.equal(safeLink(input).value.target, target);
  }
});

test('Rich Text applies the same visitor policy without touching markup or editing ownership', () => {
  const input = { value: '<p><a href="https://www.allianzlife.com/about?one=1&amp;two=2#team" target="_blank" rel="author"><b>About</b></a> <a href="/allianz-assets/source.pdf" target="_blank">PDF</a></p>',
    metadata: { itemId: 'body-owner', fieldId: 'body-field', fieldType: 'Rich Text' } };
  const before = JSON.stringify(input), output = safeEditorialRichText(input, false);
  assert.match(output.value, /href="\/about\?one=1&amp;two=2#team" target="" rel="author"><b>About<\/b>/);
  assert.match(output.value, /href="\/allianz-assets\/source.pdf" target="_blank" rel="noopener noreferrer"/);
  assert.strictEqual(output.metadata, input.metadata);
  assert.strictEqual(safeEditorialRichText(input, true), input);
  assert.equal(JSON.stringify(input), before);
});

const { safeNativeBodyRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-native-body-links.ts'));
const { Default: NativeRichText } = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const { render: renderComponent } = await import('../components/executive-biography/__tests__/sdk-test-helper.mjs');

test('native body page-only normalization leaves retained documents, downloads and external bytes untouched', () => {
  const unchanged = '<a href="https://assets.example.test/original.pdf?token=public" target="_blank" data-custom="original">PDF</a><a href="/about" download target="_blank">Download</a>';
  const input = { value: `<p><a href="/about?x=1#details" target="_blank">About</a>${unchanged}</p>`, metadata: { fieldId: 'native-body', fieldType: 'Rich Text', itemId: 'native-owner' } };
  const output = safeEditorialRichText(input, false, true);
  assert.match(output.value, /href="\/about\?x=1#details" target=""/);
  assert.ok(output.value.includes(unchanged));
  assert.strictEqual(output.metadata, input.metadata);
  assert.strictEqual(safeEditorialRichText(input, true, true), input);
  const native = safeNativeBodyRichText({ value: '<p><a href="/about" target="_blank">About</a></p>' }, false);
  assert.match(native.value, /target=""/);
});

test('Default native Rich Text uses same-tab visitor links and preserves original editable HTML', () => {
  const body = { value: '<p><a href="/about" target="_blank">About</a></p>', metadata: { fieldId: 'body', fieldType: 'Rich Text', itemId: 'owner' } };
  const data = { id: 'owner', heading: { jsonValue: { value: '' } }, body: { jsonValue: body } };
  const visitor = renderComponent(NativeRichText, data, false);
  assert.match(visitor, /href="\/about" target=""/);
  const editing = renderComponent(NativeRichText, data, true);
  assert.match(editing, /href="\/about" target="_blank"/);
  assert.match(editing, /fieldId/);
  assert.equal(data.body.jsonValue.value, body.value);
});


test('native same-tab official page URLs are rebased while already local markup and external assets stay exact', () => {
  for (const target of ['', ' target="_self"']) {
    const body = { value: `<p><a href="https://www.allianzlife.com/about?one=1&amp;two=2#team"${target}>About</a></p>`, metadata: { fieldId: 'native-body' } };
    const original = body.value;
    const result = safeEditorialRichText(body, false, true);
    assert.match(result.value, /href="\/about\?one=1&amp;two=2#team"/);
    assert.ok(result.value.includes(target));
    assert.strictEqual(result.metadata, body.metadata);
    assert.strictEqual(safeEditorialRichText(body, true, true), body);
    assert.equal(body.value, original);
  }
  for (const value of ["<a href='/about' target='_self' data-keep='yes'>Local</a>", '<a href="https://external.example.test/page">External</a>', '<a href="https://assets.example.test/original.pdf" target="_blank">PDF</a>']) {
    const body = { value };
    assert.strictEqual(safeEditorialRichText(body, false, true), body);
  }
});
