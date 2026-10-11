import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { component, contract, decode, editingIds, field, render } from '../../company-hero/__tests__/runtime.mjs';

const { Default: Video, SourceStatic } = component('allianz-video', 'AllianzVideo');
const { brightcoveEmbedSource } = contract('allianz-video');
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const player = 'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html';
const ids = ['6372330074112', '6372331982112'];
const media = (value) => field('media', 'General Link', value);
const source = (value) => brightcoveEmbedSource(media(value).jsonValue);
const src = (html) => decode(/<iframe[^>]*\bsrc="([^"]+)"/.exec(html)?.[1] || '');

for (const id of ids) {
  test(`Brightcove ${id}: source URL produces a titled, contained player without autoplay`, () => {
    const data = { mediaLink: media({ href: `${player}?videoId=${id}`, text: 'Allianz Field video', linktype: 'external' }) };
    const before = JSON.stringify(data);
    const html = render(Video, data);
    assert.equal(src(html), `${player}?videoId=${id}&preload=none`);
    assert.equal((html.match(/<iframe\b/g) || []).length, 1);
    assert.match(html, /title="Allianz Field video"/);
    assert.match(html, /width="640" height="360" loading="lazy" allowFullScreen=""/i);
    assert.match(html, /allow="autoplay &#x27;none&#x27;; encrypted-media; fullscreen"/);
    assert.match(html, /sandbox="allow-scripts allow-same-origin"/);
    assert.doesNotMatch(html, /allow-forms|allow-popups|allow-top-navigation|video-placeholder|<script\b/);
    assert.equal(JSON.stringify(data), before);
  });
}

test('native General Link querystring is supported; only videoId and preload survive', () => {
  assert.equal(source({ href: player, querystring: `videoId=${ids[0]}`, linktype: 'external' }), `${player}?videoId=${ids[0]}&preload=none`);
  assert.equal(source({ href: player, querystring: `?videoId=${ids[1]}&autoplay=false&referrer=https://unsafe.example` }), `${player}?videoId=${ids[1]}&preload=none`);
  assert.equal(source({ href: `${player}?videoId=${ids[0]}&autoplay&preload=auto&loop&muted` }), `${player}?videoId=${ids[0]}&preload=none`);
  assert.equal(source({ href: `${player}?videoId=${ids[0]}`, querystring: `videoId=${ids[0]}` }), `${player}?videoId=${ids[0]}&preload=none`);
});

test('native preview mode renders playback with the same source and without editing chrome', () => {
  const data = { mediaLink: media({ href: player, querystring: `videoId=${ids[1]}`, text: 'Stadiums video' }) };
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: false, isNormal: false, isPreview: true }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Video', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Video, { params: {}, fields: { data: { datasource: data } } })));
  assert.equal(src(html), `${player}?videoId=${ids[1]}&preload=none`);
  assert.match(html, /title="Stadiums video"/);
  assert.deepEqual(editingIds(html), []);
  assert.doesNotMatch(html, /video-placeholder/);
});

test('unsafe hosts, paths, schemes, credentials and ambiguous video IDs never create an iframe', () => {
  const invalid = [undefined, {}, { href: '' }, { href: '/allianz-assets/video.mp4' },
    { href: `http://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html?videoId=${ids[0]}` },
    { href: `${player.replace('players.brightcove.net', 'players.brightcove.net.unsafe.example')}?videoId=${ids[0]}` },
    { href: `${player.replace('https://', 'https://user:password@')}?videoId=${ids[0]}` },
    { href: `${player.replace('WioKPWt4t', 'unverified')}?videoId=${ids[0]}` },
    { href: `${player}?videoId=ref:example` }, { href: `${player}?videoId=0` },
    { href: `${player}?videoId=${ids[0]}#fragment` },
    { href: `${player}?videoId=${ids[0]}&videoId=${ids[1]}` },
    { href: `${player}?videoId=${ids[0]}`, querystring: `videoId=${ids[1]}` },
    { href: 'javascript:alert(1)' }, { href: 'data:text/html,<script>alert(1)</script>' }];
  for (const value of invalid) {
    assert.equal(source(value), '', JSON.stringify(value));
    const html = render(Video, { mediaLink: media(value) });
    assert.doesNotMatch(html, /<iframe\b|<script\b/);
    assert.match(html, /video-placeholder.svg/);
  }
});

test('editing preserves native metadata, all blank field controls and the open transcript', () => {
  for (const populated of [false, true]) {
    const data = { heading: field('heading', 'Single-Line Text', populated ? 'Source heading' : ''),
      body: field('body', 'Rich Text', populated ? '<p>Source body</p>' : ''),
      caption: field('caption', 'Rich Text', populated ? '<p>Source caption</p>' : ''),
      transcript: field('transcript', 'Rich Text', populated ? '<p>Source transcript</p>' : ''),
      poster: field('poster', 'Image', { src: '' }),
      mediaLink: media({ href: populated ? `${player}?videoId=${ids[0]}` : '', text: populated ? 'Source video' : '' }) };
    const before = JSON.stringify(data);
    const html = render(Video, data, true);
    assert.deepEqual(editingIds(html), ['body', 'caption', 'heading', 'media', 'poster', 'transcript']);
    assert.doesNotMatch(html, /<iframe\b/);
    assert.match(html, /video-placeholder.svg/);
    assert.match(html, /<details open=""/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('visitor transcript stays closed and exact; accessible titles have authored and blank fallbacks', () => {
  const data = { heading: field('heading', 'Single-Line Text', 'Source <heading>'),
    mediaLink: media({ href: player, querystring: `videoId=${ids[0]}`, text: '  ' }),
    transcript: field('transcript', 'Rich Text', '<p>Exact transcript &amp; formatting.</p>') };
  const html = render(Video, data);
  assert.match(html, /title="Source &lt;heading&gt;"/);
  assert.match(html, /<details class="allianz-local-video-transcript"/);
  assert.match(html, /<p>Exact transcript &amp; formatting\.<\/p>/);
  assert.doesNotMatch(html, /<details open/);
  assert.match(render(Video, { mediaLink: data.mediaLink }), /title="Video player"/);
  assert.match(render(Video, undefined), /Add a datasource for AllianzVideo/);
  assert.doesNotMatch(render(Video, {}), /<iframe\b|<details\b/);
});

test('separately owned SourceStatic remains static even with a valid Brightcove link', () => {
  const html = render(SourceStatic, { mediaLink: media({ href: `${player}?videoId=${ids[0]}` }) });
  assert.match(html, /video-placeholder.svg/);
  assert.doesNotMatch(html, /<iframe\b/);
});
