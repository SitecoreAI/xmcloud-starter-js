import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { attribute, compile, deepFreeze, field, filename, imageTags, metadata,
  params, require, sourceRoot } from './icon-appearance-fixture.mjs';

const React = require('react'), { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8'), Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const ROOT = '7D082839-4A65-43B9-BDA9-0BD8735DF63F';
const paths = ['/allianz-assets/4e90bfa982a5c809.svg', '/allianz-assets/2e3cd2d4635d2e9a.svg',
  '/allianz-assets/01be54a5db39aebe.svg'];
const names = ['Connect', 'Home', 'Globe'];
// IDs/copy/anchor targets are observed native values. SDK editing metadata below
// is synthetic; these offline renders do not establish native editor acceptance.
const observed = [
  {
    "id": "47DE9390-49E8-4A96-AD14-29BC29100895",
    "heading": "Soccer creates connections",
    "body": "<p>Soccer’s popularity encompasses all nationalities, cultures, and genders. It brings us together and strengthens the community where we live, work, and play.</p>",
    "linkId": "D93D51C2-83B4-4F03-B871-3661DC72216E",
    "link": {
      "href": "#events",
      "text": "Jump to “Events at Allianz Field®”",
      "linktype": "anchor",
      "anchor": "events"
    }
  },
  {
    "id": "2DDC1A49-972F-421D-879C-E60E0508193C",
    "heading": "It strengthens our community",
    "body": "<p>We’re helping create a lasting positive impact in the St. Paul Midway neighborhood – and we’re supporting organizations that help community members build financial security.</p>",
    "linkId": "93F43307-BEE9-451F-A183-0E1A7288C8DA",
    "link": {
      "href": "#community",
      "text": "Jump to “Our commitment to the community”",
      "linktype": "anchor",
      "anchor": "community"
    }
  },
  {
    "id": "333ECABF-8E07-4B34-9CED-0C831C18F400",
    "heading": "It’s part of our global heritage",
    "body": "<p>Allianz Field® is one of eight Allianz® stadiums worldwide that are magnets for industry and tourism.</p>",
    "linkId": "4E1D3178-019E-4EAB-984F-C836271B842B",
    "link": {
      "href": "#global",
      "text": "Jump to “Meet our global Allianz® family of stadiums”",
      "linktype": "anchor",
      "anchor": "global"
    }
  }
];
const authoredImage = '/allianz-assets/fixture-authored-goal.svg';
const input = overrides => params(undefined, { alignment: 'left', spacing: 'none', paddingTop: 'lg',
  paddingBottom: 'none', marginBottom: 'lg', DynamicPlaceholderId: '3', ...overrides });
function fixture(collection = false) {
  const cards = observed.map(card => ({ id: card.id,
    heading: field(card.id, 'heading', card.heading), subheading: field(card.id, 'subheading', '', 'Rich Text'),
    body: field(card.id, 'body', card.body, 'Rich Text'),
    icon: field(card.id, 'icon', {}, 'Image'), image: field(card.id, 'image', {}, 'Image'),
    iconTheme: field(card.id, 'iconTheme', ''), theme: field(card.id, 'theme', ''),
    headingLevel: field(card.id, 'headingLevel', 'h3'), link: field(card.id, 'link', { href: '' }, 'General Link'),
    links: { targetItems: [{ id: card.linkId,
      link: field(card.linkId, 'link', { ...card.link }, 'General Link') }] },
  }));
  return { id: ROOT, children: { results: collection ? cards.map(card => ({ id: card.id,
    fieldCollection: Object.entries(card).filter(([key]) => key !== 'id').map(([name, value]) => name === 'links'
      ? { name, jsonValue: value.targetItems.map(link => ({ id: link.id, fields: { link: link.link.jsonValue } })) }
      : { name, jsonValue: value.jsonValue }),
  })) : cards } };
}
function render(name, data, mode = 'normal', options = {}) {
  deepFreeze(data); const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en',
      mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { itemId: '6D4FEC45-12CE-54ED-A38B-9A78CD12ADDA',
        name: 'Allianz Field native-shaped local fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement((options.components ?? Cards)[name], { params: input(options.params),
    fields: data === undefined ? undefined : { data: { datasource: data } }, ...options.extra })));
  assert.equal(JSON.stringify(data), before, 'native inputs/metadata remain unchanged');
  return html;
}
const glyphImages = html => imageTags(html).filter(tag => paths.includes(attribute(tag, 'src')));
const sourceImagePaths = html => glyphImages(html).map(tag => attribute(tag, 'src'));
const articles = html => [...html.matchAll(/<article\b[^>]*>.*?<\/article>/gs)].map(m => m[0]);
const footer = html => [...html.matchAll(/<footer\b[^>]*>.*?<\/footer>/gs)].map(m => m[0]);
const withoutSourceGlyphs = html => html.replace(/<link rel="preload" as="image" href="\/allianz-assets\/(?:4e90bfa982a5c809|2e3cd2d4635d2e9a|01be54a5db39aebe)\.svg"\/>/g, '')
  .replace(/<div class="tileSubGrid__image"><div class="tileIcon [^"]*" data-allianz-card-icon-appearance="gray-on-transparent"><img[^>]*\/><\/div><\/div>/g, '');
