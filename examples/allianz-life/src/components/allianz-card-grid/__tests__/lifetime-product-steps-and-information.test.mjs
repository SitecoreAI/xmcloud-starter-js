import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { withLegacyInternalTargets, assertOnlyInternalTargetChanges } from '../../../lib/internal-target-baseline-helper.mjs';
import { compile, deepFreeze, filename, require, sourceRoot } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const Cards = compile(fs.readFileSync(filename, 'utf8'));
const modes = ['normal', 'preview', 'editing'];
const pageId = '8BCD5834-C744-4876-BE6C-CFBBA7E516AA';
const stepsId = '7E8E748E-5064-4765-8F7E-F53F41598820';
const informationId = '3BED4184-604D-4F66-A813-2654C28EA1F6';
const stepIds = ['AFD60A97-9318-4AEB-8D6D-1160398A366A', '2E97C904-AB18-4F86-B23B-E0E923E7C20A',
  '597956DE-EA2F-449D-B868-A814D4E6AB0C', '4C26A07F-CEDE-4C4D-96A5-69B2FA4CD7CB'];
const informationSource = 'https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b64afa0fa0a4f7f87a12e01f2de3ca0?v=cba3d72e';
// Native owner IDs, params and raw content were reconciled on 2026-10-22.
// The retained official HTML SHA94d9ff7e… places all four articles in ONE column.
// Test metadata below is synthetic; it is not a captured native editing payload.
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-lifetime-${name}`, fieldType: type, fixtureOnly: true } } });
const entries = data => data.children.results;
const valueField = (card, name) => card[name]?.jsonValue
  ?? card.fieldCollection?.find(item => item.name === name)?.jsonValue;
function collection(card) {
  return { id: card.id, fieldCollection: Object.entries(card).filter(([name]) => name !== 'id')
    .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) };
}
function fixture(kind = 'steps', named = false) {
  const isSteps = kind === 'steps';
  const root = isSteps ? stepsId : 'EEC16297-C226-4522-9096-5035B412759A';
  const copy = isSteps ? [
    ['Allocate.', '<p>Allocations begin, typically 10-15 years before retirement.</p>'],
    ['Accumulate.', '<p>Contributions and potential credited interest help grow contract value over time.</p>'],
    ['Build future income.', '<p>Two bonuses help increase lifetime income potential.</p>'],
    ['Start income.', '<p>After age 60, participants can choose when to begin receiving guaranteed lifetime income, with opportunities for income increases based on any credited interest.</p>'],
  ] : [['The paycheck may stop. The need for income does not.', '<p>Help participants prepare for retirement with a solution designed to create income they can count on for life.</p><p><a href="https://lp.allianzlife.com/EMContactUS.html?utm_source=website&amp;utm_medium=webpage&amp;utm_campaign=contactus_submit&amp;utm_content=how_it_works">Contact our team</a></p><p><a href="/what-we-offer/annuities/fixed-index-annuities/lifetime-income-plus/insights-and-education" target="_blank" aria-label="Explore the latest insights">Explore the latest insights</a></p>']];
  const children = copy.map(([heading, body], index) => {
    const id = isSteps ? stepIds[index] : informationId;
    return { id, heading: field(id, 'heading', heading), body: field(id, 'body', body, 'Rich Text'),
      subheading: field(id, 'subheading', '', 'Rich Text'), alphanumeral: field(id, 'alphanumeral', isSteps ? String(index + 1) : ''),
      iconTheme: field(id, 'iconTheme', isSteps ? '' : 'primary-brand'), theme: field(id, 'theme', ''),
      headingLevel: field(id, 'headingLevel', isSteps ? 'h4' : 'h2'),
      icon: field(id, 'icon', isSteps ? {} : { src: informationSource, alt: 'Information', width: '24', height: '24', 'dam-id': 'dcOf0FwZRUCwDFK99wSBPg' }, 'Image'),
      image: field(id, 'image', {}, 'Image'), link: field(id, 'link', { href: '' }, 'General Link') };
  });
  return { itemId: pageId, variant: 'Default', data: { id: root, children: { results: named ? children : children.map(collection) } },
    params: { layout: 'stacked', columns: '1', theme: isSteps ? 'transparent' : 'green-soft', alignment: isSteps ? 'left' : 'center',
      headingLevel: isSteps ? 'h4' : 'h2', DynamicPlaceholderId: isSteps ? '9' : '11',
      FieldNames: isSteps ? '{A9538E4C-C44E-5C01-BCF2-0DE4DE3DB2BA}' : 'Default' } };
}
function render(current, mode = 'normal', components = Cards) {
  deepFreeze(current); const snapshot = JSON.stringify(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing', isNormal: mode === 'normal', isPreview: mode === 'preview' },
      layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'Lifetime native-shaped local fixture', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), snapshot, 'render never rewrites the original native-shaped input');
  return html;
}
function tree(html) {
  const root = { tag: '#root', children: [] }, stack = [root];
  for (const match of html.matchAll(/<(\/?)([a-z][\w:-]*)([^>]*?)>/gi)) {
    if (match[1]) { assert.equal(stack.pop().tag, match[2]); continue; }
    const attrs = Object.fromEntries([...match[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map(item => [item[1], item[2]]));
    const node = { tag: match[2], attrs, children: [], parent: stack.at(-1) };
    stack.at(-1).children.push(node);
    if (!/^(?:img|br|hr|input|link|meta|source|area|wbr|embed|param|col|base)$/i.test(match[2]) && !match[3].endsWith('/')) stack.push(node);
  }
  assert.equal(stack.length, 1); return root;
}
const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
const hasClass = (node, value) => (node.attrs?.class ?? '').split(/\s+/).includes(value);

for (const mode of modes) test(`${mode} native four-step fields render the source shared column and sibling badge geometry`, () => {
  const current = fixture(), observe = [], html = render(current, mode, compile(fs.readFileSync(filename, 'utf8'), { observe }));
  const columns = descendants(tree(html)).filter(node => hasClass(node, 'l-grid__column-medium-8') && hasClass(node, 'offset-medium-2'));
  assert.equal(columns.length, 1, 'all four articles share one source-width column');
  assert.ok(hasClass(columns[0], 'l-grid__column-small-12'));
  assert.ok(!hasClass(columns[0].parent, 'match-height-row'), 'source shared column must not inherit forced display:flex');
  assert.equal(columns[0].children.length, 4);
  for (const [index, article] of columns[0].children.entries()) {
    assert.equal(article.tag, 'article'); assert.ok(hasClass(article, 'tile--alphaNumeric')); assert.ok(hasClass(article, '-is--split'));
    const badge = descendants(article).filter(node => hasClass(node, 'tileIcon'));
    assert.equal(badge.length, 1); assert.ok(hasClass(badge[0], 't-bg-primary-brand')); assert.ok(hasClass(badge[0], 't-icon-primary-white'));
    // SDK editing metadata code nodes surround the original em; retain them.
    const glyphs = descendants(badge[0]).filter(node => node.tag === 'em' && hasClass(node, 'alphaType'));
    assert.equal(glyphs.length, 1);
    const original = valueField(entries(current.data)[index], 'alphanumeral');
    const calls = observe.filter(call => call.name === 'Text' && call.field === original);
    assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing'); assert.equal(calls[0].tag, 'em');
  }
  assert.equal((html.match(/class="alphaType"/g) ?? []).length, 4);
});

test('native named/collection fields, valid GUID spellings and authored order/text remain owned by their original fields', () => {
  for (const mode of modes) {
    assert.equal(render(fixture(), mode), render(fixture('steps', true), mode));
    const current = fixture(); current.data.id = '{' + current.data.id.toLowerCase() + '}'; current.itemId = current.itemId.replaceAll('-', '').toLowerCase();
    for (const child of entries(current.data)) child.id = '{' + child.id.toLowerCase() + '}';
    assert.equal(render(current, mode), render(fixture(), mode));
    const ordered = fixture(); ordered.data.children.results.reverse();
    valueField(entries(ordered.data)[0], 'alphanumeral').value = 'IV';
    valueField(entries(ordered.data)[0], 'heading').value = 'Authored fourth step';
    const html = render(ordered, mode);
    assert.ok(html.indexOf('Authored fourth step') < html.indexOf('Build future income.'));
    assert.match(html, /class="alphaType">IV<\/em>/); assert.doesNotMatch(html, /tileIcon -is--wide/);
  }
});

for (const mode of modes) test(`${mode} Information applies a scoped white-on-brand presentation to the exact original SDK Image`, () => {
  for (const appearance of [undefined, '']) {
    const current = fixture('information'); if (appearance !== undefined) current.params.iconAppearance = appearance;
    const observe = [], html = render(current, mode, compile(fs.readFileSync(filename, 'utf8'), { observe }));
    assert.match(html, /class="tileIcon t-bg-primary-brand t-icon-primary-white" data-allianz-card-icon-appearance="white-on-brand"/);
    const original = valueField(entries(current.data)[0], 'icon');
    const calls = observe.filter(call => call.name === 'Image' && call.field === original);
    assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing');
    assert.equal(calls[0].field, original); assert.equal(calls[0].className, 'allianz-card-icon-glyph');
    assert.equal(original.value.src, informationSource); assert.equal(original.value.alt, 'Information');
    assert.equal(original.metadata.fixtureOnly, true);
    assert.equal(render(current, mode), render(fixture('information', true), mode));
  }
});

test('cleared optional numeral never fabricates a badge, and original content remains accessible', () => {
  for (const mode of modes) {
    const current = fixture(); valueField(entries(current.data)[0], 'alphanumeral').value = '';
    const observe = [], html = render(current, mode, compile(fs.readFileSync(filename, 'utf8'), { observe }));
    assert.equal((html.match(/class="alphaType"/g) ?? []).length, 3);
    assert.match(html, /Allocate\./); assert.doesNotMatch(html, /No text in field|Mobile image/);
    assert.equal(observe.filter(call => call.name === 'Text' && call.field === valueField(entries(current.data)[0], 'alphanumeral')).length, 0);
  }
});

function* preservationCases() {
  for (const kind of ['steps', 'information']) {
    const mutations = [
      ['wrong-page', c => { c.itemId = '00000000-0000-0000-0000-000000000001'; }],
      ['missing-page', c => { delete c.itemId; }],
      ['malformed-page', c => { c.itemId = c.itemId + '-'; }],
      ['malformed-root', c => { c.data.id = c.data.id + '-'; }],
      ['missing-root', c => { delete c.data.id; }],
      ['wrong-root', c => { c.data.id = stepsId; if (kind === 'steps') c.data.id = informationId; }],
      ['malformed-child', c => { entries(c.data)[0].id += '-'; }],
      ['missing-child-id', c => { delete entries(c.data)[0].id; }],
      ['wrong-child', c => { entries(c.data)[0].id = '00000000-0000-0000-0000-000000000001'; }],
      ['image', c => { valueField(entries(c.data)[0], 'image').value = { src: '/allianz-assets/retained-photo.jpg', alt: 'Authored photo' }; }],
      ['conflicting-theme', c => { valueField(entries(c.data)[0], 'iconTheme').value = 'transparent'; }],
    ];
    for (const [name, value] of [['layout','image-left'],['columns','2'],['theme','blue-soft'],['alignment','right'],['headingLevel','h3']]) {
      mutations.push([`param-${name}`, c => { c.params[name] = value; }]);
    }
    if (kind === 'steps') mutations.push(
      ['missing-entry', c => { c.data.children.results.pop(); }],
      ['new-entry', c => { const extra = structuredClone(entries(c.data)[0]); extra.id = informationId; entries(c.data).push(extra); }],
      ['duplicate-entry', c => { entries(c.data)[1].id = '{' + entries(c.data)[0].id.replaceAll('-', '').toLowerCase() + '}'; }],
      ['icon', c => { valueField(entries(c.data)[0], 'icon').value = { src: informationSource, alt: 'Authored icon' }; }],
    );
    else {
      mutations.push(['clear-theme', c => { valueField(entries(c.data)[0], 'iconTheme').value = ''; }],
        ['clear-icon', c => { valueField(entries(c.data)[0], 'icon').value = {}; }]);
      for (const appearance of ['white-on-black', 'gray-on-transparent', 'white-on-brand', 'WHITE-ON-BLACK', 'gray-on-transparent ', ' ', 'unknown', null]) {
        mutations.push([`appearance:${String(appearance)}`, c => { c.params.iconAppearance = appearance; }]);
      }
    }
    for (const [label, mutate] of mutations) { const current = fixture(kind); mutate(current); yield { label: `${kind}:${label}`, ...current }; }
    for (const variant of Object.keys(Cards).filter(name => name !== 'Default' && typeof Cards[name] === 'function')) {
      yield { label: `${kind}:variant:${variant}`, ...fixture(kind), variant };
    }
  }
  const model = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../content/native-content.json')));
  for (const [route, page] of Object.entries(model.routes)) for (const [index, component] of page.components.entries()) {
    if (component.componentName !== 'AllianzCardGrid') continue;
    const data = component.fields?.data?.datasource;
    if (!data?.children?.results?.some(card => card.alphanumeral?.jsonValue?.value)) continue;
    yield { label: `numbered-model:${route}:${index}`, data, params: component.params, variant: 'Default', itemId: `source-fixture:${route}` };
  }
  // Exact native six black-role entry/root/theme boundaries; media transports and
  // metadata remain test fixtures, not claims of current field-byte capture.
  for (const [root, id] of [
    ['67303A02-68FC-4E2A-B5D8-3599B7328F98','586B98C8-25F3-4FCD-872A-3C8BCA8523A4'],
    ['67303A02-68FC-4E2A-B5D8-3599B7328F98','3B2C5257-71B6-42E6-9E4A-D090ECBE4EB3'],
    ['67303A02-68FC-4E2A-B5D8-3599B7328F98','07A00A9C-8EFF-4648-BF9E-F4E98A4DB0EA'],
    ['00E9D5C5-8297-45D2-A8EB-E6BEA41E0DDD','2C32D045-6A6B-4327-B3BA-FA4B6FFF554D'],
    ['00E9D5C5-8297-45D2-A8EB-E6BEA41E0DDD','053584CE-A80D-4A17-B832-A844C4F12543'],
    ['9F21E411-5500-456D-96CC-5394D5F94C7B','0A172CE6-CCD1-4DFC-BF3D-0999F14DE1C8'],
  ]) {
    const current = fixture('information'); current.data.id = root; entries(current.data)[0].id = id;
    valueField(entries(current.data)[0], 'iconTheme').value = '';
    yield { label: `six-black-role:${id}`, ...current };
  }
}
// Complete real-SDK outputs captured from sealed16 Card SHA0e80bc42 before style edits.
const baseline = { normal: '7898b6a6f0f35132db6629bca27fc6f3aecaef92d0dd378b2b057402c170b9f6',
  preview: '7898b6a6f0f35132db6629bca27fc6f3aecaef92d0dd378b2b057402c170b9f6',
  editing: 'cfde8aad16e8ce12c4ccf2dddc1f4fddab3e7d3d925a51039e6c99507b21fe48' };
function preservationDigest(mode) {
  const digest = createHash('sha256'); let count = 0;
  for (const current of preservationCases()) {
    const html = render(current, mode), legacy = withLegacyInternalTargets(() => render(current, mode));
    assertOnlyInternalTargetChanges(html, legacy, current.label);
    digest.update(current.label + '\0' + legacy + '\0'); count++;
  }
  return { count, sha256: digest.digest('hex') };
}
for (const mode of modes) test(`${mode} all excluded owners/params/variants and unrelated numeric/icon content retain sealed16 whole output`, () => {
  const result = preservationDigest(mode);
  assert.equal(result.count, 337);
  assert.equal(result.sha256, baseline[mode]);
});

test('only the internal white-on-brand Image receives the source white filter; original two modes and source breakpoints remain', () => {
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardIcons.css'), 'utf8'));
  const declarations = selector => {
    const result = {}; css.walkRules(rule => { if (rule.selector === selector) for (const node of rule.nodes) result[node.prop] = node.value; }); return result;
  };
  assert.equal(declarations('.tileIcon[data-allianz-card-icon-appearance="white-on-brand"] .allianz-card-icon-glyph').filter, 'brightness(0) invert(1)');
  assert.equal(declarations('.tileIcon[data-allianz-card-icon-appearance="white-on-black"] .allianz-card-icon-glyph').filter, 'brightness(0) invert(1)');
  assert.equal(declarations('.tileIcon[data-allianz-card-icon-appearance="gray-on-transparent"] .allianz-card-icon-glyph').filter, 'brightness(0) invert(23.5294117647%)');
  css.walkRules(rule => assert.match(rule.selector, /^\.tileIcon\[data-allianz-card-icon-appearance(?:[=\]])/));
  const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, '../public/allianz-assets/source-style.css'), 'utf8'));
  const sourceValues = (selector, media) => {
    const result = {}; source.walkRules(rule => {
      if (rule.selector.split(',').includes(selector) && (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media)
        for (const node of rule.nodes) if (node.type === 'decl') result[node.prop] = node.value;
    }); return result;
  };
  assert.equal(sourceValues('.l-grid__column-medium-8', '(min-width:704px)')['max-width'], '66.6666666667%');
  assert.equal(sourceValues('.offset-medium-2', '(min-width:704px)')['margin-left'], '16.6666666667%');
  assert.equal(sourceValues('.tile--alphaNumeric.-is--split .tileContent')['flex-direction'], 'column');
  assert.equal(sourceValues('.tile--alphaNumeric.-is--split .tileContent', '(min-width:704px)')['flex-direction'], 'row');
  assert.equal(sourceValues('.tile--alphaNumeric.-is--split .tileContent .tileSubGrid__image', '(min-width:992px)').width, '20%');
});
