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
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));

function wireCard(card) {
  return { id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id').map(([name, value]) => ({
    name,
    jsonValue: name === 'links' ? value.targetItems.map((item) => ({ id: item.id,
      fields: Object.fromEntries(['title', 'link', 'icon'].filter((key) => item[key]).map((key) => [key, item[key].jsonValue])) }))
      : value?.jsonValue,
  })) };
}

function render(datasource, params, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Native fields test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(CardGrid, { params, fields: { data: { datasource } } })));
}

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

test('real SDK editing renders projected empty heading/body/image/link chrome', () => {
  const field = (fieldId, fieldType, value) => ({ value, metadata: { fieldId, fieldType, itemId: 'native-card' } });
  const card = { id: 'native-card', fieldCollection: [
    { name: 'heading', jsonValue: field('native-heading', 'Single-Line Text', '') },
    { name: 'body', jsonValue: field('native-body', 'Rich Text', '') },
    { name: 'image', jsonValue: field('native-image', 'Image', {}) },
    { name: 'link', jsonValue: field('native-link', 'General Link', {}) },
  ] };
  const html = render({ children: { results: [card] } }, { layout: 'cards', columns: '3' }, true);
  const ids = [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
  assert.deepEqual(ids.sort(), ['native-body', 'native-heading', 'native-image', 'native-link']);
  assert.match(html, /\[No text in field\]/);
  assert.doesNotMatch(html, /Add a datasource/);
});
