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

const Mission = loadSource(path.join(sourceRoot, 'components/company-mission/CompanyMission.tsx')).Default;
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));
const source = content.routes['/about'].components.find((entry) => entry.sourceKey === '/about:section:1');
const rawStatement = source.fields.data.datasource.body.jsonValue.value.replaceAll('\u00a0', '&nbsp;');

function render(statement, params = {}, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Company Mission', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Mission, { params, fields: { data: { datasource: {
    missionStatement: { jsonValue: statement },
  } } } })));
}

test('company mission keeps captured semantic paragraphs inside its fixed source design', () => {
  const statement = { value: rawStatement };
  const html = render(statement);
  assert.match(html, /class="l-container--full-width t-bg-transparent"/);
  assert.match(html, /class="l-grid__row u-margin-bottom-xl"/);
  assert.match(html, /class="o-richTextEditor__wrapper"/);
  assert.ok(html.includes(rawStatement));
  assert.equal(statement.value, rawStatement);
  assert.doesNotMatch(html, /tileHeading|tileSubHeading|tileLink|a-axlDisclosures/);
});

test('layout, theme, typography and spacing parameters cannot redesign company mission', () => {
  const statement = { value: '<p>Authored mission statement.</p>' };
  assert.equal(render(statement), render(statement, {
    layout: 'disclosures', theme: 'blue-soft', headingLevel: 'h1', columns: '4',
    spacing: 'lg', paddingTop: 'xl', marginBottom: 'none',
  }));
  assert.match(render(statement, { RenderingIdentifier: 'our-mission' }), /id="our-mission"/);
});

test('cleared mission keeps real native editable chrome without source-content fallback', () => {
  const statement = { value: '', metadata: { fieldId: 'native-mission-field',
    fieldType: 'Rich Text', itemId: 'native-company-mission' } };
  const editing = render(statement, {}, true).replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  assert.match(editing, /"fieldId":"native-mission-field"/);
  assert.match(editing, /"itemId":"native-company-mission"/);
  assert.doesNotMatch(editing, /Our mission|Add a datasource/);
  assert.doesNotMatch(render(statement), /Our mission|Authored mission/);
  assert.equal(statement.value, '');
});
