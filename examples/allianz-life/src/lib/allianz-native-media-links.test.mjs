import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require, render as renderComponent } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const fixture = JSON.parse(fs.readFileSync(new URL('./allianz-native-media-links.fixture.json', import.meta.url), 'utf8'));
// These values are synthetic query-shape examples, never captured delivery tokens.
const query = 'ttc=12345678901&tt=0123456789abcdef0123456789abcdef';
const base = ({ host, path: mediaPath }) => `https://${host}${mediaPath}`;
process.env.NODE_ENV = 'test';

function field(entry, attributes = {}) {
  return {
    value: {
      href: `${base(entry)}?${query}`, text: 'Original PDF caption', linktype: 'media',
      id: `{${entry.itemId}}`, target: '_blank', querystring: '', anchor: '',
      title: 'Original native title', class: 'native-pdf', 'aria-label': '',
      ...attributes,
    },
    metadata: { itemId: 'test-only-resource-owner', fieldId: 'test-only-resource-link', fieldType: 'General Link' },
  };
}
function render(input, isEditing = false, editable = true) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing, isNormal: !isEditing, isPreview: false },
      layout: { sitecore: { context: {}, route: { name: 'Native media contract', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Link, { ...safeLinkRenderProps(input), editable,
    'aria-label': input.value?.ariaLabel ?? input.value?.['aria-label'] })));
}
const renderedHref = (html) => /href="([^"]*)"/.exec(html)?.[1].replaceAll('&amp;', '&');

test('six native PDF examples retain verified QA evidence without a production fixture dependency', () => {
  assert.equal(fixture.entries.length, 6);
  assert.equal(new Set(fixture.entries.map(({ itemId }) => itemId)).size, 6);
  assert.equal(fixture.evidence.libraryFileId, 'libfile_b9551cc0399081919a26c4d0da619412');
  assert.equal(fixture.evidence.libraryVersion, 0);
  assert.doesNotMatch(fs.readFileSync(new URL('./allianz-fields.ts', import.meta.url), 'utf8'), /allianz-native-media-links\.fixture/);
  const estate = fixture.pageEvidence.find(({ pageId }) => pageId === 'FD3B97D9-EA09-5342-B818-5C24C05EC6AE');
  assert.equal(estate.mediaCount, 3);
  assert.equal(estate.libraryFileId, 'libfile_4e1fcb99f64481919949f63edaf3a671');
  assert.equal(estate.libraryVersion, 0);
  assert.equal(estate.libraryBytes, 39978);
  assert.equal(estate.librarySha256, '5f439fa246db83e32d5f1a126c8fc1d7a2e57cdeeca7b0fbd7a8fd46107115cd');
  assert.equal(estate.nativeHtmlSha256, '5b384e476853d6974f14d614758e74970d2ea44b9ab9c7040ff9013ca6b3a1fc');
  assert.equal(estate.nativeSnapshotSha256, '728d687b3645d766690df5d9a8f4b5de8e7747e1235008a1ff1ad67f68120029');
  assert.deepEqual(fixture.entries.slice(3).map(({ itemId }) => itemId), estate.itemIds);
  for (const entry of fixture.entries) {
    assert.equal(entry.mimeType, 'application/pdf');
    assert.ok(entry.bytes > 0);
    assert.equal(entry.host, 'xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io');
    assert.match(entry.path, /^\/-\/media\/Project\/Allianz-Life\/Documents\/(?:M-5285|M-5288|CSI-513|AMK-488|AMK-496|AMK-501)\.pdf$/);
    assert.doesNotMatch(JSON.stringify(entry), /\?|ttc=|tt=/);
  }
});

for (const entry of fixture.entries) {
  test(`${entry.path}: both installed SDK renderer modes retain the full native href and authored attributes`, () => {
    for (const mode of ['fixture', 'connected']) {
      process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
      const input = field(entry, { rel: 'author nofollow' });
      const before = JSON.stringify(input), normalized = safeLink(input);
      assert.equal(normalized.value.href, base(entry));
      assert.equal(normalized.value.querystring, query);
      assert.equal(normalized.value.anchor, '');
      assert.strictEqual(normalized.metadata, input.metadata);
      for (const key of ['text', 'id', 'linktype', 'target', 'title', 'class', 'aria-label', 'rel']) {
        assert.equal(normalized.value[key], input.value[key], key);
      }
      for (const editing of [false, true]) {
        const html = render(input, editing);
        assert.equal(renderedHref(html), input.value.href);
        assert.match(html, /target="_blank"/);
        assert.match(html, /aria-label=""/);
        assert.match(html, /title="Original native title"/);
        assert.match(html, /class="native-pdf"/);
        assert.match(html, /rel="author nofollow noopener noreferrer"/);
        assert.match(html, /Original PDF caption/);
        if (editing) assert.match(html, /test-only-resource-link/);
      }
      assert.equal(renderedHref(render(input, false, false)), input.value.href);
      assert.deepEqual(safeLink(normalized), normalized);
      assert.equal(renderedHref(render(normalized)), input.value.href);
      assert.equal(JSON.stringify(input), before);
    }
  });
}

