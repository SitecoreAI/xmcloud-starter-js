import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { compile, deepFreeze, filename, metadata, require } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8');
const Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const pageId = '8FDE8733-C514-5DA3-A45F-032CD9248B9F';
const gridId = 'B804DBC9-4366-47B1-8DEE-975A10EDAA28';
const childIds = ['AFF007FF-E17D-4573-A25C-A044F00CB559', 'C14AEAED-458A-4F4E-BBF5-4E1DE24D998C', 'F18E3438-2CC9-41CE-B93C-31C64A15B886'];
// Current source-owned amounts/descriptions and reconciled native boundaries.
// Metadata is synthetic; these SDK renders do not establish native publication.
const copy = [['$3.1M', 'in charitable contributions'], ['Over 12K', 'employee community engagement hours logged'],
  ['56%', 'of employees participated in community engagement activities']];
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-community-${owner}-${name}`, fieldType: type, fixtureOnly: true } } });
const entries = current => current.data.children.results;
const originalField = (card, name) => card[name]?.jsonValue ?? card.fieldCollection?.find(item => item.name === name)?.jsonValue;
function fixture(collection = false) {
  const children = childIds.map((id, index) => ({ id,
    heading: field(id, 'heading', ''), subheading: field(id, 'subheading', '', 'Rich Text'),
    body: field(id, 'body', copy[index][1], 'Rich Text'), alphanumeral: field(id, 'alphanumeral', copy[index][0]),
    iconTheme: field(id, 'iconTheme', 'primary-brand'), theme: field(id, 'theme', 'transparent'),
    headingLevel: field(id, 'headingLevel', 'h3'), icon: field(id, 'icon', {}, 'Image'),
    image: field(id, 'image', {}, 'Image'), link: field(id, 'link', { href: '' }, 'General Link') }));
  return { itemId: pageId, variant: 'CommunityStatistics', data: { id: gridId, children: { results: collection
    ? children.map(card => ({ id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) })) : children } },
  params: { layout: 'stacked', columns: '3', alignment: 'center', theme: 'transparent', headingLevel: 'h3', RenderingIdentifier: 'community-source-statistics' } };
}
function render(current, mode = 'normal', components = Cards) {
  const before = JSON.stringify(current); deepFreeze(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'Community local SDK fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), before, 'render never rewrites native fields, metadata, order or params');
  return html;
}
const badges = html => html.match(/class="tileIcon -is--wide t-bg-primary-brand t-icon-primary-white"/g) ?? [];

for (const mode of modes) test(`${mode}: the dedicated Community variant owns three wide native-field badges`, () => {
  for (const collection of [false, true]) {
    const current = fixture(collection), observe = [], html = render(current, mode, compile(source, { observe }));
    assert.equal(badges(html).length, 3);
    assert.equal((html.match(/tile--alphaNumeric -is--stacked/g) ?? []).length, 3);
    for (const [index, card] of entries(current).entries()) {
      const value = originalField(card, 'alphanumeral');
      const calls = observe.filter(call => call.name === 'Text' && call.field === value);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].tag, 'em'); assert.equal(calls[0].className, 'alphaType');
      assert.equal(calls[0].editable, mode === 'editing');
      assert.equal(calls[0].field.metadata, value.metadata);
      assert.equal(metadata(html).filter(entry => entry.fieldId === value.metadata.fieldId).length, mode === 'editing' ? 1 : 0);
      assert.equal(html.split(copy[index][0]).length - 1, 1, 'amount appears once, without a duplicated Body amount');
      assert.ok(html.includes(copy[index][1]));
    }
    assert.equal(html, render(fixture(!collection), mode), 'named fields and fieldCollection render identically');
  }
});

test('native GUID spelling, authored order and future authored amounts remain supported', () => {
  for (const mode of modes) {
    const current = fixture(); current.itemId = `{${pageId.toLowerCase()}}`; current.data.id = gridId.replaceAll('-', '').toLowerCase();
    for (const card of entries(current)) card.id = `{${card.id.toLowerCase()}}`;
    entries(current).reverse(); entries(current)[0].alphanumeral.jsonValue.value = '9';
    const html = render(current, mode);
    assert.equal(badges(html).length, 3, 'Community wide treatment does not depend on a numeral string lookup');
    assert.ok(html.includes('<em class="alphaType">9</em>'));
    assert.ok(html.indexOf(copy[2][1]) < html.indexOf(copy[0][1]), 'authored child order stays intact');
  }
});

test('explicitly cleared numerals, themes and Body stay clear without borrowed content', () => {
  for (const mode of modes) for (const collection of [false, true]) {
    for (const name of ['alphanumeral', 'iconTheme', 'body']) {
      const current = fixture(collection); originalField(entries(current)[0], name).value = '';
      const html = render(current, mode);
      assert.equal(badges(html).length, name === 'body' ? 3 : 2);
      if (name === 'alphanumeral') assert.ok(!html.includes(copy[0][0]));
      if (name === 'body') assert.ok(!html.includes(copy[0][1]));
      assert.doesNotMatch(html, /\[No text in field\]|Additional content fields/);
    }
  }
});

test('canonical fields retain precedence over stale fieldCollection entries', () => {
  const current = fixture();
  for (const card of entries(current)) card.fieldCollection = [
    { name: 'alphanumeral', jsonValue: { value: 'STALE AMOUNT' } }, { name: 'iconTheme', jsonValue: { value: 'transparent' } },
    { name: 'body', jsonValue: { value: 'STALE DESCRIPTION' } }, { name: 'image', jsonValue: { value: { src: '/stale.svg' } } },
  ];
  for (const mode of modes) { const html = render(current, mode); assert.equal(badges(html).length, 3); assert.doesNotMatch(html, /STALE|stale\.svg/); }
});

test('only the exact Community page, grid and three unique children receive the new treatment', () => {
  const mutations = [
    ['wrong-page', current => { current.itemId = gridId; }], ['missing-page', current => { delete current.itemId; }],
    ['malformed-page', current => { current.itemId += '-'; }], ['wrong-grid', current => { current.data.id = pageId; }],
    ['missing-grid', current => { delete current.data.id; }], ['malformed-grid', current => { current.data.id += '-'; }],
    ['wrong-child', current => { entries(current)[0].id = gridId; }], ['missing-child-id', current => { delete entries(current)[0].id; }],
    ['malformed-child', current => { entries(current)[0].id += '-'; }], ['missing-child', current => { entries(current).pop(); }],
    ['extra-child', current => { entries(current).push(structuredClone(entries(current)[0])); }],
    ['duplicate-normalized-child', current => { entries(current)[1].id = `{${childIds[0].toLowerCase()}}`; }],
  ];
  for (const mode of modes) for (const [label, mutate] of mutations) {
    const current = fixture(); mutate(current); const html = render(current, mode);
    assert.equal(badges(html).length, 0, label); assert.doesNotMatch(html, /class="alphaType"/);
  }
});

test('authored icons/images and non-brand themes never become synthetic source-number badges', () => {
  for (const mode of modes) for (const name of ['icon', 'image', 'iconTheme']) {
    const current = fixture(); originalField(entries(current)[0], name).value = name === 'iconTheme' ? 'transparent' : { src: '/original.svg', alt: 'Original image' };
    const html = render(current, mode); assert.equal(badges(html).length, 2);
    if (name !== 'iconTheme') assert.ok(html.includes('/original.svg'));
  }
});

test('Default and other established presentations do not opt into Community badges', () => {
  for (const mode of modes) for (const variant of ['Default', 'HeadingIcon', 'BrandHeadingIcon', 'SourceDownloadLinks']) {
    const current = fixture(); current.variant = variant; const html = render(current, mode);
    assert.equal(badges(html).length, 0, variant); assert.doesNotMatch(html, /class="alphaType"/);
    for (const [amount, label] of copy) { assert.ok(html.includes(amount)); assert.ok(html.includes(label)); }
  }
});

test('CommunityStatistics never activates the FPro, Claims or Lifetime badge contracts', () => {
  const groups = [
    ['76934D36-0DC4-5C21-969C-F98A3D915FDE', '7A125B9D-CBD6-49A8-A0BA-37C3F863500C', childIds],
    ['020EBCA9-1AF5-5887-B071-6295BE26D994', '8070C534-ACB7-4226-8E28-FDE9EFE92813',
      ['2A7E982F-6479-4CA4-B1D5-649F67DE3B9E', 'FF80E7EA-E9CC-4DE8-8AB8-0A3BADD9C4A9', '401C3F07-3298-4E56-B557-B045DD377F61']],
    ['8BCD5834-C744-4876-BE6C-CFBBA7E516AA', '7E8E748E-5064-4765-8F7E-F53F41598820',
      ['AFD60A97-9318-4AEB-8D6D-1160398A366A', '2E97C904-AB18-4F86-B23B-E0E923E7C20A',
        '597956DE-EA2F-449D-B868-A814D4E6AB0C', '4C26A07F-CEDE-4C4D-96A5-69B2FA4CD7CB']],
  ];
  for (const mode of modes) for (const [route, owner, ids] of groups) {
    const current = fixture(); current.itemId = route; current.data.id = owner;
    current.data.children.results = ids.map((id, index) => ({ ...structuredClone(entries(current)[index % 3]), id }));
    const html = render(current, mode);
    assert.equal(badges(html).length, 0);
    assert.doesNotMatch(html, /class="alphaType"/);
  }
});

test('missing datasource retains the existing component fallback', () => {
  const current = fixture(); delete current.data;
  assert.match(render(current), /AllianzCardGrid/);
});
