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
const Cards=loadSource(path.join(sourceRoot,'components/allianz-card-grid/AllianzCardGrid.tsx'));
const Hero=loadSource(path.join(sourceRoot,'components/allianz-hero/AllianzHero.tsx'));
const Intro=loadSource(path.join(sourceRoot,'components/retirement-solutions-intro/RetirementSolutionsIntro.tsx'));
const Accordion=loadSource(path.join(sourceRoot,'components/allianz-accordion/AllianzAccordion.tsx'));
const Legal=loadSource(path.join(sourceRoot,'components/legal-disclosures/LegalDisclosures.tsx'));
const Note=loadSource(path.join(sourceRoot,'components/product-disclosures/ProductDisclosures.tsx'));
const Section=loadSource(path.join(sourceRoot,'components/allianz-faq-section/AllianzFaqSection.tsx'));
componentMap.set('RetirementSolutionsIntro',Intro);
componentMap.set('AllianzAccordion',Accordion);
const fixture=JSON.parse(fs.readFileSync(path.join(sourceRoot,'components/allianz-faq-section/__tests__/source-content.json')));
const page=(editing=false)=>({mode:{isEditing:editing,isNormal:!editing,isPreview:false},siteName:'allianz-life',layout:{sitecore:{context:{},route:{name:'FAQ',fields:{},placeholders:{}}}}});
function field(name,value,item='test-only-item') { return {jsonValue:{value,metadata:{itemId:item,fieldId:`${item}-${name}`,fieldType:name==='body'?'Rich Text':name==='icon'?'Image':'Single-Line Text'}}}; }
function data(value) { return Object.fromEntries(Object.entries(value).filter(([name])=>['heading','body'].includes(name)).map(([name,v])=>[name,field(name,v)])); }
function props(datasource,editing=false,params={}) { return {params,fields:{data:{datasource}},rendering:{uid:'test-only-rendering'},page:page(editing)}; }
function render(component,input) { return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page:input.page,api:{},componentMap,loadImportMap:async()=>({})},React.createElement(component,input))); }
function group(index) {return {children:{results:fixture.groups[index].accordion.children.map((entry,i)=>({id:`test-only-${index}-${i}`,heading:field('heading',entry.heading),body:field('body',entry.body)}))}};}

