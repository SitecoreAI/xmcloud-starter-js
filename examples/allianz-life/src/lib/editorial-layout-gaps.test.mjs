import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sdk = require('@sitecore-content-sdk/nextjs');
const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const componentMap = new Map();
const modules = new Map();
function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const Cards = loadSource(path.join(sourceRoot, 'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Hero = loadSource(path.join(sourceRoot, 'components/allianz-hero/AllianzHero.tsx'));
const Article = loadSource(path.join(sourceRoot, 'components/allianz-article/AllianzArticle.tsx'));
const Accordion = loadSource(path.join(sourceRoot, 'components/allianz-accordion/AllianzAccordion.tsx'));
const Section = loadSource(path.join(sourceRoot, 'components/allianz-editorial-section/AllianzEditorialSection.tsx'));
const { safeEditorialRichText } = loadSource(path.join(sourceRoot, 'lib/allianz-editorial.ts'));
const Product = loadSource(path.join(sourceRoot, 'components/product-disclosures/ProductDisclosures.tsx'));
const Legal = loadSource(path.join(sourceRoot, 'components/legal-disclosures/LegalDisclosures.tsx'));
const components = { ProductDisclosures: Product, LegalDisclosures: Legal, AllianzHero: Hero, AllianzArticle: Article, AllianzCardGrid: Cards, AllianzAccordion: Accordion, AllianzEditorialSection: Section };
for (const [name, variants] of Object.entries(components)) componentMap.set(name, variants);
const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/editorial-layout-gaps.fixture.json')));
const page = (editing = false) => ({mode: {isEditing: editing, isNormal: !editing, isPreview: false}, siteName: 'allianz-life', layout: {sitecore: {context: {}, route: {name: 'Editorial test', fields: {}, placeholders: {}}}}});
function field(name, value) { return {jsonValue: {value, metadata: {itemId: 'test-only-editorial', fieldId: `test-only-${name}`, fieldType: ['body','subheading'].includes(name) ? 'Rich Text' : name==='link' ? 'General Link' : name.includes('Image') || name==='icon' || name==='image' ? 'Image' : 'Single-Line Text'}}}; }
function fields(raw) {return Object.fromEntries(Object.entries(raw || {}).filter(([name]) => name !== 'links').map(([name, value]) => [name, field(name, value?.assetIntentKey ? {src:`/test-only/${value.assetIntentKey}.svg`,alt:value.alt ?? value.purpose ?? ''} : value ?? (['image','icon','desktopImage','mobileImage','primaryLink','secondaryLink','link'].includes(name) ? {} : ''))]));}
function datasource(r) {return {...fields(r.fields), ...(r.children?.length ? {children:{results:r.children.map((child,index)=>({id:`test-only-child-${index}`, ...fields(child.fields), ...(child.fields.links ? {links:{targetItems:(child.referencedItems ?? []).map((ref,i)=>({id:`test-only-link-${i}`,...fields(ref.fields)}))}}:{})}))}}:{})};}
function props(data, editing=false, params={}) {return {fields:{data:{datasource:data}},params,page:page(editing),rendering:{uid:'test-only-rendering'}};}
function render(Component, input) {return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page:input.page,api:{},componentMap,loadImportMap:async()=>({})},React.createElement(Component,input)));}
function children(renders) {return renders.map((r,i)=>({uid:`test-only-rendering-${i}`,componentName:r.componentName,params:{...r.params,FieldNames:r.variant},dataSource:`test-only-datasource-${i}`,fields:{data:{datasource:datasource(r)}}}));}
function sectionInput(section, renders, editing=false, dynamic='31') {return {...props(undefined,editing,{...section.parameterIntent,DynamicPlaceholderId:dynamic}),rendering:{uid:`test-only-section-${dynamic}`,componentName:'AllianzEditorialSection',params:{...section.parameterIntent,DynamicPlaceholderId:dynamic},placeholders:{'allianz-editorial-section-{*}':children(renders)}}};}

const block = (slug, id) => fixtures.blocks.find(b => b.route.endsWith(slug) && (!id || b.sourceBlock===id));
const renderBlock = (b, editing=false, overrides={}) => render(components[b.componentName][b.variant], props(datasource(b),editing,{...b.params,...overrides}));
const count = (s,re) => (s.match(re)||[]).length;

