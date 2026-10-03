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

// Adapt the established loader; field renderers and authoring provider remain real SDK code.
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

const { Default } = loadSource(path.resolve(directory, '../ProductTypeChoices.tsx'));
const { productTypeChoiceFields } = loadSource(path.resolve(directory, '../product-type-choices-fields.props.ts'));
const read = (filename) => fs.readFileSync(path.join(directory, filename), 'utf8');
const fixture = JSON.parse(read('native-fixtures.json')).default;
const evidence = JSON.parse(read('native-receipt-evidence.json'));
const source = read('product-type-choices.source.html');
const complete = (entries) => ({ children: {
  total: entries.length, pageInfo: { hasNext: false, endCursor: null }, results: entries,
} });

function render(datasource, { params = {}, isEditing = false, omitFields = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Annuities', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Default, {
    params, ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}

const nativeField = (name, value, itemId = 'synthetic-authored-choice') => ({ value, metadata: {
  fieldId: `synthetic-${name}`, fieldType: name === 'image' ? 'Image' : name === 'link' ? 'General Link'
    : name === 'body' ? 'Rich Text' : 'Single-Line Text', itemId,
} });
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('native fixture preserves root/two child IDs, exact native values and unresolved media state', () => {
  const root = 'route:/what-we-offer/annuities:component:7:AllianzCardGrid';
  assert.equal(fixture.id, evidence.bindings[root].itemId);
  fixture.children.results.forEach((child, index) => {
    const original = evidence.bindings[`${root}:entry:${index + 1}`];
    assert.equal(child.id, original.itemId);
    for (const field of original.reviewedFields) {
      const fixtureField = child.fieldCollection.find((entry) => entry.name === field.name);
      if (field.name !== 'link') assert.equal(fixtureField.jsonValue.value, field.value);
      else {
        assert.ok(field.value.includes(`id="${fixtureField.jsonValue.value.id}"`));
        assert.ok(field.value.includes(`text="${fixtureField.jsonValue.value.text}"`));
        assert.ok(source.includes(`href="${fixtureField.jsonValue.value.href}"`));
      }
    }
    assert.equal(productTypeChoiceFields(child).image, undefined);
  });
  assert.match(evidence.mediaStatus, /Pending\/unbound/);
  assert.doesNotMatch(render(fixture), /<img|scEmptyImage|tile-azl-fixed|tile-azl-annuities/);
});

test('fixed two-up blue choices match source flipped white h4/md cards and source arrow links', () => {
  const html = render(fixture);
  for (const classes of ['l-container--full-width t-bg-blue-soft axlTileCollection allianz-product-type-choices',
    'l-grid l-grid--max-width', 'l-grid__row match-height-row u-padding-bottom-xl',
    'l-grid__column-medium-6', 'm-axlTile match-height -is--flipped tile--stackedImage -is--stacked t-bg-primary-white',
    'tileContent u-text-left', 'tileSubGrid__content', 'tileHeading', 'tileBody u-font-size-md',
    'tileLink', 'a-link', 'a-link__icon', 'a-link__text']) {
    assert.ok(html.includes(`class="${classes}"`), classes);
  }
  assert.equal((html.match(/<article /g) || []).length, 2);
  for (const child of fixture.children.results) {
    const choice = productTypeChoiceFields(child);
    assert.ok(source.includes(`<H4>${choice.heading.jsonValue.value}</H4>`));
    assert.ok(html.includes(`<h4>${choice.heading.jsonValue.value}</h4>`));
    assert.ok(html.includes(choice.body.jsonValue.value));
    assert.ok(html.includes(`href="${choice.link.jsonValue.value.href}"`));
    assert.ok(html.includes(choice.link.jsonValue.value.text));
  }
  const sourceArrow = source.match(/titleIconArrowRight[\s\S]*?<path fill-rule="evenodd" d="([^"]+)"/)[1];
  assert.ok(html.includes(`d="${sourceArrow}"`));
  assert.doesNotMatch(html, /no-gutters-outer|u-row-spacing|u-text-center|<h[12356]|tileIcon/);
});

