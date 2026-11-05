import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

// Transport fixtures contain synthetic values and field metadata. No native DTO,
// browser geometry, persisted binding or CMS acceptance is claimed by this suite.
let networkAttempts = 0;
const deny = () => { networkAttempts++; throw new Error('Network forbidden in local presentation tests'); };
globalThis.fetch = deny;
http.get = http.request = https.get = https.request = deny;
net.connect = net.createConnection = tls.connect = deny;
net.Socket.prototype.connect = deny;
const dir = path.dirname(fileURLToPath(import.meta.url));
// Repository default is the app containing this test. Optional roots only let the
// isolated recovery harness reuse installed dependencies without editing the app.
const app = process.env.ALLIANZ_PRESENTATION_APP_ROOT || path.resolve(dir, '../../../..');
const candidate = process.env.ALLIANZ_PRESENTATION_OVERLAY_ROOT || app;
const require = createRequire(path.join(app, 'package.json'));
const ts = require('typescript'), React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const observe = [];
function loader(sourceOverrides = new Map()) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename); compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(app); modules.set(filename, compiled);
    compiled.require = (specifier) => {
      if (specifier.endsWith('.css')) return {};
      if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
        ...Object.fromEntries(['Text', 'RichText', 'Image', 'Link'].map(name => [name, props => {
          observe.push({ name, ...props }); return React.createElement(sdk[name], props);
        }])) };
      const base = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(app, 'src', specifier) : undefined;
      if (base) {
        const local = [base, `${base}.ts`, `${base}.tsx`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
        if (local) return /\.tsx?$/.test(local) ? load(local) : require(local);
      }
      return require(specifier);
    };
    compiled._compile(ts.transpileModule(sourceOverrides.get(filename) ?? fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const file = 'src/components/allianz-rich-text/AllianzRichText.tsx';
const candidateFile = path.join(candidate, file);
const actual = loader()(candidateFile);
// Recovery-only optional comparator. Repository tests have no whole-file hash pin
// and remain valid when unrelated RTE variants evolve.
const baseline = process.env.ALLIANZ_PRESENTATION_BASELINE_FILE
  ? loader()(process.env.ALLIANZ_PRESENTATION_BASELINE_FILE) : undefined;
const field = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: 'synthetic-fixture-owner', fieldId: `fixture-${name}`, fieldType, fixtureOnly: true } } });
function fixture() {
  return { id: 'synthetic-fixture-owner', heading: field('heading', 'Authored heading'),
    subheading: field('subheading', '<p>Authored subheading</p>', 'Rich Text'),
    body: field('body', '<p>Authored <em>body</em> <a href="/about">local journey</a>.</p>', 'Rich Text'),
    icon: field('icon', {}, 'Image'),
    primaryLink: field('primaryLink', { href: '/about', text: 'Authored CTA', target: '_blank', linktype: 'internal' }, 'General Link') };
}
const params = { theme: 'transparent', alignment: 'center', headingLevel: 'h2', paddingTop: 'none', marginBottom: 'none', RenderingIdentifier: 'fixture-intro' };
function render(Component, data = fixture(), mode = 'normal', input = params, extra = {}) {
  observe.length = 0;
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Synthetic presentation fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { ...extra, params: input, fields: data === null ? undefined : { data: { datasource: data } } })));
}
const deepFreeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const variants = ['FieldLargeTextTile', 'FieldMediumTextTile', 'InclusionResourceGroupsIntroduction', 'InclusionMinnesotaIntroduction', 'InclusionCommitmentsIntroduction'];
const glyphs = {
  InclusionResourceGroupsIntroduction: '/allianz-ui/life-overview/puzzle.svg',
  InclusionMinnesotaIntroduction: '/allianz-assets/bf9e7cf1c5628982.svg',
  InclusionCommitmentsIntroduction: '/allianz-ui/about-overview/information.svg',
};

