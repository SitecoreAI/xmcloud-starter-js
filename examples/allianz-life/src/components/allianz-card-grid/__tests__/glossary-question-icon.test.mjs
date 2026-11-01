import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, deepFreeze, filename, metadata, require, sourceRoot } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8'), Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const pageId = 'BFBCD304-87A6-411B-AE71-DB48EDEA8D76';
const rootId = '1C78E315-AAFC-415A-A936-F3DF44A93185';
const childId = 'B6F8BF83-A7E2-4412-A3F1-9282A20F4369';
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: childId, fieldId: `test-glossary-${name}`, fieldType, fixtureOnly: true },
} });
function fixture(collection = false) {
  const card = { id: childId, heading: field('heading', 'Retained synthetic heading'),
    body: field('body', '<p>Retained synthetic <em>body</em>.</p>', 'Rich Text'),
    icon: field('icon', { src: '/test-glossary-question.svg?v=original', alt: 'Authored Question',
      width: '24', height: '24', className: 'original-authored-icon', 'dam-id': 'test-only-original' }, 'Image'),
    iconTheme: field('iconTheme', ''), theme: field('theme', 'transparent'),
    image: field('image', {}, 'Image'),
    link: field('link', { href: '/Login', text: 'Login', linktype: 'internal' }, 'General Link') };
  return { itemId: pageId, variant: 'Default', data: { id: rootId, children: { results: [collection
    ? { id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
      .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) } : card] } },
    params: { layout: 'stacked', columns: '1', alignment: 'center', theme: 'green-soft', headingLevel: 'h2' } };
}
const child = current => current.data.children.results[0];
const valueField = (card, name) => card[name]?.jsonValue ?? card.fieldCollection?.find(field => field.name === name)?.jsonValue;
function render(current, mode, components = Cards) {
  deepFreeze(current); const before = JSON.stringify(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing',
      isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'Synthetic Glossary support',
        fields: {}, placeholders: {} } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), before, 'Native fields and metadata must not change');
  return html;
}

for (const mode of modes) test(`${mode}: exact Glossary support uses its native editable white-on-purple Image`, () => {
  for (const collection of [false, true]) {
    const current = fixture(collection), original = valueField(child(current), 'icon'), observe = [];
    const html = render(current, mode, compile(source, { observe }));
    assert.equal((html.match(/data-allianz-card-icon-appearance="white-on-purple"/g) ?? []).length, 1);
    assert.match(html, /tileIcon t-bg-purple-bright t-icon-primary-white/);
    const calls = observe.filter(call => call.name === 'Image' && call.field === original);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].editable, mode === 'editing');
    assert.equal(calls[0].className, 'allianz-card-icon-glyph');
    assert.equal(calls[0].alt, undefined, 'Authored native alt is not replaced');
    assert.equal(calls[0].field.metadata.itemId, childId);
    assert.match(html, /test-glossary-question\.svg\?v=original/);
    assert.match(html, /alt="Authored Question"/);
    assert.match(html, /Retained synthetic <em>body<\/em>/);
    assert.equal(metadata(html).filter(field => field.fieldId === 'test-glossary-icon').length, mode === 'editing' ? 1 : 0);
    assert.match(html, mode === 'editing' ? /href="\/Login"/ : /href="#service-unavailable"/);
    assert.equal(html, render(fixture(!collection), mode));
  }
});

test('canonical GUID spellings, cleared alt and replacement Image identity remain native', () => {
  for (const mode of modes) {
    const current = fixture(); current.itemId = pageId.replaceAll('-', '').toLowerCase();
    current.data.id = '{' + rootId.toLowerCase() + '}'; child(current).id = childId.replaceAll('-', '').toLowerCase();
    current.params.iconAppearance = '';
    child(current).icon.jsonValue.value = { src: '/test-replacement-question.svg', alt: '' };
    child(current).fieldCollection = [{ name: 'icon', jsonValue: { value: { src: '/stale-icon.svg' } } }];
    const original = child(current).icon.jsonValue, observe = [];
    const html = render(current, mode, compile(source, { observe }));
    assert.match(html, /data-allianz-card-icon-appearance="white-on-purple"/);
    assert.match(html, /src="\/test-replacement-question\.svg"/);
    assert.match(html, /alt=""/);
    assert.doesNotMatch(html, /stale-icon/);
    assert.equal(observe.filter(call => call.name === 'Image' && call.field === original).length, 1);
  }
});

