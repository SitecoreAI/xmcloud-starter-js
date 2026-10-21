import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

// Real installed SDK rendering. Image values are source witnesses; no requests,
// asset fallback, CMS calls or native publication occur in this test.
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const routeId = 'e8e1893a-ff9b-4b4a-81bc-a809693ccf88';
const datasourceId = '6e198e6d-8694-4bea-88a9-702c6c07c5ea';
const renderingUid = '2eba7871-942d-404c-9275-f149bc7e3abb';
const params = { columns: '4', layout: 'stacked', alignment: 'center', marginBottom: 'xl',
  DynamicPlaceholderId: '12', FieldNames: 'Default' };
const cardIds = ['5FD974ACCE2D4B11B36DF6191E93BD6F', '5AB3D45E592A4DF199DA6D00B6A3B543',
  '082ABD9F31BE45FE925D7BA23EBAFA92', 'DB58BE5C8EFC480EA9A09913B421DAB7',
  '830DBCDB00044B1EB01EF0E80CD36329', '5140BD403B2C4FD68B5177944EA3A7E9',
  '85A9DB15E06F400490863B05BC643E8B'];
const partners = ['S-and-P', 'Blackrock', 'Bloomberg', 'Nasdaq', 'Russell', 'PIMCO', 'Morgan-Stanley'];
const field = (itemId, name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId, fieldId: `test-${itemId}-${name}`, fieldType } } });
function datasource() {
  return { id: datasourceId, children: { results: cardIds.map((id, i) => ({ id,
    heading: field(id, 'heading', ''), subheading: field(id, 'subheading', ''),
    body: field(id, 'body', '', 'Rich Text'), alphanumeral: field(id, 'alphanumeral', ''),
    image: field(id, 'image', { src: `https://www.allianzlife.com/-/media/Feature/Tile/Allianz-Life/fia-index-options/tile-azl-fia-index-options-${partners[i]}_fourth.jpg`,
      alt: partners[i], width: '512', height: '212' }, 'Image'),
    icon: field(id, 'icon', { src: '', alt: '' }, 'Image'),
    link: field(id, 'link', { href: '', text: '' }, 'General Link'), links: { targetItems: [] },
  })) } };
}
function render(data, itemId = routeId, isEditing = false, overrides = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Unrelated caption', itemId,
        fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Default, { rendering: { uid: renderingUid, componentName: 'AllianzCardGrid' },
    params: { ...params, ...overrides }, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}
const logoCount = (html) => (html.match(/data-allianz-index-partner-logo=""/g) ?? []).length;
const imageCount = (html) => (html.match(/<img\b[^>]*class="c-image__img c-teaser__image-img"/g) ?? []).length;

test('the exact native page and saved grid scope all seven source-only logos without links or text', () => {
  const data = datasource(), before = JSON.stringify(data);
  for (const itemId of [routeId, `{${routeId.toUpperCase()}}`, routeId.replaceAll('-', '')]) {
    const html = render(data, itemId);
    assert.match(html, /data-allianz-index-partner-logos=""/);
    assert.equal(logoCount(html), 7);
    assert.equal(imageCount(html), 7);
    assert.doesNotMatch(html, /<a\b|<h[1-6]\b/);
    partners.forEach((partner, i) => {
      assert.ok(html.includes(data.children.results[i].image.jsonValue.value.src));
      assert.ok(html.includes(`alt="${partner}"`));
    });
    assert.equal(JSON.stringify(data), before);
  }
  data.id = `{${datasourceId.toUpperCase()}}`;
  assert.equal(logoCount(render(data)), 7, 'native GUID formatting is normalized');
});

test('other pages, datasources and card layouts retain their complete Default output', () => {
  const data = datasource(), ordinary = render(data, 'unrelated-page');
  for (const itemId of [null, '', 'e8e1893a-ff9b-4b4a-81bc-a809693ccf89']) {
    const actual = render(data, itemId);
    assert.equal(actual, ordinary);
    assert.doesNotMatch(actual, /data-allianz-index-partner-logo/);
  }
  for (const id of [undefined, '', '6e198e6d-8694-4bea-88a9-702c6c07c5eb']) {
    data.id = id;
    assert.equal(render(data), render(data, 'unrelated-page'));
  }
  data.id = datasourceId;
  for (const overrides of [{ layout: 'cards' }, { layout: 'image-left' }, { layout: 'list' }, { columns: '3' }]) {
    assert.equal(render(data, routeId, false, overrides), render(data, 'unrelated-page', false, overrides));
  }
  assert.doesNotMatch(render(undefined), /data-allianz-index-partner-logo/);
});

test('populated text, scalar or ordered links, icons and numerals keep general card image behavior', () => {
  const changes = [
    (card) => { card.heading.jsonValue.value = 'An authored heading'; },
    (card) => { card.subheading.jsonValue.value = 'An authored subheading'; },
    (card) => { card.body.jsonValue.value = '<p>An authored body</p>'; },
    (card) => { card.alphanumeral.jsonValue.value = '1'; },
    (card) => { card.icon.jsonValue.value = { src: '/native-icon.svg', alt: 'Icon' }; },
    (card) => { card.link.jsonValue.value = { href: '/about', text: 'About' }; },
    (card) => { card.links.targetItems.push({ id: 'test-link', link: field(card.id, 'ordered-link', { href: '/about', text: 'About' }, 'General Link') }); },
  ];
  for (const change of changes) {
    const data = datasource(); change(data.children.results[0]);
    for (const editing of [false, true]) {
      const html = render(data, routeId, editing);
      assert.equal(logoCount(html), 6);
      const articles = [...html.matchAll(/<article\b([^>]*?)>/g)];
      assert.ok(!articles[0][1].includes('data-allianz-index-partner-logo'));
      assert.equal(imageCount(html), 7);
    }
  }
});

test('populated images retain native editing identity while cleared images add no canvas controls', () => {
  const data = datasource(), card = data.children.results[0], original = structuredClone(card.image.jsonValue.value);
  const initial = render(data), metadata = card.image.jsonValue.metadata;
  for (const src of [original.src, '']) {
    card.image.jsonValue.value = { ...original, src };
    const before = JSON.stringify(data), editing = render(data, routeId, true);
    assert.equal(editing.includes(metadata.fieldId), Boolean(src), 'only populated images mount their original native canvas field');
    assert.equal(logoCount(editing), 7, 'clearing an image retains the source-owned card wrapper');
    assert.equal(imageCount(render(data)), src ? 7 : 6);
    assert.equal(JSON.stringify(data), before);
    assert.equal(card.image.jsonValue.metadata, metadata);
  }
  card.image.jsonValue.value = original;
  assert.equal(render(data), initial);
  delete card.image;
  assert.equal(logoCount(render(data, routeId, true)), 6);
});

test('modern fieldCollection gives the same SDK output and preserves complete image metadata', () => {
  const named = datasource(), wire = structuredClone(named);
  wire.children.results = wire.children.results.map((card) => ({ id: card.id,
    fieldCollection: Object.entries(card).flatMap(([name, value]) => value?.jsonValue ? [{ name, jsonValue: value.jsonValue }] : []),
  }));
  const before = JSON.stringify(wire);
  for (const editing of [false, true]) assert.equal(render(wire, routeId, editing), render(named, routeId, editing));
  assert.equal(JSON.stringify(wire), before);
});

test('the only CSS override contains full logos inside the marked native tile without changing geometry', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzIndexPartnerLogos.css'), 'utf8');
  assert.match(css, /\.allianz-modern \[data-allianz-index-partner-logos\] \[data-allianz-index-partner-logo\] > \.tileImage \.c-image__img\.c-teaser__image-img/);
  assert.match(css, /object-fit: contain;/);
  assert.equal((css.match(/\{/g) ?? []).length, 1);
  assert.doesNotMatch(css, /height:|width:|margin:|padding:|object-fit: cover/);
});