test('compact projection retains entire native payload and jsonValue identity with canonical cleared precedence', () => {
  const fields = { heading: nativeField('heading', 'Compact heading'), body: nativeField('body', '<p>Compact body</p>'),
    image: nativeField('image', { src: '/allianz-assets/authored.jpg', alt: 'Authored' }),
    link: nativeField('link', { href: '/what-we-offer/annuities', text: 'Authored link' }) };
  const compact = { id: 'projected', ancillary: { value: 'Preserved ancillary data' },
    children: { total: 0, pageInfo: { hasNext: false }, results: [] },
    fieldCollection: [...Object.entries(fields).map(([name, jsonValue]) => ({ name: name.toUpperCase(), jsonValue })),
      { name: 'icon', jsonValue: fields.image }, { name: 'theme', jsonValue: { value: 'primary-brand' } }, null, {}] };
  const before = JSON.stringify(compact);
  const projected = productTypeChoiceFields(compact);
  assert.equal(projected.fieldCollection, compact.fieldCollection);
  assert.equal(projected.ancillary, compact.ancillary);
  assert.equal(projected.children, compact.children);
  assert.equal(projected.icon, undefined);
  assert.equal(projected.theme, undefined);
  for (const name of Object.keys(fields)) {
    assert.equal(projected[name].jsonValue, fields[name]);
    const cleared = { jsonValue: nativeField(name, name === 'image' || name === 'link' ? {} : '') };
    assert.equal(productTypeChoiceFields({ ...compact, [name]: cleared })[name], cleared);
    assert.equal(productTypeChoiceFields({ ...compact, [name]: undefined })[name], undefined);
  }
  assert.equal(JSON.stringify(compact), before);
});

