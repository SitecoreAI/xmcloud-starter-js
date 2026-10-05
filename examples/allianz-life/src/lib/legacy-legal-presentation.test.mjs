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
const sdk = require('@sitecore-content-sdk/nextjs');
const postcss = require('postcss');
const root = fileURLToPath(new URL('..', import.meta.url));
const componentMap = new Map();
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
    if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
    // Non-layout shells are irrelevant to these real SDK placeholder tests.
    if (['src/Scripts', 'components/content-sdk/SitecoreStyles', 'components/content-sdk/ConsentControls',
      'components/content-sdk/ServiceUnavailable'].includes(specifier)) return { __esModule: true, default: () => null };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(root, specifier)
        : specifier.startsWith('src/') ? path.join(root, specifier.slice(4)) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
      if (resolved?.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const Header = loadSource(path.join(root, 'components/allianz-legacy-page-header/AllianzLegacyPageHeader.tsx'));
const Links = loadSource(path.join(root, 'components/allianz-legacy-link-list/AllianzLegacyLinkList.tsx'));
const Layout = loadSource(path.join(root, 'Layout.tsx')).default;
componentMap.set('AllianzLegacyPageHeader', Header);
componentMap.set('AllianzLegacyLinkList', Links);
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: 'test-only-item', fieldId: `test-only-${name}`, fieldType: name === 'link' ? 'General Link' : name === 'heading' ? 'Rich Text' : 'Single-Line Text',
} } });
const page = (editing = false, placeholders = {}, legacy = true) => ({
  mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life',
  layout: { sitecore: { context: {}, route: { name: 'Test page',
    fields: { shellFamily: { value: legacy ? 'legacy' : '' } }, placeholders: { 'headless-header': [], 'headless-footer': [], ...placeholders } } } },
});
function props(datasource, editing = false, params = {}) {
  return { params, fields: { data: { datasource } }, rendering: { uid: 'test-only-rendering' }, page: page(editing) };
}
function render(Component, input) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: input.page, api: {}, componentMap, loadImportMap: async () => ({}),
  }, React.createElement(Component, input)));
}
const linksData = (href = '/new-york/login', title = 'Authored label') => ({
  heading: field('heading', 'Authored service navigation'),
  children: { total: 1, pageInfo: { hasNext: false }, results: [
    { id: 'test-only-entry', heading: field('entry-heading', title), link: field('link', { href, text: title }) },
  ] },
});

test('Legal renders native title and optional prose, preserving authored markup and input', () => {
  const input = props({ heading: field('heading', 'Legal <em>notes</em>'), body: field('body', '<p>Authored introduction</p>') });
  const before = JSON.stringify(input);
  const html = render(Header.Legal, input);
  assert.match(html, /class="page-header allianz-legacy-legal-header"/);
  assert.match(html, /<h1 class="allianz-legacy-legal-title">Legal <em>notes<\/em><\/h1>/);
  assert.match(html, /<p>Authored introduction<\/p>/);
  assert.equal(JSON.stringify(input), before);
});

test('Legal accepts editor paragraph markup without invalid nesting', () => {
  const input = props({ heading: field('heading', '<p>New <em>title</em></p>') });
  const html = render(Header.Legal, input);
  assert.match(html, /<div role="heading" aria-level="1" class="allianz-legacy-legal-title"><p>New <em>title<\/em><\/p><\/div>/);
  assert.doesNotMatch(html, /<h1[^>]*><p/);
});

test('cleared Legal title stays empty for visitors and retains genuine SDK editor metadata', () => {
  const data = { heading: field('heading', ''), body: field('body', '') };
  assert.equal(render(Header.Legal, props(data)), '<header class="page-header allianz-legacy-legal-header"></header>');
  const editing = render(Header.Legal, props(data, true));
  assert.match(editing, /fieldId.*test-only-heading/);
  assert.match(editing, /fieldId.*test-only-body/);
  assert.match(render(Header.Legal, props(undefined)), /Add a datasource for AllianzLegacyPageHeader/);
});

test('Default title output remains unmodified', () => {
  assert.equal(render(Header.Default, props({ heading: field('heading', 'Existing title') }, false, { RenderingIdentifier: 'unchanged' })),
    '<header class="page-header" id="unchanged"><h1>Existing title</h1></header>');
});

test('Legal title CSS matches source mobile and desktop geometry and stays narrowly scoped', () => {
  const css = postcss.parse(fs.readFileSync(path.join(root, 'components/allianz-legacy-page-header/AllianzLegacyLegalHeader.css'), 'utf8'));
  const rules = [];
  css.walkRules((rule) => { rules.push(rule); assert.ok(rule.selector.startsWith('.allianz-legacy .allianz-legacy-legal-')); });
  const title = rules.find((rule) => rule.parent.type === 'root' && rule.selector.endsWith('.allianz-legacy-legal-title'));
  const desktop = rules.find((rule) => rule.parent.type === 'atrule' && rule.selector.endsWith('.allianz-legacy-legal-title'));
  const values = (rule) => Object.fromEntries(rule.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value]));
  assert.equal(values(title)['font-size'], '32px');
  assert.equal(values(title)['line-height'], '1.1');
  assert.equal(values(title).margin, '0 0 20px');
  assert.equal(desktop.parent.params, '(min-width: 768px)');
  assert.equal(values(desktop)['font-size'], '40px');
  assert.equal(values(desktop).margin, '-8px 0 19px');
});

