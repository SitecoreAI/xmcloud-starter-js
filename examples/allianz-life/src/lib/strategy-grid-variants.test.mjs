import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const fixture = JSON.parse(fs.readFileSync(new URL('./strategy-grid-source.fixture.json', import.meta.url), 'utf8'));
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: `test-only-${name}`, fieldId: `test-only-${name}-field`, fieldType: type } } });
const occurrence = (html, token) => html.split(token).length - 1;
const scenario = key => fixture.cases.find(entry => entry.key === key);

function native(entry) {
  return { children: { results: entry.children.map((child, index) => {
    const key = `${entry.key}-${child.key}`;
    return { id: `test-only-${key}`,
      heading: field(`${key}-heading`, child.headingTags.length ? `Heading ${index} ${key}` : ''),
      headingLevel: field(`${key}-headingLevel`, child.headingTags[0] || ''),
      subheading: field(`${key}-subheading`, '', 'Rich Text'),
      body: field(`${key}-body`, `<p>Body ${index} ${key}</p>`, 'Rich Text'),
      image: field(`${key}-image`, child.hasImage ? { src: `/test-only/${key}.jpg`, alt: `Alt ${key}` } : {}, 'Image'),
      icon: field(`${key}-icon`, child.iconClasses ? { src: `/test-only/${key}.svg`, alt: '' } : {}, 'Image'),
      iconTheme: field(`${key}-iconTheme`, child.iconClasses?.includes('t-icon-primary-white') ? 'primary-brand' : 'transparent'),
      theme: field(`${key}-theme`, /t-bg-([\w-]+)/.exec(child.sourceClasses)?.[1] || 'transparent'),
      link: field(`${key}-link`, { href: '/about?source=strategy#details', text: `Link ${key}`, target: '_blank', ariaLabel: `Label ${key}` }, 'General Link'),
    };
  }) } };
}

test('source presentation witnesses cover all 15 native grids and their 32 child cards', () => {
  assert.equal(fixture.sourceZipSha256, 'b184a69de9b8c6c83db60717128190e05668142971ef6aad716915c657136392');
  assert.equal(fixture.cases.length, 15);
  assert.equal(fixture.cases.reduce((sum, entry) => sum + entry.children.length, 0), 32);
  for (const name of ['StrategyIntro', 'StrategyBrandIntro', 'StrategyIntroSplit', 'StrategyIntroTiles',
    'StrategyIntroFlippedTiles', 'StrategyIntroResources', 'StrategyStackedPair']) assert.equal(typeof Cards[name], 'function');
});

for (const entry of fixture.cases) {
  test(`${entry.key}: one datasource renders each native child once in source order without mutation`, () => {
    const data = native(entry), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Cards[entry.variant], data, editing, entry.params);
      let previous = -1;
      for (const card of data.children.results) {
        assert.equal(occurrence(html, card.body.jsonValue.value), 1, card.id);
        const position = html.indexOf(card.body.jsonValue.value);
        assert.ok(position > previous, card.id); previous = position;
        if (card.heading.jsonValue.value) {
          assert.ok(html.includes(`<${card.headingLevel.jsonValue.value}`));
          assert.ok(html.includes(card.heading.jsonValue.value));
        }
        if (editing) assert.ok(html.includes(card.body.jsonValue.metadata.fieldId));
      }
      assert.equal(JSON.stringify(data), before);
    }
  });
}

test('college mixed benefits retain a full-width introduction and centered-eight h4 split tile', () => {
  const entry = scenario('college-funding--section-5-grid'), data = native(entry);
  const html = render(Cards[entry.variant], data, false, entry.params);
  assert.equal(occurrence(html, 'l-grid__column-medium-12'), 1);
  assert.equal(occurrence(html, 'l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12'), 1);
  assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
  assert.match(html, /tile--alphaNumeric -is--split/);
  assert.match(html, /tileContent u-text-left/);
  assert.match(html, /<h4>Heading 1 /);
  assert.match(html, /class="tileBody u-font-size-md"/);
  assert.equal(occurrence(html, 'class="l-grid__row'), 2);
});

