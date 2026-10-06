/** Offline source-oracle, SDK markup and interaction regression. No browser or CMS. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import test from 'node:test';
const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, '../../..');
const require = createRequire(import.meta.url);
const ts = require('typescript'), React = require('react'), sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const witnesses = JSON.parse(fs.readFileSync(path.join(here, 'sidebar.source.json'), 'utf8'));
const componentFile = path.join(here, '../AllianzLegacySidebar.tsx');
function loader(overrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const file = [local, `${local}.ts`, `${local}.tsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        if (file && /\.tsx?$/.test(file)) return load(file);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const field = (name, value, id) => ({ jsonValue: { value, metadata: { itemId: id, fieldId: `test-${name}`, fieldType: name === 'link' ? 'General Link' : 'Single-Line Text' } } });
function data(witness) {
  let i = 0;
  const item = (source) => { const id = `sidebar-test-${++i}`; return { id, title: field('title', source.text, id), link: field('link', { href: source.href, title: source.text }, id), children: { results: source.children.map(item) } }; };
  return { primaryNav: { targetItems: witness.groups.map(item) } };
}
const props = (datasource) => ({ params: { RenderingIdentifier: 'sidebar-test' }, fields: { data: { datasource } } });
const page = (itemPath, editing = false) => ({ siteName: 'allianz-life', locale: 'en', mode: { isEditing: editing, isNormal: !editing, isPreview: false }, layout: { sitecore: { context: { itemPath }, route: { name: 'Test', fields: {}, placeholders: {} } } } });
function nodes(root) {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== 'object' || !root.props) return [];
  return [root, ...nodes(root.props.children)];
}
function harness(itemPath, pathname = itemPath) {
  const state = []; let cursor = 0, root;
  const current = { itemPath, pathname };
  const fakeReact = { ...React, useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], (value) => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }]; } };
  const load = loader({ react: fakeReact, '@sitecore-content-sdk/nextjs': { Link: 'sdk-link', Text: 'sdk-text', useSitecore: () => ({ page: page(current.itemPath) }) }, 'next/navigation': { usePathname: () => current.pathname } });
  const { Default } = load(componentFile);
  return { current, load, render(input) { cursor = 0; root = Default(input); return root; }, nodes() { return nodes(root); } };
}
function observedLinks(root) {
  const links = [];
  function visit(node, li) {
    if (Array.isArray(node)) return node.forEach((child) => visit(child, li));
    if (!node || typeof node !== 'object' || !node.props) return;
    if (node.type === 'li') li = node;
    if (node.type === 'sdk-link') links.push({ text: node.props.children.props.field?.value || '', href: node.props.field.value.href.toLowerCase(), liClass: (li?.props.className || '').trim(), anchorClass: node.props.className ?? node.props.field.value.class ?? '', ariaCurrent: node.props['aria-current'] });
    visit(node.props.children, li);
  }
  visit(root); return links;
}
const expectedLinks = (groups) => groups.flatMap((item) => [{ text: item.text, href: item.href.toLowerCase(), liClass: item.liClass, anchorClass: item.anchorClass, ariaCurrent: item.anchorClass === 'current' ? 'page' : undefined }, ...expectedLinks(item.children)]);

test('18 captured sidebar witnesses pin exact leaves, ancestor emphasis, plain nested lists and empty roots', () => {
  assert.equal(witnesses.length, 18);
  for (const witness of witnesses) {
    assert.equal(createHash('sha256').update(witness.sidebarHtml).digest('hex'), witness.sidebarSha256);
    const h = harness(witness.route); const root = h.render(props(data(witness)));
    assert.deepEqual(observedLinks(root), expectedLinks(witness.groups), witness.key);
    assert.equal(h.nodes().filter((n) => n.type === 'button').length, witness.groups.length, `${witness.key}: leaf root toggles`);
    assert.equal(h.nodes().filter((n) => n.type === 'ul' && n.props.className === 'dropdown-menu').length, witness.groups.length, `${witness.key}: empty dropdowns`);
    assert.equal(h.nodes().filter((n) => n.type === 'ul' && !n.props.className).length, (witness.sidebarHtml.match(/<ul>/g) || []).length, `${witness.key}: plain nested UL`);
  }
});
test('SDK route context selects the current leaf on direct, rewritten and editor URLs; pathname remains a fallback', () => {
  const witness = witnesses.find((w) => w.key === 'route01');
  for (const pathname of [witness.route, `/allianz-life/en${witness.route}`, '/_site_allianz-life/en/rewritten', '/api/editing/render']) {
    const h = harness(witness.route, pathname);
    assert.deepEqual(observedLinks(h.render(props(data(witness)))), expectedLinks(witness.groups), pathname);
  }
  const h = harness(undefined, witness.route);
  assert.deepEqual(observedLinks(h.render(props(data(witness)))), expectedLinks(witness.groups));
});
test('navigation and Back/Forward move current state without mutating data or marking rendered ancestors', () => {
  const witness = witnesses.find((w) => w.key === 'route01'), input = props(data(witness)), before = JSON.stringify(input), h = harness(witness.route);
  const variable = '/new-york/annuities/investment-strategies/variable-options';
  for (const route of [witness.route, variable, witness.route, variable]) {
    h.current.itemPath = route; h.current.pathname = route;
    const links = observedLinks(h.render(input));
    assert.deepEqual(links.filter((a) => a.ariaCurrent === 'page').map((a) => a.href), [route]);
    assert.deepEqual(links.filter((a) => a.liClass === 'active').map((a) => a.href), [route]);
  }
  assert.equal(JSON.stringify(input), before);
});
test('ancestor matching uses segment boundaries and never makes a root self-link current', () => {
  const witness = witnesses.find((w) => w.key === 'route04'), h = harness('/new-york/annuities/prospectuses-other/page');
  assert.equal(observedLinks(h.render(props(data(witness)))).filter((a) => a.liClass === 'active').length, 0);
  for (const leaf of witnesses.filter((w) => /^route(?:26|27|28|29|30)$/.test(w.key))) {
    const link = observedLinks(harness(leaf.route).render(props(data(leaf))))[0];
    assert.equal(link.ariaCurrent, undefined); assert.equal(link.liClass, 'dropdown');
  }
});
test('all roots including leaves support repeated mobile button activation without navigation', () => {
  for (const witness of witnesses.filter((w) => w.groups.length)) {
    const h = harness(witness.route), input = props(data(witness));
    for (const open of [false, true, false, true, false]) {
      h.render(input); const button = h.nodes().find((n) => n.type === 'button');
      assert.equal(button.props.type, 'button'); assert.equal(button.props['aria-expanded'], open, witness.key);
      assert.match(button.props['aria-label'], /Annuities|Prospectus/);
      assert.equal(h.nodes().find((n) => n.type === 'li').props.className.includes('open'), open);
      assert.equal(button.props.href, undefined); button.props.onClick();
    }
  }
});
test('all 37 Default consumers retain authored fields, link order, metadata and rendering identity', () => {
  const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8')); let count = 0;
  for (const [route, entry] of Object.entries(content.routes)) for (const component of entry.components.filter((c) => c.componentName === 'AllianzLegacySidebar')) {
    count++; const input = structuredClone(component), before = JSON.stringify(input), h = harness(route), root = h.render(input);
    const safeLink = h.load(path.join(sourceRoot, 'lib/allianz-fields.ts')).safeLink;
    const items = (groups) => groups.flatMap((g) => [g, ...items(g.children?.results ?? [])]);
    const expected = items(input.fields.data.datasource.primaryNav?.targetItems ?? []), links = h.nodes().filter((n) => n.type === 'sdk-link');
    assert.equal(links.length, expected.length, route);
    links.forEach((link, i) => { assert.deepEqual(link.props.field, safeLink(expected[i].link?.jsonValue)); assert.equal(link.props.children.props.field, expected[i].title?.jsonValue); });
    assert.equal(root.props.id, input.params.RenderingIdentifier); assert.equal(JSON.stringify(input), before);
  }
  assert.equal(count, 37);
});
test('real SDK preserves current class, authored attributes, editing metadata and cleared fields', () => {
  const witness = witnesses.find((w) => w.key === 'route01');
  const { Default } = loader({ 'next/navigation': { usePathname: () => '/rewritten' } })(componentFile), datasource = data(witness);
  const current = datasource.primaryNav.targetItems[0].children.results[1].children.results[1];
  current.link.jsonValue.value.class = 'authored-link'; const before = JSON.stringify(datasource);
  const render = (editing) => renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page: page(witness.route, editing), api: {}, componentMap: new Map(), loadImportMap: async () => ({}) }, React.createElement(Default, props(datasource))));
  assert.match(render(false), /class="authored-link current"[^>]*aria-current="page"|aria-current="page"[^>]*class="authored-link current"/);
  const editing = render(true); assert.ok(editing.includes('test-title')); assert.ok(editing.includes('test-link')); assert.equal(JSON.stringify(datasource), before);
  current.title.jsonValue.value = ''; current.link.jsonValue.value.href = '';
  const h = harness(witness.route); h.render(props(datasource));
  const empty = h.nodes().filter((n) => n.type === 'sdk-link').find((n) => n.props.field.metadata.itemId === current.id);
  assert.equal(empty.props.field, current.link.jsonValue); assert.equal(empty.props.children.props.field, current.title.jsonValue); assert.equal(empty.props['aria-current'], undefined);
});
test('empty and missing data retain an empty sidebar and the Default export', () => {
  const h = harness('/empty');
  for (const input of [{ params: {} }, props({}), props({ primaryNav: { targetItems: [] } })]) {
    assert.equal(h.render(input).type, 'nav'); assert.equal(h.nodes().filter((n) => n.type === 'sdk-link' || n.type === 'button').length, 0);
    assert.equal(h.nodes().find((n) => n.type === 'ul').props.className, 'nav navbar-nav left-nav');
  }
  assert.deepEqual(Object.keys(h.load(componentFile)), ['Default']);
});