test('an ordinary authored replacement accepts a new native GUID and canonical PDF names absent every QA example', () => {
  const origin = `https://${fixture.entries[0].host}`;
  const prefix = '/-/media/Project/Allianz-Life/Documents/';
  const newId = 'B7A19B1D-9750-46F2-8172-C534689DA701';
  assert.ok(!fixture.entries.some(({ itemId }) => itemId === newId));
  const paths = [
    `${prefix}Funding-overview-2026.pdf`,
    `${prefix}2026/Client-Guides/Replacement.PDF`,
    `${prefix}2026/${encodeURIComponent('Neue Broschüren')}/${encodeURIComponent('Hilfe fürs College.pdf')}`,
  ];
  for (const mediaPath of paths) {
    assert.ok(!fixture.entries.some(({ path: oldPath }) => oldPath === mediaPath));
    const input = field({ itemId: newId, host: fixture.entries[0].host, path: mediaPath }, {
      text: 'New authored document caption', target: '_blank', 'aria-label': 'New authored PDF',
    });
    const before = JSON.stringify(input), normalized = safeLink(input);
    assert.equal(normalized.value.href, `${origin}${mediaPath}`);
    assert.equal(normalized.value.id, `{${newId}}`);
    assert.equal(normalized.value.text, input.value.text);
    assert.equal(normalized.value.target, input.value.target);
    assert.equal(normalized.value['aria-label'], input.value['aria-label']);
    assert.strictEqual(normalized.metadata, input.metadata);
    assert.deepEqual(safeLink(normalized), normalized);
    for (const editing of [false, true]) {
      const html = render(input, editing);
      assert.equal(renderedHref(html), input.value.href);
      assert.match(html, /target="_blank"/);
      assert.match(html, /New authored document caption/);
      assert.match(html, /aria-label="New authored PDF"/);
      if (editing) assert.match(html, /test-only-resource-link/);
    }
    assert.equal(JSON.stringify(input), before);
  }
});

test('embedded, native split, and repeated equivalent field representations rejoin without duplicate query parameters', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  const entry = fixture.entries[0], destination = `${base(entry)}?${query}`;
  for (const attrs of [
    { href: destination },
    { href: base(entry), querystring: query },
    { href: base(entry), querystring: `?${query}` },
    { href: destination, querystring: query },
    { href: destination, querystring: `?${query}` },
  ]) {
    const input = field(entry, attrs), normalized = safeLink(input);
    assert.equal(renderedHref(render(input)), destination);
    assert.equal(normalized.value.querystring, query);
    assert.deepEqual(safeLink(normalized), normalized);
  }
  const reversed = 'tt=0123456789ABCDEF0123456789ABCDEF&ttc=12345678901';
  assert.equal(renderedHref(render(field(entry, { href: `${base(entry)}?${reversed}` }))), `${base(entry)}?${reversed}`);
});

test('native GUID case and balanced braces do not alter authored identity or navigation targets', () => {
  const entry = fixture.entries[0];
  for (const id of [entry.itemId, entry.itemId.toLowerCase(), `{${entry.itemId.toLowerCase()}}`]) {
    for (const target of [undefined, '', '_self', '_blank']) {
      const input = field(entry, { id, target, ariaLabel: '', 'aria-label': 'Stale alias' });
      const normalized = safeLink(input), html = render(input);
      assert.equal(normalized.value.id, id);
      assert.equal(normalized.value.target, target);
      assert.match(html, /aria-label=""/);
      assert.doesNotMatch(html, /Stale alias/);
      if (target === undefined) assert.doesNotMatch(html, /\starget=/);
      else assert.ok(html.includes(`target="${target}"`));
      assert.equal(renderedHref(html), input.value.href);
    }
  }
});

test('real resource-card rendering survives its two safeLink passes and retains native editor field ownership', () => {
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
  const caption = 'Download our college funding brochure for parents';
  const entry = fixture.entries[0], input = field(entry, { text: caption });
  const data = { children: { results: [
    { id: 'test-only-intro', heading: { jsonValue: { value: 'Resources' } }, body: { jsonValue: { value: '<p>Introduction</p>' } } },
    { id: 'test-only-resource', heading: { jsonValue: { value: caption } }, link: { jsonValue: input } },
  ] } };
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const html = renderComponent(Cards.StrategyIntroResources, data, editing);
    const anchor = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).find(tag => /class="m-card"/.test(tag));
    assert.ok(anchor, html);
    assert.equal(renderedHref(anchor), input.value.href);
    assert.match(anchor, /target="_blank"/);
    assert.match(anchor, /aria-label=""/);
    if (editing) assert.match(html, /test-only-resource-link/);
    else assert.match(anchor, /rel="noopener noreferrer"/);
  }
  assert.equal(JSON.stringify(data), before);
});