for (const href of ['/new-york/login', '#', 'https://auth.allianzlife.com/am/XUI/', '/ordinary-public-route']) {
  test(`AccountServices isolates visitor destination for ${href}`, () => {
    const data = linksData(href);
    const before = JSON.stringify(data);
    const html = render(Links.AccountServices, props(data));
    assert.match(html, /aria-label="Authored service navigation"/);
    assert.match(html, /allianz-legacy-service-links--account hidden-xs/);
    assert.match(html, /href="#service-unavailable"/);
    assert.match(html, />Authored label<\/span>/);
    assert.match(html, /class="caret" aria-hidden="true"/);
    assert.doesNotMatch(html, /<form|<input|<iframe|<script|aria-expanded|data-toggle/);
    assert.equal(JSON.stringify(data), before);
  });
}

test('ContactServices preserves native destination, source contact styling and ordering', () => {
  const data = linksData('/new-york/contact-us', 'Contact Us');
  data.children.results.push({ id: 'test-only-second', heading: field('entry-heading', 'Second authored link'), link: field('link', { href: '/new-york', text: 'Second' }) });
  data.children.total++;
  const html = render(Links.ContactServices, props(data));
  assert.match(html, /href="\/new-york\/contact-us"/);
  assert.match(html, /class="btn-icon-mail">Contact Us<\/span>/);
  assert.ok(html.indexOf('Contact Us') < html.indexOf('Second authored link'));
  assert.doesNotMatch(html, /hidden-xs|caret/);
  assert.match(render(Links.ContactServices, props(linksData('https://external.example/account'))), /href="#service-unavailable"/);
});

test('service editing preserves original fields and cleared link chrome without mobile hiding', () => {
  for (const Component of [Links.AccountServices, Links.ContactServices]) {
    const data = linksData('/new-york/login');
    const before = JSON.stringify(data);
    const html = render(Component, props(data, true));
    assert.match(html, /href="\/new-york\/login"/);
    assert.match(html, /fieldId.*test-only-link/);
    assert.match(html, /fieldId.*test-only-entry-heading/);
    assert.doesNotMatch(html, /hidden-xs/);
    data.children.results[0].link.jsonValue.value.href = '';
    assert.equal(render(Component, props(data)), '');
    assert.match(render(Component, props(data, true)), /fieldId.*test-only-link/);
    data.children.results[0].link.jsonValue.value.href = '/new-york/login';
    assert.equal(JSON.stringify(data), before);
    assert.equal(render(Component, props(undefined)), '');
  }
});

test('service CSS is scoped, retains source border spacing and restores keyboard focus', () => {
  const css = postcss.parse(fs.readFileSync(path.join(root, 'components/allianz-legacy-link-list/AllianzLegacyServiceLinks.css'), 'utf8'));
  css.walkRules((rule) => assert.ok(rule.selector.startsWith('.allianz-legacy .allianz-legacy-service-links')));
  assert.match(css.toString(), /:focus-visible/);
  assert.match(css.toString(), /outline: 2px solid #006192/);
  assert.match(css.toString(), /border-top: 0/);
  // Outrank the recovered 0,4,0 display and 0,4,2 focus rules regardless of load order.
  css.walkRules((rule) => assert.ok(rule.selector.includes('.nav.navbar-nav.right-nav')));
  const displayRule = css.nodes.find((node) => node.type === 'atrule').nodes[0];
  assert.equal(displayRule.parent.params, '(min-width: 768px)');
});

const placement = (variant, id) => ({ componentName: 'AllianzLegacyLinkList', uid: id,
  params: { FieldNames: variant }, dataSource: `test-only-${id}`, fields: { data: { datasource: linksData(variant === 'ContactServices' ? '/new-york/contact-us' : '/new-york/login', id) } } });

test('Layout renders ordered rail through genuine SDK AppPlaceholder with native editor chrome', () => {
  const placeholders = { 'headless-sidebar': [{ componentName: 'AllianzLegacyPageHeader', uid: 'test-only-left', params: {} }],
    'headless-main': [], 'headless-right-rail': [placement('AccountServices', 'account'), placement('ContactServices', 'contact')] };
  const input = { page: page(true, placeholders) };
  const before = JSON.stringify(input);
  const html = render(Layout, input);
  assert.match(html, /<aside class="col-md-2 col-sm-3 right-column">/);
  assert.match(html, /id="content-body" class="col-md-8 col-sm-9 center-column"/);
  assert.match(html, /chrometype="placeholder"[^>]*id="headless-right-rail_00000000-0000-0000-0000-000000000000"/);
  assert.match(html, /chrometype="rendering"[^>]*id="account"/);
  assert.match(html, /chrometype="rendering"[^>]*id="contact"/);
  assert.ok(html.indexOf('id="account"') < html.indexOf('id="contact"'));
  assert.equal(JSON.stringify(input), before);
});

test('Layout keeps an explicitly declared empty rail editable while visitor and other layouts stay unchanged', () => {
  const declared = { 'headless-main': [], 'headless-right-rail': [] };
  const editing = render(Layout, { page: page(true, declared) });
  assert.match(editing, /sc-jss-empty-placeholder/);
  assert.match(editing, /id="headless-right-rail_00000000-0000-0000-0000-000000000000"/);
  assert.match(editing, /col-md-10 col-sm-9 center-column/);
  for (const editingMode of [false, true]) {
    const html = render(Layout, { page: page(editingMode, { 'headless-main': [] }) });
    assert.doesNotMatch(html, /right-column|headless-right-rail/);
    assert.match(html, /col-md-10 col-md-offset-1 center-column/);
  }
  assert.doesNotMatch(render(Layout, { page: page(false, declared) }), /right-column|headless-right-rail/);
  assert.doesNotMatch(render(Layout, { page: page(true, declared, false) }), /right-column|headless-right-rail/);
});
