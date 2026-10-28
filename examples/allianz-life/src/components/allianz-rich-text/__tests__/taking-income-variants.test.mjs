import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { component, decode, editingIds, field, render } from '../../company-hero/__tests__/runtime.mjs';

const RTE = component('allianz-rich-text', 'AllianzRichText');
const Video = component('allianz-video', 'AllianzVideo');
const source = JSON.parse(fs.readFileSync(new URL('./taking-income.source.fixture.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const player = 'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html?videoId=6337210801112';
const staleParams = { RenderingIdentifier: 'test-taking-section', theme: 'red-soft', layout: 'disclosures',
  headingLevel: 'h6', alignment: 'left', paddingTop: 'xl', paddingBottom: 'xl', marginBottom: 'xl' };
const stripMetadata = html => html.replace(/<code\b[^>]*>.*?<\/code>/gs, '');
const forbid = (data, names) => {
  for (const name of names) Object.defineProperty(data, name, { get() { throw new Error(`Unused ${name} accessed`); } });
  return data;
};
const heading = value => field('taking-heading', 'Single-Line Text', value);
const body = value => field('taking-body', 'Rich Text', value);
const renderMode = (Component, data, mode, params = staleParams) => renderToStaticMarkup(React.createElement(SitecoreProvider, {
  page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
    siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Taking source fixture', fields: {}, placeholders: {} } } } },
  api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
}, React.createElement(Component, { params, fields: data === undefined ? undefined : { data: { datasource: data } } })));

test('Taking video introduction retains source Video Camera geometry, heading owner and empty source header', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const data = forbid({ heading: heading(source.videoIntroductionHeading) }, ['body', 'subheading', 'icon', 'primaryLink']);
    const original = data.heading.jsonValue;
    const html = renderMode(RTE.TakingIncomeVideoIntroduction, data, mode);
    assert.match(html, /m-axlTile match-height -is--stacked t-bg-transparent/);
    assert.match(html, /<header><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header>/);
    assert.match(stripMetadata(html), /<div class="tileBody u-font-size-md"><h2>Watch the video to learn how income is determined<\/h2><\/div>/);
    assert.ok(html.includes(`d="${source.svgPaths.video}"`));
    assert.match(html, /<title[^>]*>Video Camera<\/title>/);
    assert.match(html, /<svg[^>]*role="img"[^>]*focusable="false"/);
    assert.doesNotMatch(html, /Light Bulb|<img\b|a-axlDisclosures|t-bg-red-soft|u-font-size-xl|<h6/);
    assert.equal(data.heading.jsonValue, original);
    assert.deepEqual(editingIds(html), mode === 'editing' ? ['taking-heading'] : []);
  }
});

test('Taking resources keep both source cards and five separately wrapped original links in one native Body', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const data = forbid({ heading: heading(source.resourcesHeading), body: body(source.resourcesBody) }, ['subheading', 'icon', 'primaryLink']);
    const before = JSON.stringify(data);
    const html = renderMode(RTE.TakingIncomeResources, data, mode);
    assert.match(html, /^<div class="l-container--full-width t-bg-green-soft axlTileCollection" id="test-taking-section">/);
    assert.match(html, /tileIcon t-bg-purple-bright t-icon-primary-white/);
    assert.ok(html.includes(`d="${source.svgPaths.info}"`));
    assert.match(html, /<title[^>]*>Information<\/title>/);
    assert.match(stripMetadata(html), /class="l-grid__row match-height-row u-padding-bottom-xl">\s*<div class="l-grid__column-medium-6">/);
    assert.ok(html.includes(source.resourcesBody), 'Complete native Body remains unchanged, including both source card wrappers');
    assert.equal((html.match(/class="l-grid__column-medium-6"/g) ?? []).length, 2);
    assert.equal((html.match(/class="tileLink"/g) ?? []).length, 5);
    assert.equal((html.match(/<a\b/g) ?? []).length, 5);
    for (const { href, target, label } of source.links) {
      assert.ok(html.includes(`href="${href}" target="${target}" aria-label="${label}"`));
    }
    assert.doesNotMatch(html, /Light Bulb|<img\b|target="_blank"|a-axlDisclosures|u-font-size-xl/);
    assert.equal(JSON.stringify(data), before);
    assert.deepEqual(editingIds(html), mode === 'editing' ? ['taking-body', 'taking-heading'] : []);
  }
});

