import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

// Synthetic native fields only. These SSR/contract tests do not establish
// post-hydration native geometry, persisted bindings or hosted acceptance.
let networkAttempts = 0;
const deny = () => { networkAttempts++; throw new Error('Network forbidden in Field local tests'); };
globalThis.fetch = deny;
http.get = http.request = https.get = https.request = deny;
net.connect = net.createConnection = tls.connect = deny;
net.Socket.prototype.connect = deny;
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = process.env.ALLIANZ_FIELD_APP_ROOT || path.resolve(dir, '../../../..');
const candidate = process.env.ALLIANZ_FIELD_OVERLAY_ROOT || app;
const support = process.env.ALLIANZ_FIELD_SUPPORT_ROOT || app;
const baseline = process.env.ALLIANZ_FIELD_BASELINE_ROOT;
const roots = [candidate, support, app];
const require = createRequire(path.join(app, 'package.json'));
const ts = require('typescript'), React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const observed = [];
const sourceFor = rel => roots.map(root => path.join(root, rel)).find(file => fs.existsSync(file));
function loader() {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = new Module(filename); module.filename = filename;
    module.paths = Module._nodeModulePaths(app); cache.set(filename, module);
    module.require = specifier => {
      if (specifier.endsWith('.css')) return {};
      if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
        ...Object.fromEntries(['Image', 'Link', 'RichText', 'Text'].map(name => [name, props => {
          observed.push({ name, ...props }); return React.createElement(sdk[name], props);
        }])) };
      let rel;
      if (/^(components|lib)\//.test(specifier)) rel = `src/${specifier}`;
      if (specifier.startsWith('.')) {
        const ownerRoot = [...roots, baseline].filter(Boolean).find(root => filename.startsWith(`${root}${path.sep}`));
        if (ownerRoot) rel = path.relative(ownerRoot, path.resolve(path.dirname(filename), specifier));
      }
      if (rel) {
        const local = [rel, `${rel}.ts`, `${rel}.tsx`].map(sourceFor).find(Boolean);
        if (local && fs.statSync(local).isFile()) return /\.tsx?$/.test(local) ? load(local) : require(local);
      }
      return require(specifier);
    };
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return module.exports;
  }
  return load;
}
const rteRel = 'src/components/allianz-rich-text/AllianzRichText.tsx';
const heroRel = 'src/components/allianz-hero/AllianzHero.tsx';
const actualRTE = loader()(sourceFor(rteRel)), actualHero = loader()(sourceFor(heroRel));
const oldRTE = baseline ? loader()(path.join(baseline, rteRel)) : undefined;
const oldHero = baseline ? loader()(path.join(baseline, heroRel)) : undefined;
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'synthetic-field-owner', fieldId: `fixture-${name}`, fieldType, fixtureOnly: true } } });
function fixture() {
  return { id: 'synthetic-field-owner', heading: field('heading', ''),
    subheading: field('subheading', '', 'Rich Text'),
    body: field('body', '<img src="/synthetic-logo.svg" alt="Synthetic logo" /><h2>Native body title</h2><div class="tileBody u-font-size-xl">Native prose</div>', 'Rich Text'),
    icon: field('icon', {}, 'Image'), primaryLink: field('link', {}, 'General Link'),
    desktopImage: field('desktop', { src: '/synthetic-hero.svg', alt: 'Native hero' }, 'Image'),
    mobileImage: field('mobile', {}, 'Image') };
}
const params = { theme: 'blue-soft', alignment: 'center', headingLevel: 'h2', paddingTop: 'md', marginBottom: 'none', RenderingIdentifier: 'synthetic-field-stage' };
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function render(Component, data = fixture(), mode = 'normal', parameters = params) {
  observed.length = 0;
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Synthetic Field fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: parameters, fields: data === null ? undefined : { data: { datasource: data } } })));
}

