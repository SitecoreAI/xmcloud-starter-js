import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadSource, require as projectRequire } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const React = projectRequire('react');
const { renderToStaticMarkup } = projectRequire('react-dom/server');
const { SitecoreProvider } = projectRequire('@sitecore-content-sdk/nextjs');
const { Default } = loadSource(path.join(here, '../AllianzRichText.tsx'));
const { projectIndexCategoryBody, INDEX_PAGE_ID } = loadSource(path.join(here, '../../../lib/index-category-projection.ts'));
// Captured configured-SDK Body scalars for three native owners, not a runtime fallback.
const rows = JSON.parse(fs.readFileSync(path.join(here, 'index-category-native-bodies.fixture.json'), 'utf8'));
const anchors = (html) => [...html.matchAll(/<a\b[^>]*>.*?<\/a>/gs)].map(([raw]) => raw);
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const metadata = (id) => Object.freeze({ fieldId: 'test-index-original-body', fieldType: 'Rich Text', itemId: id });

function render(row, { mode = 'normal', layout, pageID = INDEX_PAGE_ID, html = row.body, repeat = false } = {}) {
  const original = Object.freeze({ value: html, metadata: metadata(row.ownerID) });
  const datasource = Object.freeze({ id: row.ownerID, body: Object.freeze({ jsonValue: original }) });
  const before = JSON.stringify(datasource);
  const props = { rendering: { uid: row.renderingUID }, params: { ...(layout ? { layout } : {}) },
    fields: { data: { datasource } } };
  const children = React.createElement(React.Fragment, null, React.createElement(Default, props),
    repeat ? React.createElement(Default, props) : null);
  const output = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'edit', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {}, route: {
        itemId: pageID, name: 'Index options', fields: {}, placeholders: {},
      } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, children));
  assert.equal(JSON.stringify(datasource), before, 'original field object and metadata must remain untouched');
  return { output, original };
}

test('three actual native Bodies retain every heading, answer byte range and complete source anchor', () => {
  assert.equal(rows.length, 3);
  for (const row of rows) {
    const projected = projectIndexCategoryBody({ pageID: INDEX_PAGE_ID, ownerID: row.ownerID,
      renderingUID: row.renderingUID, instanceToken: ':R1:', html: row.body });
    assert.ok(projected);
    assert.equal(projected.disclosureCount, row.expectedCount);
    assert.equal(projected.leadingWhitespace + projected.blocks.map((b) => b.headingHTML + b.answerHTML).join(''), row.body);
    assert.deepEqual(anchors(projected.html), anchors(row.body));
    assert.equal(text(projected.html), text(row.body));
  }
});

test('the native validator explanatory titles retain all twelve accordions and original field ownership', () => {
  let linkCount = 0;
  for (const row of rows) {
    const html = row.body.replace(/ target="_blank">/g, () => {
      linkCount++;
      return ' target="_blank" title="Opens in a new window">';
    });
    assert.equal(text(html), text(row.body));
    for (const mode of ['normal', 'preview', 'edit']) {
      const { output } = render(row, { mode, html });
      assert.equal((output.match(/<details\b/g) || []).length, row.expectedCount);
      assert.deepEqual(anchors(output), anchors(html), 'keep every href, target and explanatory title');
      const visibleMarkup = output.replace(/<code\b[^>]*chrometype="field"[^>]*>.*?<\/code>/gs, '');
      assert.equal(text(visibleMarkup), text(html));
      assert.equal((output.match(/chrometype="field"[^>]*kind="open"/g) || []).length,
        mode === 'edit' ? 1 : 0, 'only the unchanged original Body metadata owns editing');
    }
  }
  assert.equal(linkCount, 11);
});

for (const mode of ['normal', 'preview', 'edit']) {
  for (const layout of [undefined, 'rich-text', 'disclosures']) {
    test(`actual Default preserves content and native ownership: ${mode}/${layout ?? 'tile'}`, () => {
      for (const row of rows) {
        const { output, original } = render(row, { mode, layout });
        assert.equal((output.match(/<details\b/g) || []).length, row.expectedCount);
        assert.equal((output.match(/<summary\b/g) || []).length, row.expectedCount);
        assert.doesNotMatch(output, /<details\b[^>]*\bopen(?:[=>\s])|contenteditable="true"|\[No text in field\]|Mobile image/i);
        assert.deepEqual(anchors(output), anchors(row.body));
        const openChrome = [...output.matchAll(/<code\b[^>]*chrometype="field"[^>]*kind="open">(.*?)<\/code>/gs)];
        assert.equal(openChrome.length, mode === 'edit' ? 1 : 0, 'only original Body owns editing metadata');
        for (const [, encoded] of openChrome) {
          const actual = JSON.parse(encoded.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
          assert.deepEqual(actual, original.metadata);
          assert.doesNotMatch(encoded, /details|summary|allianz-index-category/);
        }
      }
    });
  }
}

test('repeated actual Default placements have unique native disclosure and answer IDs', () => {
  const { output } = render(rows[0], { repeat: true, mode: 'edit' });
  const ids = [...output.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal((output.match(/<details\b/g) || []).length, 12);
  for (const [, id] of output.matchAll(/aria-controls="([^"]+)"/g)) assert.ok(ids.includes(id));
});

test('unexpected scope or formatter structure falls back to the intact original native field', () => {
  const row = rows[1];
  for (const mode of ['normal', 'preview', 'edit']) {
    for (const extra of [{ pageID: '00000000000000000000000000000001' },
      { html: `<div class="ck-content">${row.body}</div>` }, { html: row.body.replace('<h4>', '<h3>').replace('</h4>', '</h3>') }]) {
      const { output } = render(row, { mode, ...extra });
      assert.doesNotMatch(output, /<details|allianz-index-category-accordions/);
      assert.deepEqual(anchors(output), anchors(extra.html ?? row.body));
      if (mode === 'edit') assert.match(output, /test-index-original-body/);
    }
  }
});

test('pure helper rejects new owners, malformed structure, changed headings and unsafe anchors', () => {
  const row = rows[0];
  const input = { pageID: INDEX_PAGE_ID, ownerID: row.ownerID, renderingUID: row.renderingUID,
    instanceToken: ':R1:', html: row.body };
  for (const extra of [{ ownerID: '__proto__' }, { renderingUID: undefined }, { instanceToken: '' },
    { html: row.body.replace('BlackRock iBLD', 'Changed title') },
    { html: row.body.replace('<h4>', '<h4 class="new">') },
    { html: row.body.replace('</p>', '</li>') },
    { html: row.body.replace('https://www.blackrock.com', 'javascript:alert(1)//') },
    { html: row.body.replace('target="_blank">', 'target="_blank" title="Different wording">') },
    { html: row.body.replace('target="_blank">', 'target="_blank" title="Opens in a new window" onclick="alert(1)">') },
    { html: row.body + '<h4>New answer</h4><p>New copy</p>' }])
    assert.equal(projectIndexCategoryBody({ ...input, ...extra }), undefined);
});
