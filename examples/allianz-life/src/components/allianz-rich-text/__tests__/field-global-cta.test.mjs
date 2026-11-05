import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, filename, field, fixture, freeze, params, renderSDK, metadata, attribute } from './optional-icons-fixture.mjs';

// Public marketing values, with explicitly synthetic SDK metadata. This is the
// proposed two-field content contract, not a captured saved native Link DTO.
const OWNER = 'D1DF6FA9-4906-41B8-8888-C176F8DA3926';
const LABEL = 'Learn about all eight stadiums';
const ORIGINAL_BODY = '<span id="global"></span><p>Allianz Field® is just one of eight Allianz® stadiums around the world. But ours may boast the coldest game-day temperature (3 degrees Fahrenheit at the USMNT World Cup Qualifier on February 1, 2022).</p><p><a href="#demo-unavailable">Learn about all eight stadiums</a></p>';
const CTA_PARAGRAPH = '<p><a href="#demo-unavailable">Learn about all eight stadiums</a></p>';
const INTENDED_BODY = ORIGINAL_BODY.slice(0, -CTA_PARAGRAPH.length);
const source = fs.readFileSync(filename, 'utf8');
const components = compile(source);
const modes = ['normal', 'preview', 'editing'];
const data = (href = '#', text = LABEL) => {
  const result = fixture({ owner: OWNER, iconState: 'cleared' });
  result.heading = field(OWNER, 'heading', 'Meet our global family of stadiums');
  result.subheading = field(OWNER, 'subheading', '', 'Rich Text');
  result.body = field(OWNER, 'body', INTENDED_BODY, 'Rich Text');
  result.primaryLink = field(OWNER, 'primaryLink', { href, text, target: '_blank', linktype: 'external' }, 'General Link');
  return result;
};
const links = html => [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
const arrowCount = html => (html.match(/class="a-link__icon" aria-hidden="true"/g) ?? []).length;

test('Global CTA models the source footer with the actual SDK Link field in all three modes', () => {
  assert.equal(ORIGINAL_BODY.length, 301);
  assert.equal(CTA_PARAGRAPH.length, 69);
  assert.equal(INTENDED_BODY.length, 232);
  for (const mode of modes) {
    const native = freeze(data()), before = JSON.stringify(native), observed = [];
    const html = renderSDK(compile(source, { observe: observed }).FieldGlobalStadiumsIntroduction, native, params(), mode);
    assert.ok(html.includes(INTENDED_BODY));
    assert.match(html, /<footer><div class="tileLink">/);
    assert.equal(arrowCount(html), 1);
    assert.match(html, /<span class="a-link__icon" aria-hidden="true"><svg aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">/);
    assert.ok(html.includes(`<span class="a-link__text">${LABEL}</span>`));
    assert.equal((html.match(/Learn about all eight stadiums/g) ?? []).length, 1);
    assert.equal(attribute(links(html).at(-1), 'href'), '#');
    assert.equal(attribute(links(html).at(-1), 'target'), mode === 'editing' ? '_blank' : '', 'literal # keeps the existing visitor target policy');
    assert.equal(native.primaryLink.jsonValue.value.target, '_blank', 'authored target is not mutated');
    const link = observed.find(call => call.name === 'Link');
    assert.equal(link.editable, mode === 'editing');
    assert.equal(link.field.metadata, native.primaryLink.jsonValue.metadata);
    if (mode === 'editing') assert.equal(link.field, native.primaryLink.jsonValue);
    assert.equal(observed.find(call => call.name === 'RichText').field, native.body.jsonValue);
    assert.equal(JSON.stringify(native), before);
  }
});

test('source Right geometry is exact and decorative, without duplicate SVG IDs or a fake field', () => {
  const native = freeze(data()), observed = [];
  const html = renderSDK(compile(source, { observe: observed }).FieldGlobalStadiumsIntroduction, native);
  const svg = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)?.[0];
  const path = svg?.match(/<path[^>]*\bd="([^"]*)"/)?.[1];
  assert.equal(path.length, 754);
  assert.equal(createHash('sha256').update(path).digest('hex'), '7124b4cce7e1ad3e5f42d521958e5d613be46f97f9507b9b539710031d97e870');
  assert.match(svg, /fill-rule="evenodd"/);
  assert.doesNotMatch(svg, /<title|<desc|\bid=|aria-labelledby|tabindex/);
  assert.equal(observed.filter(call => call.name === 'Link').length, 1);
  assert.equal(observed.filter(call => call.name === 'Text').length, 1, 'CTA text is part of Link, not a manufactured Text field');
  assert.equal(observed.filter(call => call.name === 'Image').length, 0, 'fixed UI glyph is not a counterfeit Image field');
});

test('Heading, shortened Body and existing PrimaryLink retain their original editing owner once', () => {
  const native = freeze(data()), observed = [];
  const html = renderSDK(compile(source, { observe: observed }).FieldGlobalStadiumsIntroduction, native, params(), 'editing');
  const chrome = metadata(html);
  for (const name of ['heading', 'body', 'primaryLink']) {
    assert.equal(chrome.filter(entry => entry.itemId === OWNER && entry.fieldId === `fixture-${name}`).length, 1, name);
  }
  assert.equal(observed.find(call => call.name === 'Link').field, native.primaryLink.jsonValue);
  assert.equal(observed.find(call => call.name === 'RichText').field, native.body.jsonValue);
});