test('the retained college single split tiles honor authored h4 semantics and source width', () => {
  for (const key of ['college-funding--section-6-grid', 'college-funding--section-7-grid']) {
    const entry = scenario(key), html = render(Cards[entry.variant], native(entry), false, entry.params);
    assert.match(html, /<h4>Heading 0 /);
    assert.match(html, /l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12/);
    assert.match(html, /tile--alphaNumeric -is--split/);
    assert.doesNotMatch(html, /<h[123]>/);
  }
});

test('college paired tiles preserve distinct alignment and flipping, source large bodies and image ownership', () => {
  const entry = scenario('college-funding--section-4-grid'), data = native(entry);
  const html = render(Cards[entry.variant], data, false, entry.params);
  assert.equal(occurrence(html, 'class="l-grid__column-medium-6"'), 2);
  assert.equal(occurrence(html, 'm-axlTile match-height -is--flipped tile--stackedImage'), 1);
  assert.equal(occurrence(html, 'm-axlTile match-height tile--stackedImage'), 1);
  assert.equal(occurrence(html, 'tileContent u-text-left'), 1);
  assert.equal(occurrence(html, 'tileContent u-text-center'), 1);
  assert.equal(occurrence(html, 'class="tileBody u-font-size-lg"'), 2);
  assert.equal(occurrence(html, 'class="tileImage"'), 1);
  assert.match(html, /l-grid__row match-height-row u-padding-bottom-xl/);
  assert.match(html, /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
  assert.match(html, /t-bg-primary-white/);
});

test('mixed resource grids keep the introduction outside three ordered static or linked document cards', () => {
  for (const entry of fixture.cases.filter(entry => entry.variant === 'StrategyIntroResources')) {
    const data = native(entry), html = render(Cards[entry.variant], data, false, entry.params);
    assert.equal(occurrence(html, 'm-axlIntroductionBlock'), 1);
    assert.equal(occurrence(html, 'class="m-card"'), 3);
    assert.equal(occurrence(html, 'class="m-card__header"'), 3);
    assert.equal(occurrence(html, 'class="m-card__body"'), 3);
    assert.match(html, /o-cards o-cards__col3/);
    assert.ok(html.indexOf('m-axlIntroductionBlock') < html.indexOf('o-cards o-cards__col3'));
    data.children.results[1].link.jsonValue.value = {};
    const cleared = render(Cards[entry.variant], data, false, entry.params);
    assert.match(cleared, /<div class="m-card">/);
    assert.ok(cleared.includes(data.children.results[1].body.jsonValue.value));
    const editor = render(Cards[entry.variant], data, true, entry.params);
    assert.ok(!editor.includes(data.children.results[1].link.jsonValue.metadata.fieldId));
  }
});

test('estate tiles and retirement flipped tiles preserve separate introduction and three equal columns', () => {
  for (const key of ['flexible-estate-planning-strategies--section-2-grid', 'retirement-planning--section-6-grid']) {
    const entry = scenario(key), html = render(Cards[entry.variant], native(entry), false, entry.params);
    assert.equal(occurrence(html, 'm-axlIntroductionBlock'), 1);
    assert.equal(occurrence(html, 'class="l-grid__column-medium-4"'), 3);
    assert.equal(occurrence(html, 'class="tileBody u-font-size-md"'), 3);
    assert.equal(occurrence(html, 'm-axlTile match-height -is--flipped'), key.startsWith('retirement') ? 3 : 0);
    assert.equal(occurrence(html, 'u-row-spacing'), key.startsWith('flexible') ? 1 : 0);
  }
});

test('source icon foreground classes preserve brand, white and black treatment without field mutation', () => {
  for (const entry of fixture.cases.filter(entry => entry.variant.startsWith('Strategy'))) {
    const data = native(entry), before = JSON.stringify(data), html = render(Cards[entry.variant], data, false, entry.params);
    for (const child of entry.children.filter(child => child.iconClasses)) {
      const foreground = child.iconClasses.split(/\s+/).find(token => token.startsWith('t-icon-'));
      assert.ok(html.includes(foreground), `${entry.key}: ${foreground}`);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('native fieldCollection projection retains all child fields and real SDK editing controls', () => {
  const entry = scenario('college-funding--section-4-grid'), data = native(entry);
  const projected = { children: { results: data.children.results.map(card => ({ id: card.id,
    fieldCollection: Object.entries(card).filter(([name]) => name !== 'id').map(([name, field]) => ({ name, jsonValue: field.jsonValue })),
  })) } };
  assert.equal(render(Cards[entry.variant], projected, false, entry.params), render(Cards[entry.variant], data, false, entry.params));
  const editor = render(Cards[entry.variant], projected, true, entry.params);
  for (const card of data.children.results) for (const name of ['heading', 'body', 'image']) {
    const value = card[name].jsonValue.value;
    assert.equal(editor.includes(card[name].jsonValue.metadata.fieldId), name === 'image' ? Boolean(value?.src) : Boolean(value));
  }
});

test('cleared strategy fields remain off the canvas without borrowing stale link content', () => {
  const entry = scenario('college-funding--section-5-grid'), data = native(entry), card = data.children.results[1];
  card.heading.jsonValue.value = ''; card.body.jsonValue.value = ''; card.icon.jsonValue.value = {};
  card.links = { targetItems: [] }; card.link.jsonValue.value = {};
  const before = JSON.stringify(data), html = render(Cards[entry.variant], data, false, entry.params);
  assert.doesNotMatch(html, /STALE scalar link/);
  const editor = render(Cards[entry.variant], data, true, entry.params);
  for (const name of ['heading', 'body', 'icon']) assert.ok(!editor.includes(card[name].jsonValue.metadata.fieldId));
  assert.equal(JSON.stringify(data), before);
});

test('college and estate source-owned scalar Accumulator links survive the explicitly empty Multilist field', () => {
  for (const key of ['college-funding--section-9-grid', 'flexible-estate-planning-strategies--section-6-grid']) {
    const entry = scenario(key), data = native(entry), card = data.children.results[0];
    card.links = { targetItems: [] };
    card.link.jsonValue.value = {
      href: '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator',
      text: 'Explore Allianz Life Accumulator™ Indexed Universal Life Insurance Policy', target: '', linktype: 'internal',
      id: '{68D665F3-E5C3-5823-B1B8-D475CAEDB5B1}',
    };
    const before = JSON.stringify(data), html = render(Cards[entry.variant], data, false, entry.params);
    assert.equal(occurrence(html, '>Explore Allianz Life Accumulator™ Indexed Universal Life Insurance Policy</span>'), 1);
    assert.match(html, /a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"/);
    assert.match(html, /href="\/what-we-offer\/life-insurance\/indexed-universal-life\/allianz-life-accumulator"/);
    assert.equal(JSON.stringify(data), before);
    const editor = render(Cards[entry.variant], data, true, entry.params);
    assert.ok(editor.includes(card.link.jsonValue.metadata.fieldId));
    card.link.jsonValue.value = {};
    assert.doesNotMatch(render(Cards[entry.variant], data, false, entry.params), /Explore Allianz Life Accumulator/);
    assert.ok(!render(Cards[entry.variant], data, true, entry.params).includes(card.link.jsonValue.metadata.fieldId));
  }
});

test('row composition has no duplicate section shell and ignores unrecognized presentation strings', () => {
  const entry = scenario('college-funding--section-5-grid'), data = native(entry);
  const html = render(Cards[entry.variant], data, false, { container: 'row', theme: '<unsafe>', sourceWidth: '<unsafe>', alignment: '<unsafe>' });
  assert.doesNotMatch(html, /l-container|unsafe/);
  assert.equal(occurrence(html, 'class="l-grid__row'), 2);
  for (const name of ['StrategyIntro', 'StrategyBrandIntro', 'StrategyIntroSplit', 'StrategyIntroTiles',
    'StrategyIntroFlippedTiles', 'StrategyIntroResources', 'StrategyStackedPair']) assert.match(render(Cards[name], undefined), /Add a datasource/);
});

test('new variants preserve alt, aria label, target and safe encoded query/fragment behavior', () => {
  const entry = scenario('college-funding--section-8-grid'), data = native(entry);
  const html = render(Cards[entry.variant], data, false, entry.params);
  assert.match(html, /href="\/about\?source=strategy#details"/);
  assert.match(html, /target=""/); assert.doesNotMatch(html, /target="_blank"/);
  for (const card of data.children.results) assert.ok(html.includes(`aria-label="${card.link.jsonValue.value.ariaLabel}"`));
  for (const card of data.children.results.filter(card => card.image.jsonValue.value.src)) assert.ok(html.includes(`alt="${card.image.jsonValue.value.alt}"`));
});

test('retirement root Accumulator footer renders once after the icon row with exact source label and empty target', () => {
  const entry = scenario('retirement-planning--section-6-grid'), data = native(entry);
  const label = 'Explore Allianz Life Accumulator® Indexed Universal Life Insurance Policy';
  data.primaryLink = field('retirement-section-6-primaryLink', {
    href: '/what-we-offer/life-insurance/indexed-universal-life/allianz-life-accumulator',
    text: label, target: '', ariaLabel: label, linktype: 'internal',
    id: '{68D665F3-E5C3-5823-B1B8-D475CAEDB5B1}',
  }, 'General Link');
  const before = JSON.stringify(data), html = render(Cards[entry.variant], data, false, entry.params);
  assert.equal(occurrence(html, `<span class="a-link__text">${label}</span>`), 1);
  assert.ok(html.indexOf(label) > html.lastIndexOf(data.children.results[3].body.jsonValue.value));
  assert.match(html, /l-grid__column-medium-12 u-text-center"><footer><div class="tileLink u-margin-top-md u-margin-bottom-md"/);
  assert.match(html, /a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"/);
  assert.match(html, /href="\/what-we-offer\/life-insurance\/indexed-universal-life\/allianz-life-accumulator"/);
  assert.doesNotMatch(html.slice(html.indexOf('tileLink u-margin-top-md')), /target="_blank"/);
  const editor = render(Cards[entry.variant], data, true, entry.params);
  assert.equal(occurrence(editor, data.primaryLink.jsonValue.metadata.fieldId), 1);
  assert.equal(JSON.stringify(data), before);
  data.primaryLink.jsonValue.value = {};
  const cleared = render(Cards[entry.variant], data, false, entry.params);
  assert.doesNotMatch(cleared, /Explore Allianz Life Accumulator|tileLink u-margin-top-md/);
  assert.ok(!render(Cards[entry.variant], data, true, entry.params).includes(data.primaryLink.jsonValue.metadata.fieldId));
});

test('authored root fields render once and cleared fields add no canvas controls', () => {
  const entry = scenario('college-funding--section-5-grid'), data = native(entry);
  data.heading = field('root-heading', 'Root heading');
  data.subheading = field('root-subheading', '<p>Root subheading</p>', 'Rich Text');
  data.body = field('root-body', '<p>Root body</p>', 'Rich Text');
  const before = JSON.stringify(data), html = render(Cards[entry.variant], data, false, entry.params);
  for (const name of ['heading', 'subheading', 'body']) assert.equal(occurrence(html, data[name].jsonValue.value), 1);
  assert.ok(html.indexOf('Root heading') < html.indexOf(data.children.results[0].body.jsonValue.value));
  assert.equal(JSON.stringify(data), before);
  for (const name of ['heading', 'subheading', 'body']) data[name].jsonValue.value = '';
  const cleared = render(Cards[entry.variant], data, false, entry.params);
  assert.doesNotMatch(cleared, /Root heading|Root subheading|Root body/);
  const editor = render(Cards[entry.variant], data, true, entry.params);
  for (const name of ['heading', 'subheading', 'body']) assert.ok(!editor.includes(data[name].jsonValue.metadata.fieldId));
});
