/** Real-SDK parity: native fields remain editable without adding canvas labels. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const require = createRequire(import.meta.url);
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../..');
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename); mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename)); cache.set(filename, mod);
  const native = mod.require.bind(mod);
  mod.require = (name) => {
    if (name === 'next/navigation') return { usePathname: () => '/about' };
    if (name.endsWith('.css')) return {};
    const local = name.startsWith('.') ? path.resolve(path.dirname(filename), name)
      : /^(lib|components)\//.test(name) ? path.join(sourceRoot, name) : null;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
    }
    return native(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return mod.exports;
}
const components = load(path.join(here, 'AllianzLegacyLinkList.tsx'));
function field(id, value, type = 'Single-Line Text') {
  return { jsonValue: { value, metadata: { itemId: 'native-test-owner', fieldId: id, fieldType: type } } };
}
function datasource() {
  return {
    heading: field('heading', 'Related content'),
    children: { total: 3, pageInfo: { hasNext: false }, results: [
      { id: 'about', heading: field('about-title', 'About us'), link: field('about-link', { href: '/about', text: 'About us' }, 'General Link') },
      { id: 'contact', heading: field('contact-title', ''), link: field('contact-link', { href: '/contact-us', text: 'Contact us' }, 'General Link') },
      { id: 'empty', heading: field('empty-title', ''), link: field('empty-link', { href: '', text: '' }, 'General Link') },
    ] },
  };
}
function render(name, data, editing) {
  const page = { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life',
    layout: { sitecore: { context: { itemPath: '/about' }, route: { name: 'Native shell', fields: {}, placeholders: {} } } } };
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    React.createElement(components[name], { fields: { data: { datasource: data } }, params: {}, rendering: { componentName: 'AllianzLegacyLinkList' } })));
}
function canvas(html) {
  return html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '').replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<([a-z][\w:-]*)(\s[^<>]*?)?>/g, (_tag, name, attrs = '') =>
      `<${name}${(attrs.match(/[^\s=]+(?:="[^"]*")?/g) || []).sort().map((attr) => ` ${attr}`).join('')}>`);
}
function metadataIds(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
}
for (const name of ['Default', 'ContactServices', 'ProductNavigation', 'ProductNextSteps']) {
  test(`${name}: populated native fields share one visual link in editing and normal mode`, () => {
    const data = datasource(), before = JSON.stringify(data);
    const normal = render(name, data, false), editing = render(name, data, true);
    assert.equal(canvas(editing), canvas(normal));
    assert.equal((canvas(editing).match(/About us/g) || []).length, 1);
    assert.equal((canvas(editing).match(/Contact us/g) || []).length, 1);
    const markers = metadataIds(editing);
    for (const id of ['about-title', 'about-link', 'contact-link']) assert.ok(markers.includes(id), id);
    for (const id of ['contact-title', 'empty-title', 'empty-link']) assert.ok(!markers.includes(id), id);
    assert.doesNotMatch(editing, /\[No text in field\]|scEmptyImage/);
    assert.equal(JSON.stringify(data), before);
  });
}
test('account links keep the same source mobile visibility and local unavailable destination in both modes', () => {
  const data = datasource(); data.children.results = [data.children.results[0]]; data.children.total = 1;
  data.children.results[0].link.jsonValue.value.href = '/account/sign-in';
  const before = JSON.stringify(data), normal = render('AccountServices', data, false), editing = render('AccountServices', data, true);
  assert.equal(canvas(editing), canvas(normal));
  assert.match(editing, /allianz-legacy-service-links--account hidden-xs/);
  assert.match(editing, /href="#service-unavailable"/);
  assert.doesNotMatch(editing, /href="\/account/);
  assert.equal((canvas(editing).match(/About us/g) || []).length, 1);
  assert.deepEqual(metadataIds(editing).sort(), ['about-link', 'about-title']);
  assert.equal(JSON.stringify(data), before);
});
test('cleared optional collections produce no authoring placeholders while keeping field data unchanged', () => {
  const data = datasource(); data.heading.jsonValue.value = ''; data.children.results = [data.children.results[2]]; data.children.total = 1;
  const before = JSON.stringify(data);
  for (const name of ['Default', 'ContactServices', 'AccountServices', 'ProductNavigation', 'ProductNextSteps']) {
    const editing = render(name, data, true);
    assert.equal(canvas(editing), canvas(render(name, data, false)));
    assert.deepEqual(metadataIds(editing), []);
    assert.doesNotMatch(editing, /\[No text in field\]|scEmptyImage|<a\b/);
  }
  assert.equal(JSON.stringify(data), before);
});