function* excludedCases() {
  const mutations = [
    ['wrong-page', c => { c.itemId = rootId; }], ['missing-page', c => { delete c.itemId; }],
    ['malformed-page', c => { c.itemId += '-'; }], ['wrong-grid', c => { c.data.id = pageId; }],
    ['missing-grid', c => { delete c.data.id; }], ['malformed-grid', c => { c.data.id += '-'; }],
    ['wrong-child', c => { child(c).id = rootId; }], ['missing-child', c => { delete child(c).id; }],
    ['malformed-child', c => { child(c).id += '-'; }], ['missing-card', c => { c.data.children.results = []; }],
    ['duplicate-card', c => { c.data.children.results.push(structuredClone(child(c))); }],
    ['extra-card', c => { const card = structuredClone(child(c)); card.id = rootId; c.data.children.results.push(card); }],
    ['missing-icon', c => { delete child(c).icon; }], ['undefined-icon-json', c => { child(c).icon = {}; }],
    ['cleared-icon', c => { child(c).icon.jsonValue.value = {}; }],
    ['empty-icon-src', c => { child(c).icon.jsonValue.value.src = ''; }],
    ['competing-image', c => { child(c).image.jsonValue.value = { src: '/test-original-card.jpg', alt: 'Original card' }; }],
    ['missing-icon-theme', c => { delete child(c).iconTheme; }],
  ];
  for (const value of [undefined, null, ' ', 'primary-brand', 'white-on-purple', 'unknown']) mutations.push([
    `icon-theme:${String(value)}`, c => { child(c).iconTheme.jsonValue.value = value; }]);
  for (const value of [undefined, '', 'green-soft', 'unknown']) mutations.push([
    `card-theme:${String(value)}`, c => { child(c).theme.jsonValue.value = value; }]);
  for (const [key, value] of [['layout', 'plain'], ['columns', '2'], ['alignment', 'left'],
    ['theme', 'transparent'], ['headingLevel', 'h3']]) mutations.push([`param:${key}`, c => { c.params[key] = value; }]);
  for (const value of ['white-on-black', 'gray-on-transparent', 'white-on-brand', 'white-on-purple', 'unknown', null, ' '])
    mutations.push([`appearance:${String(value)}`, c => { c.params.iconAppearance = value; }]);
  for (const [label, mutate] of mutations) { const current = fixture(); mutate(current); yield { label, ...current }; }
  for (const variant of Object.keys(Cards).filter(name => name !== 'Default' && typeof Cards[name] === 'function'))
    yield { label: `named:${variant}`, ...fixture(), variant };
}
// Independently captured from deployed baseline6591, not from the new branch.
const excludedBaseline = {"normal": "129:2a669bdfde2d9e5b1da4b9ad9d6dfe8a0e5cc008d873a9f33c24c265d221b33e", "preview": "129:2a669bdfde2d9e5b1da4b9ad9d6dfe8a0e5cc008d873a9f33c24c265d221b33e", "editing": "129:6d353b660e052b5b8ef2250e9336d03f844efcc95187e6108172871c3eeec9ab"};
for (const mode of modes) test(`${mode}: excluded owners, fields, parameters and other exports retain baseline6591 output`, () => {
  const digest = createHash('sha256'); let count = 0;
  for (const current of excludedCases()) {
    const html = render(current, mode);
    assert.doesNotMatch(html, /data-allianz-card-icon-appearance="white-on-purple"/, current.label);
    digest.update(current.label + '\0' + html + '\0'); count++;
  }
  assert.ok(count > 50);
  assert.equal(count + ':' + digest.digest('hex'), excludedBaseline[mode]);
});

test('private purple is not accepted as a public appearance on a generic Default card', () => {
  for (const mode of modes) for (const value of ['white-on-purple', 'white-on-brand', 'unknown']) {
    const current = fixture(); current.itemId = rootId; current.params.iconAppearance = value;
    const html = render(current, mode);
    assert.doesNotMatch(html, /data-allianz-card-icon-appearance=/);
    assert.match(html, /class="original-authored-icon"/);
  }
});

test('required exports and the two public appearances preserve original SDK Image fields', () => {
  for (const name of ['Default', 'EditorialStacked', 'RilaAccumulationProducts', 'RilaIncomeProducts']) {
    assert.equal(typeof Cards[name], 'function', name);
  }
  for (const variant of ['Default', 'EditorialStacked']) for (const mode of modes) {
    for (const appearance of ['white-on-black', 'gray-on-transparent']) {
      const current = fixture(), observe = [];
      current.itemId = rootId; current.variant = variant; current.params.iconAppearance = appearance;
      const original = child(current).icon.jsonValue;
      const html = render(current, mode, compile(source, { observe }));
      assert.match(html, new RegExp(`data-allianz-card-icon-appearance="${appearance}"`));
      assert.doesNotMatch(html, /data-allianz-card-icon-appearance="white-on-purple"/);
      const calls = observe.filter(call => call.name === 'Image' && call.field === original);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].editable, mode === 'editing');
      assert.equal(original.value.alt, 'Authored Question');
      assert.equal(original.metadata.fieldId, 'test-glossary-icon');
    }
  }
});

test('purple white-filter styling reuses the existing 40/64 circle and 26/40 image sizing', () => {
  const postcss = require('postcss');
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardIcons.css'), 'utf8'));
  const values = (selector, media = false) => {
    const result = {};
    css.walkRules(selector, rule => {
      if ((rule.parent.type === 'atrule') !== media) return;
      if (media) assert.equal(rule.parent.params, '(min-width: 704px)');
      rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
    });
    return result;
  };
  const circle = '.tileIcon[data-allianz-card-icon-appearance]';
  const image = circle + ' .allianz-card-icon-glyph';
  assert.equal(values(circle).width, '40px'); assert.equal(values(circle).height, '40px');
  assert.equal(values(circle)['border-radius'], '50%');
  assert.equal(values(image).width, '26px'); assert.equal(values(image).height, '26px');
  assert.equal(values(circle, true).width, '64px'); assert.equal(values(circle, true).height, '64px');
  assert.equal(values(image, true).width, '40px'); assert.equal(values(image, true).height, '40px');
  assert.deepEqual(values('.tileIcon[data-allianz-card-icon-appearance="white-on-purple"] .allianz-card-icon-glyph'),
    { filter: 'brightness(0) invert(1)' });
  const sourceCss = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const purple = [];
  sourceCss.walkRules('.t-bg-purple-bright', rule => rule.walkDecls('background-color', declaration => purple.push(declaration.value)));
  assert.deepEqual(purple, ['#503368']);
});
