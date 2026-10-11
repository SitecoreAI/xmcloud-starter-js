import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const componentMap = new Map();
function sourceLoader(overrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (overrides[specifier]) return overrides[specifier];
      if (specifier.endsWith('.css')) return {};
      if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
      if (['src/Scripts', 'components/content-sdk/SitecoreStyles', 'components/content-sdk/ConsentControls',
        'components/content-sdk/ServiceUnavailable'].includes(specifier)) return { __esModule: true, default: () => null };
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(root, specifier)
          : specifier.startsWith('src/') ? path.join(root, specifier.slice(4)) : undefined;
      const resolved = local && [local, `${local}.ts`, `${local}.tsx`, `${local}.json`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      if (resolved?.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const load = sourceLoader();
const Hero = load(path.join(here, 'AllianzLegacyHero.tsx'));
const Layout = load(path.join(root, 'Layout.tsx')).default;
componentMap.set('AllianzLegacyHero', Hero);
componentMap.set('TestRail', { Default: () => React.createElement('p', null, 'Existing rail') });
const field = (name, value, type = 'Rich Text') => ({ jsonValue: { value, metadata: { itemId: 'ny-hero-test', fieldId: `ny-${name}`, fieldType: type } } });
const data = () => ({
  heading: field('heading', 'New York heading'), body: field('body', '<p>New York body</p>'),
  desktopImage: field('desktopImage', { src: '/allianz-legacy-assets/nypublichome.jpg', width: '848', height: '350', alt: 'New York scene' }, 'Image'),
  mobileImage: field('mobileImage', { src: '/allianz-legacy-assets/nypublichome-mobile.jpg', alt: 'Mobile New York scene' }, 'Image'),
  primaryLink: field('primaryLink', { href: '/new-york/annuities', text: 'Explore annuities' }, 'General Link'),
});
const identity = (bodyId = 'page-new-york') => Object.fromEntries(Object.entries({ shellFamily: 'legacy', legacySharedKey: 'new-york', sourceBodyId: bodyId, sourceBodyClasses: `${bodyId} new-york` }).map(([key, value]) => [key, { value }]));
function page({ editing = false, fields = identity(), params = { layout: 'home' }, datasource = data(), slots = {} } = {}) {
  return { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life',
    layout: { sitecore: { context: {}, route: { name: 'New York test', fields, placeholders: {
      'headless-header': [], 'headless-footer': [], 'headless-main': [{ componentName: 'AllianzLegacyHero', uid: 'ny-hero', params,
        fields: { data: { datasource } } }], ...slots,
    } } } } };
}
function render(input, layout = false) {
  const rendering = input.layout.sitecore.route.placeholders['headless-main'][0];
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page: input, api: {}, componentMap, loadImportMap: async () => ({}) },
    React.createElement(layout ? Layout : Hero.Default, layout ? { page: input } : rendering)));
}
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((m) => JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId).filter(Boolean).sort();

test('real SDK renders the source 9/3 home composition and a 5-column right overlay', () => {
  const input = page(), before = JSON.stringify(input), html = render(input);
  for (const classes of ['row allianz-ny-home-hero', 'col-sm-9 flexslider-col', 'notepad-container', 'notepad no-product-line right col-sm-5', 'col-sm-3 login-col allianz-ny-home-login']) assert.ok(html.includes(`class="${classes}"`));
  assert.match(html, /New York heading/); assert.match(html, /<p>New York body<\/p>/);
  assert.match(html, /width="848" height="350"/); assert.match(html, /<source media="\(max-width: 767px\)" srcSet="\/allianz-legacy-assets\/nypublichome-mobile.jpg"/i);
  assert.match(html, /href="\/new-york\/annuities"/); assert.match(html, /Explore annuities/);
  assert.doesNotMatch(html, /o-stage|allianz-login|mock-login|<form\b|type="submit"/i);
  const inputs = tags(html, 'input'); assert.equal(inputs.length, 3);
  for (const inputTag of inputs) { assert.match(inputTag, /\bdisabled=""/); assert.doesNotMatch(inputTag, /\bname=|\bvalue=/); }
  assert.equal(inputs.filter((tag) => tag.includes('type="checkbox"')).length, 1);
  const buttons = tags(html, 'button'); assert.equal(buttons.length, 4);
  for (const button of buttons) assert.match(button, /type="button"/);
  assert.equal(JSON.stringify(input), before);
});

