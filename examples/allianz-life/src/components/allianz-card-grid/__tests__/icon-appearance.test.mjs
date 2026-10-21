import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { assets, appearances, attribute, baselineSource, compile, deepFreeze, filename, fixtureData,
  imageTags, localFixtureHTML, metadata, params, renderSDK, require, roleAssets, sourceRoot } from './icon-appearance-fixture.mjs';

const currentSource = fs.readFileSync(filename, 'utf8');
const Cards = compile(currentSource), Baseline = compile(baselineSource());
const modes = ['normal', 'preview', 'editing'];
const variants = ['Default', 'EditorialStacked'];
const markerCount = html => (html.match(/<div\b[^>]*data-allianz-card-icon-appearance=/g) ?? []).length;
const glyphs = html => imageTags(html).filter(tag => attribute(tag, 'class').split(/\s+/).includes('allianz-card-icon-glyph'));
const icon = card => Object.hasOwn(card, 'icon') ? card.icon?.jsonValue
  : card.fieldCollection?.find(entry => entry.name === 'icon')?.jsonValue;
const footerHTML = html => [...html.matchAll(/<footer\b[^>]*>.*?<\/footer>/gs)].map(match => match[0]);

test('the portable renderer baseline is the verified base37 snapshot and transport fixtures use the exact supplied public URLs', () => {
  assert.equal(require('node:crypto').createHash('sha256').update(baselineSource()).digest('hex'),
    '0caa798149a3db42c4b626ca328c81c0c72b196c3f1185db0b02a0e6df1ec253');
  assert.equal(assets.length, 9); assert.equal(new Set(assets.map(asset => asset.src)).size, 9);
  for (const asset of assets) {
    const url = new URL(asset.src);
    assert.equal(url.origin, 'https://thlt-demo.sitecoresandbox.cloud');
    assert.match(url.pathname, /^\/api\/public\/content\/[a-f\d]{32}$/);
    assert.ok(url.searchParams.get('v'));
  }
  assert.deepEqual(roleAssets, { legal: ['list', 'puzzle', 'handshake', 'governance'],
    privacy: ['secure', 'folder'], resources: ['search-document', 'stocks', 'calculator'] });
});

test('Default explicitly styles the original native Image fields for either recognized appearance without field cloning', () => {
  const observed = [], instrumented = compile(currentSource, { observe: observed });
  const data = deepFreeze(fixtureData()), before = JSON.stringify(data);
  for (const appearance of appearances) for (const mode of modes) {
    observed.length = 0;
    const html = renderSDK(instrumented.Default, data, params(appearance), mode), images = observed.filter(call => call.name === 'Image');
    assert.equal(markerCount(html), 6); assert.equal(glyphs(html).length, 6); assert.equal(images.length, 6);
    for (const [index, call] of images.entries()) {
      assert.equal(call.field, data.children.results[index].icon.jsonValue);
      assert.equal(call.editable, mode === 'editing'); assert.equal(call.className, 'allianz-card-icon-glyph');
      assert.equal(call.style, undefined); assert.equal(call.alt, undefined);
      assert.equal(call.field.value.src, assets[index].src);
    }
    assert.deepEqual(glyphs(html).map(tag => attribute(tag, 'src')), assets.slice(0, 6).map(asset => asset.src));
    assert.deepEqual(glyphs(html).map(tag => attribute(tag, 'alt')), assets.slice(0, 6).map(asset => `Authored fixture ${asset.label}`));
    assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, mode === 'editing' ? 6 : 0);
    assert.equal(JSON.stringify(data), before);
  }
});

test('EditorialStacked opts in only its card icon before the existing header and keeps SDK editing metadata', () => {
  const observed = [], instrumented = compile(currentSource, { observe: observed });
  const data = deepFreeze(fixtureData()), before = JSON.stringify(data);
  for (const appearance of appearances) for (const mode of modes) {
    observed.length = 0;
    const html = renderSDK(instrumented.EditorialStacked, data, params(appearance), mode);
    const images = observed.filter(call => call.name === 'Image');
    assert.equal(markerCount(html), 6); assert.equal(images.length, 6);
    for (const [index, call] of images.entries()) {
      assert.equal(call.field, data.children.results[index].icon.jsonValue);
      assert.equal(call.editable, mode === 'editing'); assert.equal(call.className, 'allianz-card-icon-glyph');
      assert.equal(call.alt, undefined);
    }
    for (const article of html.matchAll(/<article\b[^>]*>(.*?)<\/article>/gs)) {
      assert.ok(article[1].indexOf('allianz-card-icon-glyph') < article[1].indexOf('<header>'));
      assert.match(article[1], /tileSubGrid__image/);
    }
    assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, mode === 'editing' ? 6 : 0);
    assert.equal(JSON.stringify(data), before);
  }
});

