import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./select-source-layout.fixture.json', import.meta.url)));
const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const Rich = loadSource(filename);
const sha = value => createHash('sha256').update(value).digest('hex');
const roles = Object.keys(fixture.roles);
const params = fixture.baseline.params;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: 'fixture-only-select-owner', fieldId: `fixture-only-${name}`,
  fieldType: name === 'heading' ? 'Single-Line Text' : 'Rich Text', fixtureOnly: true,
} } });
const datasource = (variant, state = 'filled') => {
  const owner = fixture.nativeContracts[variant];
  const values = { heading: owner.heading || '', body: owner.body || fixture.roles[variant].body,
    subheading: '', primaryLink: '', icon: '' };
  const data = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, field(name, value)]));
  for (const name of ['heading', 'body']) {
    if (state === 'absent') delete data[name];
    else if (state === 'cleared') data[name].jsonValue.value = '';
  }
  return freeze(data);
};
const sourceData = name => freeze({ heading: field('heading', fixture.roles[name].heading || ''),
  body: field('body', fixture.roles[name].body) });
const normalize = html => html.replace(/<(\/?)([A-Z][\w-]*)\b/g, (_, slash, name) => `<${slash}${name.toLowerCase()}`)
  .replace(/class="([^"]*)"/g, (_, value) => `class="${value.trim().split(/\s+/).join(' ')}"`)
  .replace(/<svg\b[\s\S]*?<\/svg>/g, '<svg data-source-glyph="savings"></svg>')
  .replace(' id="fixture-select-layout"', '').replace(/>\s+</g, '><').trim();