test('Taking Rich Text native edits stay in the same fields and cleared fields add no empty canvas controls', () => {
  for (const name of ['TakingIncomeVideoIntroduction', 'TakingIncomeResources']) {
    const data = { heading: heading('Edited native heading'), body: body('<p>Edited native body.</p>') };
    const html = renderMode(RTE[name], data, 'editing');
    assert.match(html, /Edited native heading/);
    if (name === 'TakingIncomeResources') assert.match(html, /Edited native body\./);
    else assert.doesNotMatch(html, /Edited native body/);
    const blank = { heading: heading(''), body: body('') };
    for (const mode of ['normal', 'preview', 'editing']) {
      assert.deepEqual(editingIds(renderMode(RTE[name], blank, mode)), []);
      assert.deepEqual(editingIds(renderMode(RTE[name], {}, mode)), []);
      const missing = renderMode(RTE[name], undefined, mode);
      assert.match(missing, /Add a datasource for AllianzRichText/);
      assert.doesNotMatch(missing, /<svg\b|<h2\b/);
    }
    assert.doesNotMatch(renderMode(RTE[name], blank, 'editing'), /\[No text in field\]|scEmptyImage/);
  }
  const resourceBodyOnly = renderMode(RTE.TakingIncomeResources, { heading: heading(''), body: body(source.resourcesBody) }, 'editing');
  assert.deepEqual(editingIds(resourceBodyOnly), ['taking-body']);
  assert.equal((resourceBodyOnly.match(/class="tileLink"/g) ?? []).length, 5);
});

test('Source SVG labels are associated with unique non-focusable icon instances', () => {
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(SitecoreProvider, { page: { mode: { isEditing: false, isNormal: true },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { fields: {}, placeholders: {} } } } },
      api: {}, componentMap: new Map(), loadImportMap: async () => ({}) },
    ...[RTE.TakingIncomeVideoIntroduction, RTE.TakingIncomeResources].map((Component, index) =>
      React.createElement(Component, { key: index, params: {}, fields: { data: { datasource: { heading: heading('Native source heading') } } } })))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  assert.equal((html.match(/focusable="false"/g) ?? []).length, 2);
});

test('Taking player-only variant preserves the exact approved native player and separate transcript ownership', () => {
  for (const mode of ['normal', 'preview', 'editing']) {
    const data = forbid({ mediaLink: field('taking-media', 'General Link', {
      href: player, linktype: 'external', text: 'Beginning guaranteed lifetime income',
    }) }, ['heading', 'body', 'poster', 'localVideo', 'caption', 'transcript']);
    const before = JSON.stringify(data);
    const html = renderMode(Video.TakingIncomeVideo, data, mode);
    assert.match(html, /class="l-grid__row"><div class="l-grid__column-medium-12">/);
    assert.match(stripMetadata(html), /class="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video"><iframe/);
    assert.equal(decode(/<iframe[^>]*src="([^"]+)"/.exec(html)?.[1] ?? ''), `${player}&preload=none`);
    assert.match(html, /title="Beginning guaranteed lifetime income"/);
    assert.match(html, /allow="autoplay &#x27;none&#x27;; encrypted-media; fullscreen"/);
    assert.match(html, /sandbox="allow-scripts allow-same-origin"/);
    assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/i);
    assert.equal((html.match(/<iframe\b/g) ?? []).length, 1);
    assert.doesNotMatch(html, /Light Bulb|<h[1-6]\b|tileIcon|<details\b|<script\b|video-placeholder|allianz-aa-plus-product-video|allow-forms|allow-popups|allow-top-navigation/);
    assert.deepEqual(editingIds(html), mode === 'editing' ? ['taking-media'] : []);
    assert.equal(JSON.stringify(data), before);
  }
});

test('Cleared and unapproved Taking media links remove the public player without inventing a placeholder', () => {
  for (const value of [undefined, {}, { href: '' }, { href: 'javascript:alert(1)' },
    { href: player.replace('players.brightcove.net', 'players.brightcove.net.unsafe.example') },
    { href: `${player}&videoId=6337210801113` }]) {
    const data = value === undefined ? {} : { mediaLink: field('taking-media', 'General Link', value) };
    for (const mode of ['normal', 'preview', 'editing']) {
      const html = renderMode(Video.TakingIncomeVideo, data, mode);
      assert.doesNotMatch(html, /<iframe\b|<img\b|<script\b|Light Bulb|video-placeholder/);
      assert.deepEqual(editingIds(html), []);
    }
  }
  for (const mode of ['normal', 'preview', 'editing']) assert.match(renderMode(Video.TakingIncomeVideo, undefined, mode), /Add a datasource for AllianzVideo/);
});

test('Resource block spacing uses the existing source tile rules, with no broad CSS override', () => {
  const css = fs.readFileSync(new URL('../../../assets/allianz-source.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.m-axlTile footer .tileLink+.tileLink{margin:16px 0 0}'));
  assert.ok(css.includes('.t-bg-purple-bright{background-color:#503368!important}'));
  assert.ok(source.resourcesBody.includes('<footer>'));
  assert.equal((source.resourcesBody.match(/<svg\b[^>]*aria-hidden="true"/g) ?? []).length, 5);
  assert.equal((source.resourcesBody.match(/<svg\b[^>]*focusable="false"/g) ?? []).length, 5);
  assert.doesNotMatch(source.resourcesBody, /titleIconArrowRight|descIconArrowRight/);
});

test('Existing AA Plus retains its own Light Bulb while the Taking variant stays isolated', () => {
  const data = { mediaLink: field('media', 'General Link', { href: player, text: 'Source video' }) };
  assert.match(render(Video.AAPlusProductVideo, data), /<title[^>]*>Light Bulb<\/title>/);
  assert.doesNotMatch(render(Video.TakingIncomeVideo, data), /Light Bulb|<svg\b/);
});
