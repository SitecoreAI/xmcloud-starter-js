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

// Only local TypeScript is transpiled. All field renderers and the provider are
// the installed SDK, so these tests exercise native field metadata and Link.
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

const Partnership = loadSource(path.join(sourceRoot,
  'components/olympic-partnership/OlympicPartnership.tsx')).Default;
const capturedText = '<p>\nAllianz, the Worldwide Insurance Partner for the Olympic and Paralympic Movements, is proud to support and empower athletes to achieve greatness and inspire millions around the globe.</p>';
const captured = {
  id: '3A3A49F2-C517-53B6-9CFE-267198FEC753',
  partnershipLogo: { jsonValue: { value: {
    src: '/allianz-assets/b4c93bec95f870e9.png',
    alt: 'Allianz Olympics and Paralympics Movements logo, Allianz The Official Insurer',
  } } },
  partnershipText: { jsonValue: { value: capturedText } },
  partnershipLink: { jsonValue: { value: {
    href: '/about/olympic-and-paralympic-partnership',
    text: 'Learn more about our partnership', linktype: 'internal', target: '',
  } } },
};

function render(datasource, { params = {}, isEditing = false, omitFields = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Partnership, {
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

test('partnership preserves the recovered Home section without card or heading scaffolding', () => {
  const before = JSON.stringify(captured);
  const html = render(captured);
  for (const classes of [
    'l-container--full-width t-bg-transparent axlTileCollection allianz-olympic-partnership',
    'l-grid l-grid--max-width', 'l-grid__row u-padding-bottom-xl u-padding-top-xl',
    'l-grid__column-medium-12', 'o-richTextEditor__wrapper', 'tileBody', 'bordered',
    'tileBody u-font-size-xl',
  ]) assert.ok(html.includes(`class="${classes}"`), classes);
  assert.ok(html.includes(capturedText));
  assert.match(html, /<img alt="Allianz Olympics and Paralympics Movements logo, Allianz The Official Insurer" src="\/allianz-assets\/b4c93bec95f870e9.png"\/>/);
  assert.match(html, /href="\/about\/olympic-and-paralympic-partnership"/);
  assert.match(html, /aria-label="Learn more about our partnership"/);
  assert.match(html, /<span aria-hidden="true" class="a-link__icon"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fill-rule="evenodd"/);
  assert.match(html, /<span class="a-link__text">Learn more about our partnership<\/span>/);
  assert.doesNotMatch(html, /<article|<header|<footer|<h[1-6]|tileHeading|tileSubHeading|tileSubGrid|tileLink|match-height|m-axlTile/);
  assert.deepEqual(metadata(html), []);
  assert.equal(JSON.stringify(captured), before);
});

test('named GraphQL fields carry authored semantic content and safe SDK link attributes', () => {
  const authored = {
    partnershipLogo: nativeField('logo', 'Image', { src: '/allianz-assets/authored-logo.svg', alt: 'Authored logo' }),
    partnershipText: nativeField('text', 'Rich Text', '<p>Authored <strong>partnership</strong>.</p><p>Second paragraph.</p>'),
    partnershipLink: nativeField('link', 'General Link', {
      href: 'https://www.allianzlife.com/about/olympic-and-paralympic-partnership',
      querystring: 'campaign=olympic&source=home', anchor: 'partnership', text: 'Explore the partnership', target: '_blank',
    }),
  };
  const before = JSON.stringify(authored);
  const html = render(authored);
  assert.match(html, /src="\/allianz-assets\/authored-logo.svg"/);
  assert.match(html, /<p>Authored <strong>partnership<\/strong>.<\/p><p>Second paragraph.<\/p>/);
  assert.match(html, /href="\/about\/olympic-and-paralympic-partnership\?campaign=olympic&amp;source=home#partnership"/);
  assert.match(html, /<span class="a-link__text">Explore the partnership<\/span>/);
  assert.doesNotMatch(html, /Worldwide Insurance Partner|b4c93bec95f870e9|target="_blank"/);
  assert.equal(JSON.stringify(authored), before);
  assert.deepEqual(metadata(html), []);
  const editing = render(authored, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['native-link', 'native-logo', 'native-text']);
  assert.ok(metadata(editing).every((field) => field.itemId === captured.id));
  assert.match(editing, /href="https:\/\/www.allianzlife.com\/about\/olympic-and-paralympic-partnership\?campaign=olympic&amp;source=home#partnership"/);
  assert.match(editing, /target="_blank"/);
  assert.equal(JSON.stringify(authored), before);
});

test('presentation stays fixed when historic kitchen-sink parameters are passed', () => {
  assert.equal(render(captured), render(captured, { params: {
    layout: 'cards', theme: 'blue-soft', columns: '4', alignment: 'left', headingLevel: 'h1',
    spacing: 'sm', paddingTop: 'none', paddingBottom: 'lg', marginBottom: 'xl',
    styles: 'authored-override', splitRatio: '33:67',
  } }));
  assert.match(render(captured, { params: { RenderingIdentifier: 'olympic-partnership' } }),
    /id="olympic-partnership"/);
});

test('all three cleared native fields keep SDK editor chrome and never restore source values', () => {
  const cleared = {
    partnershipLogo: nativeField('logo', 'Image', {}),
    partnershipText: nativeField('text', 'Rich Text', ''),
    partnershipLink: nativeField('link', 'General Link', { href: '', text: '' }),
  };
  const before = JSON.stringify(cleared);
  const editing = render(cleared, { isEditing: true });
  assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(), ['native-link', 'native-logo', 'native-text']);
  assert.ok(metadata(editing).every((field) => field.itemId === captured.id));
  assert.match(editing, /scEmptyImage/);
  assert.match(editing, /\[No text in field\]/);
  assert.doesNotMatch(editing, /Worldwide Insurance Partner|b4c93bec95f870e9|Learn more about our partnership|href="\/"/);
  const normal = render(cleared);
  assert.deepEqual(metadata(normal), []);
  assert.doesNotMatch(normal, /<img|<a[ >]|<svg|scEmptyImage|\[No text in field\]|Worldwide Insurance Partner|b4c93bec95f870e9|Learn more about our partnership/);
  assert.equal(JSON.stringify(cleared), before);
});

for (const [name, type, value] of [
  ['partnershipLogo', 'Image', {}],
  ['partnershipText', 'Rich Text', ''],
  ['partnershipLink', 'General Link', {}],
]) {
  test(`clearing ${name} preserves its editor field and the other two authored fields`, () => {
    const data = { ...captured, [name]: nativeField(name, type, value) };
    const editing = render(data, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId), [`native-${name}`]);
    const normal = render(data);
    if (name === 'partnershipLogo') {
      assert.doesNotMatch(normal, /<img|b4c93bec95f870e9/);
      assert.ok(normal.includes(capturedText));
      assert.match(normal, /Learn more about our partnership/);
    } else if (name === 'partnershipText') {
      assert.doesNotMatch(normal, /Worldwide Insurance Partner/);
      assert.match(normal, /b4c93bec95f870e9/);
      assert.match(normal, /Learn more about our partnership/);
    } else {
      assert.doesNotMatch(normal, /<a[ >]|Learn more about our partnership|<svg/);
      assert.match(normal, /b4c93bec95f870e9/);
      assert.ok(normal.includes(capturedText));
    }
  });
}

test('legacy parent and child values cannot fill absent or cleared purpose fields', () => {
  const unrelated = {
    heading: { jsonValue: { value: 'Unused heading' } },
    subheading: { jsonValue: { value: 'Unused subheading' } },
    body: { jsonValue: { value: '<p>Historical body must stay unused.</p>' } },
    primaryLink: captured.partnershipLink,
    children: { results: [{ image: captured.partnershipLogo, body: captured.partnershipText, link: captured.partnershipLink }] },
  };
  for (const isEditing of [false, true]) {
    const html = render(unrelated, { isEditing });
    assert.doesNotMatch(html, /Unused|Historical body|Worldwide Insurance Partner|b4c93bec95f870e9|<img|<a[ >]|\[No text in field\]/);
    assert.deepEqual(metadata(html), []);
  }
});

test('missing datasource provides a clear assignment fallback without phantom fields', () => {
  for (const isEditing of [false, true]) {
    for (const omitFields of [false, true]) {
      const html = render(undefined, { isEditing, omitFields });
      assert.match(html, /class="allianz-missing-data" role="status"/);
      assert.match(html, /Add a datasource for Olympic Partnership./);
      assert.deepEqual(metadata(html), []);
    }
  }
});
