import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const params = { layout: 'image-right', splitRatio: '50:50', columns: '1', alignment: 'left',
  bodySize: 'medium', sectionWidth: 'contained', sectionSpacing: '1', matchHeightRow: '1' };
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-split-card', fieldId: `test-only-split-${name}`,
  fieldType: ['body', 'subheading'].includes(name) ? 'Rich Text'
    : ['image', 'icon'].includes(name) ? 'Image' : name === 'link' ? 'General Link' : 'Single-Line Text',
} } });
const card = () => ({ id: 'test-only-split-card',
  heading: field('heading', 'What are financial ratings?'), headingLevel: field('headingLevel', 'h2'),
  body: field('body', '<p>Ratings assess an insurer’s ability to meet its long-term obligations.</p>'),
  image: field('image', { src: '/test-only/discussion.svg', alt: 'People discussion', width: '1080', height: '934' }),
  theme: field('theme', 'blue-soft'), icon: field('icon', {}), alphanumeral: field('alphanumeral', ''),
  subheading: field('subheading', ''), link: field('link', { href: '' }), links: { targetItems: [] },
});
const datasource = value => ({ children: { results: [value] } });
const article = html => html.match(/<article\b.*?<\/article>/s)?.[0] ?? '';
const disclosure = html => html.match(/<details\b.*?<\/details>/s)?.[0] ?? '';
const openFields = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

test('empty optional native fields remain editable outside source split-image geometry', () => {
  const input = freeze(datasource(card())), before = JSON.stringify(input);
  const html = render(Cards.EditorialTiles, input, true, params), main = article(html), extra = disclosure(html);
  assert.match(html, /class="allianz-editorial-card-editor"/);
  assert.match(extra, /<summary>Additional content fields<\/summary>/);
  assert.doesNotMatch(extra, /<details[^>]*\bopen(?:\s|=|>)/);
  assert.ok(html.indexOf('</article>') < html.indexOf('<details'));
  assert.match(main, /<div class="tileSubHeading"><\/div>/);
  assert.doesNotMatch(main, /tileIcon|tileSubGrid__image|<footer/);
  for (const name of ['icon', 'alphanumeral', 'subheading']) {
    assert.ok(!main.includes(`test-only-split-${name}`));
    assert.ok(extra.includes(`test-only-split-${name}`));
  }
  for (const name of ['heading', 'body', 'image']) assert.ok(main.includes(`test-only-split-${name}`));
  for (const name of ['heading', 'body', 'image', 'icon', 'alphanumeral', 'subheading']) {
    assert.equal(openFields(html).filter(value => value.fieldId === `test-only-split-${name}`).length, 1);
  }
  assert.match(main, /class="c-image__img c-teaser__image-img"/);
  assert.equal(JSON.stringify(input), before);
});

test('native fieldCollection uses the same editable fields and never mutates input', () => {
  const named = card();
  const native = freeze(datasource({ id: named.id, fieldCollection: Object.entries(named)
    .filter(([name]) => name !== 'id').map(([name, value]) => ({ name,
      jsonValue: name === 'links' ? [] : value.jsonValue })) }));
  const before = JSON.stringify(native);
  for (const editing of [false, true]) {
    assert.equal(render(Cards.EditorialTiles, native, editing, params),
      render(Cards.EditorialTiles, freeze(datasource(named)), editing, params));
  }
  assert.equal(JSON.stringify(native), before);
});

test('populated optional roles stay inline and a clear returns each field to the disclosure', () => {
  const populated = card();
  populated.icon = field('icon', { src: '/test-only/icon.svg', alt: 'Icon' });
  populated.alphanumeral = field('alphanumeral', '2');
  populated.subheading = field('subheading', '<p>Independent assessment</p>');
  delete populated.links;
  populated.link = field('link', { href: '/about', text: 'About us' });
  const input = freeze(datasource(populated)), before = JSON.stringify(input);
  const html = render(Cards.EditorialTiles, input, true, params);
  assert.doesNotMatch(html, /allianz-editorial-card-editor|<details/);
  for (const name of ['icon', 'alphanumeral', 'subheading', 'link']) assert.ok(article(html).includes(`test-only-split-${name}`));
  assert.equal(JSON.stringify(input), before);
  const cleared = structuredClone(populated);
  cleared.icon.jsonValue.value = {}; cleared.alphanumeral.jsonValue.value = '';
  cleared.subheading.jsonValue.value = ''; cleared.link.jsonValue.value = { href: '' };
  const empty = render(Cards.EditorialTiles, freeze(datasource(cleared)), true, params);
  for (const name of ['icon', 'alphanumeral', 'subheading', 'link']) {
    assert.ok(disclosure(empty).includes(`test-only-split-${name}`));
    assert.ok(!article(empty).includes(`test-only-split-${name}`));
  }
});

test('ordered-link clearing and absent field authoring remain unchanged', () => {
  const value = card();
  value.link = field('link', { href: '/about', text: 'Stale scalar fallback' });
  for (const editing of [false, true]) {
    assert.ok(!render(Cards.EditorialTiles, datasource(value), editing, params).includes('Stale scalar fallback'));
  }
  for (const name of ['icon', 'alphanumeral', 'subheading', 'link']) delete value[name];
  assert.doesNotMatch(render(Cards.EditorialTiles, datasource(value), true, params), /<details|test-only-split-(?:icon|alphanumeral|subheading|link)/);
});

test('visitor output keeps source empty placeholders with no editing controls', () => {
  const html = render(Cards.EditorialTiles, freeze(datasource(card())), false, params);
  assert.match(html, /<div class="tileSubHeading"><\/div>/);
  assert.match(html, /tile--5050 -is--flipped -is--split t-bg-blue-soft/);
  assert.doesNotMatch(html, /<details|allianz-editorial-card-editor|tileIcon|<footer|test-only-split-heading/);
});

test('non-image tiles, introductions and callouts keep empty fields in their existing layout', () => {
  for (const variant of ['EditorialTiles', 'EditorialIntro', 'EditorialCallout']) {
    const html = render(Cards[variant], freeze(datasource(card())), true, { layout: 'stacked' });
    assert.doesNotMatch(html, /<details|allianz-editorial-card-editor/);
    for (const name of ['icon', 'alphanumeral', 'subheading']) assert.ok(article(html).includes(`test-only-split-${name}`));
  }
});
