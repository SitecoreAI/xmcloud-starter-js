import { assertWysiwygCanvas } from '../../allianz-card-grid/__tests__/wysiwyg-assertions.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, render, require, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./income-rider-source-layout.fixture.json', import.meta.url)));
const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const Rich = loadSource(filename), params = fixture.baseline.params;
const sha = value => createHash('sha256').update(value).digest('hex');
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: fixture.nativeContract.id, fieldId: `fixture-only-${name}`,
  fieldType: name === 'heading' ? 'Single-Line Text' : 'Rich Text', fixtureOnly: true,
} } });
const datasource = (state = 'filled') => {
  const data = { heading: field('heading', fixture.nativeContract.heading), body: field('body', fixture.nativeContract.body),
    subheading: field('subheading', ''), primaryLink: field('primaryLink', ''), icon: field('icon', '') };
  for (const name of ['heading', 'body']) {
    if (state === 'absent') delete data[name];
    else if (state === 'cleared') data[name].jsonValue.value = '';
  }
  return freeze(data);
};
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
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Permitted rider fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}

test('Income rider matches its permitted authentic source section and exact native Heading/Body', () => {
  assert.deepEqual(fixture.source.sourceLines, [901, 936]);
  assert.equal(fixture.source.fullFileSha256FromExistingPermittedInventory, '0b150f79eba5113b90fdd4b9406238b3f656734e5e6592e6ac9353fc0f66bfaa');
  assert.equal(sha(fixture.source.sourceMarkup), fixture.source.fragmentSha256);
  assert.equal(fixture.nativeContract.heading, fixture.source.heading);
  assert.equal(fixture.nativeContract.body, fixture.source.body);
  const html = render(Rich.IncomeBenefitRider, datasource(), false, params);
  assert.equal(normalize(html), normalize(fixture.source.sourceMarkup));
  assert.ok(html.includes(fixture.nativeContract.body));
  assert.equal((html.match(/<h2>/g) || []).length, 1);
  assert.equal((html.match(/<sup>1<\/sup>/g) || []).length, 1);
  assert.equal((html.match(/class="l-grid__row"/g) || []).length, 1);
  assert.doesNotMatch(html, /<a\b|si-IB|u-padding-|u-margin-bottom-lg|m-axlIntroductionBlock|t-bg-blue-soft/);
});

test('Income retains the exact source Savings glyph and accessible decorative treatment', () => {
  const html = render(Rich.IncomeBenefitRider, datasource(), false, params);
  assert.deepEqual(paths(html), fixture.source.savingsPaths);
  assert.equal(sha(JSON.stringify(paths(html))), '0aa19e72b6627464df31b685a0859da3344c0da98d711eae895ede5bfd042ac6');
  assert.match(html, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"[^>]*viewBox="0 0 24 24"/);
  assert.match(html, /class="tileSubGrid__image"><div class="tileIcon t-bg-transparent t-icon-primary-black"/);
  assert.doesNotMatch(html, /role="img"|titleIcon|<img\b/);
});

test('Income and Select riders differ only by the source-specific named anchor across all field states and modes', () => {
  for (const state of ['filled', 'cleared', 'absent']) for (const mode of ['normal', 'preview', 'editing']) {
    const data = datasource(state), before = JSON.stringify(data);
    const income = renderMode(Rich.IncomeBenefitRider, data, mode);
    const select = renderMode(Rich.SelectIncomeBenefitRider, data, mode);
    assert.ok(select.includes('<a name="si-IB"></a>'));
    assert.equal(income, select.replace('<a name="si-IB"></a>', ''), `${state}/${mode}`);
    assert.equal(JSON.stringify(data), before);
  }
});

test('Income passes original populated fields to SDK and omits cleared or absent canvas controls', () => {
  const calls = [], Observed = observedModule(calls);
  for (const state of ['filled', 'cleared', 'absent']) for (const mode of ['normal', 'preview', 'editing']) {
    calls.length = 0; const data = datasource(state), before = JSON.stringify(data);
    const html = renderMode(Observed.IncomeBenefitRider, data, mode);
    const expected = state === 'filled';
    assert.equal(calls.length, expected ? 2 : 0, `${state}/${mode}`);
    for (const native of ['heading', 'body']) {
      const call = calls.find(call => call.field === data[native]?.jsonValue);
      assert.equal(Boolean(call), expected);
      if (call) {
        assert.equal(call.editable, mode === 'editing');
        assert.equal(call.field.metadata, data[native].jsonValue.metadata);
        assert.equal(call.name, native === 'heading' ? 'Text' : 'RichText');
        if (native === 'heading') assert.equal(call.tag, 'h2');
      }
    }
    assert.equal(JSON.stringify(data), before);
    if (state === 'absent') assert.doesNotMatch(html, /<h[1-6]>|scEmptyField|Income®/);
  }
  for (const mode of ['normal', 'preview', 'editing']) {
    calls.length = 0;
    assert.doesNotThrow(() => renderMode(Observed.IncomeBenefitRider, undefined, mode));
    assert.equal(calls.length, 0);
  }
});

test('only native Heading and Body are exposed; future authored values remain complete and unchanged', () => {
  const calls = [], Observed = observedModule(calls);
  const heading = field('heading', 'Future authored heading');
  const body = field('body', '<p>Future <strong>authored</strong> body<sup>7</sup> <a href="/approved-author-path" target="_blank" aria-label="Authored aria">Authored label</a></p>');
  const data = freeze({ heading, body, subheading: field('subheading', '<p>UNUSED SUBHEADING</p>'),
    primaryLink: field('primaryLink', { href: '/unused', text: 'UNUSED LINK' }),
    icon: field('icon', { src: '/unused.svg', alt: 'UNUSED ICON' }) });
  for (const mode of ['normal', 'preview', 'editing']) {
    calls.length = 0; const html = renderMode(Observed.IncomeBenefitRider, data, mode);
    assert.equal(calls.length, 2);
    assert.ok(calls.some(call => call.name === 'Text' && call.field === heading.jsonValue));
    assert.ok(calls.some(call => call.name === 'RichText' && call.field === body.jsonValue));
    assert.ok(html.includes(body.jsonValue.value));
    assert.doesNotMatch(html, /UNUSED|unused\.svg|href="\/unused"|Index Advantage\+|si-IB/);
  }
});

test('pre-Income Select, Iap, NF and Default visitor oracles remain identical and editing follows WYSIWYG', () => {
  assert.equal(fixture.baseline.sourceSha256, '101ca7ea34d13df17cf844659d9077c4ed265e9e1c578c271c7cfc4714bd0859');
  assert.equal(fixture.baseline.renders.length, 114);
  for (const item of fixture.baseline.renders) {
    const data = structuredClone(fixture.baseline.envelope);
    for (const name of ['heading', 'subheading', 'body', 'primaryLink']) {
      if (item.state === 'absent') delete data[name];
      else if (item.state === 'cleared') data[name].jsonValue.value = name === 'primaryLink' ? { href: '' } : '';
    }
    freeze(data); const before = JSON.stringify(data);
    const visitor = render(Rich[item.variant], data, false, params);
    if (!item.editing) assert.equal(sha(visitor), item.sha256, `${item.variant}/${item.state}/visitor`);
    else assertWysiwygCanvas(visitor, render(Rich[item.variant], data, true, params), data, `${item.variant}/${item.state}/editing`);
    assert.equal(JSON.stringify(data), before);
  }
});
