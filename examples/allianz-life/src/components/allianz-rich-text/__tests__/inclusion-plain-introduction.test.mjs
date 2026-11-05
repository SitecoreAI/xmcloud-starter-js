import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { attribute, compile, field, filename, fixture, freeze, imageTags, LIST_URL,
  metadata, params, renderSDK, sourceRoot } from './optional-icons-fixture.mjs';

const source = fs.readFileSync(filename, 'utf8');
const Components = compile(source);
const modes = ['normal', 'preview', 'editing'];
const LOVE = '/allianz-ui/life-faq/love.svg';
const OWNER = '58981B40-C59D-4670-87EB-B12E9BC87F38';
// Source-shaped public presentation with explicitly synthetic SDK metadata.
const sourceFields = (iconState = 'cleared') => {
  const data = fixture({ owner: OWNER, iconState });
  data.heading = field(OWNER, 'heading', 'Source-shaped inclusion heading');
  data.subheading = field(OWNER, 'subheading', '', 'Rich Text');
  data.body = field(OWNER, 'body', '<p>Complete source-shaped inclusion paragraph.</p>', 'Rich Text');
  data.primaryLink = field(OWNER, 'primaryLink', { href: '' }, 'General Link');
  return data;
};
const input = (overrides = {}) => params({ layout: 'plain', paddingTop: 'lg',
  paddingBottom: 'none', marginBottom: 'lg', ...overrides });
const stripLove = (html) => html.replace(new RegExp(`<link rel="preload" as="image" href="${LOVE}"/>`), '')
  .replace(/<div class="tileIcon[^"\n]*" data-allianz-rich-text-icon="gray"><img[^>]*src="\/allianz-ui\/life-faq\/love\.svg"[^>]*\/><\/div>/, '');

test('source Love presentation is explicit, accessible and plain in Normal, Preview and Editing', () => {
  for (const mode of modes) {
    const data = freeze(sourceFields()), before = JSON.stringify(data);
    const html = renderSDK(Components.InclusionPlainIntroduction, data, input(), mode);
    const images = imageTags(html);
    assert.equal(images.length, 1);
    assert.equal(attribute(images[0], 'src'), LOVE);
    assert.equal(attribute(images[0], 'alt'), 'Love');
    assert.doesNotMatch(images[0], /aria-hidden|tabindex|role="presentation"|data-sc/);
    assert.match(html, /class="tileBody"/);
    assert.match(html, /class="tileSubHeading"><\/div>/);
    assert.doesNotMatch(html, /u-font-size-xl|<svg\b/);
    assert.ok(html.indexOf('data-allianz-rich-text-icon') < html.indexOf('<header>'));
    assert.equal(stripLove(html), renderSDK(Components.ProfessionalPlainIntroduction, data, input(), mode));
    assert.equal(JSON.stringify(data), before);
  }
});

test('missing and genuinely cleared native Icon states show the UI glyph without synthetic image fields', () => {
  for (const iconState of ['missing', 'undefined', 'undefined-json', 'undefined-value', 'cleared', 'empty-src']) {
    for (const mode of modes) {
      const calls = [], instrumented = compile(source, { observe: calls });
      const data = freeze(sourceFields(iconState));
      const html = renderSDK(instrumented.InclusionPlainIntroduction, data, input(), mode);
      assert.equal(attribute(imageTags(html)[0], 'src'), LOVE, `${iconState}/${mode}`);
      assert.equal(calls.filter(call => call.name === 'Image').length, 0);
      assert.equal(metadata(html).filter(entry => entry.fieldId === data.icon?.jsonValue?.metadata?.fieldId).length, 0);
    }
  }
});

