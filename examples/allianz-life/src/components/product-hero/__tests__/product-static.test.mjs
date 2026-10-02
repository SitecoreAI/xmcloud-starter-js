import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, metadata, nativeField, render, require, sourceRoot } from './sdk-test-helper.mjs';

const { parse } = require('graphql');
const specs = [
  ['ProductHero', 'product-hero', ['heading', 'image']],
  ['ProductIntroduction', 'product-introduction', ['heading', 'body']],
  ['ProductFootnotes', 'product-footnotes', ['body']],
  ['ProductRiskDisclosures', 'product-risk-disclosures', ['body']],
].map(([name, directory, fields]) => {
  const sourceBytes = fs.readFileSync(path.join(sourceRoot,
    `components/${directory}/__tests__/${directory}.source.html`));
  return {
    name, directory, fields, sourceBytes, source: sourceBytes.toString('utf8'),
    Component: loadSource(path.join(sourceRoot, `components/${directory}/${name}.tsx`)).Default,
    contract: JSON.parse(fs.readFileSync(path.join(sourceRoot,
      `components/${directory}/__tests__/native-contract.json`), 'utf8')),
  };
});
const [hero, introduction, footnotes, disclosures] = specs;
const Blue = loadSource(path.join(sourceRoot,
  'components/product-introduction/ProductIntroduction.tsx')).Blue;

