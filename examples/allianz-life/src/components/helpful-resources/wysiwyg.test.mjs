import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const filename = path.join(sourceRoot, 'components/helpful-resources/HelpfulResources.tsx');

export function sourceLoader(sourceOverrides = {}) {
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file).exports;
    const compiled = new Module(file);
    compiled.filename = file;
    compiled.paths = Module._nodeModulePaths(path.dirname(file));
    modules.set(file, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (specifier.endsWith('.css')) return {};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`]
          .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(sourceOverrides[file] ?? fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, file);
    return compiled.exports;
  }
  return load;
}

export const components = sourceLoader()(filename);
const native = (fieldId, value, type = 'Single-Line Text', itemId = 'helpful-test-owner') => ({
  jsonValue: { value, metadata: { fieldId, itemId, fieldType: type } },
});
export const fixture = {
  id: 'helpful-test-owner', title: native('section-title', 'Helpful resources'),
  icon: native('section-icon', { src: '/test-only-information.svg', alt: 'Information', width: '24', height: '24' }, 'Image'),
  children: { results: [{ id: 'helpful-test-card',
    title: native('card-title', 'Authored resource', 'Single-Line Text', 'helpful-test-card'),
    text: native('card-text', '<p>Authored <strong>resource details</strong>.</p>', 'Rich Text', 'helpful-test-card'),
    image: native('card-image', { src: '/test-only-resource.jpg', alt: 'Resource photo', width: '704', height: '520' }, 'Image', 'helpful-test-card'),
    link: native('card-link', { href: '/contact-us', text: 'Contact us', linktype: 'internal', target: '' }, 'General Link', 'helpful-test-card'),
  }] },
};

export function render(Component, datasource, isEditing = false) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Helpful resources test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: { RenderingIdentifier: 'helpful-resources' },
    fields: { data: { datasource } } })));
}

const metadata = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
const stripChrome = (html) => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
// The SDK's editing anchor and normal Next Link serialize attributes in a
// different order. Preserve every attribute/value while comparing their DOM.
const visualMarkup = (html) => stripChrome(html).replace(/<a\b([^>]*)>/g, (_, attributes) =>
  `<a${(attributes.match(/[^\s=]+(?:="[^"]*")?/g) ?? []).sort().map((attribute) => ` ${attribute}`).join('')}>`);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
// Frozen populated normal-mode SSR hashes from the approved f2f97d59 component.
const approvedNormalHashes = {
  Default: '8f9ab933e005f920a043233ae389968eca1c96092f6a06681c6595b6074ec06d',
  Green: '22cf90a6f03d0fa895d59f7c8386cc2c401c5b1a2ec85e4083b6ac87aff206e6',
};

for (const variant of ['Default', 'Green']) {
  const Component = components[variant];
  const expectedFields = ['section-title', 'card-title', 'card-text', 'card-image', 'card-link',
    ...(variant === 'Green' ? ['section-icon'] : [])].sort();

  test(`Helpful Resources ${variant} retains populated real SDK metadata and normal visual structure`, () => {
    const before = JSON.stringify(fixture);
    const normal = render(Component, fixture);
    const editing = render(Component, fixture, true);
    assert.equal(visualMarkup(editing), visualMarkup(normal));
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), expectedFields);
    assert.deepEqual(metadata(normal), []);
    assert.match(normal, /Authored resource/);
    assert.match(normal, /Authored <strong>resource details<\/strong>/);
    assert.match(normal, /href="\/contact-us"/);
    assert.doesNotMatch(editing, /Add a helpful resource|No text in field|scEmptyImage/);
    assert.equal(JSON.stringify(fixture), before);
  });

  test(`Helpful Resources ${variant} populated normal HTML matches approved f2f97d59`, () => {
    assert.equal(sha256(render(Component, fixture)), approvedNormalHashes[variant]);
  });

  test(`Helpful Resources ${variant} empty collections have no authoring helper or empty chrome`, () => {
    const empty = { title: native('section-title', ''), icon: native('section-icon', {}, 'Image'),
      children: { results: [] } };
    const normal = render(Component, empty);
    const editing = render(Component, empty, true);
    assert.equal(editing, normal);
    assert.deepEqual(metadata(editing), []);
    assert.doesNotMatch(editing, /Add a helpful resource|role="status"|No text in field|scEmptyImage|<h[1-6]\b|<img\b|<a\b/);
  });

  for (const [name, emptyValue, absentPattern] of [
    ['title', '', /Authored resource/], ['text', '', /resource details/],
    ['image', {}, /test-only-resource\.jpg/], ['link', {}, /href="\/contact-us"/],
  ]) {
    test(`Helpful Resources ${variant} cleared card ${name} suppresses only that field`, () => {
      const data = structuredClone(fixture);
      data.children.results[0][name].jsonValue.value = emptyValue;
      const editing = render(Component, data, true);
      assert.doesNotMatch(editing, absentPattern);
      assert.doesNotMatch(editing, /No text in field|scEmptyImage|Add a helpful resource/);
      assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
        expectedFields.filter((id) => id !== `card-${name}`));
      assert.equal(visualMarkup(editing), visualMarkup(render(Component, data)));
      if (name === 'link') assert.match(editing, /<article class="m-card">/);
    });
  }

  test(`Helpful Resources ${variant} cleared section title and icon do not add canvas chrome`, () => {
    const data = structuredClone(fixture);
    data.title.jsonValue.value = '';
    data.icon.jsonValue.value = {};
    const editing = render(Component, data, true);
    assert.doesNotMatch(editing, /<h2\b|test-only-information\.svg|No text in field|scEmptyImage/);
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
      expectedFields.filter((id) => !id.startsWith('section-')));
    assert.match(editing, /Authored resource/);
    assert.equal(visualMarkup(editing), visualMarkup(render(Component, data)));
  });

  test(`Helpful Resources ${variant} empty direct fields do not resurrect fieldCollection values`, () => {
    const data = structuredClone(fixture);
    const card = data.children.results[0];
    card.fieldCollection = Object.entries(card).filter(([key]) => key !== 'id')
      .map(([name, field]) => ({ name, jsonValue: field.jsonValue }));
    for (const [name, value] of [['title', ''], ['text', ''], ['image', {}], ['link', {}]]) {
      card[name] = native(`card-${name}`, value, name === 'image' ? 'Image' : name === 'link' ? 'General Link' : 'Single-Line Text');
    }
    for (const isEditing of [false, true]) {
      const html = render(Component, data, isEditing);
      assert.doesNotMatch(html, /Authored resource|resource details|test-only-resource\.jpg|href="\/contact-us"|No text in field|scEmptyImage/);
      assert.deepEqual(metadata(html).filter((field) => field.fieldId.startsWith('card-')), []);
    }
  });
}
