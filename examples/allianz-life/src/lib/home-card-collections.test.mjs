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
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate));
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

const ProductOfferings = loadSource(path.join(sourceRoot, 'components/product-offerings/ProductOfferings.tsx')).Default;
const HelpfulResources = loadSource(path.join(sourceRoot, 'components/helpful-resources/HelpfulResources.tsx')).Default;
const { productOfferingFields } = loadSource(path.join(sourceRoot, 'lib/product-offering-fields.ts'));
const { helpfulResourceFields } = loadSource(path.join(sourceRoot, 'lib/helpful-resource-fields.ts'));
const { collectionsComplete } = loadSource(path.join(sourceRoot, 'lib/collection-completeness.ts'));
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));
const section = (key) => content.routes['/'].components.find((entry) => entry.sourceKey === key).fields.data.datasource;
const productSource = section('/:section:3');
const resourceSource = section('/:section:6');
// This test-only capture conversion lets the fixture migrate independently.
// Production components never read historical heading/body fields.
const purposeEntry = (entry, visual) => ({ id: entry.id,
  title: entry.title ?? entry.heading, text: entry.text ?? entry.body,
  [visual]: entry[visual], link: entry.link,
});
const connection = (entries) => ({ total: entries.length,
  pageInfo: { hasNext: false, endCursor: entries.at(-1)?.id ?? null }, results: entries });
const productData = { id: productSource.id, children: connection(productSource.children.results.map((entry) => purposeEntry(entry, 'icon'))) };
const resourceData = { id: resourceSource.id, title: resourceSource.title ?? resourceSource.heading,
  children: connection(resourceSource.children.results.map((entry) => purposeEntry(entry, 'image'))) };
// Minimal public source witness from html/3177a91958996385.html (source SHA256
// 158abb5aa97f0e6f32062e362fbd8a10801a38e649b61e387359bcd2d2c5f817).
// Six exact paragraph fragments and the original arrow path; no discovery-tree dependency.
const sourceHtml = "<p>Allianz® annuities provide dependable retirement income. They can also give you accumulation potential, plus the opportunity for tax-deferred growth.</p>\n<p>Allianz® life insurance offers a death benefit for your loved ones that is generally income-tax-free. You also get flexible premium options, the opportunity to earn indexed interest, and access to your cash value.</p>\n<p>Buffered ETFs from Allianz Investment Management LLC can help hedge your retirement portfolios from market drops. They offer a downside Buffer against market swings, and equity exposure with growth potential, up to a Cap and Uncapped.</p>\n<p>Get information about our headquarters, our executive leadership, our company’s history, and more.</p>\n<p>We’re proud to be recognized as a top workplace. See our available positions and learn what it’s like to work here.</p>\n<p>Get answers to questions regarding account management, tax forms, claims, and more.</p>\n<path fill-rule=\"evenodd\" d=\"M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536\" />";

function render(Component, datasource, params = {}, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource } } })));
}

const titles = (html) => [...html.matchAll(/<h4>(.*?)<\/h4>/g)].map((match) => match[1]);
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g)].map((match) => match[1]);
const decode = (html) => html.replaceAll('&quot;', '"').replaceAll('&amp;', '&')
  .replaceAll('&reg;', '®').replaceAll('&rsquo;', '’').replaceAll('&#x27;', "'");
const wireEntry = (entry) => ({ id: entry.id, fieldCollection: Object.entries(entry)
  .filter(([name]) => name !== 'id').map(([name, field]) => ({ name, jsonValue: field.jsonValue })) });
const metadataField = (fieldId, fieldType, value, itemId = 'native-child') => ({
  value, metadata: { fieldId, fieldType, itemId },
});
const editingFieldIds = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(decode(match[1])).fieldId).sort();

