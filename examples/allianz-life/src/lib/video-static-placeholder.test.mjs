import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const appRoot = path.dirname(sourceRoot);
const modules = new Map();

function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

const videoExports = loadSource(path.join(sourceRoot, 'components/allianz-video/AllianzVideo.tsx'));
const Video = videoExports.Default;
const SourceStatic = videoExports.SourceStatic;
const { brightcoveEmbedSource } = loadSource(path.join(sourceRoot, 'components/allianz-video/allianz-video.props.ts'));
function field(name, type, value) {
  return { jsonValue: { value, metadata: { itemId: 'native-video', fieldId: name, fieldType: type } } };
}
function render(data, mode = 'normal', Component = Video) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Video', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: { RenderingIdentifier: 'authored-video' }, fields: { data: { datasource: data } } })));
}
function metadata(html) {
  return [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
    .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));
}

test('normal and preview always render the same accessible static graphic without media playback', () => {
  for (const mode of ['normal', 'preview']) for (const src of [undefined, '/allianz-assets/video.mp4',
    'https://players.brightcove.net/123/player_default/index.html?videoId=456', 'javascript:alert(1)']) {
    const data = { localVideo: { jsonValue: { value: { src } } },
      mediaLink: field('media', 'General Link', { href: src, text: 'Play' }),
      poster: field('poster', 'Image', { src: 'https://unrequested.example/poster.jpg', alt: 'Poster' }) };
    const before = JSON.stringify(data);
    const html = render(data, mode);
    assert.match(html, /<img[^>]*class="allianz-video-placeholder"[^>]*src="\/allianz-ui\/video-placeholder.svg"[^>]*alt="Video player would go here"[^>]*width="640"[^>]*height="360"/);
    assert.equal((html.match(/<img\b/g) || []).length, 1);
    assert.doesNotMatch(html, /<video\b|<iframe\b|<audio\b|<button\b|<a\b|unrequested.example|brightcove|\.mp4|javascript:|allianz-local-video-play|role="status"/);
    assert.deepEqual(metadata(html), []);
    assert.equal(JSON.stringify(data), before);
  }
});

test('editing retains all existing SDK field metadata and content without enabling a player', () => {
  const data = { heading: field('heading', 'Single-Line Text', 'Authored <heading>'),
    body: field('body', 'Rich Text', '<p>Authored body</p>'),
    poster: field('poster', 'Image', { src: '/allianz-assets/poster.jpg', alt: 'Authored poster' }),
    mediaLink: field('media', 'General Link', { href: '/allianz-assets/video.mp4', text: 'Authored media' }),
    caption: field('caption', 'Rich Text', '<p>Authored caption</p>'),
    transcript: field('transcript', 'Rich Text', '<p>Authored transcript</p>') };
  const before = JSON.stringify(data);
  const html = render(data, 'editing');
  assert.deepEqual(metadata(html).map((entry) => entry.fieldId).sort(), ['body', 'caption', 'heading', 'media', 'poster', 'transcript']);
  assert.match(html, /Authored &lt;heading&gt;/);
  assert.match(html, /<p>Authored body<\/p>/);
  assert.match(html, /<p>Authored caption<\/p>/);
  assert.match(html, /<details open=""/);
  assert.match(html, /<p>Authored transcript<\/p>/);
  assert.match(html, /alt="Video player would go here"/);
  assert.doesNotMatch(html, /<video\b|<iframe\b|<button\b/);
  assert.equal(JSON.stringify(data), before);
});

test('author clears retain existing field chrome while absent fields are never manufactured', () => {
  const data = { heading: field('heading', 'Single-Line Text', ''), body: field('body', 'Rich Text', ''),
    poster: field('poster', 'Image', {}), mediaLink: field('media', 'General Link', {}),
    caption: field('caption', 'Rich Text', ''), transcript: field('transcript', 'Rich Text', '') };
  assert.deepEqual(metadata(render(data, 'editing')).map((entry) => entry.fieldId).sort(),
    ['body', 'caption', 'heading', 'media', 'poster', 'transcript']);
  assert.deepEqual(metadata(render({}, 'editing')), []);
  for (const mode of ['normal', 'preview']) {
    const html = render(data, mode);
    assert.deepEqual(metadata(html), []);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|Read video transcript|<details\b/);
    assert.match(html, /Video player would go here/);
  }
});