test('named and native fieldCollection shapes render identically for both opt-in variants and both appearances', () => {
  const named = deepFreeze(fixtureData()), wire = deepFreeze(fixtureData({ collection: true }));
  for (const name of variants) for (const appearance of appearances) for (const mode of modes) {
    assert.equal(renderSDK(Cards[name], named, params(appearance), mode), renderSDK(Cards[name], wire, params(appearance), mode));
  }
});

test('cleared native Image fields stay absent from the canvas and retain their stored metadata and canonical clears beat stale fieldCollection', () => {
  for (const name of variants) for (const appearance of appearances) {
    const data = fixtureData(); for (const card of data.children.results) card.icon.jsonValue.value = {};
    const before = JSON.stringify(data), observed = [], instrumented = compile(currentSource, { observe: observed });
    deepFreeze(data);
    for (const mode of modes) {
      observed.length = 0; const html = renderSDK(instrumented[name], data, params(appearance), mode);
      const calls = observed.filter(call => call.name === 'Image');
      assert.equal(calls.length, 0);
      assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, 0);
      for (const [index, call] of calls.entries()) assert.equal(call.field, data.children.results[index].icon.jsonValue);
      assert.equal(JSON.stringify(data), before);
    }
    const wire = fixtureData({ collection: true }), first = wire.children.results[0], stale = icon(first);
    first.icon = { jsonValue: { value: {}, metadata: { ...stale.metadata } } };
    const html = renderSDK(Cards[name], deepFreeze(wire), params(appearance));
    assert.deepEqual(glyphs(html).map(tag => attribute(tag, 'src')), assets.slice(1, 6).map(asset => asset.src));
  }
});

test('missing native Image fields create no glyph, editor or runtime fallback in either appearance', () => {
  for (const name of variants) for (const appearance of appearances) {
    const data = fixtureData(); for (const card of data.children.results) delete card.icon;
    const before = JSON.stringify(data);
    for (const mode of modes) {
      const html = renderSDK(Cards[name], deepFreeze(data), params(appearance), mode);
      assert.equal(markerCount(html), 0); assert.equal(glyphs(html).length, 0);
      assert.equal(metadata(html).filter(entry => entry.fieldId === 'fixture-icon').length, 0);
      assert.equal(JSON.stringify(data), before);
    }
    assert.match(renderSDK(Cards[name], undefined, params(appearance)), /Add a datasource for AllianzCardGrid/);
  }
});

test('authored icon order, alt and original versioned source URLs follow card data rather than GUID or URL dispatch', () => {
  const data = fixtureData(); data.children.results.reverse(); data.children.results[0].icon.jsonValue.value.alt = '';
  data.id = 'another-arbitrary-owner'; data.children.results.forEach((card, index) => { card.id = `reordered-author-${index}`; });
  const before = JSON.stringify(data);
  for (const name of variants) for (const appearance of appearances) {
    const html = renderSDK(Cards[name], deepFreeze(data), params(appearance));
    assert.deepEqual(glyphs(html).map(tag => attribute(tag, 'src')), [...assets.slice(0, 6)].reverse().map(asset => asset.src));
    assert.equal(attribute(glyphs(html)[0], 'alt'), '');
    assert.equal(JSON.stringify(data), before);
  }
});

test('Default absent or unrecognized appearance preserves exact base37 output in every existing branch', () => {
  const data = deepFreeze(fixtureData({ extras: true, authoredClasses: true }));
  for (const appearance of [undefined, '', 'WHITE-ON-BLACK', 'gray-on-transparent ', 'unknown', null, false, {}]) {
    for (const layout of ['stacked', 'cards', 'list', 'bordered', 'image-left', 'image-right']) for (const mode of modes) {
      const input = params(appearance, { layout });
      const html = renderSDK(Cards.Default, data, input, mode);
      assert.equal(html, renderSDK(Baseline.Default, data, input, mode), `${String(appearance)} ${layout} ${mode}`);
      if (layout === 'stacked') {
        assert.deepEqual(imageTags(html).filter(tag => attribute(tag, 'alt').startsWith('Authored fixture'))
          .map(tag => attribute(tag, 'class')), data.children.results.map(card => card.icon.jsonValue.value.className));
      }
    }
  }
});

