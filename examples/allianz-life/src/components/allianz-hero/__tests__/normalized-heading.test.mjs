import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const postcss = require('postcss');
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const field = (name, value, fieldType = 'Rich Text') => ({ jsonValue: { value,
  metadata: { itemId: 'test-only-normalized-hero', fieldId: `test-only-${name}`, fieldType } } });
const datasource = heading => ({ heading: field('heading', heading), body: field('body', 'Native body'),
  desktopImage: field('desktop', { src: '/test-only/hero.jpg', alt: 'Native image', width: '2368', height: '600' }, 'Image') });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const paths = [
  { name: 'product', Component: Hero.Default, params: {} },
  { name: 'home', Component: Hero.Default, params: { layout: 'home' } },
  { name: 'fixed', Component: Hero.FixedProduct, params: {} },
];
const modes = ['normal', 'preview', 'editing'];
function render({ Component, params }, input, mode) {
  const before = JSON.stringify(input);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      siteName: 'allianz-life', layout: { sitecore: { context: {},
        route: { name: 'Biography', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource: input } } })));
  assert.equal(JSON.stringify(input), before, 'render must not rewrite authored fields or metadata');
  return html;
}
const markers = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

for (const route of paths) for (const mode of modes) {
  test(`${route.name}/${mode}: normalized Rich Text keeps authored markup and one level-one heading surface`, () => {
    for (const heading of [
      '<p>Native heading</p>',
      '<div class="ck-content"><p class="native-paragraph"><span class="t-primary-brand"><strong>Native</strong> heading</span></p></div>',
    ]) {
      const input = freeze(datasource(heading)), html = render(route, input, mode);
      assert.ok(html.includes(heading), 'the complete native rich value must remain unchanged');
      assert.equal((html.match(/role="heading" aria-level="1"/g) ?? []).length, 1);
      assert.equal((html.match(/<h1\b/g) ?? []).length, 0, 'block markup must not be nested inside an h1');
      assert.match(html, /<div role="heading" aria-level="1" data-allianz-hero-block-heading="true" class="h1 c-heading c-hero__headline/);
      const headingControls = markers(html).filter(value => value.fieldId === 'test-only-heading');
      assert.deepEqual(headingControls, mode === 'editing' ? [input.heading.jsonValue.metadata] : []);
    }
  });

  test(`${route.name}/${mode}: blank and absent headings remain absent`, () => {
    for (const missing of [false, true]) {
      const input = datasource('');
      if (missing) delete input.heading;
      const html = render(route, freeze(input), mode);
      assert.doesNotMatch(html, /c-hero__headline|role="heading"|data-allianz-hero-block-heading|No text in field/);
      assert.equal(markers(html).filter(value => value.fieldId === 'test-only-heading').length, 0);
    }
  });
}

// These full SDK output pins were recorded from the unchanged base before this
// repair. Plain/inline heading paths retain their accepted DOM and field chrome.
const baseline = {
  product: ['66c0581d5801e009e086e1432bf20eb10211f5c77fd65bb47b8020bf00847efc',
    '32e71e51485b01b0ab1fb541bc9e8299dd181731a16d176ace681a94ad7bd153'],
  home: ['3496e7070b99580dac64fa782de03896dd54f2b9a3171673b0c807a7336f6c72',
    'dd7dfa894b9b1f2570b36795a1380c9ddee8b9da95e51252c8b2bdda2d9fe842'],
  fixed: ['e7c1fe007244658df6ae1e2da9157a34bafbec928397e40acd974f1d7d3c1786',
    '6e413b33faa7a02043fbcf79bab1b3531b6aa68d745fed34ba8819f34e224b2e'],
};
for (const route of paths) for (const mode of modes) {
  test(`${route.name}/${mode}: existing inline heading output remains byte-identical to base`, () => {
    const input = freeze(datasource('Plain <strong>authored</strong> heading'));
    const html = render(route, input, mode);
    assert.equal(createHash('sha256').update(html).digest('hex'), baseline[route.name][mode === 'editing' ? 1 : 0]);
    assert.match(html, /<h1\b[^>]*>Plain <strong>authored<\/strong> heading<\/h1>/);
    assert.doesNotMatch(html, /role="heading"|data-allianz-hero-block-heading/);
  });
}

test('normalized heading typography rules reach only the repaired block surface', () => {
  const css = fs.readFileSync(path.join(sourceRoot, 'components/allianz-hero/AllianzBlockHero.css'), 'utf8');
  const rules = [];
  postcss.parse(css).walkRules(rule => rules.push(rule));
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].selectors, ['.c-hero__headline[data-allianz-hero-block-heading="true"] p']);
  const declarations = rules[0].nodes.filter(node => node.type === 'decl').map(({ prop, value }) => [prop, value]);
  assert.deepEqual(declarations, [['margin', '0'], ['font', 'inherit']]);
});
