import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { component, contract, decode, editingIds, field } from '../../company-hero/__tests__/runtime.mjs';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { LegacyNewYorkVideo } = component('allianz-video', 'AllianzVideo');
const { brightcoveEmbedSource } = contract('allianz-video');
const player = 'https://players.brightcove.net/1537381467001/Hklewedz2G_default/index.html';
const videoId = '6359769793112';
const canonical = `${player}?videoId=${videoId}&preload=none`;
const title = 'Index Advantage+ New York® Annuity Video';
const source = value => brightcoveEmbedSource({ value });
const media = value => field('ny-media', 'General Link', value);
const iframeSource = html => decode(/<iframe[^>]*\bsrc="([^"]+)"/.exec(html)?.[1] || '');
const stripMetadata = html => html.replace(/<code\b[^>]*>.*?<\/code>/gs, '');
const render = (data, mode = 'normal') => renderToStaticMarkup(React.createElement(SitecoreProvider, {
  page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
    siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'video', fields: {}, placeholders: {} } } } },
  api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
}, React.createElement(LegacyNewYorkVideo, { params: { RenderingIdentifier: 'ny-video' },
  fields: data === undefined ? undefined : { data: { datasource: data } } })));

test('only the verified additional player/video pair is accepted, including native split query values', () => {
  const accepted = [
    { href: `${player}?videoId=${videoId}` },
    { href: player, querystring: `videoId=${videoId}` },
    { href: player, querystring: `?videoId=${videoId}` },
    { href: `${player}?videoId=${videoId}`, querystring: `videoId=${videoId}` },
    { href: `${player}?videoId=${videoId}&videoId=${videoId}` },
    { href: `${player}?videoId=${videoId}&autoplay=false&loop&muted&preload=auto&playlistId=1&referrer=https://unsafe.example&redirect=https://unsafe.example` },
  ];
  for (const value of accepted) {
    const before = JSON.stringify(value);
    assert.equal(source(value), canonical);
    assert.equal(JSON.stringify(value), before);
  }
  assert.equal(source({ href: player.replace('Hklewedz2G', 'WioKPWt4t'), querystring: 'videoId=6372330074112' }),
    'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html?videoId=6372330074112&preload=none');
});

const rejected = [
  undefined, {}, { href: '' }, { href: '/allianz-assets/video.mp4' },
  { href: `${player}?videoId=6359769793113` },
  { href: `${player}?videoId=6372330074112` },
  { href: `${player}?videoId=${videoId}&videoId=6372330074112` },
  { href: `${player}?videoId=${videoId}`, querystring: 'videoId=6372330074112' },
  { href: `${player}?videoId=0` }, { href: `${player}?videoId=06359769793112` },
  { href: `${player}?videoId=ref:example` }, { href: `${player}?videoId=${videoId}#fragment` },
  { href: `${player}?videoID=${videoId}` }, { href: `${player}?playlistId=${videoId}` },
  { href: `${player.replace('https:', 'http:')}?videoId=${videoId}` },
  { href: `${player.replace('players.brightcove.net', 'players.brightcove.net.unsafe.example')}?videoId=${videoId}` },
  { href: `${player.replace('https://', 'https://user:password@')}?videoId=${videoId}` },
  { href: `${player.replace('1537381467001', '1537381467002')}?videoId=${videoId}` },
  { href: `${player.replace('Hklewedz2G', 'hklewedz2g')}?videoId=${videoId}` },
  { href: `${player.replace('Hklewedz2G', 'unverified')}?videoId=${videoId}` },
  { href: `${player.replace('/index.html', '/index.html/extra')}?videoId=${videoId}` },
  { href: `${player.replace('_default/', '_other/')}?videoId=${videoId}` },
  { href: `//players.brightcove.net/1537381467001/Hklewedz2G_default/index.html?videoId=${videoId}` },
  { href: 'javascript:alert(1)' }, { href: 'data:text/html,<script>alert(1)</script>' },
];

test('new player rejects wrong records and preserves all existing origin/path/ID rejection controls', () => {
  for (const value of rejected) assert.equal(source(value), '', JSON.stringify(value));
});

for (const mode of ['normal', 'preview', 'editing']) {
  test(`legacy ${mode}: exact source shell, contained iframe and separate text ownership`, () => {
    const data = {
      mediaLink: media({ href: player, querystring: `videoId=${videoId}&autoplay&loop&preload=auto`, text: title }),
      heading: field('separate-heading', 'Single-Line Text', 'Existing separate H1'),
      body: field('separate-body', 'Rich Text', '<p>Existing introduction</p>'),
      transcript: field('separate-transcript', 'Rich Text', '<p>Existing transcript</p>'),
      caption: field('unused-caption', 'Rich Text', '<p>Not in the source video wrapper</p>'),
    };
    const before = JSON.stringify(data);
    const html = render(data, mode);
    assert.equal(iframeSource(html), canonical);
    assert.match(html, /<article class="video-block allianz-legacy-new-york-video" id="ny-video"><div class="video-block-content"><div class="bc-video-player"><div class="bc-video-player-inner">/);
    assert.equal((html.match(/<iframe\b/g) || []).length, 1);
    assert.match(html, /title="Index Advantage\+ New York® Annuity Video"/);
    assert.match(html, /width="640" height="360" loading="lazy" allowFullScreen=""/i);
    assert.match(html, /allow="autoplay &#x27;none&#x27;; encrypted-media; fullscreen"/);
    assert.match(html, /sandbox="allow-scripts allow-same-origin"/);
    assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/i);
    assert.doesNotMatch(html, /allianz-local-video|allianz-editorial|<h[1-6]\b|<details\b|<script\b|allow-forms|allow-popups|allow-top-navigation|Existing introduction|Existing transcript|Not in the source/);
    assert.deepEqual(editingIds(html), mode === 'editing' ? ['ny-media'] : []);
    assert.equal(stripMetadata(html), render(data));
    assert.equal(JSON.stringify(data), before);
  });

  test(`legacy ${mode}: missing/cleared/invalid media retains the safe placeholder`, () => {
    for (const value of rejected) {
      const html = render(value === undefined ? {} : { mediaLink: media(value) }, mode);
      assert.doesNotMatch(html, /<iframe\b|<script\b|<video\b/);
      assert.match(html, /video-placeholder\.svg/);
    }
    assert.match(render(undefined, mode), /Add a datasource for AllianzVideo/);
    assert.doesNotMatch(render(undefined, mode), /<iframe\b|video-placeholder\.svg/);
  });
}

test('new CSS scopes the iframe to the legacy source shell without changing existing variant sizes', () => {
  const css = fs.readFileSync(new URL('../AllianzVideo.css', import.meta.url), 'utf8');
  const rule = /\.allianz-legacy \.allianz-legacy-new-york-video \.allianz-video-player,[\s\S]*?\{([^}]+)\}/.exec(css)?.[1];
  assert.ok(rule);
  for (const declaration of ['position: absolute', 'inset: 0', 'display: block', 'width: 100%', 'height: 100%', 'border: 0']) {
    assert.ok(rule.includes(declaration), declaration);
  }
  assert.doesNotMatch(rule, /max-width|margin|padding|!important/);
  assert.match(css, /section\.allianz-local-video article\.video-block\s*\{[^}]*max-width: 640px;[^}]*margin: 64px auto;/);
});