const fieldValue = (card, name) => card[name]?.jsonValue
  ?? card.fieldCollection?.find(entry => entry.name === name)?.jsonValue;
const namedCards = data => data.children.results;

for (const mode of modes) test(`${mode} explicit Field presentation restores three named source glyphs before each native heading`, () => {
  for (const collection of [false, true]) {
    const data = fixture(collection), calls = [], components = compile(source, { observe: calls });
    const html = render('FieldCommonGoals', data, mode, { components });
    assert.deepEqual(sourceImagePaths(html), paths);
    assert.deepEqual(glyphImages(html).map(tag => attribute(tag, 'alt')), names);
    assert.equal((html.match(/data-allianz-card-icon-appearance="gray-on-transparent"/g) ?? []).length, 3);
    assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
    assert.equal(calls.filter(call => call.name === 'Image').length, 0, 'no fabricated native ImageField');
    for (const [index, article] of articles(html).entries()) {
      assert.ok(article.indexOf(paths[index]) < article.indexOf('<header>'));
      assert.match(article, /tileSubGrid__image/);
      assert.ok(article.includes(observed[index].heading));
    }
    assert.equal(html, render('FieldCommonGoals', fixture(!collection), mode));
    assert.deepEqual(footer(html), footer(render('Default', fixture(collection), mode)));
  }
});

test('only the explicit Field row omits equal-height stretching while keeping source spacing and columns', () => {
  for (const mode of modes) {
    const data = fixture();
    const current = render('FieldCommonGoals', data, mode);
    const control = render('Default', fixture(), mode);
    const row = html => html.match(/<div class="(l-grid__row [^"]*)">/)?.[1];
    assert.ok(row(control).includes('match-height-row'), 'existing Default keeps its original row contract');
    assert.equal(row(current), row(control).replace('match-height-row', ''));
    assert.doesNotMatch(current, /match-height-row/);
    assert.equal((current.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
    assert.equal(withoutSourceGlyphs(current), control.replace('match-height-row', ''));
  }
});

test('reordering cards follows native identities rather than slot, heading, href or case', () => {
  for (const mode of modes) {
    const data = fixture(); data.children.results.reverse(); data.id = `{${ROOT.toLowerCase()}}`;
    for (const [index, card] of data.children.results.entries()) {
      card.id = `{${card.id.replaceAll('-', '').toLowerCase()}}`;
      card.heading.jsonValue.value = `Authored reordered heading ${index}`;
    }
    assert.deepEqual(sourceImagePaths(render('FieldCommonGoals', data, mode)), [...paths].reverse());
  }
});

test('missing, undefined and genuinely cleared Icon states restore the source glyph without Image chrome', () => {
  const states = [undefined, null, {}, { jsonValue: undefined }, { jsonValue: null }, { jsonValue: {} },
    { jsonValue: { value: undefined } }, { jsonValue: { value: null } }, { jsonValue: { value: {} } },
    { jsonValue: { value: { src: undefined, alt: '' } } }, { jsonValue: { value: { src: '' } } }];
  for (const state of states) for (const mode of modes) {
    const data = fixture(); data.children.results[0].icon = state;
    const calls = [], components = compile(source, { observe: calls });
    const html = render('FieldCommonGoals', data, mode, { components });
    assert.deepEqual(sourceImagePaths(html), paths);
    assert.equal(calls.filter(call => call.name === 'Image').length, 0);
    assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, 0);
  }
});

