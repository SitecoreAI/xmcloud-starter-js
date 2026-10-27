import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { attribute, baselineSource, compile, filename, fixture, freeze, here, ICON_FIELD_ID, imageTags,
  INFORMATION_URL, LIST_URL, localFixtureMarkup, metadata, OWNERS, params, renderSDK, require, sourceRoot } from './optional-icons-fixture.mjs';

const currentSource = fs.readFileSync(filename, 'utf8');
const Components = compile(currentSource), Baseline = compile(baselineSource());
const modes = ['normal', 'editing'];
const variants = ['Default', 'BrandIcon'];
const marker = /data-allianz-rich-text-icon="(?:gray|brand)"/;
const removeIcon = html => html.replace(/<div class="tileIcon[^\"]*" data-allianz-rich-text-icon="(?:gray|brand)">[\s\S]*?<\/div>/, '')
  .replace(/^<link rel="preload" as="image" href="[^\"]*"\/>/, '');
const countField = (html, field) => metadata(html).filter(entry => entry.itemId === field.metadata.itemId && entry.fieldId === field.metadata.fieldId).length;

test('the complete portable pre-change v6 renderer oracle retains its exact bytes and verified transport assets', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'optional-icons.baseline.json'), 'utf8'));
  const bytes = Buffer.from(baselineSource());
  assert.equal(bytes.length, 92501);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '47fbdbfcc1996bc15d1cf393b6ec731809f6662c5effea8b8ec5d973bf2c2ae4');
  assert.equal(manifest.uncompressedSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.match(LIST_URL, /\/5c1c69973d934b1cb5525bc3f42b0df0\?v=729b203e$/);
  assert.match(INFORMATION_URL, /\/4b64afa0fa0a4f7f87a12e01f2de3ca0\?v=cba3d72e$/);
});

test('Default mounts the original populated SDK Image before the complete heading with the gray appearance', () => {
  for (const src of [LIST_URL, INFORMATION_URL]) {
    const observed = [], instrumented = compile(currentSource, { observe: observed });
    const data = freeze(fixture({ src })), before = JSON.stringify(data);
    const html = renderSDK(instrumented.Default, data);
    assert.match(html, /class="tileIcon t-bg-transparent t-icon-primary-black" data-allianz-rich-text-icon="gray"/);
    assert.equal(imageTags(html).length, 1);
    assert.ok(html.indexOf('data-allianz-rich-text-icon') < html.indexOf('<header>'));
    const image = observed.find(call => call.name === 'Image');
    assert.equal(image.field, data.icon.jsonValue); assert.equal(image.editable, false);
    assert.equal(image.className, 'allianz-rich-text-icon-glyph');
    assert.equal(image.alt, undefined); assert.equal(image['aria-hidden'], undefined);
    assert.equal(attribute(imageTags(html)[0], 'src'), src);
    assert.equal(JSON.stringify(data), before);
  }
});

test('BrandIcon delegates the complete Default surface and changes only the intended icon appearance', () => {
  for (const mode of modes) for (const owner of Object.values(OWNERS)) {
    const data = freeze(fixture({ owner, src: INFORMATION_URL })), input = params({ alignment: 'left', headingLevel: 'h3' });
    const html = renderSDK(Components.BrandIcon, data, input, mode);
    assert.equal(html, renderSDK(Components.Default, data, input, mode, { brandIcon: true }));
    assert.match(html, /class="tileIcon t-bg-primary-brand t-icon-primary-white" data-allianz-rich-text-icon="brand"/);
    assert.equal(removeIcon(html), renderSDK(Baseline.Default, data, input, mode));
    assert.ok(html.includes(data.heading.jsonValue.value));
    assert.ok(html.includes(data.subheading.jsonValue.value));
    assert.ok(html.includes(data.body.jsonValue.value));
    assert.ok(html.includes(data.primaryLink.jsonValue.value.text));
    assert.ok(html.includes('<h3>Common questions:</h3>'));
    for (const anchor of ['video', 'allocation-options']) {
      assert.ok(html.includes(`name="${anchor}"`)); assert.ok(html.includes(`href="#${anchor}"`));
    }
  }
});