function lfBytes(bytes) {
  // Latin-1 preserves every byte while replacing only CRLF pairs with LF.
  return Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

function sourceFragmentBytes(contract, checkoutBytes) {
  assert.equal(typeof contract.sourceFragmentBase64, 'string', 'Raw source fragment witness missing');
  const raw = Buffer.from(contract.sourceFragmentBase64, 'base64');
  assert.equal(raw.toString('base64'), contract.sourceFragmentBase64,
    'Raw source fragment Base64 witness invalid');
  assert.equal(createHash('sha256').update(raw).digest('hex'), contract.sourceFragmentSha256,
    'Raw source fragment digest mismatch');
  assert.ok(lfBytes(checkoutBytes).equals(lfBytes(raw)),
    'Readable source excerpt changed beyond LF/CRLF conversion');
  return raw;
}

test('the fixed Hero and disclosure design uses the captured source stylesheet rules', () => {
  const sourceStyles = fs.readFileSync(path.join(sourceRoot,
    '../public/allianz-assets/source-style.css'), 'utf8');
  const runtimeStyles = fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8');
  for (const rule of ['.c-stage__image--short .c-hero__image{max-height:300px}',
    '.a-axlDisclosures{background:#bbbdbf}', '.a-axlDisclosures p{margin-top:1em}']) {
    assert.ok(sourceStyles.includes(rule), rule);
    assert.ok(runtimeStyles.includes(rule), rule);
  }
});

test('actual annuity Hero keeps the captured short-image structure and pending image absent', () => {
  const datasource = hero.contract.entries[0].datasource;
  const html = render(hero.Component, datasource);
  assert.equal(datasource.id, '789e3c9c-689a-4115-9077-3e3dcce20804');
  assert.match(html, /class="l-container-full-width t-bg-blue-soft"/);
  assert.match(html, /class="m-axlHero"/);
  assert.match(html, /class="l-grid l-grid--max-width l-grid--no-gutters"/);
  assert.match(html, /class="l-grid__column-medium-12 c-hero__wrapper"/);
  assert.match(html, /<h1 class="c-heading c-hero__headline u-text-center">Help prepare for the future with an annuity<\/h1>/);
  assert.match(hero.source, /c-stage__image--cover c-stage__image--short/);
  assert.match(hero.source, /hero-azl-camping-1\.jpg/);
  assert.equal(hero.contract.pendingSourceImages.length, 2);
  assert.deepEqual(hero.contract.pendingSourceImages.map((field) => field.name), ['desktopImage', 'mobileImage']);
  assert.deepEqual(hero.contract.pendingSourceImages[0].sourceMediaCandidateIds,
    hero.contract.pendingSourceImages[1].sourceMediaCandidateIds);
  assert.doesNotMatch(html, /<img|<picture|hero-azl-camping|bodyCopy|button|a-link|\[No text/);
});

test('Hero accepts a complete authored image field without adding a second mobile image or content', () => {
  const image = nativeField('image', { src: '/allianz-assets/authored-product.jpg', alt: 'Authored scene' },
    hero.contract.entries[0].datasource.id);
  const html = render(hero.Component, { ...hero.contract.entries[0].datasource, image });
  assert.match(html, /<picture class="c-image c-stage__image--cover c-stage__image--short">/);
  assert.match(html, /class="c-image__img c-hero__image"/);
  assert.match(html, /alt="Authored scene"/);
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.deepEqual(metadata(html), []);
});

test('both actual introductions use fixed centered source tiles and their respective white or blue backgrounds', () => {
  assert.deepEqual(introduction.contract.entries.map((entry) => entry.datasource.id),
    ['7e20a874-bbef-4272-bcb1-8ff2be81c4c4', '65fad7e9-896f-4146-b005-920963fd6f67']);
  for (const [index, entry] of introduction.contract.entries.entries()) {
    const html = render(index ? Blue : introduction.Component, entry.datasource);
    const heading = entry.datasource.heading.jsonValue.value;
    assert.match(introduction.source, new RegExp(`<H2>${heading.replace(/[?]/g, '\\?')}<\\/H2>`));
    assert.ok(html.includes(`<h2>${heading}</h2>`));
    assert.ok(html.includes(entry.datasource.body.jsonValue.value));
    assert.ok(html.includes(`l-container--full-width t-bg-${index ? 'blue-soft' : 'transparent'} axlTileCollection`));
    for (const classes of ['m-axlTile match-height -is--stacked t-bg-transparent',
      'tileContent u-text-center', 'tileSubGrid__content', 'tileBody u-font-size-xl']) {
      assert.ok(html.includes(`class="${classes}"`), classes);
    }
    assert.doesNotMatch(html, /m-axlIntroductionBlock|tileIcon|tileImage|tileSubHeading|tileLink|<h[13456]/);
  }
});

test('actual footnotes keep their rich-text wrapper, two sup markers and authored divider', () => {
  const datasource = footnotes.contract.entries[0].datasource;
  const html = render(footnotes.Component, datasource);
  assert.equal(datasource.id, '149ade89-a5ae-410b-b034-ad116b329d33');
  assert.match(footnotes.source, /class="o-richTextEditor__wrapper"/);
  assert.match(html, /class="l-container--full-width t-bg-grey-muted axlTileCollection"/);
  assert.match(html, /class="o-richTextEditor__wrapper"/);
  assert.ok(html.includes(datasource.body.jsonValue.value));
  assert.equal((html.match(/<sup>/g) ?? []).length, 2);
  assert.match(html, /<hr>/);
  assert.doesNotMatch(html, /<h[1-6]|tileContent|tileBody|m-axlTile|IntroductionBlock|a-axlDisclosures/);
});

test('actual risk disclosures retain the source shell and every existing native body value', () => {
  const datasource = disclosures.contract.entries[0].datasource;
  const before = JSON.stringify(datasource);
  const html = render(disclosures.Component, datasource);
  assert.equal(datasource.id, '2c5a9453-93d5-463b-8e77-65513d357a6e');
  for (const classes of ['l-container--full-width a-axlDisclosures', 'l-grid l-grid--max-width',
    'l-grid__row', 'l-grid__column', 'row', 'col-md-12 content-body disclosure']) {
    assert.ok(html.includes(`class="${classes}"`), classes);
    assert.ok(disclosures.source.includes(`class="${classes}"`), classes);
  }
  assert.ok(html.includes(datasource.body.jsonValue.value));
  assert.equal((html.match(/<p[ >]/g) ?? []).length, 8);
  assert.match(html, /<p class="box">• Not FDIC insured/);
  assert.match(html, /href="#demo-unavailable" data-demo-disabled="true"/);
  assert.doesNotMatch(html, /tileBody|tileContent|axlTileCollection|<h[1-6]/);
  assert.equal(JSON.stringify(datasource), before);
});

for (const spec of specs) {
  test(`${spec.name} source excerpt hash and native reviewed values remain consistent`, () => {
    sourceFragmentBytes(spec.contract, spec.sourceBytes);
    for (const entry of spec.contract.entries) {
      assert.equal(entry.datasource.id, entry.native.itemId);
      for (const name of spec.fields.filter((field) => field !== 'image')) {
        assert.equal(entry.datasource[name].jsonValue.value,
          entry.native.reviewedFields.find((field) => field.name === name).value);
      }
    }
  });
  test(`${spec.name} raw source witness survives LF and CRLF checkouts and rejects altered copy`, () => {
    const raw = Buffer.from(spec.contract.sourceFragmentBase64, 'base64');
    const lf = lfBytes(raw);
    const crlf = Buffer.from(lf.toString('latin1').replace(/\n/g, '\r\n'), 'latin1');
    for (const checkout of [lf, crlf]) {
      assert.deepEqual(sourceFragmentBytes(spec.contract, checkout), raw);
    }
    const alteredCopy = lf.toString('utf8').replace(/>([^<]*[A-Za-z][^<]*)</,
      (_, copy) => `>${copy} altered copy<`);
    assert.notEqual(alteredCopy, lf.toString('utf8'));
    for (const mutation of [Buffer.from(alteredCopy), Buffer.concat([lf, Buffer.from('unexpected content')]),
      Buffer.concat([Buffer.from(' '), lf]),
      Buffer.from(lf.toString('latin1').replace(/\n/g, '\r'), 'latin1')]) {
      assert.throws(() => sourceFragmentBytes(spec.contract, mutation),
        /Readable source excerpt changed beyond LF\/CRLF conversion/);
    }
    assert.throws(() => sourceFragmentBytes({ ...spec.contract,
      sourceFragmentBase64: `${spec.contract.sourceFragmentBase64}\n` }, lf),
      /Raw source fragment Base64 witness invalid/);
    assert.throws(() => sourceFragmentBytes({ ...spec.contract,
      sourceFragmentBase64: Buffer.concat([raw, Buffer.from('unexpected content')]).toString('base64') }, lf),
      /Raw source fragment digest mismatch/);
  });
  test(`${spec.name} has only its named purpose fields in its real GraphQL query`, () => {
    const query = fs.readFileSync(path.join(sourceRoot,
      `components/${spec.directory}/${spec.directory}.graphql`), 'utf8');
    const operation = parse(query).definitions[0];
    assert.equal(operation.name.value, `${spec.name}Data`);
    assert.deepEqual(operation.variableDefinitions.map((entry) => entry.variable.name.value), ['datasource', 'language']);
    const datasource = operation.selectionSet.selections[0];
    assert.equal(datasource.alias.value, 'datasource');
    assert.equal(datasource.name.value, 'item');
    assert.deepEqual(datasource.arguments.map((argument) => [argument.name.value, argument.value.name.value]),
      [['path', 'datasource'], ['language', 'language']]);
    assert.deepEqual(datasource.selectionSet.selections.map((entry) => entry.alias?.value || entry.name.value),
      ['id', ...spec.fields]);
    for (const field of datasource.selectionSet.selections.slice(1)) {
      assert.deepEqual(field.arguments.map((argument) => [argument.name.value, argument.value.value]), [['name', field.alias.value]]);
      assert.deepEqual(field.selectionSet.selections.map((entry) => entry.name.value), ['jsonValue']);
    }
    assert.deepEqual(spec.contract.authorFields.map((field) => field.name), spec.fields);
    assert.deepEqual(spec.contract.parameters, ['RenderingIdentifier']);
  });

  test(`${spec.name} preserves real SDK editing metadata and never mutates authored field objects`, () => {
    const itemId = spec.contract.entries[0].datasource.id;
    const datasource = { id: itemId };
    for (const field of spec.fields) datasource[field] = nativeField(field,
      field === 'image' ? { src: '/allianz-assets/authored-product.jpg', alt: 'Authored scene' }
        : field === 'body' ? '<p>Authored <strong>copy</strong>.</p><ul><li>One</li></ul><div><h3>Authored subtopic</h3></div>'
          : 'Authored <em>headline</em>', itemId);
    const before = JSON.stringify(datasource);
    const editing = render(spec.Component, datasource, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
      spec.fields.map((field) => `native-${field}`).sort());
    assert.ok(metadata(editing).every((field) => field.itemId === itemId));
    const normal = render(spec.Component, datasource);
    assert.deepEqual(metadata(normal), []);
    if (spec.fields.includes('body')) assert.ok(normal.includes(datasource.body.jsonValue.value));
    if (spec.fields.includes('heading')) assert.match(normal, /Authored &lt;em&gt;headline&lt;\/em&gt;/);
    assert.doesNotMatch(normal, /<p[^>]*class="(?:tileBody|o-richTextEditor)|<p[^>]*><ul|<p[^>]*><div/);
    assert.equal(JSON.stringify(datasource), before);
  });

  test(`${spec.name} cleared fields retain native editor chrome and stay blank for visitors`, () => {
    const itemId = spec.contract.entries[0].datasource.id;
    const datasource = Object.fromEntries(spec.fields.map((name) => [name,
      nativeField(name, name === 'image' ? {} : '', itemId)]));
    const editing = render(spec.Component, datasource, { isEditing: true });
    assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
      spec.fields.map((field) => `native-${field}`).sort());
    assert.ok(metadata(editing).every((field) => field.itemId === itemId));
    assert.match(editing, /\[No text in field\]/);
    if (spec.fields.includes('image')) assert.match(editing, /scEmptyImage/);
    const normal = render(spec.Component, datasource);
    assert.doesNotMatch(normal, /<h[1-6]|<img|<picture|<p>|\[No text|scEmptyImage|Help prepare|What is an annuity|RILAs are|Income for life/);
    assert.deepEqual(metadata(normal), []);
  });

  test(`${spec.name} ignores generic design knobs and unrelated old fields`, () => {
    const datasource = spec.contract.entries[0].datasource;
    const unused = { ...datasource, subheading: nativeField('unused', 'Unused subheading'),
      primaryLink: { jsonValue: { value: { href: '/unused', text: 'Unused link' } } },
      desktopImage: { jsonValue: { value: { src: '/unused-desktop.jpg' } } },
      mobileImage: { jsonValue: { value: { src: '/unused-mobile.jpg' } } },
      theme: nativeField('theme', 'primary-brand'), headingLevel: nativeField('headingLevel', 'h6'),
      children: { results: [{ heading: nativeField('unused-child', 'Unused child') }] } };
    if (!spec.fields.includes('heading')) unused.heading = nativeField('unused-heading', 'Unused heading');
    const params = { theme: 'primary-brand', layout: 'cards', columns: '4', alignment: 'right',
      headingLevel: 'h6', spacing: 'xl', paddingTop: 'xl', paddingBottom: 'xl', styles: 'unowned-style' };
    assert.equal(render(spec.Component, datasource), render(spec.Component, unused, { params }));
    assert.doesNotMatch(render(spec.Component, unused, { params, isEditing: true }), /Unused|unused-desktop|unused-mobile|unowned-style/);
    assert.match(render(spec.Component, datasource, { params: { RenderingIdentifier: 'authored-id' } }), /id="authored-id"/);
  });

  for (const clearedName of spec.fields) {
    test(`${spec.name} independently clearing ${clearedName} retains every other authored field`, () => {
      const itemId = spec.contract.entries[0].datasource.id;
      const datasource = Object.fromEntries(spec.fields.map((name) => [name, nativeField(name,
        name === 'image' ? { src: '/allianz-assets/independent-image.jpg', alt: 'Independent image' }
          : name === 'body' ? '<p>Independent body</p>' : 'Independent headline', itemId)]));
      datasource[clearedName] = nativeField(clearedName, clearedName === 'image' ? {} : '', itemId);
      const normal = render(spec.Component, datasource);
      for (const name of spec.fields) assert.equal(normal.includes(name === 'image' ? '/allianz-assets/independent-image.jpg'
        : name === 'body' ? '<p>Independent body</p>' : 'Independent headline'), name !== clearedName);
      const editing = render(spec.Component, datasource, { isEditing: true });
      assert.deepEqual(metadata(editing).map((field) => field.fieldId).sort(),
        spec.fields.map((field) => `native-${field}`).sort());
      assert.ok(metadata(editing).every((field) => field.itemId === itemId));
    });
  }

  test(`${spec.name} missing datasource reports assignment without creating phantom editor fields`, () => {
    for (const isEditing of [false, true]) for (const omitFields of [false, true]) {
      const html = render(spec.Component, undefined, { isEditing, omitFields });
      assert.match(html, /class="allianz-missing-data" role="status"/);
      assert.deepEqual(metadata(html), []);
    }
    for (const isEditing of [false, true]) {
      const html = render(spec.Component, { children: { results: [spec.contract.entries[0].datasource] } }, { isEditing });
      assert.doesNotMatch(html, /<h[1-6]|<img|<p>|\[No text|scEmptyImage|Help prepare|RILAs are/);
      assert.deepEqual(metadata(html), []);
    }
  });
}
