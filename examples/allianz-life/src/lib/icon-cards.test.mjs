import assert from 'node:assert/strict';
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
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate));
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

const IconCards = loadSource(path.join(sourceRoot, 'components/icon-cards/IconCards.tsx')).Default;
const CardGrid = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx')).Default;
const { iconCardFields } = loadSource(path.join(sourceRoot, 'lib/icon-card-fields.ts'));
const { collectionsComplete } = loadSource(path.join(sourceRoot, 'lib/collection-completeness.ts'));
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));
const sections = ['/about:section:2', '/about:section:3'].map((key) =>
  content.routes['/about'].components.find((entry) => entry.sourceKey === key));
const sourceCards = sections.flatMap((section) => section.fields.data.datasource.children.results);
const nativeCards = sourceCards.map((card) => ({
  id: card.id, title: card.heading, text: card.body, icon: card.icon,
}));
const datasource = { title: sections[0].fields.data.datasource.heading,
  children: { total: 6, pageInfo: { hasNext: false, endCursor: 'native-last-card' }, results: nativeCards } };

function render(data, params = {}, isEditing = false, Component = IconCards) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Icon Cards', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource: data } } })));
}

function wireCard(card) {
  return { id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
    .map(([name, field]) => ({ name, jsonValue: field.jsonValue })) };
}

function tiles(html) {
  return [...html.matchAll(/<article class="m-axlTile\b[\s\S]*?<\/article>/g)].map((entry) =>
    entry[0].replace(/class="([^"]*)"/g, (_, classes) => `class="${classes.trim().split(/\s+/).sort().join(' ')}"`));
}

test('six About tiles retain source-family semantic markup, content, icons and order', () => {
  const html = render(datasource);
  const expectedTiles = sections.flatMap((section) => tiles(render(
    section.fields.data.datasource, section.params, false, CardGrid)));
  // Capture html/0879f096fdbaf4d0.html:691-850 uses lg body type. The old
  // general CardGrid incorrectly used md and emitted empty subheading wrappers.
  const correctedSource = expectedTiles.map((tile) => tile
    .replace('<div class="tileSubHeading"></div>', '')
    .replace('tileBody u-font-size-md', 'tileBody u-font-size-lg'));
  assert.deepEqual(tiles(html), correctedSource);
  assert.deepEqual([...html.matchAll(/<h3>(.*?)<\/h3>/g)].map((match) => match[1]), [
    'Our name', 'Our customers', 'Company headquarters', 'What we do', 'Allianz Field®', 'Who we are',
  ]);
  assert.match(html, /<header><div class="tileHeading"><h2>Key company facts<\/h2><\/div><\/header>/);
  assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 6);
  assert.match(html, /class="l-grid__row match-height-row"/);
  assert.deepEqual(html.split('<div class="l-grid__row match-height-row">').slice(1)
    .map((row) => tiles(row).length), [3, 3]);
  assert.doesNotMatch(html, /tileLink|<footer|tileImage|tileAlphanumeral|u-font-size-md/);
  // The two authored inline body links remain semantic Rich Text content.
  assert.equal((html.match(/data-demo-disabled="true"/g) ?? []).length, 2);
});

test('native and captured complete field collections produce the same HTML without mutating connections', () => {
  for (const entries of [nativeCards, sourceCards]) {
    const collected = { ...datasource, children: { ...datasource.children, results: entries.map(wireCard) } };
    const before = JSON.stringify(collected);
    assert.equal(render(collected), render(datasource));
    assert.equal(JSON.stringify(collected), before);
    assert.equal(collectionsComplete(collected, true), true);
    assert.equal(collected.children.pageInfo.endCursor, 'native-last-card');
  }
});

test('SDK field objects, empty values and native metadata survive exact-name projection', () => {
  const title = { value: '', metadata: { fieldId: 'native-title', fieldType: 'Single-Line Text', itemId: 'native-card' },
    editable: '<span>native editable title</span>' };
  const text = { value: '<p>Native text.</p>', metadata: { fieldId: 'native-text' } };
  const icon = { value: {}, metadata: { fieldId: 'native-icon', fieldType: 'Image', itemId: 'native-card' } };
  const fieldCollection = [
    { name: 'heading', jsonValue: { value: 'Historical alias must not override a cleared title' } },
    { name: 'Title', jsonValue: title }, { name: 'TEXT', jsonValue: text }, { name: 'Icon', jsonValue: icon },
    { name: '__proto__', jsonValue: { injected: true } }, { name: 'constructor', jsonValue: {} },
  ];
  const projected = iconCardFields({ id: 'native-card', fieldCollection });
  assert.equal(projected.title.jsonValue, title);
  assert.equal(projected.text.jsonValue, text);
  assert.equal(projected.icon.jsonValue, icon);
  assert.equal(projected.fieldCollection, fieldCollection);
  assert.equal(Object.hasOwn(projected, '__proto__'), false);
  assert.equal(Object.hasOwn(projected, 'constructor'), false);
  const explicit = { id: 'native-card', title: { jsonValue: title }, fieldCollection: [
    { name: 'title', jsonValue: { value: 'Must not resurrect content' } },
  ] };
  assert.equal(iconCardFields(explicit).title, explicit.title);
  const historical = { id: 'native-card', heading: { jsonValue: title }, fieldCollection: [
    { name: 'heading', jsonValue: { value: 'Must not resurrect an aliased field' } },
  ] };
  assert.equal(iconCardFields(historical).title, historical.heading);
  const named = { id: 'native-card', title: { jsonValue: title }, text: { jsonValue: text }, icon: { jsonValue: icon } };
  assert.equal(iconCardFields(named), named);
});

