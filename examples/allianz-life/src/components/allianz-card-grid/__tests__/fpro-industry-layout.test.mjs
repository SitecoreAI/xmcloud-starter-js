import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compile, deepFreeze, filename, require } from './icon-appearance-fixture.mjs';

const React = require('react');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync(filename, 'utf8');
const Cards = compile(source);
const modes = ['normal', 'preview', 'editing'];
const pageId = '76934D36-0DC4-5C21-969C-F98A3D915FDE';
const rootId = '59997A3B-71BF-47CD-BA79-457F935F6F7A';
const childIds = ['94FDBC1A-4BB1-4979-B2F9-8F248F3E84E0', '4C3BFD16-58FD-4FE4-B6FB-A4E3EEDB619E',
  '4CF80EF3-55B6-40A2-8095-924523ED3D2F', 'DC3BCE1D-FED9-4B78-8181-26D1CF5EC438',
  '74F51B4D-EE5B-4AD3-9684-A76DE86FBF13'];
// IDs, field roles, heading levels and parameters are native observations.
// Copy, metadata and image transport URLs are synthetic local test data.
const field = (owner, name, value, type = 'Single-Line Text') => ({ jsonValue: { value,
  metadata: { itemId: owner, fieldId: `fixture-fpro-${name}`, fieldType: type, fixtureOnly: true } } });
const entries = current => current.data.children.results;
const valueField = (card, name) => card[name]?.jsonValue
  ?? card.fieldCollection?.find(item => item.name === name)?.jsonValue;
function fixture(collection = false) {
  const children = childIds.map((id, index) => ({ id,
    heading: field(id, 'heading', `Authored industry article ${index + 1}`),
    headingLevel: field(id, 'headingLevel', index === 4 ? 'h3' : 'h4'),
    body: field(id, 'body', '<p>Original authored industry copy.</p>', 'Rich Text'),
    subheading: field(id, 'subheading', '', 'Rich Text'),
    alphanumeral: field(id, 'alphanumeral', ''),
    iconTheme: field(id, 'iconTheme', ''), theme: field(id, 'theme', 'transparent'),
    icon: field(id, 'icon', { src: `/fixture-industry-${index}.svg`, alt: `Authored icon ${index + 1}` }, 'Image'),
    image: field(id, 'image', {}, 'Image'),
    link: field(id, 'link', { href: '' }, 'General Link'),
    ...(index > 2 ? { links: { targetItems: [{ id: `${id}-link`,
      link: field(`${id}-link`, 'link', { href: `/fixture-information-${index}`, text: `Authored link ${index + 1}` }, 'General Link') }] } } : {}),
  }));
  return { itemId: pageId, variant: 'Default', data: { id: rootId, children: { results: collection
    ? children.map(card => ({ id: card.id, links: card.links,
      fieldCollection: Object.entries(card).filter(([name]) => !['id', 'links'].includes(name))
        .map(([name, value]) => ({ name, jsonValue: value.jsonValue })) })) : children } },
  params: { theme: 'transparent', layout: 'stacked', columns: '4', alignment: 'left', spacing: 'none',
    headingLevel: 'h4', paddingTop: 'lg', paddingBottom: 'none', marginBottom: 'xl',
    DynamicPlaceholderId: '7', FieldNames: '{A9538E4C-C44E-5C01-BCF2-0DE4DE3DB2BA}' } };
}
function render(current, mode, components = Cards) {
  deepFreeze(current); const before = JSON.stringify(current);
  const html = renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { siteName: 'allianz-life', locale: 'en', mode: { isEditing: mode === 'editing',
      isNormal: mode === 'normal', isPreview: mode === 'preview' },
    layout: { sitecore: { context: {}, route: { itemId: current.itemId, name: 'FPro native-shaped fixture',
      fields: {}, placeholders: {} } } } }, api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(components[current.variant], { fields: { data: { datasource: current.data } }, params: current.params })));
  assert.equal(JSON.stringify(current), before, 'render preserves fields and metadata'); return html;
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
function sharedArticles(html) {
  const columns = descendants(tree(html)).filter(node => hasClass(node, 'l-grid__column-medium-8') && hasClass(node, 'offset-medium-2'));
  assert.equal(columns.length, 1, 'five articles share one centered source-width column');
  assert.ok(hasClass(columns[0], 'l-grid__column-small-12'));
  for (let ancestor = columns[0].parent; ancestor; ancestor = ancestor.parent) {
    assert.ok(!hasClass(ancestor, 'match-height-row'), 'no ancestor may force the shared column to display:flex');
  }
  assert.equal(columns[0].children.length, 5);
  for (const article of columns[0].children) {
    assert.equal(article.tag, 'article');
    assert.ok(hasClass(article, 'tile--alphaNumeric')); assert.ok(hasClass(article, '-is--split'));
    assert.ok(!hasClass(article, '-is--stacked'));
    assert.equal(descendants(article).filter(n => hasClass(n, 'tileSubGrid__content')).length, 1);
    assert.ok(!descendants(article).some(n => n.tag === 'em' || hasClass(n, 'alphaType')), 'no invented numeral');
  }
  return columns[0].children;
}

