import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { allianzCardFields } = loadSource(path.join(sourceRoot, 'lib/allianz-card-fields.ts'));
const cases = [
  ['missing', undefined, ''], ['empty', '', ''], ['null', null, ''],
  ['meaningful', 'Authored portrait description', 'Authored portrait description'],
  ['escaped', 'A "quote" & <symbol>', 'A &quot;quote&quot; &amp; &lt;symbol&gt;'],
];
const variants = [
  ['Default', { layout: 'stacked', columns: '1' }],
  ['SustainabilityRelated', { layout: 'cards' }],
  ['EditorialTiles', { layout: 'image-right', splitRatio: '67:33', columns: '1' }],
  ['SustainabilityGlobal', { layout: 'image-left' }],
];
const freeze = value => {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); }
  return value;
};
function datasource(alt, imageValue) {
  const value = imageValue ?? { src: '/test-only-card.jpg?version=1', width: '704', height: '520', ...(alt === undefined ? {} : { alt }) };
  const field = (name, value, type) => ({ name, jsonValue: { value, metadata: {
    fieldId: `test-${name}-field`, fieldType: type, itemId: 'test-card-owner',
    datasource: { id: 'test-card-owner', language: 'en', version: 1, revision: 'test-revision' },
  } } });
  return { children: { results: [{ id: 'test-card-owner', fieldCollection: [
    field('heading', 'Retained heading', 'Single-Line Text'),
    field('body', '<p>Retained <strong>formatted body</strong>.</p>', 'Rich Text'),
    field('image', value, 'Image'),
    field('link', { href: '/contact-us', text: 'Retained local link', target: '' }, 'General Link'),
  ] }] } };
}
for (const [variant, params] of variants) {
  for (const [state, alt, expected] of cases) for (const editing of [false, true]) {
    test(`${variant}: ${state} alt in ${editing ? 'editing' : 'visitor'} mode`, () => {
      const data = freeze(datasource(alt)), before = JSON.stringify(data);
      const card = data.children.results[0];
      const original = card.fieldCollection.find(item => item.name === 'image').jsonValue;
      assert.strictEqual(allianzCardFields(card).image.jsonValue, original);
      const html = render(Cards[variant], data, editing, params);
      const imgs = html.match(/<img\b[^>]*>/g) ?? [];
      assert.equal(imgs.length, 1);
      assert.ok(imgs[0].includes(`alt="${expected}"`), imgs[0]);
      assert.match(imgs[0], /src="\/test-only-card\.jpg\?version=1"/);
      assert.match(imgs[0], /width="704"/); assert.match(imgs[0], /height="520"/);
      assert.match(imgs[0], /class="c-image__img c-teaser__image-img"/);
      assert.match(html, /Retained heading/); assert.match(html, /<strong>formatted body<\/strong>/);
      assert.match(html, /href="\/contact-us"/);
      if (variant === 'SustainabilityRelated') assert.doesNotMatch(html, /Retained local link/);
      else assert.match(html, /Retained local link/);
      if (editing) assert.ok(html.includes(original.metadata.fieldId));
      assert.equal(JSON.stringify(data), before);
      assert.strictEqual(allianzCardFields(card).image.jsonValue, original);
    });
  }
  for (const editing of [false, true]) test(`${variant}: cleared images stay omitted in ${editing ? 'editing' : 'visitor'} mode`, () => {
    for (const value of [{}, { src: '', alt: '' }]) {
      const data = freeze(datasource(undefined, value)), before = JSON.stringify(data);
      const html = render(Cards[variant], data, editing, params);
      assert.doesNotMatch(html, /<img\b|test-image-field|scEmptyImage/);
      assert.match(html, /Retained heading/); assert.match(html, /href="\/contact-us"/);
      if (variant === 'SustainabilityRelated') assert.doesNotMatch(html, /Retained local link/);
      else assert.match(html, /Retained local link/);
      assert.equal(JSON.stringify(data), before);
    }
  });
}
