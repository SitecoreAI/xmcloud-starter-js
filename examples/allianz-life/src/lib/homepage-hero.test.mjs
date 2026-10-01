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

const HomepageHero = loadSource(path.join(sourceRoot, 'components/homepage-hero/HomepageHero.tsx')).Default;
const content = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));
const captured = content.routes['/'].components.find((entry) => entry.sourceKey === '/:section:0');
const sourceData = captured.fields.data.datasource;

function render(data, params = {}, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(HomepageHero, { params, fields: { data: { datasource: data } } })));
}

function nativeField(fieldId, fieldType, value, itemId = 'native-home-hero') {
  return { jsonValue: { value, metadata: { fieldId, fieldType, itemId } } };
}

function editingIds(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map((match) =>
    JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
}

test('homepage keeps the source branded heading, semantic paragraph and fixed login composition', () => {
  const before = JSON.stringify(sourceData);
  const html = render(sourceData);
  assert.match(html, /class="l-container-full-width c-hero -login allianz-homepage-hero"/);
  assert.match(html, /class="c-hero__gridWrapper"/);
  assert.match(html, /<picture class="c-image c-stage__image--cover">/);
  assert.match(html, /class="c-hero__gridWrapperBackground"/);
  assert.match(html, /class="l-grid__column-small-12 l-grid__column-large-8"/);
  assert.match(html, /class="l-grid__column-small-12 l-grid__column-large-4 c-hero__loginForm"/);
  assert.ok(html.includes(`<h1 class="c-heading c-hero__headline">${sourceData.heading.jsonValue.value}</h1>`));
  assert.ok(html.includes(`<p class="h4 c-heading c-hero__subHeadline">${sourceData.body.jsonValue.value}</p>`));
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.match(html, /class="c-image__img c-hero__image"/);
  assert.match(html, /Username: account access unavailable/);
  assert.match(html, /Password: account access unavailable/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
  assert.doesNotMatch(html, /<form|name="password"|action="\/SPA|<source\b|Mobile image|class="a-link"/);
  assert.equal(JSON.stringify(sourceData), before);
});

test('only the one source image field is editable at every viewport, even when old fields are supplied', () => {
  const data = {
    heading: nativeField('homepage-heading', 'Rich Text', 'Native heading'),
    body: nativeField('homepage-body', 'Rich Text', 'Native body'),
    desktopImage: nativeField('homepage-image', 'Image', { src: '/native-ch-asset.jpg', alt: 'Native CH asset' }),
    mobileImage: nativeField('unused-mobile', 'Image', { src: '/old-mobile.jpg', alt: 'Unused mobile' }),
    eyebrow: nativeField('unused-eyebrow', 'Single-Line Text', 'Unused eyebrow'),
    primaryLink: nativeField('unused-primary', 'General Link', { href: '/about', text: 'Unused primary' }),
    secondaryLink: nativeField('unused-secondary', 'General Link', { href: '/about', text: 'Unused secondary' }),
  };
  const before = JSON.stringify(data);
  for (const isEditing of [false, true]) {
    const html = render(data, {}, isEditing);
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    assert.match(html, /src="\/native-ch-asset.jpg"/);
    assert.doesNotMatch(html, /old-mobile|unused-mobile|unused-eyebrow|unused-primary|unused-secondary|Unused|Mobile image|<source\b/);
    if (isEditing) assert.deepEqual(editingIds(html), ['homepage-image', 'homepage-heading', 'homepage-body']);
  }
  assert.equal(JSON.stringify(data), before);
});

test('native cleared fields keep all three SDK chrome entries without captured-content fallback', () => {
  const data = {
    heading: nativeField('cleared-heading', 'Rich Text', ''),
    body: nativeField('cleared-body', 'Rich Text', ''),
    desktopImage: nativeField('cleared-image', 'Image', {}),
  };
  const before = JSON.stringify(data);
  const editing = render(data, {}, true);
  assert.deepEqual(editingIds(editing), ['cleared-image', 'cleared-heading', 'cleared-body']);
  assert.match(editing, /\[No text in field\]/);
  assert.doesNotMatch(editing, /Allianz annuities|For more than 125 years|mountains|Mobile image|Add a datasource/);
  const publicHtml = render(data);
  assert.doesNotMatch(publicHtml, /<h1|c-hero__subHeadline|<img\b|mountains|For more than 125 years|No text in field/);
  assert.equal(JSON.stringify(data), before);
});

test('authored rich body paragraphs and inline formatting stay lossless without nested paragraphs', () => {
  const body = '<p><strong>Edited body.</strong> One paragraph.</p><p>Another <em>authored</em> paragraph.</p>';
  const data = { heading: nativeField('edited-heading', 'Rich Text', '<span>Edited <strong>heading</strong></span>'),
    body: nativeField('edited-body', 'Rich Text', body),
    desktopImage: nativeField('edited-image', 'Image', { src: '/current-ch-image.jpg', alt: 'Current CH image' }) };
  const before = JSON.stringify(data);
  for (const isEditing of [false, true]) {
    const html = render(data, {}, isEditing);
    assert.ok(html.includes(body));
    assert.match(html, /<div class="h4 c-heading c-hero__subHeadline"><p>/);
    assert.doesNotMatch(html, /<p class="h4 c-heading c-hero__subHeadline"><p>/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('fresh native CKEditor blocks retain exact values, valid heading semantics and all SDK metadata', () => {
  // Readback captured 2026-10-01T19:59:55Z; these are the raw native user-edited
  // values, not the original fixture's inline heading/plain body fragments.
  const itemId = '1d6d4c70-d235-5acb-a17f-06ee43f70ded';
  const heading = `<div class="ck-content"><p><span class="t-primary-brand"><strong>Allianz</strong></span> annuities and life insurance: for all that's ahead</p></div>`;
  const body = '<div class="ck-content"><p>For more than 125 years, Allianz Life Insurance Company of North America (Allianz) has been helping Americans like you prepare for their financial future.</p></div>';
  const data = {
    heading: nativeField('2647ad79-d006-5272-88c2-d326bb013977', 'Rich Text', heading, itemId),
    body: nativeField('bd2c23c5-e11d-5787-9fe7-0b02f945c061', 'Rich Text', body, itemId),
    desktopImage: nativeField('eaa77571-b355-5e67-8f56-fe892a46749e', 'Image', {
      src: 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/690ad1caa1dc4c0abc3b456f6674eeda?v=9585e8bc',
      alt: 'mountains', width: '2368', height: '800',
    }, itemId),
  };
  const before = JSON.stringify(data);
  for (const isEditing of [false, true]) {
    const html = render(data, {}, isEditing);
    assert.ok(html.includes(heading));
    assert.ok(html.includes(body));
    assert.match(html, /<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline"><div class="ck-content"><p>/);
    assert.match(html, /<div class="h4 c-heading c-hero__subHeadline"><div class="ck-content"><p>/);
    assert.doesNotMatch(html, /<h1\b|<p class="h4 c-heading c-hero__subHeadline">/);
    assert.equal((html.match(/<img\b/g) ?? []).length, 1);
    assert.match(html, /690ad1caa1dc4c0abc3b456f6674eeda\?v=9585e8bc/);
    if (isEditing) {
      assert.deepEqual(editingIds(html), ['eaa77571-b355-5e67-8f56-fe892a46749e',
        '2647ad79-d006-5272-88c2-d326bb013977', 'bd2c23c5-e11d-5787-9fe7-0b02f945c061']);
      assert.match(html.replaceAll('&quot;', '"'), /"itemId":"1d6d4c70-d235-5acb-a17f-06ee43f70ded"/);
    }
  }
  assert.equal(JSON.stringify(data), before);
});

test('generic layout, login, image and design controls cannot change the homepage design', () => {
  const params = { layout: 'product', theme: 'blue-soft', heroTheme: 'life', showLogin: '0', alignment: 'center',
    columns: '1', headingLevel: 'h6', spacing: 'xl', paddingTop: 'xl', paddingBottom: 'xl',
    marginBottom: 'xl', styles: 'redesign' };
  assert.equal(render(sourceData, params), render(sourceData));
  assert.match(render(sourceData, { RenderingIdentifier: 'home-hero' }), /id="home-hero"/);
});

test('absent fields do not resurrect fixture text or another image field', () => {
  const html = render({ mobileImage: sourceData.mobileImage });
  assert.doesNotMatch(html, /<img\b|<h1|c-hero__subHeadline|mountains|For more than 125 years|Add a datasource/);
  assert.match(render(undefined), /Add a datasource for Homepage Hero/);
});

test('the captured CSS keeps the single cover image and fixed login behavior across breakpoints', () => {
  const css = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');
  assert.match(css, /\.c-image__img\{display:block;font-family:"object-fit: cover;";height:auto;object-fit:cover;width:100%\}/);
  assert.match(css, /\.c-hero\.-login \.c-stage__image--cover\{position:absolute;top:0;left:0;right:0;height:100%\}/);
  assert.match(css, /\.c-hero\.-login \.c-hero__image\{height:100%\}/);
  assert.match(css, /\.c-hero\.-login \.c-hero__gridWrapper\{padding:80px 0;position:relative\}/);
  assert.match(css, /@media \(min-width:704px\)\{\.c-hero__headline\{padding-top:65px\}\.c-hero\.-login \.c-hero__headline\{padding-top:40px\}\}/);
  assert.match(css, /@media \(max-width:991px\)\{\.c-hero\.-login \.c-hero__loginForm\{display:none\}\}/);
  assert.match(css, /\.h1,h1\{font-size:2\.5rem;line-height:3rem\}/);
  assert.match(css, /@media \(min-width:704px\) and \(max-width:991px\)\{\.h1,h1\{font-size:2\.875rem;line-height:3\.5rem\}\}/);
  assert.match(css, /@media \(min-width:992px\)\{\.h1,h1\{font-size:3\.375rem;line-height:3\.75rem\}\}/);
  const nativeCss = fs.readFileSync(path.join(sourceRoot, 'components/homepage-hero/HomepageHero.css'), 'utf8');
  assert.match(nativeCss, /\.allianz-homepage-hero \.c-hero__headline\[role="heading"\] p\s*\{\s*margin: 0;\s*font: inherit;/);
  assert.doesNotMatch(nativeCss, /\.c-hero\.-login\s/);
  const props = fs.readFileSync(path.join(sourceRoot, 'components/homepage-hero/homepage-hero.props.ts'), 'utf8');
  assert.doesNotMatch(props, /mobileImage|primaryLink|secondaryLink|eyebrow|showLogin|heroTheme/);
});
