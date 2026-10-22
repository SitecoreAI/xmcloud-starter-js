import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, deepFreeze, filename, metadata, require, sourceRoot } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const source = fs.readFileSync(filename, 'utf8');
const Cards = compile(source);
const model = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json'), 'utf8'));
const routeId = '76934D36-0DC4-5C21-969C-F98A3D915FDE';
const ownerIds = ['7A125B9D-CBD6-49A8-A0BA-37C3F863500C', '78F7238C-5E70-4A33-933C-DE17E6CBF02A'];
const modes = ['normal', 'preview', 'editing'];
const field = (owner, name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-${owner}-${name}`, fieldType } } });

// Current official public source GET, 2026-10-21T23:57:26Z. Bounded capture SHA256:
// dcb6650451ffe6d214d1e853cdf8affc7bcf8d6723799c3c5fa626e24dd14767.
// Source: https://www.allianzlife.com/for-financial-professionals
// These values also match the older saved model. No financial wording is updated.
const sourceBadges = [
  { text: '#1', wide: false }, { text: '4.2M', wide: true }, { text: '156K', wide: true },
  { text: '176B', wide: true }, { text: 'A+', wide: false }, { text: '97M', wide: true },
];

function row(index = 0, collection = false) {
  const component = model.routes['/for-financial-professionals'].components[index + 3];
  const data = structuredClone(component.fields.data.datasource);
  data.id = ownerIds[index];
  for (const [i, card] of data.children.results.entries()) {
    // Known native owner boundaries with synthetic test field metadata. Captured
    // model/card GUIDs are source fixtures, not assertions of current CMS fields.
    for (const [name, value] of Object.entries(card)) {
      if (value?.jsonValue) value.jsonValue.metadata = {
        itemId: `fixture-card-${index}-${i}`, fieldId: `fixture-${index}-${i}-${name}`,
        fieldType: ['body', 'subheading'].includes(name) ? 'Rich Text'
          : ['icon', 'image'].includes(name) ? 'Image' : name === 'link' ? 'General Link' : 'Single-Line Text',
      };
    }
    if (collection) {
      card.fieldCollection = Object.entries(card).filter(([, value]) => value?.jsonValue)
        .map(([name, value]) => ({ name, jsonValue: value.jsonValue }));
      for (const entry of card.fieldCollection) delete card[entry.name];
    }
  }
  return { data, params: { ...component.params, RenderingIdentifier: `fixture-fpro-row-${index}` } };
}

function render(Component, data, params, mode = 'normal', itemId = routeId) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: {
      isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview',
    }, layout: { sitecore: { context: {}, route: { itemId, name: 'Local statistics fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: data === undefined ? undefined : { data: { datasource: data } } })));
}

const hash = text => createHash('sha256').update(text).digest('hex');
const numeral = card => card.alphanumeral?.jsonValue
  ?? card.fieldCollection.find(entry => entry.name === 'alphanumeral').jsonValue;
const badgeBlocks = html => [...html.matchAll(/<div class="tileIcon(?: -is--wide)? t-bg-primary-brand t-icon-primary-white">([\s\S]*?)<\/div>/g)];
const withoutBadgeGraft = html => html.replace(/ tile--alphaNumeric/g, '')
  .replace(/<div class="tileIcon(?: -is--wide)? t-bg-primary-brand t-icon-primary-white">([\s\S]*?)<\/div>/g,
    (_, inner) => inner.replace(/<em class="alphaType">([\s\S]*?)<\/em>/g, '<span class="tileAlphanumeral">$1</span>'));

// Exact pre-fix 36a3c445 output hashes captured before editing the renderer.
// Aggregates include ordered case labels and unmodified complete real-SDK HTML;
// no git history, audit-folder fixture or reverse patch is needed to run tests.
const baseline = {
  normal: { target: 'c6443b6954a9dd1cfbbd24c73421a2aa9359428daf302e816c2f3a044ea2c423', unaffected: '2e2299e4030b3d7363dd320cc6a2a728c06213e2aab4e10696e9ca2d560da5aa' },
  preview: { target: 'c6443b6954a9dd1cfbbd24c73421a2aa9359428daf302e816c2f3a044ea2c423', unaffected: '2e2299e4030b3d7363dd320cc6a2a728c06213e2aab4e10696e9ca2d560da5aa' },
  editing: { target: 'c817aa35a994ab34a3aa49b1ccf869c380eb7ca7085951824f489155b1d27e04', unaffected: 'ddab4402a2375e882efc62a76ba27ae7095d2b5e46fea621e778bcd5687789f9' },
};

test('six source-backed badges use the existing stacked alphaNumeric classes and native Text in all modes', () => {
  for (const mode of modes) for (const collection of [false, true]) {
    for (const index of [0, 1]) {
      const original = row(index, collection), before = JSON.stringify(original);
      const observe = [], instrumented = compile(source, { observe });
      deepFreeze(original);
      const html = render(instrumented.Default, original.data, original.params, mode);
      const blocks = badgeBlocks(html);
      assert.equal(blocks.length, 3, `${mode}: source badge count`);
      assert.equal((html.match(/<article[^>]*tile--alphaNumeric -is--stacked/g) ?? []).length, 3);
      assert.equal((html.match(/tileSubGrid__image"><div class="tileIcon/g) ?? []).length, 3);
      for (const [i, block] of blocks.entries()) {
        const expected = sourceBadges[index * 3 + i], originalField = numeral(original.data.children.results[i]);
        assert.equal(block[0].includes('-is--wide'), expected.wide, expected.text);
        assert.ok(block[0].includes(`<em class="alphaType">${expected.text}</em>`));
        const calls = observe.filter(call => call.name === 'Text' && call.field === originalField);
        assert.equal(calls.length, 1, 'Original field object reaches the real SDK exactly once');
        assert.equal(calls[0].tag, 'em'); assert.equal(calls[0].editable, mode === 'editing');
        assert.equal(calls[0].field.metadata, originalField.metadata);
        assert.equal(metadata(html).filter(entry => entry.fieldId === originalField.metadata.fieldId).length,
          mode === 'editing' ? 1 : 0, 'Native editing identity remains on the numeral');
      }
      assert.doesNotMatch(html, /\[No (?:text|image) in field\]|Additional content fields|allianz-editorial-card-field/);
      assert.equal(JSON.stringify(original), before, 'Raw values, field collections and metadata remain unchanged');
    }
  }
});

test('authored values drive circle/wide presentation without a six-string lookup or raw field rewrite', () => {
  for (const value of ['9', '88', '123', ' NEW ', '😀😀', '😀😀😀']) {
    const original = row(), card = original.data.children.results[0];
    card.alphanumeral.jsonValue.value = value;
    original.data.children.results = [card];
    deepFreeze(original); const before = JSON.stringify(original);
    for (const mode of modes) {
      const html = render(Cards.Default, original.data, original.params, mode), blocks = badgeBlocks(html);
      assert.equal(blocks.length, 1);
      assert.equal(blocks[0][0].includes('-is--wide'), [...value.trim()].length > 2);
      assert.ok(blocks[0][0].includes(`<em class="alphaType">${value}</em>`));
    }
    assert.equal(JSON.stringify(original), before);
  }
});

test('explicit source em survives fields without metadata and retains any original editable payload', () => {
  const original = row();
  for (const card of original.data.children.results) {
    delete card.alphanumeral.jsonValue.metadata;
    card.alphanumeral.jsonValue.editable = '<span>Unchanged native editable transport fixture</span>';
  }
  deepFreeze(original); const before = JSON.stringify(original);
  for (const mode of modes) {
    const observe = [], instrumented = compile(source, { observe });
    const html = render(instrumented.Default, original.data, original.params, mode);
    assert.equal(badgeBlocks(html).length, 3);
    for (const [i, card] of original.data.children.results.entries()) {
      assert.ok(html.includes(`<em class="alphaType">${sourceBadges[i].text}</em>`));
      const calls = observe.filter(call => call.name === 'Text' && call.field === card.alphanumeral.jsonValue);
      assert.equal(calls.length, 1); assert.equal(calls[0].tag, 'em');
      assert.equal(calls[0].field.editable, card.alphanumeral.jsonValue.editable);
    }
  }
  assert.equal(JSON.stringify(original), before);
});

test('canonical native fields override stale fieldCollection media, numeral and theme without changing raw fields', () => {
  const original = row();
  for (const card of original.data.children.results) card.fieldCollection = [
    { name: 'icon', jsonValue: { value: { src: '/fixture-stale-icon.svg', alt: 'Stale icon' } } },
    { name: 'image', jsonValue: { value: { src: '/fixture-stale-image.jpg', alt: 'Stale image' } } },
    { name: 'alphanumeral', jsonValue: { value: 'Stale number' } },
    { name: 'iconTheme', jsonValue: { value: 'transparent' } },
  ];
  deepFreeze(original); const before = JSON.stringify(original);
  for (const mode of modes) {
    const html = render(Cards.Default, original.data, original.params, mode);
    assert.equal(badgeBlocks(html).length, 3);
    assert.doesNotMatch(html, /fixture-stale-|Stale number/);
  }
  assert.equal(JSON.stringify(original), before);
});

test('numeric zero keeps the legacy empty-field behavior while authored string zero gets a source circle', () => {
  for (const value of [0, '0']) {
    const original = row(); original.data.children.results = original.data.children.results.slice(0, 1);
    const originalField = original.data.children.results[0].alphanumeral.jsonValue;
    originalField.value = value; deepFreeze(original); const before = JSON.stringify(original);
    for (const mode of modes) {
      const html = render(Cards.Default, original.data, original.params, mode), blocks = badgeBlocks(html);
      assert.equal(blocks.length, typeof value === 'string' ? 1 : 0);
      if (value === '0') {
        assert.doesNotMatch(blocks[0][0], /-is--wide/);
        assert.ok(blocks[0][0].includes('<em class="alphaType">0</em>'));
      } else assert.ok(!html.includes(originalField.metadata.fieldId));
    }
    assert.equal(JSON.stringify(original), before);
  }
});

function* unaffectedCases() {
  for (const [route, data] of Object.entries(model.routes)) for (const [index, component] of data.components.entries()) {
    const ds = component.fields?.data?.datasource;
    if (route !== '/for-financial-professionals' && component.componentName === 'AllianzCardGrid'
      && ds?.children?.results?.some(card => card.alphanumeral?.jsonValue?.value)) {
      yield { label: `model:${route}:${index}`, data: ds, params: component.params, itemId: `source-fixture:${route}` };
    }
  }
  const controls = [
    ['wrong-route', current => { current.itemId = 'unrelated-native-route'; }],
    ['missing-route', current => { current.itemId = null; }],
    ['wrong-owner', current => { current.data.id = 'unrelated-native-owner'; }],
    ['missing-owner', current => { delete current.data.id; }],
    ['ratings-owner', current => { current.data.id = '6A6D5C55-94F9-4090-A7F4-DCEC2FF47726'; }],
    ['transparent-theme', current => { for (const card of current.data.children.results) card.iconTheme.jsonValue.value = 'transparent'; }],
    ['empty-theme', current => { for (const card of current.data.children.results) card.iconTheme.jsonValue.value = ''; }],
    ['missing-theme', current => { for (const card of current.data.children.results) delete card.iconTheme; }],
    ['empty-number', current => { for (const card of current.data.children.results) card.alphanumeral.jsonValue.value = ''; }],
    ['whitespace-number', current => { for (const card of current.data.children.results) card.alphanumeral.jsonValue.value = '  '; }],
    ['missing-number', current => { for (const card of current.data.children.results) delete card.alphanumeral; }],
    ['other-layout', current => { current.params.layout = 'image-left'; }],
    ['other-columns', current => { current.params.columns = '2'; }],
    ['actual-icon', current => { for (const card of current.data.children.results) card.icon = field(card.id, 'icon', { src: '/fixture-existing-icon.svg', alt: 'Existing icon' }, 'Image'); }],
    ['actual-image', current => { for (const card of current.data.children.results) card.image = field(card.id, 'image', { src: '/fixture-existing-image.jpg', alt: 'Existing image' }, 'Image'); }],
  ];
  for (const [label, change] of controls) {
    const current = { ...row(), itemId: routeId }; change(current);
    yield { label, ...current };
  }
  const ratings = JSON.parse(fs.readFileSync(new URL('./financial-ratings.fixture.json', import.meta.url), 'utf8'));
  yield { label: 'actual-native-ratings', data: ratings.ratings, params: ratings.ratingsParams, itemId: 'unrelated-native-ratings-route' };
  const partner = row(); partner.data.id = '6E198E6D-8694-4BEA-88A9-702C6C07C5EA'; partner.params.columns = '4';
  for (const card of partner.data.children.results) {
    card.alphanumeral.jsonValue.value = ''; card.heading.jsonValue.value = ''; card.body.jsonValue.value = '';
    card.image = field(card.id, 'image', { src: `/fixture-existing-partner-${card.id}.jpg`, alt: '' }, 'Image');
  }
  yield { label: 'native-partner-branch', ...partner, itemId: 'E8E1893A-FF9B-4B4A-81BC-A809693CCF88' };
  for (const name of Object.keys(Cards).filter(name => name !== 'Default' && typeof Cards[name] === 'function')) {
    yield { label: `other-variant:${name}`, ...row(), itemId: routeId, variant: name };
  }
}

for (const mode of modes) {
  test(`${mode} target outside the exact badge graft retains pre-fix whole-output baseline`, () => {
    const original = [0, 1].map(index => row(index)); deepFreeze(original);
    const output = original.map(({ data, params }) => withoutBadgeGraft(render(Cards.Default, data, params, mode))).join('\0');
    assert.equal(hash(output), baseline[mode].target);
  });
  test(`${mode} unaffected routes, fields, image icons, ratings, partners and other variants retain pre-fix whole-output baseline`, () => {
    const digest = createHash('sha256'); let cases = 0;
    for (const current of unaffectedCases()) {
      deepFreeze(current); const before = JSON.stringify(current);
      const html = render(Cards[current.variant ?? 'Default'], current.data, current.params, mode, current.itemId);
      digest.update(current.label + '\0' + html + '\0');
      assert.equal(JSON.stringify(current), before, current.label); cases++;
    }
    assert.equal(cases, 213, '109 model groups, 15 controls, 2 native branches, 87 named variants');
    assert.equal(digest.digest('hex'), baseline[mode].unaffected);
  });
}

test('native GUID spelling is normalized while all nonidentity CMS parameters remain unchanged', () => {
  for (const mode of modes) for (const index of [0, 1]) {
    const canonical = row(index), alternate = row(index);
    alternate.data.id = '{' + alternate.data.id.toLowerCase() + '}';
    assert.equal(render(Cards.Default, alternate.data, alternate.params, mode, '{' + routeId.toLowerCase() + '}'),
      render(Cards.Default, canonical.data, canonical.params, mode));
  }
});

test('existing source CSS supplies 40/64 circles, wide badges, 20/35 text and full-width stacked content', () => {
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const rules = selector => { const found = []; css.walkRules(rule => {
    if (rule.selector.split(',').map(value => value.trim()).includes(selector)) found.push(rule);
  }); assert.ok(found.length, selector); return found; };
  const declaration = (rule, name) => rule.nodes.find(node => node.prop === name)?.value;
  const icons = rules('.m-axlTile .tileIcon');
  assert.equal(declaration(icons[0], 'width'), '40px'); assert.equal(declaration(icons[0], 'height'), '40px');
  assert.equal(declaration(icons[0], 'border-radius'), '50%');
  assert.equal(declaration(icons[1], 'width'), '64px'); assert.equal(declaration(icons[1], 'height'), '64px');
  assert.equal(icons[1].parent.params, '(min-width:704px)');
  const brand = rules('.t-bg-primary-brand')[0];
  assert.equal(declaration(brand, 'background-color'), '#003781');
  assert.equal(brand.nodes.find(node => node.prop === 'background-color').important, true);
  const wide = rules('.tile--alphaNumeric .tileIcon.-is--wide')[0];
  for (const [name, value] of [['width', 'auto'], ['border-radius', '40px'], ['padding', '8px 20px']]) assert.equal(declaration(wide, name), value);
  const numbers = rules('.tile--alphaNumeric .tileIcon .alphaType');
  for (const [name, value] of [['font-weight', '900'], ['font-size', '1.25rem'], ['font-style', 'normal'],
    ['line-height', 'normal'], ['align-self', 'center'], ['color', '#fff']]) assert.equal(declaration(numbers[0], name), value);
  assert.equal(declaration(numbers[1], 'font-size'), '2.1875rem');
  assert.equal(numbers[1].parent.params, '(min-width:704px)');
  const stacked = '.tile--alphaNumeric.-is--stacked .tileContent .tileSubGrid__content';
  const generic = '.tile--alphaNumeric .tileContent .tileSubGrid__content';
  assert.equal(declaration(rules(stacked)[0], 'width'), '100%');
  assert.equal(declaration(rules(generic)[1], 'width'), '80%');
  assert.equal((stacked.match(/\./g) ?? []).length, 4);
  assert.equal((generic.match(/\./g) ?? []).length, 3, 'Stacked100% wins by CSS specificity at the desktop breakpoint');
});
