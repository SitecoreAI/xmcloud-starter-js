import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Link, SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { safeLink, safeLinkRenderProps } = loadSource(path.join(sourceRoot, 'lib/allianz-fields.ts'));
const { allianzLinkField } = loadSource(path.join(sourceRoot, 'lib/allianz-field-state.ts'));
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const registry = JSON.parse(fs.readFileSync(new URL('./approved-source-external-links.fixture.json', import.meta.url), 'utf8'));
// Keep the historical capture unchanged. Below, clone it and supply only the
// three source-restored General Link values, not a claimed new SDK capture.
const historical = JSON.parse(fs.readFileSync(new URL('../components/allianz-card-grid/__tests__/financial-ratings.fixture.json', import.meta.url), 'utf8'));
const agencies = [
  ['financial-ratings-agency-am-best', 'Go to A.M. Best', 'http://www.ambest.com/home/default.aspx'],
  ['financial-ratings-agency-moodys', 'Go to Moody’s', 'https://www.moodys.com/'],
  ['financial-ratings-agency-standard-and-poors', 'Go to Standard & Poor’s', 'https://www.standardandpoors.com/en_US/web/guest/home'],
];
const modes = ['normal', 'preview', 'editing'];
process.env.NODE_ENV = 'test';

function field(text, href, attributes = {}) {
  return { value: { href, text, linktype: 'external', target: '_blank', ...attributes },
    metadata: { itemId: 'test-only-rating-link', fieldId: 'test-only-rating-link-field', fieldType: 'General Link' } };
}
function provider(child, mode) {
  return React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { name: 'Ratings link contract test', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, child);
}
function renderLink(input, mode) {
  return renderToStaticMarkup(provider(React.createElement(Link, {
    ...safeLinkRenderProps(input, mode === 'editing'), editable: mode === 'editing',
  }), mode));
}
function renderCards(data, mode) {
  return renderToStaticMarkup(provider(React.createElement(Cards.Default, {
    fields: { data: { datasource: data } }, params: historical.agenciesParams,
  }), mode));
}
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));

test('the three Ratings registrations are the exact current public-source destinations', () => {
  assert.deepEqual(registry.entries.filter(({ sourceRecordKey }) => sourceRecordKey.startsWith('financial-ratings-agency-')),
    agencies.map(([sourceRecordKey, , url]) => ({ kind: 'public-page', url, sourceRecordKey })));
  assert.equal(new Set(registry.entries.map(({ url }) => url)).size, registry.entries.length);
});

for (const mode of modes) {
  test(`${mode}: exact source agency links preserve new-tab intent, labels, metadata and original field values`, () => {
    for (const contentMode of ['fixture', 'connected']) {
      process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = contentMode;
      for (const [, text, url] of agencies) {
        const input = field(text, url), before = JSON.stringify(input);
        const output = safeLink(input), html = renderLink(input, mode);
        assert.equal(output.value.href, url);
        assert.strictEqual(output.metadata, input.metadata);
        assert.deepEqual(hrefs(html), [url]);
        assert.match(html, /target="_blank"/);
        assert.match(html, /rel="noopener noreferrer"/);
        assert.ok(html.includes(text.replaceAll('&', '&amp;')));
        if (mode === 'editing') {
          assert.strictEqual(allianzLinkField(input, true), input);
          assert.strictEqual(safeLinkRenderProps(input, true).field, input);
          assert.match(html, /test-only-rating-link-field/);
        }
        assert.equal(JSON.stringify(input), before);
      }
    }
  });

  test(`${mode}: three-card rendering consumes only constructed source-restored native link fields`, () => {
    const data = structuredClone(historical.agencies);
    for (const [index, [, text, url]] of agencies.entries()) {
      const link = data.children.results[index].fieldCollection.find(({ name }) => name === 'links').jsonValue[0];
      link.fields.link = field(text, url);
    }
    const before = JSON.stringify(data), html = renderCards(data, mode);
    assert.deepEqual(hrefs(html), agencies.map(([, , url]) => url));
    assert.equal((html.match(/target="_blank"/g) ?? []).length, 3);
    assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 3);
    assert.equal((html.match(/<img\b/g) ?? []).length, 3);
    for (const [, text] of agencies) assert.ok(html.includes(text.replaceAll('&', '&amp;')));
    if (mode === 'editing') assert.equal((html.match(/test-only-rating-link-field/g) ?? []).length, 3);
    assert.equal(JSON.stringify(data), before);
    assert.equal(historical.agencies.children.results[0].fieldCollection.find(({ name }) => name === 'links').jsonValue[0].fields.link.value.href,
      '#demo-unavailable', 'historical native capture is not rewritten');
  });
}

