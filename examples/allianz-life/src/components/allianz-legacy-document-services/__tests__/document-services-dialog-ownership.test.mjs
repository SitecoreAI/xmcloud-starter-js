import assert from 'node:assert/strict';
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
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'document-services.fixture.json')));
const componentFile = path.join(here, '../AllianzLegacyDocumentServices.tsx');
const globalFile = path.join(sourceRoot, 'components/content-sdk/ServiceUnavailable.tsx');
const dialogFile = path.join(sourceRoot, 'components/content-sdk/AccessibleDialog.tsx');
const marker = 'data-allianz-local-service-dialog';
const page = (isEditing = false) => ({ mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Services', fields: {}, placeholders: {} } } } });
const field = (value) => ({ jsonValue: { value } });
const datasource = () => ({
  ...Object.fromEntries(Object.entries(fixture.fields).map(([name, value]) => [name, field(structuredClone(value))])),
  children: { results: fixture.children.map((item, i) => ({ id: `social-${i}`, heading: field(item.heading), link: field(structuredClone(item.link)) })) },
});
const props = (data = datasource()) => ({ fields: { data: { datasource: data } }, params: {}, rendering: { componentName: 'AllianzLegacyDocumentServices' } });
function sourceLoader(overrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (overrides[specifier]) return overrides[specifier];
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      const resolved = local && [local, `${local}.ts`, `${local}.tsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      return resolved && /\.tsx?$/.test(resolved) ? load(resolved) : nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const find = (tree, predicate) => { const result = nodes(tree).find(predicate); assert.ok(result, 'Expected component node'); return result; };
const load = sourceLoader({ 'next/navigation': { usePathname: () => '/test-prospectus' } });
const components = load(componentFile);
function render(Component, data = datasource(), editing = false) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: page(editing), api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, props(data))));
}

test('real SDK forwards ownership only on visitor social links that open local notices', () => {
  for (const Component of Object.values(components)) {
    const data = datasource(), before = JSON.stringify(data);
    const html = render(Component, data);
    assert.equal((html.match(/data-allianz-local-service-dialog="true"/g) || []).length, 4);
    for (const anchor of html.match(/<a\b[^>]*>/g)) {
      assert.equal(anchor.includes(`${marker}="true"`), anchor.includes('href="#service-unavailable"'));
    }
    assert.doesNotMatch(html, /href="https?:|<form|type="submit"/);
    assert.doesNotMatch(render(Component, data, true), /data-allianz-local-service-dialog/);
    data.children.results[0].link.jsonValue.value.href = '/contact-us';
    assert.equal((render(Component, data).match(/data-allianz-local-service-dialog="true"/g) || []).length, 3);
    data.children.results[0].link.jsonValue.value.href = fixture.children[0].link.href;
    assert.equal(JSON.stringify(data), before, 'Native fields and metadata are not rewritten');
  }
});

// Deterministic execution of the actual three component bodies/effects. Native Node EventTarget
// reproduces same-document listener ordering; element/focus facades are not browser or DOM QA.
function hooks() {
  let stateIndex, refIndex, effectIndex, tree;
  const states = [], refs = [], effects = [], pending = [];
  const react = { ...React,
    useId: () => 'ownership-test',
    useState: (initial) => { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], (next) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef: (initial) => { const i = refIndex++; return refs[i] ||= { current: initial }; },
    useEffect: (setup, deps) => { const i = effectIndex++; const previous = effects[i]; if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) pending.push(() => { previous?.cleanup?.(); effects[i] = { deps, cleanup: setup() }; }); },
  };
  return { react, states, refs,
    get tree() { return tree; },
    render: (Component, input, attach = () => {}) => { stateIndex = refIndex = effectIndex = 0; tree = Component(input); attach(tree); while (pending.length) pending.shift()(); return tree; },
    destroy: () => { effects.forEach((effect) => effect?.cleanup?.()); effects.length = 0; },
  };
}
function harness({ variant = 'Default', order = 'react-first' } = {}) {
  const previous = Object.fromEntries(['document', 'window', 'Node', 'HTMLElement'].map((name) => [name, globalThis[name]]));
  const document = new EventTarget(); document.body = { style: { overflow: 'auto' } };
  let rootTree;
  class Element {
    constructor(attributes = {}, withinRail = false) { this.attributes = attributes; this.withinRail = withinRail; this.isConnected = true; this.textContent = attributes.textContent || ''; }
    getAttribute(name) { return this.attributes[name] ?? null; }
    contains(target) { return Boolean(target?.withinRail); }
    closest() { return this.anchor || (/\#(?:service|demo)-unavailable$/.test(this.attributes.href || '') ? this : null); }
    focus() {
      const from = document.activeElement; document.activeElement = this;
      if (from?.withinRail && !this.withinRail && rootTree) find(rootTree, (node) => node.type === 'ul' && node.props.onBlur).props.onBlur({ currentTarget: root, relatedTarget: this });
    }
  }
  const root = new Element(), initial = new Element(); document.activeElement = initial;
  Object.assign(globalThis, { document, window: new EventTarget(), Node: Element, HTMLElement: Element });
  const rail = hooks(), global = hooks(); let modal;
  const railLoad = sourceLoader({ react: rail.react, '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: page() }) }, 'next/navigation': { usePathname: () => '/test-prospectus' } });
  const outer = railLoad(componentFile)[variant](props());
  const view = outer.type(outer.props);
  const Global = sourceLoader({ react: global.react })(globalFile).default;
  const localClose = new Element(), globalClose = new Element();
  const dialog = new Element(); dialog.querySelector = () => localClose; dialog.querySelectorAll = () => [localClose];
  const renderRail = () => { rootTree = rail.render(view.type, view.props, () => { rail.refs[0].current = root; }); };
  const renderGlobal = () => global.render(Global, {}, (tree) => { if (tree) global.refs[0].current = globalClose; });
  const commit = () => {
    renderRail(); renderGlobal();
    const notice = nodes(rootTree).find((node) => node.props?.titleId === 'ownership-test-notice');
    if (notice) {
      if (!modal) { modal = hooks(); modal.Component = sourceLoader({ react: modal.react })(dialogFile).default; }
      modal.render(modal.Component, notice.props, () => { modal.refs[0].current = dialog; });
    } else if (modal) { modal.destroy(); modal = undefined; }
  };
  const delegation = (event) => {
    const target = event.target.anchor || event.target;
    target.onClick?.({ nativeEvent: event, currentTarget: target, target: event.target,
      preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation() });
  };
  if (order === 'react-first') document.addEventListener('click', delegation);
  commit();
  if (order === 'global-first') document.addEventListener('click', delegation);
  class Click extends Event {
    constructor(target, detail) { super('click', { bubbles: true, cancelable: true }); this.origin = target; this.detail = detail; }
    get target() { return this.origin; }
  }
  const click = (target, detail = 1) => { const event = new Click(target, detail); document.dispatchEvent(event); commit(); return event; };
  const control = (panel) => {
    const node = find(rootTree, (n) => n.type === 'button' && n.props['aria-controls'] === `ownership-test-${panel}` && !n.props.className?.includes('hidden-xs'));
    const element = new Element({}, true); element.onClick = node.props.onClick; return element;
  };
  const social = (index = 0) => {
    const node = nodes(rootTree).filter((n) => n.props?.[marker] === 'true')[index]; assert.ok(node);
    const element = new Element({ href: node.props.field.value.href, [marker]: node.props[marker], textContent: fixture.children[index].heading }, true);
    element.onClick = node.props.onClick; return element;
  };
  return { rail, global, document, Element, root, click, commit, control, social,
    get modal() { return modal; }, get tree() { return rootTree; }, localClose, globalClose,
    dialogs: () => [global.tree, modal?.tree].flatMap(nodes).filter((n) => n.props?.role === 'dialog' && n.props['aria-modal'] === 'true'),
    dismiss: (method = 'Escape') => {
      if (method === 'Close') find(modal.tree, (n) => n.type === 'button').props.onClick();
      else if (method === 'backdrop') { const backdrop = {}; modal.tree.props.onClick({ target: backdrop, currentTarget: backdrop }); }
      else find(modal.tree, (n) => n.props?.role === 'dialog').props.onKeyDown({ key: 'Escape', shiftKey: false, preventDefault() {} });
      commit();
    },
    destroy: () => { modal?.destroy(); rail.destroy(); global.destroy(); document.removeEventListener('click', delegation); for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[name]; else globalThis[name] = value; } },
  };
}

test('control reproduces duplicate dialogs when ownership marker is absent: stopPropagation does not stop sibling document listeners', () => {
  const h = harness();
  try {
    h.click(h.control('social'));
    const social = h.social(); delete social.attributes[marker];
    const event = h.click(social);
    assert.equal(event.defaultPrevented, true);
    assert.equal(h.dialogs().length, 2, 'Proves the previous isolation mechanism is insufficient');
  } finally { h.destroy(); }
});

for (const variant of ['Default', 'LoginWidget']) for (const order of ['react-first', 'global-first']) {
  test(`${variant}: pointer and Enter-generated clicks open only one local dialog in ${order} order`, () => {
    const h = harness({ variant, order });
    try {
      const trigger = h.control('social'); trigger.focus(); h.click(trigger, 0);
      for (let i = 0; i < 8; i++) {
        const social = h.social(i % 4); social.focus();
        const nested = new h.Element(); nested.anchor = social;
        const event = h.click(i % 2 ? nested : social, i % 2 ? 0 : 1);
        assert.equal(event.defaultPrevented, true, 'Both pointer and keyboard click default navigation is cancelled');
        assert.equal(h.global.states[0], ''); assert.equal(h.dialogs().length, 1);
        assert.equal(h.rail.states[1], fixture.children[i % 4].heading);
        assert.equal(h.document.activeElement, h.localClose); assert.equal(h.document.body.style.overflow, 'hidden');
        assert.equal(h.rail.states[0], 'social', 'Moving focus into the dialog keeps the return target visible');
        h.click(social, i % 2); assert.equal(h.dialogs().length, 1, 'Repeated activation never adds another modal');
        const dialog = find(h.modal.tree, (n) => n.props?.role === 'dialog');
        for (const shiftKey of [false, true]) {
          let prevented = false; dialog.props.onKeyDown({ key: 'Tab', shiftKey, preventDefault() { prevented = true; } });
          assert.equal(prevented, true); assert.equal(h.document.activeElement, h.localClose);
        }
        h.dismiss(['Escape', 'Close', 'backdrop'][i % 3]);
        assert.equal(h.dialogs().length, 0); assert.equal(h.document.activeElement, social);
        assert.equal(h.document.body.style.overflow, 'auto'); assert.equal(h.rail.states[0], 'social');
      }
      let prevented = false;
      find(h.tree, (n) => n.type === 'ul' && n.props.onKeyDown).props.onKeyDown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() {} }); h.commit();
      assert.equal(prevented, true); assert.equal(h.rail.states[0], null); assert.equal(h.document.activeElement, trigger);
      assert.ok(nodes(h.tree).filter((n) => n.props?.['aria-controls']).every((n) => n.type === 'button' && n.props.type === 'button' && !n.props.onKeyDown));
    } finally { h.destroy(); }
  });
}

test('ordinary site-wide unavailable links, including contact links, still use the global dialog and restore focus', () => {
  const h = harness();
  try {
    for (const href of ['#service-unavailable', '/page#demo-unavailable', '/page#service-unavailable']) for (const detail of [1, 0]) {
      const link = new h.Element({ href, textContent: 'Ordinary service' }); link.focus();
      const nested = new h.Element(); nested.anchor = link;
      assert.equal(h.click(nested, detail).defaultPrevented, true);
      assert.equal(h.dialogs().length, 1); assert.equal(h.rail.states[1], ''); assert.equal(h.global.states[0], 'Ordinary service');
      assert.equal(h.document.activeElement, h.globalClose);
      const dialog = find(h.global.tree, (n) => n.props?.role === 'dialog');
      dialog.props.onKeyDown({ key: 'Tab', preventDefault() {} }); assert.equal(h.document.activeElement, h.globalClose);
      if (detail) find(h.global.tree, (n) => n.type === 'button').props.onClick();
      else dialog.props.onKeyDown({ key: 'Escape' });
      h.commit(); assert.equal(h.dialogs().length, 0); assert.equal(h.document.activeElement, link);
    }
    for (const value of [undefined, 'false', '']) {
      const link = new h.Element({ href: '#service-unavailable', [marker]: value, 'aria-label': 'Fallback label' });
      h.click(link); assert.equal(h.global.states[0], 'Fallback label');
      find(h.global.tree, (n) => n.type === 'button').props.onClick(); h.commit();
    }
    const normal = new h.Element({ href: '/contact-us', textContent: 'Contact Us' });
    assert.equal(h.click(normal).defaultPrevented, false); assert.equal(h.dialogs().length, 0);
  } finally { h.destroy(); }
});

test('account actions remain local, inert and reversible with the global listener mounted', () => {
  const h = harness({ variant: 'LoginWidget' });
  try {
    h.click(h.control('account'), 0);
    for (const className of ['btn-green', 'allianz-document-services-link', 'allianz-document-register']) {
      const node = find(h.tree, (n) => n.type === 'button' && n.props.className?.includes(className));
      const control = new h.Element({}, true); control.onClick = node.props.onClick;
      assert.equal(h.click(control, 0).defaultPrevented, true);
      assert.equal(h.dialogs().length, 1); assert.equal(h.global.states[0], ''); assert.equal(h.rail.states[0], 'account');
      h.dismiss('Close'); assert.equal(h.document.activeElement, control); assert.equal(h.rail.states[0], 'account');
    }
    for (const input of nodes(h.tree).filter((n) => n.type === 'input')) { assert.equal(input.props.disabled, true); assert.equal(input.props.name, undefined); }
    assert.equal(nodes(h.tree).filter((n) => n.type === 'form' || n.props?.type === 'submit').length, 0);
  } finally { h.destroy(); }
});
