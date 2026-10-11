import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadSource, sourceRoot, require, render } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs');
const ts = require('typescript');
const postcss = require('postcss');
const directory = path.join(sourceRoot, 'components/allianz-card-grid');
const filename = path.join(directory, 'AllianzCardGrid.tsx');
const root = path.resolve(sourceRoot, '../../../..');
const prep = path.join(root, 'preparation/accumulator-faq-final-qa-v1');
const facts = JSON.parse(fs.readFileSync(path.join(prep, 'source/SOURCE-CONTENT-LAYOUT.json'), 'utf8'));
const sourceHtml = fs.readFileSync(path.join(prep, 'source/SOURCE-CURRENT.html'), 'utf8');
const components = loadSource(filename);
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';

const parserSource = [
  'import json,sys',
  'from html.parser import HTMLParser',
  'class Parser(HTMLParser):',
  ' def __init__(self):',
  '  super().__init__(convert_charrefs=True); self.nodes=[{"tag":"root","attrs":{},"parent":None,"text":""}]; self.stack=[0]',
  ' def handle_starttag(self,tag,attrs):',
  '  self.nodes.append({"tag":tag,"attrs":dict(attrs),"parent":self.stack[-1],"text":""}); n=len(self.nodes)-1',
  '  if tag not in {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}: self.stack.append(n)',
  ' def handle_startendtag(self,tag,attrs):',
  '  self.handle_starttag(tag,attrs); self.handle_endtag(tag)',
  ' def handle_endtag(self,tag):',
  '  for position in range(len(self.stack)-1,0,-1):',
  '   if self.nodes[self.stack[position]]["tag"]==tag: del self.stack[position:]; break',
  ' def handle_data(self,data):',
  '  if any(self.nodes[n]["tag"] in {"svg","script","style","code"} for n in self.stack): return',
  '  for n in self.stack: self.nodes[n]["text"]+=data',
  'p=Parser();p.feed(sys.stdin.read());print(json.dumps(p.nodes))',
].join('\n');
function dom(markup) {
  const result = spawnSync('python3', ['-c', parserSource], { input: markup, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
const hasClass = (node, name) => (node.attrs.class ?? '').split(/\s+/).includes(name);
const select = (nodes, tag, name) => nodes.filter(node => (!tag || node.tag === tag) && (!name || hasClass(node, name)));
const clean = text => text.replace(/\s+/gu, ' ').trim();
const inside = (nodes, child, ancestor) => {
  let index = child.parent;
  while (index !== null) { if (nodes[index] === ancestor) return true; index = nodes[index].parent; }
  return false;
};
const id = number => '00000000-0000-4000-8000-' + String(number).padStart(12, '0');
const fieldId = name => id(900 + ['heading', 'subheading', 'body', 'link', 'primaryLink', 'image', 'icon'].indexOf(name));
const field = (value, itemId, name, fieldType = 'Single-Line Text') => ({
  jsonValue: { value, metadata: { itemId, fieldId: fieldId(name), fieldType } },
});
const link = (source, owner, name = 'link') => field({
  href: source.href, text: source.label, linktype: source.href.startsWith('#') ? 'anchor' : 'internal',
  target: source.target ?? '', anchor: '', querystring: '', 'aria-label': source.ariaLabel ?? '',
  ...(source.href.startsWith('#') ? {} : { id: '{68D665F3-E5C3-5823-B1B8-D475CAEDB5B1}' }),
}, owner, name, 'General Link');
function child(number, title, body, sourceLink) {
  const owner = id(number);
  return { id: owner, fieldCollection: [
    { name: 'Heading', ...field(title, owner, 'heading') },
    { name: 'Subheading', ...field('', owner, 'subheading', 'Rich Text') },
    { name: 'Body', ...field('<p>' + body + '</p>', owner, 'body', 'Rich Text') },
    { name: 'Image', ...field({}, owner, 'image', 'Image') },
    { name: 'Icon', ...field({}, owner, 'icon', 'Image') },
    { name: 'Link', ...link(sourceLink ?? { href: '', label: '' }, owner) },
    { name: 'Links', jsonValue: [] },
  ] };
}
function navigation() {
  return { children: { results: facts.categoryJumpCards.map((card, index) =>
    child(10 + index, card.headings[0].text, card.bodyText, card.links[0])) } };
}
function prompt() {
  const intro = facts.orderedSections.find(section => section.kind === 'financial-professional-introduction-and-four-icon-prompts');
  const cta = facts.orderedSections.find(section => section.kind === 'separate-Accumulator-CTA-row').links[0];
  const owner = id(30);
  return { heading: field(intro.headings[0].text, owner, 'heading'),
    subheading: field('', owner, 'subheading', 'Rich Text'),
    body: field('<h4>' + intro.headings[1].text + '</h4>', owner, 'body', 'Rich Text'),
    primaryLink: link(cta, owner, 'primaryLink'),
    children: { results: facts.callToActionPromptCards.map((card, index) => child(40 + index, '', card.bodyText)) },
  };
}
const markers = markup => [...markup.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')));

test('source category navigation keeps three H4/body cards with independently owned scalar anchor footers', () => {
  const data = navigation(), nodes = dom(render(components.LifeFaqNavigation, data));
  const tiles = select(nodes, 'article', 'm-axlTile');
  assert.equal(tiles.length, 3);
  assert.equal(select(nodes, 'div', 'l-grid__column-medium-4').length, 3);
  assert.equal(select(nodes, 'div', 'u-margin-bottom-xl').length, 1);
  assert.deepEqual(select(nodes, 'h4').map(node => clean(node.text)), facts.categoryJumpCards.map(card => card.headings[0].text));
  assert.deepEqual(select(nodes, 'div', 'tileBody').map(node => clean(node.text)), facts.categoryJumpCards.map(card => card.bodyText));
  assert.deepEqual(select(nodes, 'a').map(node => node.attrs.href), facts.categoryJumpCards.map(card => card.links[0].href));
  assert.deepEqual(select(nodes, 'a').map(node => node.attrs['aria-label']), facts.categoryJumpCards.map(card => card.links[0].ariaLabel));
  for (const [index, tile] of tiles.entries()) {
    const anchor = select(nodes, 'a').filter(node => inside(nodes, node, tile));
    assert.equal(anchor.length, 1);
    assert.equal(clean(anchor[0].text), facts.categoryJumpCards[index].links[0].label);
    assert.ok(select(nodes, 'footer').some(footer => inside(nodes, anchor[0], footer)));
    assert.ok(!select(nodes, 'a').some(link => inside(nodes, tile, link)), 'A jump link must not wrap the whole card');
  }
  assert.deepEqual(select(nodes, 'img').map(node => node.attrs.src), ['love', 'line-graph', 'pen'].map(name => '/allianz-ui/life-faq/' + name + '.svg'));
});

test('actual native serializer-shaped anchor values provide source ARIA from visible text without changing fields or CTA ARIA', () => {
  const data = navigation();
  const linkFields = data.children.results.map(card => card.fieldCollection.find(field => field.name === 'Link').jsonValue);
  // The actual normal SDK readback exposes exactly these four anchor value keys and neither ARIA alias.
  linkFields.forEach(field => {
    const { href, text } = field.value;
    field.value = { href, text, linktype: 'anchor', anchor: href.slice(1) };
    assert.deepEqual(Object.keys(field.value).sort(), ['anchor', 'href', 'linktype', 'text']);
  });
  const before = JSON.stringify(data);
  for (const editing of [false, true]) {
    const markup = render(components.LifeFaqNavigation, data, editing);
    const nodes = dom(markup), anchors = select(nodes, 'a');
    assert.deepEqual(anchors.map(node => node.attrs.href), facts.categoryJumpCards.map(card => card.links[0].href));
    assert.deepEqual(anchors.map(node => node.attrs['aria-label']), facts.categoryJumpCards.map(card => card.links[0].ariaLabel));
    if (editing) {
      const actual = markers(markup);
      assert.equal(actual.length, 9);
      linkFields.forEach(field => assert.equal(actual.filter(marker => marker.itemId === field.metadata.itemId &&
        marker.fieldId === field.metadata.fieldId).length, 1));
    }
    assert.equal(JSON.stringify(data), before);
  }
  for (const alias of ['ariaLabel', 'aria-label']) {
    linkFields[0].value[alias] = 'Explicit authored accessible label';
    assert.equal(select(dom(render(components.LifeFaqNavigation, data)), 'a')[0].attrs['aria-label'], 'Explicit authored accessible label');
    delete linkFields[0].value[alias];
  }
  const cta = prompt(), value = cta.primaryLink.jsonValue.value;
  // The normal SDK internal CTA has these keys, no custom source ARIA and no anchor fallback.
  cta.primaryLink.jsonValue.value = { href: value.href, id: value.id, linktype: 'internal', target: value.target, text: value.text };
  const ctaBefore = JSON.stringify(cta);
  for (const editing of [false, true]) {
    const markup = render(components.LifeFaqPrompt, cta, editing), anchors = select(dom(markup), 'a');
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].attrs['aria-label'], undefined);
    assert.equal(clean(anchors[0].text), value.text);
    if (editing) {
      const actual = markers(markup);
      assert.equal(actual.length, 7);
      assert.equal(actual.filter(marker => marker.itemId === cta.primaryLink.jsonValue.metadata.itemId &&
        marker.fieldId === cta.primaryLink.jsonValue.metadata.fieldId).length, 1);
    }
    assert.equal(JSON.stringify(cta), ctaBefore);
  }
});

test('source prompt preserves H2 then RichText H4, four body-only cards and a separate following green CTA wrapper', () => {
  const data = prompt(), nodes = dom(render(components.LifeFaqPrompt, data, false, { RenderingIdentifier: 'native-prompt' }));
  const wrappers = select(nodes, 'div', 'l-container--full-width');
  assert.equal(wrappers.length, 2);
  wrappers.forEach(node => assert.ok(hasClass(node, 't-bg-green-soft')));
  assert.equal(wrappers[0].attrs.id, 'native-prompt');
  assert.equal(wrappers[1].attrs.id, undefined);
  assert.equal(select(nodes, 'div', 'l-grid__column-medium-3').length, 4);
  const headings = nodes.filter(node => /^h[1-6]$/.test(node.tag));
  assert.deepEqual(headings.map(node => [node.tag, clean(node.text)]), [['h2', data.heading.jsonValue.value], ['h4', 'Here are some questions you should consider:']]);
  const tiles = select(nodes, 'article', 'm-axlTile');
  assert.equal(tiles.length, 4);
  assert.deepEqual(tiles.map(node => clean(node.text)), facts.callToActionPromptCards.map(card => card.bodyText));
  tiles.forEach(tile => assert.equal(nodes.filter(node => /^h[1-6]$/.test(node.tag) && inside(nodes, node, tile)).length, 0));
  const images = select(nodes, 'img');
  assert.deepEqual(images.map(node => node.attrs.src), ['question', 'family', 'deliver-value', 'money-out', 'list'].map(name => '/allianz-ui/life-faq/' + name + '.svg'));
  assert.ok(nodes.indexOf(images[0]) < nodes.indexOf(headings[0]));
  const anchors = select(nodes, 'a');
  assert.equal(anchors.length, 1);
  assert.ok(inside(nodes, anchors[0], wrappers[1]));
  assert.ok(!inside(nodes, anchors[0], wrappers[0]));
  assert.equal(clean(anchors[0].text), data.primaryLink.jsonValue.value.text);
  assert.equal(anchors[0].attrs.href.toLowerCase(), data.primaryLink.jsonValue.value.href.toLowerCase());
  assert.equal(select(nodes, 'footer').filter(node => inside(nodes, anchors[0], node)).length, 1);
});

test('installed SDK author markers preserve each used native field once while fixed icons never borrow blank native image fields', () => {
  for (const [Component, data, expectedCount] of [[components.LifeFaqNavigation, navigation(), 9], [components.LifeFaqPrompt, prompt(), 7]]) {
    const before = JSON.stringify(data), markup = render(Component, data, true), actual = markers(markup);
    assert.equal(actual.length, expectedCount);
    const expected = data.children.results.flatMap(card => card.fieldCollection.filter(field => field.name === 'Body' ||
      Component === components.LifeFaqNavigation && ['Heading', 'Link'].includes(field.name)).map(field => field.jsonValue.metadata));
    if (Component === components.LifeFaqPrompt) expected.push(...['heading', 'body', 'primaryLink'].map(name => data[name].jsonValue.metadata));
    for (const owner of expected) assert.equal(actual.filter(marker => marker.itemId === owner.itemId && marker.fieldId === owner.fieldId).length, 1);
    assert.ok(actual.every(marker => marker.fieldType !== 'Image'));
    assert.ok(actual.every(marker => marker.fieldId !== fieldId('subheading')));
    if (Component === components.LifeFaqPrompt) assert.equal(actual.filter(marker => marker.fieldId === fieldId('heading')).length, 1);
    assert.equal(JSON.stringify(data), before);
    if (data.subheading) data.subheading.jsonValue.value = 'UNUSED ROOT SUBHEADING';
    data.children.results.forEach(card => {
      card.fieldCollection.find(field => field.name === 'Subheading').jsonValue.value = 'UNUSED CHILD SUBHEADING';
      if (Component === components.LifeFaqPrompt) card.fieldCollection.find(field => field.name === 'Heading').jsonValue.value = 'UNUSED PROMPT CHILD HEADING';
    });
    const populatedUnusedBefore = JSON.stringify(data);
    for (const editing of [false, true]) {
      const output = render(Component, data, editing);
      assert.doesNotMatch(output, /UNUSED ROOT|UNUSED CHILD|UNUSED PROMPT/);
      if (editing) assert.equal(markers(output).length, expectedCount);
    }
    assert.equal(JSON.stringify(data), populatedUnusedBefore);
    select(dom(markup), 'img').forEach(node => {
      assert.equal(node.attrs.alt, '');
      assert.equal(node.attrs['aria-hidden'], 'true');
      assert.equal(node.attrs.tabindex, undefined);
    });
  }
});

test('cleared and changed authored text/links keep metadata, never borrow source labels or fallback to a homepage', () => {
  const data = navigation();
  data.children.results[0].fieldCollection.find(field => field.name === 'Heading').jsonValue.value = 'An authored category';
  data.children.results[0].fieldCollection.find(field => field.name === 'Link').jsonValue.value = { href: '' };
  const visitor = render(components.LifeFaqNavigation, data), editing = render(components.LifeFaqNavigation, data, true);
  assert.match(visitor, /An authored category/);
  assert.doesNotMatch(visitor, />General life insurance</);
  assert.equal(select(dom(visitor), 'a').length, 2);
  assert.ok(markers(editing).some(marker => marker.itemId === id(10) && marker.fieldId === fieldId('link')));
  for (const Component of [components.LifeFaqNavigation, components.LifeFaqPrompt]) {
    const fallback = render(Component, undefined);
    assert.match(fallback, /allianz-missing-data/);
    assert.doesNotMatch(fallback, /allianz-life-faq-glyph|Here are some questions/);
  }
  const p = prompt();
  p.primaryLink.jsonValue.value = { href: '' };
  assert.equal(select(dom(render(components.LifeFaqPrompt, p)), 'div', 'allianz-life-faq-product-cta').length, 0);
  assert.ok(markers(render(components.LifeFaqPrompt, p, true)).some(marker => marker.itemId === id(30) && marker.fieldId === fieldId('primaryLink')));
});

test('React card keys use native owners and every SDK author field retains exact original object identity', () => {
  let editing = true;
  const compiled = new Module(filename);
  compiled.filename = filename; compiled.paths = Module._nodeModulePaths(path.dirname(sourceRoot));
  compiled.require = specifier => {
    if (specifier === '@sitecore-content-sdk/nextjs') return { ...sdk, useSitecore: () => ({ page: { mode: { isEditing: editing } } }) };
    if (specifier.endsWith('.css')) return {};
    const local = /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) return loadSource([local, local + '.ts', local + '.tsx'].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()));
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, filename);
  const leaves = new Set([sdk.Link, sdk.Text, sdk.RichText, sdk.Image]);
  function inspect(element, fields = [], keys = []) {
    if (!element || typeof element !== 'object') return { fields, keys };
    if (Array.isArray(element)) { element.forEach(child => inspect(child, fields, keys)); return { fields, keys }; }
    if (leaves.has(element.type)) {
      fields.push(element.props.field);
      assert.notEqual(element.type, sdk.Image);
    } else if (typeof element.type === 'function') return inspect(element.type(element.props), fields, keys);
    if (element.type === 'div' && /l-grid__column-medium-[34]/.test(element.props?.className ?? '')) keys.push(element.key);
    inspect(element.props?.children, fields, keys);
    return { fields, keys };
  }
  for (const [name, data] of [['LifeFaqNavigation', navigation()], ['LifeFaqPrompt', prompt()]]) {
    const originals = data.children.results.flatMap(card => card.fieldCollection.map(field => field.jsonValue));
    originals.push(...Object.values(data).filter(field => field?.jsonValue).map(field => field.jsonValue));
    const before = JSON.stringify(data);
    const result = inspect(compiled.exports[name]({ fields: { data: { datasource: data } }, params: {} }));
    assert.deepEqual(result.keys, data.children.results.map(card => card.id));
    assert.equal(new Set(result.keys).size, data.children.results.length);
    assert.ok(result.fields.every(field => originals.includes(field)), 'Author SDK field identity must be unchanged');
    assert.equal(JSON.stringify(data), before);
  }
  editing = false;
});

