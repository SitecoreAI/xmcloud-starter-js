import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const Components = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const { safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const decode = value => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const attributes = (html, tag, name) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, 'g'))].map(match => decode(match[1]));
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(decode(match[1])));
const sdkField = (owner, name, value, fieldType = 'Single-Line Text') => ({ value,
  metadata: { itemId: owner, fieldId: `${owner}-${name}`, fieldType } });
const collectionField = (owner, name, value, fieldType) => ({ name, jsonValue: sdkField(owner, name, value, fieldType) });
const sourceField = (card, name) => card.fieldCollection.find(field => field.name === name).jsonValue;
const componentPath = path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx');
function observedCardGrid() {
  const React = require('react'), ts = require('typescript'), sdk = require('@sitecore-content-sdk/nextjs');
  const capturedLinks = [], compiled = new Module(componentPath);
  compiled.filename = componentPath;
  compiled.paths = Module._nodeModulePaths(path.resolve(sourceRoot, '..'));
  compiled.require = specifier => {
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, Link: props => {
      capturedLinks.push(props);
      return React.createElement(sdk.Link, props);
    } };
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(componentPath), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(componentPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, componentPath);
  return { components: compiled.exports, capturedLinks };
}
function fixture(prompt = false) {
  const owner = 'test-only-offer-root';
  return { id: owner, heading: { jsonValue: sdkField(owner, 'heading', 'UNUSED ROOT HEADING') },
    body: { jsonValue: sdkField(owner, 'body', '<p>UNUSED ROOT BODY</p>', 'Rich Text') },
    subheading: { jsonValue: sdkField(owner, 'subheading', 'UNUSED ROOT SUBHEADING') },
    primaryLink: { jsonValue: sdkField(owner, 'primaryLink', { href: '#unused-root-link' }, 'General Link') },
    children: { results: Array.from({ length: prompt ? 1 : 2 }, (_, index) => {
      const cardOwner = `test-only-offer-card-${index}`;
      const navigationOwner = `test-only-offer-navigation-${index}`;
      return { id: cardOwner, sourceAttribute: 'original-card-envelope', fieldCollection: [
        collectionField(cardOwner, 'heading', prompt ? 'Complete native question heading' : `Native offer ${index}`),
        collectionField(cardOwner, 'body', prompt ? '<p>UNUSED PROMPT BODY</p>' : `<p>Complete native offer ${index} with <strong>protection</strong><sup>${index + 1}</sup>.</p>`, 'Rich Text'),
        collectionField(cardOwner, 'image', { src: prompt ? '/unused-prompt-image.jpg' : `/test-only-offer/photo-${index}.jpg`, alt: `Native photo ${index}`, width: '1088', height: '520', 'dam-id': `test-only-offer-photo-${index}` }, 'Image'),
        collectionField(cardOwner, 'icon', { src: prompt ? '/test-only-offer/native-question.svg' : '/unused-product-icon.svg', alt: prompt ? 'Question' : 'UNUSED ICON', 'dam-id': 'test-only-native-question' }, 'Image'),
        collectionField(cardOwner, 'subheading', 'UNUSED CARD SUBHEADING'),
        collectionField(cardOwner, 'alphanumeral', 'UNUSED CARD NUMBER'),
        collectionField(cardOwner, 'headingLevel', 'h4'),
        collectionField(cardOwner, 'theme', prompt ? 'transparent' : 'grey-soft'),
        collectionField(cardOwner, 'iconTheme', prompt ? 'primary-brand' : 'transparent'),
        collectionField(cardOwner, 'link', { href: '#unused-scalar-link', text: 'UNUSED SCALAR LINK' }, 'General Link'),
        { name: 'links', jsonValue: [{ id: navigationOwner, url: '/unused-item-url', fields: {
          title: sdkField(navigationOwner, 'title', 'UNUSED NAVIGATION TITLE'),
          icon: sdkField(navigationOwner, 'icon', { src: '/unused-navigation-icon.svg' }, 'Image'),
          link: sdkField(navigationOwner, 'link', { href: `#test-only-offer-${index}`, text: `Native destination ${index}`, linktype: 'internal', id: `test-only-native-target-${index}`, target: '', anchor: '' }, 'General Link'),
        } }] },
      ] };
    }) } };
}
function namedFixture(data) {
  return { ...data, children: { ...data.children, results: data.children.results.map(card => ({
    id: card.id, sourceAttribute: card.sourceAttribute,
    ...Object.fromEntries(card.fieldCollection.filter(field => field.name !== 'links').map(field => [field.name, { jsonValue: field.jsonValue }])),
    links: { targetItems: card.fieldCollection.find(field => field.name === 'links').jsonValue.map(item => ({
      id: item.id, title: { jsonValue: item.fields.title }, icon: { jsonValue: item.fields.icon }, link: { jsonValue: item.fields.link },
    })) },
  })) } };
}
const adversarialParams = { theme: 'purple-soft', columns: '4', headingLevel: 'h4', alignment: 'center',
  paddingTop: 'sm', marginBottom: 'sm', bodySize: 'extra-large', tileMarginBottom: 'none', container: 'content',
  sectionWidth: 'contained', sourceWidth: 'centered-eight', introSpacer: '1', RenderingIdentifier: 'test-only-offer-rendering' };

