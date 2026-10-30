import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadSource, sourceRoot, render, nativeField, metadata } from '../../product-hero/__tests__/sdk-test-helper.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(directory, 'fixed-index-overview.source.json'), 'utf8'));
const source = fs.readFileSync(path.join(directory, 'fixed-index-overview.source.html'), 'utf8');
const variants = loadSource(path.join(sourceRoot, 'components/product-introduction/ProductIntroduction.tsx'));
const headingText = source.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/)[1];
const bodyHTML = source.match(/<p>[\s\S]*?<\/p>/)[0];
const withoutChrome = (html) => html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
const hash = (html) => crypto.createHash('sha256').update(html).digest('hex');
const escapeHTML = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
const datasource = (heading = headingText, body = bodyHTML) => ({
  heading: nativeField('heading', heading, 'overview-source'),
  body: nativeField('body', body, 'overview-source'),
});

function freeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
}

test('retained source witness owns the smaller heading and lg body, with a separate empty header', () => {
  assert.equal(hash(source), fixture.fragmentSHA256);
  assert.match(source, /<header>\s*<div class="tileHeading\s*"><\/div>\s*<div class="tileSubHeading\s*"><\/div>\s*<\/header>/);
  assert.match(source, /<div class="tileBody u-font-size-lg">\s*<h2 style="font-size:1\.625rem;line-height:2rem;">/);
  const css = fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8');
  assert.match(css, /h1,h2,h3,h4,h5,h6\{margin:24px 0\}/);
  assert.match(css, /\.u-font-size-lg\{font-size:1\.125rem!important\}/);
  assert.match(css, /\.u-font-size-lg,\.u-font-size-xl\{line-height:1\.625rem!important;/);
});

for (const isEditing of [false, true]) {
  test(`FixedIndexOverview retains source field order and typography in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const data = freeze(datasource());
    const before = JSON.stringify(data);
    const html = render(variants.FixedIndexOverview, data, {
      isEditing, params: { RenderingIdentifier: 'native-overview' },
    });
    const visible = withoutChrome(html);
    assert.match(visible, /id="native-overview"/);
    assert.match(visible, /<header aria-hidden="true"><div class="tileHeading"><\/div><div class="tileSubHeading"><\/div><\/header><div class="tileBody u-font-size-lg">/);
    assert.ok(visible.includes(`<h2 style="font-size:1.625rem;line-height:2rem;margin:24px 0">${escapeHTML(headingText)}</h2>`));
    assert.ok(visible.includes(`<div>${bodyHTML}</div>`), 'SDK RichText keeps valid block markup');
    assert.ok(visible.indexOf('</h2>') < visible.indexOf('<p>'));
    assert.doesNotMatch(visible, /u-font-size-xl|<span[^>]*><p>|<header[^>]*>[\s\S]*?<h2[\s\S]*?<\/header>/);
    assert.equal(JSON.stringify(data), before);
    assert.deepEqual(metadata(html).map((entry) => entry.fieldId).sort(),
      isEditing ? ['native-body', 'native-heading'] : []);
    if (isEditing) {
      assert.deepEqual(metadata(html), [data.heading.jsonValue.metadata, data.body.jsonValue.metadata]);
    }
  });

  test(`FixedIndexOverview uses authored values and independently cleared fields in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const data = datasource('Authored <heading> & copy', '<p>Authored <strong>body</strong>.</p><p>Second block.</p>');
    const html = render(variants.FixedIndexOverview, data, { isEditing });
    assert.ok(html.includes('Authored &lt;heading&gt; &amp; copy'));
    assert.ok(html.includes('<p>Authored <strong>body</strong>.</p><p>Second block.</p>'));
    assert.doesNotMatch(html, /A fixed index annuity may be a good choice/);
    for (const [heading, body, expectedFields] of [
      ['', '<p>Retained body.</p>', ['native-body']],
      ['Retained heading', '', ['native-heading']],
      ['', '', []],
    ]) {
      const clear = datasource(heading, body);
      const before = JSON.stringify(clear);
      const clearedHTML = render(variants.FixedIndexOverview, clear, { isEditing });
      assert.equal(/<h2\b/.test(clearedHTML), Boolean(heading));
      assert.equal(/<p>/.test(clearedHTML), Boolean(body));
      assert.doesNotMatch(clearedHTML, /\[No text in field\]|A fixed index annuity may be a good choice/);
      assert.deepEqual(metadata(clearedHTML).map((entry) => entry.fieldId).sort(), isEditing ? expectedFields : []);
      assert.equal(JSON.stringify(clear), before);
    }
  });

  test(`FixedIndexOverview keeps absent datasource fallback and missing optional fields safe in ${isEditing ? 'editing' : 'normal'} mode`, () => {
    const absent = render(variants.FixedIndexOverview, undefined, { isEditing, omitFields: true });
    assert.match(absent, /role="status">Add a datasource for Product Introduction\./);
    assert.doesNotMatch(absent, /<h2|<p>/);
    const empty = render(variants.FixedIndexOverview, {}, { isEditing });
    assert.doesNotMatch(empty, /<h2|<p>|No text in field/);
  });
}

test('normal and editing modes share the same visible overview markup with native field metadata as the only difference', () => {
  const data = datasource();
  assert.equal(withoutChrome(render(variants.FixedIndexOverview, data, { isEditing: true })),
    render(variants.FixedIndexOverview, data));
});

for (const name of ['Default', 'Blue', 'Plain', 'ProductGroup']) {
  test(`${name} preserves all e5 actual-SDK normal/editing outputs`, () => {
    for (const value of fixture.legacyCases) {
      for (const isEditing of [false, true]) {
        const data = datasource(value.heading, value.body);
        const html = render(variants[name], data, { isEditing, params: { RenderingIdentifier: 'overview-source' } });
        assert.equal(hash(html), fixture.legacyActualSDKSSR[name][value.id][isEditing ? 'editing' : 'normal']);
        assert.doesNotMatch(html, /font-size:1\.625rem|margin:24px 0/);
      }
    }
  });
}
