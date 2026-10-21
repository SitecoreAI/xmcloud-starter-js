import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const sourceRoot = fileURLToPath(new URL('../../..', import.meta.url));
const require = createRequire(path.join(sourceRoot, '../package.json'));
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');

function loader(overrides = {}) {
  const cache = new Map();
  const mocks = { 'next/navigation': { useRouter: () => ({ push() {} }), usePathname: () => '/about' }, ...overrides };
  const load = filename => {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
    cache.set(filename, compiled);
    compiled.require = specifier => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      const resolved = local && [local, `${local}.ts`, `${local}.tsx`]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      return require(resolved || specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText, filename);
    return compiled.exports;
  };
  return load;
}

const load = loader();
const component = (directory, filename) => load(path.join(sourceRoot, 'components', directory, `${filename}.tsx`));
const Header = component('allianz-header', 'AllianzHeader');
const LegacyHeader = component('allianz-legacy-header', 'AllianzLegacyHeader');
const Participant = component('allianz-participant-header', 'AllianzParticipantHeader');
const Product = component('allianz-product-navigation', 'AllianzProductNavigation');
const Sidebar = component('allianz-legacy-sidebar', 'AllianzLegacySidebar');
const Index = component('allianz-index-definitions', 'AllianzIndexDefinitions');
const PageHeader = component('allianz-legacy-page-header', 'AllianzLegacyPageHeader');
const Breadcrumbs = component('allianz-breadcrumbs', 'AllianzBreadcrumbs');
const LegacyBreadcrumbs = component('allianz-legacy-breadcrumbs', 'AllianzLegacyBreadcrumbs');
const ParticipantNavigation = component('allianz-participant-navigation', 'AllianzParticipantNavigation');
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: {
  itemId: `test-nav-owner-${name}`, fieldId: `test-nav-field-${name}`, fieldType,
} } });
const navItem = (name, populated) => ({ id: `test-nav-${name}`,
  title: field(`${name}-title`, populated ? `Saved ${name}` : ''),
  link: field(`${name}-link`, populated ? { href: '/about', text: `Saved ${name}`, linktype: 'internal' } : {}, 'General Link'),
  icon: field(`${name}-icon`, populated ? { src: '/test-nav-icon.svg', alt: 'Saved icon' } : {}, 'Image'),
  children: { results: [] },
});
const fixture = (populated = false) => ({
  heading: field('heading', populated ? 'Saved heading' : '', 'Rich Text'),
  body: field('body', populated ? '<p>Saved body.</p>' : '', 'Rich Text'),
  tagline: field('tagline', populated ? 'Saved tagline' : ''),
  logo: field('logo', populated ? { src: '/test-nav-logo.svg', alt: 'Saved logo' } : {}, 'Image'),
  link: field('home-link', populated ? { href: '/', text: 'Home' } : {}, 'General Link'),
  primaryNav: { targetItems: [navItem('primary', populated), navItem('tab', populated)] },
  utilityNav: { targetItems: [navItem('utility', populated)] },
  children: { results: [{ id: 'test-index-row', body: field('index-body', populated ? '<p>Saved definition.</p>' : '', 'Rich Text') }] },
});
function render(Component, datasource, isEditing) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life', locale: 'en',
      layout: { sitecore: { context: { itemPath: '/about' }, route: { name: 'Test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: {}, fields: { data: { datasource } } })));
}
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(decode(match[1])).fieldId);
const noOptionalCanvas = html => assert.doesNotMatch(html, /Add a link|\[No (?:text|image) in field\]|Additional content fields|allianz-product-navigation-editing/);

const variants = [
  ['Header', Header.Default, ['logo', 'tagline', 'primary-link', 'primary-title', 'utility-link', 'utility-title']],
  ['LegacyHeader', LegacyHeader.Default, ['heading', 'logo', 'home-link', 'primary-link', 'primary-title']],
  ['ParticipantHeader', Participant.Default, ['logo', 'tagline', 'utility-link', 'utility-title']],
  ['ProductDefault', Product.Default, ['primary-link', 'primary-title', 'tab-link', 'tab-title']],
  ['ProductFixedTabs', Product.FixedTabs, ['primary-link', 'primary-title', 'tab-link', 'tab-title']],
  ['LegacySidebar', Sidebar.Default, ['primary-link', 'primary-title']],
  ['IndexDefinitions', Index.Default, ['heading', 'index-body']],
  ['LegacyPageHeader', PageHeader.Default, ['heading', 'body']],
  ['LegacyLegalHeader', PageHeader.Legal, ['heading', 'body']],
];
for (const [name, Component, populatedFields] of variants) {
  test(`${name}: empty optional fields have the same visitor and editing canvas`, () => {
    const data = fixture(), before = JSON.stringify(data);
    const normal = render(Component, data, false), editing = render(Component, data, true);
    noOptionalCanvas(normal); noOptionalCanvas(editing);
    assert.equal(editing, normal);
    assert.deepEqual(markers(editing), []);
    assert.equal(JSON.stringify(data), before, 'Empty fields and their metadata remain available in Content');
  });
  test(`${name}: populated native fields retain their original editing identities`, () => {
    const data = fixture(true), before = JSON.stringify(data), html = render(Component, data, true);
    noOptionalCanvas(html);
    const ids = markers(html);
    for (const name of populatedFields) assert.ok(ids.includes(`test-nav-field-${name}`), name);
    assert.equal(JSON.stringify(data), before);
    assert.deepEqual(markers(render(Component, data, false)), []);
  });
}

// These datasource Treelist links are authored fields, distinct from automatic
// ancestor/section/year navigation. Keep native controls without extra canvas UI.
for (const [name, Component, populatedFields] of [
  ['Breadcrumbs', Breadcrumbs.Default, ['primary-link', 'primary-title', 'tab-link', 'tab-title']],
  ['LegacyBreadcrumbs', LegacyBreadcrumbs.Default, ['primary-link', 'primary-title', 'tab-link', 'tab-title']],
  ['ParticipantNavigation', ParticipantNavigation.Default, ['heading', 'primary-link', 'primary-title', 'tab-link', 'tab-title']],
]) for (const populated of [false, true]) {
  test(`${name}: ${populated ? 'populated authored fields retain controls' : 'cleared fields create no controls'} with the same canvas`, () => {
    const data = fixture(populated), before = JSON.stringify(data);
    const normal = render(Component, data, false), editing = render(Component, data, true);
    noOptionalCanvas(normal); noOptionalCanvas(editing);
    assert.deepEqual(markers(normal), []);
    assert.deepEqual(markers(editing).sort(), (populated ? populatedFields : []).map(name => `test-nav-field-${name}`).sort());
    assert.equal(canvas(editing), canvas(normal));
    if (populated) {
      assert.match(editing, /Saved primary/);
      assert.match(editing, /href="\/about"/);
    }
    assert.equal(JSON.stringify(data), before);
  });
}

for (const [name, directoryName, filename, hasCaption] of [
  ['Breadcrumbs', 'allianz-breadcrumbs', 'AllianzBreadcrumbs', false],
  ['LegacyBreadcrumbs', 'allianz-legacy-breadcrumbs', 'AllianzLegacyBreadcrumbs', false],
  ['ParticipantNavigation', 'allianz-participant-navigation', 'AllianzParticipantNavigation', true],
]) test(`${name}: editing passes the exact original native field objects to SDK controls`, () => {
  const data = fixture(true), before = JSON.stringify(data);
  const load = loader({
    react: { ...React, useId: () => 'authored-navigation', useState: value => [value, () => {}] },
    '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: true },
      layout: { sitecore: { route: {} } } } }) },
  });
  const Component = load(path.join(sourceRoot, 'components', directoryName, `${filename}.tsx`)).Default;
  const tree = Component({ params: {}, fields: { data: { datasource: data } } });
  const flatten = element => !element || typeof element !== 'object' ? [] :
    [element, ...React.Children.toArray(element.props?.children).flatMap(flatten)];
  const controls = flatten(tree).filter(node => node.type === sdk.Text || node.type === sdk.Link);
  const expected = [...(hasCaption ? [data.heading.jsonValue] : []),
    ...data.primaryNav.targetItems.flatMap(item => [item.link.jsonValue, item.title.jsonValue])];
  assert.equal(controls.length, expected.length);
  for (const field of expected) {
    const control = controls.find(node => node.props.field === field);
    assert.ok(control, field.metadata.fieldId);
    assert.equal(control.props.editable, true);
  }
  assert.equal(JSON.stringify(data), before);
});

