import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { component, render, field, wire, editingIds, sourceRoot } from '../../company-hero/__tests__/runtime.mjs';

const { SourceStatic, Default: VideoDefault } = component('allianz-video', 'AllianzVideo');
const { Transcript, FaqRow } = component('allianz-accordion', 'AllianzAccordion');
const { StrategyFootnotes, StrategyRichText } = component('legal-disclosures', 'LegalDisclosures');
const sources = JSON.parse(fs.readFileSync(new URL('./strategy-source.json', import.meta.url)));
const nativeText = (name, value) => field(name, 'Rich Text', value);
const sourceParams = (entry) => entry.role === 'video'
  ? entry.route === 'college-funding' ? { theme: 'transparent', marginBottom: 'xl' }
    : { theme: 'blue-soft', paddingBottom: 'xl' }
  : entry.role === 'transcript'
    ? entry.route === 'college-funding'
      ? { sectionWidth: 'contained', sectionSpacing: '1', theme: 'transparent', marginBottom: 'xl' }
      : entry.route === 'flexible-estate-planning-strategies'
        ? { sectionSpacing: '1', theme: 'blue-soft', marginBottom: 'xl', paddingBottom: 'xl' }
        : { theme: 'blue-soft', paddingBottom: 'xl' }
    : { theme: 'grey-muted' };

function assertSourceStructure(source, output, purpose) {
  const result = spawnSync('python3', [path.join(sourceRoot, 'components/allianz-video/__tests__/strategy-wrapper-oracle.py')], {
    input: JSON.stringify({ source, output, purpose }), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

for (const entry of sources) {
  test(`${entry.route} ${entry.role} preserves its source wrapper and native content owner`, () => {
    assert.equal(crypto.createHash('sha256').update(entry.sourceHtml).digest('hex'), entry.sourceSha256);
    const params = sourceParams(entry);
    const data = entry.role === 'transcript'
      ? { children: { results: [{ id: `${entry.route}-entry`, heading: field('transcript-heading', 'Single-Line Text', entry.fields.heading), body: nativeText('transcript-body', entry.fields.body) }] } }
      : Object.fromEntries(Object.entries(entry.fields).map(([name, value]) => [name, nativeText(name, value)]));
    const Component = entry.role === 'video' ? SourceStatic : entry.role === 'transcript' ? Transcript
      : entry.role === 'footnotes' ? StrategyFootnotes : StrategyRichText;
    const before = JSON.stringify(data);
    const html = render(Component, data, false, params);
    assertSourceStructure(entry.sourceHtml, html, entry.role);
    assert.equal(JSON.stringify(data), before);
    if (entry.role === 'video') {
      assert.equal((html.match(/src="\/allianz-ui\/video-placeholder\.svg"/g) ?? []).length, 1);
      assert.doesNotMatch(html, /<video\b|<video-js|<iframe\b|<script\b|data-video-id|data-account|transcript|<details/);
    } else if (entry.role === 'transcript') {
      // The source homepage link is a local visitor journey; all other
      // transcript bytes and the editable original remain exact.
      const visitorBody = entry.fields.body.replace('href="https://www.allianzlife.com"', 'href="/"');
      assert.ok(html.includes(visitorBody));
      assert.ok(render(Component, data, true, params).includes(entry.fields.body));
      assert.deepEqual(editingIds(render(Component, data, true, params)), ['transcript-body', 'transcript-heading']);
      assert.match(html, /aria-expanded="false"/);
      assert.match(html, /class="c-accordion__item-content" hidden=""/);
      const control = /aria-controls="([^"]+)"/.exec(html)[1];
      const trigger = /<button id="([^"]+)"/.exec(html)[1];
      assert.ok(html.includes(`id="${control}" role="region" aria-labelledby="${trigger}"`));
      const editing = render(Component, data, true, params);
      assert.match(editing, /aria-expanded="false"/);
      assert.match(editing, / hidden=""/);
      assert.equal((editing.match(/kind="open"/g) ?? []).length, 2);
    } else {
      assert.ok(html.includes(entry.fields.body));
      assert.doesNotMatch(html, /a-axlDisclosures|allianz-newsroom-grey|allianz-newsroom-grey-trailing/);
      assert.deepEqual(editingIds(render(Component, data, true, params)), ['body']);
      assert.equal(render(Component, wire(data), false, params), html);
    }
  });
}