for (const mode of ['normal', 'preview', 'editing']) {
  test(`Field named tiles use source wrappers and exact body utilities (${mode})`, () => {
    for (const [name, size] of [['FieldLargeTextTile', 'xl'], ['FieldMediumTextTile', 'lg']]) {
      const html = render(actual[name], fixture(), mode);
      assert.match(html, /article class="m-axlTile match-height -is--stacked t-bg-transparent"/);
      assert.match(html, /class="tileContent u-text-center"/);
      assert.match(html, new RegExp(`class="tileBody u-font-size-${size}"`));
      assert.match(html, /class="tileSubGrid__content"/);
      assert.doesNotMatch(html, /m-axlIntroductionBlock/);
      assert.match(html, /Authored subheading/);
      assert.match(html, /Authored <em>body<\/em>/);
      assert.equal(observe.filter(p => p.name === 'Image').length, 0);
    }
  });
  test(`Inclusion fixed glyphs remain separate from native fields (${mode})`, () => {
    for (const [name, src] of Object.entries(glyphs)) {
      const data = deepFreeze(fixture());
      const before = JSON.stringify(data);
      const html = render(actual[name], data, mode);
      assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
      assert.ok(html.includes(`src="${src}"`));
      assert.equal(observe.filter(p => p.name === 'Image').length, 0);
      assert.equal(observe.filter(p => p.name === 'Text' && p.field === data.heading.jsonValue).length, 1);
      assert.equal(observe.filter(p => p.name === 'RichText' && p.field === data.subheading.jsonValue).length, 1);
      assert.match(html, /class="tileBody"/);
      assert.equal(JSON.stringify(data), before);
      if (name === 'InclusionCommitmentsIntroduction') assert.match(html, /t-bg-primary-brand t-icon-primary-white/);
      else assert.match(html, /t-bg-transparent t-icon-primary-black/);
    }
  });
  test(`Authored icons override fixed art using the real SDK field (${mode})`, () => {
    for (const name of variants) {
      const data = fixture();
      data.icon = field('icon', { src: '/synthetic-native-icon.svg', alt: 'Authored icon', width: 40, height: 40 }, 'Image');
      const icon = data.icon.jsonValue;
      const html = render(actual[name], deepFreeze(data), mode);
      assert.match(html, /src="\/synthetic-native-icon.svg"/);
      assert.equal(observe.filter(p => p.name === 'Image' && p.field === icon).length, 1);
      for (const src of Object.values(glyphs)) assert.ok(!html.includes(`src="${src}"`));
    }
  });
  test(`All new variants retain native metadata, parameters and source link guards (${mode})`, () => {
    for (const name of variants) {
      const data = deepFreeze(fixture());
      const html = render(actual[name], data, mode, { ...params, alignment: 'left', theme: 'blue-soft', headingLevel: 'h3', paddingTop: 'lg', marginBottom: 'sm' });
      assert.match(html, /t-bg-blue-soft/); assert.match(html, /u-text-left/);
      assert.match(html, /u-padding-top-lg/); assert.match(html, /u-margin-bottom-sm/);
      assert.match(html, /<h3[^>]*>/);
      assert.match(html, /href="\/about"/);
      assert.equal(observe.filter(p => p.name === 'Text' && p.field === data.heading.jsonValue).length, 1);
      const nativeBody = observe.find(p => p.name === 'RichText' && p.className.startsWith('tileBody'))?.field;
      assert.deepEqual(nativeBody?.metadata, data.body.jsonValue.metadata);
      assert.deepEqual(nativeBody?.value, data.body.jsonValue.value);
      assert.equal(observe.filter(p => p.name === 'Link').length, 1);
    }
  });
  test(`Existing Default, Professional and glyph variants retain native behavior (${mode})`, () => {
    for (const name of ['Default', 'ProfessionalPlainIntroduction', 'ProfessionalSubheadingIntroduction', 'InclusionPlainIntroduction', 'FieldEventsIntroduction', 'FieldGlobalStadiumsIntroduction', 'FieldAboutIntroduction']) {
      for (const iconState of ['empty', 'authored']) {
        const data = fixture();
        if (iconState === 'authored') data.icon.jsonValue.value = { src: '/baseline-icon.svg', alt: '' };
        const html = render(actual[name], data, mode);
        assert.match(html, /Authored heading/);
        assert.match(html, /Authored <em>body<\/em>/);
        assert.match(html, /href="\/about"/);
        if (name === 'Default') {
          assert.match(html, /m-axlIntroductionBlock -is--stacked -no--image/);
          assert.match(html, /class="tileBody u-font-size-xl"/);
        }
        if (baseline) assert.equal(html, render(baseline[name], data, mode), `${name}/${iconState}`);
      }
    }
  });
}

