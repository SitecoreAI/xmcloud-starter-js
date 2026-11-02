import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata, require } from '../executive-biography/__tests__/sdk-test-helper.mjs';

const { InvestmentOptionsTitle, InvestmentOptionsContent, InvestmentOptionsDisclosures } =
  loadSource(path.join(sourceRoot, 'components/allianz-rich-text/AllianzRichText.tsx'));
const variants = [InvestmentOptionsTitle, InvestmentOptionsContent, InvestmentOptionsDisclosures];
const sourceHref = 'https://www.allianzlife.com/what-we-offer/annuities/investment-strategies/Cash-Equivalent';
const localHref = '/what-we-offer/annuities/investment-strategies/cash-equivalent';
const sourceBody = `<p>Compare <strong>investment options</strong> and <a href="${sourceHref}" target="_blank" rel="author" data-fund="azl">AZL® Government Money Market Fund</a>.</p>`;
const media = '<p><img src="/allianz-assets/fund-logo.png" alt="Fund logo" /><a href="https://edge.sitecorecloud.io/example/media/fund.pdf" target="_blank" rel="author">Fund report</a></p>';
const body = sourceBody + media;
const visitorBody = body.replace(`href="${sourceHref}" target="_blank"`, `href="${localHref}" target=""`);
const field = (value, name, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(`investment-${name}`, type) } });
const datasource = () => ({
  heading: field('Investment options', 'heading', 'Single-Line Text'),
  subheading: field('<p>Choose an investment option.</p>', 'subheading'),
  body: field(body, 'body'),
});

function withMode(mode, run) {
  const previous = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = mode;
  try { run(); } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
    else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = previous;
  }
}

function preview(Component, data) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: false, isNormal: false, isPreview: true }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Investment options', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params: {}, fields: { data: { datasource: data } } })));
}

test('the fund destination is a captured local public route', () => {
  const routes = JSON.parse(fs.readFileSync(path.resolve(sourceRoot, '../content/public-route-index.json'), 'utf8'));
  assert.equal(routes[localHref], localHref);
  const content = JSON.parse(fs.readFileSync(path.resolve(sourceRoot, '../content/native-content.json'), 'utf8'));
  assert.ok(content.routes[localHref].components.length > 0);
});

for (const mode of ['fixture', 'connected']) {
  test(`${mode}: all investment variants localize the fund in normal and preview rendering and preserve content/media`, () => withMode(mode, () => {
    for (const Component of variants) {
      const data = datasource(), before = JSON.stringify(data);
      for (const html of [render(Component, data), preview(Component, data)]) {
        assert.ok(html.includes(visitorBody));
        assert.doesNotMatch(html, /href="https:\/\/www\.allianzlife\.com/);
        assert.ok(html.includes(media));
      }
      assert.equal(JSON.stringify(data), before);
    }
  }));

  test(`${mode}: all investment variants preserve original authoring values and native field metadata`, () => withMode(mode, () => {
    for (const Component of variants) {
      const data = datasource(), before = JSON.stringify(data);
      const html = render(Component, data, true);
      assert.ok(html.includes(body));
      assert.ok(html.includes(data.subheading.jsonValue.value));
      for (const name of ['heading', 'subheading', 'body']) assert.ok(html.includes(`test-investment-${name}-field`));
      assert.equal(JSON.stringify(data), before);
    }
  }));
}
