import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
const ts = require('typescript'), React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const folder = here;
let editing = false, preview = false;
const seenFields = [];
const sdk = {
  useSitecore: () => ({ page: { mode: { isEditing: editing, isPreview: preview } } }),
  Text: ({ field, tag = 'span', editable }) => {
    seenFields.push({ field, editable });
    return React.createElement(tag, null, field?.value ?? '');
  },
  RichText: ({ field, editable, className }) => {
    seenFields.push({ field, editable });
    return React.createElement('div', { className }, field?.value ?? '');
  },
};
const marker = (name) => function ExistingSchemaMarker() { return React.createElement('div', { 'data-existing-schema': name }); };
function compile(file, aliases) {
  const m = new Module(file);
  m.require = (id) => Object.hasOwn(aliases, id) ? aliases[id] : require(id);
  m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  }).outputText, file);
  return m.exports;
}
const props = compile(path.join(app, 'src/components/allianz-calculator/allianz-calculator.props.ts'), {});
// Exercise the current repository helper, not a second routing implementation.
const currentModules = new Map();
function currentLib(name) {
  const file = path.join(app, 'src/lib', name);
  if (currentModules.has(file)) return currentModules.get(file);
  const raw = fs.readFileSync(file, 'utf8');
  if (name.endsWith('.json')) { const value = JSON.parse(raw); currentModules.set(file, value); return value; }
  const m = new Module(file);
  currentModules.set(file, m.exports);
  m.require = (id) => {
    if (id === './allianz-content-mode') return { isConnected: () => true, usesFixtureContent: () => false };
    if (id.startsWith('./')) return currentLib(id.slice(2) + (id.endsWith('.json') ? '' : '.ts'));
    if (id === '../../content/public-route-index.json') return JSON.parse(fs.readFileSync(path.join(app, 'content/public-route-index.json'), 'utf8'));
    return require(id);
  };
  m._compile(ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
  currentModules.set(file, m.exports); return m.exports;
}
const shared = {
  '@sitecore-content-sdk/nextjs': sdk,
  'lib/allianz-field-state': { shouldRenderTextField: (field) => Boolean(field?.value) },
  'lib/allianz-editorial': currentLib('allianz-editorial.ts'),
};
const rmd = compile(path.join(folder, 'RequiredMinimumDistribution.tsx'), {
  ...shared, './rmd-frame': { observeRmdFrame: () => { throw new Error('SSR must not execute effects'); } },
});
const calculator = compile(path.join(folder, 'AllianzCalculator.tsx'), {
  ...shared,
  './allianz-calculator.props': props,
  './RequiredMinimumDistribution': rmd,
  './lifetime-frame': { observeLifetimeFrame: () => {} },
  'lib/life-insurance/LifeInsuranceNative': { LifeInsuranceNative: marker('life-insurance-source-core') },
  'components/allianz-income-tools/IncomeLocalToolsDemo': { IncomeLocalToolsDemo: ({ mode }) => React.createElement('div', { 'data-existing-schema': mode }) },
});
const nativeProps = (key, extra = {}) => ({ params: { RenderingIdentifier: 'native-rmd-test' },
  rendering: { componentName: 'AllianzCalculator' }, fields: { data: { datasource: {
    ...(key === undefined ? {} : { schemaKey: { jsonValue: { value: key } } }), ...extra,
  } } } });
const render = (Component, p) => renderToStaticMarkup(React.createElement(Component, p));

test('the exact explicit RMD key and named native variant render the isolated source frame', () => {
  for (const Component of [calculator.Default, calculator.RequiredMinimumDistribution]) {
    const html = render(Component, nativeProps('rmd-source'));
    assert.match(html, /src="\/allianz-assets\/rmd\/index.html"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /visibility:hidden/);
    assert.match(html, /The calculator is loading\./);
    assert.doesNotMatch(html, /Compute|How much you need to save|principal|<form/);
    // The production iframe owns its source grid. Empty datasource copy adds no parent grid.
    assert.doesNotMatch(html, /l-grid--max-width/);
  }
});

test('the established other schemas and generic fallback keep their existing rendering paths', () => {
  assert.match(render(calculator.Default, nativeProps('lifetime-income-official')), /lifetime-income\/index\.html/);
  assert.match(render(calculator.Default, nativeProps('life-insurance-source-core')), /data-existing-schema="life-insurance-source-core"/);
  assert.match(render(calculator.Default, nativeProps('income-rates-demo')), /data-existing-schema="rates"/);
  assert.match(render(calculator.Default, nativeProps('income-strategy-demo')), /data-existing-schema="strategy"/);
  for (const key of [undefined, '', 'rmd-source-other', 'RMD-source']) {
    const html = render(calculator.Default, nativeProps(key));
    assert.match(html, /Compute/); assert.doesNotMatch(html, /rmd\/index\.html/);
  }
});

test('authored fields pass unchanged to SDK field components in Normal and Editing modes', () => {
  const fields = { heading: { jsonValue: { value: 'Native RMD heading', editable: '<span>heading</span>' } },
    body: { jsonValue: { value: 'Native body', editable: '<span>body</span>' } },
    disclaimer: { jsonValue: { value: 'Native disclaimer', editable: '<span>disclaimer</span>' } } };
  for (const mode of [false, true]) {
    editing = mode; seenFields.length = 0;
    const html = render(calculator.Default, nativeProps('rmd-source', fields));
    assert.match(html, /Native RMD heading/); assert.match(html, /Native body/); assert.match(html, /Native disclaimer/);
    assert.equal(seenFields.length, 3);
    for (const [i, field] of Object.values(fields).entries()) {
      assert.equal(seenFields[i].field, field.jsonValue);
      assert.equal(seenFields[i].editable, mode);
    }
    assert.equal((html.match(/l-grid--max-width/g) ?? []).length, 2);
    assert.ok(html.indexOf('Native body') < html.indexOf('<iframe'));
    assert.ok(html.indexOf('<iframe') < html.indexOf('Native disclaimer'));
  }
  editing = false;
});

test('cleared or missing authored fields add no duplicate headings or disclaimers', () => {
  for (const extra of [{}, { heading: { jsonValue: { value: '' } }, body: { jsonValue: { value: '' } }, disclaimer: { jsonValue: { value: '' } } }]) {
    const html = render(calculator.Default, nativeProps('rmd-source', extra));
    assert.doesNotMatch(html, /<h[1-6]|o-richTextEditor__wrapper|l-grid--max-width/);
    assert.equal((html.match(/<iframe/g) ?? []).length, 1);
  }
});

test('new authored bodies/disclaimers follow existing local-or-hash visitor policy and retain raw Editing fields', () => {
  const body = { value: '<p data-check="kept"><a href="https://www.allianzlife.com/Contact-Us">Contact</a><a href="https://www.allianzlife.com/migration-control-not-present">Unavailable</a></p>', editable: '<span>Native body chrome</span>' };
  const disclaimer = { value: '<a href="https://www.allianzlife.com/Login" target="_blank">Login</a>', editable: '<span>Native disclaimer chrome</span>' };
  for (const mode of [{ editing: false, preview: false }, { editing: false, preview: true }, { editing: true, preview: false }]) {
    editing = mode.editing; preview = mode.preview; seenFields.length = 0;
    render(calculator.Default, nativeProps('rmd-source', { body: { jsonValue: body }, disclaimer: { jsonValue: disclaimer } }));
    const rendered = seenFields.map((entry) => entry.field);
    if (editing) { assert.equal(rendered[0], body); assert.equal(rendered[1], disclaimer); }
    else {
      assert.match(rendered[0].value, /href="\/contact-us"/);
      assert.match(rendered[0].value, /href="#"/);
      assert.match(rendered[0].value, /data-check="kept"/);
      assert.match(rendered[1].value, /href="#"/);
      assert.doesNotMatch(rendered[0].value + rendered[1].value, /https:\/\/www\.allianzlife\.com/);
      assert.equal(rendered[0].editable, body.editable);
      assert.equal(rendered[1].editable, disclaimer.editable);
    }
  }
  editing = false; preview = false;
});