const paths = html => [...html.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map(match => match[1]);

function observedModule(calls) {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript');
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk,
      ...Object.fromEntries(['Text', 'RichText', 'Link', 'Image'].map(name => [name, props => {
        calls.push({ name, ...props }); return React.createElement(sdk[name], props);
      }])) };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return loadSource(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
function renderMode(Component, data, mode) {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}

test('Select resources, rider introduction and next step match authentic source structure and field-owned text', () => {
  assert.equal(fixture.source.sha256, '8fe6d596749100391f339280abbf78a6e997eef4a5196f4d187fa2a489e0acd8');
  for (const name of ['SelectResources', 'SelectIncomeBenefitRider', 'SelectNextStep']) {
    const html = render(Rich[name], sourceData(name), false, params);
    assert.equal(normalize(html), normalize(fixture.roles[name].sourceMarkup), name);
    assert.equal((html.match(/class="l-grid__row"/g) || []).length, 1);
    assert.doesNotMatch(html, /u-padding-top-|u-padding-bottom-|u-margin-bottom-lg|m-axlIntroductionBlock|t-bg-blue-soft/);
  }
  const resources = render(Rich.SelectResources, sourceData('SelectResources'), false, params);
  assert.equal((resources.match(/<a\b/g) || []).length, 6);
  assert.equal((resources.match(/<h3\b/g) || []).length, 1);
  assert.equal((resources.match(/<h4\b/g) || []).length, 2);
  for (const name of ['SelectIncomeBenefitRider', 'SelectNextStep']) {
    const html = render(Rich[name], sourceData(name), false, params);
    assert.equal((html.match(/<h2>/g) || []).length, 1);
    assert.ok(html.includes('class="tileBody u-font-size-xl"'));
    assert.ok(html.includes(name === 'SelectNextStep' ? 't-bg-green-soft' : 't-bg-grey-soft'));
  }
});

test('the rider anchor and decorative Savings glyph preserve the exact source geometry', () => {
  const html = render(Rich.SelectIncomeBenefitRider, sourceData('SelectIncomeBenefitRider'), false, params);
  assert.ok(html.indexOf('<a name="si-IB"></a>') < html.indexOf('class="l-grid__row"'));
  assert.ok(html.includes('class="tileSubGrid__image"><div class="tileIcon t-bg-transparent t-icon-primary-black"'));
  assert.deepEqual(paths(html), fixture.glyphs.savings.paths);
  assert.equal(sha(JSON.stringify(paths(html))), fixture.glyphs.savings.pathListSha256);
  assert.match(html, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"[^>]*viewBox="0 0 24 24"/);
  assert.doesNotMatch(html, /role="img"|titleIcon|<img\b/);
  assert.doesNotMatch(render(Rich.SelectNextStep, sourceData('SelectNextStep'), false, params), /tileIcon|<svg\b|si-IB/);
});

test('brochure retains its original complete Body and source footer geometry without rewriting current financial copy or link', () => {
  const data = datasource('SelectRiderBrochure'), original = data.body.jsonValue.value;
  const html = render(Rich.SelectRiderBrochure, data, false, params);
  assert.ok(html.includes(`<div class="tileLink u-margin-top-md u-margin-bottom-md">${original}</div>`));
  assert.match(html, /class="l-grid__row"><div class="l-grid__column-medium-12 u-text-center"><footer>/);
  assert.match(fixture.roles.SelectRiderBrochure.sourceMarkup, /class="l-grid__column-medium-12 u-text-center"/);
  assert.match(fixture.roles.SelectRiderBrochure.sourceMarkup, /<footer>\s*<div class="tileLink u-margin-top-md u-margin-bottom-md">/);
  assert.equal((html.match(/class="l-grid__row"/g) || []).length, 1);
  assert.ok(html.includes('2026/02/19/16/39/IASI-002.pdf'));
  assert.ok(html.includes('aria-label="Download the Income Benefit rider II brochure (PDF)"'));
  assert.doesNotMatch(html, /IASI-002-LP|Income Benefit Riders|u-padding-|u-margin-bottom-lg/);
  assert.equal((html.match(/<a\b/g) || []).length, 1);
  const rider = render(Rich.SelectIncomeBenefitRider, datasource('SelectIncomeBenefitRider'), false, params);
  assert.ok(rider.includes(fixture.nativeContracts.SelectIncomeBenefitRider.body));
  assert.ok(rider.includes('Select Income™ with the Income Benefit rider II<sup>1</sup>'));
});

test('all four Select roles pass untouched full and cleared native field objects to the installed SDK in normal, preview and edit modes', () => {
  const calls = [], Observed = observedModule(calls);
  for (const name of roles) for (const state of ['filled', 'cleared', 'absent']) for (const mode of ['normal', 'preview', 'editing']) {
    const data = datasource(name, state), before = JSON.stringify(data); calls.length = 0;
    const html = renderMode(Observed[name], data, mode);
    const bodyExpected = state === 'filled' || state === 'cleared' && mode === 'editing';
    const headingExpected = ['SelectIncomeBenefitRider', 'SelectNextStep'].includes(name) && bodyExpected;
    assert.equal(calls.length, Number(bodyExpected) + Number(headingExpected), `${name}/${state}/${mode}`);
    for (const native of ['heading', 'body']) {
      const expected = native === 'heading' ? headingExpected : bodyExpected;
      const call = calls.find(call => call.field === data[native]?.jsonValue);
      assert.equal(Boolean(call), expected, `${name}.${native}/${state}/${mode}`);
      if (call) {
        assert.equal(call.editable, mode === 'editing');
        assert.equal(call.field.metadata, data[native].jsonValue.metadata);
        assert.equal(call.name, native === 'heading' ? 'Text' : 'RichText');
        if (native === 'heading') assert.equal(call.tag, 'h2');
      }
    }
    assert.equal(JSON.stringify(data), before);
    if (state === 'absent') assert.doesNotMatch(html, /<h[1-6]>|scEmptyField|Income™|IASI-/);
  }
});

test('Select finite roles expose no synthetic missing fields and keep missing datasource fallback', () => {
  const calls = [], Observed = observedModule(calls);
  for (const name of roles) for (const mode of ['normal', 'preview', 'editing']) {
    calls.length = 0;
    assert.doesNotThrow(() => renderMode(Observed[name], undefined, mode));
    assert.equal(calls.length, 0);
    calls.length = 0;
    const data = freeze({ subheading: field('subheading', '<p>UNUSED SUBHEADING</p>'),
      primaryLink: field('primaryLink', { href: '/unused', text: 'UNUSED LINK' }),
      icon: field('icon', { src: '/unused.svg', alt: 'UNUSED ICON' }) });
    const html = renderMode(Observed[name], data, mode);
    assert.equal(calls.length, 0);
    assert.doesNotMatch(html, /UNUSED|unused\.svg|href="\/unused"/);
  }
});

test('brochure CSS is scoped to its finite role and uses the exact source Download path and link grammar', () => {
  const css = fs.readFileSync(path.join(path.dirname(filename), 'AllianzSelectRichText.css'), 'utf8');
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.ok(rules.length >= 6);
  for (const [, selectors] of rules) for (const selector of selectors.split(','))
    assert.ok(selector.trim().startsWith('.allianz-select-rider-brochure .tileLink '), selector);
  const uri = css.match(/url\("(data:image\/svg\+xml,[^"]+)"\)/)?.[1];
  assert.ok(uri);
  const svg = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  assert.deepEqual(paths(svg), fixture.glyphs.download.paths);
  assert.equal(sha(JSON.stringify(paths(svg))), fixture.glyphs.download.pathListSha256);
  assert.match(svg, /viewBox="0 0 24 24"/);
  for (const sourceRule of ['font-size: 1rem', 'font-weight: 600', 'letter-spacing: .0625rem',
    'line-height: 1.5rem', 'color: #005074', 'flex: 0 0 18px', 'margin: 2px 8px 0 0',
    'background: currentColor', 'color: #06c', 'color: #003781', 'color: #8a679c', 'color: #fff']) assert.ok(css.includes(sourceRule), sourceRule);
  assert.match(css, /\.tileLink p\s*\{\s*margin: 0;/);
  assert.doesNotMatch(css, /\.allianz-iap|\.allianz-nf|#content|:has|body\s*\{|display:\s*none/);
});

test('all existing Iap, NF and Default RichText outputs match the 90 independently captured pre-Select oracles', () => {
  assert.equal(fixture.baseline.sourceSha256, '8c78bdfbdb1b0cec6c3df0a6646ecd0a52fb5a7d208115fa0a71c59701976c6a');
  assert.equal(fixture.baseline.renders.length, 90);
  for (const item of fixture.baseline.renders) {
    const data = structuredClone(fixture.baseline.envelope);
    for (const name of ['heading', 'subheading', 'body', 'primaryLink']) {
      if (item.state === 'absent') delete data[name];
      else if (item.state === 'cleared') data[name].jsonValue.value = name === 'primaryLink' ? { href: '' } : '';
    }
    freeze(data); const before = JSON.stringify(data);
    assert.equal(sha(render(Rich[item.variant], data, item.editing, params)), item.sha256,
      `${item.variant}/${item.state}/${item.editing ? 'editing' : 'visitor'}`);
    assert.equal(JSON.stringify(data), before);
  }
});
