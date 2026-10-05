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
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const componentMap = new Map();
function sourceLoader(overrides = {}) {
  const modules = new Map();
  function loadSource(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (specifier in overrides) return overrides[specifier];
      if (specifier.endsWith('.css')) return {};
      if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
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
  return loadSource;
}
const loadSource = sourceLoader();
const accordionPath = path.join(sourceRoot, 'components/allianz-legacy-accordion/AllianzLegacyAccordion.tsx');
const Accordion = loadSource(accordionPath);
const field = (name, value, item = 'test-only-item') => ({ jsonValue: { value, metadata: {
  itemId: item, fieldId: `${item}-${name}`, fieldType: name === 'body' ? 'Rich Text' : name === 'link' ? 'General Link' : 'Single-Line Text',
} } });
const page = (editing = false) => ({
  mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life',
  layout: { sitecore: { context: {}, route: { name: 'Test page', fields: {}, placeholders: {} } } },
});
const props = (datasource, editing = false, params = {}) => ({
  params, fields: { data: { datasource } }, rendering: { uid: 'test-only-rendering' }, page: page(editing),
});
const panels = (count = 10) => ({ children: { total: count, pageInfo: { hasNext: false }, results:
  Array.from({ length: count }, (_, i) => ({ id: `entry-${i}`, heading: field('heading', `Panel ${i}`, `entry-${i}`),
    body: field('body', `<p>Authored <em>answer ${i}</em></p>`, `entry-${i}`) })) } });
function render(Component, input) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: input.page, api: {}, componentMap, loadImportMap: async () => ({}),
  }, React.createElement(Component, input)));
}
const normalizeIds = (html) => html.replace(/(?:_R_[^" ]*|:R[^" ]*)-panel-/g, 'INSTANCE-panel-');

test('Privacy changes only the accordion class, with all ten authored entries intact', () => {
  const input = props(panels(), false, { region: 'pre-content', RenderingIdentifier: 'authored-id' });
  const before = JSON.stringify(input);
  const html = render(Accordion.Privacy, input);
  const original = render(Accordion.Default, input);
  assert.equal(normalizeIds(html.replace(' allianz-legacy-privacy-accordion', '')), normalizeIds(original));
  assert.equal((html.match(/class="panel panel-default"/g) || []).length, 10);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 10);
  assert.equal((html.match(/hidden=""/g) || []).length, 10);
  for (let i = 0; i < 10; i++) assert.ok(html.includes(`<p>Authored <em>answer ${i}</em></p>`));
  assert.match(html, /id="authored-id"><div class="col-md-12 content-body pre-content"/);
  assert.equal(JSON.stringify(input), before);
  assert.doesNotMatch(original, /allianz-legacy-privacy/);
});

test('Default keeps its original empty collection markup and source margins', () => {
  assert.equal(render(Accordion.Default, props(panels(0))), '<div class="row"><div class="col-md-12 content-body content"><div class="panel-group accordion"></div></div></div>');
  const legacyCss = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-legacy.css'), 'utf8');
  assert.ok(legacyCss.includes('.allianz-legacy .accordion.panel-group{border-bottom:1px dotted #4d4d4d;margin:20px 0}'));
});

test('Privacy CSS removes only duplicate group margins and is stronger than recovered CSS', () => {
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-legacy-accordion/AllianzLegacyPrivacyAccordion.css'), 'utf8'));
  const rules = css.nodes.filter((node) => node.type === 'rule');
  assert.equal(rules.length, 1);
  assert.equal(rules[0].selector, '.allianz-legacy .panel-group.accordion.allianz-legacy-privacy-accordion');
  assert.deepEqual(rules[0].nodes.map(({ prop, value }) => [prop, value]), [['margin-top', '0'], ['margin-bottom', '0']]);
});

test('Privacy keeps genuine editor fields, cleared answers, and all ten panels open', () => {
  const data = panels(); data.children.results[0].body = field('body', '', 'entry-0');
  const input = props(data, true); const before = JSON.stringify(input);
  const html = render(Accordion.Privacy, input);
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 10);
  assert.doesNotMatch(html, /hidden=""/);
  for (let i = 0; i < 10; i++) {
    assert.match(html, new RegExp(`fieldId.*entry-${i}-heading`));
    assert.match(html, new RegExp(`fieldId.*entry-${i}-body`));
  }
  assert.equal(JSON.stringify(input), before);
  assert.doesNotMatch(render(Accordion.Privacy, props(data)), /Authored <em>answer 0/);
});

