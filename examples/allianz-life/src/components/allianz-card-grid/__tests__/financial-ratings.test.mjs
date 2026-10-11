import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const postcss = require('postcss');
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { financialRatingsRichText } = loadSource(path.join(sourceRoot, 'lib/financial-ratings-rich-text.ts'));
const fixture = JSON.parse(fs.readFileSync(new URL('./financial-ratings.fixture.json', import.meta.url), 'utf8'));
const css = postcss.parse(fs.readFileSync(new URL('../AllianzFinancialRatings.css', import.meta.url), 'utf8'));
const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
const scope = '.allianz-modern [data-allianz-card-grid="6a6d5c5594f94090a7f4dcec2ff47726"]';
const grade = `${scope} .tileAlphanumeral`;
const wide = `${scope} [data-allianz-card="5f8f1ef6db5a4f6b9de7a5d155e6c6d3"] .tileAlphanumeral`;
const tables = `${scope} .tileBody table.c-table`;
const shown = (data, editing = false, params = fixture.ratingsParams) => render(Cards.Default, data, editing, params);
const markers = (html) => html.replace(/ data-allianz-card(?:-grid)?="[^"]*"/g, '').replace(/<span class="tileAlphanumeral">([^<]*)<\/span>/g, '$1');
function rules(root, selector) {
  const found = [];
  root.walkRules((rule) => {
    if (rule.selector.split(',').map((part) => part.trim()).includes(selector)) found.push(rule);
  });
  assert.ok(found.length, selector);
  return found;
}
const decl = (rule, name) => rule.nodes.find((node) => node.prop === name)?.value;

