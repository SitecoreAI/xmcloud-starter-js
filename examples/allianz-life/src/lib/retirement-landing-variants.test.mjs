import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, require } from '../components/executive-biography/__tests__/sdk-test-helper.mjs';

const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const { editorialBodyClass } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const { EditorialFrame } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial-frame.tsx'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const postcss = require('postcss');
const fixture = JSON.parse(fs.readFileSync(new URL('./retirement-landing-source.fixture.json', import.meta.url), 'utf8'));
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = 'connected';
const scenario = key => fixture.cases.find(entry => entry.key === key);
const field = (name, value, type = 'Single-Line Text') => ({ jsonValue: { value, metadata: { fieldId: `test-${name}`, fieldType: type, itemId: 'test-only-parent-card' } } });
const image = value => value ? { src: value.sourceSrc || `/test-only/${value.sourceSha256}.svg`, alt: value.alt ?? value.purpose ?? '' } : {};
const link = value => value ? { href: value.href, text: value.text, target: value.target, rel: value.rel, ariaLabel: value.ariaLabel } : {};
function data(entry) {
  const footer = entry.blocks.find(block => block.kind === 'collection-footer-link');
  return { primaryLink: field(`${entry.key}-primaryLink`, link(footer?.fields.link), 'General Link'), children: { results: entry.blocks.filter(block => block.kind !== 'collection-footer-link').map(block => {
    const fields = block.fields;
    return { id: block.key,
      ...Object.fromEntries(['heading','subheading','body','theme','iconTheme','headingLevel','alphanumeral'].map(name => [name, field(`${block.key}-${name}`, fields[name] ?? '', ['subheading','body'].includes(name) ? 'Rich Text' : 'Single-Line Text')])),
      image: field(`${block.key}-image`, image(fields.image), 'Image'), icon: field(`${block.key}-icon`, image(fields.icon), 'Image'),
      link: field(`${block.key}-link`, link(fields.link), 'General Link'),
      links: { targetItems: (fields.links || []).map((item, index) => ({ id: `${block.key}-link-${index}`,
        link: field(`${block.key}-link-${index}`, link(item), 'General Link'), icon: field(`${block.key}-link-${index}-icon`, image(item.icon), 'Image') })) },
    };
  }) } };
}
const shown = (entry, native = data(entry), editing = false, params = entry.params) => render(Cards[entry.variant], native, editing, params);
const escaped = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const ids = html => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(match => JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&')).fieldId);
const stacked = scenario('parent-featured-study-weather');
const resources = scenario('parent-risk-resource-cards');
const market = scenario('parent-market-cards');

test('two additive native variants are discoverable through the existing namespace component map', () => {
  for (const name of ['EditorialStacked','EditorialResourceCards']) assert.equal(typeof Cards[name], 'function');
  const map = fs.readFileSync(path.resolve(sourceRoot, '../.sitecore/component-map.ts'), 'utf8');
  assert.match(map, /import \* as AllianzCardGrid from 'src\/components\/allianz-card-grid\/AllianzCardGrid'/);
  assert.match(map, /\['AllianzCardGrid', \{ \.\.\.AllianzCardGrid/);
});
test('stacked cards match two equal source columns, flipped image order, source typography and card spacing', () => {
  const native = data(stacked), before = JSON.stringify(native), html = shown(stacked, native);
  assert.equal((html.match(/class="l-grid__column-medium-6"/g)||[]).length,2);
  assert.equal((html.match(/tile--stackedImage -is--stacked t-bg-grey-soft u-margin-bottom-xl/g)||[]).length,2);
  assert.match(html,/class="l-grid__row match-height-row /);
  assert.equal((html.match(/class="tileBody u-font-size-md"/g)||[]).length,2);
  assert.doesNotMatch(html,/tile--5050|tile--3366|-is--split/);
  for (const block of stacked.blocks) {
    assert.ok(html.includes(`<h2>${escaped(block.fields.heading)}</h2>`));
    assert.ok(html.includes(block.fields.body));
    const heading = html.indexOf(escaped(block.fields.heading));
    const media = html.indexOf(`src="${escaped(block.fields.image.sourceSrc)}"`, heading);
    assert.ok(media > heading, block.key);
  }
  assert.equal(JSON.stringify(native),before);
});
test('every stacked source link owns its footer row and native arrow or PDF icon in exact source order', () => {
  const html = shown(stacked), expected = stacked.blocks.flatMap(block=>block.fields.links);
  assert.equal((html.match(/class="tileLink"/g)||[]).length,6);
  assert.equal((html.match(/class="a-link"/g)||[]).length,6);
  let position = 0;
  for (const item of expected) {
    const found = html.indexOf(`href="${escaped(item.href)}"`,position);
    assert.ok(found >= position,item.href);position=found+1;
    assert.ok(html.includes(`aria-label="${escaped(item.ariaLabel)}"`));
    assert.ok(html.includes(`<span class="a-link__text">${escaped(item.text)}</span>`));
    assert.ok(html.includes(`/test-only/${item.icon.sourceSha256}.svg`));
  }
  assert.equal((html.match(/target="_blank"/g)||[]).length,2);
  assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,2);
  assert.equal((html.match(/71880b9b4ba2a6fa552ada126537ee53a746c7e7b23f8c5d18632ff5748b348b.svg"/g)||[]).length>=2,true);
});
test('explicitly cleared ordered links never borrow a stale scalar link and missing icons never invent an arrow', () => {
  const native=data(stacked);native.children.results[0].links.targetItems=[];
  native.children.results[0].link=field('stale',{href:'/about',text:'STALE'},'General Link');
  native.children.results[1].links.targetItems[1].icon=field('empty-pdf-icon',{},'Image');
  const html=shown(stacked,native);assert.doesNotMatch(html,/STALE/);
  assert.equal((html.match(/class="tileLink"/g)||[]).length,3);
  assert.equal((html.match(/class="a-link__icon"/g)||[]).length,2);
  assert.doesNotMatch(html,/<svg/);
});
test('stacked native query fieldCollection projection preserves values and ordered per-link metadata', () => {
  const native=data(stacked);const projected={...native,children:{results:native.children.results.map(card=>({id:card.id,
    fieldCollection:Object.entries(card).filter(([name])=>!['id','links'].includes(name)).map(([name,value])=>({name,jsonValue:value.jsonValue})).concat([{name:'links',jsonValue:card.links.targetItems.map(item=>({id:item.id,fields:{link:item.link.jsonValue,icon:item.icon.jsonValue}}))}])
  }))}};
  assert.equal(shown(stacked,projected),shown(stacked,native));
  const editor=shown(stacked,projected,true);
  assert.ok(ids(editor).includes('test-s02-article-01-link-1-icon'));
  assert.ok(ids(editor).includes('test-s02-article-00-image'));
});
test('stacked cleared native media stays editable and public decorative images have explicit empty alt', () => {
  const native=data(stacked), normal=shown(stacked,native);
  const images=normal.match(/<img\b[^>]*class="c-image__img c-teaser__image-img"[^>]*>/g)||[];
  assert.equal(images.length,2);for(const img of images)assert.match(img,/alt=""/);
  native.children.results[0].image.jsonValue.value={};
  const before=JSON.stringify(native), publicHtml=shown(stacked,native), editor=shown(stacked,native,true);
  assert.equal((publicHtml.match(/class="tileImage"/g)||[]).length,1);
  assert.ok(ids(editor).includes('test-s02-article-00-image'));
  assert.match(editor,/scEmptyImage/);assert.equal(JSON.stringify(native),before);
});
test('four resource cards preserve exact h4/body/image/category content and a sibling collection footer row', () => {
  const html=shown(resources),native=data(resources),before=JSON.stringify(native);
  assert.match(html,/o-cards o-cards__col4/);assert.equal((html.match(/class="m-card"/g)||[]).length,4);
  assert.equal((html.match(/class="m-card__footer"/g)||[]).length,4);
  assert.equal((html.match(/class="cardCategory">Article<\/span>/g)||[]).length,4);
  assert.equal((html.match(/class="l-grid__row/g)||[]).length,2);
  assert.match(html,/<\/div><\/div><\/div><div class="l-grid__row"><div class="l-grid__column-medium-12 u-text-center"><footer><div class="tileLink u-margin-top-md u-margin-bottom-md">/);
  assert.doesNotMatch(html,/class="m-card__header u-text-center"/);
  for(const block of resources.blocks.filter(block=>block.kind==='linked-card')){
    assert.ok(html.includes(`<h4>${escaped(block.fields.heading)}</h4>`));assert.ok(html.includes(block.fields.body));
    assert.ok(html.includes(`href="${escaped(block.fields.link.href)}"`));
    assert.ok(html.includes(`/test-only/${block.fields.icon.sourceSha256}.svg`));
  }
  assert.match(html,/aria-label="See more articles"/);assert.match(html,/>See more articles<\/span>/);
  assert.ok(html.includes(`d="${fixture.sourceRightArrowPath}"`));
  assert.equal(JSON.stringify(native),before);
});
test('market resource cards have centered semantic h4 titles without invented images, category labels or footer links', () => {
  const html=shown(market);assert.match(html,/o-cards o-cards__col3/);
  assert.equal((html.match(/class="m-card__header u-text-center"/g)||[]).length,3);
  for(const block of market.blocks)assert.ok(html.includes(`<h4>${escaped(block.fields.heading)}</h4>`));
  assert.doesNotMatch(html,/<img|m-card__footer|cardCategory|tileLink|See more articles/);
  assert.equal((html.match(/class="m-card__body"><\/div>/g)||[]).length,3);
  assert.equal((html.match(/class="l-grid__row/g)||[]).length,1);
});
test('resource clears preserve native editor controls and keep unlinked public card content static', () => {
  const native=data(resources);native.primaryLink.jsonValue.value={};
  const first=native.children.results[0];first.link.jsonValue.value={};first.icon.jsonValue.value={};first.subheading.jsonValue.value='';
  const before=JSON.stringify(native),html=shown(resources,native),editor=shown(resources,native,true);
  assert.doesNotMatch(html,/See more articles|class="tileLink/);
  assert.equal((html.match(/class="m-card__footer"/g)||[]).length,3);
  assert.match(html,/<div class="m-card">/);assert.ok(html.includes(escaped(first.heading.jsonValue.value)));
  for(const id of ['test-parent-risk-resource-cards-primaryLink','test-s04-linked-card-00-link','test-s04-linked-card-00-icon','test-s04-linked-card-00-subheading'])assert.ok(ids(editor).includes(id),id);
  assert.equal(JSON.stringify(native),before);
});
test('new resource cards preserve author alt, safe targets, queries/fragments and disabled service policy', () => {
  const native=data(resources);const first=native.children.results[0];
  first.image.jsonValue.value.alt='A meaningful authored image';
  first.link.jsonValue.value={href:'/about?tag=one&tag=two&q=a%23b#old',querystring:'native=2',anchor:'new',target:'_blank',rel:'author',ariaLabel:'Authored card label'};
  native.children.results[1].link.jsonValue.value={href:'https://external.example/',target:'_blank'};
  native.primaryLink.jsonValue.value={href:'/for-financial-professionals/resources?view=all#articles',text:'More',target:'_blank',rel:'nofollow'};
  const html=shown(resources,native);
  assert.match(html,/alt="A meaningful authored image"/);
  assert.match(html,/href="\/about\?tag=one&amp;tag=two&amp;q=a%23b&amp;native=2#new"/);
  assert.match(html,/rel="author noopener noreferrer"/);assert.match(html,/aria-label="Authored card label"/);
  assert.match(html,/href="#service-unavailable"/);assert.doesNotMatch(html,/href="https:\/\/external/);
  assert.match(html,/rel="nofollow noopener noreferrer"/);
});
test('resource native fieldCollection card fields preserve optional category and link editing metadata', () => {
  const native=data(resources),projected={...native,children:{results:native.children.results.map(card=>({id:card.id,
    fieldCollection:Object.entries(card).filter(([name])=>!['id','links'].includes(name)).map(([name,value])=>({name,jsonValue:value.jsonValue}))
  }))}};
  assert.equal(shown(resources,projected),shown(resources,native));
  assert.ok(ids(shown(resources,projected,true)).includes('test-s04-linked-card-00-subheading'));
});
test('large body is finite and preserves all earlier size fallbacks', () => {
  for(const [value,expected] of [[undefined,'tileBody'],['source-default','tileBody'],['medium','tileBody u-font-size-md'],['large','tileBody u-font-size-lg'],['extra-large','tileBody u-font-size-xl'],['large injected-class','tileBody'],['lg','tileBody']])assert.equal(editorialBodyClass(value),expected);
  const entry=scenario('parent-learn-allianz'),html=shown(entry);
  assert.match(html,/class="tileBody u-font-size-lg"/);assert.ok(html.includes(entry.blocks[0].fields.body));
});
test('match-height row is an exact finite opt-in; existing row/content wrapper behavior stays intact', () => {
  const frame=params=>renderToStaticMarkup(React.createElement(EditorialFrame,{params},React.createElement('span',null,'Content')));
  for(const value of [undefined,'','0','true','match-height-row'])assert.doesNotMatch(frame({matchHeightRow:value}),/match-height-row/);
  assert.match(frame({matchHeightRow:'1',paddingBottom:'xl'}),/l-grid__row match-height-row u-padding-bottom-xl/);
  assert.equal(frame({container:'content',matchHeightRow:'1'}),'<span>Content</span>');
  assert.match(frame({container:'row',matchHeightRow:'1',RenderingIdentifier:'industry'}),/class="l-grid__row match-height-row " id="industry"/);
  const entry=scenario('parent-industry-tiles');assert.match(shown(entry),/l-grid__row match-height-row u-padding-bottom-xl/);
});
test('new category image CSS matches source SVG dimensions and remains isolated from existing cards', () => {
  const css=postcss.parse(fs.readFileSync(path.join(sourceRoot,'components/allianz-card-grid/AllianzEditorialCards.css'),'utf8'));
  const rule=css.nodes.find(node=>node.selector==='.allianz-editorial-resource-cards .m-card__footer > img');
  assert.ok(rule);assert.deepEqual(rule.nodes.map(node=>[node.prop,node.value]),[['width','2rem'],['height','2rem']]);
  const sourceCss=fs.readFileSync(path.join(sourceRoot,'assets/allianz-source.css'),'utf8');assert.match(sourceCss,/\.m-card__footer svg\{width:2rem;height:2rem\}/);
});
test('missing datasources do not invent landing content in either visitor or editor mode', () => {
  for(const variant of ['EditorialStacked','EditorialResourceCards'])for(const editing of [false,true]){
    const html=render(Cards[variant],undefined,editing,{});assert.match(html,/Add a datasource for AllianzCardGrid/);assert.doesNotMatch(html,/Article|See more|<img/);
  }
});
