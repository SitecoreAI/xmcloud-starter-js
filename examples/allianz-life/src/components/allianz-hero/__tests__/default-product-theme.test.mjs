import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { withLegacyInternalTargets, assertOnlyInternalTargetChanges } from '../../../lib/internal-target-baseline-helper.mjs';
import { loadSource, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx');
const source = fs.readFileSync(filename, 'utf8');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const postcss = require('postcss');
const { renderToStaticMarkup } = require('react-dom/server');
const modes = ['normal', 'preview', 'editing'];
const productThemes = ['fixed', 'variable', 'life'];
const neutralThemes = [undefined, '', 'transparent'];

function compile(text, observe) {
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs' && observe) return { ...sdk,
      ...Object.fromEntries(['Text', 'RichText', 'Image', 'Link'].map(name => [name, props => {
        observe.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])) };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return compiled.exports;
}

const Hero = compile(source);
const field = (name, value, fieldType = 'Rich Text') => ({ jsonValue: { value,
  metadata: { itemId: 'fixture-hero-owner', fieldId: `fixture-${name}`, fieldType },
  editable: `<span data-fixture-editable="${name}">Original editable payload</span>` } });
function fixture(state = 'complete') {
  const data = {
    heading: field('heading', ''), body: field('body', ''), eyebrow: field('eyebrow', '', 'Single-Line Text'),
    desktopImage: field('desktop', { src: '', alt: '' }, 'Image'),
    mobileImage: field('mobile', { src: '', alt: '' }, 'Image'),
    primaryLink: field('primary', { href: '', text: '', linktype: 'internal' }, 'General Link'),
    secondaryLink: field('secondary', { href: '', text: '', linktype: 'internal' }, 'General Link'),
  };
  if (state === 'heading' || state === 'complete') data.heading.jsonValue.value = 'RILA Rates Center';
  if (state === 'block-heading') data.heading.jsonValue.value = '<p>Authored <em>product heading</em></p>';
  if (state === 'body' || state === 'complete') data.body.jsonValue.value = '<p>Authored <strong>body</strong> and <a href="/about">link</a>.</p>';
  if (state === 'desktop' || state === 'complete') data.desktopImage.jsonValue.value = {
    src: '/fixture-desktop.jpg', alt: 'Authored desktop', width: '2000', height: '600', title: 'Authored image title' };
  if (state === 'complete' || state === 'mobile-only') data.mobileImage.jsonValue.value = { src: '/fixture-mobile.jpg', alt: 'Authored mobile' };
  if (state === 'primary' || state === 'complete') data.primaryLink.jsonValue.value = {
    href: '/about', text: 'Authored primary', linktype: 'internal', target: '_blank', anchor: 'details', querystring: 'source=fixture' };
  if (state === 'complete' || state === 'secondary-only') data.secondaryLink.jsonValue.value = { href: '/contact', text: 'Authored secondary', linktype: 'internal' };
  if (state === 'complete' || state === 'eyebrow-only') data.eyebrow.jsonValue.value = 'Authored eyebrow';
  if (state === 'whitespace') data.heading.jsonValue.value = ' ';
  if (state === 'empty-html') data.heading.jsonValue.value = '<p></p>';
  if (state === 'string-zero') data.heading.jsonValue.value = '0';
  if (state === 'numeric-zero') data.heading.jsonValue.value = 0;
  if (state === 'metadata-only') for (const entry of Object.values(data)) delete entry.jsonValue.value;
  if (state === 'undefined-fields') for (const name of Object.keys(data)) data[name] = { jsonValue: undefined };
  if (state === 'missing-fields') return {};
  return data;
}
const params = (heroTheme, theme, extra = {}) => ({
  layout: 'stage', heroTheme, theme, showLogin: '0', RenderingIdentifier: 'fixture-hero', ...extra,
});
function render(Component, data, input, mode) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { siteName: 'allianz-life', mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { name: 'Local Hero fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: input, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const root = html => html.match(/<div class="l-container-full-width[^\"]*">/)?.[0];
const restoreNeutralRoot = html => html.replace(
  /<div class="l-container-full-width  (c-hero__theme--(?:fixed|variable|life))">/,
  '<div class="l-container-full-width t-bg-transparent $1">');
const metadata = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&')));

function* changedCases() {
  for (const heroTheme of productThemes) for (const theme of neutralThemes) {
    for (const state of ['heading', 'block-heading', 'body', 'desktop', 'primary', 'complete', 'whitespace', 'empty-html', 'string-zero']) {
      yield { label: `${heroTheme}:${String(theme)}:${state}`, data: fixture(state), params: params(heroTheme, theme) };
    }
  }
}
function* unchangedCases() {
  for (const heroTheme of productThemes) for (const theme of neutralThemes) {
    for (const state of ['empty', 'missing-fields', 'undefined-fields', 'metadata-only', 'mobile-only', 'eyebrow-only', 'secondary-only', 'numeric-zero']) {
      yield { label: `empty:${heroTheme}:${String(theme)}:${state}`, data: fixture(state), params: params(heroTheme, theme) };
    }
    for (const showLogin of ['0', '1']) yield { label: `home:${heroTheme}:${String(theme)}:${showLogin}`,
      data: fixture(), params: params(heroTheme, theme, { layout: 'home', showLogin }) };
  }
  for (const heroTheme of productThemes) for (const theme of ['blue-soft', 'grey-muted', 'white', 'green-soft', 'grey-soft',
    'purple-soft', 'yellow-soft', 'primary-white', 'red-soft', 'product-fixed', 'product-variable', 'product-life', 'unknown', ' ', null]) {
    yield { label: `explicit:${heroTheme}:${String(theme)}`, data: fixture(), params: params(heroTheme, theme) };
  }
  for (const heroTheme of [undefined, '', 'unknown', 'Variable', 'product-variable']) for (const theme of neutralThemes) {
    yield { label: `invalid-product:${String(heroTheme)}:${String(theme)}`, data: fixture(), params: params(heroTheme, theme) };
  }
  for (const variant of Object.keys(Hero).filter(name => name !== 'Default' && name !== 'ProfessionalLoginHero' && typeof Hero[name] === 'function')) {
    for (const state of ['complete', 'empty']) yield { label: `variant:${variant}:${state}`, variant, data: fixture(state), params: params('variable', 'transparent') };
  }
  yield { label: 'missing-datasource', data: undefined, params: params('variable', 'transparent') };
}
const model = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8'));
function* modelCases() {
  for (const [route, data] of Object.entries(model.routes)) for (const [index, component] of data.components.entries()) {
    if (component.componentName === 'AllianzHero') yield { label: `${route}:${index}`, variant: component.params.FieldNames || 'Default',
      data: component.fields.data.datasource, params: component.params };
  }
}
function digestCases(cases, mode, transform = html => html) {
  const digest = createHash('sha256'); let count = 0;
  for (const current of cases) {
    freeze(current); const before = JSON.stringify(current);
    const html = render(Hero[current.variant ?? 'Default'], current.data, current.params, mode);
    const legacy = withLegacyInternalTargets(() => render(Hero[current.variant ?? 'Default'], current.data, current.params, mode));
    assertOnlyInternalTargetChanges(html, legacy, current.label);
    digest.update(current.label + '\0' + transform(legacy, current) + '\0');
    assert.equal(JSON.stringify(current), before, current.label); count++;
  }
  return { count, sha256: digest.digest('hex') };
}
// Complete real-SDK output captured from exact deployed 36a3c445 before editing.
// Hashes keep this test portable: no Git history or audit-directory input is needed.
const baseline = {
  normal: { changed: '5f0bf254ed4eef058cf8a6c3d634dda7d6f65db3d1f86dcb4f379c8ce68d5126', unchanged: '86ed1aa10b3f0a940895a8c203f60cf46723f57c0d3e3ff4388e4839952276cc', model: '2f487d1bfa23ab523c45838e95530d3ea8066119c2e7d734346780659708cf2a' },
  preview: { changed: '5f0bf254ed4eef058cf8a6c3d634dda7d6f65db3d1f86dcb4f379c8ce68d5126', unchanged: '86ed1aa10b3f0a940895a8c203f60cf46723f57c0d3e3ff4388e4839952276cc', model: '2f487d1bfa23ab523c45838e95530d3ea8066119c2e7d734346780659708cf2a' },
  editing: { changed: '32330cf6a62639b99f8e7019e30bdb63c13e788a4ecac51bd3c1e7b1de606877', unchanged: 'e236ca39bdcfe146ceea935681f1493f279d8f81e6001180418675ce7bb505f3', model: '2f487d1bfa23ab523c45838e95530d3ea8066119c2e7d734346780659708cf2a' },
};

// Regression assertions.
test('title-only RILA Default matches the official product-variable source root without conflicting transparent background', () => {
  // Current native read 2026-10-22: IADV, IASI and IXAP all have these params and
  // title-only field values, with FieldNames omitted. Metadata here is synthetic.
  // Official source root (public GET 2026-10-22T00:49:44.899247Z):
  // <div class="l-container-full-width  c-hero__theme--variable ">
  for (const mode of modes) {
    const html = render(Hero.Default, fixture('heading'), params('variable', 'transparent'), mode);
    assert.equal(root(html), '<div class="l-container-full-width  c-hero__theme--variable">');
    assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">RILA Rates Center<\/h1>/);
    assert.doesNotMatch(html, /<img\b|<picture\b|c-hero__subHeadline|class="a-link"/);
  }
});

test('all valid product themes honor neutral stage backgrounds only for fields already rendered by Default', () => {
  for (const mode of modes) for (const current of changedCases()) {
    freeze(current); const before = JSON.stringify(current);
    const html = render(Hero.Default, current.data, current.params, mode);
    assert.equal(root(html), `<div class="l-container-full-width  c-hero__theme--${current.params.heroTheme}">`, current.label);
    assert.equal(JSON.stringify(current), before);
  }
});

test('original populated native field objects, metadata and editable payloads reach the SDK unchanged', () => {
  const data = fixture(), before = JSON.stringify(data); freeze(data);
  for (const mode of modes) {
    const observe = [], instrumented = compile(source, observe);
    const html = render(instrumented.Default, data, params('variable', 'transparent'), mode);
    for (const [name, component] of [['heading', 'RichText'], ['body', 'RichText'], ['desktopImage', 'Image']]) {
      const original = data[name].jsonValue, calls = observe.filter(call => call.name === component && call.field === original);
      assert.equal(calls.length, 1, `${mode}:${name}: original field object`);
      assert.equal(calls[0].editable, mode === 'editing');
      assert.equal(calls[0].field.metadata, original.metadata);
      assert.equal(calls[0].field.editable, original.editable);
      assert.equal(metadata(html).filter(entry => entry.fieldId === original.metadata.fieldId).length, mode === 'editing' ? 1 : 0);
    }
    if (mode === 'editing') assert.equal(observe.filter(call => call.name === 'Link' && call.field === data.primaryLink.jsonValue).length, 1);
    assert.equal(JSON.stringify(data), before, 'No field, value, editable payload or metadata mutation');
  }
});

for (const mode of modes) {
  test(`${mode}: changed whole output differs from deployed baseline only by the neutral root class`, () => {
    const result = digestCases(changedCases(), mode, restoreNeutralRoot);
    assert.equal(result.count, 81); assert.equal(result.sha256, baseline[mode].changed);
  });
  test(`${mode}: empty, home, explicit/unknown themes, fallback and every named variant preserve deployed whole output`, () => {
    const result = digestCases(unchangedCases(), mode);
    assert.equal(result.count, 175); assert.equal(result.sha256, baseline[mode].unchanged);
    for (const current of unchangedCases()) if (current.label.startsWith('empty:')) {
      assert.match(root(render(Hero.Default, current.data, current.params, mode)), /t-bg-transparent/);
    }
  });
  test(`${mode}: 144 saved source fixtures have only the 59 potential Default root-class changes`, () => {
    let changed = 0, titleOnly = 0; const themes = { fixed: 0, variable: 0, life: 0 };
    const result = digestCases(modelCases(), mode, (html, current) => {
      if (current.variant === 'TitleOnly') titleOnly++;
      const restored = restoreNeutralRoot(html);
      if (restored !== html) { changed++; themes[current.params.heroTheme]++; }
      return restored;
    });
    assert.equal(result.count, 144); assert.equal(changed, 59); assert.equal(titleOnly, 2);
    assert.deepEqual(themes, { fixed: 26, variable: 23, life: 10 });
    assert.equal(result.sha256, baseline[mode].model);
    // These are saved source hints, not a claim that 59 live native pages bind Default.
  });
}

test('loaded source stylesheet supplies fixed, variable and life backgrounds with white descendants', () => {
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const screenRule = selector => {
    let found; css.walkRules(rule => { if (rule.selector === selector && rule.parent.type === 'root') found = rule; });
    assert.ok(found, selector); return found;
  };
  const declaration = (rule, prop) => rule.nodes.find(node => node.prop === prop);
  assert.equal(declaration(screenRule('.t-bg-transparent'), 'background').value, '#0000');
  assert.equal(declaration(screenRule('.t-bg-transparent'), 'background').important, true);
  for (const [theme, color] of [['fixed', '#402744'], ['variable', '#00483b'], ['life', '#79242f']]) {
    const background = screenRule(`.c-hero__theme--${theme}`);
    assert.equal(declaration(background, 'background-color').value, color);
    assert.ok(!declaration(background, 'background-color').important);
    const descendants = screenRule(`.c-hero__theme--${theme} *`);
    assert.equal(declaration(descendants, 'color').value, '#fff');
    assert.equal(declaration(descendants, 'fill').value, '#fff');
  }
});
