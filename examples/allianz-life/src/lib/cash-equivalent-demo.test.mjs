import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, metadata, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { Default: LegacyRichText } = loadSource(path.join(sourceRoot, 'components/allianz-legacy-rich-text/AllianzLegacyRichText.tsx'));
const { getFixturePage, fixtureContent } = loadSource(path.join(sourceRoot, 'lib/allianz-page.ts'));
const { cashEquivalentDemoBody, isCashEquivalentPage, CASH_DEMO_LINK_NOTICE } = loadSource(path.join(sourceRoot, 'lib/cash-equivalent-demo.ts'));
const paths = ['/what-we-offer/annuities/investment-strategies/cash-equivalent', '/new-york/annuities/investment-strategies/cash-equivalent'];
const sourcePath = path.join(sourceRoot, '../content/native-content.json');
const beforeSource = fs.readFileSync(sourcePath);
const pdfLinks = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"/g)].map((match) => match[1]);
const placeholderLinks = /<a\b[^>]*href\s*=\s*["']#(?:demo-unavailable|service-unavailable)?["']/i;

function renderBlock(routePath, block, editing, preview = false) {
  const page = getFixturePage(routePath.slice(1).split('/'));
  page.layout.sitecore.context.itemPath = routePath;
  page.mode = { ...page.mode, isEditing: editing, isNormal: !editing && !preview, isPreview: preview };
  const data = structuredClone(block.fields.data.datasource);
  data.body.jsonValue.metadata = metadata('cash-body', 'Rich Text');
  const before = JSON.stringify(data);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(LegacyRichText, { params: block.params, fields: { data: { datasource: data } } })));
  assert.equal(JSON.stringify(data), before, 'Visitor adaptation must not change the authored data');
  return html;
}

test('captured/native source identity scopes Cash treatment to exactly the two intended pages', () => {
  const enabled = Object.keys(fixtureContent.routes).filter((route) => isCashEquivalentPage(getFixturePage(route.slice(1).split('/')).layout.sitecore.route.fields, route));
  assert.deepEqual(enabled.sort(), [...paths].sort());
  const identity = { shellFamily: { value: 'legacy' }, legacySharedKey: { value: 'new-york' }, sourceBodyId: { value: 'page-cash-equivalent' }, sourceBodyClasses: { value: 'page-cash-equivalent new-york' } };
  for (const key of Object.keys(identity)) {
    assert.equal(isCashEquivalentPage({ ...identity, [key]: { value: 'different' } }, paths[1]), false, key);
  }
  assert.equal(isCashEquivalentPage(undefined, paths[1]), false);
  assert.equal(isCashEquivalentPage(identity, '/about'), false, 'Copied metadata cannot adapt an unrelated page');
  assert.equal(isCashEquivalentPage(identity, paths[0]), false, 'Market identity must agree with the route');
  for (const path of [undefined, null, `${paths[1]}/extra`, `${paths[1]}?copy=1`, `/other-site/en${paths[1]}`]) assert.equal(isCashEquivalentPage(identity, path), false);
  assert.equal(isCashEquivalentPage(identity, `/allianz-life/en${paths[1]}`), true, 'Known internal rewrite retains exact scope');
  assert.equal(isCashEquivalentPage(identity, `/sitecore/content/allianz/allianz-life/Home${paths[1]}`), true, 'Known native root retains exact scope');
  assert.equal(isCashEquivalentPage(identity, `/sitecore/content/other/allianz-life/Home${paths[1]}`), false);
});

for (const mode of ['fixture', 'connected']) for (const route of paths) {
  test(`${mode}: ${route} has inert references, one honest notice and all seven exact PDFs`, () => {
    const originalMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
    try {
      const blocks = fixtureContent.routes[route].components.filter((block) => block.componentName === 'AllianzLegacyRichText');
      const originals = blocks.map((block) => block.fields.data.datasource.body.jsonValue.value);
      const html = blocks.map((block) => renderBlock(route, block, false)).join('');
      assert.equal(originals.join('').match(/href="#"/g).length, 8);
      assert.doesNotMatch(html, placeholderLinks);
      assert.equal((html.match(/class="allianz-cash-demo-reference"/g) || []).length, 10);
      assert.equal((html.match(/role="note"/g) || []).length, 1);
      assert.ok(html.includes(CASH_DEMO_LINK_NOTICE));
      for (const label of ['SEC website', 'member FINRA', 'DCA Money Market Account', 'AZL Government Money Market Fund']) assert.ok(html.includes(label));
      assert.match(html, /<span class="allianz-cash-demo-reference">\s*<img[^>]+alt="BlackRock"/);
      assert.equal(pdfLinks(html).length, 7);
      assert.deepEqual(pdfLinks(html), pdfLinks(originals.join('')));
      assert.doesNotMatch(html, /role="link"|aria-disabled|tabindex=|This service is unavailable|contact customer service/i);
      for (const block of blocks) {
        const editing = renderBlock(route, block, true);
        assert.ok(editing.includes(block.fields.data.datasource.body.jsonValue.value));
        assert.match(editing, /test-cash-body-field/);
        assert.doesNotMatch(editing, /allianz-cash-demo-reference|allianz-cash-demo-notice/);
      }
      const preview = blocks.map((block) => renderBlock(route, block, false, true)).join('');
      assert.doesNotMatch(preview, placeholderLinks);
      assert.deepEqual(pdfLinks(preview), pdfLinks(html));
    } finally {
      if (originalMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
      else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = originalMode;
    }
  });
}

test('adapter preserves metadata, real anchors, genuine destinations, logo markup and non-Cash/editor identity', () => {
  const field = { value: '<a href="#" target="_blank"><img src="/logo.gif" alt="BlackRock"></a><a href=\'#demo-unavailable\'>SEC website</a><a href=#service-unavailable>member FINRA</a><a href="#details">Jump</a><a href="/about">About</a><a>Without destination</a>', metadata: metadata('cash-body', 'Rich Text') };
  const original = JSON.stringify(field);
  assert.strictEqual(cashEquivalentDemoBody(field, false).field, field);
  const result = cashEquivalentDemoBody(field, true);
  assert.equal(result.showNotice, true);
  assert.strictEqual(result.field.metadata, field.metadata);
  assert.doesNotMatch(result.field.value, placeholderLinks);
  assert.match(result.field.value, /<img src="\/logo.gif" alt="BlackRock">/);
  assert.match(result.field.value, /<a href="#details">Jump<\/a>/);
  assert.match(result.field.value, /<a href="\/about">About<\/a>/);
  assert.match(result.field.value, /<a>Without destination<\/a>/);
  assert.equal(JSON.stringify(field), original);
  const documents = { value: '<a href="/allianz-assets/details.pdf">Daily Details</a>' };
  assert.strictEqual(cashEquivalentDemoBody(documents, true).field, documents);
  assert.equal(cashEquivalentDemoBody(documents, true).showNotice, false);
  for (const empty of [undefined, { value: '' }]) {
    assert.strictEqual(cashEquivalentDemoBody(empty, true).field, empty);
    assert.equal(cashEquivalentDemoBody(empty, true).showNotice, false);
  }
});

test('captured evidence bytes are unchanged by the visitor adaptation', () => {
  assert.ok(fs.readFileSync(sourcePath).equals(beforeSource));
});