test('saved native rating fields render three grades, three semantic tables and eight historical rows', () => {
  const data = structuredClone(fixture.ratings), before = JSON.stringify(data);
  const html = shown(data);
  assert.ok(html.includes('data-allianz-card-grid="6a6d5c5594f94090a7f4dcec2ff47726"'));
  assert.deepEqual([...html.matchAll(/class="tileAlphanumeral">([^<]*)</g)].map((match) => match[1]), ['A+', 'Aa3', 'AA']);
  assert.equal((html.match(/<table\b/g) ?? []).length, 3);
  assert.equal((html.match(/<caption\b/g) ?? []).length, 3);
  assert.equal((html.match(/<tr\b/g) ?? []).length, 11);
  assert.equal((html.match(/colspan="2"/g) ?? []).length, 3);
  for (const text of ['2015 - 2026', '2005 - 2015', '2023 - 2025', '2017 - 2022', '2003 - 2016', '2007 - 2026', '2005 - 2007']) assert.ok(html.includes(text));
  assert.doesNotMatch(html, /<img|class="tileImage"|class="tileIcon/);
  assert.equal(JSON.stringify(data), before);
});

test('editing preserves empty native image/icon chrome while visitors omit those layout boxes', () => {
  const data = structuredClone(fixture.ratings), before = JSON.stringify(data);
  const editing = shown(data, true), visitor = shown(data);
  assert.equal((editing.match(/class="tileImage"/g) ?? []).length, 3);
  assert.equal((editing.match(/class="tileIcon /g) ?? []).length, 3);
  assert.doesNotMatch(visitor, /tileImage|tileIcon|<img/);
  assert.equal((editing.match(/class="tileAlphanumeral"/g) ?? []).length, 3);
  assert.equal(JSON.stringify(data), before);
});

test('agency cards keep real images and safe anchor links without acquiring the ratings CSS scope', () => {
  const data = structuredClone(fixture.agencies), before = JSON.stringify(data);
  const html = shown(data, false, fixture.agenciesParams);
  assert.equal((html.match(/<img\b/g) ?? []).length, 3);
  assert.equal((html.match(/href="#service-unavailable"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-allianz-card-grid="6a6d5c5594f94090a7f4dcec2ff47726"|<table\b|tileAlphanumeral/);
  assert.equal(JSON.stringify(data), before);
});

test('native identity markers handle both GUID spellings and retain ordinary grid output', () => {
  const data = structuredClone(fixture.ratings);
  data.id = '{6A6D5C55-94F9-4090-A7F4-DCEC2FF47726}';
  data.children.results[1].id = '{5F8F1EF6-DB5A-4F6B-9DE7-A5D155E6C6D3}';
  const html = shown(data);
  assert.ok(html.includes('data-allianz-card-grid="6a6d5c5594f94090a7f4dcec2ff47726"'));
  assert.ok(html.includes('data-allianz-card="5f8f1ef6db5a4f6b9de7a5d155e6c6d3"'));
  assert.equal(markers(html), markers(shown(fixture.ratings)));
  data.id = '{AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA}';
  assert.doesNotMatch(shown(data), /data-allianz-card(?:-grid)?=/);
  if (process.env.CARDGRID_RATINGS_BASELINE) {
    const baseline = loadSource(process.env.CARDGRID_RATINGS_BASELINE);
    for (const editing of [false, true]) {
      for (const [ds, params] of [[fixture.ratings, fixture.ratingsParams], [fixture.agencies, fixture.agenciesParams]]) {
        assert.equal(markers(shown(ds, editing, params)), render(baseline.Default, ds, editing, params));
      }
    }
  }
});

test('every new selector is restricted to the exact saved ratings datasource', () => {
  css.walkRules((rule) => {
    for (const selector of rule.selector.split(',')) assert.ok(selector.trim().startsWith(scope + ' '), selector);
  });
  const table = rules(css, tables)[0];
  assert.equal(decl(table, 'width'), 'auto');
  assert.equal(decl(table, 'border-collapse'), 'collapse');
  assert.equal(decl(table, 'border'), '0');
  const cells = rules(css, `${tables} td`)[0];
  assert.equal(decl(cells, 'padding'), '0');
  assert.equal(decl(cells, 'border'), '0');
  assert.equal(decl(cells, 'overflow-wrap'), 'normal');
  assert.equal(decl(rules(css, `${tables} caption`)[0], 'clip'), 'rect(0, 0, 0, 0)');
  css.walkDecls('display', (node) => assert.notEqual(node.value, 'none', 'authoring chrome remains mounted'));
});

test('circle and Moody’s wide badge match recovered source geometry at both breakpoints', () => {
  const base = rules(css, grade)[0], desktop = rules(css, grade)[1];
  assert.equal(decl(base, 'width'), '40px');
  assert.equal(decl(base, 'height'), '40px');
  assert.equal(decl(base, 'border-radius'), '50%');
  assert.equal(decl(base, 'background-color'), decl(rules(source, '.t-bg-primary-brand')[0], 'background-color'));
  for (const name of ['font-weight', 'font-size', 'font-style', 'line-height', 'color']) {
    assert.equal(decl(base, name), decl(rules(source, '.tile--alphaNumeric .tileIcon .alphaType')[0], name));
  }
  assert.equal(desktop.parent.params, '(min-width: 704px)');
  assert.equal(decl(desktop, 'width'), '64px');
  assert.equal(decl(desktop, 'height'), '64px');
  assert.equal(decl(desktop, 'font-size'), decl(rules(source, '.tile--alphaNumeric .tileIcon .alphaType')[1], 'font-size'));
  const wideBase = rules(css, wide)[0], wideDesktop = rules(css, wide)[1];
  for (const name of ['width', 'border-radius', 'padding']) {
    assert.equal(decl(wideBase, name), decl(rules(source, '.tile--alphaNumeric .tileIcon.-is--wide')[0], name));
  }
  assert.equal(decl(wideDesktop, 'width'), 'auto');
});

// Exact AM Best author-save sample from the verified native completion receipt.
// Normalized payload SHA-256: 8c381c3957196d6c1455db806426e809d5e11add44b7f73c80db03d2a9db96e3.
const authorSave = {
  "before": "<p>\nA+ is the second-highest of 16 possible ratings and was affirmed in March 2026.\n</p>\n<div class=\"c-table__container\">\n<table class=\"c-table c-table--light has-border\">\n    <caption class=\"u-aria-only\">\n    A.M. Best ratings.\n    </caption>\n    <thead class=\"c-table__header\">\n        <tr class=\"c-table__header-row\">\n            <th class=\"c-table__header-cell\" colspan=\"2\">\n            <div class=\"c-table__header-title-block\">\n            <span class=\"c-table__header-title\">\n            Historical Ratings\n            </span>\n            </div>\n            </th>\n        </tr>\n    </thead>\n    <tbody class=\"c-table__content\">\n        <tr class=\"c-table__row\">\n            <td class=\"c-table__cell\">2015 - 2026</td>\n            <td class=\"c-table__cell\">A+</td>\n        </tr>\n        <tr class=\"c-table__row\">\n            <td class=\"c-table__cell\">2005 - 2015</td>\n            <td class=\"c-table__cell\">A</td>\n        </tr>\n        <tr class=\"c-table__row\">\n            <td class=\"c-table__cell\">2005</td>\n            <td class=\"c-table__cell\">A+</td>\n        </tr>\n    </tbody>\n</table>\n</div>",
  "after": "<div class=\"ck-content\"><p>A+ is the second-highest of 16 possible ratings and was affirmed in March 2026.</p><div class=\"c-table__container\"><figure class=\"table\"><table class=\"c-table c-table--light has-border\"><thead class=\"c-table__header\"><tr class=\"c-table__header-row\"><th class=\"c-table__header-cell\" colspan=\"2\"><div class=\"c-table__header-title-block\"><span class=\"c-table__header-title\">Historical Ratings&nbsp;</span></div></th></tr></thead><tbody class=\"c-table__content\"><tr class=\"c-table__row\"><td class=\"c-table__cell\">2015 - 2026</td><td class=\"c-table__cell\">A+</td></tr><tr class=\"c-table__row\"><td class=\"c-table__cell\">2005 - 2015</td><td class=\"c-table__cell\">A</td></tr><tr class=\"c-table__row\"><td class=\"c-table__cell\">2005</td><td class=\"c-table__cell\">A+</td></tr></tbody></table><figcaption class=\"u-aria-only\">A.M. Best ratings.</figcaption></figure></div></div>"
};

const amBestId = '985B164E-A7E4-4B42-A414-10E963BDABCC';
const captionId = 'allianz-rating-985b164ea7e44b42a41410e963bdabcc-caption-1';
const normalizedTable = (caption = 'A.M. Best ratings.', tableAttrs = '', captionAttrs = '') =>
  `<figure class="table"><table class="c-table"${tableAttrs}><tbody><tr><td>2005</td><td>A+</td></tr></tbody></table><figcaption class="u-aria-only"${captionAttrs}>${caption}</figcaption></figure>`;

test('actual author-normalized AM Best table gets its retained caption as a visitor accessible name without modifying source or editing fields', () => {
  const metadata = { fieldId: 'native-body-field', fieldType: 'Rich Text', itemId: amBestId };
  const source = { value: authorSave.after, editable: '<div>SDK editing chrome</div>', metadata };
  const before = JSON.stringify(source);
  const visitor = financialRatingsRichText(source, false, amBestId);
  assert.notEqual(visitor, source);
  assert.match(visitor.value, new RegExp(`aria-labelledby="${captionId}"`));
  assert.match(visitor.value, new RegExp(`figcaption class="u-aria-only" id="${captionId}">A.M. Best ratings.`));
  assert.equal(visitor.metadata, metadata);
  assert.equal(visitor.editable, source.editable);
  assert.equal(JSON.stringify(source), before);
  assert.equal(financialRatingsRichText(source, true, amBestId), source);
  assert.equal(financialRatingsRichText(visitor, false, amBestId), visitor, 'idempotent for a projected field');
  const restored = { ...source, value: authorSave.before };
  assert.equal(financialRatingsRichText(restored, false, amBestId), restored, 'restored native caption keeps its exact HTML');
  assert.equal(financialRatingsRichText(restored, true, amBestId), restored);
});

test('real SDK Ratings rendering supports the actual saved table and preserves three grades and eight rows; unrelated grids remain unchanged', () => {
  const data = structuredClone(fixture.ratings);
  const body = data.children.results[0].fieldCollection.find((field) => field.name === 'body').jsonValue;
  body.value = authorSave.after;
  const before = JSON.stringify(data), visitor = shown(data), editing = shown(data, true);
  assert.match(visitor, new RegExp(`<table class="c-table c-table--light has-border" aria-labelledby="${captionId}">`));
  assert.match(visitor, new RegExp(`<figcaption class="u-aria-only" id="${captionId}">A.M. Best ratings.`));
  assert.equal((visitor.match(/<table\b/g) ?? []).length, 3);
  assert.equal((visitor.match(/<tr\b/g) ?? []).length, 11);
  assert.deepEqual([...visitor.matchAll(/class="tileAlphanumeral">([^<]*)</g)].map((match) => match[1]), ['A+', 'Aa3', 'AA']);
  assert.ok(editing.includes(authorSave.after));
  assert.doesNotMatch(editing, /allianz-rating-[a-f0-9]+-caption-/);
  assert.equal(JSON.stringify(data), before);
  data.id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
  assert.ok(shown(data).includes(authorSave.after));
  assert.doesNotMatch(shown(data), /allianz-rating-[a-f0-9]+-caption-/);
});

test('normalized visitor captions get stable names unique to their actual card and table, including repeated captions', () => {
  const source = { value: normalizedTable() + normalizedTable("Moody's ratings.") };
  const first = financialRatingsRichText(source, false, amBestId).value;
  assert.match(first, /aria-labelledby="allianz-rating-985b164ea7e44b42a41410e963bdabcc-caption-1"/);
  assert.match(first, /aria-labelledby="allianz-rating-985b164ea7e44b42a41410e963bdabcc-caption-2"/);
  assert.equal(financialRatingsRichText(source, false, '{985B164E-A7E4-4B42-A414-10E963BDABCC}').value, first);
  const second = financialRatingsRichText(source, false, '5F8F1EF6-DB5A-4F6B-9DE7-A5D155E6C6D3').value;
  assert.doesNotMatch(second, /985b164ea7e44b42a41410e963bdabcc/);
  assert.match(second, /allianz-rating-5f8f1ef6db5a4f6b9de7a5d155e6c6d3-caption-2/);
});

test('caption IDs and author-supplied table names take precedence over visitor adaptation', () => {
  const existingId = { value: normalizedTable('Caption', '', ' id="existing-caption"') };
  const output = financialRatingsRichText(existingId, false, amBestId).value;
  assert.match(output, /aria-labelledby="existing-caption"/);
  assert.equal((output.match(/id="existing-caption"/g) ?? []).length, 1);
  const quotedId = { value: normalizedTable('Caption', '', ` id='caption&quot;&amp;name'`) };
  assert.match(financialRatingsRichText(quotedId, false, amBestId).value, /aria-labelledby="caption&quot;&amp;name"/);
  for (const aria of [' aria-label="Authored table name"', ' aria-labelledby="author-heading"', ' aria-label=""']) {
    const input = { value: normalizedTable('Caption', aria) };
    assert.equal(financialRatingsRichText(input, false, amBestId), input);
  }
});

test('empty, incomplete, nested, unrelated or already-captioned HTML does not get invented visitor table names', () => {
  const candidates = [
    '', authorSave.before,
    normalizedTable('   '),
    normalizedTable('<span>&nbsp;</span><!-- No caption text -->'),
    normalizedTable().replace('class="table"', 'class="other"'),
    normalizedTable().replace('class="c-table"', 'class="other"'),
    normalizedTable().replace('</figure>', ''),
    normalizedTable().replace('<tbody>', '<caption>Existing table name</caption><tbody>'),
    normalizedTable().replace('<tbody>', '<table><tr><td>Nested</td></tr></table><tbody>'),
    normalizedTable('Caption', '', ' id=""'),
    normalizedTable('Caption', '', ' id="invalid caption id"'),
  ];
  assert.equal(financialRatingsRichText(undefined, false, amBestId), undefined);
  for (const value of candidates) {
    const source = { value };
    assert.equal(financialRatingsRichText(source, false, amBestId), source, value);
  }
  const valid = { value: normalizedTable() };
  assert.equal(financialRatingsRichText(valid, false, 'not-a-native-card-id'), valid);
});