test('Privacy preserves missing-datasource fallback and optional editable heading', () => {
  assert.match(render(Accordion.Privacy, props(undefined)), /Add a datasource for AllianzLegacyAccordion/);
  const data = { ...panels(0), heading: field('heading', 'Authored heading') };
  assert.match(render(Accordion.Privacy, props(data)), /<h2>Authored heading<\/h2>/);
  data.heading = field('heading', '');
  assert.doesNotMatch(render(Accordion.Privacy, props(data)), /<h2/);
  assert.match(render(Accordion.Privacy, props(data, true)), /fieldId.*test-only-item-heading/);
});

test('Privacy panels keep unique accessible trigger targets across two renderings', () => {
  const input = props(panels(2));
  const html = render(() => React.createElement(React.Fragment, null,
    React.createElement(Accordion.Privacy, input), React.createElement(Accordion.Privacy, input)), input);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 4); assert.equal(new Set(ids).size, 4);
  for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) assert.ok(ids.includes(m[1]));
});

test('Privacy keeps genuine SDK nested placeholders and safe authored links', () => {
  componentMap.set('TestOnlyNested', { Default: () => React.createElement('p', null, 'Nested authored content') });
  const data = panels(1); data.children.results[0].link = field('link', { href: '#authored', text: 'Authored link' });
  const input = props(data, true);
  input.rendering.placeholders = { 'allianz-legacy-accordion-1': [{ uid: 'test-only-nested', componentName: 'TestOnlyNested', params: {}, fields: {} }] };
  const html = render(Accordion.Privacy, input);
  assert.match(html, /Nested authored content/); assert.match(html, /test-only-nested/);
  assert.match(html, /href="#authored"/); assert.match(html, /fieldId.*test-only-item-link/);
});