test('Malformed icons never become authored images or fixed glyph fallbacks', () => {
  for (const name of variants) for (const malformed of [42, [], { jsonValue: 42 }, { jsonValue: { value: 'not-image' } }, { jsonValue: { value: { src: 1 } } }, { jsonValue: { value: { src: '   ' } } }]) {
    const data = fixture(); data.icon = malformed;
    const html = render(actual[name], data);
    assert.equal(observe.filter(p => p.name === 'Image').length, 0);
    for (const src of Object.values(glyphs)) assert.ok(!html.includes(`src="${src}"`));
  }
});
test('Cleared and omitted icons give only explicit Inclusion source fallback', () => {
  for (const state of ['missing', 'undefined', 'empty-json', 'empty-value', 'empty-src']) {
    for (const name of variants) {
      const data = fixture();
      if (state === 'missing') delete data.icon;
      if (state === 'undefined') data.icon = undefined;
      if (state === 'empty-json') data.icon = { jsonValue: undefined };
      if (state === 'empty-value') data.icon = { jsonValue: { value: undefined } };
      if (state === 'empty-src') data.icon.jsonValue.value.src = '';
      const html = render(actual[name], data);
      assert.equal(observe.filter(p => p.name === 'Image').length, 0);
      assert.equal(Object.values(glyphs).some(src => html.includes(`src="${src}"`)), name in glyphs);
    }
  }
});
test('Cleared text/link fields stay empty; no source body is invented', () => {
  for (const name of variants) {
    const data = fixture();
    for (const key of ['heading', 'subheading', 'body']) data[key].jsonValue.value = '';
    data.primaryLink.jsonValue.value = {};
    const html = render(actual[name], data);
    assert.doesNotMatch(html, /<h[1-6]\b|class="tileBody|Authored|class="a-link"/);
    assert.match(html, /class="tileSubHeading"/);
  }
});
test('Missing datasource uses the same fail-closed fallback', () => {
  for (const name of variants) {
    const html = render(actual[name], null);
    assert.match(html, /AllianzRichText/);
    assert.doesNotMatch(html, /tileContent|fixture|Authored/);
  }
});
test('Visitor links retain security restrictions and local demo containment', () => {
  for (const name of variants) {
    const data = fixture();
    data.primaryLink.jsonValue.value = { href: 'javascript:alert(1)', text: 'Unsafe' };
    data.body.jsonValue.value = '<p><a href="https://www.allianzlife.com/nonexistent-page">Production</a></p>';
    const html = render(actual[name], data);
    assert.doesNotMatch(html, /href="javascript:|href="https:\/\/www\.allianzlife\.com/);
  }
});
test('Source Field utilities match the already shipped stylesheet contract', () => {
  const css = fs.readFileSync(path.join(app, 'public/allianz-assets/source-style.css'), 'utf8');
  assert.ok(css.includes('.u-font-size-lg{font-size:1.125rem!important}'));
  assert.ok(css.includes('.u-font-size-xl{font-size:1.25rem!important}'));
  assert.ok(css.includes('.u-font-size-lg,.u-font-size-xl{line-height:1.625rem!important;'));
  assert.match(css, /\.m-axlTile \.tileContent\{[^}]*padding:32px/);
});
test('Observed Inclusion field population retains native Body slots without promotion', () => {
  // Population states match the sanitized native read; values/metadata are synthetic.
  for (const [name, hasBody] of [['InclusionResourceGroupsIntroduction', true], ['InclusionMinnesotaIntroduction', false], ['InclusionCommitmentsIntroduction', false]]) {
    const data = fixture();
    data.subheading.jsonValue.value = '';
    data.primaryLink.jsonValue.value = {};
    if (!hasBody) data.body.jsonValue.value = '';
    const html = render(actual[name], deepFreeze(data), 'editing');
    assert.equal(observe.filter(p => p.name === 'RichText' && p.className === 'tileSubHeading').length, 0);
    assert.equal(observe.filter(p => p.name === 'RichText' && p.className === 'tileBody').length, hasBody ? 1 : 0);
    if (hasBody) assert.deepEqual(observe.find(p => p.className === 'tileBody').field.metadata, data.body.jsonValue.metadata);
    else assert.doesNotMatch(html, /class="tileBody"/);
  }
});
test('Local SDK regression run made zero network attempts', () => assert.equal(networkAttempts, 0));