test('both icon appearances preserve all original SDK field identities and editing owners without clones', () => {
  const observed = [], instrumented = compile(currentSource, { observe: observed });
  for (const name of variants) for (const owner of Object.values(OWNERS)) {
    const data = freeze(fixture({ owner })), before = JSON.stringify(data);
    observed.length = 0;
    const html = renderSDK(instrumented[name], data, params(), 'editing');
    assert.equal(metadata(html).length, 5); assert.equal(observed.length, 5);
    assert.equal(data.icon.jsonValue.metadata.fieldId, ICON_FIELD_ID);
    for (const key of ['heading', 'subheading', 'body', 'primaryLink', 'icon']) {
      const original = data[key].jsonValue, calls = observed.filter(call => call.field === original);
      assert.equal(calls.length, 1, `${name}/${owner}/${key}`); assert.equal(calls[0].editable, true);
      assert.equal(countField(html, original), 1); assert.equal(original.metadata.itemId, owner);
    }
    assert.equal(JSON.stringify(data), before);
  }
});

test('visitor missing, undefined, cleared and empty-src icons preserve exact v6 HTML without wrapper or new spacing', () => {
  for (const iconState of ['missing', 'undefined', 'undefined-json', 'undefined-value', 'cleared', 'empty-src']) {
    const data = freeze(fixture({ iconState }));
    for (const name of variants) for (const input of [params(), params({ alignment: 'left', headingLevel: 'h3', theme: 'green-soft' })]) {
      const html = renderSDK(Components[name], data, input);
      assert.equal(html, renderSDK(Baseline.Default, data, input), `${name}/${iconState}`);
      assert.doesNotMatch(html, marker); assert.equal(imageTags(html).length, 0);
    }
  }
});

test('editing mounts only existing original optional fields and never invents controls for missing wrappers', () => {
  const observed = [], instrumented = compile(currentSource, { observe: observed });
  for (const iconState of ['missing', 'undefined', 'undefined-json', 'undefined-value', 'cleared', 'empty-src']) for (const name of variants) {
    const data = freeze(fixture({ iconState })), original = data.icon?.jsonValue;
    observed.length = 0;
    const html = renderSDK(instrumented[name], data, params(), 'editing');
    const images = observed.filter(call => call.name === 'Image');
    assert.equal(images.length, 0, `${name}/${iconState}`);
    assert.equal(metadata(html).length, 4);
    if (original) assert.equal(countField(html, original), 0);
    else assert.equal(html, renderSDK(Baseline.Default, data, params(), 'editing'));
  }
});

test('authored empty alt, dimensions and versioned image URL survive while complete native link behavior remains unchanged', () => {
  for (const name of variants) for (const mode of modes) {
    const data = freeze(fixture()), before = JSON.stringify(data);
    const html = renderSDK(Components[name], data, params(), mode);
    const image = imageTags(html)[0];
    assert.equal(attribute(image, 'alt'), ''); assert.equal(attribute(image, 'width'), '36'); assert.equal(attribute(image, 'height'), '18');
    assert.equal(attribute(image, 'src'), LIST_URL); assert.equal(attribute(image, 'title'), 'Authored icon title');
    assert.doesNotMatch(image, /aria-hidden|role="presentation"/);
    assert.equal(removeIcon(html), renderSDK(Baseline.Default, data, params(), mode));
    const link = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).find(tag => attribute(tag, 'class') === 'a-link');
    assert.ok(link); assert.equal(attribute(link, 'target'), mode === 'editing' ? '_blank' : '');
    assert.equal(attribute(link, 'href'), '/about?source=fixture&value=one#fixture-details');
    const baselineLink = [...renderSDK(Baseline.Default, data, params(), mode).matchAll(/<a\b[^>]*>/g)]
      .map(match => match[0]).find(tag => attribute(tag, 'class') === 'a-link');
    assert.equal(link, baselineLink, 'optional icons must retain the installed SDK complete link serialization');
    assert.equal(JSON.stringify(data), before);
  }
});

