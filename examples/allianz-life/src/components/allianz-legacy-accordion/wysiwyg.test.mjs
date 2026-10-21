import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));

export function sourceLoader(overrides = {}, sourceOverrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const m = new Module(filename);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, m);
    const native = m.require.bind(m);
    m.require = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return native(specifier);
    };
    const source = sourceOverrides[filename] ?? fs.readFileSync(filename, 'utf8');
    m._compile(ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText, filename);
    return m.exports;
  }
  return load;
}

export const files = Object.fromEntries([
  ['Legacy', 'allianz-legacy-accordion/AllianzLegacyAccordion.tsx'],
  ['Faq', 'product-faq/ProductFaq.tsx'],
  ['Calculator', 'allianz-calculator/AllianzCalculator.tsx'],
].map(([key, file]) => [key, path.join(sourceRoot, 'components', file)]));
const load = sourceLoader();
const Legacy = load(files.Legacy).Default;
const Faq = load(files.Faq).Default;
const Calculator = load(files.Calculator).Default;

export function render(Component, datasource, editing = false, props = {}, instances = 1) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing: editing, isNormal: !editing, isPreview: false },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: {
        name: 'WYSIWYG regression', fields: {}, placeholders: {},
      } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, Array.from({ length: instances }, (_, key) => React.createElement(Component, {
    key, params: {}, rendering: { componentName: 'Test', placeholders: {} },
    fields: { data: { datasource } }, ...props,
  }))));
}

export const field = (name, value, itemId = 'authored-item') => ({ jsonValue: {
  value, metadata: { fieldId: name, itemId,
    fieldType: /body|answer|disclaimer/.test(name) ? 'Rich Text' : 'Single-Line Text' },
} });
const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
export const stripChrome = (html) => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
const connection = (results) => ({ total: results.length,
  pageInfo: { hasNext: false, endCursor: results.at(-1)?.id ?? null }, results });
export const legacyData = { heading: field('root-heading', 'Authored accordion'), children: connection([
  { id: 'first', heading: field('heading', 'First question', 'first'),
    body: field('body', '<p>First <strong>answer</strong>.</p>', 'first') },
  { id: 'second', heading: field('heading', 'Second question', 'second'),
    body: field('body', '<p>Second answer.</p>', 'second') },
]) };
export const faqData = { id: 'faq', children: connection([
  { id: 'first', question: field('question', 'First question', 'first'),
    answer: field('answer', '<p>First answer.</p>', 'first') },
  { id: 'second', question: field('question', 'Second question', 'second'),
    answer: field('answer', '<p>Second answer.</p>', 'second') },
]) };
export const calculatorData = { heading: field('heading', 'Authored calculator'),
  body: field('body', '<p>Explanation.</p>'), disclaimer: field('disclaimer', '<p>Qualification.</p>') };

for (const [name, Component, datasource, fieldCount] of [
  ['Legacy accordion', Legacy, legacyData, 5], ['Product FAQ', Faq, faqData, 4],
]) {
  test(`${name} keeps visitor structure and editable populated SDK fields in editing`, () => {
    const normal = render(Component, datasource);
    const editing = render(Component, datasource, true);
    assert.equal((editing.match(/aria-expanded="false"/g) || []).length, 2);
    assert.equal((editing.match(/hidden=""/g) || []).length, 2);
    assert.equal(metadata(editing).length, fieldCount);
    assert.equal(stripChrome(editing), normal);
    assert.deepEqual(metadata(normal), []);
    assert.doesNotMatch(editing, /No text in field|authoring|content is incomplete/);
  });
}

test('legacy accordion omits empty rows and fields without an unlabeled toggle', () => {
  const empty = { id: 'empty', heading: field('heading', ''), body: field('body', '') };
  for (const editing of [false, true]) {
    const html = render(Legacy, { children: connection([empty]) }, editing);
    assert.doesNotMatch(html, /panel-default|panel-heading|panel-body|<button|<h[1-6]|No text in field/);
    assert.deepEqual(metadata(html), []);
    const bodyOnly = render(Legacy, { children: connection([
      { ...empty, body: field('body', '<p>Body without a heading.</p>') },
    ]) }, editing);
    assert.match(bodyOnly, /Body without a heading/);
    assert.doesNotMatch(bodyOnly, /<button|hidden=""|panel-heading|No text in field/);
    assert.equal(metadata(bodyOnly).length, editing ? 1 : 0);
  }
});

test('two legacy accordion instances retain distinct panel IDs in editing', () => {
  const html = render(Legacy, legacyData, true, {}, 2);
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(controls.length, 4);
  assert.equal(new Set(controls).size, 4);
  for (const id of controls) assert.ok(html.includes(`id="${id}"`));
});

test('calculator editing renders the same local controls with editable surroundings', () => {
  const editing = render(Calculator, calculatorData, true);
  assert.equal((editing.match(/<input/g) || []).length, 3);
  assert.equal((editing.match(/<form/g) || []).length, 1);
  assert.equal(stripChrome(editing), render(Calculator, calculatorData));
  assert.deepEqual(metadata(editing).map((item) => item.fieldId), ['heading', 'body', 'disclaimer']);
  assert.doesNotMatch(editing, /allianz-local-calculator-authoring|action=|method=|No text in field/);
});

function stateful(ComponentFile, editing) {
  const state = [];
  let cursor = 0;
  const hooks = { ...React, useId: () => 'accordion', useState: (initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], (next) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
  } };
  const Component = sourceLoader({ react: hooks,
    '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) },
  })(ComponentFile).Default;
  let tree;
  const nodes = (node = tree) => Array.isArray(node) ? node.flatMap((child) => nodes(child ?? null))
    : React.isValidElement(node) ? [node, ...nodes(node.props.children ?? null)] : [];
  const draw = (props) => { cursor = 0; tree = Component(props); return nodes(); };
  return { draw };
}

for (const editing of [false, true]) {
  for (const allowMultiple of ['0', '1']) {
    test(`legacy accordion click/close/reopen honors allowMultiple=${allowMultiple} in ${editing ? 'editing' : 'normal'} mode`, () => {
      const view = stateful(files.Legacy, editing);
      const props = { params: { allowMultiple }, rendering: { placeholders: {} }, fields: { data: { datasource: legacyData } } };
      const buttons = () => view.draw(props).filter((node) => node.type === 'button');
      assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [false, false]);
      buttons()[0].props.onClick();
      assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [true, false]);
      buttons()[1].props.onClick();
      assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [allowMultiple === '1', true]);
      buttons()[1].props.onClick();
      assert.equal(buttons()[1].props['aria-expanded'], false);
      buttons()[1].props.onClick();
      assert.equal(buttons()[1].props['aria-expanded'], true);
    });
  }
  test(`Product FAQ toggles independently and can close again in ${editing ? 'editing' : 'normal'} mode`, () => {
    const view = stateful(files.Faq, editing);
    const props = { params: {}, fields: { data: { datasource: faqData } } };
    const buttons = () => view.draw(props).filter((node) => node.type === 'button');
    assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [false, false]);
    buttons()[0].props.onClick();
    buttons()[1].props.onClick();
    assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [true, true]);
    buttons()[0].props.onClick();
    assert.deepEqual(buttons().map((node) => node.props['aria-expanded']), [false, true]);
  });
}
