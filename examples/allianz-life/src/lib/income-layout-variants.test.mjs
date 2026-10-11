import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Legal = loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx'));
const fixture = JSON.parse(fs.readFileSync(new URL('./income-layout-source.fixture.json', import.meta.url), 'utf8'));
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
const record = key => fixture.records.find(item => item.key === key);
const occurrence = (html, token) => html.split(token).length - 1;
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: `test-only-income-${name}`, fieldId: `test-only-income-${name}-field`, fieldType: type } } });
function linkValue(xml) {
  const attrs = Object.fromEntries([...xml.matchAll(/([\w-]+)="([^"]*)"/g)].map((item) => [item[1], item[2].replaceAll('&amp;', '&')]));
  return { href: attrs.url || '', text: attrs.text || '', target: attrs.target || '', linktype: attrs.linktype || '' };
}
function native(key) {
  const entry = record(key);
  const data = Object.fromEntries(Object.entries(entry.fields).map(([name, value]) => [name,
    field(`${key}-${name}`, name === 'link' || name === 'primaryLink' ? linkValue(value) : value,
      name === 'link' || name === 'primaryLink' ? 'General Link' : name === 'body' || name === 'subheading' ? 'Rich Text' : 'Single-Line Text')]));
  data.id = `test-only-income-${key}`;
  if (entry.family === 'grid') data.children = { results: fixture.records.filter(item => item.parentKey === key).map(item => native(item.key)) };
  return data;
}
const media = (card, name, suffix) => { card[name] = field(`${card.id}-${name}`, { src: `/test-only-income/${suffix}`, alt: name === 'image' ? '' : 'Test-only native icon' }, 'Image'); };
const calloutParams = (alignment, bodySize) => ({ theme: 'transparent', columns: '1', alignment, headingLevel: 'h2', bodySize,
  paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' });

test('Income witness pins the recovered seven-section, 15-record, 48-field source', () => {
  assert.equal(fixture.sourceHtmlSha256, '9c746d5186ae425050c47446d787a12a6abe3439f8a5736cf5d90bde9f090853');
  assert.equal(fixture.records.length, 15);
  assert.equal(fixture.records.reduce((sum, item) => sum + Object.keys(item.fields).length, 0), 48);
  assert.equal(fixture.sections.length, 7);
  for (const item of fixture.records) assert.ok(!Object.hasOwn(item, 'nativeId'));
  assert.equal(typeof Cards.IncomeBenefits, 'function');
  assert.equal(typeof Cards.IncomeCallout, 'function');
});

test('one benefits datasource retains four exact child bodies once and in source order', () => {
  const data = native('section-3-grid');
  data.children.results.forEach((card, index) => media(card, index === 0 ? 'icon' : 'image', `${index}.${index === 0 ? 'svg' : 'jpg'}`));
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Cards.IncomeBenefits, data, editing);
    let previous = -1;
    for (const card of data.children.results) {
      assert.equal(occurrence(html, card.body.jsonValue.value), 1);
      const position = html.indexOf(card.body.jsonValue.value);
      assert.ok(position > previous); previous = position;
      if (editing) for (const name of ['heading', 'body', card.icon ? 'icon' : 'image']) assert.ok(html.includes(card[name].jsonValue.metadata.fieldId));
    }
    assert.equal(occurrence(html, '<h2'), 1); assert.equal(occurrence(html, '<h3'), 3);
    assert.equal(occurrence(html, 'tile--6633 -is--flipped -is--split'), 2);
    assert.equal(occurrence(html, 'tile--6633 -is--split'), 1);
    assert.equal(occurrence(html, 't-bg-transparent u-margin-bottom-xl'), 2);
    assert.equal(occurrence(html, 'class="tileImage"'), 3);
    assert.equal(occurrence(html, 'tileContent u-text-center'), 1);
    assert.equal(occurrence(html, 'tileContent u-text-left'), 3);
    assert.match(html, /l-grid__row u-padding-bottom-xl/);
    assert.match(html, /l-container--full-width t-bg-blue-soft axlTileCollection/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('held photos/icons stay absent for visitors and their cleared SDK fields stay editable', () => {
  const data = native('section-3-grid');
  data.children.results.forEach((card, index) => { const name = index === 0 ? 'icon' : 'image'; card[name] = field(`${card.id}-${name}`, {}, 'Image'); });
  const before = JSON.stringify(data), visitor = render(Cards.IncomeBenefits, data);
  assert.doesNotMatch(visitor, /<img|allianz-assets|allianz-legacy-assets|test-only-income\//);
  const editor = render(Cards.IncomeBenefits, data, true);
  for (const card of data.children.results) assert.ok(editor.includes((card.icon || card.image).jsonValue.metadata.fieldId));
  assert.equal(JSON.stringify(data), before);
});

test('Income scalar CTA survives a cleared Multilist and retains the source button and icon treatment', () => {
  const data = native('section-5-grid'), card = data.children.results[0];
  card.links = { targetItems: [] }; media(card, 'icon', 'information.svg');
  const before = JSON.stringify(data), visitor = render(Cards.IncomeCallout, data);
  assert.equal(occurrence(visitor, card.body.jsonValue.value), 1);
  assert.match(visitor, /l-container--full-width t-bg-green-soft axlTileCollection/);
  assert.match(visitor, /tileIcon t-bg-primary-brand t-icon-primary-white/);
  assert.match(visitor, /class="m-axlButton m-axlButton--primary"/);
  assert.equal(occurrence(visitor, '>Schedule a product demo today</a>'), 1);
  assert.ok(visitor.indexOf('Schedule a product demo today') > visitor.indexOf(card.body.jsonValue.value));
  assert.doesNotMatch(visitor, /<footer|a-link__text/);
  // This exact captured source CTA is admitted by the bounded visitor policy.
  assert.match(visitor, /href="https:\/\/lp\.allianzlife\.com\/EMContactUS\.html\?utm_source=website&amp;utm_medium=webpage&amp;utm_campaign=contactus_submit&amp;utm_content=jannik_sinner"/);
  assert.match(visitor, /target="_blank"/);
  assert.match(visitor, /rel="noopener noreferrer"/);
  const editor = render(Cards.IncomeCallout, data, true);
  assert.match(editor, /href="https:\/\/lp\.allianzlife\.com\/EMContactUS\.html\?utm_source=website&amp;utm_medium=webpage&amp;utm_campaign=contactus_submit&amp;utm_content=jannik_sinner"/);
  assert.match(editor, /target="_blank"/);
  assert.ok(editor.includes(card.link.jsonValue.metadata.fieldId));
  assert.ok(editor.includes(card.body.jsonValue.metadata.fieldId));
  assert.equal(JSON.stringify(data), before);
  card.link.jsonValue.value = {};
  assert.doesNotMatch(render(Cards.IncomeCallout, data), /Schedule a product demo|m-axlButton/);
  assert.ok(render(Cards.IncomeCallout, data, true).includes(card.link.jsonValue.metadata.fieldId));
});

test('source-native fieldCollection projection preserves Income body and scalar CTA SDK controls', () => {
  for (const [key, Component] of [['section-3-grid', Cards.IncomeBenefits], ['section-5-grid', Cards.IncomeCallout]]) {
    const data = native(key);
    data.children.results.forEach(card => { card.links = { targetItems: [] }; });
    const projected = { ...data, children: { results: data.children.results.map(card => ({ id: card.id,
      fieldCollection: Object.entries(card).filter(([name]) => name !== 'id' && name !== 'links').map(([name, value]) => ({ name, jsonValue: value.jsonValue })),
      links: card.links,
    })) } };
    assert.equal(render(Component, projected), render(Component, data));
    for (const card of data.children.results) assert.ok(render(Component, projected, true).includes(card.body.jsonValue.metadata.fieldId));
  }
});

test('authored heading semantics and cleared text remain native and editable', () => {
  const data = native('section-3-grid'), card = data.children.results[1];
  card.headingLevel.jsonValue.value = 'h4';
  assert.ok(render(Cards.IncomeBenefits, data).includes(`<h4>${card.heading.jsonValue.value}</h4>`));
  card.heading.jsonValue.value = ''; card.body.jsonValue.value = '';
  const before = JSON.stringify(data), visitor = render(Cards.IncomeBenefits, data);
  assert.doesNotMatch(visitor, /Mastering risk|Baseline mastery/);
  const editor = render(Cards.IncomeBenefits, data, true);
  for (const name of ['heading', 'body']) assert.ok(editor.includes(card[name].jsonValue.metadata.fieldId));
  assert.equal(JSON.stringify(data), before);
});

test('seven placements reuse exact Hero/plain callout/badge/legal source fields and separate legal ownership', () => {
  const hero = native('hero'), intro = native('section-2-grid'), badge = native('section-4-grid');
  const ratings = native('ratings-footnotes'), product = native('product-legal');
  assert.match(render(Hero.Editorial, hero, false, { theme: 'blue-soft' }), /<h1 class="c-heading c-hero__headline u-text-center">Now serving: Guaranteed income for life<\/h1>/);
  const introHtml = render(Cards.EditorialCallout, intro, false, calloutParams('left', 'extra-large'));
  assert.match(introHtml, /tileContent u-text-left/); assert.match(introHtml, /tileBody u-font-size-xl/);
  assert.equal(occurrence(introHtml, intro.children.results[0].body.jsonValue.value), 1);
  media(badge.children.results[0], 'icon', 'ribbon.svg');
  const badgeHtml = render(Cards.EditorialCallout, badge, false, calloutParams('center', 'medium'));
  assert.match(badgeHtml, /tileContent u-text-center/); assert.match(badgeHtml, /tileBody u-font-size-md/);
  assert.match(badgeHtml, /tileIcon t-bg-transparent t-icon-primary-black/);
  const ratingsHtml = render(Legal.StrategyFootnotes, ratings, false, { theme: 'grey-muted', columns: '1' });
  const productHtml = render(Legal.Default, product);
  assert.equal(occurrence(ratingsHtml, ratings.body.jsonValue.value), 1);
  assert.equal(occurrence(productHtml, product.body.jsonValue.value), 1);
  assert.equal(occurrence(ratingsHtml, '<p'), 2); assert.match(ratingsHtml, /<hr>/);
  assert.equal(occurrence(productHtml, '<p'), 7);
  assert.doesNotMatch(ratingsHtml, /class="c-disclosure"/);
  assert.doesNotMatch(productHtml, /axlTileCollection/);
});

test('new finite exports reject missing datasources and ignore arbitrary presentation strings', () => {
  for (const [Component, key] of [[Cards.IncomeBenefits, 'section-3-grid'], [Cards.IncomeCallout, 'section-5-grid']]) {
    assert.match(render(Component, undefined), /Add a datasource/);
    const data = native(key);
    assert.equal(render(Component, data), render(Component, data, false, { theme: '<unsafe>', layout: '<unsafe>', columns: '4' }));
  }
});