test('the authored transcript remains readable in visitors and opens only by default in editing', () => {
  const data = { transcript: field('transcript', 'Rich Text', '<p>Exact transcript &amp; formatting.</p>') };
  for (const mode of ['normal', 'preview']) {
    const html = render(data, mode);
    assert.match(html, /<details class="allianz-local-video-transcript"><summary>Read video transcript<\/summary>/);
    assert.match(html, /<p>Exact transcript &amp; formatting\.<\/p>/);
    assert.doesNotMatch(html, /<details open/);
  }
  assert.match(render(data, 'editing'), /<details open=""/);
});

test('missing datasources retain the existing fallback instead of inventing authored content', () => {
  for (const mode of ['normal', 'preview', 'editing']) assert.doesNotMatch(render(undefined, mode), /video-placeholder.svg/);
});

test('the repository-native SVG is inert and source dimensions survive legacy player padding', () => {
  const svg = fs.readFileSync(path.join(appRoot, 'public/allianz-ui/video-placeholder.svg'), 'utf8');
  assert.match(svg, /width="640" height="360" viewBox="0 0 640 360"/);
  assert.equal((svg.match(/Video player would go here/g) || []).length, 1);
  assert.doesNotMatch(svg, /<(?:script|image|foreignObject|a|animate)\b|href=|\bon[a-z]+=|url\(/i);
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-video/AllianzVideo.css'), 'utf8');
  assert.match(css, /section\.allianz-local-video article\.video-block\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*640px;[^}]*margin:\s*64px auto;/);
  assert.match(css, /\.allianz-local-video \.bc-video-player \.bc-video-player-inner\s*\{[^}]*aspect-ratio:\s*16 \/ 9;[^}]*padding:\s*0;/);
  assert.doesNotMatch(css, /url\(/);
});


test('SourceStatic plays a validated native link while preserving its inert editor and separate poster/transcript ownership', () => {
  const data = {
    heading: field('static-heading', 'Single-Line Text', 'Authored video heading'),
    body: field('static-body', 'Rich Text', '<p>Authored supporting copy</p>'),
    caption: field('static-caption', 'Rich Text', '<p>Authored video caption</p>'),
    mediaLink: field('static-media', 'General Link', {
      href: 'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html?videoId=6291658616001',
      text: 'Authored playback link', linktype: 'external', target: '_blank',
    }),
    poster: field('static-poster', 'Image', {
      src: 'https://test-only.example/source-poster.jpg', alt: 'Authored unused poster', width: '1280', height: '720',
    }),
    transcript: field('static-transcript', 'Rich Text', '<p>Transcript owned by the separate native component</p>'),
  };
  assert.ok(brightcoveEmbedSource(data.mediaLink.jsonValue), 'The test input must be a valid supported playback link');
  const before = JSON.stringify(data);
  for (const mode of ['normal', 'preview', 'editing']) {
    const html = render(data, mode, SourceStatic);
    if (mode === 'editing') {
      assert.equal((html.match(/<img\b/g) || []).length, 1);
      assert.match(html, /<img[^>]*class="allianz-video-placeholder"[^>]*src="\/allianz-ui\/video-placeholder.svg"[^>]*alt="Video player would go here"[^>]*width="640"[^>]*height="360"/);
      assert.doesNotMatch(html, /<iframe\b|brightcove|Authored playback link/);
    } else {
      assert.equal((html.match(/<iframe\b/g) || []).length, 1);
      assert.match(html, /src="https:\/\/players\.brightcove\.net\/1537381467001\/WioKPWt4t_default\/index\.html\?videoId=6291658616001&amp;preload=none"/);
      assert.match(html, /title="Authored playback link"/);
      assert.doesNotMatch(html, /<img\b|video-placeholder/);
    }
    assert.match(html, /Authored video heading/);
    assert.match(html, /<p>Authored supporting copy<\/p>/);
    assert.match(html, /<p>Authored video caption<\/p>/);
    assert.doesNotMatch(html, /<video\b|<audio\b|<script\b|<a\b|source-poster|unused poster|allianz-source-static-video-fields|static-media|static-poster|static-transcript|Transcript owned/);
    const markers = metadata(html).map(({ fieldId }) => fieldId).sort();
    assert.deepEqual(markers, mode === 'editing' ? ['static-body', 'static-caption', 'static-heading'] : []);
    assert.equal(JSON.stringify(data), before);
  }
});

