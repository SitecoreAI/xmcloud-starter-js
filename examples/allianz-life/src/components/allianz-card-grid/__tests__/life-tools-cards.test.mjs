import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const sha = value => createHash('sha256').update(value).digest('hex');
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const attrs = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `${owner}-${name}-field`, fieldType: type } } });
const link = (owner, name, number) => field(owner, name, {
  href: `/what-we-offer/life-insurance/college-funding`, text: `Native link ${number}`,
  id: '{11111111-1111-4111-8111-111111111111}', linktype: 'internal', target: '', querystring: '', anchor: '',
}, 'General Link');
function fixture(count, more = false) {
  const root = 'test-only-tools-root';
  return { id: root, heading: field(root, 'heading', 'Native source introduction'),
    body: field(root, 'body', '<p>Native <strong>complete introduction</strong>.</p>', 'Rich Text'),
    subheading: field(root, 'subheading', 'UNUSED-ROOT-SUBTITLE', 'Rich Text'),
    primaryLink: field(root, 'primaryLink', { href: '/unused-root-link', text: 'UNUSED-ROOT-LINK' }, 'General Link'),
    image: field(root, 'image', { src: '/unused-root-image.svg' }, 'Image'),
    icon: field(root, 'icon', { src: '/unused-root-icon.svg' }, 'Image'),
    children: { results: Array.from({ length: count }, (_, index) => {
      const owner = 'test-only-tools-card-' + index;
      return { id: owner, fieldCollection: [
        { name: 'Heading', ...field(owner, 'heading', `Native card ${index}`) },
        { name: 'Body', ...field(owner, 'body', `<p>Complete card ${index} <em>body</em>.</p>`, 'Rich Text') },
        { name: 'Image', ...field(owner, 'image', { src: `/test-only-tools/card-${index}.jpg`, alt: `Native card alt ${index}`, width: '1200', height: '800' }, 'Image') },
        { name: 'Link', ...link(owner, 'link', index) },
        { name: 'Subheading', ...field(owner, 'subheading', more ? 'Video' : 'UNUSED-CARD-CATEGORY', 'Rich Text') },
        { name: 'Icon', ...field(owner, 'icon', { src: '/unused-card-icon.svg' }, 'Image') },
        { name: 'Links', jsonValue: [{ id: owner + '-unused-navigation', fields: {
          link: link(owner + '-unused-navigation', 'link', index).jsonValue,
        } }] },
      ] };
    }) } };
}
const childField = (data, index, name) => data.children.results[index].fieldCollection.find(field => field.name === name).jsonValue;
const configurations = [
  { name: 'LifeToolsNeeds', count: 2, columns: 2, theme: 't-bg-transparent', glyph: 'calculator', body: true },
  { name: 'LifeToolsStrategy', count: 5, columns: 3, theme: 't-bg-blue-soft', glyph: 'puzzle', body: true },
  { name: 'LifeToolsMore', count: 1, columns: 3, theme: 't-bg-transparent', glyph: 'user-settings', body: false },
];
for (const configuration of configurations) {
  test(`${configuration.name} retains source columns, theme, complete cards and scalar native links in both modes`, () => {
    const data = fixture(configuration.count, !configuration.body), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards[configuration.name], data, editing, { columns: '4', theme: 'green-soft', alignment: 'left' });
      assert.ok(html.includes(`l-container--full-width ${configuration.theme} allianz-life-tools-cards`));
      assert.ok(html.includes(`o-cards o-cards__col${configuration.columns}`));
      assert.ok(html.includes('l-grid__row u-margin-bottom-lg u-padding-top-lg'));
      assert.ok(html.includes('l-grid__row u-margin-bottom-xl'));
      assert.equal((html.match(/class="m-card"/g) || []).length, configuration.count);
      assert.equal((html.match(/<h4\b/g) || []).length, configuration.count);
      assert.ok(attrs(html, 'img', 'src').includes(`/allianz-ui/life-tools/${configuration.glyph}.svg`));
      for (let index = 0; index < configuration.count; index++) {
        assert.ok(html.includes(childField(data, index, 'Body').value));
        assert.ok(attrs(html, 'img', 'src').includes(childField(data, index, 'Image').value.src));
        assert.ok(attrs(html, 'img', 'alt').includes(childField(data, index, 'Image').value.alt));
      }
      assert.deepEqual(attrs(html, 'a', 'href'), Array(configuration.count).fill('/what-we-offer/life-insurance/college-funding'));
      assert.equal(attrs(html, 'a', 'aria-label').length, 0, 'Empty source card ARIA must not be replaced with inferred labels');
      assert.equal(html.includes(data.body.jsonValue.value), configuration.body);
      assert.equal(JSON.stringify(data), before, 'Native values and metadata must not change');
    }
  });
  test(`${configuration.name} gives each active native field one SDK marker and suppresses inactive fields`, () => {
    const data = fixture(configuration.count, !configuration.body), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards[configuration.name], data, editing);
      assert.doesNotMatch(html, /UNUSED-ROOT|unused-root|unused-card-icon|unused-navigation/);
      if (configuration.body) assert.doesNotMatch(html, /UNUSED-CARD-CATEGORY/);
    }
    const actual = markers(render(Cards[configuration.name], data, true));
    const expected = [data.heading.jsonValue];
    if (configuration.body) expected.push(data.body.jsonValue);
    for (let index = 0; index < configuration.count; index++) {
      for (const name of ['Heading', 'Body', 'Image', 'Link']) expected.push(childField(data, index, name));
      if (!configuration.body) expected.push(childField(data, index, 'Subheading'));
    }
    assert.equal(actual.length, expected.length);
    for (const value of expected) assert.equal(actual.filter(marker => marker.itemId === value.metadata.itemId && marker.fieldId === value.metadata.fieldId).length, 1);
    assert.equal(JSON.stringify(data), before);
  });
}

