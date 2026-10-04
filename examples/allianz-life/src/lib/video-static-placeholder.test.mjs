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

const Video = loadSource(path.join(sourceRoot, 'components/allianz-video/AllianzVideo.tsx')).Default;
function field(name, type, value) {
  return { jsonValue: { value, metadata: { itemId: 'native-video', fieldId: name, fieldType: type } } };
}
function render(data, mode = 'normal') {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Video', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Video, { params: { RenderingIdentifier: 'authored-video' }, fields: { data: { datasource: data } } })));
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