test('source-backed fixture covers twelve held routes and both shared half-column rows',()=>{
 assert.equal(new Set(fixtures.blocks.map(b=>b.route)).size,12);
 assert.equal(fixtures.structuralSections.length,2);
 assert.equal(fixtures.blocks.filter(b=>b.sourceContract.some(c=>c.classes.includes('-is--framed')) && b.params.layout==='image-right').length,9);
});
for (const b of fixtures.blocks) test(`${b.route.split('/').pop()} ${b.sourceBlock}: source structure, exact fields, immutable SDK input`,()=>{
 const d=datasource(b),before=JSON.stringify(d);
 const html=render(components[b.componentName][b.variant],props(d,false,b.params));
 const editing=render(components[b.componentName][b.variant],props(d,true,b.params));
 assert.equal(JSON.stringify(d),before);
 const articleClasses=[...html.matchAll(/<article class="([^"]*)"/g)].map(m=>m[1].split(/\s+/));
 if(b.componentName==='AllianzCardGrid'){
  assert.equal(articleClasses.length,b.children.length);
  b.sourceContract.forEach((c,i)=>{for(const cls of c.classes)assert.ok(articleClasses[i].includes(cls),`missing ${cls}`);for(const cls of c.columnClasses)assert.ok(html.includes(cls),`missing ${cls}`);});
  b.children.forEach((child,i)=>{
   if(child.fields.heading) assert.ok(html.includes(`<${child.fields.headingLevel}>`));
   for(const name of ['heading','subheading','body','icon','alphanumeral', ...(b.params.layout==='image-right' ? ['image'] : [])])assert.ok(editing.includes(`test-only-${name}`),`missing ${name} editing chrome`);
   if(child.fields.body)assert.ok(editing.includes(child.fields.body),`body ${i} changed`);
   if(child.fields.subheading)assert.ok(editing.includes(child.fields.subheading),`subheading ${i} changed`);
   if(child.fields.alphanumeral)assert.ok(html.includes(`>${child.fields.alphanumeral}</em>`));
  });
 } else {assert.ok(editing.includes(b.fields.body));assert.ok(html.includes('l-grid__column-medium-6'));}
});

test('weather has two independent PDF footer rows in order and keeps SDK links and safe blank targets',()=>{
 const b=block('3-reasons-to-talk-to-your-clients-about-the-weather');const html=renderBlock(b),editing=renderBlock(b,true);
 assert.equal(count(html,/<div class="tileLink">/g),2);
 assert.match(html,/<\/a><\/div><div class="tileLink"><a /);
 const refs=b.children[0].referencedItems;
 refs.forEach(r=>{assert.ok(html.includes(r.fields.link.text));assert.ok(html.includes(`aria-label="${r.fields.link.ariaLabel}"`));assert.ok(editing.includes(r.fields.link.href));});
 assert.ok(html.indexOf('Fact Sheet')<html.indexOf('Client Brochure'));
 assert.equal(count(html,/target="_blank"/g),2);assert.equal(count(html,/rel="noopener noreferrer"/g),2);
 const css=fs.readFileSync(path.join(sourceRoot,'../public/allianz-assets/source-style.css'),'utf8');
 assert.match(css,/\.tileLink\s*\+\s*\.tileLink\s*\{[^}]*margin:\s*16px 0 0/);
 assert.equal(count(renderBlock(b,false,{linkLayout:'invalid'}),/<div class="tileLink">/g),1);
});

test('niche-market headings use only h4 and the empty destination remains visible and inert',()=>{
 const b=block('creating-tailored-strategies-for-business-owners-in-niche-markets','s06-article-00');
 const html=renderBlock(b),editing=renderBlock(b,true);const label=b.children[0].referencedItems[0].fields.link.text;
 assert.match(html,/<h4>Knowing your clients<\/h4>/);assert.ok(html.includes(label));
 assert.doesNotMatch(html.replace(/<link\b[^>]*>/g,''),/<a\b|href=|tabindex=|role="link"/);assert.match(html,/<span class="a-link">/);
 assert.match(editing,/test-only-link/);assert.ok(editing.includes(label));
 assert.ok(!renderBlock(b,false,{emptyLink:'invalid'}).includes(label));
});

