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
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const modules = new Map();

// Transpile only local source files in memory. Field components and the provider
// are the real installed SDK; there are no mocked field renderers or network calls.
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    let local;
    if (specifier.startsWith('.')) local = path.resolve(path.dirname(filename), specifier);
    if (/^(components|lib)\//.test(specifier)) local = path.join(sourceRoot, specifier);
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText, filename);
  return compiled.exports;
}

const helpers = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const componentNames = ['Hero', 'RichText', 'CardGrid', 'Article', 'CTA', 'Accordion'];
const folderNames = ['hero', 'rich-text', 'card-grid', 'article', 'cta', 'accordion'];
const components = Object.fromEntries(componentNames.map((name, index) => [name,
  loadSource(path.join(sourceRoot, `components/allianz-${folderNames[index]}/Allianz${name}.tsx`)).Default,
]));

function field(id, type, value) {
  return { jsonValue: { value, metadata: { fieldId: id, fieldType: type, itemId: 'native-datasource' } } };
}
function text(id) { return field(id, 'Single-Line Text', ''); }
function rich(id) { return field(id, 'Rich Text', ''); }
function image(id) { return field(id, 'Image', {}); }
function link(id) { return field(id, 'General Link', {}); }
function render(component, datasource, layout, isEditing, omitFields = false, renderingParams = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: {
      mode: { isEditing, isNormal: !isEditing, isPreview: false },
      siteName: 'allianzlife',
      layout: { sitecore: { context: {}, route: { name: 'Offline test', fields: {}, placeholders: {} } } },
    },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component, {
    params: { layout, columns: '3', theme: 'transparent', headingLevel: 'h2', alignment: 'center', ...renderingParams },
    ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}
function metadataIds(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId)
    .sort();
}
function expectNativeFields(html, expectedIds) {
  assert.deepEqual(metadataIds(html), [...expectedIds].sort());
  assert.match(html, /\[No text in field\]/);
  assert.doesNotMatch(html, /href="\/"/);
}

const hero = {
  heading: rich('hero-heading'), body: rich('hero-body'), eyebrow: text('hero-eyebrow'),
  desktopImage: image('hero-desktop'), mobileImage: image('hero-mobile'),
  primaryLink: link('hero-primary'), secondaryLink: link('hero-secondary'),
};
const introduction = {
  heading: text('intro-heading'), subheading: rich('intro-subheading'),
  body: rich('intro-body'), primaryLink: link('intro-primary'),
};
const card = {
  id: 'native-card', heading: text('card-heading'), subheading: rich('card-subheading'),
  body: rich('card-body'), image: image('card-image'), icon: image('card-icon'),
  alphanumeral: text('card-alphanumeral'), link: link('card-link'),
};
const cases = [
  ['Hero', 'home', hero, ['hero-heading', 'hero-body', 'hero-eyebrow', 'hero-desktop', 'hero-mobile', 'hero-primary', 'hero-secondary']],
  ['Hero', 'product', hero, ['hero-heading', 'hero-body', 'hero-desktop', 'hero-mobile', 'hero-primary']],
  ['RichText', 'introduction', introduction, ['intro-heading', 'intro-subheading', 'intro-body', 'intro-primary']],
  ['RichText', 'rich-text', introduction, ['intro-body']],
  ['RichText', 'disclosures', introduction, ['intro-body']],
  ['Article', 'article', { heading: text('article-heading'), summary: rich('article-summary'), body: rich('article-body') }, ['article-heading', 'article-summary', 'article-body']],
  ['CTA', 'cta', { heading: text('cta-heading'), body: rich('cta-body'), link: link('cta-link') }, ['cta-heading', 'cta-body', 'cta-link']],
  ['Accordion', 'accordion', { heading: text('accordion-heading'), primaryLink: link('accordion-link'), children: { results: [{ id: 'entry', heading: text('entry-heading'), body: rich('entry-body') }] } }, ['accordion-heading', 'accordion-link', 'entry-heading', 'entry-body']],
  ...['stacked', 'image-left', 'image-right', 'bordered'].map((layout) => ['CardGrid', layout,
    { ...introduction, children: { results: [card] } },
    ['intro-heading', 'intro-subheading', 'intro-body', 'intro-primary', 'card-heading', 'card-subheading', 'card-body', 'card-image', 'card-icon', 'card-alphanumeral', 'card-link'],
  ]),
  ['CardGrid', 'cards', { ...introduction, children: { results: [card] } }, ['intro-heading', 'intro-subheading', 'intro-body', 'intro-primary', 'card-heading', 'card-body', 'card-image', 'card-link']],
  ['CardGrid', 'list', { children: { results: [card] } }, ['card-heading', 'card-body', 'card-link']],
];

