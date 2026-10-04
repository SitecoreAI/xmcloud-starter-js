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
const postcss = require('postcss');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const componentRoot = path.join(sourceRoot, 'components/secure-future-feature');
const modules = new Map();

// Transpile local source only. SDK field renderers and SitecoreProvider are real.
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
      const resolved = [local, `${local}.ts`, `${local}.tsx`, path.join(local, 'index.ts')]
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

const Feature = loadSource(path.join(componentRoot, 'SecureFutureFeature.tsx')).Default;
const heading = 'Everything we do serves a single purpose: to secure your future.';
const body = '<ul>\n    <li>We invest for long-term results.</li>\n    <li>Our investment manager, Allianz Investment Management LLC, manages risk in-house, in real time.</li>\n    <li>We maintain consistently high ratings.</li>\n    <li>We have a long history of keeping our promises.</li>\n</ul>';
const captured = {
  id: 'secure-future-native-datasource',
  heading: { jsonValue: { value: heading } },
  body: { jsonValue: { value: body } },
  image: { jsonValue: { value: { src: '/allianz-assets/8b7ef1466f2b5b1f.jpg', alt: 'couple' } } },
  icon: { jsonValue: { value: { src: '/allianz-assets/0553a9a67d14fa22.svg', alt: 'Badge' } } },
  link: { jsonValue: { value: { href: '/why-allianz',
    text: 'See why you should consider Allianz', linktype: 'internal', target: '' } } },
};