for (const mode of ['normal', 'preview', 'editing']) {
  test(`Field United restores source header shells without inventing field values (${mode})`, () => {
    const data = freeze(fixture()), before = JSON.stringify(data);
    const html = render(actualRTE.FieldUnitedIntroduction, data, mode);
    assert.match(html, /class="m-axlIntroductionBlock -is--stacked -no--image"/);
    assert.match(html, /<header><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header>/);
    assert.match(html, /<div class="tileBody"/);
    assert.match(html, /class="tileBody u-font-size-xl">Native prose/);
    assert.match(html, /<h2>Native body title<\/h2>/);
    assert.equal(observed.filter(p => p.name === 'Text').length, 0);
    const nativeBody = observed.find(p => p.name === 'RichText' && p.className === 'tileBody');
    assert.deepEqual(nativeBody?.field.metadata, data.body.jsonValue.metadata);
    assert.equal(nativeBody?.field.value, data.body.jsonValue.value);
    assert.equal(JSON.stringify(data), before);
  });
  test(`Field United preserves authored overrides and native parameters (${mode})`, () => {
    const data = fixture();
    data.heading = field('heading', 'Native heading');
    data.subheading = field('subheading', '<p>Native subheading</p>', 'Rich Text');
    data.icon = field('icon', { src: '/synthetic-native-icon.svg', alt: 'Native icon' }, 'Image');
    data.primaryLink = field('link', { href: '/about', text: 'Native CTA', target: '_blank' }, 'General Link');
    const html = render(actualRTE.FieldUnitedIntroduction, freeze(data), mode,
      { ...params, alignment: 'left', headingLevel: 'h3', paddingTop: 'lg', marginBottom: 'sm' });
    assert.match(html, /u-text-left/); assert.match(html, /t-bg-blue-soft/);
    assert.match(html, /u-padding-top-lg/); assert.match(html, /u-margin-bottom-sm/);
    assert.match(html, /<h3[^>]*>Native heading<\/h3>/);
    assert.match(html, /href="\/about"/);
    // Existing local-link policy keeps visitor navigation in this tab; editing
    // retains the native target field for the editor rather than changing it.
    assert.match(html, mode === 'editing' ? /target="_blank"/ : /target=""/);
    for (const [name, original] of [['Text', data.heading.jsonValue], ['Image', data.icon.jsonValue]]) {
      assert.equal(observed.filter(p => p.name === name && p.field === original).length, 1);
    }
    assert.equal(observed.filter(p => p.name === 'RichText' && p.field === data.subheading.jsonValue).length, 1);
  });
  test(`Field Hero changes only the explicit presentation class (${mode})`, () => {
    const data = fixture(); data.heading = field('heading', 'Native hero title');
    data.body = field('body', '<p>Native hero caption</p>', 'Rich Text');
    freeze(data); const before = JSON.stringify(data);
    const html = render(actualHero.FieldEditorial, data, mode);
    const body = observed.find(p => p.name === 'RichText' && p.className.includes('c-hero__subHeadline'));
    assert.deepEqual(body?.field.metadata, data.body.jsonValue.metadata);
    assert.equal(body?.field.value, data.body.jsonValue.value);
    assert.match(html, /allianz-field-editorial-hero/);
    assert.match(html, /h4 c-heading c-hero__subHeadline u-text-center/);
    assert.equal(html.replace(' allianz-field-editorial-hero', ''), render(actualHero.Editorial, data, mode));
    assert.equal(JSON.stringify(data), before);
  });
  test(`Existing Default/Editorial/Cover variants retain output (${mode})`, context => {
    if (!oldRTE || !oldHero) return context.skip('Recovery baseline comparator was not supplied');
    const data = fixture(); data.heading = field('heading', 'Native heading');
    for (const name of ['Default', 'FieldLargeTextTile', 'FieldMediumTextTile']) {
      assert.equal(render(actualRTE[name], data, mode), render(oldRTE[name], data, mode), name);
    }
    for (const name of ['Default', 'Editorial', 'EditorialCover', 'LifeStrategy']) {
      assert.equal(render(actualHero[name], data, mode), render(oldHero[name], data, mode), name);
    }
  });
}

test('Cleared fields remain cleared; named presentation adds no source text or image', () => {
  const data = fixture();
  for (const key of ['heading', 'subheading', 'body']) data[key].jsonValue.value = '';
  data.desktopImage.jsonValue.value = {};
  const html = render(actualRTE.FieldUnitedIntroduction, data);
  assert.doesNotMatch(html, /<h[1-6]\b|class="tileBody"|<img|<a\b/);
  assert.match(html, /class="tileHeading"/);
  assert.match(html, /class="tileSubHeading"/);
  const hero = render(actualHero.FieldEditorial, data);
  assert.doesNotMatch(hero, /c-hero__subHeadline|<h[1-6]\b|<img/);
});
test('Missing datasource uses native fail-closed fallback', () => {
  for (const Component of [actualRTE.FieldUnitedIntroduction, actualHero.FieldEditorial]) {
    assert.match(render(Component, null), /Add a datasource/);
  }
});
test('Field United retains dangerous-link and malformed-icon guards', () => {
  const data = fixture();
  data.primaryLink = field('link', { href: 'javascript:alert(1)', text: 'Unsafe' }, 'General Link');
  data.icon = field('icon', { src: 12 }, 'Image');
  const html = render(actualRTE.FieldUnitedIntroduction, data);
  assert.doesNotMatch(html, /javascript:|src="12"/);
  assert.equal(observed.filter(p => p.name === 'Image').length, 0);
});
test('Field caption margin follows source one-em contract and cannot affect shared variants', () => {
  const css = fs.readFileSync(sourceFor('src/components/allianz-hero/AllianzEditorialHero.css'), 'utf8');
  const match = css.match(/\.allianz-field-editorial-hero \.c-hero__subHeadline\s*\{([^}]+)\}/);
  assert.ok(match);
  assert.equal(match[1].trim(), 'margin-bottom: 1em;');
  assert.doesNotMatch(match[1], /padding|height|transform|position|-[0-9]/);
});
test('Local Field tests made zero network attempts', () => assert.equal(networkAttempts, 0));
