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

const { allianzCardFields } = loadSource(path.join(sourceRoot, 'lib/allianz-card-fields.ts'));
const CardGrid = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx')).Default;
const LegacyCardGrid = loadSource(path.join(sourceRoot, 'components/allianz-legacy-card-grid/AllianzLegacyCardGrid.tsx')).Default;
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));

function wireCard(card) {
  return { id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id').map(([name, value]) => ({
    name,
    jsonValue: name === 'links' ? value.targetItems.map((item) => ({ id: item.id,
      fields: Object.fromEntries(['title', 'link', 'icon'].filter((key) => item[key]).map((key) => [key, item[key].jsonValue])) }))
      : value?.jsonValue,
  })) };
}

function render(datasource, params, isEditing = false, Component = CardGrid) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Native fields test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource } } })));
}

const legacyIconCard = (heading) => ({
  id: 'native-icon-card',
  heading: { jsonValue: { value: heading } },
  icon: { jsonValue: { value: { src: '/source-icon.svg', alt: 'Conversation', width: '32', height: '32' },
    metadata: { fieldId: 'native-card-icon', fieldType: 'Image', itemId: 'native-icon-card' } } },
});

test('legacy icons beside a heading are decorative without discarding valid authored alt text', () => {
  const card = legacyIconCard('Contact a financial professional');
  const before = JSON.stringify(card);
  const html = render({ children: { results: [card] } }, { columns: '3' }, false, LegacyCardGrid);
  const image = html.match(/<img\b[^>]*>/)?.[0];
  assert.ok(image);
  assert.match(image, /alt="Conversation"/);
  assert.match(image, /aria-hidden="true"/);
  assert.match(html, /Contact a financial professional/);
  assert.equal(JSON.stringify(card), before);
});

test('legacy icon editing keeps the native field identity and does not hide the image from editors', () => {
  const card = legacyIconCard('Contact a financial professional');
  const before = JSON.stringify(card);
  const html = render({ children: { results: [card] } }, { columns: '3' }, true, LegacyCardGrid);
  assert.match(html, /native-card-icon/);
  const image = html.match(/<img\b[^>]*>/)?.[0];
  assert.ok(image);
  assert.doesNotMatch(image, /aria-hidden=/);
  assert.equal(JSON.stringify(card), before);
});

test('legacy standalone icons retain their accessible authored alternative', () => {
  const html = render({ children: { results: [legacyIconCard('')] } }, { columns: '3' }, false, LegacyCardGrid);
  const image = html.match(/<img\b[^>]*>/)?.[0];
  assert.ok(image);
  assert.match(image, /alt="Conversation"/);
  assert.doesNotMatch(image, /aria-hidden=/);
});

test('existing named-query cards retain their objects and SDK metadata', () => {
  const heading = { jsonValue: { value: 'Source heading', metadata: { fieldId: 'native-heading' } } };
  const card = { id: 'native-card', heading };
  assert.equal(allianzCardFields(card), card);
  assert.equal(allianzCardFields(card).heading, heading);
});

test('native empty fields, media values and metadata survive collection projection', () => {
  const heading = { value: '', metadata: { fieldId: 'empty-heading', fieldType: 'Single-Line Text', itemId: 'native-card' } };
  const image = { value: { src: '/allianz-assets/actual.svg' }, metadata: { fieldId: 'native-image' } };
  const result = allianzCardFields({ id: 'native-card', fieldCollection: [
    { name: 'Heading', jsonValue: heading }, { name: 'image', jsonValue: image },
    { name: '__proto__', jsonValue: { injected: true } }, { name: 'constructor', jsonValue: {} },
  ] });
  assert.equal(result.heading.jsonValue, heading);
  assert.equal(result.image.jsonValue, image);
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(Object.hasOwn(result, 'constructor'), false);
});