test('native serializer fieldCollection and named-field forms render identical tool cards', () => {
  const data = fixture(2), named = structuredClone(data);
  named.children.results = named.children.results.map(card => ({ id: card.id,
    ...Object.fromEntries(card.fieldCollection.filter(field => field.name !== 'Links').map(field => [field.name[0].toLowerCase() + field.name.slice(1), { jsonValue: field.jsonValue }])) }));
  for (const editing of [false, true]) assert.equal(render(Cards.LifeToolsNeeds, named, editing), render(Cards.LifeToolsNeeds, data, editing));
});

test('native link destination, target and split query/anchor semantics survive without altering field objects', () => {
  const data = fixture(2), value = childField(data, 0, 'Link');
  Object.assign(value.value, { querystring: 'tools=native', anchor: 'source-section', target: '_blank', 'aria-label': 'Explicit native label' });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.LifeToolsNeeds, data, editing);
    assert.ok(attrs(html, 'a', 'href').includes('/what-we-offer/life-insurance/college-funding?tools=native#source-section'));
    assert.ok(attrs(html, 'a', 'target').includes('_blank'));
    assert.ok(attrs(html, 'a', 'aria-label').includes('Explicit native label'));
  }
  assert.equal(JSON.stringify(data), before);
});

test('a cleared card link becomes inert for visitors and retains its original author marker', () => {
  const data = fixture(2);childField(data, 0, 'Link').value = { href: '', text: '' };
  const before = JSON.stringify(data), visitor = render(Cards.LifeToolsNeeds, data);
  assert.equal(attrs(visitor, 'a', 'href').length, 1);
  assert.equal((visitor.match(/class="m-card"/g) || []).length, 2);
  const value = childField(data, 0, 'Link'), actual = markers(render(Cards.LifeToolsNeeds, data, true));
  assert.equal(actual.filter(marker => marker.itemId === value.metadata.itemId && marker.fieldId === value.metadata.fieldId).length, 1);
  assert.equal(JSON.stringify(data), before);
});

test('More footer uses actual native category text and fixed source video glyph without a player', () => {
  const data = fixture(1, true), value = childField(data, 0, 'Subheading');
  for (const editing of [false, true]) {
    const html = render(Cards.LifeToolsMore, data, editing);
    assert.match(html, /m-card__footer/);assert.match(html, /cardCategory/);
    assert.ok(attrs(html, 'img', 'src').includes('/allianz-ui/life-tools/video.svg'));
    assert.ok(html.includes('Video'));assert.doesNotMatch(html, /<(?:video|iframe|audio)\b/);
  }
  value.value = 'Authored category';
  assert.ok(render(Cards.LifeToolsMore, data).includes('Authored category'));
  value.value = '';
  assert.doesNotMatch(render(Cards.LifeToolsMore, data), /m-card__footer|life-tools\/video.svg/);
});