test('real SDK editing retains cleared collection title and all three empty child fields', () => {
  const field = (fieldId, fieldType, value, itemId = 'native-card') => ({
    value, metadata: { fieldId, fieldType, itemId },
  });
  const empty = {
    title: { jsonValue: field('collection-title', 'Single-Line Text', '', 'native-collection') },
    children: { total: 1, pageInfo: { hasNext: false, endCursor: 'one' }, results: [{
      id: 'native-card', fieldCollection: [
        { name: 'title', jsonValue: field('child-title', 'Single-Line Text', '') },
        { name: 'text', jsonValue: field('child-text', 'Rich Text', '') },
        { name: 'icon', jsonValue: field('child-icon', 'Image', {}) },
      ],
    }] },
  };
  const before = JSON.stringify(empty);
  const editing = render(empty, {}, true);
  const ids = [...editing.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
  assert.deepEqual(ids.sort(), ['child-icon', 'child-text', 'child-title', 'collection-title']);
  assert.match(editing, /\[No text in field\]/);
  assert.doesNotMatch(editing, /Key company facts|Our name|Add a datasource/);
  assert.doesNotMatch(render(empty), /<h2>|Key company facts|Our name|<img/);
  assert.equal(tiles(render(empty)).length, 1);
  assert.equal(JSON.stringify(empty), before);
});

test('irrelevant style parameters and old card fields cannot change the fixed icon-card design', () => {
  const params = { layout: 'image-left', columns: '1', alignment: 'left', theme: 'blue-soft',
    headingLevel: 'h1', spacing: 'xl', paddingTop: 'xl', marginBottom: 'xl', styles: 'redesign' };
  const unrelated = { ...datasource, children: { ...datasource.children, results: nativeCards.map((card) => ({
    ...card, image: { jsonValue: { value: { src: '/allianz-assets/not-an-icon.svg' } } },
    headingLevel: { jsonValue: { value: 'h1' } }, iconTheme: { jsonValue: { value: 'primary-brand' } },
    theme: { jsonValue: { value: 'blue-soft' } }, alphanumeral: { jsonValue: { value: '1' } },
    link: { jsonValue: { value: { href: '/about', text: 'Unrelated link' } } },
  })) } };
  assert.equal(render(unrelated, params), render(datasource));
  assert.match(render(datasource, { RenderingIdentifier: 'company-facts' }), /id="company-facts"/);
});

test('optional collection title only affects its fixed heading location; child content never switches layout', () => {
  const untitled = { ...datasource, title: { jsonValue: { value: '' } } };
  assert.deepEqual(tiles(render(untitled)), tiles(render(datasource)));
  assert.doesNotMatch(render(untitled), /m-axlIntroductionBlock|<h2>/);
  const changed = { ...datasource, children: { ...datasource.children, results: [
    { id: 'empty', title: { jsonValue: { value: '' } }, text: { jsonValue: { value: '' } }, icon: { jsonValue: { value: {} } } },
    ...nativeCards.slice(1),
  ] } };
  assert.equal(tiles(render(changed)).length, 6);
  assert.equal((render(changed).match(/class="l-grid__column-medium-4"/g) ?? []).length, 6);
  assert.deepEqual(render(changed).split('<div class="l-grid__row match-height-row">').slice(1)
    .map((row) => tiles(row).length), [3, 3]);
  assert.doesNotMatch(render(changed), /-is--split|o-cards|tile--stackedImage/);
});

test('native connection completeness survives projection and rejects omitted children', () => {
  const connection = (total, hasNext, results = nativeCards) => ({
    ...datasource, children: { total, pageInfo: { hasNext, endCursor: 'cursor' }, results: results.map(wireCard) },
  });
  assert.equal(collectionsComplete(connection(0, false, []), true), true);
  assert.equal(collectionsComplete(connection(6, false), true), true);
  const bound = Array.from({ length: 40 }, (_, index) => ({ ...nativeCards[0], id: `card-${index}` }));
  assert.equal(collectionsComplete(connection(40, false, bound), true), true);
  assert.equal((render(connection(40, false, bound)).match(/class="l-grid__column-medium-4"/g) ?? []).length, 40);
  assert.deepEqual(render(connection(40, false, bound)).split('<div class="l-grid__row match-height-row">').slice(1)
    .map((row) => tiles(row).length), [...Array(13).fill(3), 1]);
  assert.equal(collectionsComplete(connection(41, true, bound), true), false);
  assert.equal(collectionsComplete(connection(7, false), true), false);
  assert.equal(collectionsComplete({ ...datasource, children: { results: nativeCards.map(wireCard) } }, true), false);
});

test('responsive source rules keep three columns from 704px and 26/40px icon sizing', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/icon-cards/IconCards.css'), 'utf8');
  const sourceCss = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');
  assert.match(sourceCss, /@media\s*\(min-width:704px\)/);
  assert.match(sourceCss, /\.l-grid__column-medium-4\{flex:0 0 33\.3333333333%;max-width:33\.3333333333%\}/);
  assert.match(sourceCss, /\.m-axlTile \.tileIcon svg\{width:26px;height:auto;fill:#3c3c3c\}/);
  assert.match(sourceCss, /\.m-axlTile \.tileIcon svg\{width:40px\}/);
  assert.match(sourceCss, /\.u-font-size-lg\{font-size:1\.125rem!important\}/);
  assert.match(css, /\.allianz-icon-cards \.tileIcon img\s*\{\s*width: 26px;/);
  assert.match(css, /filter: brightness\(0\) invert\(23\.5294%\)/);
  assert.match(css, /@media \(min-width: 704px\)\s*\{\s*\.allianz-icon-cards \.tileIcon img\s*\{\s*width: 40px;/);
});