test('EditorialStacked absent or unrecognized appearance preserves exact base37 output and does not mount card icons', () => {
  const data = deepFreeze(fixtureData({ extras: true, authoredClasses: true }));
  for (const appearance of [undefined, '', 'WHITE-ON-BLACK', 'gray-on-transparent ', 'unknown', null, false, {}]) for (const mode of modes) {
    const input = params(appearance);
    const html = renderSDK(Cards.EditorialStacked, data, input, mode);
    assert.equal(html, renderSDK(Baseline.EditorialStacked, data, input, mode));
    assert.equal(glyphs(html).length, 0);
  }
});

test('every other exported CardGrid variant including OfferCards ignores even a recognized new parameter byte for byte', () => {
  const names = Object.keys(Baseline).filter(name => !variants.includes(name) && typeof Baseline[name] === 'function');
  assert.ok(names.includes('OfferCards')); assert.ok(names.includes('SustainabilityPillars'));
  const data = deepFreeze(fixtureData({ extras: true, authoredClasses: true }));
  for (const name of names) for (const appearance of [...appearances, 'unrecognized']) for (const mode of ['normal', 'editing']) {
    const input = params(appearance);
    assert.equal(renderSDK(Cards[name], data, input, mode), renderSDK(Baseline[name], data, input, mode), `${name} ${appearance} ${mode}`);
  }
});

