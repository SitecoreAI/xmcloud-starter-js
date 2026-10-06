import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('../../../', import.meta.url));
const componentMap = new Map();
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Section = loadSource(path.join(sourceRoot, 'components/allianz-editorial-section/AllianzEditorialSection.tsx'));
componentMap.set('AllianzCardGrid', Cards);
const fixture = JSON.parse(fs.readFileSync(new URL('./editorial-legal.fixture.json', import.meta.url)));
const source = fs.readFileSync(new URL('./editorial-legal.source.html', import.meta.url), 'utf8');
const sha = (value) => createHash('sha256').update(value).digest('hex');
const count = (html, re) => [...html.matchAll(re)].length;
const text = (html) => html.replace(/<\/(?:h[1-6]|p|div|header)>|<br\b[^>]*>/gi, ' ').replace(/<[^>]*>/g, '').replaceAll('&sect;', '§').replaceAll('&rsquo;', '’').replaceAll('&amp;', '&').replaceAll('&nbsp;', ' ').replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
const sourceArticles = [...source.matchAll(/<article\b[^>]*>([^]*?)<\/article>/g)].map((m) => m[0]);
const page = (editing = false) => ({ mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Legal test', fields: {}, placeholders: {} } } } });
function field(name, value, item = 'test-only-legal') {
  return { jsonValue: { value, metadata: { itemId: item, fieldId: `test-only-${name}`, fieldType: ['body', 'subheading'].includes(name) ? 'Rich Text' : 'Single-Line Text' } } };
}
function data(placement, native = false) {
  const raw = placement.fields;
  return { heading: field('heading', raw.heading), body: field('body', raw.body), children: { results: raw.children.map((card, i) => {
    const entries = Object.entries(card).filter(([name]) => ['heading', 'subheading', 'body', 'headingLevel'].includes(name));
    const id = `test-only-card-${i}`;
    return native ? { id, fieldCollection: entries.map(([name, value]) => ({ name, jsonValue: field(name, value, id).jsonValue })) }
      : { id, ...Object.fromEntries(entries.map(([name, value]) => [name, field(name, value, id)])) };
  }) } };
}
function props(datasource, editing = false, params = {}) { return { fields: { data: { datasource } }, params, page: page(editing), rendering: { uid: 'test-only-legal-rendering' } }; }
function render(Component, input) { return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page: input.page, api: {}, componentMap, loadImportMap: async () => ({}) }, React.createElement(Component, input))); }
function section(editing = false, native = true) {
  const params = { ...fixture.section.params, DynamicPlaceholderId: '71' };
  const children = fixture.placements.map((placement, i) => ({ uid: `test-only-placement-${i}`, componentName: placement.componentName, params: { ...placement.params, FieldNames: placement.variant }, dataSource: `test-only-datasource-${i}`, fields: { data: { datasource: data(placement, native) } } }));
  return { ...props(undefined, editing, params), rendering: { uid: 'test-only-section', componentName: 'AllianzEditorialSection', params, placeholders: { 'allianz-editorial-section-{*}': children } } };
}

