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
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
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
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const componentFile = path.join(here, '../AllianzLegacyDocumentServices.tsx');
const propsFile = path.join(here, '../allianz-legacy-document-services.props.ts');
const load = sourceLoader({ 'next/navigation': { usePathname: () => '/test-prospectus' } });
const components = load(componentFile);
const helpers = load(propsFile);
const fixture = JSON.parse(fs.readFileSync(path.join(here, 'document-services.fixture.json')));
const proof = JSON.parse(fs.readFileSync(path.join(here, 'document-services.source-proof.json')));
const page = (isEditing) => ({ mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Services', fields: {}, placeholders: {} } } } });
function field(name, value, item = 'test-only-services') {
  return { jsonValue: { value, metadata: { itemId: item, fieldId: `test-only-${name}`, fieldType: typeof value === 'object' ? 'General Link' : name === 'socialBody' ? 'Multi-Line Text' : 'Single-Line Text' } } };
}
function datasource() {
  return { ...Object.fromEntries(Object.entries(fixture.fields).map(([k, v]) => [k, field(k, structuredClone(v))])), children: { results: fixture.children.map((item, i) => ({ id: `test-only-social-${i}`, heading: field('heading', item.heading, `test-only-social-${i}`), link: field('link', structuredClone(item.link), `test-only-social-${i}`) })) } };
}
function props(data = datasource(), editing = false) { return { fields: data === null ? undefined : { data: { datasource: data } }, params: {}, rendering: { componentName: 'AllianzLegacyDocumentServices' }, page: page(editing) }; }
function render(Component, data = datasource(), editing = false) {
  const input = props(data, editing);
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page: input.page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) }, React.createElement(Component, input)));
}
const count = (html, re) => [...html.matchAll(re)].length;
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map((m) => JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('source proof pins nine routes as the exact four empty and five login groups', () => {
  assert.deepEqual(proof.groups.map((g) => g.routes.length), [4, 5]);
  assert.deepEqual(proof.groups[0].routes, ['route19', 'route20', 'route21', 'route25']);
  assert.deepEqual(proof.groups[1].routes, ['route26', 'route27', 'route28', 'route29', 'route30']);
  for (const group of proof.groups) {
    const bytes = fs.readFileSync(path.join(here, group.safeFixtureFile));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), group.safeFixtureSha256);
    assert.equal(proof.routes.filter((r) => group.routes.includes(r.key)).every((r) => r.sourceRightRailSha256 === group.rawSourceRightRailSha256), true);
    assert.doesNotMatch(bytes.toString(), /data-action=|onsubmit=|auth\.allianzlife|\/SPA\/|name="LoginWidget|type="hidden"/);
  }
});

test('source labels, ordered network links and code-owned credential placeholders match the source fixture', () => {
  const full = fs.readFileSync(path.join(here, proof.groups[1].safeFixtureFile), 'utf8');
  for (const [name, value] of Object.entries(fixture.fields)) if (typeof value === 'string') {
    if (name === 'loginLabel') assert.ok(full.includes(`value="${value}"`));
    else assert.ok(full.includes(value), `${name}: ${value}`);
  }
  let previous = -1;
  for (const child of fixture.children) {
    const current = full.indexOf(`href="${child.link.href}"`); assert.ok(current > previous); previous = current;
    assert.ok(full.includes(`class="${child.sourceClass}"`));
  }
  assert.equal(fixture.fields.contactLink.href, '/contact-us');
});

