import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadSource } from '../../executive-biography/__tests__/sdk-test-helper.mjs';
import { baselineSource, compile, filename, fixture, freeze, metadata, params, renderSDK, sourceRoot } from './optional-icons-fixture.mjs';

const Components = compile(fs.readFileSync(filename, 'utf8'));
const Baseline = compile(baselineSource());
const { bodyArrowLinkGlyphs } = loadSource(path.join(sourceRoot, 'lib/body-download-link-glyphs.ts'));
const sha = value => createHash('sha256').update(value).digest('hex');
// Exact captured native field, including original editing metadata. Source wrapper
// and geometry were checked against the saved official source on 2026-10-16.
const NATIVE_BODY = {
  "metadata": {
    "datasource": {
      "id": "{FDEDDE9B-E382-46EA-B007-7164BAECBF47}",
      "language": "en",
      "revision": "ece92ea1-38ce-4cf3-a95d-e370a47db760",
      "version": 1
    },
    "title": "body",
    "fieldId": "{1ABE9416-1EE9-515A-9CAB-D32FA59D52DF}",
    "fieldType": "Rich Text",
    "rawValue": "<a href=\"/for-financial-professionals/Life-Sales-Tools/life-advanced-markets-turnkey-programs\" target=\"\" aria-label=\"Life Advanced Markets turnkey programs\"> Life Advanced Markets turnkey programs </a>"
  },
  "value": "<a href=\"/for-financial-professionals/Life-Sales-Tools/life-advanced-markets-turnkey-programs\" target=\"\" aria-label=\"Life Advanced Markets turnkey programs\"> Life Advanced Markets turnkey programs </a>"
};
const OWNER = 'FDEDDE9BE38246EAB0077164BAECBF47';
const SOURCE_PATH_SHA256 = '7124b4cce7e1ad3e5f42d521958e5d613be46f97f9507b9b539710031d97e870';
const bodyField = value => ({ value, metadata: { itemId: 'synthetic-body-owner', fieldId: 'synthetic-body', fieldType: 'Rich Text' } });
const nativeData = () => ({ ...fixture(), id: OWNER, body: { jsonValue: structuredClone(NATIVE_BODY) } });
const svgTags = html => html.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [];
const removePresentation = html => html
  .replace(/<footer><div class="tileLink u-margin-top-md u-margin-bottom-md">([\s\S]*?)<\/div><\/footer>/g, '$1')
  .replace(/ class="a-link"><span aria-hidden="true" class="a-link__icon"><svg\b[\s\S]*?<\/svg><\/span><span class="a-link__text">([^<]*)<\/span>/g, '>$1');