test('source receipt pins eight ordered single-paragraph answers, three help cards and six disclosures',()=>{
 assert.deepEqual(fixture.groups.map(g=>g.accordion.children.length),[6,2]);
 assert.deepEqual(fixture.groups.flatMap(g=>g.accordion.children.map(e=>e.paragraphCount)),Array(8).fill(1));
 assert.equal(fixture.contractHelp.children.length,3);
 assert.equal((fixture.legalDisclosures.body.match(/<p\b/g)||[]).length,6);
 assert.equal(fixture.groups[0].accordion.children[3].heading,'How is indexed interest calculated?');
});
test('fixed hero retains source theme, title, subtitle typography and empty picture scaffold',()=>{
 const input=props(data(fixture.hero)); const before=JSON.stringify(input);const html=render(Hero.FixedFaq,input);
 assert.match(html,/t-bg-product-fixed c-hero__theme--fixed/);
 assert.match(html,/<picture class="c-image c-stage__image--cover c-stage__image--short"><\/picture>/);
 assert.match(html,/<h1[^>]*>Frequently asked questions for FIAs<\/h1>/);
 assert.match(html,/class="h4 c-heading c-hero__subHeadline u-text-center">Fixed index annuities<\/p>/);
 assert.doesNotMatch(html,/<img|<a\b|MockLogin/);assert.equal(JSON.stringify(input),before);
});
test('FAQ intro is one source row without a second full-width/grid wrapper',()=>{
 const html=render(Intro.FaqRow,props({...data(fixture.groups[0].intro),icon:field('icon',{src:'/test-only.svg',alt:'Light Bulb'})}));
 assert.match(html,/l-grid__row u-margin-bottom-lg u-padding-top-lg/);assert.match(html,/<h2>Learn more about FIAs<\/h2>/);assert.match(html,/alt="Light Bulb"/);
 assert.doesNotMatch(html,/l-container|l-grid--max-width/);
});
test('two FAQ instances contain all answers and have unique connected trigger/panel IDs',()=>{
 const p=props({});const html=render(()=>React.createElement(React.Fragment,null,React.createElement(Accordion.FaqRow,props(group(0))),React.createElement(Accordion.FaqRow,props(group(1)))),p);
 const ids=[...html.matchAll(/\sid="([^"]*)"/g)].map(x=>x[1]);assert.equal(ids.length,16);assert.equal(new Set(ids).size,16);
 assert.equal((html.match(/aria-expanded="false"/g)||[]).length,8);assert.equal((html.match(/hidden=""/g)||[]).length,8);
 for(const match of html.matchAll(/aria-controls="([^"]*)"/g))assert.ok(ids.includes(match[1]));
 for(const match of html.matchAll(/aria-labelledby="([^"]*)"/g))assert.ok(ids.includes(match[1]));
 for(const entry of fixture.groups.flatMap(x=>x.accordion.children))assert.ok(html.includes(entry.body));
 assert.equal((html.match(/l-grid__row u-margin-bottom-xl/g)||[]).length,2);
});
test('editing keeps answer panels open and includes real field metadata, including cleared fields',()=>{
 const g=group(1);g.children.results[0].body=field('body','');const before=JSON.stringify(g);const html=render(Accordion.FaqRow,props(g,true));
 assert.equal((html.match(/aria-expanded="true"/g)||[]).length,2);assert.doesNotMatch(html,/hidden=""/);assert.match(html,/fieldId.*test-only-item-body/);assert.equal(JSON.stringify(g),before);
 assert.match(render(Hero.FixedFaq,props({heading:field('heading',''),body:field('body','')},true)),/fieldId.*test-only-item-heading/);
});
function sectionProps(id='7',editing=false,children=[]) {return {...props(undefined,editing,{DynamicPlaceholderId:id}),rendering:{uid:`test-only-section-${id}`,componentName:'AllianzFaqSection',params:{DynamicPlaceholderId:id},placeholders:{'allianz-faq-section-{*}':children}}};}
test('section uses genuine SDK AppPlaceholder, rejects guessed IDs and preserves source shared wrappers',()=>{
 const input=sectionProps();const node=Section.Default(input);const placeholder=node.props.children.props.children;
 assert.equal(placeholder.type,sdk.AppPlaceholder);assert.equal(placeholder.props.name,'allianz-faq-section-7');assert.equal(placeholder.props.rendering,input.rendering);assert.equal(placeholder.props.page,input.page);assert.equal(placeholder.props.componentMap,componentMap);
 const html=render(Section.Default,input);assert.equal(html,'<div class="l-container u-row-spacing t-bg-transparent axlTileCollection"><div class="l-grid l-grid--max-width l-grid--no-gutters-outer"></div></div>');
 assert.equal(Section.Default(sectionProps('19')).props.children.props.children.props.name,'allianz-faq-section-19');
 for(const id of ['',undefined,null,'x','7/other','-1',7]) {const p=sectionProps();p.params.DynamicPlaceholderId=id;assert.throws(()=>Section.Default(p),/requires a numeric native SXA DynamicPlaceholderId/);}
});
test('real SDK nested editing placeholder retains child order and rendering chrome',()=>{
 const children=[{uid:'test-only-intro',componentName:'RetirementSolutionsIntro',params:{FieldNames:'FaqRow'},dataSource:'test-only-intro-data',fields:{data:{datasource:data(fixture.groups[0].intro)}}},{uid:'test-only-accordion',componentName:'AllianzAccordion',params:{FieldNames:'FaqRow'},dataSource:'test-only-accordion-data',fields:{data:{datasource:group(0)}}}];
 const before=JSON.stringify(children);const html=render(Section.Default,sectionProps('9',true,children));
 assert.match(html,/chrometype="placeholder"[^>]*id="allianz-faq-section-\{\*\}_test-only-section-9"/);
 assert.match(html,/chrometype="rendering"[^>]*id="test-only-intro"/);assert.match(html,/chrometype="rendering"[^>]*id="test-only-accordion"/);
 assert.ok(html.indexOf('Learn more about FIAs')<html.indexOf('How do fixed index annuities work?'));assert.equal(JSON.stringify(children),before);
});
test('grey FAQ note preserves plain RTE source markup without the Home intro scaffold',()=>{
 const html=render(Note.FaqNote,props(data(fixture.productNote)));assert.match(html,/t-bg-grey-muted/);assert.match(html,/o-richTextEditor__wrapper/);assert.ok(html.includes(fixture.productNote.body));assert.doesNotMatch(html,/m-axlIntroductionBlock|tileHeading|tileBody/);
});


