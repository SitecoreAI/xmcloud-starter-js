import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import { component, contract, decode, editingIds, field, render } from '../../company-hero/__tests__/runtime.mjs';

const videoExports = component('allianz-video', 'AllianzVideo');
const { Default: Video, SourceStatic } = videoExports;
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

test('editing uses one validated player and natural closed transcript without empty field artifacts', () => {
  for (const populated of [false, true]) {
    const data = { heading: field('heading', 'Single-Line Text', populated ? 'Source heading' : ''),
      body: field('body', 'Rich Text', populated ? '<p>Source body</p>' : ''),
      caption: field('caption', 'Rich Text', populated ? '<p>Source caption</p>' : ''),
      transcript: field('transcript', 'Rich Text', populated ? '<p>Source transcript</p>' : ''),
      poster: field('poster', 'Image', { src: '/test-only-poster.jpg', alt: 'Unused poster field' }),
      mediaLink: media({ href: populated ? `${player}?videoId=${ids[0]}` : '', text: populated ? 'Source video' : '' }) };
    const before = JSON.stringify(data);
    const html = render(Video, data, true);
    assert.deepEqual(editingIds(html), populated ? ['body', 'caption', 'heading', 'media', 'transcript'] : []);
    assert.equal((html.match(/<iframe\b/g) || []).length, populated ? 1 : 0);
    assert.equal(html.includes('video-placeholder.svg'), !populated);
    assert.doesNotMatch(html, /<details open|source-fields|test-only-poster|Unused poster|\[No text in field\]|scEmptyImage/);
    assert.equal(stripMetadata(html), render(Video, data), 'editing and visitor visual markup match');
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

test('separately owned SourceStatic plays a valid native link without taking transcript ownership', () => {
  const html = render(SourceStatic, { mediaLink: media({ href: `${player}?videoId=${ids[0]}` }) });
  assert.equal(src(html), `${player}?videoId=${ids[0]}&preload=none`);
  assert.doesNotMatch(html, /video-placeholder.svg|<details\b|allianz-local-video-transcript/);
});

const specializedNames = ['SourceStatic', 'FixedSourceStatic', 'RilaStaticVideo', 'ClassicProductVideo',
  'AAPlusProductVideo', 'BenefitControlPlusProductVideo', 'EssentialIncome7ProductVideo',
  'CoreIncome7ProductVideo', 'LifetimeIncomeVideo'];
const specializedData = (populated = true) => ({
  heading: field('variant-heading', 'Single-Line Text', populated ? 'Native <heading>' : ''),
  body: field('variant-body', 'Rich Text', populated ? '<p>Native supporting copy &amp; formatting.</p>' : ''),
  caption: field('variant-caption', 'Rich Text', populated ? '<p>Native caption.</p>' : ''),
  mediaLink: field('variant-media', 'General Link', populated
    ? { href: player, querystring: `videoId=${ids[0]}`, text: 'Native <video>', linktype: 'external' } : {}),
  poster: field('variant-poster', 'Image', populated
    ? { src: 'https://unused.example/native-poster.jpg', alt: 'Unused native poster', width: '1280', height: '720' } : {}),
  transcript: field('separate-transcript', 'Rich Text', populated ? '<p>Separate native transcript owner.</p>' : ''),
  localVideo: { jsonValue: { value: { src: '/allianz-assets/unused-native.mp4' } } },
});
function renderMode(Component, datasource, mode, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Video', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: { RenderingIdentifier: 'owned-video', ...params }, fields: { data: { datasource } } })));
}

const stripMetadata = html => html.replace(/<code\b[^>]*>.*?<\/code>/gs, '');
const visitorBaseline = JSON.parse(require('node:fs').readFileSync(new URL('./visitor-baseline.fixture.json', import.meta.url), 'utf8'));

test('Default visitor player markup remains identical to the approved release', () => {
  for (const populated of [true, false]) {
    const html = renderMode(Video, specializedData(populated), 'normal');
    assert.equal(createHash('sha256').update(html).digest('hex'), visitorBaseline.records.Default[populated ? 'populated' : 'cleared']);
  }
});

for (const name of specializedNames) {
  const Component = videoExports[name];
  test(`${name}: visitor and Preview play only the rebuilt native URL and preserve input fields`, () => {
    for (const mode of ['normal', 'preview']) {
      const data = specializedData();
      data.mediaLink.jsonValue.value = { href: `${player}?videoId=${ids[0]}&autoplay&loop&preload=auto`,
        querystring: `videoId=${ids[0]}&redirect=https://unsafe.example&muted=true`, text: 'Native <video>', linktype: 'external' };
      const before = JSON.stringify(data);
      const html = renderMode(Component, data, mode);
      assert.equal(src(html), `${player}?videoId=${ids[0]}&preload=none`);
      assert.equal((html.match(/<iframe\b/g) ?? []).length, 1);
      assert.match(html, /<div class="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video">\s*<iframe class="allianz-video-player"/,
        'Responsive source sizing requires the iframe directly inside the existing video shell');
      assert.match(html, /title="Native &lt;video&gt;"/);
      assert.match(html, /width="640" height="360" loading="lazy" allowFullScreen=""/i);
      assert.match(html, /allow="autoplay &#x27;none&#x27;; encrypted-media; fullscreen"/);
      assert.match(html, /sandbox="allow-scripts allow-same-origin"/);
      assert.match(html, /referrerPolicy="strict-origin-when-cross-origin"/i);
      assert.deepEqual(editingIds(html), []);
      assert.doesNotMatch(html, /video-placeholder|unused\.example|unused-native\.mp4|Separate native transcript|<details\b|<script\b|<video\b|allow-forms|allow-popups|allow-top-navigation|unsafe\.example/);
      assert.equal(JSON.stringify(data), before);
    }
  });

  test(`${name}: populated fields retain native metadata on the same visitor player surface`, () => {
    for (const populated of [true, false]) {
      const data = specializedData(populated);
      const before = JSON.stringify(data);
      const html = render(Component, data, true, { RenderingIdentifier: 'owned-video' });
      const normal = renderMode(Component, data, 'normal');
      const expectedFields = !populated ? [] : name.includes('SourceStatic') || name === 'RilaStaticVideo'
        ? ['variant-body', 'variant-caption', 'variant-heading', 'variant-media']
        : ['ClassicProductVideo', 'AAPlusProductVideo'].includes(name) ? ['variant-body', 'variant-heading', 'variant-media']
          : ['variant-media'];
      assert.deepEqual(editingIds(html), expectedFields.sort());
      assert.equal(stripMetadata(html), normal);
      assert.equal(createHash('sha256').update(normal).digest('hex'), visitorBaseline.records[name][populated ? 'populated' : 'cleared']);
      assert.doesNotMatch(html, /<script\b|<video\b|Separate native transcript|separate-transcript|variant-poster|source-static-video-fields|\[No text in field\]|scEmptyImage/);
      assert.equal(JSON.stringify(data), before);
    }
    assert.deepEqual(editingIds(renderMode(Component, {}, 'editing')), []);
  });

  test(`${name}: cleared, missing and unsafe links retain the existing surface-presence policy`, () => {
    const invalidValues = [undefined, {}, { href: '' }, { href: '/allianz-assets/video.mp4' },
      { href: `${player}?videoId=${ids[0]}&videoId=${ids[1]}` },
      { href: `${player}?videoId=${ids[0]}`, querystring: `videoId=${ids[1]}` },
      { href: `${player.replace('WioKPWt4t', 'unverified')}?videoId=${ids[0]}` },
      { href: `${player.replace('https://', 'https://user:password@')}?videoId=${ids[0]}` },
      { href: `${player.replace('players.brightcove.net', 'players.brightcove.net.unsafe.example')}?videoId=${ids[0]}` },
      { href: 'javascript:alert(1)' }];
    for (const mode of ['normal', 'preview']) for (const value of invalidValues) {
      const data = specializedData();
      if (value === undefined) delete data.mediaLink;
      else data.mediaLink = media(value);
      const before = JSON.stringify(data);
      const html = renderMode(Component, data, mode);
      assert.doesNotMatch(html, /<iframe\b|<script\b|<video\b|Separate native transcript|unused\.example/);
      const expectedPlaceholder = name === 'LifetimeIncomeVideo' ? false
        : name === 'CoreIncome7ProductVideo' ? Boolean(value?.href) : true;
      assert.equal(html.includes('video-placeholder.svg'), expectedPlaceholder, `${mode}: ${JSON.stringify(value)}`);
      assert.deepEqual(editingIds(html), []);
      assert.equal(JSON.stringify(data), before);
    }
    for (const mode of ['normal', 'preview', 'editing']) {
      const html = renderMode(Component, undefined, mode);
      assert.match(html, /Add a datasource for AllianzVideo/);
      assert.doesNotMatch(html, /video-placeholder|<iframe\b/);
    }
  });
}

test('specialized playback preserves distinct source shells, anchors and spacing', () => {
  const html = Object.fromEntries(specializedNames.map((name) => [name,
    renderMode(videoExports[name], specializedData(), 'normal')]));
  for (const value of Object.values(html)) {
    assert.equal((value.match(/id="owned-video"/g) ?? []).length, 1);
    assert.equal((value.match(/class="m-bcVideo u-margin-top-xl u-center-block allianz-source-static-video"/g) ?? []).length, 1);
    assert.doesNotMatch(value, /<section class="allianz-local-video"|allianz-local-video-transcript/);
  }
  assert.match(html.FixedSourceStatic, /^<div class="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection"/);
  assert.match(html.FixedSourceStatic, /class="l-grid__row u-margin-bottom-xl"/);
  assert.match(html.RilaStaticVideo, /^<div class="l-container--full-width t-bg-transparent axlTileCollection"/);
  assert.match(html.RilaStaticVideo, /class="l-grid__row u-margin-bottom-xl"/);
  assert.match(html.ClassicProductVideo, /u-row-spacing t-bg-transparent axlTileCollection allianz-classic-product-video/);
  assert.match(html.AAPlusProductVideo, /class="l-grid__row u-margin-bottom-xl"/);
  assert.doesNotMatch(html.ClassicProductVideo, /class="l-grid__row u-margin-bottom-xl"/);
  for (const name of ['ClassicProductVideo', 'AAPlusProductVideo']) {
    assert.match(html[name], /<title[^>]*>Light Bulb<\/title>/);
    assert.match(html[name], /<h2>Native &lt;heading&gt;<\/h2>/);
    assert.match(html[name], /<p>Native supporting copy &amp; formatting\.<\/p>/);
    assert.equal((renderMode(videoExports[name], specializedData(), 'normal', { RenderingIdentifier: '' }).match(/id="video"/g) ?? []).length, 1);
  }
  assert.match(html.BenefitControlPlusProductVideo, /<a name="video"><\/a>/);
  assert.match(html.EssentialIncome7ProductVideo, /class="l-grid__row u-margin-bottom-xl u-padding-bottom-xl"/);
  assert.match(html.CoreIncome7ProductVideo, /u-row-spacing t-bg-primary-white axlTileCollection/);
  assert.match(html.LifetimeIncomeVideo, /t-bg-purple-soft axlTileCollection allianz-lifetime-income-video/);
  assert.match(html.LifetimeIncomeVideo, /class="l-grid__row u-padding-bottom-xl"/);
});
