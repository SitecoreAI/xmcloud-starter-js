import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { component, field, render, editingIds, links } from '../../press-release-archive/__tests__/runtime.mjs';
import { collected, evidence, release, normalize } from '../../press-release-archive/__tests__/release-fixtures.mjs';
const { Default } = component('newsroom-featured-update', 'NewsroomFeaturedUpdate');
const seed = evidence.seeds.featured;
const row = evidence.years[2].rows.find((item) => item.articleId === evidence.curatedFeature.nativeIds.articleId);
const data = {
  label: field('feature-label', 'Single-Line Text', seed.label),
  release: { targetItem: release(row) },
  body: field('feature-body', 'Rich Text', seed.bodySourceHtml),
  image: field('feature-image', 'Image', { src: '/allianz-assets/verified-test-recognition.jpg', alt: seed.image.alt }),
};

test('curated feature reuses article title but renders distinct source copy and source split markup', () => {
  const html = render(Default, data);
  const source = fs.readFileSync(new URL('./newsroom-featured-update.source.html', import.meta.url), 'utf8');
  assert.match(html, /tile--6633 -is--flipped -is--split t-bg-blue-soft/);
  assert.match(html, /<h2>Latest update:<\/h2>/);
  assert.ok(normalize(html).includes(seed.referencedTitle));
  assert.ok(normalize(source).includes(seed.referencedTitle));
  assert.ok(normalize(html).includes('We have been recognized by Ethisphere for the seventh year in a row'));
  assert.equal(html.includes(row.snippet), false);
  assert.equal(html.includes('2026-03-18'), false);
  assert.equal(links(html).length, 1);
  assert.ok(html.includes(seed.image.alt.replaceAll("'", '&#x27;')));
  assert.equal(render(Default, collected({ ...data, release: { targetItem: collected(data.release.targetItem) } })), html);
  assert.equal(render(Default, data, false, { theme: 'green', alignment: 'center', splitRatio: '50:50', layout: 'stacked', headingLevel: 'h1' }), html);
  const latest = { ...data, releases: { targetItems: evidence.recent.map(release) } };
  assert.equal(render(Default, latest), html);
});

test('featured label/body/image and referenced title retain real empty-field editing metadata', () => {
  const empty = {
    label: field('feature-label', 'Single-Line Text', ''), body: field('feature-body', 'Rich Text', ''), image: field('feature-image', 'Image', {}),
    release: { targetItem: { ...data.release.targetItem, title: field('feature-title', 'Single-Line Text', '') } },
    fieldCollection: [{ name: 'label', jsonValue: data.label.jsonValue }, { name: 'body', jsonValue: data.body.jsonValue }, { name: 'image', jsonValue: data.image.jsonValue }],
  };
  assert.deepEqual(editingIds(render(Default, empty, true)), ['feature-body', 'feature-image', 'feature-label', 'feature-title']);
  assert.doesNotMatch(render(Default, empty), /Latest update|We have been recognized|<img|Most Ethical/);
  assert.match(render(Default, { ...empty, release: null }, true), /Select the featured news release/);
  assert.doesNotMatch(render(Default, { ...data, release: { jsonValue: { value: '' }, targetItem: data.release.targetItem } }), /<h3>/);
  assert.doesNotMatch(render(Default, { ...data, release: { jsonValue: evidence.recent[0].nativeIds.articleId, targetItem: data.release.targetItem } }), /<h3>/);
  const external = { ...empty, body: field('feature-body', 'Rich Text', '<p><a href="https://www.linkedin.com/company/allianz-life" target="_blank">LinkedIn</a></p>') };
  assert.deepEqual(links(render(Default, external)), ['#service-unavailable']);
  assert.deepEqual(links(render(Default, external, true)), ['https://www.linkedin.com/company/allianz-life']);
});