for (const mode of modes) test(`${mode} FPro industry uses five source split articles and original SDK fields`, () => {
  for (const collection of [false, true]) {
    const current = fixture(collection), observe = [], html = render(current, mode, compile(source, { observe }));
    const articles = sharedArticles(html);
    assert.equal(html, render(fixture(!collection), mode));
    assert.doesNotMatch(html, /l-grid__column-medium-3|allianz-card-icon-appearance|No text in field|Mobile image/);
    for (const [index, card] of entries(current).entries()) {
      for (const [name, fieldName] of [['Text', 'heading'], ['RichText', 'body'], ['Image', 'icon']]) {
        const original = valueField(card, fieldName), calls = observe.filter(c => c.name === name && c.field === original);
        assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing');
        assert.equal(calls[0].field.metadata.itemId, card.id);
        if (name === 'Text') assert.equal(calls[0].tag, index === 4 ? 'h3' : 'h4');
      }
      assert.equal(descendants(articles[index]).filter(n => n.tag === 'img').length, 1);
      for (const nested of card.links?.targetItems ?? []) {
        const calls = observe.filter(c => c.name === 'Link' && c.field.metadata?.itemId === nested.link.jsonValue.metadata.itemId);
        assert.equal(calls.length, 1); assert.equal(calls[0].editable, mode === 'editing');
        if (mode === 'editing') assert.equal(calls[0].field, nested.link.jsonValue);
      }
    }
  }
});

test('FPro industry preserves authored order, heading levels, clear fields and GUID spellings', () => {
  for (const mode of modes) {
    const normalized = fixture(); normalized.itemId = normalized.itemId.replaceAll('-', '').toLowerCase();
    normalized.data.id = `{${normalized.data.id.toLowerCase()}}`;
    for (const card of entries(normalized)) card.id = `{${card.id.toLowerCase()}}`;
    assert.equal(render(normalized, mode), render(fixture(), mode));
    const reordered = fixture(); entries(reordered).reverse();
    entries(reordered)[0].heading.jsonValue.value = 'Authored sustainability first';
    const observe = [], html = render(reordered, mode, compile(source, { observe })); sharedArticles(html);
    assert.ok(html.indexOf('Authored sustainability first') < html.indexOf('Authored industry article 4'));
    assert.equal(observe.find(c => c.name === 'Text' && c.field === entries(reordered)[0].heading.jsonValue).tag, 'h3');
    const cleared = fixture(), first = entries(cleared)[0];
    first.heading.jsonValue.value = ''; first.body.jsonValue.value = ''; first.icon.jsonValue.value = {};
    first.fieldCollection = ['heading', 'body', 'icon'].map(name => ({ name, jsonValue: { value: 'STALE VALUE' } }));
    const calls = [], clearedHTML = render(cleared, mode, compile(source, { observe: calls })); sharedArticles(clearedHTML);
    assert.doesNotMatch(clearedHTML, /STALE VALUE|No text in field|Mobile image/);
    for (const name of ['heading', 'body', 'icon']) assert.ok(!calls.some(c => c.field === first[name].jsonValue));
    assert.equal((clearedHTML.match(/<img /g) ?? []).length, 4);
  }
});

