import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const componentFile = path.join(here, '../LegalDisclosures.tsx');
const { Legacy, Default, Faq, NewsroomGrey } = load(componentFile);
const { safeNewsroomRichText } = load(path.join(here, '../newsroom-grey.links.props.ts'));
const sources = JSON.parse(fs.readFileSync(path.join(here, 'legacy-source-fragments.json')));
function render(Component, datasource, isEditing = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Prospectuses', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { rendering: { componentName: 'LegalDisclosures' }, params,
    fields: datasource === undefined ? undefined : { data: { datasource } } })));
}
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((m) => JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}
const editableBody = (value) => ({ value, metadata: { fieldId: 'synthetic-body', fieldType: 'Rich Text', itemId: 'synthetic-disclosure' } });
const bodyOf = (outer) => outer.slice(outer.indexOf('>') + 1, outer.lastIndexOf('</div>'));
const host = (body) => `<div class="col-md-12 content-body disclosure">${body}</div>`;

for (const source of sources) {
  test(`legacy source host and body: ${source.route} #${source.ordinal}`, () => {
    assert.equal(crypto.createHash('sha256').update(source.outerHtml).digest('hex'), source.fragmentSha256);
    assert.match(source.outerHtml, /^<div class="col-md-12 content-body disclosure">/);
    const body = editableBody(bodyOf(source.outerHtml));
    const data = { body: { jsonValue: body } };
    const before = JSON.stringify(data);
    assert.equal(render(Legacy, data), host(safeNewsroomRichText(body, false).value));
    const editing = render(Legacy, data, true);
    assert.ok(editing.includes(body.value));
    assert.deepEqual(metadata(editing), [body.metadata]);
    assert.equal(JSON.stringify(data), before);
    assert.doesNotMatch(render(Legacy, data), /l-container|l-grid|a-axlDisclosures|\[No text/);
  });
}

test('legacy coverage contains 35 disclosures across all 29 legacy document pages', () => {
  assert.equal(sources.length, 35);
  assert.equal(new Set(sources.map((source) => source.route)).size, 29);
});

test('cleared body retains editable SDK metadata and empty structural host', () => {
  for (const value of ['', '<!-- intentionally empty -->', '   ']) {
    const field = editableBody(value);
    const data = { body: { jsonValue: field } };
    assert.equal(render(Legacy, data), host(value));
    assert.deepEqual(metadata(render(Legacy, data, true)), [field.metadata]);
  }
  assert.equal(render(Legacy, {}), host(''));
  assert.deepEqual(metadata(render(Legacy, {}, true)), []);
  assert.match(render(Legacy, undefined), /Add a datasource for Legal Disclosures/);
});

test('native fieldCollection is accepted without replacing an explicit clear', () => {
  const fallback = editableBody('<p>Projected body</p>');
  const projected = { fieldCollection: [{ name: 'BoDy', jsonValue: fallback }] };
  assert.equal(render(Legacy, projected), host(fallback.value));
  assert.deepEqual(metadata(render(Legacy, projected, true)), [fallback.metadata]);
  for (const body of [undefined, { jsonValue: undefined }, { jsonValue: editableBody('') }]) {
    const direct = { ...projected, body };
    assert.equal(render(Legacy, direct), host(''));
  }
});

test('Legacy uses the established visitor link policy without mutating native source fields', () => {
  const body = editableBody('<p><a href="https://www.allianzlife.com/new-york" target="_blank">New York</a> <a href="http://www.finra.org" target="_blank">FINRA</a> <a href="javascript:alert(1)">Unsafe</a></p>');
  const before = JSON.stringify(body);
  const visitor = render(Legacy, { body: { jsonValue: body } });
  assert.match(visitor, /href="\/new-york" target=""/);
  assert.equal((visitor.match(/href="#service-unavailable"/g) || []).length, 2);
  assert.doesNotMatch(visitor, /javascript:|http:\/\/www.finra.org/);
  assert.ok(render(Legacy, { body: { jsonValue: body } }, true).includes(body.value));
  assert.equal(JSON.stringify(body), before);
});

test('RenderingIdentifier stays on the exact legacy host without introducing an extra wrapper', () => {
  assert.equal(render(Legacy, {}, false, { RenderingIdentifier: 'disclosure-one' }), '<div class="col-md-12 content-body disclosure" id="disclosure-one"></div>');
  const filled = render(Legacy, { body: { jsonValue: { value: '<p>Body</p>' } } }, false, { RenderingIdentifier: 'disclosure-one' });
  assert.equal(filled, '<div class="col-md-12 content-body disclosure" id="disclosure-one"><p>Body</p></div>');
});

test('existing modern Default, FAQ and NewsroomGrey purposes retain their own wrappers', () => {
  const body = { body: { jsonValue: { value: '<p>Preserved body</p>' } } };
  for (const Component of [Default, Faq]) {
    const html = render(Component, body);
    assert.match(html, /component legal-disclosures l-container--full-width a-axlDisclosures/);
    assert.match(html, /l-grid l-grid--max-width/);
    assert.ok(html.includes(host('<p>Preserved body</p>')));
  }
  const grey = render(NewsroomGrey, body);
  assert.match(grey, /allianz-newsroom-grey/);
  assert.match(grey, /tileBody/);
  assert.match(grey, /allianz-newsroom-grey-trailing/);
});