test('the captured bare Body anchor receives exact source footer, margins and arrow/span structure without changing authored bytes', () => {
  const field = freeze(structuredClone(NATIVE_BODY)), before = JSON.stringify(field);
  const projected = bodyArrowLinkGlyphs(field, false);
  assert.notEqual(projected, field); assert.equal(projected.metadata, field.metadata);
  const icons = svgTags(projected.value); assert.equal(icons.length, 1);
  assert.equal(sha(icons[0].match(/\bd="([^"]+)"/)[1]), SOURCE_PATH_SHA256);
  assert.match(icons[0], /viewBox="0 0 24 24"/); assert.match(icons[0], /fill-rule="evenodd"/);
  assert.match(icons[0], /aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(icons[0], /<title|<desc|\bid=|aria-labelledby|aria-describedby/);
  assert.match(projected.value, /^<footer><div class="tileLink u-margin-top-md u-margin-bottom-md"><a /);
  assert.match(projected.value, /<span aria-hidden="true" class="a-link__icon"><svg/);
  assert.match(projected.value, /<\/svg><\/span><span class="a-link__text"> Life Advanced Markets turnkey programs <\/span><\/a><\/div><\/footer>$/);
  assert.equal(removePresentation(projected.value), field.value);
  assert.equal(JSON.stringify(field), before);
  assert.equal(bodyArrowLinkGlyphs(projected, false), projected, 'An existing presentation must never be wrapped twice');
});

test('BodyArrowLinks retains the complete Default field/layout surface and destination restoration', () => {
  const data = freeze(nativeData()), before = JSON.stringify(data);
  for (const layout of ['plain', 'rich-text', 'disclosures']) {
    const input = params({ layout, alignment: 'left', headingLevel: 'h3', theme: 'blue-soft' });
    const html = renderSDK(Components.BodyArrowLinks, data, input);
    assert.equal(svgTags(html).length, 1);
    assert.equal(removePresentation(html), renderSDK(Components.Default, data, input));
    assert.equal(html, renderSDK(Components.Default, data, input, 'normal', { bodyArrowLinks: true }));
    assert.match(html, /href="https:\/\/www\.allianzlife\.com\/for-financial-professionals\/Life-Sales-Tools\/life-advanced-markets-turnkey-programs" target="" aria-label="Life Advanced Markets turnkey programs" class="a-link"/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('editing shows source arrow framing with exactly one original native Body metadata wrapper', () => {
  const observed = [], Observed = compile(fs.readFileSync(filename, 'utf8'), { observe: observed });
  const data = freeze(nativeData()), before = JSON.stringify(data), field = data.body.jsonValue;
  const html = renderSDK(Observed.BodyArrowLinks, data, params(), 'editing');
  const bodyCalls = observed.filter(call => call.name === 'RichText' && call.field?.metadata?.fieldId === field.metadata.fieldId);
  assert.equal(bodyCalls.length, 1); assert.notEqual(bodyCalls[0].field, field);
  assert.equal(bodyCalls[0].field.value, bodyArrowLinkGlyphs(field, false).value);
  assert.equal(bodyCalls[0].field.metadata, field.metadata); assert.equal(bodyCalls[0].editable, false);
  assert.deepEqual(metadata(html).filter(entry => entry.fieldId === field.metadata.fieldId),
    metadata(renderSDK(Components.Default, data, params(), 'editing')).filter(entry => entry.fieldId === field.metadata.fieldId),
    'original native metadata retains the exact installed-SDK serialization, including rawValue escaping');
  assert.equal(bodyArrowLinkGlyphs(field, true), field); assert.equal(bodyArrowLinkGlyphs(field, undefined), field);
  assert.equal(removePresentation(html), renderSDK(Components.Default, data, params(), 'editing'));
  assert.equal(svgTags(html).length, 1); assert.ok(html.toLowerCase().includes(field.metadata.fieldId.toLowerCase()));
  assert.equal(JSON.stringify(data), before);
});

test('structured, populated, blank, multiple and malformed anchor presentations stay unchanged', () => {
  const anchor = '<a href="/about"> Authored label </a>';
  const unchanged = [
    '<p>Ordinary Body.</p>', '<a name="section"></a>', '<a href="">Label</a>', '<a href>Label</a>',
    '<a href="/about"> \r\n\t </a>', '<a href="/about" class="a-link">Label</a>',
    '<a class="other" href="/about">Label</a>', '<a class="" href="/about">Label</a>',
    '<a href="/about"><strong>Authored label</strong></a>',
    '<a href="/about"><span class="a-link__icon" aria-hidden="true"> </span>Label</a>',
    '<a href="/about"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg>Label</a>',
    anchor + anchor, `<p>${anchor}</p>`, `<footer><div class="tileLink">${anchor}</div></footer>`,
    `<!-- retained -->${anchor}`, `text${anchor}`, `${anchor}text`,
    '<a href="/about" href="/other">Label</a>', '<a href="/about" =bad>Label</a>',
    '<a href="/about"/>Label</a>', '<a href="/about">Label', '<a href="/about">Label</span>',
    '<a href="/about"><a href="/other">Nested</a></a>',
    ...['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes',
      'noscript', 'plaintext', 'template', 'listing'].map(tag => `<${tag}>${anchor}</${tag}>`),
  ];
  for (const value of unchanged) {
    const field = freeze(bodyField(value)); assert.equal(bodyArrowLinkGlyphs(field, false), field, value);
  }
  for (const field of [undefined, bodyField(''), bodyField('   '), { value: undefined }, { value: 7 }]) {
    assert.equal(bodyArrowLinkGlyphs(field, false), field);
  }
});

test('quoted attributes, authored text and unrelated destinations are preserved without identity inference', () => {
  const values = [
    ` \r\n<A HREF='/other?one>two' data-note='class="a-link" <span>' TARGET=_blank REL=author> Different &amp; authored text </A >\t`,
    '<a href="https://example.test/different" target="_self" aria-label="Different label">Different label</a>',
  ];
  for (const value of values) {
    const field = freeze(bodyField(value)), projected = bodyArrowLinkGlyphs(field, false);
    assert.notEqual(projected, field); assert.equal(projected.metadata, field.metadata);
    assert.equal(svgTags(projected.value).length, 1); assert.equal(removePresentation(projected.value), value);
    assert.equal(field.value, value);
  }
});

test('the existing link safety policy remains identical to Default', () => {
  const data = fixture();
  data.body = { jsonValue: bodyField('<a href="javascript:alert(1)" target="_blank" rel="author"> Authored link </a>') };
  data.primaryLink.jsonValue.value.href = 'javascript:alert(1)'; freeze(data);
  const before = JSON.stringify(data), html = renderSDK(Components.BodyArrowLinks, data);
  assert.equal(removePresentation(html), renderSDK(Components.Default, data));
  assert.match(html, /href="#service-unavailable"/, 'The existing primary General Link policy remains applied');
  assert.equal(removePresentation(renderSDK(Components.BodyArrowLinks, data, params(), 'editing')), renderSDK(Components.Default, data, params(), 'editing'));
  assert.equal(JSON.stringify(data), before);
});

test('Default and BodyDownloadLinks keep their prior behavior without the arrow opt-in', () => {
  const data = fixture({ iconState: 'missing' }); data.body = { jsonValue: bodyField('<a href="/about"> Authored link </a>') }; freeze(data);
  for (const mode of ['normal', 'preview', 'editing']) for (const layout of ['plain', 'rich-text', 'disclosures']) {
    const input = params({ layout });
    assert.equal(renderSDK(Components.Default, data, input, mode), renderSDK(Baseline.Default, data, input, mode));
    assert.equal(renderSDK(Components.BodyDownloadLinks, data, input, mode), renderSDK(Components.Default, data, input, mode));
  }
  assert.equal(renderSDK(Components.BodyArrowLinks, undefined), renderSDK(Components.Default, undefined));
});