test('source witness has exactly two contained independent source rows, h1/h2, no assets and trailing empty disclosures', () => {
  assert.equal(sourceArticles.length, 2);
  assert.equal(count(source, /class="l-container\s/g), 1);
  assert.match(source, /l-grid l-grid--max-width l-grid--no-gutters-outer/);
  assert.match(source, /l-grid__row u-margin-bottom-lg u-padding-top-lg/);
  assert.match(source, /l-grid__row\s+u-margin-bottom-xl/);
  assert.match(sourceArticles[0], /<h1>/i); assert.match(sourceArticles[1], /<h2>/i);
  for (const article of sourceArticles) {
    assert.match(article, /m-axlIntroductionBlock -is--stacked -no--image/);
    assert.match(article, /class="tileBody"/);
    assert.doesNotMatch(article, /<img|<svg|class="tileImage"/);
  }
  assert.match(source, /a-axlDisclosures[^]*?col-md-12 content-body disclosure/);
});
test('two native fixtures preserve complete source text and source order without duplicate New York copy', () => {
  assert.equal(fixture.placements.length, 2);
  for (const [index, placement] of fixture.placements.entries()) {
    assert.equal(placement.fields.children.length, 1);
    const card = placement.fields.children[0];
    assert.equal(text(sourceArticles[index]), text(`${card.heading} ${card.subheading} ${card.body}`));
    assert.equal(card.headingLevel, index === 0 ? 'h1' : 'h2');
  }
  assert.equal(fixture.placements.filter((p) => p.fields.children[0].heading.includes('New York')).length, 1);
});
test('real SDK shared section emits one contained grid, two independently spaced introduction rows and exact copy', () => {
  const input = section(); const children = input.rendering.placeholders['allianz-editorial-section-{*}']; const before = JSON.stringify(children);
  const html = render(Section.Default, input);
  assert.equal(count(html, /class="l-container /g), 1);
  assert.equal(count(html, /class="l-grid l-grid--max-width l-grid--no-gutters-outer"/g), 1);
  assert.equal(count(html, /class="l-grid__row /g), 2);
  assert.match(html, /class="l-grid__row u-padding-top-lg u-margin-bottom-lg"/);
  assert.match(html, /class="l-grid__row u-margin-bottom-xl"/);
  assert.equal(count(html, /class="l-grid__column-medium-12"/g), 2);
  assert.equal(count(html, /m-axlIntroductionBlock -is--stacked -no--image/g), 2);
  assert.equal(count(html, /<h1>/g), 1); assert.equal(count(html, /<h2>/g), 1);
  assert.equal(count(html, /class="tileBody"/g), 2);
  assert.doesNotMatch(html, /match-height|m-axlTile|u-font-size|<img|<svg|tileIcon|<footer|l-container--full-width/);
  const articles = [...html.matchAll(/<article\b[^>]*>([^]*?)<\/article>/g)].map((m) => m[0]);
  articles.forEach((article, i) => assert.equal(text(article), text(sourceArticles[i])));
  // The real SDK resolves the wildcard placeholder key in normal mode.
  // Native child rendering objects and their field metadata remain unchanged.
  assert.equal(JSON.stringify(children), before);
});
test('real SDK editing has native placeholder/rendering chrome and all heading/subheading/body field markers', () => {
  const input = section(true); const before = JSON.stringify(input); const html = render(Section.Default, input);
  assert.match(html, /chrometype="placeholder"/);
  assert.equal(count(html, /chrometype="rendering"/g), 4);
  for (const name of ['heading', 'subheading', 'body']) assert.equal(count(html, new RegExp(`fieldId&quot;:&quot;test-only-${name}&quot;`, 'g')), 2);
  for (const p of fixture.placements) assert.ok(html.includes(p.fields.children[0].body));
  assert.equal(JSON.stringify(input), before);
});
test('named query and compact modern fieldCollection render the same source output', () => {
  for (const p of fixture.placements) for (const editing of [false, true]) {
    assert.equal(render(Cards.EditorialLegal, props(data(p), editing, p.params)), render(Cards.EditorialLegal, props(data(p, true), editing, p.params)));
  }
});
test('clear and restore preserves genuine editable fields with no stale content or mutation', () => {
  for (const p of fixture.placements) {
    const d = data(p, true); const original = structuredClone(d); const expected = render(Cards.EditorialLegal, props(d, false, p.params));
    for (const f of d.children.results[0].fieldCollection) if (f.name !== 'headingLevel') f.jsonValue.value = '';
    const before = JSON.stringify(d); const normal = render(Cards.EditorialLegal, props(d, false, p.params));
    assert.doesNotMatch(normal, /<h[1-6]\b|class="tileBody"|Confidentiality|New York/);
    const editing = render(Cards.EditorialLegal, props(d, true, p.params));
    for (const name of ['heading', 'subheading', 'body']) assert.match(editing, new RegExp(`test-only-${name}`));
    assert.equal(JSON.stringify(d), before);
    d.children.results[0].fieldCollection = original.children.results[0].fieldCollection;
    assert.equal(render(Cards.EditorialLegal, props(d, false, p.params)), expected);
  }
});
test('explicit canonical clears override populated fieldCollection values', () => {
  const p = fixture.placements[0]; const d = data(p, true); const card = d.children.results[0];
  card.heading = field('heading', ''); card.subheading = field('subheading', ''); card.body = field('body', '');
  const h = render(Cards.EditorialLegal, props(d, false, p.params));
  assert.doesNotMatch(h, /Confidentiality|Several state laws|<h1/);
  assert.match(render(Cards.EditorialLegal, props(d, true, p.params)), /test-only-body/);
});
test('missing datasource uses the existing fallback and an authored empty list remains empty', () => {
  for (const editing of [false, true]) {
    assert.match(render(Cards.EditorialLegal, props(undefined, editing)), /Add a datasource for AllianzCardGrid/);
    const h = render(Cards.EditorialLegal, props({ children: { results: [] } }, editing));
    assert.doesNotMatch(h, /<article|<h1|<h2|Confidentiality/);
  }
});
test('authored h1 through h6 remain semantic; invalid/missing levels fall back to h2 without class injection', () => {
  for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '', '<evil>']) {
    const d = data(fixture.placements[0]); d.children.results[0].headingLevel = field('headingLevel', level);
    const expected = /^h[1-6]$/.test(level) ? level : 'h2';
    assert.match(render(Cards.EditorialLegal, props(d)), new RegExp(`<${expected}>Confidentiality`));
  }
  const d = data(fixture.placements[0]); delete d.children.results[0].headingLevel;
  assert.match(render(Cards.EditorialLegal, props(d, false, { headingLevel: 'h1' })), /<h1>/);
  const h = render(Cards.EditorialLegal, props(d, false, { container: 'content', theme: 'evil', sectionWidth: 'evil', columns: '3', bodySize: 'extra-large', spacing: 'xl', introSpacer: '1', sectionSpacing: '1', paddingTop: '<evil>', marginBottom: '<evil>' }));
  assert.match(h, /class="l-container t-bg-transparent axlTileCollection"/);
  assert.doesNotMatch(h, /evil|u-font-size|u-padding|u-margin|u-row-spacing/);
});
test('no-media contract ignores stale unrelated card and grid content, even in editing', () => {
  const d = data(fixture.placements[0]); d.heading = field('heading', 'Stale grid heading');
  Object.assign(d.children.results[0], { image: field('image', { src: '/stale.jpg' }), icon: field('icon', { src: '/stale.svg' }), alphanumeral: field('alphanumeral', 'Stale number'), link: field('link', { href: '/stale', text: 'Stale link' }) });
  for (const editing of [false, true]) assert.doesNotMatch(render(Cards.EditorialLegal, props(d, editing)), /Stale|<img|<svg|tileIcon|tileImage/);
});
test('visitor service policy disables source mail and phone while editing preserves exact SDK source objects', () => {
  const d = data(fixture.placements[0]); const raw = '<p><a href="mailto:privacy@example.invalid">Email</a> <a href="tel:8005550000" target="_blank">Phone</a> <a href="/about?a=1&amp;a=2#x" target="_blank" rel="author">About</a></p>';
  d.children.results[0].body = field('body', raw); const before = JSON.stringify(d);
  const normal = render(Cards.EditorialLegal, props(d));
  assert.doesNotMatch(normal, /href="mailto:|href="tel:/); assert.match(normal, /#service-unavailable/);
  assert.match(normal, /href="\/about\?a=1&amp;a=2#x" target="_blank" rel="author noopener noreferrer"/);
  assert.ok(render(Cards.EditorialLegal, props(d, true)).includes(raw)); assert.equal(JSON.stringify(d), before);
});
test('modern Default and EditorialIntro keep their distinct baseline markup and heading semantics', () => {
  const d = { children: { results: fixture.placements.map((p) => data(p).children.results[0]) } };
  const params = { theme: 'transparent', layout: 'stacked', columns: '1', alignment: 'left', spacing: 'none', headingLevel: 'h4' };
  const normal = render(Cards.Default, props(d, false, params));
  assert.match(normal, /l-container--full-width/); assert.match(normal, /m-axlTile match-height/); assert.match(normal, /match-height-row/);
  assert.equal(count(normal, /<h1>/g), 1); assert.equal(count(normal, /<h2>/g), 1); assert.match(normal, /tileBody u-font-size-md/);
  const intro = render(Cards.EditorialIntro, props(d, false, params));
  assert.doesNotMatch(intro, /<h1>/); assert.equal(count(intro, /<h2>/g), 2); assert.match(intro, /allianz-editorial-cards/);
  const file = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'), 'utf8');
  const marker = '\n/** Native no-media introduction rows with authored heading semantics.';
  assert.ok(file.includes(marker));
  assert.equal(sha(file.slice(0, file.indexOf(marker))), '77ccea54549549768de75a11130a71c708541914ca09e69c81e89353835e74ed');
});