test('valid authored Icon preserves the exact SDK field object, alt, dimensions and editable ownership', () => {
  for (const mode of modes) {
    const data = fixture(), original = data.children.results[0].icon.jsonValue;
    original.value = { src: authoredImage, alt: 'Authored replacement', width: '36', height: '28' };
    const calls = [], components = compile(source, { observe: calls });
    const html = render('FieldCommonGoals', data, mode, { components });
    assert.deepEqual(sourceImagePaths(html), paths.slice(1));
    const image = imageTags(html).find(tag => attribute(tag, 'src') === authoredImage);
    assert.ok(image); assert.equal(attribute(image, 'alt'), 'Authored replacement');
    assert.equal(attribute(image, 'width'), '36'); assert.equal(attribute(image, 'height'), '28');
    const call = calls.find(call => call.name === 'Image');
    assert.equal(call.field, original); assert.equal(call.editable, mode === 'editing');
    assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, mode === 'editing' ? 1 : 0);
  }
});

test('clear wins over stale native fieldCollection and restores the existing fixed source glyph', () => {
  for (const mode of modes) {
    const data = fixture(true), first = data.children.results[0];
    first.fieldCollection.find(field => field.name === 'icon').jsonValue.value = { src: authoredImage };
    first.icon = field(first.id, 'icon', { src: '' }, 'Image');
    assert.deepEqual(sourceImagePaths(render('FieldCommonGoals', data, mode)), paths);
  }
});

test('malformed populated Icon containers and src values fail closed rather than creating a UI fallback', () => {
  const bad = [false, 1, 'populated', [], { jsonValue: false }, { jsonValue: 1 }, { jsonValue: 'populated' },
    { jsonValue: [] }, { jsonValue: { value: false } }, { jsonValue: { value: 1 } },
    { jsonValue: { value: 'populated' } }, { jsonValue: { value: [] } }];
  for (const src of [false, null, 1, {}, [], ' ', '\t\n', '\u00a0']) bad.push({ jsonValue: { value: { src } } });
  for (const icon of bad) for (const mode of modes) {
    const data = fixture(); data.children.results[0].icon = icon;
    const calls = [], components = compile(source, { observe: calls });
    const html = render('FieldCommonGoals', data, mode, { components });
    assert.deepEqual(sourceImagePaths(html), paths.slice(1));
    assert.equal(calls.filter(call => call.name === 'Image').length, 0);
    assert.ok(html.includes(observed[0].heading));
  }
});

test('unknown, malformed and duplicate native card IDs never acquire guessed source glyphs', () => {
  for (const id of [undefined, '', false, {}, 'not-a-guid', observed[0].id + '-', ROOT]) for (const mode of modes) {
    const data = fixture(); data.children.results[0].id = id;
    assert.deepEqual(sourceImagePaths(render('FieldCommonGoals', data, mode)), paths.slice(1));
  }
  for (const mode of modes) {
    const data = fixture(); data.children.results[1].id = `{${observed[0].id.replaceAll('-', '').toLowerCase()}}`;
    assert.deepEqual(sourceImagePaths(render('FieldCommonGoals', data, mode)), [paths[2]]);
    const swapped = fixture(); swapped.children.results[0].id = observed[1].id;
    swapped.children.results[1].id = observed[0].id;
    assert.deepEqual(sourceImagePaths(render('FieldCommonGoals', swapped, mode)), [paths[1], paths[0], paths[2]]);
  }
});