for (const [name, layout, datasource, expectedIds] of cases) {
  test(`${name} ${layout}: cleared native fields retain SDK authoring metadata`, () => {
    const html = render(components[name], datasource, layout, true);
    expectNativeFields(html, expectedIds);
    if (name === 'Accordion') {
      assert.match(html, /aria-expanded="true"/);
      assert.doesNotMatch(html, /class="c-accordion__item-content" hidden/);
    }
    if (expectedIds.some((id) => /image|desktop|mobile|icon/.test(id))) assert.match(html, /scEmptyImage/);
  });
  test(`${name} ${layout}: normal mode omits empty native controls`, () => {
    const html = render(components[name], datasource, layout, false);
    assert.deepEqual(metadataIds(html), []);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|href="\/"/);
    assert.doesNotMatch(html, /class="a-link"/);
    if (name === 'Accordion') assert.match(html, /aria-expanded="false"/);
  });
}

for (const name of componentNames) {
  for (const isEditing of [false, true]) {
    test(`${name}: missing datasource fallback (${isEditing ? 'editing' : 'normal'})`, () => {
      for (const omitFields of [false, true]) {
        const html = render(components[name], undefined, 'stacked', isEditing, omitFields);
        assert.match(html, new RegExp(`Add a datasource for Allianz${name}\\.`));
        assert.match(html, /class="allianz-missing-data" role="status"/);
        assert.deepEqual(metadataIds(html), []);
      }
      // The missing-data fallback also remains usable outside a provider.
      const html = renderToStaticMarkup(React.createElement(components[name], { params: {} }));
      assert.match(html, new RegExp(`Add a datasource for Allianz${name}\\.`));
    });
  }
}

test('field state preserves real metadata and never invents missing authoring fields', () => {
  for (const shouldRender of [helpers.shouldRenderTextField, helpers.shouldRenderImageField, helpers.shouldRenderLinkField]) {
    assert.equal(shouldRender(undefined, true), false);
    assert.equal(shouldRender(undefined, false), false);
  }
  const cleared = link('native-link').jsonValue;
  assert.strictEqual(helpers.allianzLinkField(cleared, true), cleared);
  assert.strictEqual(helpers.allianzLinkField(cleared, false), cleared);
  assert.deepEqual(helpers.allianzLinkField(undefined, true), { value: { href: '' } });
  const populated = { ...cleared, value: { href: 'https://www.allianzlife.com/about', text: 'Annuities' } };
  assert.strictEqual(helpers.allianzLinkField(populated, true), populated);
  assert.equal(helpers.allianzLinkField(populated, false).value.href, '/about');
  assert.strictEqual(helpers.allianzLinkField(populated, false).metadata, populated.metadata);
  assert.equal(helpers.shouldRenderTextField({ value: 'Title' }, false), true);
  assert.equal(helpers.shouldRenderImageField({ value: { src: '/test.png' } }, false), true);
  assert.equal(helpers.shouldRenderLinkField(populated, false), true);
});

test('empty link collection entries keep each SDK link field editable', () => {
  const grid = { children: { results: [{ ...card, links: { targetItems: [
    { id: 'first', link: link('collection-first') }, { id: 'second', link: link('collection-second') },
  ] } }] } };
  const html = render(components.CardGrid, grid, 'stacked', true);
  expectNativeFields(html, ['card-heading', 'card-subheading', 'card-body', 'card-image', 'card-icon', 'card-alphanumeral', 'collection-first', 'collection-second']);
  assert.doesNotMatch(render(components.CardGrid, grid, 'stacked', false), /class="tileLink"/);
});

test('populated links keep the source CTA SVG and normal safety mapping', () => {
  const grid = { children: { results: [{ ...card,
    link: { jsonValue: { value: { href: 'https://www.allianzlife.com/about', text: 'Learn more' } } },
  }] } };
  const html = render(components.CardGrid, grid, 'stacked', false);
  assert.match(html, /<a[^>]*href="\/about"/);
  assert.match(html, /<a[^>]*class="a-link"/);
  assert.match(html, /class="a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"/);
  assert.match(html, /d="M23\.8863661,13\.0726536 C24\.037878/);
  assert.match(html, /class="a-link__text">Learn more<\/span>/);
});

test('all migrated fixtures still render normally using the real SDK', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'content/fixtures.json'), 'utf8'));
  const byRenderingName = Object.fromEntries(componentNames.map((name) => [`Allianz${name}`, components[name]]));
  let count = 0;
  for (const route of Object.values(fixtures.routes)) {
    for (const rendering of route.components) {
      const component = byRenderingName[rendering.componentName];
      if (!component) continue;
      const html = render(component, rendering.fields?.data?.datasource, rendering.params.layout, false, false, rendering.params);
      assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|allianz-missing-data/);
      count += 1;
    }
  }
  assert.ok(count > 50, `Only ${count} fixtures were exercised`);
});