test('real SDK visitor rendering keeps source structural classes and a single right-nav list', () => {
  for (const Component of Object.values(components)) {
    const html = render(Component);
    assert.equal(count(html, /class="nav navbar-nav right-nav /g), 1);
    for (const cls of ['right-column-flex-space', 'dropdown-box', 'dropdown-content', 'social-follow', 'contact-us', 'social-media-xs']) assert.ok(html.includes(cls));
    assert.match(html, />Login \/ Register</); assert.match(html, />Social Media</); assert.match(html, />Social</);
    assert.match(html, /href="\/contact-us"/);
    assert.equal(count(html, /href="#service-unavailable"/g), 4);
    assert.equal(count(html, /aria-expanded="false"/g), 3);
    assert.equal(count(html, /class="dropdown-menu dropdown-menu-right" hidden=""/g), 2);
    assert.match(html, /Connect with Allianz Life/); assert.match(html, /Share your thoughts and get the latest news\./);
    let previous = -1;
    for (const child of fixture.children) { const index = html.indexOf(`class="${child.sourceClass}"`); assert.ok(index > previous); previous = index; }
  }
});

test('Default deliberately has no login inputs, while LoginWidget has only disabled nameless controls', () => {
  const empty = render(components.Default); assert.doesNotMatch(empty, /<input|Username\*|Password\*|Remember me|Forgot username/);
  const full = render(components.LoginWidget);
  assert.equal(count(full, /<input\b/g), 3);
  for (const input of full.match(/<input[^>]+>/g)) { assert.match(input, /disabled=""/); assert.doesNotMatch(input, /\sname=|\svalue=|\son[a-z]+=/i); }
  for (const html of [empty, full]) assert.doesNotMatch(html, /<form|\baction=|formAction|type="submit"|type="hidden"|\/SPA\/|auth\.allianzlife|https:\/\/www\.(facebook|twitter|linkedin|youtube)/);
});

test('real SDK editing retains surrounding field metadata while account control copy is code-owned', () => {
  const data = datasource(); const before = JSON.stringify(data);
  const html = render(components.LoginWidget, data, true); const markers = metadata(html);
  for (const [name, fld] of Object.entries(data).filter(([name]) => name !== 'children' && !(name in helpers.DOCUMENT_LOGIN_COPY))) {
    assert.ok(markers.some((m) => JSON.stringify(m) === JSON.stringify(fld.jsonValue.metadata)), name);
  }
  for (const item of data.children.results) for (const name of ['heading', 'link']) {
    assert.ok(markers.some((m) => JSON.stringify(m) === JSON.stringify(item[name].jsonValue.metadata)), `${item.id}.${name}`);
  }
  for (const item of fixture.children) assert.ok(html.includes(item.link.href));
  assert.equal(count(html, /class="dropdown-menu dropdown-menu-right" hidden=/g), 0);
  assert.equal(JSON.stringify(data), before);
});

test('named and fieldCollection query representations produce identical output and explicit clears win', () => {
  const named = datasource();
  const native = { fieldCollection: Object.entries(named).filter(([k]) => k !== 'children').map(([name, f]) => ({ name: name.toUpperCase(), jsonValue: f.jsonValue })), children: { results: named.children.results.map((item) => ({ id: item.id, fieldCollection: ['heading', 'link'].map((name) => ({ name, jsonValue: item[name].jsonValue })) })) } };
  for (const editing of [false, true]) assert.equal(render(components.LoginWidget, native, editing), render(components.LoginWidget, named, editing));
  for (const v of [undefined, { jsonValue: undefined }, field('socialHeading', '')]) {
    const direct = { ...native, socialHeading: v };
    assert.doesNotMatch(render(components.LoginWidget, direct), /Connect with Allianz Life/);
  }
});

test('clear and restore does not introduce fixture fallback or mutate author fields', () => {
  const data = datasource(); const original = structuredClone(data); const restored = render(components.LoginWidget, data);
  for (const name of Object.keys(fixture.fields)) data[name].jsonValue.value = name === 'contactLink' ? { href: '' } : '';
  for (const item of data.children.results) { item.heading.jsonValue.value = ''; item.link.jsonValue.value = { href: '' }; }
  const before = JSON.stringify(data); const normal = render(components.LoginWidget, data);
  assert.doesNotMatch(normal, /Login \/ Register|Connect with|Contact Us|Social Media|href=|<input/);
  const editing = render(components.LoginWidget, data, true); const markers = metadata(editing);
  assert.equal(markers.length, 24 - Object.keys(helpers.DOCUMENT_LOGIN_COPY).length);
  assert.equal(JSON.stringify(data), before);
  Object.assign(data, original); assert.equal(render(components.LoginWidget, data), restored);
  assert.match(render(components.Default, null), /Add a datasource for AllianzLegacyDocumentServices/);
});

test('unsafe social URLs stay local and unknown visual identities remain visible text', () => {
  for (const href of ['javascript:alert(1)', 'https://example.invalid', '//evil.invalid', 'https://www.twitter.com/allianzlife?extra=1']) {
    const data = datasource(); data.children.results[0].link.jsonValue.value.href = href;
    assert.equal(helpers.documentSocialClass(href), undefined);
    const output = render(components.Default, data);
    assert.doesNotMatch(output, /href="(?:javascript:|https:|\/\/)/);
  }
});

test('local source sprite is unchanged, and all CSS selectors are confined to the new component', () => {
  const appRoot = path.resolve(sourceRoot, '..');
  const sprite = fs.readFileSync(path.join(appRoot, 'public/allianz-legacy-assets/document-services-social-sprite.png'));
  assert.equal(createHash('sha256').update(sprite).digest('hex'), '4c63258a51742d70d173a28436cd7b46c4556e1e9992f114b8bd3d7e96dedd0f');
  const chevron = fs.readFileSync(path.join(appRoot, 'public/allianz-legacy-assets/document-services-link-chevron.png'));
  assert.equal(createHash('sha256').update(chevron).digest('hex'), 'd3de39162e6cfca6bc2c301f63f5f75fdad5cf1e9ceeadc222acb62253d2ae74');
  const css = fs.readFileSync(path.join(here, '../AllianzLegacyDocumentServices.css'), 'utf8');
  assert.match(css, /url\('\/allianz-legacy-assets\/document-services-social-sprite\.png'\)/);
  const imageRule = css.split('}').find((rule) => rule.includes("url('/allianz-legacy-assets/document-services-social-sprite.png')"));
  assert.match(imageRule, /:not\(\.allianz-legacy-document-services--editing\)/, 'Image-bearing rule must never match editing mode');
  assert.doesNotMatch(css, /https?:|data:/);
  for (const line of css.split('\n').filter((line) => line.trim().startsWith('.allianz-legacy '))) assert.ok(line.includes('.allianz-legacy-document-services'));
});

/** Calls actual component event handlers with deterministic hooks. This is not a browser/DOM simulation. */
function interactionHarness() {
  let stateIndex = 0, refIndex = 0, effectIndex = 0;
  const states = [], refs = [], effects = [], pending = [];
  const listeners = { document: new Map(), window: new Map() };
  class MockNode {}
  const previous = { Node: globalThis.Node, document: globalThis.document, window: globalThis.window };
  globalThis.Node = MockNode;
  for (const name of ['document', 'window']) globalThis[name] = {
    addEventListener: (key, fn) => { const set = listeners[name].get(key) || new Set(); set.add(fn); listeners[name].set(key, set); },
    removeEventListener: (key, fn) => listeners[name].get(key)?.delete(fn),
  };
  const hookReact = { ...React,
    useId: () => 'test-only-instance',
    useState: (initial) => { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef: (initial) => { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useEffect: (setup, deps) => { const index = effectIndex++; const prior = effects[index]; if (!prior || deps.some((v, i) => !Object.is(v, prior.deps[i]))) pending.push(() => { prior?.cleanup?.(); effects[index] = { deps, cleanup: setup() }; }); },
  };
  const modules = sourceLoader({ react: hookReact, '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: page(false) }) }, 'next/navigation': { usePathname: () => '/test-prospectus' } });
  const C = modules(componentFile).LoginWidget;
  const outer = C(props()); const view = outer.type(outer.props); let tree;
  const rerender = () => { stateIndex = refIndex = effectIndex = 0; tree = view.type(view.props); while (pending.length) pending.shift()(); return tree; };
  const nodes = () => { const found = []; function walk(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk); found.push(n); walk(n.props?.children); } walk(tree); return found; };
  rerender(); refs[0].current = { contains: (target) => Boolean(target?.inside) };
  return { rerender, nodes, states, refs, listeners, MockNode,
    find: (predicate) => { const node = nodes().find(predicate); assert.ok(node, 'Expected rendered node'); return node; },
    close: () => { for (const e of effects) e.cleanup?.(); for (const name of Object.keys(previous)) { if (previous[name] === undefined) delete globalThis[name]; else globalThis[name] = previous[name]; } },
  };
}

test('actual handlers support repeated disclosure toggles, mutual exclusion, Escape focus restoration and outside dismissal', () => {
  const h = interactionHarness();
  try {
    let focusCount = 0; const control = { focus: () => focusCount++ };
    const trigger = (panel) => h.find((n) => n.type === 'button' && n.props['aria-controls'] === `test-only-instance-${panel}`);
    const root = () => h.find((n) => n.type === 'ul' && n.props.onKeyDown);
    for (let i = 0; i < 8; i++) {
      trigger('account').props.onClick({ currentTarget: control }); h.rerender(); assert.equal(h.states[0], 'account');
      assert.equal(trigger('account').props['aria-expanded'], true);
      trigger('account').props.onClick({ currentTarget: control }); h.rerender(); assert.equal(h.states[0], null);
      trigger('social').props.onClick({ currentTarget: control }); h.rerender(); assert.equal(h.states[0], 'social');
      trigger('account').props.onClick({ currentTarget: control }); h.rerender(); assert.equal(h.states[0], 'account');
      let prevented = 0, stopped = 0;
      root().props.onKeyDown({ key: 'Escape', preventDefault: () => prevented++, stopPropagation: () => stopped++ }); h.rerender();
      assert.equal(h.states[0], null); assert.equal(prevented, 1); assert.equal(stopped, 1);
    }
    assert.equal(focusCount, 8);
    trigger('social').props.onClick({ currentTarget: control }); h.rerender();
    const inside = new h.MockNode(); inside.inside = true;
    for (const handler of h.listeners.document.get('pointerdown')) handler({ target: inside }); assert.equal(h.states[0], 'social');
    for (const handler of h.listeners.document.get('pointerdown')) handler({ target: new h.MockNode() }); h.rerender(); assert.equal(h.states[0], null);
    assert.equal(h.listeners.document.get('pointerdown').size, 1);
  } finally { h.close(); }
  assert.equal(h.listeners.document.get('pointerdown').size, 0);
});

test('actual handlers dismiss on Tab focus exit and history changes, and isolate repeated local account notices', () => {
  const h = interactionHarness();
  try {
    const control = { focus: () => {} };
    const trigger = () => h.find((n) => n.type === 'button' && n.props['aria-controls'] === 'test-only-instance-account');
    const root = () => h.find((n) => n.type === 'ul' && n.props.onBlur);
    trigger().props.onClick({ currentTarget: control }); h.rerender();
    root().props.onBlur({ currentTarget: h.refs[0].current, relatedTarget: { inside: true } }); assert.equal(h.states[0], 'account');
    root().props.onBlur({ currentTarget: h.refs[0].current, relatedTarget: null }); h.rerender(); assert.equal(h.states[0], null);
    for (const history of ['popstate', 'hashchange']) {
      trigger().props.onClick({ currentTarget: control }); h.rerender();
      for (const handler of h.listeners.window.get(history)) handler(); h.rerender(); assert.equal(h.states[0], null);
    }
    for (let i = 0; i < 5; i++) {
      if (!h.states[0]) { trigger().props.onClick({ currentTarget: control }); h.rerender(); }
      const login = h.find((n) => n.type === 'button' && n.props.className?.includes('btn-green'));
      let prevented = 0, stopped = 0, focused = 0;
      login.props.onClick({ preventDefault: () => prevented++, stopPropagation: () => stopped++, currentTarget: { focus: () => focused++ } }); h.rerender();
      assert.equal(h.states[1], 'Login'); assert.equal(prevented, 1); assert.equal(stopped, 1); assert.equal(focused, 1);
      root().props.onBlur({ currentTarget: h.refs[0].current, relatedTarget: null });
      for (const handler of h.listeners.document.get('pointerdown')) handler({ target: new h.MockNode() });
      assert.equal(h.states[0], 'account', 'notice interaction must not hide its focus return target');
      h.find((n) => typeof n.type === 'function' && n.props.titleId === 'test-only-instance-notice').props.onClose(); h.rerender(); assert.equal(h.states[1], '');
      assert.equal(h.listeners.document.get('pointerdown').size, 1);
    }
  } finally { h.close(); }
});

test('native button semantics do not add Enter/Space key handlers that would double-toggle', () => {
  const h = interactionHarness();
  try {
    for (const node of h.nodes().filter((n) => n.props?.['aria-controls'])) {
      assert.equal(node.type, 'button'); assert.equal(node.props.type, 'button'); assert.equal(node.props.onKeyDown, undefined);
    }
  } finally { h.close(); }
});

test('cleared individual control labels do not leave unnamed visitor buttons or contact links', () => {
  const data = datasource();
  data.contactLabel = field('contactLabel', '');
  data.socialLabel = field('socialLabel', '');
  data.mobileSocialLabel = field('mobileSocialLabel', '');
  const html = render(components.Default, data);
  assert.doesNotMatch(html, /class="contact-us"|social-media-xs|class="dropdown social-media/);
  const item = datasource(); item.children.results[0].heading = field('heading', ''); item.children.results[0].link.jsonValue.value.text = '';
  assert.doesNotMatch(render(components.Default, item), /class="social-follow-facebook"/);
});

test('source anchor-only recovery, registration and mobile-control dimensions have scoped button equivalents', () => {
  const css = fs.readFileSync(path.join(here, '../AllianzLegacyDocumentServices.css'), 'utf8');
  const rule = (className) => css.slice(css.indexOf(`.allianz-legacy .allianz-legacy-document-services .${className} {`)).split('}')[0];
  assert.match(rule('allianz-document-services-link'), /display: inline-block;[\s\S]*padding: 5px 0;/);
  assert.match(rule('allianz-document-register'), /font-weight: 300;[\s\S]*padding: 6px 12px;/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*allianz-document-register[\s\S]*border-bottom: 1px solid #d7d9da;/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*social-media-xs[\s\S]*padding: 14px 10px 15px;[\s\S]*background: #eee;[\s\S]*border-bottom: 2px solid #fff;/);
});


test('native rail query projects completeness metadata required by connected Layout', () => {
  const { parse } = require('graphql');
  const queryPath = path.resolve(sourceRoot, '../../../authoring/allianz-life/document-services/AllianzLegacyDocumentServices.graphql');
  const query = parse(fs.readFileSync(queryPath, 'utf8'));
  const operation = query.definitions.find((node) => node.kind === 'OperationDefinition');
  const datasourceNode = operation.selectionSet.selections.find((node) => node.alias?.value === 'datasource');
  const children = datasourceNode.selectionSet.selections.find((node) => node.name.value === 'children');
  assert.equal(children.arguments.find((argument) => argument.name.value === 'first').value.value, '20');
  const selected = Object.fromEntries(children.selectionSet.selections.map((node) => [node.name.value, node]));
  assert.ok(selected.total, 'Connected Layout requires a numeric children.total');
  assert.ok(selected.pageInfo?.selectionSet.selections.some((node) => node.name.value === 'hasNext'), 'Connected Layout requires children.pageInfo.hasNext');
  assert.ok(selected.results);
  for (const name of ['heading', 'link']) {
    const fieldNode = selected.results.selectionSet.selections.find((node) => node.alias?.value === name);
    assert.ok(fieldNode?.selectionSet.selections.some((node) => node.name.value === 'jsonValue'), `${name} retains native SDK metadata`);
  }
});

test('connected Layout accepts complete rail collections and rejects missing or partial metadata', () => {
  const { collectionsComplete } = load(path.join(sourceRoot, 'lib/collection-completeness.ts'));
  const rail = datasource();
  const layout = { sitecore: { route: { placeholders: { 'headless-right-rail': [
    { componentName: 'AllianzLegacyDocumentServices', fields: { data: { datasource: rail } } },
  ] } } } };
  assert.equal(collectionsComplete(layout, true), false, 'Results-only collections fail closed');
  rail.children.total = 4;
  rail.children.pageInfo = { hasNext: false };
  assert.equal(collectionsComplete(layout, true), true);
  rail.children.total = 5;
  assert.equal(collectionsComplete(layout, true), false, 'Count mismatch fails closed');
  rail.children.total = 4;
  rail.children.pageInfo.hasNext = true;
  assert.equal(collectionsComplete(layout, true), false, 'A next page fails closed');
  rail.children.pageInfo.hasNext = false;
  assert.equal(collectionsComplete(layout, true), true);
  delete rail.children.pageInfo;
  assert.equal(collectionsComplete(layout, true), false);
});


test('disabled login controls ignore CMS copy overrides while surrounding rail content stays authored', () => {
  assert.deepEqual(helpers.DOCUMENT_LOGIN_COPY, Object.fromEntries(Object.keys(helpers.DOCUMENT_LOGIN_COPY).map((name) => [name, fixture.fields[name]])));
  const data = datasource(), changed = structuredClone(data);
  for (const name of Object.keys(helpers.DOCUMENT_LOGIN_COPY)) changed[name] = field(name, 'CMS override');
  for (const editing of [false, true]) assert.equal(render(components.LoginWidget, changed, editing), render(components.LoginWidget, data, editing));
  const html = render(components.LoginWidget, changed, true);
  for (const name of Object.keys(helpers.DOCUMENT_LOGIN_COPY)) assert.ok(!metadata(html).some((entry) => entry.fieldId === `test-only-${name}`));
  assert.equal(count(html, /<input\b/g), 3);
  for (const input of html.match(/<input[^>]+>/g)) assert.match(input, /disabled=""/);
});
