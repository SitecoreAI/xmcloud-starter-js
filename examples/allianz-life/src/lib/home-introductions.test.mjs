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
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const appRoot = path.resolve(sourceRoot, '..');
// Exact recovered source containers are test references, never runtime content.
const recoveredHome = ['retirement-solutions-intro', 'retirement-goals-intro', 'product-disclosures']
  .map((directory) => fs.readFileSync(path.join(sourceRoot,
    `components/${directory}/__tests__/${directory}.source.html`), 'utf8')).join('\n');
const recoveredCss = fs.readFileSync(path.join(appRoot,
  'public/allianz-assets/source-style.css'), 'utf8');
const modules = new Map();

// Only local TypeScript and stylesheet imports are handled here. Field renderers
// and the editing provider are the real installed Sitecore SDK.
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

const components = [
  { name: 'RetirementSolutionsIntro', directory: 'retirement-solutions-intro',
    fields: ['heading', 'body', 'icon'], sourceKey: '/:section:2',
    datasource: {
      heading: { jsonValue: { value: 'Allianz is a leading provider of retirement solutions' } },
      body: { jsonValue: { value: '<p>Our innovative products give you and your family financial protection and guaranteed retirement income.</p>' } },
      icon: { jsonValue: { value: { src: '/allianz-assets/315429dcca05b7d8.svg', alt: 'Badge Ribbon' } } },
    } },
  { name: 'RetirementGoalsIntro', directory: 'retirement-goals-intro',
    fields: ['heading', 'body'], sourceKey: '/:section:4',
    datasource: {
      heading: { jsonValue: { value: 'Why consider Allianz for your retirement goals?' } },
      body: { jsonValue: { value: '<p>We&rsquo;re committed to you for the long term.</p>' } },
    } },
  { name: 'ProductDisclosures', directory: 'product-disclosures',
    fields: ['body'], sourceKey: '/:section:7',
    datasource: { body: { jsonValue: { value: recoveredHome.match(
      /<div class="tileBody">\s*(<p>Life insurance including annuities[\s\S]*?)\s*<\/div>/)[1] } } } },
];
for (const component of components) component.rendering = loadSource(path.join(sourceRoot,
  `components/${component.directory}/${component.name}.tsx`)).Default;

function render(component, datasource, { params = {}, isEditing = false, omitFields = false } = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Home', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(component.rendering, {
    params, ...(omitFields ? {} : { fields: { data: { datasource } } }),
  })));
}

function nativeField(name, value, itemId) {
  return { jsonValue: { value, metadata: {
    fieldId: `native-${name}`, fieldType: name === 'icon' ? 'Image' : name === 'body' ? 'Rich Text' : 'Single-Line Text',
    itemId,
  } } };
}

function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('Solutions preserves the recovered blue, centered source tile with xl copy and native SVG image', () => {
  const component = components[0];
  const before = JSON.stringify(component.datasource);
  const html = render(component, component.datasource);
  assert.match(recoveredHome, /<a name="solutions"><\/a>/);
  assert.match(recoveredHome, /<H2>Allianz is a leading provider of retirement solutions<\/H2>/);
  assert.ok(recoveredHome.includes(component.datasource.body.jsonValue.value));
  for (const classes of [
    'l-container--full-width t-bg-blue-soft axlTileCollection allianz-retirement-solutions-intro',
    'l-grid l-grid--max-width', 'l-grid__row', 'l-grid__column-medium-12',
    'm-axlTile match-height -is--stacked t-bg-transparent', 'tileContent u-text-center',
    'tileSubGrid__image', 'tileIcon t-bg-transparent t-icon-primary-black',
    'tileSubGrid__content', 'tileHeading', 'tileBody u-font-size-xl',
  ]) assert.ok(html.includes(`class="${classes}"`), classes);
  assert.match(html, /id="solutions"/);
  assert.equal((render(component, component.datasource, { params: { RenderingIdentifier: 'solutions' } })
    .match(/id="solutions"/g) || []).length, 1);
  assert.match(html, /<h2>Allianz is a leading provider of retirement solutions<\/h2>/);
  assert.match(html, /<img alt="Badge Ribbon" src="\/allianz-assets\/315429dcca05b7d8.svg"\/>/);
  assert.ok(html.includes(component.datasource.body.jsonValue.value));
  assert.doesNotMatch(html, /m-axlIntroductionBlock|match-height-row|tileSubHeading|tileLink|u-font-size-md/);
  assert.equal(JSON.stringify(component.datasource), before);
});

test('Solutions external Image preserves the captured SVG shape, black fill and responsive sizes', () => {
  const css = fs.readFileSync(path.join(sourceRoot,
    'components/retirement-solutions-intro/RetirementSolutionsIntro.css'), 'utf8');
  const svg = fs.readFileSync(path.join(appRoot, 'public/allianz-assets/315429dcca05b7d8.svg'), 'utf8');
  const sourcePath = recoveredHome.match(/titleIconBadgeRibbon[\s\S]*?<path d="([^"]+)"/)[1];
  assert.ok(svg.includes(`d="${sourcePath}"`));
  assert.ok(recoveredCss.includes('.t-icon-primary-black svg{fill:#3c3c3c!important}'));
  assert.match(css, /\.allianz-retirement-solutions-intro \.tileIcon img\s*\{\s*width: 26px;/);
  assert.match(css, /filter: brightness\(0\) invert\(23\.5294%\)/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*width: 40px;/);
});