function render(datasource, { params = {}, isEditing = false, omitFields = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Feature, {
    params, ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}

function nativeField(name, type, value) {
  return { jsonValue: { value,
    metadata: { fieldId: `native-${name}`, fieldType: type, itemId: captured.id } } };
}

function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('the five root fields reproduce the captured Home feature and semantic list', () => {
  const before = JSON.stringify(captured);
  const html = render(captured);
  for (const classes of [
    'l-container--full-width t-bg-transparent axlTileCollection allianz-secure-future-feature',
    'l-grid l-grid--max-width', 'l-grid__row match-height-row', 'l-grid__column-medium-12',
    'm-axlTile match-height tile--5050 -is--flipped -is--split t-bg-transparent u-margin-bottom-xl',
    'tileContent u-text-left', 'tileSubGrid__image', 'tileIcon t-bg-transparent t-icon-primary-black',
    'tileSubGrid__content', 'tileHeading', 'tileBody u-font-size-md', 'tileLink', 'tileImage',
    'c-image c-teaser__image', 'c-image__img c-teaser__image-img',
  ]) assert.ok(html.includes(`class="${classes}"`), classes);
  assert.match(html, new RegExp(`<h3>${heading}</h3>`));
  assert.ok(html.includes(body));
  assert.equal((html.match(/<li>/g) ?? []).length, 4);
  assert.equal((html.match(/<article[ >]/g) ?? []).length, 1);
  assert.equal((html.match(/<a[ >]/g) ?? []).length, 1);
  assert.equal((html.match(/<img[ >]/g) ?? []).length, 2);
  assert.match(html, /alt="Badge" src="\/allianz-assets\/0553a9a67d14fa22.svg"/);
  assert.match(html, /alt="couple" class="c-image__img c-teaser__image-img" src="\/allianz-assets\/8b7ef1466f2b5b1f.jpg"/);
  assert.ok(html.indexOf('class="tileContent u-text-left"') < html.indexOf('class="tileImage"'));
  assert.match(html, /href="\/why-allianz"/);
  assert.match(html, /aria-label="See why you should consider Allianz"/);
  assert.match(html, /<span aria-hidden="true" class="a-link__icon"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fill-rule="evenodd"/);
  assert.match(html, /<span class="a-link__text">See why you should consider Allianz<\/span>/);
  assert.doesNotMatch(html, /tileSubHeading|tileAlphanumeral|m-axlIntroductionBlock|o-cards|<h[12456]/);
  assert.deepEqual(metadata(html), []);
  assert.equal(JSON.stringify(captured), before);
});

test('native fields preserve their metadata and raw authoring link while visitors use the adapter', () => {
  const authored = {
    heading: nativeField('heading', 'Single-Line Text', 'Authored feature heading'),
    body: nativeField('body', 'Rich Text', '<p>Authored <strong>feature</strong>.</p><ul><li>First</li><li>Second</li></ul>'),
    image: nativeField('image', 'Image', {
      src: 'https://media.example.test/native-couple.jpg?delivery=original', alt: 'Authored couple',
      width: '1120', height: '740', 'data-mediaid': '{native-photo}',
    }),
    icon: nativeField('icon', 'Image', {
      src: 'https://media.example.test/native-badge.svg?delivery=original', alt: 'Authored badge',
      width: '24', height: '24', 'data-mediaid': '{native-badge}',
    }),
    link: nativeField('link', 'General Link', {
      href: 'https://www.allianzlife.com/why-allianz', text: 'Authored destination',
      querystring: 'campaign=feature&source=home', anchor: 'ratings', target: '_blank',
      title: 'Authored title', class: 'authored-link',
    }),
  };
  const before = JSON.stringify(authored);
  const normal = render(authored);
  assert.match(normal, /<h3>Authored feature heading<\/h3>/);
  assert.match(normal, /<p>Authored <strong>feature<\/strong>.<\/p><ul><li>First<\/li><li>Second<\/li><\/ul>/);
  assert.match(normal, /src="https:\/\/media.example.test\/native-couple.jpg\?delivery=original"/);
  assert.match(normal, /src="https:\/\/media.example.test\/native-badge.svg\?delivery=original"/);
  assert.match(normal, /data-mediaid="\{native-photo\}"/);
  assert.match(normal, /data-mediaid="\{native-badge\}"/);
  assert.match(normal, /href="\/why-allianz\?campaign=feature&amp;source=home#ratings"/);
  assert.match(normal, /title="Authored title"/);
  assert.match(normal, /target="_blank"/);
  assert.doesNotMatch(normal, /Everything we do|0553a9a67d14fa22|8b7ef1466f2b5b1f/);
  assert.deepEqual(metadata(normal), []);
  const editing = render(authored, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
    ['native-body', 'native-heading', 'native-icon', 'native-image', 'native-link']);
  assert.ok(metadata(editing).every((field) => field.itemId === captured.id));
  assert.match(editing, /href="https:\/\/www.allianzlife.com\/why-allianz\?campaign=feature&amp;source=home#ratings"/);
  assert.match(editing, /target="_blank"/);
  assert.equal(JSON.stringify(authored), before);
});

test('cleared fields retain all five real SDK editing regions without restored content', () => {
  const cleared = {
    heading: nativeField('heading', 'Single-Line Text', ''),
    body: nativeField('body', 'Rich Text', ''),
    image: nativeField('image', 'Image', {}),
    icon: nativeField('icon', 'Image', {}),
    link: nativeField('link', 'General Link', { href: '', text: '' }),
  };
  const before = JSON.stringify(cleared);
  const editing = render(cleared, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
    ['native-body', 'native-heading', 'native-icon', 'native-image', 'native-link']);
  assert.ok(metadata(editing).every((field) => field.itemId === captured.id));
  assert.equal((editing.match(/scEmptyImage/g) ?? []).length, 2);
  assert.equal((editing.match(/\[No text in field\]/g) ?? []).length, 2);
  assert.doesNotMatch(editing, /Everything we do|We invest|Badge|couple|See why|href="\/"/);
  const normal = render(cleared);
  assert.deepEqual(metadata(normal), []);
  assert.doesNotMatch(normal, /<img|<a[ >]|<svg|<h3|<header|<footer|scEmptyImage|\[No text in field\]|Everything we do|We invest|Badge|couple|See why/);
  assert.equal(JSON.stringify(cleared), before);
});

for (const [name, type, value, removed] of [
  ['heading', 'Single-Line Text', '', /Everything we do|<h3/],
  ['body', 'Rich Text', '', /We invest|<ul/],
  ['image', 'Image', {}, /8b7ef1466f2b5b1f|alt="couple"/],
  ['icon', 'Image', {}, /0553a9a67d14fa22|alt="Badge"/],
  ['link', 'General Link', {}, /<a[ >]|<svg|See why you should consider Allianz/],
]) {
  test(`clearing ${name} keeps its real editor chrome and the other four authored fields`, () => {
    const data = { ...captured, [name]: nativeField(name, type, value) };
    const editing = render(data, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId), [`native-${name}`]);
    const normal = render(data);
    assert.doesNotMatch(normal, removed);
    const expected = {
      heading, body, image: '/allianz-assets/8b7ef1466f2b5b1f.jpg',
      icon: '/allianz-assets/0553a9a67d14fa22.svg', link: 'See why you should consider Allianz',
    };
    for (const [fieldName, text] of Object.entries(expected)) {
      if (fieldName !== name) assert.ok(normal.includes(text), `${fieldName} survives clearing ${name}`);
    }
  });
}

test('historic presentation parameters cannot redesign the fixed source feature', () => {
  assert.equal(render(captured), render(captured, { params: {
    layout: 'cards', theme: 'blue-soft', columns: '4', alignment: 'center', headingLevel: 'h1',
    spacing: 'sm', paddingTop: 'xl', paddingBottom: 'lg', marginBottom: 'none',
    styles: 'authored-override', splitRatio: '33:67', iconTheme: 'primary-brand',
  } }));
  assert.match(render(captured, { params: { RenderingIdentifier: 'secure-future' } }), /id="secure-future"/);
});

test('legacy children and redundant link lists cannot supply absent or cleared root fields', () => {
  const unrelated = {
    subheading: { jsonValue: { value: 'Historical subheading' } },
    alphanumeral: { jsonValue: { value: 'Historical number' } },
    children: { results: [captured] }, links: { targetItems: [{ link: captured.link }] },
  };
  for (const isEditing of [false, true]) {
    const html = render(unrelated, { isEditing });
    assert.doesNotMatch(html, /Historical|Everything we do|We invest|0553a9a67d14fa22|8b7ef1466f2b5b1f|<img|<a[ >]|\[No text in field\]/);
    assert.deepEqual(metadata(html), []);
    const cleared = { ...unrelated, heading: nativeField('heading', 'Single-Line Text', '') };
    const clearedHtml = render(cleared, { isEditing });
    assert.doesNotMatch(clearedHtml, /Everything we do|Historical|We invest|See why/);
    assert.equal(metadata(clearedHtml).length, isEditing ? 1 : 0);
  }
});

test('named query requests only the five root content fields', () => {
  const query = fs.readFileSync(path.join(componentRoot, 'secure-future-feature.query.graphql'), 'utf8');
  assert.match(query, /^query SecureFutureFeature\(\$datasource: String!, \$language: String!\)/);
  assert.deepEqual([...query.matchAll(/(\w+): field\(name: "(\w+)"\) \{ jsonValue \}/g)]
    .map((match) => [match[1], match[2]]),
  [['heading', 'heading'], ['body', 'body'], ['image', 'image'], ['icon', 'icon'], ['link', 'link']]);
  assert.doesNotMatch(query, /children|subheading|alphanumeral|theme|headingLevel|links|spacing|style/);
});

test('source CSS controls native split, typography and spacing; only badge image adaptation is scoped', () => {
  const css = postcss.parse(fs.readFileSync(path.join(componentRoot, 'SecureFutureFeature.css'), 'utf8'));
  const rules = [];
  css.walkRules((rule) => {
    assert.ok(rule.selector.startsWith('.allianz-secure-future-feature '));
    assert.match(rule.selector, /\.tileIcon img:not\(\.scEmptyImage\)$/);
    assert.doesNotMatch(rule.toString(), /flex-direction|font-family|font-size|padding|margin/);
    rules.push(rule);
  });
  assert.equal(rules.length, 2);
  assert.equal(rules[0].nodes.find((node) => node.prop === 'width').value, '26px');
  assert.equal(rules[1].nodes.find((node) => node.prop === 'width').value, '40px');
  assert.equal(rules[1].parent.params, '(min-width: 704px)');
  const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const sourceRules = [];
  source.walkRules((rule) => sourceRules.push(rule));
  const flipped = sourceRules.find((rule) => rule.selector === '.m-axlTile.-is--split.-is--flipped');
  assert.equal(flipped.parent.params, '(min-width:704px)');
  assert.equal(flipped.nodes.find((node) => node.prop === 'flex-direction').value, 'row-reverse');
  const half = sourceRules.find((rule) => rule.selector === '.tile--5050 .tileContent,.tile--5050 .tileImage');
  assert.equal(half.parent.params, '(min-width:704px)');
  assert.equal(half.nodes.find((node) => node.prop === 'width').value, '50%');
  const h3 = sourceRules.filter((rule) => rule.selector === '.h3,h3');
  assert.equal(h3[0].nodes.find((node) => node.prop === 'font-size').value, '1.625rem');
  assert.equal(h3[1].parent.params, '(min-width:992px)');
  assert.equal(h3[1].nodes.find((node) => node.prop === 'font-size').value, '1.875rem');
  assert.ok(sourceRules.some((rule) => rule.selector === '.u-margin-bottom-xl' &&
    rule.nodes.some((node) => node.prop === 'margin-bottom' && node.value === '64px')));
});

test('missing datasource exposes only assignment status without phantom editable content', () => {
  for (const isEditing of [false, true]) {
    for (const omitFields of [false, true]) {
      const html = render(undefined, { isEditing, omitFields });
      assert.match(html, /class="allianz-missing-data" role="status"/);
      assert.match(html, /Add a datasource for Secure Future Feature./);
      assert.deepEqual(metadata(html), []);
    }
  }
});
