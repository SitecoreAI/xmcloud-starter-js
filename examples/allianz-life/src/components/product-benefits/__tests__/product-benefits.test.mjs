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
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { parse } = require('graphql');
const directory = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(directory, '../../..');
const modules = new Map();

// Local TS/CSS loader only. All field components and editing chrome use the real SDK.
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
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

const component = loadSource(path.resolve(directory, '../ProductBenefits.tsx'));
const { productBenefitFields } = loadSource(path.resolve(directory, '../product-benefits-fields.props.ts'));
const read = (filename) => fs.readFileSync(path.join(directory, filename), 'utf8');
const fixtures = JSON.parse(read('native-fixtures.json'));
const evidence = JSON.parse(read('native-receipt-evidence.json'));
const adjacent = JSON.parse(read('adjacent-source-fixtures.json'));
const complete = (entries) => ({ children: {
  total: entries.length, pageInfo: { hasNext: false, endCursor: null }, results: entries,
} });

function render(datasource, { variant = 'Default', params = {}, isEditing = false, omitFields = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Annuities', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component[variant], {
    params, ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}

const nativeField = (name, value, itemId = 'synthetic-authored-benefit') => ({ value, metadata: {
  fieldId: `synthetic-${name}`, fieldType: name === 'icon' ? 'Image' : name === 'body' ? 'Rich Text' : 'Single-Line Text', itemId,
} });
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('native fixtures preserve both root IDs and four child IDs, all values and pending media status', () => {
  for (const [number, fixture] of [[4, fixtures.twoUp], [5, fixtures.twoUpFinal]]) {
    const root = `route:/what-we-offer/annuities:component:${number}:AllianzCardGrid`;
    assert.equal(fixture.id, evidence.bindings[root].itemId);
    fixture.children.results.forEach((child, index) => {
      const original = evidence.bindings[`${root}:entry:${index + 1}`];
      assert.equal(child.id, original.itemId);
      assert.deepEqual(child.fieldCollection.map((field) => ({ name: field.name, value: field.jsonValue.value })), original.reviewedFields);
      assert.equal(child.fieldCollection.find((field) => field.name === 'image').jsonValue.value, '');
      assert.equal(productBenefitFields(child).icon, undefined);
    });
    assert.doesNotMatch(render(fixture), /<img|<svg|scEmptyImage/);
  }
  assert.match(evidence.mediaStatus, /Pending\/unbound/);
  assert.ok(evidence.remaining.includes('Nine unbound Image fields and eight binaries await Content Hub mapping and delivery.'));
});

test('Default/TwoUp preserve the first source no-gutters two-column h4/md transparent row', () => {
  const html = render(fixtures.twoUp);
  assert.equal(html, render(fixtures.twoUp, { variant: 'TwoUp' }));
  const source = read('two-up.source.html');
  for (const value of ['Accumulation potential', 'Tax-deferred growth']) {
    assert.ok(source.includes(`<H4>${value}</H4>`));
    assert.ok(html.includes(`<h4>${value}</h4>`));
  }
  for (const classes of ['l-container t-bg-transparent axlTileCollection allianz-product-benefits',
    'l-grid l-grid--max-width l-grid--no-gutters-outer', 'l-grid__row match-height-row',
    'l-grid__column-medium-6', 'm-axlTile match-height -is--stacked t-bg-transparent',
    'tileContent u-text-center', 'tileSubGrid__content', 'tileBody u-font-size-md']) {
    assert.ok(html.includes(`class="${classes}"`), classes);
  }
  assert.equal((html.match(/<article /g) || []).length, 2);
  assert.doesNotMatch(html, /u-row-spacing|u-margin-bottom-xl|<h[12356]|tileLink|primary-white/);
});

test('TwoUpFinal keeps the second source row’s exact fixed spacing and footnotes', () => {
  const source = read('two-up-final.source.html');
  assert.match(source, /l-container u-row-spacing t-bg-transparent/);
  assert.match(source, /l-grid__row match-height-row u-margin-bottom-xl/);
  const html = render(fixtures.twoUpFinal, { variant: 'TwoUpFinal' });
  assert.match(html, /class="l-container u-row-spacing t-bg-transparent axlTileCollection allianz-product-benefits"/);
  assert.match(html, /class="l-grid__row match-height-row u-margin-bottom-xl"/);
  assert.match(html, /<h4>Level of protection<\/h4>/);
  assert.match(html, /<h4>Retirement income<\/h4>/);
  assert.ok(html.includes('<sup>1</sup>') && html.includes('<sup>2</sup>'));
});

test('ThreeUp matches FIA and RILA full-width three-column h3/md source grids', () => {
  for (const [index, label] of ['fia', 'rila'].entries()) {
    const html = render(adjacent[index].datasource, { variant: 'ThreeUp' });
    const source = read(`${label}-three-up.source.html`);
    assert.match(html, /class="l-container--full-width t-bg-transparent axlTileCollection allianz-product-benefits"/);
    assert.match(html, /class="l-grid l-grid--max-width"/);
    assert.equal((html.match(/class="l-grid__column-medium-4"/g) || []).length, 3);
    for (const child of adjacent[index].datasource.children.results) {
      const projected = productBenefitFields(child);
      assert.ok(source.includes(`<H3>${projected.heading.jsonValue.value}</H3>`));
      assert.ok(html.includes(`<h3>${projected.heading.jsonValue.value}</h3>`));
      assert.ok(html.includes(projected.body.jsonValue.value));
    }
    assert.doesNotMatch(html, /no-gutters-outer|u-row-spacing|u-margin-bottom-xl|<h4/);
  }
});

test('compact projection preserves jsonValue identity and cleared canonical precedence', () => {
  const heading = nativeField('heading', 'Compact heading');
  const body = nativeField('body', '<p>Compact body</p>');
  const icon = nativeField('icon', { src: '/allianz-assets/authored.svg', alt: 'Authored icon' });
  const compact = { id: 'projected', fieldCollection: [
    { name: 'HEADING', jsonValue: heading }, { name: 'body', jsonValue: body },
    { name: 'icon', jsonValue: icon }, { name: 'image', jsonValue: icon },
    { name: 'theme', jsonValue: { value: 'primary-brand' } }, null, {},
  ] };
  const before = JSON.stringify(compact);
  const projected = productBenefitFields(compact);
  assert.equal(projected.heading.jsonValue, heading);
  assert.equal(projected.body.jsonValue, body);
  assert.equal(projected.icon.jsonValue, icon);
  assert.equal(projected.fieldCollection, compact.fieldCollection);
  assert.equal(projected.image, undefined);
  assert.equal(projected.theme, undefined);
  const payload = { ...compact, children: { total: 0, pageInfo: { hasNext: false }, results: [] },
    legacyField: { jsonValue: { value: 'Preserved raw content' } } };
  assert.equal(productBenefitFields(payload).children, payload.children);
  assert.equal(productBenefitFields(payload).legacyField, payload.legacyField);
  for (const [name, value] of [['heading', ''], ['body', ''], ['icon', {}]]) {
    const cleared = { jsonValue: nativeField(name, value) };
    assert.equal(productBenefitFields({ ...compact, [name]: cleared })[name], cleared);
    assert.equal(productBenefitFields({ ...compact, [name]: undefined })[name], undefined);
  }
  assert.equal(JSON.stringify(compact), before);
});

test('real SDK renders authored block HTML and Image while retaining all native field metadata', () => {
  const itemId = 'synthetic-authored-benefit';
  const body = '<p>Authored <strong>copy</strong>.</p><ul><li>One</li><li>Two</li></ul><div><p>Another block.</p></div>';
  const entry = { id: itemId, fieldCollection: [
    { name: 'heading', jsonValue: nativeField('heading', 'Authored <em>heading</em>', itemId) },
    { name: 'body', jsonValue: nativeField('body', body, itemId) },
    { name: 'icon', jsonValue: nativeField('icon', { src: '/allianz-assets/authored.svg', alt: 'Authored icon' }, itemId) },
  ] };
  const datasource = complete([entry]);
  const before = JSON.stringify(datasource);
  const html = render(datasource);
  assert.ok(html.includes(body));
  assert.match(html, /<h4>Authored &lt;em&gt;heading&lt;\/em&gt;<\/h4>/);
  assert.match(html, /class="tileIcon t-bg-transparent t-icon-primary-black"/);
  assert.match(html, /<img alt="Authored icon" src="\/allianz-assets\/authored.svg"\/>/);
  assert.doesNotMatch(html, /<p[^>]*class="tileBody|<p[^>]*><ul|<p[^>]*><div/);
  assert.deepEqual(metadata(html), []);
  const editing = render(datasource, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['synthetic-body', 'synthetic-heading', 'synthetic-icon']);
  assert.ok(metadata(editing).every((field) => field.itemId === itemId));
  assert.equal(JSON.stringify(datasource), before);
});

test('each canonical clearing keeps editor chrome, siblings and no historical content resurrection', () => {
  const values = { heading: 'Authored heading', body: '<p>Authored body</p>', icon: { src: '/allianz-assets/authored.svg', alt: 'Icon' } };
  for (const name of Object.keys(values)) {
    const entry = { id: 'clear-one', fieldCollection: Object.entries(values)
      .map(([key, value]) => ({ name: key, jsonValue: nativeField(key, value) })),
    [name]: { jsonValue: nativeField(name, name === 'icon' ? {} : '') } };
    const datasource = complete([entry]);
    const html = render(datasource);
    assert.equal(html.includes('Authored heading'), name !== 'heading');
    assert.equal(html.includes('<p>Authored body</p>'), name !== 'body');
    assert.equal(html.includes('/allianz-assets/authored.svg'), name !== 'icon');
    assert.deepEqual(metadata(render(datasource, { isEditing: true })).map((field) => field.fieldId).sort(),
      ['synthetic-body', 'synthetic-heading', 'synthetic-icon']);
  }
  const cleared = complete([{ id: 'clear-all', fieldCollection: Object.keys(values)
    .map((name) => ({ name, jsonValue: nativeField(name, name === 'icon' ? {} : '') })) }]);
  assert.doesNotMatch(render(cleared), /<h[1-6]|<p>|<img|<svg|Authored|scEmpty/);
  const editing = render(cleared, { isEditing: true });
  assert.match(editing, /\[No text in field\]/);
  assert.match(editing, /scEmptyImage/);
  assert.equal(metadata(editing).length, 3);
});

test('only RenderingIdentifier affects each fixed variant; root and kitchen-sink child fields are ignored', () => {
  const params = { theme: 'primary-brand', columns: '4', alignment: 'right', headingLevel: 'h1',
    spacing: 'lg', paddingTop: 'xl', paddingBottom: 'none', marginBottom: 'none', styles: 'unused-style' };
  const decorated = { ...fixtures.twoUp, heading: { jsonValue: { value: 'Unused root heading' } },
    body: { jsonValue: { value: '<p>Unused root body</p>' } }, children: { ...fixtures.twoUp.children,
      results: fixtures.twoUp.children.results.map((entry) => ({ ...entry,
        subheading: { jsonValue: { value: 'Unused subheading' } }, link: { jsonValue: { value: { href: '/unused', text: 'Unused link' } } },
        theme: { jsonValue: { value: 'primary-brand' } }, headingLevel: { jsonValue: { value: 'h1' } } })) } };
  for (const variant of ['Default', 'TwoUp', 'TwoUpFinal', 'ThreeUp']) {
    assert.equal(render(decorated, { variant, params }), render(fixtures.twoUp, { variant }));
    assert.doesNotMatch(render(decorated, { variant, params, isEditing: true }), /Unused|unused-style|unused-link|<h1/);
    assert.match(render(decorated, { variant, params: { ...params, RenderingIdentifier: 'authored-benefits' } }), /id="authored-benefits"/);
  }
});

test('missing/incomplete collections fail closed and complete empty collections have meaningful author guidance', () => {
  const incomplete = [ {}, { children: {} }, { children: { results: fixtures.twoUp.children.results } },
    { children: { total: 2, pageInfo: {}, results: fixtures.twoUp.children.results } },
    { children: { total: 3, pageInfo: { hasNext: false }, results: fixtures.twoUp.children.results } },
    { children: { total: 2, pageInfo: { hasNext: true, endCursor: 'more' }, results: fixtures.twoUp.children.results } },
    { children: { total: 0.5, pageInfo: { hasNext: false }, results: [] } } ];
  for (const datasource of incomplete) {
    assert.equal(render(datasource), '');
    const editing = render(datasource, { isEditing: true });
    assert.match(editing, /could not load every benefit/);
    assert.match(editing, /role="status"/);
    assert.doesNotMatch(editing, /Accumulation|Tax-deferred|<article/);
    assert.deepEqual(metadata(editing), []);
  }
  for (const isEditing of [false, true]) {
    assert.match(render(undefined, { isEditing, omitFields: true }), /Add a datasource for Product Benefits/);
  }
  assert.match(render(complete([]), { isEditing: true }), /Add a benefit child item/);
  assert.doesNotMatch(render(complete([])), /Add a benefit child item/);
});

test('the compact query declares full child count and page metadata without root author fields', () => {
  const query = fs.readFileSync(path.resolve(directory, '../product-benefits.graphql'), 'utf8');
  const operation = parse(query).definitions[0];
  assert.equal(operation.name.value, 'ProductBenefitsData');
  assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
  const root = operation.selectionSet.selections[0];
  assert.equal(root.alias.value, 'datasource');
  assert.deepEqual(root.selectionSet.selections.map((entry) => entry.name.value), ['id', 'children']);
  const children = root.selectionSet.selections[1];
  assert.deepEqual(children.selectionSet.selections.map((entry) => entry.name.value), ['total', 'pageInfo', 'results']);
  assert.deepEqual(children.selectionSet.selections[1].selectionSet.selections.map((entry) => entry.name.value), ['hasNext', 'endCursor']);
  const results = children.selectionSet.selections[2];
  assert.deepEqual(results.selectionSet.selections.map((entry) => entry.name.value), ['id', 'fields']);
  assert.equal(results.selectionSet.selections[1].alias.value, 'fieldCollection');
  assert.deepEqual(results.selectionSet.selections[1].arguments, []);
  assert.deepEqual(results.selectionSet.selections[1].selectionSet.selections.map((entry) => entry.name.value), ['name', 'jsonValue']);
});

test('external SDK images retain the source black 26/40px icon treatment in scoped CSS', () => {
  const css = fs.readFileSync(path.resolve(directory, '../ProductBenefits.css'), 'utf8');
  assert.match(css, /\.allianz-product-benefits \.tileIcon img\s*\{\s*width: 26px;/);
  assert.match(css, /filter: brightness\(0\) invert\(23\.5294%\)/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*width: 40px;/);
});