test('an empty native media link and absent transcript never manufacture playback or transcript controls', () => {
  const data = { heading: field('empty-media-heading', 'Single-Line Text', 'Authored existing video'),
    body: field('empty-media-body', 'Rich Text', '<p>Authored existing copy.</p>'),
    mediaLink: field('empty-media-link', 'General Link', {}) };
  const before = JSON.stringify(data);
  for (const mode of ['normal', 'preview', 'editing']) {
    const html = render(data, mode);
    assert.match(html, /video-placeholder.svg/);
    assert.doesNotMatch(html, /<iframe\b|brightcove|<details\b|Read video transcript|fieldId[^>]*transcript/);
    assert.deepEqual(metadata(html).map(({ fieldId }) => fieldId).sort(),
      mode === 'editing' ? ['empty-media-body', 'empty-media-heading', 'empty-media-link'] : []);
  }
  assert.equal(JSON.stringify(data), before);
});

test('specialized variants do not invent a missing transcript or consume another native transcript owner', () => {
  const names = ['SourceStatic', 'FixedSourceStatic', 'RilaStaticVideo', 'ClassicProductVideo',
    'AAPlusProductVideo', 'BenefitControlPlusProductVideo', 'EssentialIncome7ProductVideo',
    'CoreIncome7ProductVideo', 'LifetimeIncomeVideo'];
  for (const name of names) for (const mode of ['normal', 'preview', 'editing']) {
    const data = { mediaLink: field('native-media', 'General Link', {
      href: 'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html',
      querystring: 'videoId=6291658616001', text: 'Existing authored video',
    }) };
    const missing = render(data, mode, videoExports[name]);
    data.transcript = field('separate-owner', 'Rich Text', '<p>Separate owner must remain separate.</p>');
    const before = JSON.stringify(data);
    const separate = render(data, mode, videoExports[name]);
    assert.equal(separate, missing, `${name} ${mode}: the video must not take transcript ownership`);
    assert.doesNotMatch(separate, /<details\b|Read video transcript|Separate owner|separate-owner/);
    assert.equal(JSON.stringify(data), before);
  }
});

test('specialized iframe sizing stays inside the existing responsive source player shell', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-video/AllianzVideo.css'), 'utf8');
  assert.match(css, /\.allianz-source-static-video\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*640px;/);
  const iframeRule = /\.allianz-source-static-video\s*>\s*\.allianz-video-player\s*\{([^}]+)\}/.exec(css)?.[1];
  assert.ok(iframeRule, 'Only the player within its existing source shell receives iframe sizing');
  for (const declaration of [/display:\s*block;/, /width:\s*100%;/, /height:\s*auto;/,
    /aspect-ratio:\s*16\s*\/\s*9;/, /border:\s*0;/]) assert.match(iframeRule, declaration);
  assert.doesNotMatch(iframeRule, /(?:margin|padding|position|overflow)\s*:|url\(/);
});

test('SourceStatic cleared copy retains only its relevant SDK controls and missing datasource keeps the existing fallback', () => {
  const data = {
    heading: field('static-heading', 'Single-Line Text', ''),
    body: field('static-body', 'Rich Text', ''),
    caption: field('static-caption', 'Rich Text', ''),
    poster: field('static-poster', 'Image', {}),
    mediaLink: field('static-media', 'General Link', {}),
  };
  const before = JSON.stringify(data);
  const editing = render(data, 'editing', SourceStatic);
  assert.deepEqual(metadata(editing).map(({ fieldId }) => fieldId).sort(), ['static-body', 'static-caption', 'static-heading']);
  assert.doesNotMatch(editing, /static-poster|static-media|scEmptyImage|allianz-source-static-video-fields/);
  assert.deepEqual(metadata(render({}, 'editing', SourceStatic)), []);
  for (const mode of ['normal', 'preview']) {
    const html = render(data, mode, SourceStatic);
    assert.deepEqual(metadata(html), []);
    assert.doesNotMatch(html, /\[No text in field\]|scEmptyImage|<iframe\b|<video\b|<audio\b/);
    assert.match(html, /Video player would go here/);
  }
  for (const mode of ['normal', 'preview', 'editing']) {
    assert.doesNotMatch(render(undefined, mode, SourceStatic), /video-placeholder.svg/);
  }
  assert.equal(JSON.stringify(data), before);
});