test('accepted Default and all seven strategy exports retain identical visitor/SDK author output', () => {
  const beforeFile = path.join(prep, 'implementation/faq-cards/before/src/components/allianz-card-grid/AllianzCardGrid.tsx');
  const accepted = loadSource(beforeFile);
  const data = prompt();
  const params = { columns: '3', layout: 'cards', headingLevel: 'h4', theme: 'transparent' };
  const names = ['Default', 'StrategyIntro', 'StrategyBrandIntro', 'StrategyIntroSplit', 'StrategyIntroTiles',
    'StrategyIntroFlippedTiles', 'StrategyIntroResources', 'StrategyStackedPair'];
  for (const name of names) for (const editing of [false, true]) {
    assert.equal(render(components[name], data, editing, params), render(accepted[name], data, editing, params), name + ' output changed');
  }
});

test('source-owned 704px columns/icon geometry and source-byte-identical decorative glyph assets remain scoped', () => {
  const source = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'assets/allianz-source.css'), 'utf8'));
  const local = postcss.parse(fs.readFileSync(path.join(directory, 'AllianzLifeFaqCards.css'), 'utf8'));
  const rules = (root, part, media) => {
    const found = [];
    root.walkRules(rule => {
      if (rule.selector.split(',').map(x => x.trim()).includes(part) &&
        (rule.parent.type === 'atrule' ? rule.parent.params : undefined) === media) {
        found.push(Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value])));
      }
    });
    return Object.assign({}, ...found);
  };
  assert.equal(rules(source, '.l-grid__column-medium-4', '(min-width:704px)')['max-width'], '33.3333333333%');
  assert.equal(rules(source, '.l-grid__column-medium-3', '(min-width:704px)')['max-width'], '25%');
  assert.equal(rules(source, '.m-axlTile .tileIcon').width, '40px');
  assert.equal(rules(source, '.m-axlTile .tileIcon', '(min-width:704px)').width, '64px');
  assert.equal(rules(source, '.m-axlTile .tileIcon svg').width, '26px');
  assert.equal(rules(source, '.m-axlTile .tileIcon svg', '(min-width:704px)').width, '40px');
  assert.equal(rules(local, '.allianz-life-faq-cards .tileIcon .allianz-life-faq-glyph').width, '26px');
  assert.equal(rules(local, '.allianz-life-faq-cards .tileIcon .allianz-life-faq-glyph', '(min-width: 704px)').width, '40px');
  assert.equal(rules(local, '.allianz-life-faq-cards .tileIcon.t-icon-primary-white .allianz-life-faq-glyph').filter, 'brightness(0) invert(1)');
  local.walkRules(rule => assert.ok(rule.selector.startsWith('.allianz-life-faq-cards')));
  const crypto = require('node:crypto');
  const allIcons = facts.dependencies.semanticInlineSvgIcons;
  for (const [index, name] of ['love', 'line-graph', 'pen', 'question', 'family', 'deliver-value', 'money-out', 'list'].entries()) {
    const bytes = fs.readFileSync(path.join(sourceRoot, '../public/allianz-ui/life-faq/' + name + '.svg'));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), allIcons[index].svgSha256);
    assert.ok(sourceHtml.includes(bytes.toString()), name + ' asset is not exact source bytes');
  }
});
