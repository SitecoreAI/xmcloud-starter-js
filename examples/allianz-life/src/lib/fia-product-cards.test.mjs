import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();

// Local source is compiled here; field renderers and authoring context use the installed SDK.
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

const Introduction = loadSource(path.join(sourceRoot, 'components/product-introduction/ProductIntroduction.tsx'));
const CardGrid = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const sourceDirectory = path.join(sourceRoot, 'components/allianz-card-grid/__tests__');
const source = fs.readFileSync(path.join(sourceDirectory, 'fia-product-groups.source.html'), 'utf8');
const sourceReceipt = JSON.parse(fs.readFileSync(path.join(sourceDirectory, 'fia-product-groups.source.json')));
const decode = (value) => value.replaceAll('&reg;', '®').replaceAll('&trade;', '™').replaceAll('&amp;', '&');
const groups = [...source.matchAll(/<H3>(.*?)<\/H3>([\s\S]*?)(?=<H3>|$)/g)].map((match) => ({
  heading: decode(match[1]),
  body: match[2].match(/<div class="tileBody">\s*([\s\S]*?)\s*<\/div>/)[1],
  marginBottom: /l-grid__row\s+u-margin-bottom-xl/.test(match[2]) ? 'xl' : '',
  cards: [...match[2].matchAll(/<a class="m-card" href="([^"]*)" target="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((card) => ({
    href: card[1], target: card[2], heading: decode(card[3].match(/<h4>(.*?)<\/h4>/)[1]),
    image: { src: card[3].match(/\ssrc="([^"]*)"/)[1], alt: card[3].match(/\salt="([^"]*)"/)[1] },
  })),
}));

function field(name, value, itemId = 'authored-product') {
  return { value, metadata: { fieldId: `${itemId}-${name}`, itemId,
    fieldType: name === 'image' ? 'Image' : name === 'link' ? 'General Link' : name === 'body' ? 'Rich Text' : 'Single-Line Text' } };
}

function productDatasource(group) {
  return { children: { results: group.cards.map((card, index) => {
    const id = `native-product-${index}`;
    return { id, fieldCollection: [
      { name: 'heading', jsonValue: field('heading', card.heading, id) },
      { name: 'image', jsonValue: field('image', card.image, id) },
      { name: 'link', jsonValue: field('link', { href: card.href, target: card.target, text: card.heading }, id) },
    ] };
  }) } };
}

function render(component, datasource, { params = {}, isEditing = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Product groups', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component, { params, fields: { data: { datasource } } })));
}

function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('public source witness has the exact two groups and 5/8 ordered product image cards', () => {
  assert.equal(Buffer.byteLength(source), sourceReceipt.fragmentBytes);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), sourceReceipt.fragmentSha256);
  assert.deepEqual(groups.map((group) => [group.heading, group.cards.length]),
    [['Accumulation solutions', 5], ['Income solutions', 8]]);
  assert.equal(groups.flatMap((group) => group.cards).filter((card) => card.target === '_blank').length, 1);
  assert.equal(groups[0].cards[4].heading, 'Allianz Accumulation Advantage Classic™ Annuity');
});

test('ProductGroup reproduces H3 IntroductionBlock spacing and source lg rich text without duplicating it in cards', () => {
  for (const group of groups) {
    const datasource = { heading: { jsonValue: field('heading', group.heading) }, body: { jsonValue: field('body', group.body) } };
    const before = JSON.stringify(datasource);
    const html = render(Introduction.ProductGroup, datasource, { params: { RenderingIdentifier: 'authored-group' } });
    for (const classes of ['l-container--full-width t-bg-blue-soft', 'l-grid l-grid--max-width',
      'l-grid__row u-margin-bottom-lg u-padding-top-lg', 'l-grid__column-medium-12',
      'm-axlIntroductionBlock -is--stacked -no--image', 'tileContent u-text-center', 'tileBody']) {
      assert.ok(html.includes(`class="${classes}"`), classes);
    }
    assert.ok(html.includes(`<h3>${group.heading}</h3>`));
    assert.ok(html.includes(group.body));
    assert.match(html, /<div class="tileSubHeading"><\/div>/);
    assert.match(html, /id="authored-group"/);
    assert.doesNotMatch(html, /axlTileCollection|m-axlTile|tileSubGrid__content|u-font-size-xl|<h2/);
    assert.equal(JSON.stringify(datasource), before);
    assert.deepEqual(metadata(render(Introduction.ProductGroup, datasource, { isEditing: true }))
      .map((entry) => entry.fieldId).sort(), ['authored-product-body', 'authored-product-heading']);
    const cards = render(CardGrid.ProductCards, productDatasource(group), { params: { marginBottom: group.marginBottom } });
    assert.ok(!cards.includes(group.heading));
    assert.ok(!cards.includes(group.body));
  }
});