test('OfferCards retains two grey photo tiles, source classes, H2s and complete native bodies in both modes', () => {
  const data = fixture(), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.OfferCards, data, editing, adversarialParams);
    assert.ok(html.includes('l-container--full-width t-bg-transparent axlTileCollection'));
    assert.ok(html.includes('l-grid__row match-height-row u-padding-top-xl'));
    assert.equal((html.match(/l-grid__column-medium-6/g) ?? []).length, 2);
    assert.equal((html.match(/t-bg-grey-soft u-margin-bottom-xl/g) ?? []).length, 2);
    assert.equal((html.match(/<h2\b/g) ?? []).length, 2);
    assert.equal((html.match(/tileBody u-font-size-md/g) ?? []).length, 2);
    for (const card of data.children.results) assert.ok(html.includes(sourceField(card, 'body').value));
    assert.deepEqual(attributes(html, 'img', 'src'), ['/test-only-offer/photo-0.jpg', '/test-only-offer/photo-1.jpg']);
    assert.deepEqual(attributes(html, 'img', 'alt'), ['Native photo 0', 'Native photo 1']);
    assert.deepEqual(attributes(html, 'a', 'href'), ['#test-only-offer-0', '#test-only-offer-1']);
    assert.deepEqual(attributes(html, 'a', 'aria-label'), ['Native destination 0', 'Native destination 1']);
    assert.doesNotMatch(html, /UNUSED|unused-|<h4\b|u-font-size-xl|centered-eight|Additional content fields/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('OfferCards exposes exactly eight original card/navigation SDK markers without duplicate or inactive fields', () => {
  const data = fixture(), before = JSON.stringify(data), actual = markers(render(Components.OfferCards, data, true));
  const expected = data.children.results.flatMap(card => [
    ...['heading', 'body', 'image'].map(name => sourceField(card, name).metadata),
    card.fieldCollection.find(field => field.name === 'links').jsonValue[0].fields.link.metadata,
  ]);
  assert.equal(actual.length, 8);
  for (const metadata of expected) assert.equal(actual.filter(marker => marker.itemId === metadata.itemId && marker.fieldId === metadata.fieldId && marker.fieldType === metadata.fieldType).length, 1);
  assert.equal(markers(render(Components.OfferCards, data)).length, 0);
  assert.equal(JSON.stringify(data), before);
});

test('OfferCards preserves ordered structured native links and their explicit target/ARIA without using item URLs', () => {
  const data = fixture(), links = data.children.results[0].fieldCollection.find(field => field.name === 'links').jsonValue;
  links.push({ id: 'test-only-second-navigation', url: '/unused-second-item-url', fields: {
    title: sdkField('test-only-second-navigation', 'title', 'UNUSED SECOND TITLE'),
    link: sdkField('test-only-second-navigation', 'link', { href: '#test-only-second', text: 'Second native destination', target: '_blank', 'aria-label': 'Explicit native label' }, 'General Link'),
  } });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.OfferCards, data, editing);
    assert.deepEqual(attributes(html, 'a', 'href'), ['#test-only-offer-0', '#test-only-second', '#test-only-offer-1']);
    assert.deepEqual(attributes(html, 'a', 'aria-label'), ['Native destination 0', 'Explicit native label', 'Native destination 1']);
    assert.ok(html.includes('Second native destination'));
    if (!editing) assert.deepEqual(attributes(html, 'a', 'rel'), ['noopener noreferrer']);
    assert.doesNotMatch(html, /UNUSED|unused-/);
  }
  assert.equal(markers(render(Components.OfferCards, data, true)).length, 9);
  assert.equal(JSON.stringify(data), before);
});

