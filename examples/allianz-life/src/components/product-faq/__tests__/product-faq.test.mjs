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
const componentRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceRoot = path.resolve(componentRoot, '..');
const modules = new Map();

// Transpile local sources only. SDK fields and provider are real installed code.
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

const Faq = loadSource(path.join(componentRoot, 'product-faq/ProductFaq.tsx')).Default;
const Intro = loadSource(path.join(componentRoot, 'product-faq-intro/ProductFaqIntro.tsx')).Default;
const { productFaqFields } = loadSource(path.join(componentRoot, 'product-faq/product-faq-fields.props.ts'));
const faqFixture = JSON.parse(fs.readFileSync(new URL('./product-faq.receipt.json', import.meta.url)));
const introFixture = JSON.parse(fs.readFileSync(path.join(componentRoot,
  'product-faq-intro/__tests__/product-faq-intro.receipt.json')));
const source = fs.readFileSync(new URL('./product-faq.source.html', import.meta.url), 'utf8');
const sourceCss = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');

function render(Component, datasource, { params = {}, isEditing = false, instances = 1 } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Annuities', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, Array.from({ length: instances }, (_, key) => React.createElement(Component,
    { key, params, fields: { data: { datasource } } }))));
}

function native(name, value, itemId = 'native-item') {
  return { jsonValue: { value, metadata: { fieldId: `native-${name}`, itemId,
    fieldType: name === 'icon' ? 'Image' : name === 'answer' ? 'Rich Text' : 'Single-Line Text' } } };
}

function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

const connection = (results) => ({ total: results.length,
  pageInfo: { hasNext: false, endCursor: results.at(-1)?.id ?? null }, results });
const one = (entry) => ({ id: 'faq-root', children: connection([entry]) });
const decodeSource = (value) => value.replace(/&(?:rsquo|ndash|nbsp|ldquo|rdquo|frac12);/g,
  (entity) => ({ '&rsquo;': '’', '&ndash;': '–', '&nbsp;': '\u00a0', '&ldquo;': '“',
    '&rdquo;': '”', '&frac12;': '½' })[entity]);

test('receipt-derived FAQ preserves all seven actual native item IDs and exact source copy', () => {
  assert.equal(faqFixture.datasource.id, '6e889a7e-d7be-4abd-a4fc-d8ac0a5b2126');
  assert.deepEqual(faqFixture.datasource.children.results.map((entry) => entry.id), [
    '2820dcda-c64d-4f8f-addc-5ef4857da617', '39b63124-53a9-4bd9-a4fe-21bfee82d4cc',
    'f836d3ce-00cd-4851-ae41-3c08ff484907', 'c25aa1be-e398-4558-b650-fc007ae25fe1',
    '4f395e87-c192-494e-be00-063b9f6b1e9a', '3ee01cd1-9428-44f9-93ed-d9abaf40e8ee',
    '84ca3eff-befe-4f43-a40b-6adbca595804',
  ]);
  const questions = [...source.matchAll(/class="c-accordion__item-title">\s*(.*?)\s*<\/span>/g)]
    .map((match) => match[1]);
  const answers = [...source.matchAll(/class="accordionContent">\s*(<p>[\s\S]*?<\/p>)\s*<\/div>/g)]
    .map((match) => decodeSource(match[1]));
  const entries = faqFixture.datasource.children.results.map(productFaqFields);
  assert.deepEqual(entries.map((entry) => entry.question.jsonValue.value), questions);
  assert.deepEqual(entries.map((entry) => entry.answer.jsonValue.value), answers);
  const before = JSON.stringify(faqFixture.datasource);
  const html = render(Faq, faqFixture.datasource);
  assert.equal((html.match(/<button/g) || []).length, 7);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 7);
  assert.equal((html.match(/role="region"/g) || []).length, 7);
  assert.equal((html.match(/hidden=""/g) || []).length, 7);
  for (const entry of entries) assert.ok(html.includes(entry.answer.jsonValue.value));
  assert.equal(JSON.stringify(faqFixture.datasource), before);
});