test('Goals uses the actual source Tile wrappers and centered h2 rather than generic IntroductionBlock', () => {
  const component = components[1];
  const html = render(component, component.datasource);
  const recoveredTile = recoveredHome.slice(recoveredHome.indexOf(
    '<H2>Why consider Allianz for your retirement goals?</H2>') - 420);
  assert.match(recoveredTile, /article class="m-axlTile match-height\s+-is--stacked\s+t-bg-transparent/);
  assert.ok(recoveredHome.includes(component.datasource.body.jsonValue.value));
  for (const classes of [
    'l-container--full-width t-bg-transparent axlTileCollection', 'l-grid l-grid--max-width',
    'l-grid__row', 'l-grid__column-medium-12', 'm-axlTile match-height -is--stacked t-bg-transparent',
    'tileContent u-text-center', 'tileSubGrid__content', 'tileHeading', 'tileBody u-font-size-xl',
  ]) assert.ok(html.includes(`class="${classes}"`), classes);
  assert.match(html, /<h2>Why consider Allianz for your retirement goals\?<\/h2>/);
  assert.ok(html.includes(component.datasource.body.jsonValue.value));
  assert.doesNotMatch(html, /m-axlIntroductionBlock|tileSubHeading|tileSubGrid__image|<img|<svg|tileLink|<h[13456]/);
});

test('Disclosures preserves the muted source IntroductionBlock, inert spacing scaffold and full semantic body', () => {
  const component = components[2];
  const html = render(component, component.datasource);
  for (const classes of [
    'l-container--full-width t-bg-grey-muted axlTileCollection', 'l-grid l-grid--max-width',
    'l-grid__row', 'l-grid__column-medium-12', 'm-axlIntroductionBlock -is--stacked -no--image',
    'tileContent u-text-left', 'tileBody',
  ]) assert.ok(html.includes(`class="${classes}"`), classes);
  assert.match(html, /<header aria-hidden="true"><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header>/);
  assert.ok(html.includes(component.datasource.body.jsonValue.value));
  assert.equal((html.match(/<p>/g) || []).length, 13);
  assert.match(html, /<strong>Investment involves risk including possible loss of principal<\/strong>/);
  assert.doesNotMatch(html, /a-axlDisclosures|content-body disclosure|u-font-size-xl|<h[1-6]|tileLink|<img|<svg/);
  assert.deepEqual(metadata(html), []);
});

for (const component of components) {
  test(`${component.name} has a named root query containing exactly its purpose fields`, () => {
    const query = fs.readFileSync(path.join(sourceRoot,
      `components/${component.directory}/${component.directory}.graphql`), 'utf8');
    const operation = parse(query).definitions[0];
    assert.equal(operation.name.value, `${component.name}Data`);
    assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value),
      ['datasource', 'language']);
    const datasource = operation.selectionSet.selections[0];
    assert.equal(datasource.alias.value, 'datasource');
    assert.equal(datasource.name.value, 'item');
    assert.deepEqual(datasource.arguments.map((argument) => [argument.name.value, argument.value.name.value]),
      [['path', 'datasource'], ['language', 'language']]);
    assert.deepEqual(datasource.selectionSet.selections.map((selection) => selection.alias?.value || selection.name.value),
      ['id', ...component.fields]);
    for (const selection of datasource.selectionSet.selections.slice(1)) {
      assert.equal(selection.name.value, 'field');
      assert.deepEqual(selection.arguments.map((argument) => [argument.name.value, argument.value.value]),
        [['name', selection.alias.value]]);
      assert.deepEqual(selection.selectionSet.selections.map((entry) => entry.name.value), ['jsonValue']);
    }
  });

  test(`${component.name} ignores generic design parameters and unused fields`, () => {
    const unused = {
      ...component.datasource,
      subheading: nativeField('unused-subheading', '<h1>Unused subheading</h1>'),
      primaryLink: { jsonValue: { value: { href: '/unused-link', text: 'Unused link' } } },
      theme: { jsonValue: { value: 'primary-brand' } },
      headingLevel: { jsonValue: { value: 'h1' } },
      children: { results: [{ heading: { jsonValue: { value: 'Unused child heading' } },
        body: { jsonValue: { value: '<p>Unused child body</p>' } } }] },
    };
    if (component.name === 'ProductDisclosures') unused.heading = nativeField('unused-heading', 'Unused heading');
    const params = { layout: 'cards', theme: 'primary-brand', columns: '4', alignment: 'right',
      headingLevel: 'h1', spacing: 'lg', paddingTop: 'xl', paddingBottom: 'none', marginBottom: 'xl',
      styles: 'unused-author-style', splitRatio: '33:67', iconTheme: 'primary-brand' };
    assert.equal(render(component, component.datasource), render(component, unused, { params }));
    const editing = render(component, unused, { params, isEditing: true });
    assert.doesNotMatch(editing, /Unused|unused-link|unused-author-style/);
    assert.deepEqual(metadata(editing), []);
    assert.match(render(component, component.datasource, { params: { RenderingIdentifier: 'authored-id' } }),
      /id="authored-id"/);
  });

  test(`${component.name} renders authored block HTML intact and retains native field IDs`, () => {
    const body = '<p>Authored <strong>copy</strong>.</p><ul><li>One</li><li>Two</li></ul><div><h3>Inside the authored body</h3><p>Second block.</p></div>';
    const itemId = `native-${component.name}`;
    const authored = { id: itemId, body: nativeField('body', body, itemId) };
    if (component.fields.includes('heading')) authored.heading = nativeField('heading', 'Authored <em>heading</em>', itemId);
    if (component.fields.includes('icon')) authored.icon = nativeField('icon',
      { src: '/allianz-assets/authored-icon.svg', alt: 'Authored icon' }, itemId);
    const before = JSON.stringify(authored);
    const html = render(component, authored);
    assert.ok(html.includes(body));
    assert.doesNotMatch(html, /<p[^>]*class="tileBody|<p[^>]*><ul|<p[^>]*><div/);
    if (component.fields.includes('heading')) assert.match(html,
      /<h2>Authored &lt;em&gt;heading&lt;\/em&gt;<\/h2>/);
    if (component.fields.includes('icon')) assert.match(html, /src="\/allianz-assets\/authored-icon.svg"/);
    assert.deepEqual(metadata(html), []);
    const editing = render(component, authored, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
      component.fields.map((name) => `native-${name}`).sort());
    assert.ok(metadata(editing).every((field) => field.itemId === itemId));
    assert.equal(JSON.stringify(authored), before);
  });

  test(`${component.name} keeps every cleared native field's editor chrome without restoring content`, () => {
    const itemId = `cleared-${component.name}`;
    const cleared = Object.fromEntries(component.fields.map((name) => [name,
      nativeField(name, name === 'icon' ? {} : '', itemId)]));
    const before = JSON.stringify(cleared);
    const editing = render(component, cleared, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
      component.fields.map((name) => `native-${name}`).sort());
    assert.ok(metadata(editing).every((field) => field.itemId === itemId));
    assert.match(editing, /\[No text in field\]/);
    if (component.fields.includes('icon')) assert.match(editing, /scEmptyImage/);
    assert.doesNotMatch(editing,
      /leading provider|committed to you|Life insurance including annuities|315429dcca05b7d8|Add a datasource/);
    const normal = render(component, cleared);
    assert.deepEqual(metadata(normal), []);
    assert.doesNotMatch(normal, /<h[1-6]|<img|<svg|<p>|\[No text in field\]|scEmptyImage|leading provider|committed to you|Life insurance including annuities|315429dcca05b7d8/);
    assert.equal(JSON.stringify(cleared), before);
  });

  for (const fieldName of component.fields) {
    test(`${component.name} independently clearing ${fieldName} retains the other fields`, () => {
      const cleared = { ...component.datasource,
        [fieldName]: nativeField(fieldName, fieldName === 'icon' ? {} : '', `clear-${component.name}`) };
      const editing = render(component, cleared, { isEditing: true });
      assert.deepEqual(metadata(editing).map((entry) => entry.fieldId), [`native-${fieldName}`]);
      const html = render(component, cleared);
      for (const name of component.fields) {
        const value = component.datasource[name].jsonValue.value;
        if (name === 'icon') {
          assert.equal(html.includes(value.src), fieldName !== name);
        } else if (name === 'heading') {
          assert.equal(html.includes(`<h2>${value}</h2>`), fieldName !== name);
        } else {
          assert.equal(html.includes(value), fieldName !== name);
        }
      }
    });
  }

  test(`${component.name} never promotes old children or invents fields when root content is absent`, () => {
    const unrelated = { children: { results: [component.datasource] },
      subheading: nativeField('unused-subheading', 'Unused historical subheading'),
      primaryLink: { jsonValue: { value: { href: '/unused', text: 'Unused historical link' } } } };
    for (const isEditing of [false, true]) {
      for (const datasource of [{}, unrelated]) {
        const html = render(component, datasource, { isEditing });
        assert.doesNotMatch(html, /Unused|leading provider|committed to you|Life insurance including annuities|315429dcca05b7d8|<h[1-6]|<img|<svg|<p>|\[No text in field\]/);
        assert.deepEqual(metadata(html), []);
      }
    }
  });

  test(`${component.name} missing datasource reports assignment without phantom editable fields`, () => {
    for (const isEditing of [false, true]) {
      for (const omitFields of [false, true]) {
        const html = render(component, undefined, { isEditing, omitFields });
        assert.match(html, /class="allianz-missing-data" role="status"/);
        assert.match(html, /Add a datasource for /);
        assert.deepEqual(metadata(html), []);
      }
    }
  });
}