test('unrelated roots and all pre-existing exports ignore authored switches or extra props', () => {
  for (const mode of modes) {
    const unrelated = fixture(); unrelated.id = observed[0].id;
    assert.equal(render('FieldCommonGoals', unrelated, mode), render('Default', unrelated, mode));
    const malformed = fixture(); malformed.id = ROOT + '-';
    assert.equal(render('FieldCommonGoals', malformed, mode), render('Default', malformed, mode));
  }
  for (const name of Object.keys(Cards).filter(name => name !== 'FieldCommonGoals' && typeof Cards[name] === 'function')) {
    for (const mode of modes) {
      const data = fixture();
      const options = { params: { fieldGoalsPresentation: true, FieldNames: 'FieldCommonGoals' },
        extra: { fieldGoalsPresentation: {}, sourceFieldGoals: true } };
      assert.equal(render(name, data, mode, options), render(name, fixture(), mode), `${name}/${mode}`);
      assert.deepEqual(sourceImagePaths(render(name, fixture(), mode)), []);
    }
  }
});

test('headings, Body, native links and metadata retain their independent original field objects', () => {
  const data = fixture(), calls = [], components = compile(source, { observe: calls });
  const html = render('FieldCommonGoals', data, 'editing', { components });
  for (const card of data.children.results) {
    for (const name of ['heading', 'body']) {
      const original = fieldValue(card, name);
      assert.equal(calls.filter(call => call.field === original && call.editable === true).length, 1);
      assert.equal(metadata(html).filter(entry => entry.itemId === original.metadata.itemId
        && entry.fieldId === original.metadata.fieldId).length, 1);
    }
    const original = card.links.targetItems[0].link.jsonValue;
    assert.equal(calls.filter(call => call.name === 'Link' && call.field === original && call.editable === true).length, 1);
  }
});

test('link and Body rejection rules are identical to Default, including local anchors and unavailable services', () => {
  for (const href of ['#events', '#community', '#global', '/about', '#demo-unavailable',
    'javascript:alert(1)', 'https://www.allianzlife.com/Login']) for (const mode of modes) {
    const data = fixture();
    data.children.results[0].links.targetItems[0].link.jsonValue.value = { href, text: 'Original native link' };
    data.children.results[0].body.jsonValue.value = `<p>Native <a href="${href}">body link</a>.</p>`;
    const current = render('FieldCommonGoals', data, mode), baseline = render('Default', fixture(), mode);
    const sameData = fixture();
    sameData.children.results[0].links.targetItems[0].link.jsonValue.value = { href, text: 'Original native link' };
    sameData.children.results[0].body.jsonValue.value = `<p>Native <a href="${href}">body link</a>.</p>`;
    const control = render('Default', sameData, mode);
    assert.deepEqual(footer(current), footer(control));
    assert.equal(withoutSourceGlyphs(current), control.replace('match-height-row', ''),
      'field/link output remains the Default safety oracle apart from the deliberate unstretched source row');
    if (mode !== 'editing') for (const article of articles(current)) assert.doesNotMatch(article, /javascript:alert/);
    // Editing retains the original CMS Rich Text, exactly as Default; the new
    // glyph presentation must not rewrite the stored field or its editor chrome.
    assert.equal(footer(baseline).length, 3);
  }
});

test('clearing content stays cleared and missing datasource retains the existing fallback', () => {
  for (const mode of modes) {
    const data = fixture();
    for (const card of data.children.results) {
      card.heading.jsonValue.value = ''; card.body.jsonValue.value = '';
      card.links.targetItems[0].link.jsonValue.value = { href: '' };
    }
    const html = render('FieldCommonGoals', data, mode);
    assert.doesNotMatch(html, /<h3|class="tileBody|<footer/);
    assert.deepEqual(sourceImagePaths(html), paths);
    assert.equal(render('FieldCommonGoals', undefined, mode), render('Default', undefined, mode));
  }
});

test('all three fallback glyphs reuse existing local assets and the existing scoped source geometry CSS', () => {
  for (const [index, relative] of paths.entries()) {
    const svg = fs.readFileSync(path.join(sourceRoot, '../public', relative), 'utf8');
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, new RegExp(`<title[^>]*>${names[index]}<`));
    assert.doesNotMatch(svg, /<script\b|<image\b/);
  }
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardIcons.css'), 'utf8');
  assert.match(css, /width: 26px/); assert.match(css, /height: 26px/);
  assert.match(css, /width: 40px/); assert.match(css, /height: 40px/);
  assert.match(css, /width: 64px/); assert.match(css, /height: 64px/);
});