test('OfferCards restores both source ARIA labels from original navigation text without changing SDK fields or editor identity', () => {
  const data = fixture(), labels = ['Learn more about which annuity might be right for you', 'See the unique benefits of IUL'];
  const owners = ['49D4FF67-7EAA-5D5B-91A8-1ED54E2274F5', '34B23014-CD2A-575A-B21B-315E0C47564D'];
  const fields = data.children.results.map((card, index) => {
    const item = card.fieldCollection.find(field => field.name === 'links').jsonValue[0];
    item.id = owners[index];
    item.fields.link.metadata.itemId = owners[index];
    item.fields.link.value.text = labels[index];
    return item.fields.link;
  });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const { components, capturedLinks } = observedCardGrid();
    const html = render(components.OfferCards, data, editing);
    assert.deepEqual(attributes(html, 'a', 'aria-label'), labels);
    assert.equal(capturedLinks.length, 2);
    for (const [index, link] of capturedLinks.entries()) {
      assert.equal(link['aria-label'], labels[index]);
      assert.equal(link.field.metadata, fields[index].metadata);
      assert.deepEqual(link.field.value, editing ? fields[index].value : safeLinkRenderProps(allianzLinkField(fields[index], false)).field.value);
      if (editing) assert.equal(link.field, fields[index]);
      assert.equal(Object.hasOwn(fields[index].value, 'aria-label'), false);
      assert.equal(Object.hasOwn(fields[index].value, 'ariaLabel'), false);
    }
    assert.equal(markers(html).length, editing ? 8 : 0);
    assert.equal(JSON.stringify(data), before);
  }
});

test('OfferCards retains explicit ARIA precedence and omits text fallback for missing or non-string text', () => {
  const data = fixture(), fields = data.children.results.map(card => card.fieldCollection.find(field => field.name === 'links').jsonValue[0].fields.link);
  fields[0].value.ariaLabel = 'Explicit camel-case label';
  fields[0].value['aria-label'] = 'Secondary explicit label';
  fields[1].value['aria-label'] = 'Explicit hyphenated label';
  for (const editing of [false, true]) {
    assert.deepEqual(attributes(render(Components.OfferCards, data, editing), 'a', 'aria-label'), ['Explicit camel-case label', 'Explicit hyphenated label']);
  }
  delete fields[0].value.ariaLabel;
  delete fields[0].value['aria-label'];
  delete fields[1].value['aria-label'];
  for (const text of [undefined, '', 42]) {
    for (const field of fields) field.value.text = text;
    const before = JSON.stringify(data);
    for (const editing of [false, true]) assert.deepEqual(attributes(render(Components.OfferCards, data, editing), 'a', 'aria-label'), []);
    assert.equal(JSON.stringify(data), before);
  }
  fields[0].value.text = 'Native text';
  fields[0].value.ariaLabel = 42;
  assert.deepEqual(attributes(render(Components.OfferCards, data), 'a', 'aria-label'), []);
});

test('Default EditorialStacked keeps its original ARIA behavior and cannot opt in through native rendering parameters', () => {
  for (const shape of [fixture(), namedFixture(fixture())]) {
    const before = JSON.stringify(shape);
    for (const editing of [false, true]) {
      assert.deepEqual(attributes(render(Components.EditorialStacked, shape, editing), 'a', 'aria-label'), []);
      assert.deepEqual(attributes(render(Components.EditorialStacked, shape, editing, { ...adversarialParams, linkTextAriaLabel: '1' }), 'a', 'aria-label'), []);
    }
    assert.equal(JSON.stringify(shape), before);
  }
  const data = fixture(), fields = data.children.results.map(card => card.fieldCollection.find(field => field.name === 'links').jsonValue[0].fields.link);
  fields[0].value.ariaLabel = 'Existing native camel-case label';
  fields[1].value['aria-label'] = 'Existing native hyphenated label';
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    assert.deepEqual(attributes(render(Components.EditorialStacked, data, editing), 'a', 'aria-label'), ['Existing native camel-case label', 'Existing native hyphenated label']);
  }
  assert.equal(JSON.stringify(data), before);
});