function help() {
  const data = fixture(2);
  data.primaryLink = field(data.id, 'primaryLink', { href: '/get-answers', text: 'Get answers here', linktype: 'internal', target: '' }, 'General Link');
  return data;
}
test('Help keeps one root introduction, native CTA and source arrow without rendering child cards', () => {
  const data = help(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.LifeToolsHelp, data, editing);
    assert.match(html, /t-bg-green-soft axlTileCollection allianz-life-tools-cards/);
    assert.match(html, /tileIcon t-bg-primary-brand t-icon-primary-white/);
    assert.ok(html.includes(data.body.jsonValue.value));
    assert.deepEqual(attrs(html, 'a', 'href'), ['/get-answers']);
    assert.deepEqual(attrs(html, 'a', 'aria-label'), ['Get answers here']);
    assert.deepEqual(attrs(html, 'img', 'src'), ['/allianz-ui/life-tools/question.svg']);
    assert.match(html, /<span class="a-link__icon" aria-hidden="true"><svg/);
    assert.doesNotMatch(html, /o-cards|m-card__|test-only-tools-card|UNUSED-ROOT|unused-root|unused-card/);
  }
  const actual = markers(render(Cards.LifeToolsHelp, data, true));
  assert.equal(actual.length, 3);
  for (const name of ['heading', 'body', 'primaryLink']) assert.equal(actual.filter(marker => marker.fieldId === data[name].jsonValue.metadata.fieldId).length, 1);
  assert.equal(JSON.stringify(data), before);
});
test('Help respects explicit native ARIA aliases and derives the source fallback from native visible text', () => {
  const data = help();
  for (const alias of ['ariaLabel', 'aria-label']) {
    data.primaryLink.jsonValue.value[alias] = 'Explicit author label';
    assert.deepEqual(attrs(render(Cards.LifeToolsHelp, data), 'a', 'aria-label'), ['Explicit author label']);
    delete data.primaryLink.jsonValue.value[alias];
  }
  data.primaryLink.jsonValue.value.text = 'Changed native CTA label';
  assert.deepEqual(attrs(render(Cards.LifeToolsHelp, data), 'a', 'aria-label'), ['Changed native CTA label']);
});
test('cleared Help link keeps native author chrome but no visitor CTA', () => {
  const data = help();data.primaryLink.jsonValue.value = { href: '', text: '' };
  assert.equal(attrs(render(Cards.LifeToolsHelp, data), 'a', 'href').length, 0);
  assert.equal(markers(render(Cards.LifeToolsHelp, data, true)).filter(marker => marker.fieldId === data.primaryLink.jsonValue.metadata.fieldId).length, 1);
});
test('all fixed glyphs are decorative, exact recovered source bytes and never SDK Image controls', () => {
  const assetRoot = path.resolve(sourceRoot, '../public/allianz-ui/life-tools');
  const expected = {
    calculator: 'a5daa8096d396b93a3a7b2db1c8fcafe87ab60f18ddd32b2946294dba36b1b1d',
    puzzle: '070026ad8daac3de25680b233ada48807a3548c9531fe6675cb907fe636c077f',
    'user-settings': '72edf07061f7d8c4f9d3d2a5165d613dacdf0313bb5dafe58309a00fdf8d72b9',
    question: '1e8c2c9f32a8cf877771901242b4d82e6f8e66fe39b450a89bcf58bcd128444f',
    video: '1ef8d68522f19bb1f9a583aae1b572435df23f7af1abe498dfc3254b498f2ae6',
  };
  for (const [name, digest] of Object.entries(expected)) assert.equal(sha(fs.readFileSync(path.join(assetRoot, name + '.svg'))), digest);
  for (const [Component, data] of [[Cards.LifeToolsNeeds, fixture(2)], [Cards.LifeToolsStrategy, fixture(5)],
    [Cards.LifeToolsMore, fixture(1, true)], [Cards.LifeToolsHelp, help()]]) {
    for (const editing of [false, true]) {
      const html = render(Component, data, editing), glyphs = [...html.matchAll(/<img\b[^>]*class="allianz-life-tools-glyph"[^>]*>/g)].map(match => match[0]);
      assert.ok(glyphs.every(glyph => /alt=""/.test(glyph) && /aria-hidden="true"/.test(glyph)));
      assert.doesNotMatch(html, /unused.*-icon-field/);
    }
  }
});
test('glyph CSS is confined to Tools and matches source mobile/desktop ink and video footer size', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzLifeToolsCards.css'), 'utf8');
  require('postcss').parse(css).walkRules(rule => assert.ok(rule.selector.startsWith('.allianz-life-tools-cards ')));
  assert.match(css, /width: 26px/);assert.match(css, /min-width: 704px/);assert.match(css, /width: 40px/);
  assert.match(css, /brightness\(0\) invert\(23\.5294%\)/);assert.match(css, /brightness\(0\) invert\(1\)/);
  assert.match(css, /m-card__footer[^}]*width: 2rem;[^}]*height: 2rem/s);
});
test('all four variants retain existing no-data fallback', () => {
  for (const name of [...configurations.map(configuration => configuration.name), 'LifeToolsHelp'])
    assert.ok(render(Cards[name], undefined).includes('AllianzCardGrid'));
});