test('native Treelist item fields keep order, IDs and genuine link metadata', () => {
  const first = { value: { href: '/about', text: 'About Allianz' }, metadata: { fieldId: 'first-link' } };
  const second = { value: {}, metadata: { fieldId: 'empty-link' } };
  const result = allianzCardFields({ id: 'native-card', fieldCollection: [{ name: 'links', jsonValue: [
    { id: 'first', fields: { title: { value: 'About' }, link: first } },
    { id: 'second', fields: { link: second } },
    { id: 'missing', url: '/careers', fields: {} },
  ] }] });
  assert.deepEqual(result.links.targetItems.map((item) => item.id), ['first', 'second', 'missing']);
  assert.equal(result.links.targetItems[0].link.jsonValue, first);
  assert.equal(result.links.targetItems[1].link.jsonValue, second);
  assert.equal(result.links.targetItems[2].link, undefined);
});

test('explicit named fields win and malformed collections do not fabricate content', () => {
  const heading = { jsonValue: { value: 'Existing authored heading' } };
  assert.equal(allianzCardFields({ id: 'card', heading,
    fieldCollection: [{ name: 'heading', jsonValue: { value: 'Other' } }] }).heading, heading);
  assert.equal(allianzCardFields({ id: 'card', fieldCollection: [{ name: 'links', jsonValue: 'unresolved' }] }).links, undefined);
});

test('every current source CardGrid keeps identical visible HTML with field collections', () => {
  let grids = 0;
  for (const route of Object.values(content.routes)) {
    for (const component of route.components.filter((entry) => entry.componentName === 'AllianzCardGrid')) {
      const datasource = component.fields.data.datasource;
      const collected = { ...datasource, children: { ...datasource.children,
        results: datasource.children.results.map(wireCard) } };
      assert.equal(render(collected, component.params), render(datasource, component.params), component.sourceKey);
      grids++;
    }
  }
  assert.ok(grids > 100);
});

test('public cards keep unlinked content visible without empty anchors and retain linked cards', () => {
  for (const linkValue of [{}, { href: '' }, undefined]) {
    const card = (id, heading, value) => ({ id, fieldCollection: [
      { name: 'Heading', jsonValue: { value: heading } },
      { name: 'Body', jsonValue: { value: `<p>${heading} body</p>` } },
      { name: 'Image', jsonValue: { value: { src: `/test-only-${id}.svg`, alt: `${heading} image` } } },
      ...(value === undefined ? [] : [{ name: 'Link', jsonValue: { value } }]),
    ] });
    const datasource = { children: { results: [
      card('unlinked-card', 'Unlinked service', linkValue),
      card('linked-card', 'Linked service', { href: '#authored-card-detail', text: 'Read more' }),
    ] } };
    const before = JSON.stringify(datasource);
    const html = render(datasource, { layout: 'cards', columns: '3' });
    assert.match(html, /<h4>Unlinked service<\/h4>/);
    assert.match(html, /<p>Unlinked service body<\/p>/);
    assert.match(html, /src="\/test-only-unlinked-card\.svg"/);
    assert.match(html, /<h4>Linked service<\/h4>/);
    assert.match(html, /<a\b[^>]*href="#authored-card-detail"[^>]*class="m-card"/);
    assert.equal((html.match(/<a\b/g) || []).length, 1, 'only the card with an authored destination is a link');
    assert.doesNotMatch(html, /<a\b[^>]*href=""/);
    assert.equal(JSON.stringify(datasource), before);
  }
});

test('projected empty native fields remain off both canvases with Content metadata unchanged', () => {
  const field = (fieldId, fieldType, value) => ({ value, metadata: { fieldId, fieldType, itemId: 'native-card' } });
  const card = { id: 'native-card', fieldCollection: [
    { name: 'heading', jsonValue: field('native-heading', 'Single-Line Text', '') },
    { name: 'body', jsonValue: field('native-body', 'Rich Text', '') },
    { name: 'image', jsonValue: field('native-image', 'Image', {}) },
    { name: 'link', jsonValue: field('native-link', 'General Link', {}) },
  ] };
  const datasource = { children: { results: [card] } }, before = JSON.stringify(datasource);
  const html = render(datasource, { layout: 'cards', columns: '3' }, true);
  const ids = [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
  assert.deepEqual(ids, []);
  assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage/);
  assert.doesNotMatch(html, /Add a datasource/);
  assert.equal(JSON.stringify(datasource), before);
});
