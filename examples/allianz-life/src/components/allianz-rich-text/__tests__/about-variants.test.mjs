import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const filename = path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx');
const Components = loadSource(filename);
// Approved Information contract and exact parent-verified public asset, used only
// as unit fixture input. Native field creation/query/binding and browser QA remain pending.
const INFORMATION_TRANSPORT = "https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b64afa0fa0a4f7f87a12e01f2de3ca0?v=cba3d72e";
const INFORMATION_FIELD_ID = "97E10D8C-DFEA-4CD1-8D34-6573D5F0FED7";
const INFORMATION_OWNER_ID = "0A94E9DA-DD38-4B67-908E-363578BA2846";
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: name === 'icon' ? INFORMATION_OWNER_ID : 'test-only-about-root',
    fieldId: name === 'icon' ? INFORMATION_FIELD_ID : `test-only-${name}`, fieldType: type } } });
const disclosureBody = [
  '<p><sup>1</sup> Native first footnote.</p>', '<p><sup>2</sup> Native second footnote.</p>', '<hr />',
  ...Array.from({ length: 8 }, (_, index) => `<p>Complete native disclosure paragraph ${index + 3}.</p>`),
].join('');
const fixture = () => ({
  id: '0A94E9DA-DD38-4B67-908E-363578BA2846',
  heading: field('heading', 'Native plain heading'), body: field('body', '<p>Complete native <em>introduction</em>.</p>', 'Rich Text'),
  subheading: field('subheading', 'UNUSED-SUBHEADING', 'Rich Text'),
  primaryLink: field('primaryLink', { href: '/unused-link', text: 'UNUSED-LINK' }, 'General Link'),
  image: field('image', { src: '/unused-image.png' }, 'Image'),
  icon: field('icon', { src: INFORMATION_TRANSPORT, alt: 'Information' }, 'Image'),
});
const variants = [
  { name: 'AboutSectionHeading', theme: 'transparent', active: ['heading'], information: false },
  { name: 'AboutInformationHeading', theme: 'green-soft', active: ['heading', 'body', 'icon'], information: true },
  { name: 'AboutDisclosures', theme: 'grey-muted', active: ['body'], information: false },
];
for (const variant of variants) {
  test(`${variant.name} uses fixed source presentation and the original native fields in both modes`, () => {
    const data = fixture();
    if (variant.name === 'AboutDisclosures') data.body.jsonValue.value = disclosureBody;
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Components[variant.name], data, editing, { theme: 'purple-soft', headingLevel: 'h5', alignment: 'left',
        layout: 'rich-text', spacing: 'xl', RenderingIdentifier: 'native-about-section' });
      assert.ok(html.includes(`t-bg-${variant.theme}`));
      assert.ok(html.includes('id="native-about-section"'));
      assert.doesNotMatch(html, /UNUSED|unused-|purple-soft|<h5/);
      assert.equal((html.match(/<h2\b/g) ?? []).length, variant.active.includes('heading') ? 1 : 0);
      if (variant.active.includes('body')) assert.ok(html.includes(data.body.jsonValue.value));
      else assert.ok(!html.includes(data.body.jsonValue.value));
      assert.equal(html.includes(INFORMATION_TRANSPORT), variant.information);
      assert.doesNotMatch(html, /allianz-ui\/about-overview\/information.svg/);
      if (variant.name === 'AboutDisclosures') {
        assert.equal((html.match(/<p>/g) ?? []).length, 10);
        assert.equal((html.match(/<sup>/g) ?? []).length, 2);
        assert.equal((html.match(/<hr\s*\/?\s*>/g) ?? []).length, 1);
        assert.ok(html.includes('tileContent u-text-left'));
        assert.doesNotMatch(html, /a-axlDisclosures|content-body disclosure/);
      } else {
        assert.ok(html.includes('tileContent u-text-center'));
        assert.ok(html.includes('l-grid__row u-margin-bottom-lg u-padding-top-lg'));
      }
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${variant.name} exposes each source-owned native SDK field once and no inactive surfaces`, () => {
    const data = fixture(), before = JSON.stringify(data), actual = markers(render(Components[variant.name], data, true));
    assert.equal(actual.length, variant.active.length);
    for (const name of variant.active) {
      const metadata = data[name].jsonValue.metadata;
      assert.equal(actual.filter(value => value.itemId === metadata.itemId && value.fieldId === metadata.fieldId).length, 1);
    }
    assert.equal(JSON.stringify(data), before);
  });
  test(`${variant.name} preserves real cleared author fields without inventing missing values`, () => {
    const data = fixture();
    for (const name of variant.active) data[name].jsonValue.value = name === 'icon' ? {} : '';
    const before = JSON.stringify(data);
    assert.equal(markers(render(Components[variant.name], data, true)).length, variant.active.length);
    assert.equal(markers(render(Components[variant.name], data, false)).length, 0);
    assert.equal(JSON.stringify(data), before);
    for (const name of variant.active) delete data[name];
    assert.equal(markers(render(Components[variant.name], data, true)).length, 0);
    assert.ok(render(Components[variant.name], undefined).includes('AllianzRichText'));
  });
}

test('Information uses the authored SDK Image alt and keeps its source circle directly before the header', () => {
  const html = render(Components.AboutInformationHeading, fixture());
  assert.match(html, /tileContent u-text-center"><div class="tileIcon t-bg-primary-brand t-icon-primary-white"><img[^>]*alt="Information"[^>]*\/><\/div><header>/);
  const image = html.match(/<img\b[^>]*>/)?.[0];
  assert.ok(image); assert.match(image, /class="allianz-about-information-glyph"/);
  assert.match(image, /width="24" height="24"/);
  assert.doesNotMatch(image, /aria-hidden|\bhidden=|role="presentation"/);
  assert.doesNotMatch(html, /allianz-ui\/about-overview|unused-icon|mask-image|<svg/);
});

function instrumented() {
  const React = require('react'), sdk = require('@sitecore-content-sdk/nextjs'), ts = require('typescript'), observed = [];
  const compiled = new Module(filename); compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, ...Object.fromEntries(['Text', 'RichText', 'Image'].map(name => [name, props => {
      observed.push({ name, field: props.field, editable: props.editable, props });
      return React.createElement(sdk[name], props);
    }])) };
    if (/^(components|lib)\//.test(specifier)) {
      const base = path.join(sourceRoot, specifier), local = [base, `${base}.ts`, `${base}.tsx`]
        .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (local) return loadSource(local);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return { components: compiled.exports, observed };
}

test('Information passes each original heading/body/icon object to its real SDK renderer without copying native fields', () => {
  const { components, observed } = instrumented(), data = fixture(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutInformationHeading, data, editing);
    assert.equal(observed.length, 3);
    for (const name of ['heading', 'body', 'icon']) {
      const calls = observed.filter(call => call.field === data[name].jsonValue);
      assert.equal(calls.length, 1); assert.equal(calls[0].editable, editing);
    }
    const image = observed.find(call => call.name === 'Image');
    assert.equal(image.props.alt, undefined); assert.equal(image.props['aria-hidden'], undefined);
    assert.equal(markers(html).length, editing ? 3 : 0);
    assert.equal(JSON.stringify(data), before);
  }
});

test('Information treats absent and cleared optional icons as native field state while preserving heading/body and circle wrappers', () => {
  const { components, observed } = instrumented();
  for (const state of ['missing', 'undefined-json', 'cleared', 'filled']) {
    const data = fixture();
    if (state === 'missing') delete data.icon;
    else if (state === 'undefined-json') data.icon = { jsonValue: undefined };
    else if (state === 'cleared') data.icon.jsonValue.value = {};
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      observed.length = 0; const html = render(components.AboutInformationHeading, data, editing);
      const hasField = ['cleared', 'filled'].includes(state), shouldMount = state === 'filled' || editing && hasField;
      assert.equal(observed.filter(call => call.name === 'Image').length, shouldMount ? 1 : 0);
      assert.equal(markers(html).length, editing ? 2 + Number(hasField) : 0);
      assert.ok(html.includes(data.heading.jsonValue.value)); assert.ok(html.includes(data.body.jsonValue.value));
      assert.match(html, /tileIcon t-bg-primary-brand t-icon-primary-white/);
      assert.doesNotMatch(html, /allianz-ui\/about-overview/);
      if (!shouldMount) assert.doesNotMatch(html, /alt="Information"/);
      if (!shouldMount) assert.match(html, /tileIcon t-bg-primary-brand t-icon-primary-white"><\/div><header>/);
    }
    assert.equal(JSON.stringify(data), before);
  }
  const authoredBlankAlt = fixture(); authoredBlankAlt.icon.jsonValue.value.alt = '';
  assert.match(render(Components.AboutInformationHeading, authoredBlankAlt), /<img[^>]*alt=""/);
});

test('every other RichText export keeps identical output with filled, cleared or missing optional icon input', () => {
  const names = Object.keys(Components).filter(name => name !== 'AboutInformationHeading' && typeof Components[name] === 'function');
  assert.ok(names.includes('Default')); assert.ok(names.includes('AboutSectionHeading')); assert.ok(names.includes('AboutDisclosures'));
  for (const name of names) for (const editing of [false, true]) {
    const filled = fixture(), cleared = fixture(), missing = fixture();
    cleared.icon.jsonValue.value = {}; delete missing.icon;
    const params = { layout: 'rich-text', theme: 'transparent', headingLevel: 'h3', RenderingIdentifier: 'unrelated-rich-text' };
    const expected = render(Components[name], missing, editing, params);
    assert.equal(render(Components[name], filled, editing, params), expected, `${name}: filled icon`);
    assert.equal(render(Components[name], cleared, editing, params), expected, `${name}: cleared icon`);
  }
});

test('saved authoring RichText query preserves its four existing fields and adds only the approved optional icon field by name', () => {
  const queryPath = path.resolve(sourceRoot, '../../../authoring/allianz-life/items/allianz.renderings/Allianz Life/Rich Text.yml');
  const source = fs.readFileSync(queryPath, 'utf8');
  const block = source.match(/Hint: ComponentQuery\r?\n  Value: \|\r?\n((?: {4}[^\r\n]*(?:\r?\n|$))+)/)?.[1];
  assert.ok(block, 'the existing authoring item must retain its ComponentQuery');
  const { parse, print } = require('graphql');
  const query = parse(block.split(/\r?\n/).map(line => line.slice(4)).join('\n'));
  assert.equal(query.definitions.length, 1);
  const operation = query.definitions[0]; assert.equal(operation.name.value, 'AllianzRichTextQuery');
  assert.deepEqual(operation.variableDefinitions.map(variable => print(variable)), ['$datasource: String!', '$language: String!']);
  const datasource = operation.selectionSet.selections[0];
  assert.equal(datasource.alias.value, 'datasource'); assert.equal(datasource.name.value, 'item');
  assert.deepEqual(datasource.arguments.map(argument => print(argument)), ['path: $datasource', 'language: $language']);
  assert.deepEqual(datasource.selectionSet.selections.map(selection => selection.alias?.value ?? selection.name.value),
    ['id', 'heading', 'subheading', 'body', 'primaryLink', 'icon']);
  for (const name of ['heading', 'subheading', 'body', 'primaryLink', 'icon']) {
    const selection = datasource.selectionSet.selections.find(item => item.alias?.value === name);
    assert.equal(selection.name.value, 'field'); assert.deepEqual(selection.arguments.map(argument => print(argument)), [`name: "${name}"`]);
    assert.deepEqual(selection.selectionSet.selections.map(item => item.name.value), ['jsonValue']);
  }
});

test('About Information CSS retains source white glyph size at the source medium breakpoint', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-rich-text/AllianzAboutHeadings.css'), 'utf8');
  assert.match(css, /\.allianz-about-heading \.tileIcon > \.allianz-about-information-glyph\s*\{[^}]*width: 26px;[^}]*height: auto;[^}]*filter: brightness\(0\) invert\(1\);/);
  assert.match(css, /@media \(min-width: 704px\)[\s\S]*width: 40px;/);
  assert.equal((css.match(/\.allianz-about-heading/g) ?? []).length, 2);
});

// Authoring remains field-driven even when editors replace both asset and metadata.
test('Information preserves the approved native Image identity and accepts authored replacement fields without GUID dispatch', () => {
  const { components, observed } = instrumented(), data = fixture();
  assert.equal(data.icon.jsonValue.metadata.itemId, INFORMATION_OWNER_ID);
  assert.equal(data.icon.jsonValue.metadata.fieldId, '97E10D8C-DFEA-4CD1-8D34-6573D5F0FED7');
  const replacement = { value: { src: '/authored-replacement.svg', alt: 'Editor replacement' },
    metadata: { itemId: INFORMATION_OWNER_ID, fieldId: 'test-only-author-replacement', fieldType: 'Image' } };
  data.icon.jsonValue = replacement;
  for (const editing of [false, true]) {
    observed.length = 0; const html = render(components.AboutInformationHeading, data, editing);
    const image = observed.find(call => call.name === 'Image');
    assert.equal(image.field, replacement); assert.equal(image.editable, editing);
    const imageTag = html.match(/<img\b[^>]*>/)?.[0];
    assert.ok(imageTag);
    assert.match(imageTag, /src="\/authored-replacement.svg"/);
    assert.match(imageTag, /alt="Editor replacement"/);
    assert.equal(html.includes(INFORMATION_TRANSPORT), false);
  }
});
