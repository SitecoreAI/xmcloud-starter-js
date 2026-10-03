import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { component, contract, render, field, editingIds, sourceRoot } from '../../press-release-archive/__tests__/runtime.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const { parse } = require('graphql');
const { Default } = component('key-figures', 'KeyFigures');
const { keyFigureFields } = contract('key-figures');
const witness = JSON.parse(fs.readFileSync(new URL('./source-key-figures.json', import.meta.url), 'utf8'));
const datasource = { id: 'figures-datasource', children: { total: 3, pageInfo: { hasNext: false, endCursor: null },
  results: witness.figures.map((item, index) => ({ id: `figure-${index}`,
    figure: field(`figure-${index}`, 'Single-Line Text', item.value),
    caption: field(`caption-${index}`, 'Rich Text', `<p>${item.caption}</p>`),
  })) } };

test('source statistics retain capsule markup, figure values and explanations through real SDK rendering', () => {
  const html = render(Default, datasource);
  assert.equal((html.match(/tile--alphaNumeric/g) ?? []).length, 3);
  assert.equal((html.match(/tileIcon -is--wide t-bg-primary-brand t-icon-primary-white/g) ?? []).length, 3);
  assert.deepEqual([...html.matchAll(/<em class="alphaType">([^<]*)<\/em>/g)].map((m) => m[1]), witness.figures.map((item) => item.value));
  for (const item of witness.figures) {
    assert.match(item.html, /tile--alphaNumeric/);
    assert.match(item.html, /tileIcon -is--wide t-bg-primary-brand t-icon-primary-white/);
    assert.match(item.html, /<em class="alphaType">/);
    assert.ok(html.includes(`<p>${item.caption}</p>`));
  }
  assert.equal((html.match(/l-grid__column-medium-4/g) ?? []).length, 3);
  assert.match(html, /tileBody u-font-size-lg/);
  assert.doesNotMatch(html, /tileAlphanumeral|<img\b|<a\b|<h[1-6]\b|service-unavailable|source-key-figures/);
});

test('only the two purposeful child fields are editable; native clear values and metadata survive', () => {
  const blank = { id: 'cleared-figure', figure: field('cleared-number', 'Single-Line Text', ''), caption: field('cleared-caption', 'Rich Text', '') };
  const stored = { ...datasource, children: { ...datasource.children, total: 1, results: [blank] } };
  assert.deepEqual(editingIds(render(Default, stored, true)), ['cleared-caption', 'cleared-number']);
  assert.doesNotMatch(render(Default, stored), /<article|<em|<h[1-6]|<a|scpm/);
  const rich = field('original-caption', 'Rich Text', '<p>Unit <strong>meaning</strong></p>');
  const figure = field('original-figure', 'Single-Line Text', '125+');
  const projected = keyFigureFields({ id: 'collection', fieldCollection: [{ name: 'Figure', jsonValue: figure.jsonValue }, { name: 'CAPTION', jsonValue: rich.jsonValue }] });
  assert.equal(projected.figure.jsonValue, figure.jsonValue);
  assert.equal(projected.caption.jsonValue, rich.jsonValue);
  assert.equal(keyFigureFields({ ...projected, figure: blank.figure }).figure, blank.figure);
});

test('partial, missing or inconsistent connections show an unavailable state without partial statistics', () => {
  const forty = Array.from({ length: 40 }, (_, index) => ({ ...datasource.children.results[0], id: `figure-${index}` }));
  const incomplete = [
    undefined,
    { results: datasource.children.results },
    { ...datasource.children, total: 41, pageInfo: { hasNext: true, endCursor: 'next' }, results: forty },
    { ...datasource.children, total: 4 },
    { ...datasource.children, total: 2 },
    { ...datasource.children, pageInfo: {} },
    { ...datasource.children, results: [datasource.children.results[0], datasource.children.results[0], datasource.children.results[2]] },
    { ...datasource.children, results: [null, ...datasource.children.results.slice(1)] },
  ];
  for (const children of incomplete) {
    for (const editing of [false, true]) {
      const html = render(Default, { ...datasource, children }, editing);
      assert.match(html, /role="status">The key figures are temporarily unavailable/);
      assert.doesNotMatch(html, /tile--alphaNumeric|alphaType|scpm/);
    }
  }
});

test('an explicitly complete empty collection does not invent statistics or author fields', () => {
  const html = render(Default, { ...datasource, children: { total: 0, pageInfo: { hasNext: false }, results: [] } }, true);
  assert.doesNotMatch(html, /temporarily unavailable|<article|<em|scpm/);
});

test('a reusable collection preserves every native child and flows into subsequent three-column rows', () => {
  const figures = Array.from({ length: 7 }, (_, i) => ({ ...datasource.children.results[i % 3], id: `native-${i}` }));
  const html = render(Default, { ...datasource, children: { total: 7, pageInfo: { hasNext: false }, results: figures } });
  assert.equal((html.match(/tile--alphaNumeric/g) ?? []).length, 7);
  assert.equal((html.match(/l-grid__row match-height-row/g) ?? []).length, 3);
  const strange = { ...datasource, heading: field('unused-root', 'Single-Line Text', 'Unused heading') };
  assert.equal(render(Default, strange, false, { theme: 'red', columns: '1', headingLevel: 'h1' }), render(Default, datasource));
  assert.equal(render(Default, datasource, false, { RenderingIdentifier: 'figures' }).includes('id="figures"'), true);
});

test('query projection keeps complete connection metadata and native field objects without image/design fields', () => {
  const text = fs.readFileSync(`${sourceRoot}/components/key-figures/key-figures.graphql`, 'utf8');
  const query = parse(text).definitions[0];
  assert.equal(query.name.value, 'KeyFigures');
  assert.match(text, /children\(first: 40\)/);
  assert.match(text, /total\s+pageInfo \{ hasNext endCursor \}/);
  assert.match(text, /fieldCollection: fields \{ name jsonValue \}/);
  assert.doesNotMatch(text, /theme|headingLevel|image|icon|link|alphanumeral/);
  const author = JSON.parse(fs.readFileSync(`${sourceRoot}/components/key-figures/AUTHOR-CONTRACT.json`, 'utf8'));
  assert.deepEqual(author.rootFields, {});
  assert.deepEqual(Object.keys(author.childFields), ['figure', 'caption']);
});

test('source CSS supplies the number treatment and exact source responsive boundaries', () => {
  const css = postcss.parse(fs.readFileSync(`${sourceRoot}/../public/allianz-assets/source-style.css`, 'utf8'));
  const declarations = (selector) => {
    const rows = []; css.walkRules((rule) => { if (rule.selectors.includes(selector)) rows.push(Object.fromEntries(rule.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value]))); });
    return rows;
  };
  assert.deepEqual(declarations('.tile--alphaNumeric .tileIcon.-is--wide'), [{ width: 'auto', 'border-radius': '40px', padding: '8px 20px' }]);
  const numbers = declarations('.tile--alphaNumeric .tileIcon .alphaType');
  assert.equal(numbers[0].color, '#fff');
  assert.equal(numbers[0]['font-style'], 'normal');
  assert.deepEqual(numbers.map((r) => r['font-size']), ['1.25rem', '2.1875rem']);
  const media = []; css.walkRules((rule) => { if (rule.selector === '.tile--alphaNumeric .tileIcon .alphaType' && rule.parent.type === 'atrule') media.push(rule.parent.params); });
  assert.ok(media.includes('(min-width:704px)'));
});
