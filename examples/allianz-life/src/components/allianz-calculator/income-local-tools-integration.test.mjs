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
const root = fileURLToPath(new URL('../../', import.meta.url));
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const m = new Module(file);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  modules.set(file, m);
  const nativeRequire = m.require.bind(m);
  m.require = (specifier) => {
    if (specifier.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier)
      : /^(lib|components)\//.test(specifier) ? path.join(root, specifier) : null;
    const source = local && [local, `${local}.ts`, `${local}.tsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (source && /\.tsx?$/.test(source)) return load(source);
    return nativeRequire(specifier);
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, file);
  return m.exports;
}
const { Default } = load(path.join(root, 'components/allianz-calculator/AllianzCalculator.tsx'));
const { incomeToolsDemoMode } = load(path.join(root, 'components/allianz-calculator/allianz-calculator.props.ts'));
const field = (name, value) => ({ jsonValue: { value, metadata: { fieldId: name, itemId: 'income-demo', fieldType: name === 'heading' ? 'Single-Line Text' : 'Rich Text' } } });
function render(key, editing = false, extra = {}, props = {}) {
  const page = { mode: { isEditing: editing, isNormal: !editing }, layout: { sitecore: { context: {}, route: { name: 'Income local demo', fields: {}, placeholders: {} } } }, siteName: 'allianz-life' };
  const datasource = { schemaKey: field('schemaKey', key), ...extra };
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    React.createElement(Default, { params: {}, fields: { data: { datasource } }, ...props })));
}

const incomeRoot = '/sitecore/content/allianz/allianz-life/Home/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income';
const approvedSources = [
  [`${incomeRoot}/rila-rates-center-iaip/Data/AllianzCalculator 03`, /Demo sample rates/],
  [`${incomeRoot}/strategy-calculator/Data/AllianzCalculator 04`, /Hypothetical starting amount/],
];

test('only the two explicit authored schema keys select an Income demo', () => {
  assert.equal(incomeToolsDemoMode(field('key', 'income-rates-demo')), 'rates');
  assert.equal(incomeToolsDemoMode(field('key', 'income-strategy-demo')), 'strategy');
  for (const value of ['', 'income-rates-demo ', 'INCOME-RATES-DEMO', 'retirement', 'unknown']) assert.equal(incomeToolsDemoMode(field('key', value)), null);
  assert.equal(incomeToolsDemoMode(), null);
});
test('installed SDK renders the Rates demo through the existing Calculator contract', () => {
  const html = render('income-rates-demo');
  assert.match(html, /Demo sample rates/);
  assert.match(html, /Fictional sample assumptions/);
  assert.equal((html.match(/<select/g) || []).length, 2);
  assert.match(html, /Reset filters/);
  assert.doesNotMatch(html, /How much you need to save|action=|method=|<iframe/);
});
test('installed SDK renders the Strategy demo with explicit sample assumptions', () => {
  const html = render('income-strategy-demo');
  assert.match(html, /Hypothetical starting amount/);
  assert.match(html, /Sample cap/);
  assert.match(html, /Dual Precision strategies are not modeled/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /How much you need to save|action=|method=|<iframe/);
});
test('layouts without component fields render learning tools only for the two approved datasource paths', () => {
  for (const [dataSource, expected] of approvedSources) {
    const html = render(undefined, false, {}, { fields: undefined, rendering: { componentName: 'AllianzCalculator', dataSource } });
    assert.match(html, expected);
    assert.match(html, /Local learning demo/);
    assert.doesNotMatch(html, /How much you need to save/);
  }
});
test('explicit blank or unknown authored schema keys override the datasource fallback', () => {
  for (const [dataSource] of approvedSources) for (const key of ['', 'unknown', 'income-rates-demo ']) {
    const html = render(key, false, {}, { rendering: { dataSource } });
    assert.match(html, /How much you need to save/);
    assert.doesNotMatch(html, /Demo sample rates|Local learning demo/);
  }
});
test('unapproved or changed datasource paths preserve the existing utility when fields are absent', () => {
  for (const [approved] of approvedSources) for (const dataSource of [undefined, `${approved}/`, approved.toLowerCase(), approved.replace('index-advantage-plus-income', 'index-advantage-income-adv')]) {
    const html = render(undefined, false, {}, { fields: undefined, rendering: { dataSource } });
    assert.match(html, /How much you need to save/);
    assert.equal((html.match(/<input/g) || []).length, 3);
    assert.doesNotMatch(html, /Demo sample rates|Local learning demo/);
  }
});
test('Income demo surrounding fields retain editable SDK metadata and cleared values', () => {
  const extra = { heading: field('heading', 'Authored heading'), body: field('body', '<p>Authored explanation.</p>'), disclaimer: field('disclaimer', '<p>Authored qualification.</p>') };
  for (const key of ['income-rates-demo', 'income-strategy-demo']) {
    const editing = render(key, true, extra);
    for (const name of ['heading', 'body', 'disclaimer']) assert.match(editing, new RegExp(`fieldId&quot;:&quot;${name}`));
    for (const isEditing of [false, true]) {
      const cleared = Object.fromEntries(Object.keys(extra).map((name) => [name, field(name, '')]));
      assert.doesNotMatch(render(key, isEditing, cleared), /Authored heading|Authored explanation|Authored qualification/);
    }
  }
});
test('unknown schemas keep the existing retirement utility behavior', () => {
  const html = render('unknown');
  assert.match(html, /How much you need to save/);
  assert.equal((html.match(/<input/g) || []).length, 3);
  assert.doesNotMatch(html, /Demo sample rates|Local learning demo/);
});