test('invalid native GUIDs and non-media links remain unavailable', () => {
  const first = fixture.entries[0];
  for (const attrs of [
    { id: undefined }, { id: '' }, { id: '{TEST-ONLY-MEDIA}' },
    { id: `{${first.itemId}` }, { id: `${first.itemId}}` },
    { id: `{ ${first.itemId} }` }, { id: 123 }, { id: null },
    { linktype: 'external' }, { linktype: 'internal' }, { linktype: undefined },
  ]) {
    const input = field(first, attrs);
    assert.equal(renderedHref(render(input)), '#service-unavailable');
    assert.equal(safeLink(input).value.target, '');
    assert.strictEqual(safeLink(input).metadata, input.metadata);
  }
});

test('host, scheme, port, credentials, encoded paths, fragments and path lookalikes never broaden the native exception', () => {
  const entry = fixture.entries[0], url = base(entry);
  for (const destination of [
    url.replace('https:', 'http:'), url.replace('https:', ''),
    url.replace(entry.host, `${entry.host}.evil.invalid`),
    url.replace(entry.host, `user:password@${entry.host}`),
    url.replace(entry.host, `${entry.host}:444`), url.replace(entry.host, `${entry.host}:443`),
    url.replace('/-/media/', '/%2d/media/'), url.replace('/-/media/', '/-/media/../media/'),
    url.replace('.pdf', '.pdf/'), url.replace('.pdf', '.html'),
    url.replace('/Documents/', '//Documents/'), url.replace('/Documents/', '/Documents-other/'),
    url.replace('/Project/Allianz-Life/', '/Project/Other-Site/'),
    url.replace('M-5285.pdf', '.pdf'), url.replace('M-5285.pdf', 'Guide%2Epdf'),
    url.replace('M-5285.pdf', '%4D-5285.pdf'), url.replace('M-5285.pdf', 'Guide%2Fother.pdf'),
    url.replace('M-5285.pdf', 'Guide%5Cother.pdf'), url.replace('M-5285.pdf', 'Guide%252Fother.pdf'),
    url.replace('M-5285.pdf', '%2E%2E/Guide.pdf'), url.replace('M-5285.pdf', '%252E%252E/Guide.pdf'),
    url.replace('M-5285.pdf', 'Guide%00.pdf'), url.replace('M-5285.pdf', 'Guide%0A.pdf'),
    url.replace('M-5285.pdf', 'Guide%23fragment.pdf'), url.replace('M-5285.pdf', 'Guide%3Fquery.pdf'),
    url.replace('M-5285.pdf', 'Guide%ZZ.pdf'), url.replace('M-5285.pdf', 'Guide%C3%28.pdf'),
    url.replace('M-5285.pdf', 'Guide with space.pdf'), url.replace('M-5285.pdf', 'Grüße.pdf'),
    url.replace('M-5285.pdf', 'Gr%c3%bc%c3%9fe.pdf'),
  ]) assert.equal(renderedHref(render(field(entry, { href: `${destination}?${query}` }))), '#service-unavailable');
  for (const attrs of [
    { href: `${url}?${query}#page=2` }, { href: `${url}?${query}#` },
    { anchor: 'page=2' }, { anchor: '#' },
  ]) assert.equal(renderedHref(render(field(entry, attrs))), '#service-unavailable');
});

test('unproved query shapes, unknown parameters, duplicate keys and inconsistent native split queries are rejected', () => {
  const entry = fixture.entries[0], token = '0123456789abcdef0123456789abcdef';
  for (const unproved of [
    '', 'ttc=12345678901', `tt=${token}`, `${query}&download=1`,
    `${query}&tt=${token}`, `${query}&ttc=12345678901`,
    `ttc=-1&tt=${token}`, `ttc=1.5&tt=${token}`, `ttc=1e11&tt=${token}`,
    `ttc=abc&tt=${token}`, `ttc=12345678901&tt=${token.slice(1)}`,
    `ttc=12345678901&tt=${token}0`, `ttc=12345678901&tt=z${token.slice(1)}`,
    `ttc=12345678901&tt=${token}%23`, `ttc=%31&tt=${token}`,
    `%74%74c=12345678901&tt=${token}`, `TTc=12345678901&tt=${token}`,
    `ttc=12345678901;tt=${token}`, `${query}&`,
  ]) {
    const input = field(entry, { href: `${base(entry)}${unproved ? `?${unproved}` : ''}` });
    assert.equal(renderedHref(render(input)), '#service-unavailable', unproved);
    const normalized = safeLink(input);
    assert.equal(normalized.value.querystring, '');
    assert.equal(normalized.value.anchor, '');
    assert.equal(normalized.value.target, '');
  }
  for (const querystring of [`${query}&extra=1`, 'ttc=12345678902&tt=0123456789abcdef0123456789abcdef', `tt=${token}`, 'anchor=source']) {
    assert.equal(renderedHref(render(field(entry, { querystring }))), '#service-unavailable');
  }
});