test('appearance leaves footer icons, card images and native link destinations unchanged', () => {
  const data = deepFreeze(fixtureData({ extras: true })), before = JSON.stringify(data);
  for (const name of variants) for (const appearance of appearances) for (const mode of modes) {
    const observed = [], instrumented = compile(currentSource, { observe: observed });
    const input = params(appearance), html = renderSDK(instrumented[name], data, input, mode);
    const baseline = renderSDK(Baseline[name], data, input, mode);
    assert.deepEqual(footerHTML(html), footerHTML(baseline));
    const unrelated = imageTags(html).filter(tag => !attribute(tag, 'class').split(/\s+/).includes('allianz-card-icon-glyph'));
    assert.deepEqual(unrelated, imageTags(baseline).filter(tag => attribute(tag, 'alt') === 'Original card image' || attribute(tag, 'alt') === 'Original footer icon'));
    for (const card of data.children.results) {
      assert.equal(observed.filter(call => call.name === 'Image' && call.field === card.image.jsonValue).length, 1);
      if (name === 'EditorialStacked') assert.equal(observed.filter(call => call.name === 'Image' && call.field === card.links.targetItems[0].icon.jsonValue).length, 1);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('new CSS scopes every rule to the explicit card wrapper and supplies exact source circle/filter geometry', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardIcons.css'), 'utf8');
  const tree = require('postcss').parse(css);
  const values = (selector, media) => {
    const matches = [];
    tree.walkRules(rule => {
      if (rule.selector === selector && (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media) {
        matches.push(Object.fromEntries(rule.nodes.map(({ prop, value }) => [prop, value])));
      }
    }); return Object.assign({}, ...matches);
  };
  tree.walkRules(rule => assert.match(rule.selector, /^\.tileIcon\[data-allianz-card-icon-appearance(?:[=\]])/));
  const base = '.tileIcon[data-allianz-card-icon-appearance]', glyph = `${base} .allianz-card-icon-glyph`;
  assert.equal(values(base).width, '40px'); assert.equal(values(base).height, '40px'); assert.equal(values(base)['border-radius'], '50%');
  assert.equal(values(glyph).width, '26px'); assert.equal(values(glyph).height, '26px'); assert.equal(values(glyph)['object-fit'], 'contain');
  assert.equal(values(base, '(min-width: 704px)').width, '64px'); assert.equal(values(base, '(min-width: 704px)').height, '64px');
  assert.equal(values(glyph, '(min-width: 704px)').width, '40px'); assert.equal(values(glyph, '(min-width: 704px)').height, '40px');
  assert.equal(values('.tileIcon[data-allianz-card-icon-appearance="white-on-black"]')['background-color'], '#3c3c3c');
  assert.equal(values('.tileIcon[data-allianz-card-icon-appearance="white-on-black"] .allianz-card-icon-glyph').filter, 'brightness(0) invert(1)');
  assert.equal(values('.tileIcon[data-allianz-card-icon-appearance="gray-on-transparent"]')['background-color'], 'transparent');
  assert.equal(values('.tileIcon[data-allianz-card-icon-appearance="gray-on-transparent"] .allianz-card-icon-glyph').filter, 'brightness(0) invert(23.5294117647%)');
  assert.doesNotMatch(css, /url\(|mask|\.tileImage|a-link|\.m-card|!important/);
});

test('Default list and image-card branches retain their existing surface even with a recognized icon parameter', () => {
  const data = deepFreeze(fixtureData({ extras: true }));
  for (const appearance of appearances) for (const layout of ['list', 'cards']) for (const mode of modes) {
    const input = params(appearance, { layout });
    const html = renderSDK(Cards.Default, data, input, mode);
    assert.equal(html, renderSDK(Baseline.Default, data, input, mode));
    assert.equal(markerCount(html), 0);
  }
});

test('portable desktop/mobile HTML uses only local transport SVGs and labels its role/preset cases as fixture evidence', () => {
  const html = localFixtureHTML();
  assert.match(html, /LOCAL SDK FIXTURE ONLY/); assert.match(html, /not verified native bindings/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.equal((html.match(/<section class="fixture-case"/g) ?? []).length, 12);
  assert.equal(markerCount(html), 36);
  assert.equal(glyphs(html).length, 36);
  const cases = html.split('<section class="fixture-case"').slice(1);
  for (const section of cases) {
    const resources = section.startsWith(' data-fixture-role="resources"');
    assert.match(section, new RegExp(`data-fixture-theme="${resources ? 'grey-soft' : 'transparent'}"`));
    if (resources && section.includes('data-fixture-variant="EditorialStacked"')) {
      const frame = section.match(/<div\b[^>]*id="resources-EditorialStacked-[^"]+"[^>]*>/)?.[0];
      assert.ok(frame, 'Resources fixture must retain its actual EditorialStacked outer frame');
      assert.match(attribute(frame, 'class'), /\bt-bg-grey-soft\b/, 'Resources uses the parent-approved grey-soft outer frame');
      assert.match(section, /resources transport set — EditorialStacked: [^<]+; grey-soft frame/);
    }
  }
  for (const tag of imageTags(html)) assert.match(attribute(tag, 'src'), /^\.\/assets\/[a-z-]+\.svg$/);
  assert.deepEqual([...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]),
    ['/allianz-assets/source-style.css', '/allianz-legacy-assets/legacy-style.css']);
  assert.ok(html.indexOf('/allianz-legacy-assets/legacy-style.css') < html.indexOf('<style>'));
  const globals = fs.readFileSync(path.join(sourceRoot, 'app/globals.css'), 'utf8');
  const overrides = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-native-overrides.css'), 'utf8');
  assert.ok(html.includes(globals), 'the fixture must include the actual application global styles and font faces');
  assert.ok(html.indexOf(globals) < html.indexOf(overrides), 'global styles must precede native overrides and CardGrid CSS');
  assert.ok(html.includes('body{margin:0}.fixture-notice'), 'fixture chrome must leave the application font inheritance intact');
  assert.equal(html.includes(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8')), false,
    'the stale source copy must not be inlined in place of the application public stylesheets');
  assert.doesNotMatch(html, /<script\b|<iframe\b/);
});

function serializedCardQuery() {
  const source = fs.readFileSync(path.resolve(sourceRoot, '../../../authoring/allianz-life/items/allianz.renderings/Allianz Life/Card Grid.yml'), 'utf8');
  const block = source.match(/Hint: ComponentQuery\r?\n  Value: \|\r?\n((?: {4}[^\r\n]*(?:\r?\n|$))+)/)?.[1];
  assert.ok(block, 'the historical serialized CardGrid item must retain its saved query');
  return block.split(/\r?\n/).map(line => line.slice(4)).join('\n');
}

test('saved CardGrid query selects every child native field name and jsonValue rather than conflating icon and image', () => {
  const { parse, print } = require('graphql');
  const operation = parse(serializedCardQuery()).definitions[0];
  assert.equal(operation.name.value, 'AllianzCardGridQuery');
  assert.deepEqual(operation.variableDefinitions.map(variable => print(variable)), ['$datasource: String!', '$language: String!']);
  const datasource = operation.selectionSet.selections.find(field => field.alias?.value === 'datasource');
  const children = datasource.selectionSet.selections.find(field => field.name.value === 'children');
  assert.equal(children.arguments.find(argument => argument.name.value === 'first').value.value, '40');
  const results = children.selectionSet.selections.find(field => field.name.value === 'results');
  assert.ok(results.selectionSet.selections.some(field => field.name.value === 'id'));
  const fields = results.selectionSet.selections.find(field => field.alias?.value === 'fieldCollection');
  assert.equal(fields.name.value, 'fields'); assert.equal(fields.arguments.length, 0, 'the query must not narrow the collection to image or omit icon');
  assert.deepEqual(fields.selectionSet.selections.map(field => field.name.value), ['name', 'jsonValue']);
});

test('synthetic execution of the saved native query keeps Icon and Image objects distinct through canonical projection and actual EditorialStacked SDK rendering', () => {
  // This verifies the local serialization/query shape; it is not a live Edge or
  // cloud-editor query, native binding readback, or proof of native acceptance.
  const { buildSchema, graphqlSync } = require('graphql');
  const schema = buildSchema('scalar JSON type NativeField { name: String! jsonValue: JSON } type Field { jsonValue: JSON } type PageInfo { hasNext: Boolean! endCursor: String } type Children { total: Int! pageInfo: PageInfo! results: [Item!]! } type Item { id: ID! field(name: String!): Field fields: [NativeField!]! children(first: Int!): Children! } type Query { item(path: String!, language: String!): Item }');
  const native = fixtureData({ extras: true }).children.results[0];
  native.image.jsonValue.value = { src: assets[1].src, alt: 'Separate native Image field', className: 'native-image-field' };
  native.icon.jsonValue.value.className = 'native-icon-field';
  const rawIcon = native.icon.jsonValue, rawImage = native.image.jsonValue;
  const controls = [
    { name: 'Heading', jsonValue: native.heading.jsonValue }, { name: 'Body', jsonValue: native.body.jsonValue },
    { name: 'Icon', jsonValue: rawIcon }, { name: 'Image', jsonValue: rawImage }, { name: 'Link', jsonValue: native.link.jsonValue },
  ];
  deepFreeze(controls);
  let childQueryCount = 0;
  const result = graphqlSync({ schema, source: serializedCardQuery(), variableValues: { datasource: 'fixture-query-root', language: 'en' },
    rootValue: { item: ({ path: requestedPath, language }) => {
      assert.equal(requestedPath, 'fixture-query-root'); assert.equal(language, 'en');
      return { id: 'fixture-query-root', field: () => null, children: ({ first }) => {
        childQueryCount++; assert.equal(first, 40);
        return { total: 1, pageInfo: { hasNext: false, endCursor: native.id }, results: [{ id: native.id, fields: controls }] };
      } };
    } },
  });
  assert.equal(result.errors, undefined); assert.equal(childQueryCount, 1);
  const data = result.data.datasource, card = data.children.results[0];
  assert.equal(card.fieldCollection.find(field => field.name === 'Icon').jsonValue, rawIcon);
  assert.equal(card.fieldCollection.find(field => field.name === 'Image').jsonValue, rawImage);
  const { allianzCardFields } = requireProjection();
  const projected = allianzCardFields(card);
  assert.equal(projected.icon.jsonValue, rawIcon); assert.equal(projected.image.jsonValue, rawImage);
  assert.notEqual(projected.icon.jsonValue, projected.image.jsonValue);
  assert.equal(projected.icon.jsonValue.metadata, rawIcon.metadata); assert.equal(projected.image.jsonValue.metadata, rawImage.metadata);
  const observed = [], instrumented = compile(currentSource, { observe: observed }), before = JSON.stringify(data);
  for (const appearance of appearances) for (const mode of modes) {
    observed.length = 0;
    const html = renderSDK(instrumented.EditorialStacked, data, params(appearance), mode);
    assert.equal(observed.filter(call => call.name === 'Image' && call.field === rawIcon).length, 1);
    assert.equal(observed.filter(call => call.name === 'Image' && call.field === rawImage).length, 1);
    assert.equal(glyphs(html).length, 1); assert.equal(attribute(glyphs(html)[0], 'src'), rawIcon.value.src);
    const separateImage = imageTags(html).find(tag => attribute(tag, 'alt') === rawImage.value.alt);
    assert.ok(separateImage); assert.equal(attribute(separateImage, 'src'), rawImage.value.src);
    assert.equal(attribute(separateImage, 'class').includes('allianz-card-icon-glyph'), false);
    assert.equal(metadata(html).filter(field => field.fieldId === 'fixture-icon').length, mode === 'editing' ? 1 : 0);
    assert.equal(metadata(html).filter(field => field.fieldId === 'fixture-image').length, mode === 'editing' ? 1 : 0);
    assert.equal(JSON.stringify(data), before);
  }
});

function requireProjection() {
  // Reuse the real local loader; retain the installed SDK in the integration test.
  const ts = require('typescript'), Module = require('node:module');
  const projectionFile = path.join(sourceRoot, 'lib/allianz-card-fields.ts');
  const module = new Module(projectionFile); module.filename = projectionFile;
  module._compile(ts.transpileModule(fs.readFileSync(projectionFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, projectionFile);
  return module.exports;
}