test('SourceStatic omits cleared native copy from the canvas and preserves unused media values without playback or a duplicate transcript', () => {
  const data = { heading: nativeText('heading', ''), body: nativeText('body', ''),
    caption: nativeText('caption', ''), poster: field('poster', 'Image', { src: '' }),
    mediaLink: field('mediaLink', 'General Link', { href: '' }), transcript: nativeText('forbidden-duplicate', '<p>Separate owner</p>'),
    localVideo: { jsonValue: { value: { src: '/allianz-assets/clip.mp4' } } } };
  const before = JSON.stringify(data);
  const html = render(SourceStatic, data);
  const editing = render(SourceStatic, data, true);
  assert.doesNotMatch(html, /Separate owner|<video\b|<iframe\b|clip\.mp4|<a\b/);
  assert.deepEqual(editingIds(editing), []);
  assert.doesNotMatch(editing, /\[No text in field\]|scEmptyImage/);
  assert.doesNotMatch(editing, /Separate owner|forbidden-duplicate|<video\b|<iframe\b|clip\.mp4|<a\b|allianz-source-static-video-fields/);
  assert.equal(JSON.stringify(data), before);
  assert.match(render(SourceStatic, undefined), /Add a datasource for AllianzVideo/);
  const css = fs.readFileSync(new URL('../AllianzVideo.css', import.meta.url), 'utf8');
  assert.match(css, /\.allianz-source-static-video \{\s*width: 100%;\s*max-width: 640px;/);
  assert.match(css, /\.allianz-source-static-video \.allianz-video-placeholder \{[^}]*aspect-ratio: 16 \/ 9;/);
});

test('Transcript omits datasource clears from the canvas and preserves source child order, including repeated item IDs', () => {
  const data = { heading: nativeText('root-heading', ''), primaryLink: field('root-link', 'General Link', { href: '' }),
    children: { results: ['First', 'Second'].map((text) => ({ id: 'repeated-native-id',
      heading: field(`${text}-heading`, 'Single-Line Text', text), body: nativeText(`${text}-body`, `<p>${text} body</p>`) })) } };
  const before = JSON.stringify(data);
  const html = render(Transcript, data);
  assert.ok(html.indexOf('First body') < html.indexOf('Second body'));
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(controls).size, 2);
  assert.deepEqual(editingIds(render(Transcript, data, true)), ['First-body', 'First-heading', 'Second-body', 'Second-heading']);
  assert.equal(JSON.stringify(data), before);
  assert.match(render(Transcript, undefined), /Add a datasource for AllianzAccordion/);
});

test('new exports have explicit shell ownership and finite wrapper parameters', () => {
  const body = { body: nativeText('body', '<p>One source body</p>') };
  for (const Component of [StrategyFootnotes, StrategyRichText]) {
    const section = render(Component, body, false, { theme: 'grey-muted', RenderingIdentifier: 'one-owner' });
    assert.equal((section.match(/id="one-owner"/g) ?? []).length, 1);
    const row = render(Component, body, false, { container: 'row', RenderingIdentifier: 'one-owner' });
    assert.match(row, /^<div class="l-grid__row /);
    assert.doesNotMatch(row, /l-container|axlTileCollection/);
    const content = render(Component, body, false, { container: 'content' });
    assert.doesNotMatch(content, /l-grid|l-container|axlTileCollection/);
    const invalid = render(Component, body, false, { theme: 'evil-class', marginBottom: 'evil-class' });
    assert.match(invalid, /t-bg-transparent/);
    assert.doesNotMatch(invalid, /evil-class/);
    const cleared = { body: nativeText('body', ''), fieldCollection: wire(body).fieldCollection };
    assert.doesNotMatch(render(Component, cleared), /One source body/);
    assert.deepEqual(editingIds(render(Component, cleared, true)), []);
    assert.doesNotMatch(render(Component, cleared, true), /\[No text in field\]/);
    assert.match(render(Component, undefined), /Add a datasource for Legal Disclosures/);
  }
  assert.doesNotMatch(render(SourceStatic, {}, false, { container: 'row' }), /l-container|axlTileCollection/);
  assert.doesNotMatch(render(Transcript, {}, false, { container: 'content' }), /axlTileCollection|l-container/);
});

test('existing Video Default and FaqRow retain their established wrappers and transcript behavior', () => {
  const video = render(VideoDefault, { transcript: nativeText('old-transcript', '<p>Existing transcript</p>') });
  assert.match(video, /<section class="allianz-local-video"/);
  assert.match(video, /allianz-local-video-transcript/);
  assert.match(video, /Existing transcript/);
  assert.doesNotMatch(video, /allianz-source-static-video|axlTileCollection/);
  const faq = render(FaqRow, {}, false, { paddingBottom: 'xl', theme: 'blue-soft' });
  assert.match(faq, /^<div class="l-grid__row u-margin-bottom-xl"/);
  assert.doesNotMatch(faq, /t-bg-blue-soft|u-padding-bottom-xl/);
});