test('existing unsplit Body plus empty PrimaryLink stays intact and gets no duplicated CTA', () => {
  for (const mode of modes) {
    const native = data();
    native.body = field(OWNER, 'body', ORIGINAL_BODY, 'Rich Text');
    native.primaryLink = field(OWNER, 'primaryLink', { href: '' }, 'General Link');
    freeze(native);
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, native, params(), mode);
    assert.ok(html.includes(ORIGINAL_BODY));
    assert.equal(arrowCount(html), 0);
    assert.equal((html.match(/Learn about all eight stadiums/g) ?? []).length, 1);
    assert.doesNotMatch(html, /<footer>/);
  }
});

test('other Field and existing Default presentations do not opt into the Global arrow', () => {
  for (const name of ['FieldEventsIntroduction', 'FieldAboutIntroduction', 'Default', 'BrandIcon']) for (const mode of modes) {
    const native = freeze(data());
    const html = renderSDK(components[name], native, params(), mode, { presentation: 'global-stadiums', globalCtaText: LABEL });
    assert.equal(arrowCount(html), 0, name);
    assert.ok(html.includes(LABEL));
  }
});

test('cleared native links remain absent and missing link labels receive no invented text or arrow', () => {
  for (const make of [
    native => { delete native.primaryLink; },
    native => { native.primaryLink = undefined; },
    native => { native.primaryLink = { jsonValue: undefined }; },
    native => { native.primaryLink.jsonValue.value = undefined; },
    native => { native.primaryLink.jsonValue.value = {}; },
    native => { native.primaryLink.jsonValue.value.href = ''; },
    native => { native.primaryLink.jsonValue.value.href = null; },
  ]) for (const mode of modes) {
    const native = data(); make(native); freeze(native);
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, native, params(), mode);
    assert.equal(arrowCount(html), 0);
    assert.equal(links(html).length, 0);
    assert.doesNotMatch(html, /<footer>/);
  }
  for (const text of ['', '  ', undefined, null, false, 0]) for (const mode of modes) {
    const native = data('/about');
    native.primaryLink.jsonValue.value.text = text;
    freeze(native);
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, native, params(), mode);
    assert.equal(arrowCount(html), 0);
    assert.ok(!html.includes('>Learn about all eight stadiums<'));
  }
});

test('visitor URL rejection stays unchanged while exact typed http://# uses ordinary hash policy', () => {
  for (const href of ['http://#', 'javascript:alert(1)', 'data:text/html,no', '//unregistered.example/escape',
    'https://unregistered.example/escape', '/Login', '#demo-unavailable']) for (const mode of ['normal', 'preview']) {
    const native = freeze(data(href)), before = JSON.stringify(native);
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, native, params(), mode);
    const link = links(html).at(-1);
    assert.ok(['#', '#service-unavailable'].includes(attribute(link, 'href')), href);
    assert.notEqual(attribute(link, 'target'), '_blank');
    assert.equal(JSON.stringify(native), before);
  }
  for (const mode of ['normal', 'preview']) {
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, freeze(data('http://#')), params(), mode);
    assert.equal(attribute(links(html).at(-1), 'href'), '#', 'combined candidate explicitly includes only the typed formatter repair');
  }
});

test('original Link values and all targets remain verbatim in Editing mode', () => {
  for (const href of ['#', '/about', 'http://#', '#demo-unavailable']) {
    const native = freeze(data(href)), observed = [];
    renderSDK(compile(source, { observe: observed }).FieldGlobalStadiumsIntroduction, native, params(), 'editing');
    const link = observed.find(call => call.name === 'Link');
    assert.equal(link.field, native.primaryLink.jsonValue);
    assert.equal(link.field.value.target, '_blank');
  }
});

test('datasource absence retains the existing explicit fallback and no arrow', () => {
  for (const mode of modes) {
    const html = renderSDK(components.FieldGlobalStadiumsIntroduction, undefined, params(), mode);
    assert.match(html, /AllianzRichText/);
    assert.equal(arrowCount(html), 0);
  }
});


test('malformed native Link shapes retain the existing Default SDK/policy outcome', () => {
  const assigners = [
    native => { native.primaryLink = false; },
    native => { native.primaryLink = []; },
    native => { native.primaryLink.jsonValue = false; },
    native => { native.primaryLink.jsonValue.value = false; },
    native => { native.primaryLink.jsonValue.value = []; },
    ...[false, 0, 42, {}, []].map(href => native => { native.primaryLink.jsonValue.value.href = href; }),
    ...[{}, []].map(text => native => { native.primaryLink.jsonValue.value.text = text; }),
  ];
  const outcome = (Component, native, mode) => {
    try {
      const html = renderSDK(Component, native, params(), mode);
      const link = links(html).at(-1);
      return { kind: 'rendered', href: link ? attribute(link, 'href') : null,
        target: link ? attribute(link, 'target') : null };
    } catch (error) { return { kind: 'existing-runtime-error', name: error.name }; }
  };
  for (const assign of assigners) for (const mode of modes) {
    const native = data(); assign(native); freeze(native);
    const before = JSON.stringify(native);
    assert.deepEqual(outcome(components.FieldGlobalStadiumsIntroduction, native, mode),
      outcome(components.Default, native, mode));
    assert.equal(JSON.stringify(native), before);
  }
});
