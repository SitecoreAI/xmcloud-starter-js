/** Offline source, component-handler and real-SDK checks; human browser QA is separate. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const sourceRoot = fileURLToPath(new URL('../..', import.meta.url));
const appRoot = path.resolve(sourceRoot, '..');
const read = (filename) => fs.readFileSync(path.join(appRoot, filename), 'utf8');
const sourceCss = postcss.parse(read('public/allianz-assets/source-style.css'));
const overrides = postcss.parse(read('src/assets/allianz-native-overrides.css'));
const legacyCss = postcss.parse(read('public/allianz-legacy-assets/legacy-style.css'));

function loader(mocks = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      let local;
      if (specifier.startsWith('.')) local = path.resolve(path.dirname(filename), specifier);
      if (/^(components|lib)\//.test(specifier)) local = path.join(sourceRoot, specifier);
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return (legacy = false) => load(path.join(sourceRoot, legacy
    ? 'components/allianz-legacy-footer/AllianzLegacyFooter.tsx'
    : 'components/allianz-footer/AllianzFooter.tsx')).Default;
}
function field(id, type, value) {
  return { jsonValue: { value, metadata: { fieldId: id, fieldType: type, itemId: 'footer-native-datasource' } } };
}
const text = (id, value = '') => field(id, 'Single-Line Text', value);
const link = (id, href = '') => field(id, 'General Link', { href });
const group = (id, title) => ({ id, title: text(`${id}-title`, title), link: link(`${id}-link`), children: { results: [
  { id: `${id}-child`, title: text(`${id}-child-title`), link: link(`${id}-child-link`) },
] } });
const data = {
  primaryNav: { targetItems: [group('products', 'Products'), group('about', 'About')] },
  body: field('body', 'Rich Text', ''), copyright: text('copyright'),
  utilityNav: { targetItems: [{ id: 'utility', title: text('utility-title'), link: link('utility-link') }] },
  socialNav: { targetItems: [{ id: 'social', title: text('social-title', 'Social'), link: link('social-link'), icon: field('social-icon', 'Image', {}) }] },
};
const props = (datasource = data) => ({ params: {}, fields: { data: { datasource } } });
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  return React.isValidElement(node) ? [node, ...flatten(node.props.children)] : [];
}
function harness(legacy = false, isEditing = false, datasource = data) {
  const hooks = [];
  let cursor = 0, root, width = 703;
  const fakeReact = {
    ...React, useId: () => ':footer-flow:',
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    useState(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial;
      return [hooks[slot], (next) => { hooks[slot] = typeof next === 'function' ? next(hooks[slot]) : next; }];
    },
  };
  const component = loader({
    react: fakeReact,
    '@sitecore-content-sdk/nextjs': { ...sdk, Text: 'sdk-text', Link: 'sdk-link', RichText: 'sdk-rich', useSitecore: () => ({ page: { mode: { isEditing } } }) },
  })(legacy);
  return {
    resize(next) { width = next; },
    render(override = props(datasource)) {
      cursor = 0;
      const previous = globalThis.window;
      globalThis.window = { matchMedia(query) { assert.equal(query, '(max-width: 703px)'); return { matches: width <= 703 }; } };
      try { root = component(override); } finally { globalThis.window = previous; }
      return flatten(root);
    },
    one(predicate) { const found = flatten(root).find(predicate); assert.ok(found, 'expected footer control exists'); return found; },
    toggle(id) { return this.one((node) => node.type === 'button' && node.props['aria-controls']?.endsWith(`-${id}`)); },
    list(id) { return this.one((node) => node.type === 'ul' && node.props.id?.endsWith(`-${id}`)); },
  };
}
function render(component, datasource, isEditing) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianzlife', layout: { sitecore: { context: {}, route: { name: 'Footer test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component, props(datasource))));
}
function metadataIds(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId).sort();
}
function rule(root, selector, media) {
  let found;
  root.walkRules((node) => {
    if (node.selector.split(',').map((part) => part.trim()).includes(selector) &&
      (media === undefined || (media === null ? node.parent.type === 'root' : node.parent.params === media))) found = node;
  });
  assert.ok(found, `source rule exists: ${selector} / ${media ?? 'any'}`);
  return found;
}
const value = (node, property) => node.nodes.find((entry) => entry.prop === property)?.value;

test('modern footer opens and closes individual groups through native button activation', () => {
  const h = harness(); h.render();
  for (const id of ['products', 'about']) {
    assert.equal(h.toggle(id).props.type, 'button', 'Enter and Space receive browser-native click semantics');
    assert.equal(h.toggle(id).props.onKeyDown, undefined, 'no duplicate custom Enter/Space activation');
    assert.equal(h.toggle(id).props['aria-expanded'], false);
    assert.equal(h.toggle(id).props['aria-label'], data.primaryNav.targetItems.find((group) => group.id === id).title.jsonValue.value, 'source title names the button without reading the decorative glyph');
    assert.equal(h.list(id).props.hidden, true, 'collapsed links are removed from keyboard navigation');
    assert.equal(h.toggle(id).props['aria-controls'], h.list(id).props.id);
  }
  h.toggle('products').props.onClick(); h.render();
  assert.equal(h.list('products').props.hidden, false);
  assert.equal(h.list('about').props.hidden, true);
  h.toggle('about').props.onClick(); h.render();
  assert.equal(h.list('products').props.hidden, false, 'the second disclosure does not close the first');
  h.toggle('products').props.onClick(); h.render();
  assert.equal(h.list('products').props.hidden, true);
  assert.equal(h.list('about').props.hidden, false);
  h.toggle('products').props.onClick(); h.render();
  assert.equal(h.list('products').props.hidden, false, 'a collapsed group can reopen');
});

test('modern footer Escape closes its group and returns focus to that group button', () => {
  const h = harness(); h.render();
  for (const id of ['products', 'about']) { h.toggle(id).props.onClick(); h.render(); }
  let prevented = false, focused = false;
  h.one((node) => node.type === 'div' && node.key === 'products').props.onKeyDown({
    key: 'Escape', preventDefault() { prevented = true; }, currentTarget: { querySelector: () => ({ focus() { focused = true; } }) },
  });
  h.render();
  assert.equal(prevented, true); assert.equal(focused, true);
  assert.equal(h.toggle('products').props['aria-expanded'], false);
  assert.equal(h.list('about').props.hidden, false);
});

test('modern footer uses the source 703/704 transition and retains desktop heading spans', () => {
  const h = harness(); h.render();
  assert.equal(h.list('products').props.hidden, true);
  h.resize(704);
  const desktop = h.render();
  assert.equal(desktop.filter((node) => node.type === 'button').length, 0);
  assert.equal(h.list('products').props.hidden, false);
  assert.equal(h.list('about').props.hidden, false);
  for (const id of ['products', 'about']) {
    const title = h.one((node) => node.type === 'sdk-text' && node.props.field === data.primaryNav.targetItems.find((group) => group.id === id).title.jsonValue);
    assert.equal(title.props.tag, 'span');
    assert.match(title.props.className, /c-footer__navigation-headline.*c-icon c-icon--chevron-down/);
  }
  h.resize(703); h.render();
  assert.equal(h.list('products').props.hidden, true, 'desktop visibility does not overwrite mobile disclosure state');
});

test('modern footer listens for the exact source breakpoint and removes its listener', () => {
  let subscribe;
  const component = loader({ react: { ...React, useId: () => ':resize:', useState: (initial) => [initial, () => {}], useSyncExternalStore: (listener, _snapshot, server) => { subscribe = listener; return server(); } }, '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: false } } }) } })();
  component(props());
  const events = [], callback = () => {};
  const previous = globalThis.window;
  globalThis.window = { matchMedia(query) { assert.equal(query, '(max-width: 703px)'); return {
    addEventListener: (event, fn) => events.push(['add', event, fn]), removeEventListener: (event, fn) => events.push(['remove', event, fn]),
  }; } };
  try { const unsubscribe = subscribe(callback); unsubscribe(); } finally { globalThis.window = previous; }
  assert.deepEqual(events, [['add', 'change', callback], ['remove', 'change', callback]]);
});

test('modern source mobile dimensions and scoped reveal rule retain the 703px boundary', () => {
  const recovered = rule(sourceCss, '.c-footer__navigation-list', '(max-width:703px)');
  assert.equal(value(recovered, 'display'), 'none');
  const reveal = rule(overrides, '.allianz-modern .c-footer .c-footer__navigation-list:not([hidden])', '(max-width: 703px)');
  assert.equal(value(reveal, 'display'), 'block');
  const headline = rule(sourceCss, '.c-footer__navigation-headline', '(max-width:703px)');
  assert.equal(value(headline, 'padding'), '16px');
  assert.equal(value(headline, 'font-size'), '1.25rem');
  const button = rule(overrides, '.allianz-modern .c-footer button.c-footer__navigation-headline', '(max-width: 703px)');
  for (const property of ['background', 'border-bottom']) assert.equal(value(button, property), value(headline, property));
  assert.equal(value(button, 'color'), value(rule(sourceCss, '.c-footer__navigation-headline', null), 'color'));
  assert.equal(value(button, 'border-radius'), '0');
  assert.equal(value(rule(sourceCss, '.c-icon--chevron-down:before'), 'content'), '"\\e90a"');
  assert.equal(value(rule(overrides, '.allianz-modern .c-footer button.c-footer__navigation-headline[aria-expanded="true"]:before'), 'transform'), 'rotate(180deg)');
});

test('modern editing reveals mobile collections without interaction and retains native field objects', () => {
  const before = JSON.stringify(data);
  const h = harness(false, true);
  const nodes = h.render();
  assert.equal(nodes.filter((node) => node.type === 'button').length, 0);
  for (const id of ['products', 'about']) assert.equal(h.list(id).props.hidden, false);
  for (const group of data.primaryNav.targetItems) {
    assert.ok(nodes.some((node) => node.props.field === group.title.jsonValue));
    assert.ok(nodes.some((node) => node.props.field === group.children.results[0].link.jsonValue));
  }
  const html = render(loader()(), data, true);
  assert.deepEqual(metadataIds(html), ['products-title', 'products-child-title', 'products-child-link', 'about-title', 'about-child-title', 'about-child-link', 'body', 'copyright', 'utility-title', 'utility-link', 'social-link', 'social-icon'].sort());
  assert.match(html, /\[No text in field\]/);
  assert.match(html, /scEmptyImage/);
  assert.doesNotMatch(html, /href="\/"/);
  assert.equal(JSON.stringify(data), before);
});

test('modern native fixture retains source desktop headings, navigation classes and data order', () => {
  const native = JSON.parse(read('content/native-content.json')).shared.footer.fields.data.datasource;
  const before = JSON.stringify(native);
  const html = render(loader()(), native, false);
  assert.deepEqual([...html.matchAll(/<span class="c-heading c-footer__navigation-headline c-heading--subsection-xsmall c-icon c-icon--chevron-down">([^<]+)<\/span>/g)].map((match) => match[1]), native.primaryNav.targetItems.map((group) => group.title.jsonValue.value));
  assert.equal((html.match(/class="c-footer__navigation-list"/g) || []).length, native.primaryNav.targetItems.length);
  assert.equal((html.match(/class="c-footer__navigation-item"/g) || []).length, native.primaryNav.targetItems.reduce((count, group) => count + group.children.results.length, 0));
  assert.doesNotMatch(html, /<button\b|\shidden=|allianz-missing-data|\[No text in field\]/);
  assert.equal(JSON.stringify(native), before);
});

test('legacy footer restores recovered group classes in source order for both native fixtures', () => {
  const fixture = JSON.parse(read('content/native-content.json'));
  const expected = {
    'allianz-life': ['products', 'about', 'customer-service', 'related-sites'],
    'new-york': ['annuities', 'retirement-&-planning-tools', 'about', 'customer-service', 'related-sites'],
  };
  for (const [family, classes] of Object.entries(expected)) {
    const native = fixture.shared.legacyShared[family].footer.fields.data.datasource;
    const h = harness(true, false, native);
    assert.deepEqual(h.render().filter((node) => node.type === 'li' && node.props.className?.startsWith('col-sm-2')).map((node) => node.props.className), classes.map((name) => `col-sm-2 ${name}`));
    const html = render(loader()(true), native, false);
    assert.deepEqual([...html.matchAll(/<li class="col-sm-2 ([^"]+)"/g)].map((match) => match[1].replaceAll('&amp;', '&')), classes);
    assert.doesNotMatch(html, /allianz-missing-data|\[No text in field\]/);
  }
});

test('legacy source category hiding remains <=767 and the desktop list remains visible >=768', () => {
  for (const name of ['about', 'annuities', 'life-insurance', 'retirement', 'retirement-planning']) {
    assert.equal(value(rule(legacyCss, `.allianz-legacy .navbar-nav.footer-nav .${name}`, 'only screen and (max-width:767px)'), 'display'), 'none');
  }
  assert.equal(value(rule(legacyCss, '.allianz-legacy .footer-nav .navbar-nav .dropdown-menu', '(min-width:768px)'), 'display'), 'block');
  assert.equal(value(rule(legacyCss, '.allianz-legacy .visible-xs', '(max-width:767px)'), 'display'), 'block');
  const editing = rule(overrides, '.allianz-legacy .allianz-legacy-footer[data-allianz-editing="true"] .navbar-nav.footer-nav .dropdown-menu > li', '(max-width: 767px)');
  assert.equal(value(editing, 'display'), 'block');
});

test('legacy More button retains native keyboard activation and repeatable source open-class behavior', () => {
  const h = harness(true); h.render();
  const toggle = () => h.one((node) => node.type === 'button');
  assert.equal(toggle().props.type, 'button');
  assert.equal(toggle().props['aria-expanded'], false);
  assert.equal(toggle().props['aria-controls'], h.one((node) => node.type === 'ul' && node.props.className === 'dropdown-menu').props.id);
  for (const expanded of [true, false, true]) {
    toggle().props.onClick(); h.render();
    assert.equal(toggle().props['aria-expanded'], expanded);
    assert.equal(h.one((node) => node.type === 'li' && node.props.className?.startsWith('dropdown')).props.className.includes('open'), expanded);
  }
});

test('legacy editing retains cleared heading links and opens the source mobile menu', () => {
  const native = { primaryNav: { targetItems: [group('cleared', '')] }, copyright: text('copyright') };
  const before = JSON.stringify(native);
  const h = harness(true, true, native);
  const nodes = h.render();
  assert.equal(h.one((node) => node.type === 'footer').props['data-allianz-editing'], true);
  assert.equal(h.one((node) => node.type === 'button').props['aria-expanded'], true);
  assert.ok(nodes.some((node) => node.type === 'sdk-link' && node.props.field === native.primaryNav.targetItems[0].link.jsonValue));
  const html = render(loader()(true), native, true);
  assert.deepEqual(metadataIds(html), ['cleared-title', 'cleared-link', 'cleared-child-title', 'cleared-child-link', 'copyright'].sort());
  assert.doesNotMatch(html, /href="\/"/);
  assert.equal(JSON.stringify(native), before);
});

test('both footers preserve normal-mode empty-field and missing-datasource behavior', () => {
  for (const legacy of [false, true]) {
    const component = loader()(legacy);
    const html = render(component, data, false);
    assert.deepEqual(metadataIds(html), []);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|href="\/"/);
    const missing = render(component, null, false);
    assert.match(missing, new RegExp(`Add a datasource for Allianz${legacy ? 'Legacy' : ''}Footer\\.`));
  }
});