test('FAQ preserves recovered spacing, grid widths, source caret and accessible native buttons', () => {
  const html = render(Faq, faqFixture.datasource);
  for (const classes of ['l-grid l-grid--max-width', 'l-grid__row u-padding-bottom-xl',
    'l-grid__column-medium-12', 'l-grid l-grid--max-width l-grid--no-gutters-mobile',
    'l-grid__row justify-content-center',
    'l-grid__column-large-10 l-grid__column-medium-12 l-grid__column-small-12 u-padding-bottom-md',
    'c-accordion js-accordion c-accordion--light', 'c-accordion__item-wrapper',
    'js-accordion__trigger c-accordion__trigger safari_only',
    'js-accordion__item-content c-accordion__item-content', 'accordionContent']) {
    assert.ok(html.includes(`class="${classes}"`), classes);
  }
  const sourceCaret = source.match(/id="iconCaretDown"[\s\S]*?<path d="([^"]+)"/)[1];
  assert.ok(html.includes(`d="${sourceCaret}"`));
  assert.doesNotMatch(html, /role="heading"|titleIconCaretDown|descIconCaretDown|<h[1-6]/);
});

test('two FAQ instances retain unique trigger/panel IDs and reciprocal ARIA references', () => {
  const html = render(Faq, faqFixture.datasource, { instances: 2 });
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 28);
  assert.equal(new Set(ids).size, 28);
  const buttons = [...html.matchAll(/<button id="([^"]+)"[^>]*aria-controls="([^"]+)"/g)];
  assert.equal(buttons.length, 14);
  for (const [, trigger, panel] of buttons) {
    assert.ok(html.includes(`id="${panel}" role="region" aria-labelledby="${trigger}"`));
  }
});

test('all native questions and answers keep real SDK metadata and all panels open while editing', () => {
  const entries = faqFixture.datasource.children.results.map(productFaqFields).map((entry) => ({
    id: entry.id, question: native('question', entry.question.jsonValue.value, entry.id),
    answer: native('answer', entry.answer.jsonValue.value, entry.id),
  }));
  const html = render(Faq, { id: faqFixture.datasource.id, children: connection(entries) }, { isEditing: true });
  assert.equal(metadata(html).length, 14);
  for (const entry of entries) {
    assert.deepEqual(metadata(html).filter((field) => field.itemId === entry.id)
      .map((field) => field.fieldId).sort(), ['native-answer', 'native-question']);
  }
  assert.equal((html.match(/aria-expanded="true"/g) || []).length, 7);
  assert.doesNotMatch(html, /hidden=""/);
  assert.match(html, /c-accordion__item--is-active/);
});

test('compact projection preserves SDK object identity, root ordering and connection metadata', () => {
  const question = native('question', 'Canonical question', 'child').jsonValue;
  const answer = native('answer', '<p>Canonical answer</p>', 'child').jsonValue;
  const collection = [{ name: 'answer', jsonValue: answer }, { name: 'question', jsonValue: question },
    { name: 'theme', jsonValue: { value: 'unused' } }];
  const unrelated = { jsonValue: { value: 'Unused historical field', metadata: { fieldId: 'historical' } } };
  const entry = { id: 'child', fieldCollection: collection, unusedHistoricalField: unrelated };
  const before = JSON.stringify(entry);
  const projected = productFaqFields(entry);
  assert.equal(projected.question.jsonValue, question);
  assert.equal(projected.answer.jsonValue, answer);
  assert.equal(projected.fieldCollection, collection);
  assert.equal(projected.unusedHistoricalField, unrelated);
  assert.equal(projected.theme, undefined);
  assert.equal(projected.id, 'child');
  assert.equal(JSON.stringify(entry), before);
});

test('canonical compact names win regardless of their position relative to historical names', () => {
  const cleared = native('question', '', 'cleared').jsonValue;
  const answer = native('answer', '<p>Answer</p>').jsonValue;
  const entry = { id: 'cleared', fieldCollection: [
    { name: 'heading', jsonValue: { value: 'Stale historical question' } },
    { name: 'QUESTION', jsonValue: cleared }, { name: 'body', jsonValue: { value: 'Stale historical answer' } },
    { name: 'Answer', jsonValue: answer },
  ] };
  const projected = productFaqFields(entry);
  assert.equal(projected.question.jsonValue, cleared);
  assert.equal(projected.answer.jsonValue, answer);
  assert.doesNotMatch(render(Faq, one(entry), { isEditing: true }), /Stale historical/);
});

test('explicit canonical clears and undefined properties never restore historical or compact content', () => {
  for (const value of [native('question', ''), undefined]) {
    const entry = { id: 'clear', question: value, answer: native('answer', ''),
      heading: { jsonValue: { value: 'Stale named heading' } }, body: { jsonValue: { value: '<p>Stale named body</p>' } },
      fieldCollection: [{ name: 'question', jsonValue: { value: 'Stale compact question' } },
        { name: 'answer', jsonValue: { value: '<p>Stale compact answer</p>' } }] };
    const projected = productFaqFields(entry);
    assert.equal(projected.question, value);
    assert.equal(projected.answer, entry.answer);
    for (const isEditing of [false, true]) {
      assert.doesNotMatch(render(Faq, one(entry), { isEditing }), /Stale/);
    }
  }
});