// Exercise the actual component's handlers without a browser; live keyboard and
// CMS save/reload verification remain publication gates.
for (const variant of ['Default', 'Privacy']) {
  test(`${variant} keeps repeated toggle, one-open, and allowMultiple behavior`, () => {
    let open = [];
    const hooks = { ...React, useId: () => 'test-instance', useState: () => [open, (fn) => { open = fn(open); }] };
    const load = sourceLoader({ react: hooks, '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: page() }) } });
    const Component = load(accordionPath)[variant];
    const buttons = (params = {}) => {
      let tree = Component(props(panels(2), false, params));
      if (typeof tree.type === 'function') tree = tree.type(tree.props);
      const output = [];
      const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(visit);
        if (node.type === 'button') output.push(node);
        visit(node.props?.children);
      };
      visit(tree); return output;
    };
    buttons()[0].props.onClick(); assert.deepEqual(open, ['entry-0']);
    buttons()[0].props.onClick(); assert.deepEqual(open, []);
    buttons()[0].props.onClick(); buttons()[1].props.onClick(); assert.deepEqual(open, ['entry-1']);
    buttons({ allowMultiple: '1' })[0].props.onClick(); assert.deepEqual(open, ['entry-1', 'entry-0']);
    buttons({ allowMultiple: '1' })[1].props.onClick(); assert.deepEqual(open, ['entry-0']);
  });
}

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-legacy-card-grid/AllianzLegacyCardGrid.tsx'));
const cards = () => ({ heading: field('heading', ''), children: { total: 2, pageInfo: { hasNext: false }, results:
  ['Policy', 'Notices'].map((name, i) => ({ id: `card-${i}`, heading: field('heading', `Authored ${name}`, `card-${i}`),
    body: field('body', `<p>Authored ${name} summary</p>`, `card-${i}`),
    link: field('link', { href: `#${name}`, text: `Read ${name}` }, `card-${i}`),
    headingLevel: field('headingLevel', 'h3', `card-${i}`) })) } });

test('Privacy cards change only the link marker class; two native cards and grid parameters stay intact', () => {
  const input = props(cards(), false, { columns: '2', region: 'pre-content', noMarginBottom: '1' });
  const before = JSON.stringify(input); const html = render(Cards.Privacy, input);
  assert.equal(html.replaceAll(' allianz-legacy-privacy-card-link', ''), render(Cards.Default, input));
  assert.equal((html.match(/<article class="mod">/g) || []).length, 2);
  assert.equal((html.match(/class="link allianz-legacy-privacy-card-link"/g) || []).length, 2);
  assert.match(html, /class="row mod-row no-margin-bottom"/);
  assert.match(html, /href="#Policy"/); assert.match(html, /href="#Notices"/);
  assert.equal(JSON.stringify(input), before);
});

test('Privacy cards do not hardcode the native spacing prerequisite or replace author data', () => {
  const html = render(Cards.Privacy, props(cards()));
  assert.doesNotMatch(html, /no-margin-bottom/);
  const input = cards(); input.children.results[0].heading = field('heading', 'Edited title', 'card-0');
  input.children.results[0].link = field('link', { href: '#Edited', text: 'Edited label' }, 'card-0');
  assert.match(render(Cards.Privacy, props(input)), /Edited title/);
  assert.match(render(Cards.Privacy, props(input)), /href="#Edited"[^>]*>Edited label/);
  assert.match(render(Cards.Privacy, props(undefined)), /Add a datasource for AllianzLegacyCardGrid/);
});

test('Privacy cards preserve real editor metadata and genuinely cleared links', () => {
  const data = cards(); data.children.results[0].link = field('link', { href: '', text: '' }, 'card-0');
  const publicHtml = render(Cards.Privacy, props(data));
  assert.equal((publicHtml.match(/allianz-legacy-privacy-card-link/g) || []).length, 1);
  assert.doesNotMatch(publicHtml, /Read Policy/);
  const editing = render(Cards.Privacy, props(data, true));
  assert.match(editing, /fieldId.*card-0-link/);
  assert.match(editing, /fieldId.*card-0-heading/); assert.match(editing, /fieldId.*card-0-body/);
});

test('Privacy card marker is CSS-only, decorative, blue, and source-sized without layout changes', () => {
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-legacy-card-grid/AllianzLegacyPrivacyCards.css'), 'utf8'));
  const rules = css.nodes.filter((node) => node.type === 'rule');
  assert.equal(rules.length, 2);
  assert.ok(rules.every((rule) => rule.selector.startsWith('.allianz-legacy p.link.allianz-legacy-privacy-card-link')));
  const marker = rules.find((rule) => rule.selector.endsWith('::before'));
  const values = Object.fromEntries(marker.nodes.map(({ prop, value }) => [prop, value]));
  assert.equal(values.content, '""'); assert.equal(values.width, '4px'); assert.equal(values.height, '8px');
  assert.equal(values.top, '.5em'); assert.equal(values.left, '0');
  assert.equal(values['background-color'], '#003781'); assert.equal(values['pointer-events'], 'none');
  assert.equal(values['clip-path'], 'polygon(0 0, 25% 0, 87.5% 46.43%, 25% 92.86%, 0 92.86%, 62.5% 46.43%)');
  assert.doesNotMatch(css.toString(), /url\(|data:|margin:|padding:|display:/);
});

test('real SDK resolves both Privacy exports by the native FieldNames parameter', () => {
  componentMap.set('AllianzLegacyAccordion', Accordion);
  componentMap.set('AllianzLegacyCardGrid', Cards);
  const input = props(undefined);
  input.rendering.placeholders = { 'privacy-test-slot': [
    { uid: 'test-only-grid', componentName: 'AllianzLegacyCardGrid', params: { FieldNames: 'Privacy', noMarginBottom: '1' }, fields: { data: { datasource: cards() } } },
    { uid: 'test-only-panels', componentName: 'AllianzLegacyAccordion', params: { FieldNames: 'Privacy' }, fields: { data: { datasource: panels() } } },
  ] };
  const html = render(() => React.createElement(sdk.Placeholder, { name: 'privacy-test-slot', rendering: input.rendering }), input);
  assert.match(html, /allianz-legacy-privacy-card-link/); assert.match(html, /allianz-legacy-privacy-accordion/);
  assert.match(html, /no-margin-bottom/); assert.equal((html.match(/aria-expanded="false"/g) || []).length, 10);
});