for (const editing of [false, true]) test(`native ${editing ? 'editing' : 'visitor'} fields preserve authored content and clear without fallback`, () => {
  const input = page({ editing }), html = render(input);
  if (editing) assert.deepEqual(metadata(html), ['ny-body', 'ny-desktopImage', 'ny-heading', 'ny-mobileImage', 'ny-primaryLink'].sort());
  else assert.equal(metadata(html).length, 0);
  const cleared = data(); cleared.heading.jsonValue.value = ''; cleared.body.jsonValue.value = '';
  cleared.desktopImage.jsonValue.value = {}; cleared.mobileImage.jsonValue.value = {}; cleared.primaryLink.jsonValue.value = { href: '', text: '' };
  const empty = render(page({ editing, datasource: cleared }));
  assert.doesNotMatch(empty, /New York heading|New York body|Explore annuities|nypublichome|href="\/"|<source\b/);
  if (editing) assert.deepEqual(metadata(empty), ['ny-body', 'ny-desktopImage', 'ny-heading', 'ny-mobileImage', 'ny-primaryLink'].sort());
  else assert.doesNotMatch(empty, /class="notepad |<img\b|<a\b/);
  assert.match(empty, /allianz-ny-home-login/);
});

test('home mode requires every exact native identity field and does not affect another NY route', () => {
  const cases = [page({ params: {} }), page({ params: { layout: 'stage' } }), page({ fields: identity('page-contact-us') }), page({ fields: {} })];
  for (const [key, value] of Object.entries({ shellFamily: 'modern', legacySharedKey: '', sourceBodyId: 'page-new-york-other', sourceBodyClasses: 'new-york' })) {
    const fields = identity(); fields[key].value = value; cases.push(page({ fields }));
  }
  for (const input of cases) {
    const html = render(input); assert.match(html, /class="hero-img"/); assert.match(html, /notepad no-product-line right col-sm-4/);
    assert.doesNotMatch(html, /allianz-ny-home-|login-col|flexslider-col/);
  }
});

test('only exact NY annuities identity and explicit stage mode use the compatible 5-column overlay', () => {
  const input = page({ fields: identity('page-annuities'), params: { layout: 'stage' } }), html = render(input);
  assert.match(html, /class="hero-img allianz-ny-annuities-hero"/); assert.match(html, /notepad no-product-line right col-sm-5/);
  assert.doesNotMatch(html, /allianz-ny-home-|login-col/);
  assert.match(render(input, true), /id="content-body" class="col-md-10 col-md-offset-1 center-column"/);
  for (const params of [{}, { layout: 'home' }]) assert.match(render(page({ fields: identity('page-annuities'), params })), /notepad no-product-line right col-sm-4/);
  const wrong = identity('page-annuities'); wrong.legacySharedKey.value = '';
  assert.match(render(page({ fields: wrong, params: { layout: 'stage' } })), /notepad no-product-line right col-sm-4/);
});

for (const editing of [false, true]) test(`real SDK ${editing ? 'editing' : 'visitor'} home Layout uses full width and preserves existing rails`, () => {
  const input = page({ editing }), before = JSON.stringify(input), html = render(input, true);
  assert.match(html, /id="content-body" class="col-sm-12 center-column allianz-ny-home-content"/);
  assert.equal(JSON.stringify(input), before);
  const rail = [{ componentName: 'TestRail', uid: 'ny-rail', params: {} }];
  assert.match(render(page({ editing, slots: { 'headless-sidebar': rail } }), true), /id="content-body" class="col-md-8 col-sm-9 center-column"/);
  assert.match(render(page({ editing, slots: { 'headless-right-rail': rail } }), true), /id="content-body" class="col-md-10 col-sm-9 center-column"/);
  const emptyRail = render(page({ editing, slots: { 'headless-right-rail': [] } }), true);
  if (editing) { assert.match(emptyRail, /class="col-md-2 col-sm-3 right-column"/); assert.match(emptyRail, /chrometype="placeholder"/); assert.match(emptyRail, /headless-right-rail/); }
  else assert.match(emptyRail, /col-sm-12 center-column allianz-ny-home-content/);
});

test('non-home NY, generic legacy and modern Layout compositions remain unchanged', () => {
  for (const fields of [identity('page-contact-us'), { shellFamily: { value: 'legacy' } }]) {
    const html = render(page({ fields }), true); assert.match(html, /id="content-body" class="col-md-10 col-md-offset-1 center-column"/); assert.doesNotMatch(html, /allianz-ny-home-content/);
  }
  const modern = render(page({ fields: {} }), true); assert.match(modern, /allianz-modern/); assert.match(modern, /<main id="main"><div id="content">/); assert.doesNotMatch(modern, /id="content-body"/);
});

test('two actual SDK home placements have distinct, valid label and notice IDs', () => {
  const input = page(); input.layout.sitecore.route.placeholders['headless-main'].push({ ...input.layout.sitecore.route.placeholders['headless-main'][0], uid: 'ny-hero-second' });
  const html = render(input, true), ids = [...html.matchAll(/\bid="([^"]*ny-home-[^"]*)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 8); assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/(?:for|aria-describedby)="([^"]*ny-home-[^"]*)"/g)) assert.ok(ids.includes(match[1]));
});

function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]; }
test('each account action opens only the local accessible dialog and closes without credential state', () => {
  const states = []; let index = 0;
  const Dialog = () => null;
  const local = sourceLoader({ react: { ...React, useId: () => ':ny-local:', useState: (initial) => {
    const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], (value) => { states[slot] = value; }];
  } }, 'components/content-sdk/AccessibleDialog': { __esModule: true, default: Dialog } });
  const Home = local(path.join(here, 'NewYorkHomeHero.props.tsx')).default;
  const Login = nodes(Home({ data: data(), params: {}, isEditing: false })).find((n) => n.type?.name === 'NewYorkHomeLogin')?.type;
  assert.equal(typeof Login, 'function');
  const draw = () => { index = 0; return Login(); };
  for (let i = 0; i < 4; i++) {
    const tree = draw(), controls = nodes(tree).filter((n) => n.type === 'input');
    assert.deepEqual(states, [false]); assert.equal(controls.length, 3);
    for (const control of controls) { assert.equal(control.props.disabled, true); assert.equal(control.props.name, undefined); assert.equal(control.props.onChange, undefined); }
    const buttons = nodes(tree).filter((n) => n.type === 'button'); assert.equal(buttons.length, 4);
    let focused = 0; buttons[i].props.onClick({ currentTarget: { focus() { focused++; } } });
    assert.equal(focused, 1); assert.deepEqual(states, [true]);
    const dialog = nodes(draw()).find((n) => n.type === Dialog); assert.ok(dialog);
    assert.equal(dialog.props.titleId, 'ny-local-ny-home-account-title');
    assert.match(nodes(dialog).find((n) => n.type === 'p').props.children, /Online account access is unavailable/);
    dialog.props.onClose(); assert.deepEqual(states, [false]); assert.equal(nodes(draw()).filter((n) => n.type === Dialog).length, 0);
    buttons[i].props.onClick({ currentTarget: { focus() {} } });
    nodes(draw()).find((n) => n.type === 'button' && n.props.children === 'Close').props.onClick(); assert.deepEqual(states, [false]);
  }
  const source = fs.readFileSync(path.join(here, 'NewYorkHomeHero.props.tsx'), 'utf8');
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|<form\b|onSubmit|type=["']submit/);
});