test('FAQ hero preserves native paragraph edits without invalid nested heading/paragraph tags',()=>{
 const input=props({heading:field('heading','<p>Authored <em>heading</em></p>'),body:field('body','<p>Authored subtitle</p>')});
 const before=JSON.stringify(input);const html=render(Hero.FixedFaq,input);
 assert.match(html,/<div role="heading" aria-level="1" class="h1 c-heading c-hero__headline u-text-center"><p>Authored <em>heading<\/em><\/p><\/div>/);
 assert.match(html,/<div class="h4 c-heading c-hero__subHeadline u-text-center"><p>Authored subtitle<\/p><\/div>/);
 assert.doesNotMatch(html,/<h1[^>]*><p|<p[^>]*><p/);assert.equal(JSON.stringify(input),before);
 const css=fs.readFileSync(path.join(sourceRoot,'components/allianz-hero/AllianzFaqHero.css'),'utf8');
 assert.match(css,/\.allianz-faq-hero \.c-hero__headline\[role="heading"\] p/);
 assert.match(css,/margin-top: 0/);assert.match(css,/margin-bottom: 0/);
});


test('source CTA label excludes decorative SVG title and description text',()=>{
 assert.equal(fixture.financialProfessional.link.text,'Explore Allianz® FIAs');
 assert.equal(fixture.originalLinks.find(x=>x.href==='/what-we-offer/annuities/fixed-index-annuities').text,'Explore Allianz® FIAs');
});
test('FAQ card variants reproduce ordered icon scaffolds and professional heading/link',()=>{
 const makeCard=(card,index)=>({id:`test-card-${index}`,...data(card),theme:field('theme',card.theme),headingLevel:field('headingLevel',card.headingLevel),icon:field('icon',{src:'/test-only.svg',alt:card.iconPurpose}),link:{jsonValue:{value:card.link||{href:''}}}});
 const help={...data(fixture.contractHelp),children:{results:fixture.contractHelp.children.map(makeCard)}};
 const html=render(Cards.FaqHelp,props(help));assert.match(html,/allianz-faq-cards/);assert.equal((html.match(/l-grid__column-medium-4/g)||[]).length,3);assert.equal((html.match(/-is--flipped -is--stacked/g)||[]).length,3);
 const cta=render(Cards.FaqProfessional,props({children:{results:[makeCard(fixture.financialProfessional,0)]}}));
 assert.match(cta,/t-bg-green-soft/);assert.match(cta,/tile--stackedImage -is--stacked/);assert.match(cta,/<h2>Ask your financial professional/);assert.match(cta,/>Explore Allianz® FIAs<\/span>/);assert.doesNotMatch(cta,/RightRight/);
 const css=fs.readFileSync(path.join(sourceRoot,'components/allianz-card-grid/AllianzFaqCards.css'),'utf8');assert.match(css,/width: 26px/);assert.match(css,/width: 40px/);
});


test('FAQ-only RTE adapters preserve native originals and enforce existing visitor service policy',()=>{
 const child=fixture.contractHelp.children[0];const help={...data(fixture.contractHelp),children:{results:[{id:'test-only-help',...data(child)}]}};
 const before=JSON.stringify(help);const normal=render(Cards.FaqHelp,props(help));
 assert.match(normal,/href="#service-unavailable"/);assert.doesNotMatch(normal,/href="https:\/\/www.allianzlife.com\/login"/);
 assert.match(render(Cards.FaqHelp,props(help,true)),/href="https:\/\/www.allianzlife.com\/login"/);assert.equal(JSON.stringify(help),before);
 const legal=data(fixture.legalDisclosures);const legalBefore=JSON.stringify(legal);
 assert.match(render(Legal.Faq,props(legal)),/href="#service-unavailable"/);
 assert.doesNotMatch(render(Legal.Faq,props(legal)),/href="tel:/);
 assert.match(render(Legal.Faq,props(legal,true)),/href="tel:800-950-1962"/);assert.equal(JSON.stringify(legal),legalBefore);
});