test('ProductCards keeps all 13 source image/header/body wrappers, H4 order, link destinations and Classic target', () => {
  for (const group of groups) {
    const datasource = productDatasource(group);
    const before = JSON.stringify(datasource);
    const html = render(CardGrid.ProductCards, datasource, { params: { marginBottom: group.marginBottom } });
    assert.match(html, /class="l-container--full-width t-bg-blue-soft"/);
    assert.match(html, /class="o-cards o-cards__col3"/);
    assert.ok(html.includes(`class="l-grid__row${group.marginBottom ? ' u-margin-bottom-xl' : ''}"`));
    for (const className of ['m-card', 'm-card__image', 'm-card__header', 'm-card__body']) {
      assert.equal((html.match(new RegExp(`class="${className}"`, 'g')) || []).length, group.cards.length, className);
    }
    assert.deepEqual([...html.matchAll(/<h4>(.*?)<\/h4>/g)].map((match) => match[1]), group.cards.map((card) => card.heading));
    for (const card of group.cards) {
      assert.ok(html.includes(`href="${card.href}"`));
      const image = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])
        .find((tag) => tag.includes(`src="${card.image.src}"`));
      assert.ok(image, `source image ${card.image.src}`);
      assert.ok(image.includes(`alt="${card.image.alt}"`), `source alt for ${card.image.src}`);
    }
    if (group.cards.some((card) => card.target === '_blank')) assert.match(html, /target="_blank"[^>]*rel="noopener noreferrer"/);
    assert.equal(JSON.stringify(datasource), before);
  }
});

test('cleared ProductGroup fields remain empty and keep both genuine SDK field markers in editing', () => {
  const datasource = { heading: { jsonValue: field('heading', '') }, body: { jsonValue: field('body', '') } };
  assert.doesNotMatch(render(Introduction.ProductGroup, datasource), /<h3|<p|solutions|No text/);
  const editing = render(Introduction.ProductGroup, datasource, { isEditing: true });
  assert.deepEqual(metadata(editing).map((entry) => entry.fieldId).sort(), ['authored-product-body', 'authored-product-heading']);
  assert.match(editing, /\[No text in field\]/);
});

test('ProductCards edits only real image, heading and link Fields; blank root and unused card fields never add chrome', () => {
  const datasource = { heading: { jsonValue: field('root-heading', '') }, body: { jsonValue: field('root-body', '') },
    children: { results: [{ id: 'cleared-product', fieldCollection: [
      { name: 'heading', jsonValue: field('heading', '') }, { name: 'image', jsonValue: field('image', {}) },
      { name: 'link', jsonValue: field('link', {}) }, { name: 'body', jsonValue: field('unused-body', 'Unused content') },
      { name: 'icon', jsonValue: field('unused-icon', { src: '/unused.svg' }) },
    ] }] } };
  const before = JSON.stringify(datasource);
  const params = { layout: 'stacked', columns: '4', theme: 'green-soft', headingLevel: 'h1', paddingTop: 'xl', paddingBottom: 'xl' };
  const html = render(CardGrid.ProductCards, datasource, { params });
  assert.doesNotMatch(html, /<h4|<img|href=|Unused|unused.svg|u-padding|green-soft|<h1|tileHeading/);
  const editing = render(CardGrid.ProductCards, datasource, { params, isEditing: true });
  assert.deepEqual(metadata(editing).map((entry) => entry.fieldId).sort(),
    ['authored-product-heading', 'authored-product-image', 'authored-product-link']);
  assert.match(editing, /\[No text in field\]/);
  assert.match(editing, /scEmptyImage/);
  assert.equal(JSON.stringify(datasource), before);
});

test('ProductCards applies existing unsafe-link policy and retains native links untouched in editing', () => {
  const datasource = productDatasource(groups[0]);
  const link = datasource.children.results[0].fieldCollection.find((entry) => entry.name === 'link').jsonValue;
  link.value = { href: 'https://unsafe.example/collect', target: '_blank', text: 'Authored product' };
  const before = JSON.stringify(datasource);
  assert.match(render(CardGrid.ProductCards, datasource), /href="#service-unavailable"/);
  const editing = render(CardGrid.ProductCards, datasource, { isEditing: true });
  assert.equal(metadata(editing).find((entry) => entry.fieldId === 'native-product-0-link').itemId, 'native-product-0');
  assert.equal(JSON.stringify(datasource), before);
});

test('existing Default and Blue introductions retain their H2 Tile and xl body treatment', () => {
  const datasource = { heading: { jsonValue: { value: 'Explore our annuities' } }, body: { jsonValue: { value: '<p>Authored introduction</p>' } } };
  for (const component of [Introduction.Default, Introduction.Blue]) {
    const html = render(component, datasource);
    assert.match(html, /<h2>Explore our annuities<\/h2>/);
    assert.match(html, /class="m-axlTile match-height -is--stacked t-bg-transparent"/);
    assert.match(html, /class="tileBody u-font-size-xl"/);
    assert.doesNotMatch(html, /m-axlIntroductionBlock|<h3/);
  }
});