test('named historical fields precede historical collection values without changing their metadata', () => {
  const heading = native('question', 'Named historical question', 'native-child');
  const body = native('answer', '<p>Named historical answer</p>', 'native-child');
  const entry = { id: 'native-child', heading, body, fieldCollection: [
    { name: 'heading', jsonValue: { value: 'Stale collection' } },
    { name: 'body', jsonValue: { value: 'Stale collection' } }] };
  assert.equal(productFaqFields(entry).question, heading);
  assert.equal(productFaqFields(entry).answer, body);
  const html = render(Faq, one(entry), { isEditing: true });
  assert.deepEqual(metadata(html).map((field) => field.itemId), ['native-child', 'native-child']);
  assert.doesNotMatch(html, /Stale collection/);
});

test('FAQ escaping and authored answer blocks use the real SDK without synthetic paragraph wrapping', () => {
  const answer = '<p>First <strong>block</strong></p><ul><li>Second</li></ul><div><h3>Authored heading</h3></div>';
  const html = render(Faq, one({ id: 'blocks', question: native('question', 'Question <em>text</em>'),
    answer: native('answer', answer) }));
  assert.match(html, /Question &lt;em&gt;text&lt;\/em&gt;/);
  assert.ok(html.includes(answer));
  assert.doesNotMatch(html, /<p[^>]*><ul|<p[^>]*><div/);
  assert.deepEqual(metadata(html), []);
});

test('cleared FAQ fields retain editor chrome and produce no phantom normal-mode FAQ item', () => {
  const data = one({ id: 'empty-child', question: native('question', '', 'empty-child'),
    answer: native('answer', '', 'empty-child') });
  const editing = render(Faq, data, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['native-answer', 'native-question']);
  assert.match(editing, /\[No text in field\]/);
  const normal = render(Faq, data);
  assert.doesNotMatch(normal, /<button|role="region"|<p>|\[No text in field\]/);
  assert.deepEqual(metadata(normal), []);
});

test('independent FAQ clears preserve the remaining field and avoid an inaccessible unlabeled toggle', () => {
  const questionCleared = one({ id: 'partial', question: native('question', ''),
    answer: native('answer', '<p>Remaining answer</p>') });
  const html = render(Faq, questionCleared);
  assert.ok(html.includes('<p>Remaining answer</p>'));
  assert.doesNotMatch(html, /<button|hidden=""|aria-labelledby|role="region"/);
  const answerCleared = one({ id: 'partial', question: native('question', 'Remaining question'),
    answer: native('answer', '') });
  const second = render(Faq, answerCleared);
  assert.match(second, /Remaining question/);
  assert.doesNotMatch(second, /<p>|\[No text in field\]/);
});

test('incomplete FAQ connections fail closed instead of displaying a misleading partial list', () => {
  const full = faqFixture.datasource;
  for (const children of [
    { ...full.children, total: 8 },
    { ...full.children, pageInfo: { hasNext: true, endCursor: 'more' } },
    { ...full.children, total: -1 },
    { results: full.children.results },
    { ...full.children, total: undefined },
    { ...full.children, pageInfo: undefined },
    { ...full.children, results: undefined },
  ]) {
    assert.equal(render(Faq, { ...full, children }), '');
    const html = render(Faq, { ...full, children }, { isEditing: true });
    assert.match(html, /role="status">Product FAQ content is incomplete/);
    assert.doesNotMatch(html, /<button|How much/);
  }
  assert.equal(render(Faq, {}), '');
  assert.match(render(Faq, {}, { isEditing: true }), /content is incomplete/);
  assert.doesNotMatch(render(Faq, { children: connection([]) }), /incomplete|<button/);
});