test('product offerings retain captured content, h4/md wrappers, icons, order and exactly one arrow link each', () => {
  const html = render(ProductOfferings, productData);
  assert.deepEqual(titles(html), ['Annuities', 'Life insurance', 'Asset management']);
  assert.deepEqual(links(html), ['/what-we-offer/annuities', '/what-we-offer/life-insurance', '#service-unavailable']);
  assert.match(html, /class="l-container--full-width t-bg-blue-soft axlTileCollection allianz-product-offerings"/);
  assert.match(html, /class="l-grid__row match-height-row"/);
  assert.equal((html.match(/class="l-grid__column-medium-4"/g) ?? []).length, 3);
  assert.equal((html.match(/class="m-axlTile match-height -is--stacked t-bg-transparent"/g) ?? []).length, 3);
  assert.equal((html.match(/class="tileBody u-font-size-md"/g) ?? []).length, 3);
  assert.equal((html.match(/<footer><div class="tileLink"><a/g) ?? []).length, 3);
  assert.equal((html.match(/class="a-link__icon" aria-hidden="true"/g) ?? []).length, 3);
  for (const entry of productData.children.results) {
    assert.ok(decode(html).includes(entry.text.jsonValue.value));
    assert.ok(decode(sourceHtml).includes(entry.text.jsonValue.value));
    assert.ok(html.includes(`alt="${entry.icon.jsonValue.value.alt}"`));
    assert.ok(html.includes(`src="${entry.icon.jsonValue.value.src}"`));
    assert.ok(html.includes(`<span class="a-link__text">${entry.link.jsonValue.value.text}</span>`));
  }
  const sourceArrow = sourceHtml.match(/<path fill-rule="evenodd" d="(M23\.8863661[^"]+)"/)[1];
  assert.equal((html.match(new RegExp(sourceArrow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 3);
  assert.doesNotMatch(html, /<h2>|tileSubHeading|tileAlphanumeral|tileImage|o-cards|u-font-size-xl/);
});

test('helpful resources retain the source title, whole-card links, image wrappers, h4 titles and paragraph text', () => {
  const html = render(HelpfulResources, resourceData);
  assert.deepEqual(titles(html), ['About Allianz', 'Careers', 'FAQs']);
  assert.deepEqual(links(html), ['/about', '#service-unavailable', '/customer-service-frequently-asked-questions']);
  assert.match(html, /class="l-container--full-width t-bg-blue-soft allianz-helpful-resources"/);
  assert.match(html, /<header><div class="tileHeading"><h2>Other helpful resources<\/h2><\/div><\/header>/);
  assert.match(html, /class="l-grid__row u-margin-bottom-lg u-padding-top-lg"/);
  assert.match(html, /class="o-cards o-cards__col3"/);
  assert.equal((html.match(/class="m-card"/g) ?? []).length, 3);
  assert.equal((html.match(/<div class="m-card__image"><picture class="c-image"><img/g) ?? []).length, 3);
  assert.equal((html.match(/class="c-image__img c-teaser__image-img"/g) ?? []).length, 3);
  for (const entry of resourceData.children.results) {
    assert.ok(decode(html).includes(`<div class="m-card__body">${entry.text.jsonValue.value}</div>`));
    assert.ok(decode(sourceHtml).includes(entry.text.jsonValue.value));
    assert.ok(html.includes(`alt="${entry.image.jsonValue.value.alt}"`));
    assert.ok(html.includes(`src="${entry.image.jsonValue.value.src}"`));
    // General Link's captured text is not repeated beside the child fields.
    assert.ok(!decode(html).includes(entry.link.jsonValue.value.text));
  }
  assert.doesNotMatch(html, /tileSubHeading|tileSubGrid|tileLink|a-link__text|match-height-row|axlTileCollection/);
});

test('native fieldCollection rendering preserves SDK values, item order, root id and connection completeness metadata', () => {
  for (const [Component, data, project] of [
    [ProductOfferings, productData, productOfferingFields], [HelpfulResources, resourceData, helpfulResourceFields],
  ]) {
    const collected = { ...data, children: { ...data.children, results: data.children.results.map(wireEntry) } };
    const before = JSON.stringify(collected);
    assert.equal(render(Component, collected), render(Component, data));
    assert.equal(JSON.stringify(collected), before);
    assert.equal(collected.id, data.id);
    assert.deepEqual(collected.children.pageInfo, data.children.pageInfo);
    assert.equal(collectionsComplete(collected, true), true);
    for (const entry of collected.children.results) {
      const projected = project(entry);
      assert.equal(projected.fieldCollection, entry.fieldCollection);
      assert.equal(projected.id, entry.id);
      for (const field of entry.fieldCollection) assert.equal(projected[field.name].jsonValue, field.jsonValue);
    }
    const reversed = { ...data, children: connection([...data.children.results].reverse()) };
    assert.deepEqual(titles(render(Component, reversed)), [...titles(render(Component, data))].reverse());
  }
});

test('purpose projections recognize only title/text/visual/link and never restore cleared direct fields or legacy aliases', () => {
  for (const [project, visual] of [[productOfferingFields, 'icon'], [helpfulResourceFields, 'image']]) {
    const emptyTitle = metadataField('native-title', 'Single-Line Text', '');
    const nativeText = metadataField('native-text', 'Rich Text', '<p>Native text.</p>');
    const nativeImage = metadataField('native-visual', 'Image', {});
    const nativeLink = metadataField('native-link', 'General Link', { href: '', text: '' });
    const entry = { id: 'native-child', fieldCollection: [
      { name: 'Title', jsonValue: emptyTitle }, { name: 'TEXT', jsonValue: nativeText },
      { name: visual, jsonValue: nativeImage }, { name: 'Link', jsonValue: nativeLink },
      { name: 'heading', jsonValue: { value: 'Legacy title must not return' } },
      { name: 'body', jsonValue: { value: '<p>Legacy body must not return.</p>' } },
      { name: 'theme', jsonValue: { value: 'white' } }, { name: 'links', jsonValue: {} },
      { name: '__proto__', jsonValue: {} }, { name: 'constructor', jsonValue: {} },
      { name: 'subheading' }, null,
    ] };
    const projected = project(entry);
    assert.equal(projected.title.jsonValue, emptyTitle);
    assert.equal(projected.text.jsonValue, nativeText);
    assert.equal(projected[visual].jsonValue, nativeImage);
    assert.equal(projected.link.jsonValue, nativeLink);
    for (const name of ['heading', 'body', 'theme', 'links', '__proto__', 'constructor']) {
      assert.equal(Object.hasOwn(projected, name), false);
    }
    for (const cleared of [{ jsonValue: emptyTitle }, { jsonValue: undefined }, null, undefined]) {
      assert.equal(project({ ...entry, title: cleared }).title, cleared);
    }
    const legacy = { id: 'legacy', heading: { jsonValue: { value: 'Old title' } },
      body: { jsonValue: { value: '<p>Old text.</p>' } } };
    assert.equal(project(legacy).title, undefined);
    assert.equal(project(legacy).text, undefined);
    assert.equal(project({ id: 'plain' }).title, undefined);
  }
});

test('real SDK editing exposes all cleared child fields and helpful root title without fixture resurrection', () => {
  for (const [Component, visual, expectedIds] of [
    [ProductOfferings, 'icon', ['child-icon', 'child-link', 'child-text', 'child-title']],
    [HelpfulResources, 'image', ['child-image', 'child-link', 'child-text', 'child-title', 'root-title']],
  ]) {
    const data = { id: 'native-root',
      title: { jsonValue: metadataField('root-title', 'Single-Line Text', '', 'native-root') },
      heading: { jsonValue: { value: 'Old collection heading must not return' } },
      children: connection([{ id: 'native-child', fieldCollection: [
        { name: 'title', jsonValue: metadataField('child-title', 'Single-Line Text', '') },
        { name: 'text', jsonValue: metadataField('child-text', 'Rich Text', '') },
        { name: visual, jsonValue: metadataField(`child-${visual}`, 'Image', {}) },
        { name: 'link', jsonValue: metadataField('child-link', 'General Link', { href: '', text: '' }) },
        { name: 'heading', jsonValue: { value: 'Old child title must not return' } },
        { name: 'body', jsonValue: { value: '<p>Old child text must not return.</p>' } },
      ] }]) };
    const before = JSON.stringify(data);
    const editing = render(Component, data, {}, true);
    assert.deepEqual(editingFieldIds(editing), expectedIds);
    assert.match(editing, /\[No text in field\]/);
    assert.match(decode(editing), /"itemId":"native-child"/);
    assert.doesNotMatch(editing, /Annuities|About Allianz|Other helpful resources|Old collection|Old child|Add a datasource/);
    const visitor = render(Component, data);
    assert.doesNotMatch(visitor, /<img|href=|Annuities|About Allianz|Other helpful resources|Old collection|Old child/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('visitor links use the existing adapter while editing preserves raw native Link destinations and metadata', () => {
  for (const [Component, data] of [[ProductOfferings, productData], [HelpfulResources, resourceData]]) {
    const rawLink = metadataField('raw-native-link', 'General Link', {
      href: 'https://careers.allianz.com/us/en/allianz-us-life', target: '_blank', text: 'Authored link',
      querystring: 'team=life', anchor: 'jobs', linktype: 'external',
    });
    const entry = { ...data.children.results[0], link: { jsonValue: rawLink } };
    const native = { ...data, children: connection([entry]) };
    const before = JSON.stringify(rawLink);
    assert.deepEqual(links(render(Component, native)), ['#service-unavailable']);
    const editing = render(Component, native, {}, true);
    assert.deepEqual(links(editing), ['https://careers.allianz.com/us/en/allianz-us-life?team=life#jobs']);
    assert.match(editing, /target="_blank"/);
    assert.match(editing, /rel="noopener noreferrer"/);
    assert.ok(editingFieldIds(editing).includes('raw-native-link'));
    assert.equal(JSON.stringify(rawLink), before);
    const cleared = { ...native, children: connection([{ ...entry, link: { jsonValue: { ...rawLink, value: { href: '', text: '' } } },
      links: { targetItems: [{ id: 'old-link', link: data.children.results[0].link }] },
    }]) };
    assert.deepEqual(links(render(Component, cleared)), []);
    assert.deepEqual(titles(render(Component, cleared)), titles(render(Component, native)));
    if (Component === HelpfulResources) assert.match(render(Component, cleared), /<article class="m-card">/);
  }
});

test('obsolete design parameters and unrelated parent/child fields cannot change either fixed source design', () => {
  const params = { layout: 'image-left', columns: '1', alignment: 'left', theme: 'white',
    headingLevel: 'h1', spacing: 'xl', paddingTop: 'xl', paddingBottom: 'xl', marginBottom: 'xl', styles: 'redesign' };
  for (const [Component, data] of [[ProductOfferings, productData], [HelpfulResources, resourceData]]) {
    const unrelated = { ...data, heading: { jsonValue: { value: 'Unused root heading' } },
      body: { jsonValue: { value: '<p>Unused parent text.</p>' } },
      primaryLink: { jsonValue: { value: { href: '/about', text: 'Unused parent link' } } },
      children: { ...data.children, results: data.children.results.map((entry) => ({ ...entry,
        subheading: { jsonValue: { value: 'Unused subtitle' } },
        theme: { jsonValue: { value: 'primary-brand' } }, headingLevel: { jsonValue: { value: 'h1' } },
        iconTheme: { jsonValue: { value: 'primary-brand' } }, alphanumeral: { jsonValue: { value: '7' } },
        links: { targetItems: [{ id: 'redundant', link: { jsonValue: { value: { href: '/about', text: 'Unused link' } } } }] },
      })) } };
    assert.equal(render(Component, unrelated, params), render(Component, data));
    assert.match(render(Component, data, { RenderingIdentifier: 'native-home-collection' }), /id="native-home-collection"/);
  }
});

test('empty collections show only an editing explanation and never create fictional cards or author buttons', () => {
  for (const [Component, data, itemName] of [
    [ProductOfferings, productData, 'Product Offering'], [HelpfulResources, resourceData, 'Helpful Resource'],
  ]) {
    const empty = { ...data, children: connection([]) };
    const visitor = render(Component, empty);
    const editing = render(Component, empty, {}, true);
    assert.deepEqual(titles(visitor), []);
    assert.deepEqual(links(visitor), []);
    assert.doesNotMatch(visitor, /no .* child items|<button|class="m-card"|class="m-axlTile/);
    assert.ok(editing.includes(`Add a ${itemName.toLowerCase()} to this section.`));
    assert.doesNotMatch(editing, /<button|href=|class="m-card"|class="m-axlTile/);
  }
});

test('complete first40 connections retain all authored children and incomplete native connections remain detectable', () => {
  for (const [Component, data] of [[ProductOfferings, productData], [HelpfulResources, resourceData]]) {
    const entries = Array.from({ length: 40 }, (_, index) => wireEntry({ ...data.children.results[0], id: `native-${index}` }));
    const complete = { ...data, children: connection(entries) };
    assert.equal(collectionsComplete(complete, true), true);
    assert.equal(titles(render(Component, complete)).length, 40);
    assert.equal(complete.children.pageInfo.endCursor, 'native-39');
    assert.equal(collectionsComplete({ ...complete, children: { ...complete.children, total: 41, pageInfo: { hasNext: true, endCursor: 'native-39' } } }, true), false);
    assert.equal(collectionsComplete({ ...complete, children: { ...complete.children, total: 41 } }, true), false);
    assert.equal(collectionsComplete({ ...complete, children: { results: entries } }, true), false);
  }
});

test('responsive source contracts keep offerings three wide from 704px and resource cards one/two/three wide', () => {
  const sourceCss = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');
  const productCss = fs.readFileSync(path.join(sourceRoot, 'components/product-offerings/ProductOfferings.css'), 'utf8');
  assert.match(sourceCss, /\.l-grid__column-medium-4\{flex:0 0 33\.3333333333%;max-width:33\.3333333333%\}/);
  assert.match(sourceCss, /\.m-axlTile \.tileIcon svg\{width:26px;height:auto;fill:#3c3c3c\}/);
  assert.match(productCss, /\.allianz-product-offerings \.tileIcon img\s*\{\s*width: 26px;/);
  assert.match(productCss, /filter: brightness\(0\) invert\(23\.5294%\)/);
  assert.match(productCss, /@media \(min-width: 704px\)\s*\{\s*\.allianz-product-offerings \.tileIcon img\s*\{\s*width: 40px;/);
  assert.match(sourceCss, /@media \(min-width:704px\)\{\.o-cards__col3 \.m-card\{flex:0 1 46\.9%\}\}/);
  assert.match(sourceCss, /@media \(min-width:992px\)\{\.o-cards__col3 \.m-card\{flex:0 1 31\.1%\}\}/);
  assert.match(sourceCss, /\.m-card\{[^}]*flex:0 1 99%/);
});
