import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const { Default: LegacyRichText } = loadSource(path.join(sourceRoot, 'components/allianz-legacy-rich-text/AllianzLegacyRichText.tsx'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const fixture = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/legacy-rich-text-source.fixture.json'), 'utf8'));
const field = (value, name = 'body', type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(`legacy-${name}`, type) } });
const dataFor = item => ({ heading: field(item.scalarFields.heading, 'heading', 'Single-Line Text'), body: field(item.scalarFields.body) });
const careersHref = 'https://careers.allianz.com/US/go/Allianz-US-Life/5140601/';
const finraHref = 'http://www.finra.org';
const expectedVisitorBody = body => body
  .replace(`target="_blank" href="${careersHref}"`, 'target="" href="#service-unavailable"')
  .replace(`href="${finraHref}" class="disclosure-finra" target="_blank"`, 'href="#service-unavailable" class="disclosure-finra" target=""');

function withMode(mode, run) {
  const node = process.env.NODE_ENV, content = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
  try { run(); } finally {
    if (node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = node;
    if (content === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = content;
  }
}

test('NY fixtures retain eight exact source bodies, original link attributes and source hashes', () => {
  assert.equal(fixture.sourceLibraryFileId, 'libfile_8e09ca0591f8819190ef68b06e50e82e');
  assert.equal(fixture.sourceLibraryVersion, 2);
  assert.equal(fixture.items.length, 8);
  for (const item of fixture.items) {
    assert.equal(createHash('sha256').update(item.scalarFields.body).digest('hex'), item.bodySha256);
    assert.ok(item.sourceBodyXpaths.length);
    assert.doesNotMatch(item.scalarFields.body, /demo-unavailable|service-unavailable|data-demo-disabled/);
  }
  assert.ok(fixture.items.find(item => item.route.endsWith('/careers')).scalarFields.body.includes(careersHref));
  assert.ok(fixture.items.find(item => item.order === 8).scalarFields.body.includes(finraHref));
});

for (const mode of ['fixture', 'connected']) {
  for (const item of fixture.items) test(`${mode}: ${item.route} order ${item.order} preserves source content and editing identity`, () => withMode(mode, () => {
    const data = dataFor(item), before = JSON.stringify(data);
    const visitor = render(LegacyRichText, data);
    assert.ok(visitor.includes(expectedVisitorBody(item.scalarFields.body)));
    assert.doesNotMatch(visitor, /href="(?:https:\/\/careers\.allianz\.com|http:\/\/www\.finra\.org)/);
    const editor = render(LegacyRichText, data, true);
    assert.ok(editor.includes(item.scalarFields.body));
    assert.match(editor, /test-legacy-body-field/);
    assert.strictEqual(safeEditorialRichText(data.body.jsonValue, true), data.body.jsonValue);
    assert.equal(JSON.stringify(data), before);
  }));

  test(`${mode}: local source links, case, tables and headings keep their existing markup`, () => withMode(mode, () => {
    const about = render(LegacyRichText, dataFor(fixture.items[0]));
    assert.match(about, /href="\/New-York\/About\/Why-Allianz-Life-of-NY"/);
    assert.match(about, /href="\/New-York\/About\/Careers"/);
    const ratings = fixture.items.find(item => item.order === 4 && item.route.endsWith('why-allianz-life-of-ny'));
    const html = render(LegacyRichText, dataFor(ratings), false, { region: 'disclosure', tableTheme: 'striped', RenderingIdentifier: 'ratings' });
    assert.ok(html.includes(ratings.scalarFields.body));
    assert.match(html, /id="ratings"/);
    assert.match(html, /content-body disclosure allianz-legacy-table-striped/);
    const disclosure = render(LegacyRichText, dataFor(fixture.items.find(item => item.order === 8)));
    assert.match(disclosure, /href="#service-unavailable" class="disclosure-finra" target="">member FINRA<\/a>/);
    assert.match(disclosure, /href="\/New-York">www\.allianzlife\.com\/new-york<\/a>/);
  }));

  test(`${mode}: subheading links get the same visitor-only policy as body links`, () => withMode(mode, () => {
    const body = '<p><a href="/About?tag=one&amp;tag=two#detail" target="_blank" rel="author">Local details</a> <a href="#content-body">Jump</a></p>';
    const subheading = `<strong>Careers</strong> <a title="Source title" class="job-link" target="_blank" href="${careersHref}">Search current job openings</a>`;
    const data = { body: field(body), subheading: field(subheading, 'subheading') }, before = JSON.stringify(data);
    const visitor = render(LegacyRichText, data);
    assert.match(visitor, /title="Source title" class="job-link" target="" href="#service-unavailable">Search current job openings<\/a>/);
    assert.match(visitor, /href="\/About\?tag=one&amp;tag=two#detail" target="_blank" rel="author noopener noreferrer"/);
    assert.match(visitor, /href="#content-body">Jump<\/a>/);
    const editor = render(LegacyRichText, data, true);
    assert.ok(editor.includes(body)); assert.ok(editor.includes(subheading));
    assert.match(editor, /test-legacy-subheading-field/);
    assert.equal(JSON.stringify(data), before);
  }));

  test(`${mode}: restricted schemes and paths stay local without changing authored text`, () => withMode(mode, () => {
    const hrefs = ['mailto:someone@example.invalid', 'tel:123456', 'javascript:void(0)', '/login', 'https://external.example/'];
    const body = hrefs.map((href, i) => `<a href="${href}" target="_blank" data-source="${i}">Label ${i}</a>`).join(' ');
    const data = { body: field(body) }, before = JSON.stringify(data);
    const visitor = render(LegacyRichText, data);
    for (let i = 0; i < hrefs.length; i++) assert.ok(visitor.includes(`<a href="#service-unavailable" target="" data-source="${i}">Label ${i}</a>`));
    assert.ok(render(LegacyRichText, data, true).includes(body));
    assert.equal(JSON.stringify(data), before);
  }));

  test(`${mode}: cleared fields remain cleared and editable; missing datasource retains fallback`, () => withMode(mode, () => {
    const data = { heading: field('', 'heading', 'Single-Line Text'), subheading: field('', 'subheading'), body: field('') };
    const before = JSON.stringify(data);
    assert.doesNotMatch(render(LegacyRichText, data), /<a\b|<h2\b|service-unavailable/);
    const editor = render(LegacyRichText, data, true);
    for (const name of ['heading', 'subheading', 'body']) assert.ok(editor.includes(`test-legacy-${name}-field`));
    assert.match(render(LegacyRichText, undefined), /Add a datasource/);
    assert.doesNotMatch(render(LegacyRichText, {}), /<a\b|service-unavailable/);
    assert.equal(JSON.stringify(data), before);
  }));
}

test('nonediting preview also applies visitor link policy without mutating original fields', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
  const data = dataFor(fixture.items.find(item => item.route.endsWith('/careers'))), before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: false, isNormal: false, isPreview: true }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Preview', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(LegacyRichText, { params: {}, fields: { data: { datasource: data } } })));
  assert.ok(html.includes(expectedVisitorBody(data.body.jsonValue.value)));
  assert.equal(JSON.stringify(data), before);
});