for (const variant of ['Default', 'FixedTabs']) for (const editing of [false, true]) {
  test(`Product ${variant}: repeated disclosure activation works in ${editing ? 'editing' : 'normal'} mode`, () => {
    let open = false;
    const load = loader({
      react: { ...React, useState: () => [open, update => { open = update(open); }], useId: () => 'test-nav-tabs' },
      '@sitecore-content-sdk/nextjs': { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) },
    });
    const Product = load(path.join(sourceRoot, 'components/allianz-product-navigation/AllianzProductNavigation.tsx'));
    const data = fixture(true), before = JSON.stringify(data);
    const render = () => Product[variant]({ params: {}, fields: { data: { datasource: data } } });
    for (const expected of [false, true, false, true]) {
      const nav = render(), [title, toggle] = nav.props.children[0].props.children;
      assert.equal(toggle.props['aria-expanded'], expected);
      assert.notEqual(toggle.props.disabled, true);
      assert.equal(title.props.field.metadata.fieldId, 'test-nav-field-primary-link');
      toggle.props.onClick();
    }
    if (variant === 'FixedTabs') {
      let prevented = false;
      render().props.children[0].props.children[0].props.onClick({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
      assert.equal(render().props.children[0].props.children[1].props['aria-expanded'], true);
    }
    assert.equal(JSON.stringify(data), before);
  });
}


// SDK editing and visitor renderers may serialize anchor attributes in a different
// order. Preserve every attribute value and child node when comparing the canvas.
const canvas = html => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '').replace(
  /<([a-z][\w:-]*)(\s+[^<>]*?)?(\/?)>/gi,
  (tag, name, attributes, closing) => `<${name}${attributes ? ' ' + (attributes.match(/[^\s=<>/]+(?:="[^"]*")?/g) ?? []).sort().join(' ') : ''}${closing}>`);

test('a cleared product title never borrows its saved link label or emits an empty Text editor', () => {
  const data = fixture(true);
  data.primaryNav.targetItems[0].title.jsonValue.value = '';
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Product.Default, data, editing);
    noOptionalCanvas(html);
    assert.ok(!markers(html).includes('test-nav-field-primary-title'));
    const content = html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '').replace(/<[^>]*>/g, '');
    assert.doesNotMatch(content, /Saved primary/);
    if (editing) assert.ok(markers(html).includes('test-nav-field-primary-link'));
  }
  assert.equal(JSON.stringify(data), before);
});