test('populated native Icon retains its field identity, authored alt, dimensions and editing metadata', () => {
  for (const mode of modes) {
    const calls = [], instrumented = compile(source, { observe: calls });
    const data = freeze(sourceFields('filled')), before = JSON.stringify(data);
    const html = renderSDK(instrumented.InclusionPlainIntroduction, data, input(), mode);
    assert.equal(imageTags(html).length, 1);
    assert.equal(attribute(imageTags(html)[0], 'src'), LIST_URL);
    assert.equal(attribute(imageTags(html)[0], 'alt'), '');
    assert.equal(attribute(imageTags(html)[0], 'width'), '36');
    const call = calls.find(call => call.name === 'Image');
    assert.equal(call.field, data.icon.jsonValue);
    assert.equal(call.editable, mode === 'editing');
    assert.doesNotMatch(html, /life-faq\/love\.svg/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('clearing an authored Icon restores only the explicit Love presentation', () => {
  for (const mode of modes) {
    const filled = freeze(sourceFields('filled')), cleared = freeze(sourceFields('empty-src'));
    assert.equal(attribute(imageTags(renderSDK(Components.InclusionPlainIntroduction, filled, input(), mode))[0], 'src'), LIST_URL);
    assert.equal(attribute(imageTags(renderSDK(Components.InclusionPlainIntroduction, cleared, input(), mode))[0], 'src'), LOVE);
    assert.equal(imageTags(renderSDK(Components.ProfessionalPlainIntroduction, cleared, input(), mode)).length, 0);
  }
});

test('malformed populated Icon values fail closed only in the new presentation', () => {
  for (const malformed of [false, 0, 123, {}, [], ' ', '\t\n', '\u00a0']) for (const mode of modes) {
    const data = sourceFields(); data.icon.jsonValue.value.src = malformed; freeze(data);
    const calls = [], instrumented = compile(source, { observe: calls });
    const html = renderSDK(instrumented.InclusionPlainIntroduction, data, input(), mode);
    assert.equal(imageTags(html).length, 0, `${JSON.stringify(malformed)}/${mode}`);
    assert.equal(calls.filter(call => call.name === 'Image').length, 0);
    assert.ok(html.includes('Complete source-shaped inclusion paragraph.'));
  }
});

test('the two original Professional exports and Default cannot be opted into Love by authored parameters or extra props', () => {
  for (const name of ['Default', 'ProfessionalPlainIntroduction', 'ProfessionalSubheadingIntroduction']) for (const mode of modes) {
    const data = freeze(sourceFields());
    const html = renderSDK(Components[name], data, input({ sourceLoveGlyph: true, FieldNames: 'InclusionPlainIntroduction' }), mode, { sourceLoveGlyph: true });
    assert.doesNotMatch(html, /life-faq\/love\.svg/);
  }
  const html = renderSDK(Components.InclusionPlainIntroduction, sourceFields(), input(), 'normal', { sourceLoveGlyph: false, bodyInSubheading: true });
  assert.match(html, /class="tileBody"/);
  assert.equal(attribute(imageTags(html)[0], 'src'), LOVE);
});

test('native heading and Body objects each retain one original editing owner without mutation', () => {
  const calls = [], instrumented = compile(source, { observe: calls });
  const data = freeze(sourceFields()), before = JSON.stringify(data);
  const html = renderSDK(instrumented.InclusionPlainIntroduction, data, input(), 'editing');
  for (const name of ['heading', 'body']) {
    const original = data[name].jsonValue;
    assert.equal(calls.filter(call => call.field === original && call.editable === true).length, 1);
    assert.equal(metadata(html).filter(entry => entry.itemId === original.metadata.itemId && entry.fieldId === original.metadata.fieldId).length, 1);
  }
  assert.equal(metadata(html).length, 2);
  assert.equal(JSON.stringify(data), before);
});

test('cleared fields stay cleared and missing datasource retains the existing explicit fallback', () => {
  for (const mode of modes) {
    const data = sourceFields();
    for (const name of ['heading', 'body', 'subheading']) data[name].jsonValue.value = '';
    freeze(data);
    const html = renderSDK(Components.InclusionPlainIntroduction, data, input(), mode);
    assert.doesNotMatch(html, /<h2|class="tileBody"|class="a-link"/);
    assert.equal(metadata(html).length, 0);
    assert.equal(renderSDK(Components.InclusionPlainIntroduction, undefined, input(), mode),
      renderSDK(Components.ProfessionalPlainIntroduction, undefined, input(), mode));
  }
});

test('Body and link safety stay identical to the existing plain presentation', () => {
  for (const mode of modes) for (const href of ['/about', 'javascript:alert(1)', 'https://www.allianzlife.com/Login', '#details']) {
    const data = sourceFields();
    data.body.jsonValue.value = `<p>Native <strong>formatting</strong> and <a href="${href}">body link</a>.</p>`;
    data.primaryLink.jsonValue.value = { href, text: 'Native link', target: '_blank' };
    freeze(data);
    assert.equal(stripLove(renderSDK(Components.InclusionPlainIntroduction, data, input(), mode)),
      renderSDK(Components.ProfessionalPlainIntroduction, data, input(), mode));
  }
});

test('the glyph uses an existing local UI vector rather than a new DAM field or asset', () => {
  const svg = fs.readFileSync(path.resolve(sourceRoot, '../public/allianz-ui/life-faq/love.svg'), 'utf8');
  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /<title[^>]*>Love<\/title>/);
  assert.doesNotMatch(svg, /<script\b|https?:\/\/[^"\s]+\?/);
});