test('source CSS contracts retain the 768px 9/3 grid, mobile relative overlay and narrowly scoped corrections', () => {
  const legacy = postcss.parse(fs.readFileSync(path.join(root, 'assets/allianz-legacy.css'), 'utf8'));
  const rules = [];
  legacy.walkRules((rule) => rules.push({ selector: rule.selector, media: rule.parent.type === 'atrule' ? rule.parent.params : '', declarations: Object.fromEntries(rule.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value])) }));
  const value = (selector, media, prop) => rules.find((r) => r.selector === selector && r.media.includes(media) && prop in r.declarations)?.declarations[prop];
  assert.equal(value('.allianz-legacy .col-sm-9', 'min-width:768px', 'width'), '75%');
  assert.equal(value('.allianz-legacy .col-sm-3', 'min-width:768px', 'width'), '25%');
  assert.equal(value('.allianz-legacy .col-sm-5', 'min-width:768px', 'width'), '41.66666667%');
  assert.equal(value('.allianz-legacy .notepad', 'max-width:767px', 'position'), 'relative');
  const scoped = postcss.parse(fs.readFileSync(path.join(here, 'AllianzNewYorkHero.css'), 'utf8'));
  scoped.walkRules((rule) => {
    for (const selector of rule.selector.split(',')) assert.match(selector.trim(), /^\.allianz-legacy(?:\.page-new-york)? .*\.allianz-ny-(?:home|annuities)-/);
  });
  const declarations = [];
  scoped.walkDecls((decl) => declarations.push(decl));
  for (const decl of declarations.filter((d) => d.prop === 'font-family')) assert.equal(decl.value, "'AllianzNeoRegular', sans-serif");
  assert.ok(declarations.some((d) => d.prop === 'background' && d.value === '#113378'));
  for (const [prop, expected] of [['margin-top', '2%'], ['margin-right', '2.5%']]) {
    const decl = declarations.find((d) => d.prop === prop && d.parent.selector.includes('.notepad.right')); assert.equal(decl?.value, expected); assert.equal(decl.parent.parent.params, '(min-width: 768px)');
  }
});