test('OfferCards accepts named SDK fields and serialized collections with identical native output', () => {
  const data = fixture(), named = namedFixture(data), before = JSON.stringify(named);
  for (const editing of [false, true]) assert.equal(render(Components.OfferCards, data, editing), render(Components.OfferCards, named, editing));
  assert.equal(JSON.stringify(named), before);
});

test('Finite offer projection preserves mixed named SDK precedence and never restores unused collection fields', () => {
  const data = fixture(), card = data.children.results[0];
  card.heading = { jsonValue: sdkField('test-only-named-owner', 'heading', 'Original named heading') };
  card.body = { jsonValue: sdkField('test-only-named-owner', 'body', '<p>Original named body.</p>', 'Rich Text') };
  card.subheading = { jsonValue: sdkField('test-only-named-owner', 'subheading', 'UNUSED NAMED SUBHEADING') };
  const before = JSON.stringify(data), html = render(Components.OfferCards, data, true), actual = markers(html);
  assert.ok(html.includes('Original named heading') && html.includes('<p>Original named body.</p>'));
  assert.ok(!html.includes('Native offer 0') && !html.includes(sourceField(card, 'body').value));
  assert.equal(actual.filter(marker => marker.itemId === 'test-only-named-owner').length, 2);
  assert.equal(actual.length, 8);
  assert.doesNotMatch(html, /UNUSED|unused-/);
  assert.equal(JSON.stringify(data), before);
});

test('Explicitly cleared ordered collections remain cleared in named, serialized and mixed SDK projections', () => {
  for (const shape of ['serialized', 'named', 'mixed']) {
    let data = fixture();
    if (shape === 'named') data = namedFixture(data);
    for (const card of data.children.results) {
      if (shape === 'serialized') card.fieldCollection.find(field => field.name === 'links').jsonValue = [];
      else card.links = { targetItems: [] };
    }
    const before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(Components.OfferCards, data, editing);
      assert.deepEqual(attributes(html, 'a', 'href'), []);
      assert.doesNotMatch(html, /UNUSED SCALAR|unused-scalar/);
      assert.equal(markers(html).length, editing ? 6 : 0);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('Absent ordered collections cannot expose the duplicated scalar card link', () => {
  const data = fixture();
  for (const card of data.children.results) card.fieldCollection = card.fieldCollection.filter(field => field.name !== 'links');
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.OfferCards, data, editing);
    assert.deepEqual(attributes(html, 'a', 'href'), []);
    assert.equal(markers(html).length, editing ? 6 : 0);
  }
  assert.equal(JSON.stringify(data), before);
});

test('Cleared active offer fields add no empty canvas controls and retain native content field values', () => {
  const data = fixture();
  for (const card of data.children.results) {
    sourceField(card, 'heading').value = '';
    sourceField(card, 'body').value = '';
    sourceField(card, 'image').value = {};
    card.fieldCollection.find(field => field.name === 'links').jsonValue[0].fields.link.value = { href: '' };
  }
  const before = JSON.stringify(data);
  assert.equal(markers(render(Components.OfferCards, data, true)).length, 0);
  const visitor = render(Components.OfferCards, data);
  assert.deepEqual(attributes(visitor, 'a', 'href'), []);
  assert.deepEqual(attributes(visitor, 'img', 'src'), []);
  assert.equal(JSON.stringify(data), before);
});

test('OfferQuestionPrompt retains native Question SVG, source green/brand classes and only two editor fields', () => {
  const data = fixture(true), before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = render(Components.OfferQuestionPrompt, data, editing, adversarialParams);
    assert.ok(html.includes('l-container--full-width t-bg-green-soft axlTileCollection'));
    assert.ok(html.includes('l-grid__row u-padding-top-lg u-margin-bottom-lg'));
    assert.ok(html.includes('l-grid__column-medium-12'));
    assert.ok(html.includes('m-axlIntroductionBlock -is--stacked -no--image'));
    assert.ok(html.includes('tileContent u-text-center'));
    assert.ok(html.includes('tileIcon t-bg-primary-brand t-icon-primary-white'));
    assert.equal((html.match(/<h2\b/g) ?? []).length, 1);
    assert.deepEqual(attributes(html, 'img', 'src'), ['/test-only-offer/native-question.svg']);
    assert.deepEqual(attributes(html, 'img', 'alt'), ['Question']);
    assert.deepEqual(attributes(html, 'a', 'href'), []);
    assert.doesNotMatch(html, /UNUSED|unused-|tileBody|<h4\b|kind="open"[^>]*body/);
    assert.equal(markers(html).length, editing ? 2 : 0);
  }
  const actual = markers(render(Components.OfferQuestionPrompt, data, true));
  for (const name of ['heading', 'icon']) assert.equal(actual.filter(marker => marker.fieldId === sourceField(data.children.results[0], name).metadata.fieldId).length, 1);
  assert.equal(JSON.stringify(data), before);
});

