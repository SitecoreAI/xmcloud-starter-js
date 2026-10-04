import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const filename = fileURLToPath(new URL('../components/biography-body/BiographyBody.tsx', import.meta.url));
const componentMap = new Map();
const seen = [];
const child = ({ rendering, params, fields }) => {
  seen.push({ rendering, params, fields });
  return React.createElement('article', { 'data-uid': rendering.uid }, fields.label.value);
};
componentMap.set('ExecutiveBiography', { Default: child, Extended: child });
componentMap.set('ExpertBiography', { Default: child });
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled.require = (specifier) => specifier === '.sitecore/component-map'
  ? { __esModule: true, default: componentMap }
  : require(specifier);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const Body = compiled.exports.Default;

function props(isEditing = false, children = [], dynamicPlaceholderId = '7') {
  return {
    page: { mode: { isEditing, isNormal: !isEditing }, layout: { sitecore: {} } },
    params: { DynamicPlaceholderId: dynamicPlaceholderId },
    rendering: { uid: 'body-uid', componentName: 'BiographyBody',
      params: { DynamicPlaceholderId: dynamicPlaceholderId },
      placeholders: { 'biography-body-{*}': children } },
  };
}
function rendering(componentName, uid, label, variant = 'Default') {
  return { componentName, uid, dataSource: `datasource-${uid}`,
    params: { FieldNames: variant, customParam: 'preserved' },
    fields: { label: { value: label } } };
}

test('BiographyBody returns the real SDK placeholder with the exact native key, page and rendering', () => {
  const input = props();
  const element = Body(input);
  assert.equal(element.props.name, 'biography-body-7');
  assert.equal(element.props.rendering, input.rendering);
  assert.equal(element.props.page, input.page);
  assert.equal(element.props.componentMap, componentMap);
  assert.equal(element.type, require('@sitecore-content-sdk/nextjs').AppPlaceholder);
});

test('real SDK renders both biography types in order without adding a visual wrapper', () => {
  seen.length = 0;
  const children = [rendering('ExecutiveBiography', 'executive-uid', 'First', 'Extended'),
    rendering('ExpertBiography', 'expert-uid', 'Second')];
  const snapshot = JSON.stringify(children);
  const html = renderToStaticMarkup(React.createElement(Body, props(false, children)));
  assert.equal(html, '<article data-uid="executive-uid">First</article><article data-uid="expert-uid">Second</article>');
  assert.equal(JSON.stringify(children), snapshot);
  assert.deepEqual(seen.map((entry) => entry.rendering), children);
  assert.deepEqual(seen.map((entry) => entry.rendering.dataSource), ['datasource-executive-uid', 'datasource-expert-uid']);
  assert.equal(seen[0].params.FieldNames, 'Extended');
  assert.equal(seen[0].params.customParam, 'preserved');
});

test('real SDK emits native placeholder and rendering metadata in editing mode', () => {
  const input = props(true, [rendering('ExpertBiography', 'expert-uid', 'Editable')]);
  const snapshot = JSON.stringify(input);
  const html = renderToStaticMarkup(React.createElement(Body, input));
  assert.match(html, /chrometype="placeholder"[^>]*id="biography-body-\{\*\}_body-uid"/);
  assert.match(html, /chrometype="rendering"[^>]*id="expert-uid"/);
  assert.match(html, /data-uid="expert-uid">Editable/);
  assert.equal(JSON.stringify(input), snapshot);
});

test('empty biography destination remains an editable SDK placeholder', () => {
  const editing = renderToStaticMarkup(React.createElement(Body, props(true)));
  assert.match(editing, /class="sc-jss-empty-placeholder"/);
  assert.match(editing, /id="biography-body-\{\*\}_body-uid"/);
  assert.equal(renderToStaticMarkup(React.createElement(Body, props(false))), '');
});

test('native dynamic IDs remain distinct and are never replaced by a guessed default', () => {
  assert.equal(Body(props(false, [], '19')).props.name, 'biography-body-19');
  for (const value of ['', ' ', '7x', '-1', '1.5', '7/other', 7, null]) {
    assert.throws(() => Body(props(false, [], value)), /requires a numeric native SXA DynamicPlaceholderId/);
  }
  for (const params of [undefined, {}, { DynamicPlaceholderId: undefined }]) {
    assert.throws(() => Body({ ...props(), params }), /requires a numeric native SXA DynamicPlaceholderId/);
  }
});