test('empty-label opt-in preserves ordered clearing, scalar fallback, cleared editing, and escaping',()=>{
 const b=structuredClone(block('creating-tailored-strategies-for-business-owners-in-niche-markets','s06-article-00'));
 const d=datasource(b);const card=d.children.results[0];card.link=field('link',{href:'/about',text:'Stale fallback'});card.links={targetItems:[]};
 assert.doesNotMatch(render(Cards.EditorialTiles,props(d,false,b.params)),/Stale fallback|a-link__text/);
 delete card.links;assert.match(render(Cards.EditorialTiles,props(d,false,b.params)),/Stale fallback/);
 card.link=field('link',{href:'',text:'<img src=x onerror=alert(1)>'});
 const inert=render(Cards.EditorialTiles,props(d,false,b.params));assert.match(inert,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(inert,/<img src="x"/);
 card.link=field('link',{href:'',text:''});const empty=render(Cards.EditorialTiles,props(d,false,b.params));assert.doesNotMatch(empty,/<footer/);assert.match(render(Cards.EditorialTiles,props(d,true,b.params)),/test-only-link/);
});

test('wide statistics retain native 27%, 23%, 29% values, em tags and stacked image-free scaffold',()=>{
 const b=block('small-business','s02-article-00'),html=renderBlock(b);
 assert.equal(count(html,/tile--alphaNumeric -is--stacked/g),3);assert.equal(count(html,/tileIcon -is--wide/g),3);
 assert.deepEqual([...html.matchAll(/<em class="alphaType">([^<]*)<\/em>/g)].map(m=>m[1]),['27%','23%','29%']);
 assert.doesNotMatch(html,/-is--split|tile--stackedImage|class="tileImage"/);
 assert.equal(count(html,/l-grid__column-medium-4/g),3);assert.equal(count(html,/tileBody u-font-size-lg/g),3);
 const defaultHtml=renderBlock(b,false,{statisticStyle:'invalid'});assert.doesNotMatch(defaultHtml,/-is--wide|<em|tile--alphaNumeric/);
});

test('two framed business callouts retain one row with independent six-column children',()=>{
 const b=block('small-business','s06-article-00'),html=renderBlock(b);
 assert.equal(count(html,/l-grid__row/g),1);assert.equal(count(html,/l-grid__column-medium-6/g),2);assert.equal(count(html,/-is--framed -is--stacked/g),2);
 assert.doesNotMatch(html,/tile--stackedImage|tileImage/);
});

for(const section of fixtures.structuralSections) test(`${section.sourceSection}: one shared row and two independently editable native Article columns`,()=>{
 const renders=section.childDatasourceIntentKeys.map(key=>fixtures.blocks.find(b=>`${b.route}#${b.sourceBlock}`===key));assert.ok(renders.every(Boolean));
 const input=sectionInput(section,renders),html=render(Section.Default,input),editing=render(Section.Default,sectionInput(section,renders,true));
 assert.equal(count(html,/l-grid__row/g),1);assert.equal(count(html,/l-grid__column-medium-6/g),2);
 assert.equal(count(html,/o-richTextEditor__wrapper/g),2);assert.equal(count(html,/l-container--full-width/g),1);
 assert.equal(count(editing,/chrometype="rendering"/g),4);assert.match(editing,/chrometype="placeholder"/);
 for(const b of renders)assert.ok(editing.includes(b.fields.body));
});

test('finite options reject class/heading injection and existing unsafe destinations retain visitor policy',()=>{
 const b=structuredClone(block('creating-tailored-strategies-for-business-owners-in-niche-markets','s06-article-00'));
 b.children[0].fields.headingLevel='h1';b.children[0].referencedItems[0].fields.link={href:'javascript:alert(1)',text:'Unsafe',target:'_blank'};
 const html=renderBlock(b,false,{framed:'unsafe',statisticStyle:'unsafe',linkLayout:'unsafe',columns:'unsafe',sourceWidth:'unsafe',emptyLink:'label'});
 assert.doesNotMatch(html,/<h1|class="[^"]*unsafe|href="javascript:|target="_blank"/);assert.match(html,/href="#service-unavailable"/);
});


test('native fieldCollection preserves the H4, visible empty label and original editing field identity',()=>{
 const b=block('creating-tailored-strategies-for-business-owners-in-niche-markets','s06-article-00');
 const named=datasource(b);const card=named.children.results[0];
 const fields=Object.entries(card).filter(([name])=>name!=='id'&&name!=='links').map(([name,wrapped])=>({name,jsonValue:wrapped.jsonValue}));
 fields.push({name:'links',jsonValue:card.links.targetItems.map(item=>({id:item.id,fields:{link:item.link.jsonValue,icon:item.icon.jsonValue}}))});
 const native={children:{results:[{id:card.id,fieldCollection:fields}]}};const before=JSON.stringify(native);
 for(const editing of [false,true])assert.equal(render(Cards.EditorialTiles,props(native,editing,b.params)),render(Cards.EditorialTiles,props(named,editing,b.params)));
 assert.equal(JSON.stringify(native),before);
});

test('every wide-statistic child retains its distinct native item and field editing identities',()=>{
 const b=block('small-business','s02-article-00'),d=datasource(b);
 const ids=[];
 d.children.results.forEach((card,i)=>{
  for(const name of ['heading','subheading','body','icon','alphanumeral']){
   const metadata=card[name].jsonValue.metadata;metadata.itemId=`distinct-statistic-${i}`;metadata.fieldId=`distinct-${i}-${name}`;ids.push(metadata.fieldId);
  }
 });
 const before=JSON.stringify(d),editing=render(Cards.EditorialCallout,props(d,true,b.params));
 const openFields=[...editing.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map(m=>JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&')));
 for(const id of ids)assert.equal(openFields.filter(f=>f.fieldId===id).length,1,id);
 d.children.results.forEach((_,i)=>assert.ok(openFields.some(f=>f.itemId===`distinct-statistic-${i}`)));
 assert.equal(JSON.stringify(d),before);
});
