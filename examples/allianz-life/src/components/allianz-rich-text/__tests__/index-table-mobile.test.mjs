/** SDK rendering regressions; native responsive acceptance belongs to browser QA. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { Default } = loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const routeId = 'e8e1893a-ff9b-4b4a-81bc-a809693ccf88';
const source = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8'));
const overview = source.routes['/what-we-offer/index-options'].components
  .flatMap((component) => component.fields?.data?.datasource?.children?.results ?? [])
  .find((item) => item.body?.jsonValue?.value?.includes('<table'));
const body = overview.body.jsonValue.value;
// Native CKEditor output keeps the table data but omits the captured CSS classes.
const nativePlainBody = body.replace(/<table\b[^>]*>/, '<table>');
const fieldId = 'test-index-table-body';
const datasource = (value = body) => ({ body: { jsonValue: { value, metadata: {
  itemId: 'test-index-table-datasource', fieldId, fieldType: 'Rich Text',
} } } });
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function render(data, itemId, isEditing = false) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life', locale: 'en',
      layout: { sitecore: { context: {}, route: { name: 'Unrelated route caption', itemId,
        fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Default, { params: { headingLevel: 'h2' }, fields: { data: { datasource: data } } })));
}
const openFields = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/gs)]
  .map((match) => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('native Index Options identity scopes the table body without using names, paths or rendering UIDs', () => {
  const data = freeze(datasource(nativePlainBody));
  for (const id of [routeId, `{${routeId.toUpperCase()}}`, routeId.replaceAll('-', '')]) {
    const html = render(data, id);
    assert.match(html, /class="tileBody u-font-size-xl allianz-index-options-rich-text"/);
    assert.match(html, /tabindex="0"/);
    assert.ok(html.includes(nativePlainBody));
  }
  const ordinary = render(data, undefined);
  for (const id of [undefined, '', 'b79263d8-3920-49bc-ba6d-847345b24b38', 'e8e1893a-ff9b-4b4a-81bc-a809693ccf89']) {
    const html = render(data, id);
    assert.equal(html, ordinary, 'other native pages retain their complete Default output');
    assert.doesNotMatch(html, /allianz-index-options-rich-text/);
    assert.doesNotMatch(html, /tabindex=/);
  }
});

test('plain native and source tables retain their complete original rows, headers and authored links', () => {
  for (const value of [nativePlainBody, body]) {
    const data = freeze(datasource(value)), before = JSON.stringify(data);
    for (const editing of [false, true]) {
      const html = render(data, routeId, editing);
      assert.ok(html.includes(value), 'the original SDK Rich Text body is not rebuilt or rewritten');
      assert.equal((html.match(/<tr\b/g) ?? []).length, 13);
      assert.equal((html.match(/<th\b/g) ?? []).length, 4);
      assert.deepEqual([...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((match) => match[1]),
        [...value.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((match) => match[1]));
      if (value === nativePlainBody) assert.match(html, /<table><thead>|<table>\s+<thead>/);
      assert.equal(html.includes('tabindex="0"'), !editing, 'visitors can focus the scroller; editing retains its caret behavior');
      assert.equal(JSON.stringify(data), before);
    }
  }
});

test('populated and cleared bodies keep original SDK editing identity without inventing table content', () => {
  for (const value of [nativePlainBody, body, '']) {
    const data = freeze(datasource(value)), before = JSON.stringify(data);
    const html = render(data, routeId, true);
    assert.deepEqual(openFields(html).map(({ fieldId: id }) => id), value ? [fieldId] : []);
    if (value) assert.match(html, /class="tileBody u-font-size-xl allianz-index-options-rich-text"/);
    assert.doesNotMatch(html, /tabindex=/);
    assert.equal(JSON.stringify(data), before);
    if (!value) {
      assert.doesNotMatch(html, /<table\b|Index name|Product availability/);
      assert.doesNotMatch(render(data, routeId), /<table\b|allianz-index-options-rich-text/);
    }
  }
  assert.doesNotMatch(render(freeze({}), routeId, true), /<table\b|allianz-index-options-rich-text/);
  for (const value of ['', '<p>Index Options introduction</p>', '<p>&lt;table&gt; is text</p>', '<p>Not a <tabletop> element</p>']) {
    const data = freeze(datasource(value));
    assert.doesNotMatch(render(data, routeId), /tabindex=/, 'non-table and cleared bodies acquire no tab stop');
    assert.deepEqual(openFields(render(data, routeId, true)).map(({ fieldId: id }) => id), value ? [fieldId] : []);
  }
  assert.match(render(freeze(datasource('<TABLE><TR><TH>Header</TH></TR></TABLE>')), routeId), /tabindex="0"/,
    'native table detection is case-insensitive');
});