test('Question heading/icon can be cleared or replaced without inventing image assets or actions', () => {
  const data = fixture(true), card = data.children.results[0];
  sourceField(card, 'icon').value = { src: '/test-only-offer/replacement-question.svg', alt: 'Native replacement' };
  assert.deepEqual(attributes(render(Components.OfferQuestionPrompt, data), 'img', 'src'), ['/test-only-offer/replacement-question.svg']);
  sourceField(card, 'icon').value = {};
  sourceField(card, 'heading').value = '';
  const before = JSON.stringify(data);
  assert.equal(markers(render(Components.OfferQuestionPrompt, data, true)).length, 0);
  const visitor = render(Components.OfferQuestionPrompt, data);
  assert.deepEqual(attributes(visitor, 'img', 'src'), []);
  assert.deepEqual(attributes(visitor, 'a', 'href'), []);
  assert.equal(JSON.stringify(data), before);
});

test('Finite offer variants handle missing datasource, empty children and absent active fields without source fallbacks', () => {
  for (const name of ['OfferCards', 'OfferQuestionPrompt']) {
    assert.ok(render(Components[name], undefined).includes('AllianzCardGrid'));
    const data = fixture(name === 'OfferQuestionPrompt');
    data.children.results = [];
    assert.doesNotMatch(render(Components[name], data, true), /<h2\b|<img\b|kind="open"|UNUSED/);
    delete data.children;
    assert.doesNotMatch(render(Components[name], data, true), /<h2\b|<img\b|kind="open"|UNUSED/);
  }
  const data = fixture();
  for (const card of data.children.results) card.fieldCollection = card.fieldCollection.filter(field => !['heading', 'body', 'image', 'links'].includes(field.name));
  assert.equal(markers(render(Components.OfferCards, data, true)).length, 0);
});

test('Finite offer variants omit absent rendering IDs and preserve explicit string IDs without inventing identifiers', () => {
  for (const name of ['OfferCards', 'OfferQuestionPrompt']) {
    const data = fixture(name === 'OfferQuestionPrompt'), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const absent = render(Components[name], data, editing, { DynamicPlaceholderId: 'test-only-placeholder', FieldNames: name });
      assert.deepEqual(attributes(absent, 'div', 'id'), []);
      for (const identifier of ['', 'test-only-offer-explicit-id']) {
        const explicit = render(Components[name], data, editing, {
          DynamicPlaceholderId: 'test-only-placeholder', FieldNames: name, RenderingIdentifier: identifier,
        });
        assert.deepEqual(attributes(explicit, 'div', 'id'), [identifier]);
        assert.equal(markers(explicit).length, markers(absent).length);
        assert.deepEqual(attributes(explicit, 'a', 'href'), attributes(absent, 'a', 'href'));
        assert.deepEqual(attributes(explicit, 'img', 'src'), attributes(absent, 'img', 'src'));
      }
    }
    assert.equal(JSON.stringify(data), before);
  }
});