function* excludedCases() {
  const mutations = [
    ['wrong-page', c => { c.itemId = rootId; }], ['missing-page', c => { delete c.itemId; }],
    ['malformed-page', c => { c.itemId += '-'; }], ['wrong-root', c => { c.data.id = pageId; }],
    ['missing-root', c => { delete c.data.id; }], ['malformed-root', c => { c.data.id += '-'; }],
    ['wrong-child', c => { entries(c)[0].id = rootId; }], ['missing-child-id', c => { delete entries(c)[0].id; }],
    ['malformed-child', c => { entries(c)[0].id += '-'; }], ['missing-card', c => { entries(c).pop(); }],
    ['extra-card', c => { const extra = structuredClone(entries(c)[0]); extra.id = rootId; entries(c).push(extra); }],
    ['duplicate-normalized-child', c => { entries(c)[1].id = `{${entries(c)[0].id.replaceAll('-', '').toLowerCase()}}`; }],
    ['competing-image', c => { entries(c)[0].image.jsonValue.value = { src: '/fixture.jpg', alt: 'Authored image' }; }],
    ['competing-numeral', c => { entries(c)[0].alphanumeral.jsonValue.value = '0'; }],
    ['explicit-card-theme', c => { entries(c)[0].theme.jsonValue.value = 'green-soft'; }],
    ['explicit-icon-theme', c => { entries(c)[0].iconTheme.jsonValue.value = 'primary-brand'; }],
    ['unknown-icon-theme', c => { entries(c)[0].iconTheme.jsonValue.value = 'unknown'; }],
  ];
  for (const [name, value] of [['layout', 'cards'], ['columns', '1'], ['alignment', 'center'],
    ['theme', 'blue-soft'], ['headingLevel', 'h3'], ['iconAppearance', 'white-on-black'],
    ['iconAppearance', 'unknown']]) mutations.push([`param:${name}:${value}`, c => { c.params[name] = value; }]);
  for (const name of ['layout', 'columns', 'alignment', 'theme', 'headingLevel']) mutations.push([`missing-param:${name}`, c => { delete c.params[name]; }]);
  for (const [label, mutate] of mutations) { const current = fixture(); mutate(current); yield { label, ...current }; }
  for (const variant of Object.keys(Cards).filter(name => name !== 'Default' && name !== 'ProfessionalContactPrompt' && typeof Cards[name] === 'function')) {
    yield { label: `named:${variant}`, ...fixture(), variant };
  }
}
// Complete excluded outputs are pinned against release162 BEFORE the repair.
const excludedBaseline = {
  normal: '116:de10a220f3a182161f849c3a366cfc13bc0b0ba2cb8833e08a542d6c50c9333d',
  preview: '116:de10a220f3a182161f849c3a366cfc13bc0b0ba2cb8833e08a542d6c50c9333d',
  editing: '116:68a71767b9222d576c66b60af7379d53b48226448742fc33759b00d07f2791e3',
};
for (const mode of modes) test(`${mode} excluded FPro shapes retain exact release162 output`, () => {
  const digest = createHash('sha256'); let count = 0;
  for (const current of excludedCases()) { digest.update(current.label + '\0' + render(current, mode) + '\0'); count++; }
  assert.ok(count > 25); assert.equal(`${count}:${digest.digest('hex')}`, excludedBaseline[mode]);
});