test('FAQ local visibility rules override source max-height while preserving all source typography', () => {
  const css = fs.readFileSync(path.join(componentRoot, 'product-faq/ProductFaq.css'), 'utf8');
  assert.ok(sourceCss.includes('.c-accordion .c-accordion__item-content{display:block;max-height:0;'));
  assert.match(css, /\.allianz-product-faq \.c-accordion__item-content\[hidden\]\s*\{\s*display: none;/);
  assert.match(css, /\.allianz-product-faq \.c-accordion__item-content:not\(\[hidden\]\)\s*\{\s*max-height: none;/);
  assert.doesNotMatch(css, /font|padding|margin|width/);
});

test('FAQ Intro retains actual child identity, recovered h3 wrappers and pending Content Hub icon status', () => {
  assert.equal(introFixture.datasource.id, 'c6260944-ffe4-4af6-9077-d1e5a59b36e1');
  assert.equal(introFixture.nativeBindings.unusedGenericRoot.itemId, 'c8b126fd-337f-48ec-80a3-4aa490493f12');
  assert.equal(introFixture.pendingContentHub.binaryDelivered, false);
  assert.equal(introFixture.pendingContentHub.nativeSourceField, 'icon');
  assert.equal(introFixture.pendingContentHub.sourceReviewedPlanEntry.name, 'icon');
  assert.equal(introFixture.pendingContentHub.sourceReviewedPlanEntry.fieldId, '233f9efc-e990-5e8c-8f9c-7db449482d49');
  assert.deepEqual(introFixture.pendingContentHub.sourceReviewedPlanEntry.sourceMediaCandidateIds,
    ['42314e16-d0b6-56ff-878a-0a1ceef1101b']);
  assert.deepEqual(introFixture.datasource.icon.jsonValue.value, {});
  const html = render(Intro, introFixture.datasource);
  for (const classes of ['l-grid l-grid--max-width', 'l-grid__row u-margin-bottom-lg u-padding-top-lg',
    'l-grid__column-medium-12', 'm-axlIntroductionBlock -is--stacked -no--image',
    'tileContent u-text-center', 'tileHeading']) assert.ok(html.includes(`class="${classes}"`));
  assert.match(source, /<H3>Frequently asked questions<\/H3>/);
  assert.match(html, /<h3>Frequently asked questions<\/h3>/);
  assert.doesNotMatch(html, /<img|<svg|<h[12456]|match-height-row|tileBody|tileLink/);
});

test('FAQ Intro native Image uses fixed branded wrapper and local source SVG size/filter adaptation', () => {
  const data = { id: 'authored-intro', heading: native('heading', 'Authored <em>heading</em>', 'authored-intro'),
    icon: native('icon', { src: '/test-only-authored.svg', alt: 'Authored icon' }, 'authored-intro') };
  const html = render(Intro, data);
  assert.match(html, /class="tileIcon t-bg-primary-brand t-icon-primary-white"/);
  assert.match(html, /<h3>Authored &lt;em&gt;heading&lt;\/em&gt;<\/h3>/);
  assert.match(html, /<img alt="Authored icon" src="\/test-only-authored.svg"\/>/);
  const editing = render(Intro, data, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['native-heading', 'native-icon']);
  assert.ok(metadata(editing).every((field) => field.itemId === data.id));
  const css = fs.readFileSync(path.join(componentRoot, 'product-faq-intro/ProductFaqIntro.css'), 'utf8');
  assert.ok(sourceCss.includes('.m-axlIntroductionBlock .tileIcon svg{width:26px;height:auto;fill:#fff}'));
  assert.ok(sourceCss.includes('@media (min-width:704px){.m-axlIntroductionBlock .tileIcon svg{width:40px}}'));
  assert.match(css, /\.allianz-product-faq-intro \.tileIcon img\s*\{\s*width: 26px;/);
  assert.match(css, /filter: brightness\(0\) invert\(1\)/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*width: 40px;/);
});

test('cleared Intro canonical fields keep SDK editing metadata without fallback children or old images', () => {
  const data = { id: 'cleared-intro', heading: native('heading', '', 'cleared-intro'),
    icon: native('icon', {}, 'cleared-intro'), image: native('icon', { src: '/stale.svg' }),
    children: { results: [{ id: 'stale', heading: native('heading', 'Stale child') }] } };
  const before = JSON.stringify(data);
  const editing = render(Intro, data, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['native-heading', 'native-icon']);
  assert.match(editing, /\[No text in field\]/);
  assert.match(editing, /scEmptyImage/);
  assert.doesNotMatch(editing, /Stale|stale\.svg|Frequently asked/);
  const normal = render(Intro, data);
  assert.doesNotMatch(normal, /<h[1-6]|<img|<svg|Stale|stale\.svg|Frequently asked/);
  assert.equal(JSON.stringify(data), before);
});

for (const name of ['heading', 'icon']) {
  test(`Intro independently clearing ${name} preserves the other field`, () => {
    const data = { heading: native('heading', 'Authored intro'),
      icon: native('icon', { src: '/test-only-icon.svg', alt: 'Test icon' }) };
    data[name] = native(name, name === 'icon' ? {} : '');
    const html = render(Intro, data);
    assert.equal(html.includes('<h3>Authored intro</h3>'), name !== 'heading');
    assert.equal(html.includes('src="/test-only-icon.svg"'), name !== 'icon');
    assert.equal(metadata(render(Intro, data, { isEditing: true })).length, 2);
  });
}

for (const [name, Component, data] of [
  ['FAQ', Faq, faqFixture.datasource], ['FAQ Intro', Intro, introFixture.datasource],
]) {
  test(`${name} ignores all design parameters, unused authored fields and unsupported root content`, () => {
    const params = { theme: 'green-soft', layout: 'cards', spacing: 'xl', paddingTop: 'none',
      paddingBottom: 'lg', marginBottom: 'md', columns: '3', headingLevel: 'h1', alignment: 'right',
      iconTheme: 'primary-black', styles: 'authored-unsupported-style' };
    const unused = { ...data, body: native('answer', '<p>Unused root body</p>'),
      primaryLink: { jsonValue: { value: { href: '/unused', text: 'Unused link' } } },
      subheading: native('heading', 'Unused root subheading') };
    if (Component === Faq) unused.heading = native('heading', 'Unused root heading');
    assert.equal(render(Component, data), render(Component, unused, { params }));
    assert.doesNotMatch(render(Component, unused, { params, isEditing: true }), /Unused|unsupported-style/);
    assert.match(render(Component, data, { params: { RenderingIdentifier: 'authored-id' } }), /id="authored-id"/);
  });

  test(`${name} distinguishes missing datasource and absent fields without phantom editor chrome`, () => {
    for (const isEditing of [false, true]) {
      assert.match(render(Component, undefined, { isEditing }), /class="allianz-missing-data" role="status"/);
      const empty = render(Component, {}, { isEditing });
      assert.deepEqual(metadata(empty), []);
      assert.doesNotMatch(empty, /<h[1-6]|<img|<svg|<button|\[No text in field\]|Frequently asked|How much/);
      assert.doesNotMatch(render(Component, { children: { results: [] } }, { isEditing }), /No text in field/);
    }
  });
}

test('named FAQ query has no authored root fields and a compact complete native child connection', () => {
  const query = fs.readFileSync(path.join(componentRoot, 'product-faq/product-faq.graphql'), 'utf8');
  const operation = parse(query).definitions[0];
  assert.equal(operation.name.value, 'ProductFaqData');
  assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
  const datasource = operation.selectionSet.selections[0];
  assert.equal(datasource.alias.value, 'datasource');
  assert.equal(datasource.name.value, 'item');
  assert.deepEqual(datasource.selectionSet.selections.map((entry) => entry.name.value), ['id', 'children']);
  const children = datasource.selectionSet.selections[1];
  assert.deepEqual(children.arguments.map((entry) => [entry.name.value, entry.value.value]), [['first', '40']]);
  assert.deepEqual(children.selectionSet.selections.map((entry) => entry.name.value), ['total', 'pageInfo', 'results']);
  assert.deepEqual(children.selectionSet.selections[1].selectionSet.selections.map((entry) => entry.name.value), ['hasNext', 'endCursor']);
  const results = children.selectionSet.selections[2];
  assert.deepEqual(results.selectionSet.selections.map((entry) => entry.name.value), ['id', 'fields']);
  assert.equal(results.selectionSet.selections[1].alias.value, 'fieldCollection');
  assert.deepEqual(results.selectionSet.selections[1].arguments, []);
  assert.deepEqual(results.selectionSet.selections[1].selectionSet.selections.map((entry) => entry.name.value), ['name', 'jsonValue']);
});

test('named Intro query exposes exactly two canonical root fields with no legacy child expansion', () => {
  const query = fs.readFileSync(path.join(componentRoot, 'product-faq-intro/product-faq-intro.graphql'), 'utf8');
  const operation = parse(query).definitions[0];
  assert.equal(operation.name.value, 'ProductFaqIntroData');
  const datasource = operation.selectionSet.selections[0];
  assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
  assert.deepEqual(datasource.selectionSet.selections.map((entry) => entry.alias?.value || entry.name.value), ['id', 'heading', 'icon']);
  for (const field of datasource.selectionSet.selections.slice(1)) {
    assert.equal(field.name.value, 'field');
    assert.deepEqual(field.arguments.map((entry) => [entry.name.value, entry.value.value]), [['name', field.alias.value]]);
    assert.deepEqual(field.selectionSet.selections.map((entry) => entry.name.value), ['jsonValue']);
  }
});