test('query, path, case, protocol, encoding, credential and control variants remain unregistered', () => {
  for (const contentMode of ['fixture', 'connected']) {
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = contentMode;
    for (const [, text, url] of agencies) {
      const parsed = new URL(url);
      const variants = [
        `${url}?unapproved=1`, `${url}#unapproved`, `${url}/unapproved`,
        url.replace('www.', 'WWW.'), url.replace(parsed.hostname, `${parsed.hostname}.example.invalid`),
        url.replace(/^https?:/, parsed.protocol === 'http:' ? 'https:' : 'http:'),
        url.replace('://', '://user:password@'), url.replace(parsed.hostname, `${parsed.hostname}:444`),
        url.replace(parsed.hostname, `${parsed.hostname}:${parsed.protocol === 'http:' ? 80 : 443}`),
        `${parsed.origin}/%2f${parsed.pathname.slice(1)}`, `${parsed.origin}/%252f${parsed.pathname.slice(1)}`,
        `${parsed.origin}/unapproved%00`, `${url}%`, 'https://[invalid',
        url.replace('www.', '%77ww.'), ` ${url}`, `${url} `, `\t${url}`, `${url}\n`,
      ];
      const changedPathCase = url.replace(parsed.pathname, parsed.pathname.toUpperCase());
      if (changedPathCase !== url) variants.push(changedPathCase);
      const inputs = variants.map((href) => field(text, href));
      inputs.push(field(text, url, { querystring: 'unapproved=1' }));
      inputs.push(field(text, url, { anchor: 'unapproved' }));
      for (const linktype of ['internal', 'media']) inputs.push(field(text, url, { linktype, id: '{TEST-ONLY-NATIVE-ID}' }));
      for (const input of inputs) {
        const before = JSON.stringify(input), output = safeLink(input);
        assert.equal(output.value.href, '#service-unavailable', JSON.stringify(input.value));
        assert.equal(output.value.target, '');
        assert.strictEqual(output.metadata, input.metadata);
        assert.strictEqual(allianzLinkField(input, true), input);
        assert.deepEqual(hrefs(renderLink(input, 'normal')), ['#service-unavailable']);
        assert.equal(JSON.stringify(input), before);
      }
    }
  }
});

test('clearing a native field stays cleared in normal, Preview and editing modes', () => {
  const cleared = field('Go to A.M. Best', ''), before = JSON.stringify(cleared);
  assert.strictEqual(safeLink(cleared), cleared);
  for (const editing of [false, true]) assert.strictEqual(allianzLinkField(cleared, editing), cleared);
  for (const mode of modes) {
    const data = structuredClone(historical.agencies);
    for (const [index, [, text, url]] of agencies.entries()) {
      const link = data.children.results[index].fieldCollection.find(({ name }) => name === 'links').jsonValue[0];
      link.fields.link = index === 0 ? cleared : field(text, url);
    }
    const unchanged = JSON.stringify(data), html = renderCards(data, mode);
    assert.deepEqual(hrefs(html), agencies.slice(1).map(([, , url]) => url));
    assert.doesNotMatch(html, /href="(?:\/|#service-unavailable|http:\/\/www\.ambest)/);
    assert.equal(JSON.stringify(data), unchanged);
  }
  assert.equal(JSON.stringify(cleared), before);
});