test('replacement fields with arbitrary metadata and owners remain authorable without GUID or asset dispatch', () => {
  const observed = [], instrumented = compile(currentSource, { observe: observed });
  for (const name of variants) for (const mode of modes) {
    const data = fixture({ owner: 'fixture-arbitrary-owner', src: INFORMATION_URL });
    data.icon.jsonValue.metadata = { itemId: 'fixture-replacement-owner', fieldId: 'fixture-replacement-field', fieldType: 'Image', fixtureOnly: true };
    data.icon.jsonValue.value.alt = 'Authored replacement alternative text'; freeze(data);
    observed.length = 0; const html = renderSDK(instrumented[name], data, params(), mode);
    assert.equal(observed.filter(call => call.name === 'Image' && call.field === data.icon.jsonValue).length, 1);
    assert.equal(attribute(imageTags(html)[0], 'src'), INFORMATION_URL);
    assert.equal(attribute(imageTags(html)[0], 'alt'), 'Authored replacement alternative text');
    assert.equal(countField(html, data.icon.jsonValue), mode === 'editing' ? 1 : 0);
  }
});

test('rich-text and disclosures early returns remain byte-identical to v6 and ignore even populated optional icons', () => {
  for (const layout of ['rich-text', 'disclosures']) for (const name of variants) for (const mode of modes) {
    const data = fixture(), input = params({ layout });
    assert.equal(renderSDK(Components[name], data, input, mode), renderSDK(Baseline.Default, data, input, mode));
    Object.defineProperty(data, 'icon', { get() { throw new Error('early return accessed inactive icon'); } });
    assert.doesNotThrow(() => renderSDK(Components[name], data, input, mode));
  }
});

test('every existing non-Default RichText export remains byte-identical to v6 across populated icon states and typical layouts', () => {
  const names = Object.keys(Baseline).filter(name => name !== 'Default' && typeof Baseline[name] === 'function');
  assert.ok(names.length >= 80, 'the portable oracle must exercise the complete existing export surface');
  for (const name of names) for (const mode of modes) for (const layout of ['stacked', 'rich-text', 'disclosures']) {
    const data = freeze(fixture()), input = params({ layout });
    assert.equal(renderSDK(Components[name], data, input, mode), renderSDK(Baseline[name], data, input, mode), `${name}/${mode}/${layout}`);
  }
});

test('missing datasource and body-only OfferFootnotes preserve the exact existing fallback and authoring surface', () => {
  for (const mode of modes) {
    for (const name of variants) assert.equal(renderSDK(Components[name], undefined, params(), mode), renderSDK(Baseline.Default, undefined, params(), mode));
    const data = fixture(), input = params();
    assert.equal(renderSDK(Components.OfferFootnotes, data, input, mode), renderSDK(Baseline.OfferFootnotes, data, input, mode));
    assert.doesNotMatch(renderSDK(Components.OfferFootnotes, data, input, mode), marker);
  }
});

test('icon CSS confines exact responsive size and source colors to the new RichText icon wrappers', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichTextIcons.css'), 'utf8');
  const ast = require('postcss').parse(css);
  ast.walkRules(rule => { for (const selector of rule.selectors) assert.match(selector, /^\.tileIcon\[data-allianz-rich-text-icon(?:[=\]])/); });
  assert.match(css, /width:\s*40px/); assert.match(css, /height:\s*40px/); assert.match(css, /width:\s*26px/);
  assert.match(css, /@media\s*\(min-width:\s*704px\)/); assert.match(css, /width:\s*64px/);
  assert.match(css, /background(?:-color)?:\s*#003781/i); assert.match(css, /brightness\(0\) invert\(1\)/);
  assert.match(css, /brightness\(0\) invert\(23\.5294117647%\)/);
  assert.doesNotMatch(css, /url\(|mask|@font-face|!important|filter:\s*[^;]*(?:#|http)/);
});

test('the optional icon behavior does not alter the existing serialized RichText query', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'optional-icons.baseline.json'), 'utf8'));
  const bytes = fs.readFileSync(path.resolve(sourceRoot, manifest.authoringQueryRelativePath));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.authoringQuerySha256);
});

test('the portable local SDK fixture labels synthetic content and provides the complete visual comparison cases', () => {
  const html = localFixtureMarkup();
  assert.match(html, /synthetic content/); assert.match(html, /No saved native binding/);
  assert.equal((html.match(/<section data-optional-case=/g) ?? []).length, 14);
  assert.equal((html.match(marker) ?? []).length > 0, true);
  assert.equal((html.match(/data-allianz-rich-text-icon=/g) ?? []).length, 4);
  assert.match(html, /<h3>Common questions:<\/h3>/);
  assert.doesNotMatch(html, /<script\b|<iframe\b|LightBulb|LineGraph/);
});