test('real SDK keeps block HTML intact, renders image after content and edits all four authored fields', () => {
  const itemId = 'synthetic-authored-choice';
  const body = '<p>Authored <strong>copy</strong>.</p><ul><li>One</li><li>Two</li></ul><div><p>Second block.</p></div>';
  const fields = { heading: nativeField('heading', 'Authored <em>heading</em>', itemId),
    body: nativeField('body', body, itemId), image: nativeField('image', { src: '/allianz-assets/authored.jpg', alt: 'Authored image' }, itemId),
    link: nativeField('link', { href: '/what-we-offer/annuities', text: 'Authored link' }, itemId) };
  const datasource = complete([{ id: itemId, fieldCollection: Object.entries(fields)
    .map(([name, jsonValue]) => ({ name, jsonValue })) }]);
  const before = JSON.stringify(datasource);
  const html = render(datasource);
  assert.ok(html.includes(body));
  assert.match(html, /<h4>Authored &lt;em&gt;heading&lt;\/em&gt;<\/h4>/);
  assert.match(html, /class="c-image__img c-teaser__image-img"/);
  assert.match(html, /src="\/allianz-assets\/authored.jpg"/);
  assert.ok(html.indexOf('class="tileImage"') > html.indexOf('class="tileLink"'));
  assert.doesNotMatch(html, /<p[^>]*class="tileBody|<p[^>]*><ul|<p[^>]*><div/);
  assert.deepEqual(metadata(html), []);
  const editing = render(datasource, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
    ['synthetic-body', 'synthetic-heading', 'synthetic-image', 'synthetic-link']);
  assert.ok(metadata(editing).every((field) => field.itemId === itemId));
  assert.equal(JSON.stringify(datasource), before);
});

test('independent and combined field clearing retain editable chrome without restoring compact content', () => {
  const values = { heading: 'Authored heading', body: '<p>Authored body</p>',
    image: { src: '/allianz-assets/authored.jpg', alt: 'Authored image' },
    link: { href: '/what-we-offer/annuities', text: 'Authored link' } };
  for (const name of Object.keys(values)) {
    const entry = { id: 'clear-one', fieldCollection: Object.entries(values)
      .map(([key, value]) => ({ name: key, jsonValue: nativeField(key, value) })),
    [name]: { jsonValue: nativeField(name, name === 'image' || name === 'link' ? {} : '') } };
    const datasource = complete([entry]);
    const html = render(datasource);
    assert.equal(html.includes('Authored heading'), name !== 'heading');
    assert.equal(html.includes('<p>Authored body</p>'), name !== 'body');
    assert.equal(html.includes('/allianz-assets/authored.jpg'), name !== 'image');
    assert.equal(html.includes('Authored link'), name !== 'link');
    assert.deepEqual(metadata(render(datasource, { isEditing: true })).map((field) => field.fieldId).sort(),
      ['synthetic-body', 'synthetic-heading', 'synthetic-image', 'synthetic-link']);
  }
  const cleared = complete([{ id: 'clear-all', fieldCollection: Object.keys(values)
    .map((name) => ({ name, jsonValue: nativeField(name, name === 'image' || name === 'link' ? {} : '') })) }]);
  assert.doesNotMatch(render(cleared), /<h[1-6]|<p>|<img|<svg|Authored|scEmpty|href=/);
  const editing = render(cleared, { isEditing: true });
  assert.match(editing, /\[No text in field\]/);
  assert.match(editing, /scEmptyImage/);
  assert.equal(metadata(editing).length, 4);
});

test('unsafe General Links use existing safe-link policy while authored editing fields stay untouched', () => {
  for (const href of ['javascript:alert(1)', 'https://malicious.example/collect', '/login', '/portal', '/api/private']) {
    const link = nativeField('link', { href, text: 'Unsafe authored link' });
    const datasource = complete([{ id: 'unsafe-choice', link: { jsonValue: link } }]);
    const before = JSON.stringify(datasource);
    assert.match(render(datasource), /href="#service-unavailable"/);
    const editing = render(datasource, { isEditing: true });
    assert.equal(metadata(editing)[0].fieldId, 'synthetic-link');
    assert.equal(JSON.stringify(datasource), before);
  }
});

test('only RenderingIdentifier changes the fixed UI; old root/design/icon/multilink fields stay unused', () => {
  const params = { theme: 'primary-brand', columns: '4', alignment: 'center', headingLevel: 'h1',
    spacing: 'lg', paddingTop: 'xl', paddingBottom: 'none', marginBottom: 'xl', styles: 'unused-style' };
  const decorated = { ...fixture, heading: { jsonValue: { value: 'Unused root' } }, body: { jsonValue: { value: '<p>Unused body</p>' } },
    children: { ...fixture.children, results: fixture.children.results.map((entry) => ({ ...entry,
      subheading: { jsonValue: { value: 'Unused subheading' } }, icon: { jsonValue: { value: { src: '/unused.svg' } } },
      links: { targetItems: [{ id: 'unused', link: { jsonValue: { value: { href: '/unused', text: 'Unused link' } } } }] },
      headingLevel: { jsonValue: { value: 'h1' } }, theme: { jsonValue: { value: 'primary-brand' } } })) } };
  assert.equal(render(decorated, { params }), render(fixture));
  assert.doesNotMatch(render(decorated, { params, isEditing: true }), /Unused|unused.svg|unused-style|<h1/);
  assert.match(render(decorated, { params: { ...params, RenderingIdentifier: 'authored-choices' } }), /id="authored-choices"/);
});

test('partial/missing pagination fails closed and complete empty collections give author guidance', () => {
  for (const datasource of [{}, { children: {} }, { children: { results: fixture.children.results } },
    { children: { total: 2, pageInfo: {}, results: fixture.children.results } },
    { children: { total: 3, pageInfo: { hasNext: false }, results: fixture.children.results } },
    { children: { total: 2, pageInfo: { hasNext: true, endCursor: 'more' }, results: fixture.children.results } },
    { children: { total: -1, pageInfo: { hasNext: false }, results: [] } }]) {
    assert.equal(render(datasource), '');
    const editing = render(datasource, { isEditing: true });
    assert.match(editing, /could not load every choice/);
    assert.match(editing, /role="status"/);
    assert.doesNotMatch(editing, /Fixed index|Registered index|<article/);
    assert.deepEqual(metadata(editing), []);
  }
  for (const isEditing of [false, true]) assert.match(render(undefined, { isEditing, omitFields: true }),
    /Add a datasource for Product Type Choices/);
  assert.match(render(complete([]), { isEditing: true }), /Add a product type choice child item/);
  assert.doesNotMatch(render(complete([])), /Add a product type choice child item/);
});

test('compact GraphQL selects only native children, total/pageInfo and fieldCollection jsonValue', () => {
  const query = fs.readFileSync(path.resolve(directory, '../product-type-choices.graphql'), 'utf8');
  const operation = parse(query).definitions[0];
  assert.equal(operation.name.value, 'ProductTypeChoicesData');
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
