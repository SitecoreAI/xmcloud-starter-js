import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, deepFreeze, filename, require } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8');
const Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const pageId = '020EBCA9-1AF5-5887-B071-6295BE26D994';
const rootId = '8070C534-ACB7-4226-8E28-FDE9EFE92813';
const childIds = ['2A7E982F-6479-4CA4-B1D5-649F67DE3B9E', 'FF80E7EA-E9CC-4DE8-8AB8-0A3BADD9C4A9',
  '401C3F07-3298-4E56-B557-B045DD377F61'];
// Owner IDs, field roles and params are reconciled native observations. Metadata
// is synthetic, and these local SDK tests do not claim native browser acceptance.
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-claims-${name}`, fieldType: type, fixtureOnly: true } } });
const entries = current => current.data.children.results;
const valueField = (card, name) => card[name]?.jsonValue
  ?? card.fieldCollection?.find(item => item.name === name)?.jsonValue;
function fixture(collection = false) {
  const children = childIds.map((id, index) => ({ id,
    heading: field(id, 'heading', `Authored claim step ${index + 1}`),
    body: field(id, 'body', '<p>Original authored step copy.</p>', 'Rich Text'),
    subheading: field(id, 'subheading', '', 'Rich Text'),
    alphanumeral: field(id, 'alphanumeral', String(index + 1)),
    iconTheme: field(id, 'iconTheme', 'primary-brand'), theme: field(id, 'theme', 'transparent'),
    headingLevel: field(id, 'headingLevel', 'h3'), icon: field(id, 'icon', {}, 'Image'),
    image: field(id, 'image', {}, 'Image'), link: field(id, 'link', { href: '' }, 'General Link') }));
  return { itemId: pageId, variant: 'Default', data: { id: rootId, children: { results: collection
    ? children.map(card => ({ id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) })) : children } },
  params: { theme: 'transparent', layout: 'stacked', columns: '3', alignment: 'center', spacing: 'none',
    headingLevel: 'h3', paddingTop: 'lg', paddingBottom: 'none', marginBottom: 'lg',
    DynamicPlaceholderId: '3', FieldNames: '{A9538E4C-C44E-5C01-BCF2-0DE4DE3DB2BA}' } };
}
function render(current, mode, components = Cards) {
  deepFreeze(current); const before = JSON.stringify(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing',
      isNormal: mode === 'normal', isPreview: mode === 'preview' },
    layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'Claims native-shaped fixture',
      fields: {}, placeholders: {} } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), before, 'render preserves original fields and metadata');
  return html;
}

for (const mode of modes) test(`${mode} Claims uses three source badge columns and the original editable numeral fields`, () => {
  for (const collection of [false, true]) {
    const current = fixture(collection), observe = [], html = render(current, mode, compile(source, { observe }));
    assert.equal((html.match(/class="alphaType"/g) ?? []).length, 3);
    assert.equal((html.match(/class="tileIcon t-bg-primary-brand t-icon-primary-white"/g) ?? []).length, 3);
    assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
    assert.equal((html.match(/tile--alphaNumeric -is--stacked/g) ?? []).length, 3);
    assert.doesNotMatch(html, /offset-medium-2|l-grid__column-medium-8|-is--split|tileIcon -is--wide/);
    for (const card of entries(current)) {
      const original = valueField(card, 'alphanumeral');
      const calls = observe.filter(call => call.name === 'Text' && call.field === original);
      assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing');
      assert.equal(calls[0].tag, 'em'); assert.equal(calls[0].className, 'alphaType');
      assert.equal(calls[0].field.metadata.itemId, card.id);
    }
    assert.equal(html, render(fixture(!collection), mode));
  }
});

test('Claims retains authored order, values, canonical fields and valid GUID spellings', () => {
  for (const mode of modes) {
    const normalized = fixture(); normalized.itemId = normalized.itemId.replaceAll('-', '').toLowerCase();
    normalized.data.id = `{${normalized.data.id.toLowerCase()}}`;
    for (const child of entries(normalized)) child.id = `{${child.id.toLowerCase()}}`;
    assert.equal(render(normalized, mode), render(fixture(), mode));
    const current = fixture(); entries(current).reverse();
    entries(current)[0].alphanumeral.jsonValue.value = 'IV';
    entries(current)[0].heading.jsonValue.value = 'Authored last step first';
    entries(current)[0].fieldCollection = [{ name: 'alphanumeral', jsonValue: { value: 'stale' } }];
    const html = render(current, mode);
    assert.match(html, /class="alphaType">IV<\/em>/);
    assert.ok(html.indexOf('Authored last step first') < html.indexOf('Authored claim step 2'));
    assert.doesNotMatch(html, /stale/);
  }
});

test('cleared optional Claims numeral is not fabricated or exposed as an empty canvas field', () => {
  for (const mode of modes) {
    const current = fixture(); entries(current)[0].alphanumeral.jsonValue.value = '';
    const observe = [], html = render(current, mode, compile(source, { observe }));
    assert.equal((html.match(/class="alphaType"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /No text in field|Mobile image/);
    assert.equal(observe.filter(call => call.name === 'Text' && call.field === entries(current)[0].alphanumeral.jsonValue).length, 0);
    assert.match(html, /Authored claim step 1/);
  }
});

function* excludedCases() {
  const mutations = [
    ['wrong-page', c => { c.itemId = rootId; }], ['missing-page', c => { delete c.itemId; }],
    ['malformed-page', c => { c.itemId += '-'; }], ['wrong-root', c => { c.data.id = pageId; }],
    ['missing-root', c => { delete c.data.id; }], ['malformed-root', c => { c.data.id += '-'; }],
    ['wrong-child', c => { entries(c)[0].id = rootId; }], ['missing-child-id', c => { delete entries(c)[0].id; }],
    ['malformed-child', c => { entries(c)[0].id += '-'; }], ['missing-card', c => { entries(c).pop(); }],
    ['extra-card', c => { const extra = structuredClone(entries(c)[0]); extra.id = rootId; entries(c).push(extra); }],
    ['duplicate-normalized-child', c => { entries(c)[1].id = `{${entries(c)[0].id.replaceAll('-', '').toLowerCase()}}`; }],
    ['icon', c => { entries(c)[0].icon.jsonValue.value = { src: '/fixture.svg', alt: 'Authored icon' }; }],
    ['image', c => { entries(c)[0].image.jsonValue.value = { src: '/fixture.jpg', alt: 'Authored image' }; }],
  ];
  for (const value of ['', undefined, 'transparent', 'unknown']) mutations.push([`icon-theme:${String(value)}`,
    c => { entries(c)[0].iconTheme.jsonValue.value = value; }]);
  for (const value of ['green-soft', 'unknown']) mutations.push([`card-theme:${value}`, c => { entries(c)[0].theme.jsonValue.value = value; }]);
  for (const [name, value] of [['layout', 'image-left'], ['columns', '1'], ['alignment', 'left'],
    ['theme', 'blue-soft'], ['headingLevel', 'h4']]) mutations.push([`param:${name}`, c => { c.params[name] = value; }]);
  for (const [label, mutate] of mutations) { const current = fixture(); mutate(current); yield { label, ...current }; }
  for (const variant of Object.keys(Cards).filter(name => name !== 'Default' && typeof Cards[name] === 'function')) {
    yield { label: `named:${variant}`, ...fixture(), variant };
  }
}
// Whole outputs of excluded owners, parameters, fields and named variants were
// pinned against release35 BEFORE implementing the Claims badge branch.
const excludedBaseline = {
  normal: '112:436dd7e74fa924a9bd8fa2d397ccb36ec405369db02e8dabd4d67a4d01069d97',
  preview: '112:436dd7e74fa924a9bd8fa2d397ccb36ec405369db02e8dabd4d67a4d01069d97',
  editing: '112:98f95026c8688c2e36846b8008fadaf3002864669064fa5c34aad096a6f1fd5f',
};
for (const mode of modes) test(`${mode} excluded Claims shapes retain exact release35 output`, () => {
  const digest = createHash('sha256'); let count = 0;
  for (const current of excludedCases()) { digest.update(current.label + '\0' + render(current, mode) + '\0'); count++; }
  assert.ok(count > 25);
  assert.equal(`${count}:${digest.digest('hex')}`, excludedBaseline[mode]);
});
