import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, deepFreeze, filename, require } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8'), Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const pageId = '020EBCA9-1AF5-5887-B071-6295BE26D994';
const rootId = '44C1FA72-9B72-4B5E-A007-599B8C6A687B';
const childId = 'B912D4BA-7684-488E-8D15-1C30EBC21ACC';
// Native owner/field roles and parameters are witnessed. SDK metadata below is
// synthetic: these tests preserve its identity, not claim native acceptance.
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: childId, fieldId: 'fixture-question-' + name, fieldType: type, fixtureOnly: true } } });
function fixture(collection = false) {
  const card = { id: childId, heading: field('heading', 'Frequently asked questions'),
    body: field('body', '', 'Rich Text'), subheading: field('subheading', '', 'Rich Text'),
    icon: field('icon', { src: '/fixture-question.svg?v=original', alt: 'Question', width: '24', height: '24',
      'dam-id': 'fixture-only-original-dam', className: 'original-authored-icon' }, 'Image'),
    image: field('image', {}, 'Image'), iconTheme: field('iconTheme', 'primary-brand'),
    theme: field('theme', 'transparent'), alphanumeral: field('alphanumeral', ''),
    link: field('link', { href: '' }, 'General Link') };
  return { itemId: pageId, variant: 'Default', data: { id: rootId, children: { results: [collection
    ? { id: card.id, fieldCollection: Object.entries(card).filter(([key]) => key !== 'id')
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) } : card] } },
    params: { theme: 'transparent', layout: 'plain', columns: '1', alignment: 'center', spacing: 'none',
      headingLevel: 'h2', paddingTop: 'lg', paddingBottom: 'none', marginBottom: 'lg',
      DynamicPlaceholderId: '10', FieldNames: '{A9538E4C-C44E-5C01-BCF2-0DE4DE3DB2BA}' } };
}
const child = current => current.data.children.results[0];
const valueField = (card, name) => card[name]?.jsonValue ?? card.fieldCollection?.find(item => item.name === name)?.jsonValue;
function render(current, mode, components = Cards) {
  deepFreeze(current); const before = JSON.stringify(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing',
      isNormal: mode === 'normal', isPreview: mode === 'preview' },
    layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'Claims Question fixture',
      fields: {}, placeholders: {} } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), before, 'render preserves original content and Image metadata');
  return html;
}

for (const mode of modes) test(mode + ' exact Claims Question uses the original editable white-on-brand Image', () => {
  for (const collection of [false, true]) {
    const current = fixture(collection), original = valueField(child(current), 'icon'), observe = [];
    const html = render(current, mode, compile(source, { observe }));
    assert.equal((html.match(/data-allianz-card-icon-appearance="white-on-brand"/g) ?? []).length, 1);
    const calls = observe.filter(call => call.name === 'Image' && call.field === original);
    assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing');
    assert.equal(calls[0].className, 'allianz-card-icon-glyph');
    assert.equal(calls[0].field.metadata.itemId, childId);
    assert.equal(original.value.alt, 'Question');
    assert.equal(original.value['dam-id'], 'fixture-only-original-dam');
    assert.match(html, /fixture-question\.svg\?v=original/);
    assert.match(html, /Frequently asked questions/);
    assert.equal(html, render(fixture(!collection), mode));
  }
});

test('Question preserves valid GUID spellings, empty alt and canonical named Image ownership', () => {
  for (const mode of modes) {
    const current = fixture(); current.itemId = current.itemId.replaceAll('-', '').toLowerCase();
    current.data.id = '{' + current.data.id.toLowerCase() + '}';
    child(current).id = child(current).id.replaceAll('-', '').toLowerCase();
    current.params.iconAppearance = '';
    child(current).theme.jsonValue.value = '';
    child(current).icon.jsonValue.value.alt = '';
    child(current).fieldCollection = [{ name: 'icon', jsonValue: { value: { src: '/stale-icon.svg' } } }];
    const original = child(current).icon.jsonValue, observe = [];
    const html = render(current, mode, compile(source, { observe }));
    assert.match(html, /data-allianz-card-icon-appearance="white-on-brand"/);
    assert.doesNotMatch(html, /stale-icon/);
    assert.equal(observe.filter(call => call.name === 'Image' && call.field === original).length, 1);
    assert.equal(original.value.alt, '');
  }
});

function* excludedCases() {
  const mutations = [
    ['wrong-page', c => { c.itemId = rootId; }], ['missing-page', c => { delete c.itemId; }],
    ['malformed-page', c => { c.itemId += '-'; }], ['wrong-root', c => { c.data.id = pageId; }],
    ['missing-root', c => { delete c.data.id; }], ['malformed-root', c => { c.data.id += '-'; }],
    ['wrong-child', c => { child(c).id = rootId; }], ['missing-child', c => { delete child(c).id; }],
    ['malformed-child', c => { child(c).id += '-'; }], ['missing-card', c => { c.data.children.results = []; }],
    ['duplicate-card', c => { c.data.children.results.push(structuredClone(child(c))); }],
    ['extra-card', c => { const extra = structuredClone(child(c)); extra.id = rootId; c.data.children.results.push(extra); }],
    ['cleared-icon', c => { child(c).icon.jsonValue.value = {}; }],
    ['absent-icon', c => { delete child(c).icon; }],
    ['competing-image', c => { child(c).image.jsonValue.value = { src: '/original-card-image.jpg', alt: 'Original' }; }],
  ];
  for (const value of ['', undefined, 'transparent', 'unknown']) mutations.push(['icon-theme:' + String(value),
    c => { child(c).iconTheme.jsonValue.value = value; }]);
  for (const value of ['green-soft', 'unknown']) mutations.push(['card-theme:' + value,
    c => { child(c).theme.jsonValue.value = value; }]);
  for (const [key, value] of [['layout', 'stacked'], ['columns', '2'], ['alignment', 'left'],
    ['theme', 'blue-soft'], ['headingLevel', 'h3']]) mutations.push(['param:' + key, c => { c.params[key] = value; }]);
  for (const value of ['white-on-black', 'gray-on-transparent', 'white-on-brand', 'unknown', null, ' ', 'WHITE-ON-BLACK'])
    mutations.push(['appearance:' + String(value), c => { c.params.iconAppearance = value; }]);
  for (const [label, mutate] of mutations) { const current = fixture(); mutate(current); yield { label, ...current }; }
  for (const variant of Object.keys(Cards).filter(name => name !== 'Default' && name !== 'ProfessionalContactPrompt' && typeof Cards[name] === 'function'))
    yield { label: 'named:' + variant, ...fixture(), variant };
}
// Captured against frozen699a BEFORE the Question branch. Do not regenerate from
// the implementation under test: exclusions must retain whole previous outputs.
const excludedBaseline = {
  normal: '120:587254ad959653f54db85140656e4b23944ac54928fb0ad008f6aa63fee353f6',
  preview: '120:587254ad959653f54db85140656e4b23944ac54928fb0ad008f6aa63fee353f6',
  editing: '120:8b3eee12a0c5ff27b9d9e131f2340e76d8c6f701d026a09db8471017f931daf5',
};
for (const mode of modes) test(mode + ' non-Claims, changed shapes, clear fields and explicit appearances retain frozen699a output', () => {
  const digest = createHash('sha256'); let count = 0;
  for (const current of excludedCases()) { digest.update(current.label + '\0' + render(current, mode) + '\0'); count++; }
  assert.ok(count > 30);
  assert.equal(count + ':' + digest.digest('hex'), excludedBaseline[mode]);
});
