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
const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/retirement-editorial-source.fixture.json')));
const page = (editing = false) => ({mode: {isEditing: editing, isNormal: !editing, isPreview: false}, siteName: 'allianz-life', layout: {sitecore: {context: {}, route: {name: 'Editorial test', fields: {}, placeholders: {}}}}});
function field(name, value) { return {jsonValue: {value, metadata: {itemId: 'test-only-editorial', fieldId: `test-only-${name}`, fieldType: name==='body' ? 'Rich Text' : name.includes('Image') || name==='icon' || name==='image' ? 'Image' : 'Single-Line Text'}}}; }
function fields(raw) {return Object.fromEntries(Object.entries(raw || {}).filter(([name]) => name !== 'links').map(([name, value]) => [name, field(name, value?.assetIntentKey ? {src:`/test-only/${value.assetIntentKey}.svg`,alt:value.alt ?? value.purpose ?? ''} : value ?? (['image','icon','desktopImage','mobileImage','primaryLink','secondaryLink','link'].includes(name) ? {} : ''))]));}
function datasource(r) {return {...fields(r.fields), ...(r.children?.length ? {children:{results:r.children.map((child,index)=>({id:`test-only-child-${index}`, ...fields(child.fields), ...(child.fields.links ? {links:{targetItems:(child.referencedItems ?? []).map((ref,i)=>({id:`test-only-link-${i}`,...fields(ref.fields)}))}}:{})}))}}:{})};}
function props(data, editing=false, params={}) {return {fields:{data:{datasource:data}},params,page:page(editing),rendering:{uid:'test-only-rendering'}};}
function render(Component, input) {return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page:input.page,api:{},componentMap,loadImportMap:async()=>({})},React.createElement(Component,input)));}
function children(renders) {return renders.map((r,i)=>({uid:`test-only-rendering-${i}`,componentName:r.componentName,params:{...r.params,FieldNames:r.variant},dataSource:`test-only-datasource-${i}`,fields:{data:{datasource:datasource(r)}}}));}
function sectionInput(section, renders, editing=false, dynamic='31') {return {...props(undefined,editing,{...section.parameterIntent,DynamicPlaceholderId:dynamic}),rendering:{uid:`test-only-section-${dynamic}`,componentName:'AllianzEditorialSection',params:{...section.parameterIntent,DynamicPlaceholderId:dynamic},placeholders:{'allianz-editorial-section-{*}':children(renders)}}};}

test('source fixtures cover all 24 pages, 41 shared sections, 235 editorial/definition/legal placements',()=>{
 assert.equal(fixtures.length,24);
 assert.equal(fixtures.reduce((n,p)=>n+p.structuralSections.length,0),41);
 assert.equal(fixtures.reduce((n,p)=>n+p.renderings.length,0),235);
});
for (const fixture of fixtures) {
 test(`${fixture.route.split('/').pop()} renders every native editorial field without mutation`,()=>{
  for (const r of fixture.renderings) {
   const data=datasource(r);const before=JSON.stringify(data);
   const normal=render(components[r.componentName][r.variant],props(data,false,r.params));
   const editing=render(components[r.componentName][r.variant],props(data,true,r.params));
   assert.ok(normal.length>0);assert.equal(JSON.stringify(data),before);
   assert.match(editing,/test-only-/);
   if(r.componentName!=='AllianzHero') assert.doesNotMatch(normal,/<h1\b/);
   if(r.componentName==='AllianzCardGrid') {
    for(const child of r.children) {
     if(child.fields.alphanumeral) assert.ok(normal.includes(`>${child.fields.alphanumeral}</span>`));
     if(child.fields.body) assert.ok(editing.includes(child.fields.body));
    }
   } else if(r.fields.body) assert.ok(editing.includes(r.fields.body));
  }
 });
 for (const section of fixture.structuralSections) test(`${fixture.route.split('/').pop()} ${section.sourceSection} shares native wrappers and editing chrome`,()=>{
  const renders=section.childDatasourceIntentKeys.map(key=>fixture.renderings.find(r=>r.datasourceIntentKey===key));
  assert.ok(renders.every(Boolean));
  const normal=render(Section.Default,sectionInput(section,renders));
  const editing=render(Section.Default,sectionInput(section,renders,true));
  assert.equal((normal.match(/class="l-container(?:--full-width)? /g)||[]).length,1);
  assert.equal(normal.includes('l-grid--no-gutters-outer'),section.parameterIntent.sectionWidth==='contained');
  assert.equal((normal.match(/u-row-spacing/g)||[]).length,section.parameterIntent.sectionSpacing==='1'?1:0);
  assert.equal((editing.match(/chrometype="rendering"/g)||[]).length,renders.length * 2);
  assert.match(editing,/chrometype="placeholder"/);
  if(section.parameterIntent.layout==='column') {
   assert.equal((normal.match(/u-padding-top-xl/g)||[]).length,section.parameterIntent.paddingTop==='xl'?1:0);
   assert.equal((normal.match(/l-grid__column-medium-12/g)||[]).length,1);
   if(normal.includes('Key points:')) assert.ok(normal.indexOf('tileImage')<normal.indexOf('Key points:'));
  }
  if(section.parameterIntent.RenderingIdentifier) assert.equal((normal.match(/id="keypoint2"/g)||[]).length,1);
 });
}
test('same badge supports icon and number; source heading/body sizes are independent',()=>{
 const d={children:{results:[{id:'test',heading:field('heading','A heading'),headingLevel:field('headingLevel','h2'),body:field('body','<p>Medium body</p>'),icon:field('icon',{src:'/test-only/icon.svg',alt:'Inflation'}),alphanumeral:field('alphanumeral','3'),iconTheme:field('iconTheme','primary-brand')}]}};
 const html=render(Cards.EditorialTiles,props(d,false,{sourceWidth:'centered-eight'}));
 assert.match(html,/tileIcon t-bg-primary-brand t-icon-primary-white[^]*?<img[^]*?<span class="alphaType">3<\/span><\/div>/);
 assert.match(html,/<h2>A heading<\/h2>/);assert.match(html,/tileBody u-font-size-md/);assert.doesNotMatch(html,/tileAlphanumeral|u-font-size-xl/);
 assert.match(html,/l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12/);
});
test('4Q2024 election retains flipped 33:67 alphanumeric and no phantom image',()=>{
 const p=fixtures.find(p=>p.route.endsWith('outlook-4q-2024'));const r=p.renderings.find(r=>r.children.some(c=>c.fields.heading==='U.S. Election'));
 const html=render(Cards.EditorialTiles,props(datasource(r),false,r.params));
 assert.match(html,/tile--3366 -is--flipped tile--alphaNumeric -is--split/);assert.doesNotMatch(html,/class="tileImage"/);assert.match(html,/u-margin-bottom-xl/);
});
test('debt/savings questions remain one native three-column row with source H3s',()=>{
 const r=fixtures.find(p=>p.route.endsWith('balance-debt-and-retirement-savings')).renderings.find(r=>r.params.columns==='3');
 assert.equal(r.children.length,3);const html=render(Cards.EditorialCallout,props(datasource(r),false,r.params));
 assert.equal((html.match(/l-grid__column-medium-4/g)||[]).length,3);assert.equal((html.match(/<h3>/g)||[]).length,3);
});
test('native fieldCollection and ordered links preserve download/arrow icons, query, fragment and safe new tabs',()=>{
 const f=(name,value)=>({name,jsonValue:{value,metadata:{fieldId:`test-only-${name}`}}});
 const d={children:{results:[{id:'native-card',fieldCollection:[f('heading','Links'),f('body','<p>Body</p>'),{name:'links',jsonValue:[{id:'download',fields:{link:{value:{href:'/about?x=1#part',text:'Download',target:'_blank',rel:'author',ariaLabel:'Download source'}},icon:{value:{src:'/test-only/download.svg'}}}},{id:'arrow',fields:{link:{value:{href:'/about',text:'Read'}},icon:{value:{src:'/test-only/arrow.svg'}}}}]}]}]}};
 const before=JSON.stringify(d);const html=render(Cards.EditorialCallout,props(d));
 assert.match(html,/href="\/about\?x=1#part"/);assert.match(html,/rel="author noopener noreferrer"/);assert.match(html,/target="_blank"/);assert.match(html,/aria-label="Download source"/);
 assert.ok(html.indexOf('/test-only/download.svg')<html.lastIndexOf('/test-only/arrow.svg'));assert.doesNotMatch(html,/<svg/);assert.equal(JSON.stringify(d),before);
});
test('cleared SDK fields remain editable; cleared ordered links never fall back to a stale single link',()=>{
 const d={children:{results:[{id:'cleared',heading:field('heading',''),body:field('body',''),icon:field('icon',{}),alphanumeral:field('alphanumeral',''),links:{targetItems:[]},link:field('link',{href:'/about',text:'Stale'})}]}};
 const normal=render(Cards.EditorialTiles,props(d));assert.doesNotMatch(normal,/<img|alphaType|Stale|<a\b/);
 const editing=render(Cards.EditorialTiles,props(d,true));for(const name of ['heading','body','icon','alphanumeral']) assert.ok(editing.includes(`test-only-${name}`));
 assert.doesNotMatch(editing,/Stale/);
});
test('no datasource does not manufacture editorial content',()=>{
 for(const C of [Hero.Editorial,Article.EditorialBody,Cards.EditorialIntro,Cards.EditorialCallout,Cards.EditorialTiles]) assert.match(render(C,props(undefined)),/Add a datasource/);
});
test('article field clearing and finite parameters preserve authorability and prevent new H1s or class injection',()=>{
 const d={heading:field('heading',''),summary:field('summary',''),body:field('body','')};const h=render(Article.EditorialBody,props(d,true,{headingLevel:'h1',scaffold:'<unsafe>',bodySize:'evil',sourceWidth:'evil'}));
 for(const k of ['heading','summary','body'])assert.ok(h.includes(`test-only-${k}`));assert.doesNotMatch(h,/<h1|evil|unsafe/);
});
test('hero preserves subtitle typography, responsive images and CKEditor block metadata without invalid nesting',()=>{
 const d={heading:field('heading','<p>Title</p>'),body:field('body','<p>Subtitle</p>'),desktopImage:field('desktopImage',{src:'/test-only/desktop.jpg'}),mobileImage:field('mobileImage',{})};
 const html=render(Hero.Editorial,props(d,true,{theme:'blue-soft',RenderingIdentifier:'hero'}));
 assert.match(html,/role="heading" aria-level="1"/);assert.match(html,/h4 c-heading c-hero__subHeadline/);assert.doesNotMatch(html,/<h1[^>]*><p|<p[^>]*><p/);assert.match(html,/test-only-mobileImage/);assert.match(html,/id="hero"/);
});
test('visitor prose links keep safe targets/query/fragments and disable demo services; editing is identity-preserving',()=>{
 const f={value:'<p><a title="href=wrong" data-href="wrong" href="/about?a=1&amp;a=2#x" target="_blank" rel="author">Safe</a> <a href="tel:8005551212" target="_blank">Phone</a> <a href="/login">Login</a></p>',metadata:{fieldId:'native'}};
 assert.equal(safeEditorialRichText(f,true),f);const v=safeEditorialRichText(f,false);
 assert.match(v.value,/href="\/about\?a=1&amp;a=2#x"/);assert.match(v.value,/target="_blank" rel="author noopener noreferrer"/);assert.match(v.value,/href="#service-unavailable" target=""/);assert.equal(v.metadata,f.metadata);assert.ok(f.value.includes('tel:'));
});
test('structural placeholder rejects fabricated/missing dynamic identifiers and preserves native props',()=>{
 const section={parameterIntent:{}};const p=sectionInput(section,[]);const node=Section.Default(p);const holder=node.props.children.props.children;
 assert.equal(holder.type,sdk.AppPlaceholder);assert.equal(holder.props.name,'allianz-editorial-section-31');assert.equal(holder.props.rendering,p.rendering);assert.equal(holder.props.page,p.page);assert.equal(holder.props.componentMap,componentMap);
 for(const id of [undefined,null,'','x','3/other',-1,7]) assert.throws(()=>Section.Default({...p,params:{DynamicPlaceholderId:id}}),/numeric native SXA/);
});

test('native icon adaptation is scoped and includes source sizes and link color states',()=>{
 const css=fs.readFileSync(path.join(sourceRoot,'components/allianz-card-grid/AllianzEditorialCards.css'),'utf8');
 for(const state of ['hover','active','visited','focus-visible']) assert.ok(css.includes(`.allianz-editorial-cards .a-link:${state}`));
 for(const width of ['26px','40px','18px']) assert.ok(css.includes(`width: ${width}`));
 assert.match(css,/@media \(min-width: 704px\)/);
});

test('grey and trailing legal preserve stored source and empty scaffolds while enforcing visitor service policy',()=>{
 const d={body:field('body','<p><a href="tel:8005551212">Phone</a> <a href="/login">Login</a> <a href="/about" target="_blank">About</a></p>')};
 const before=JSON.stringify(d);
 for(const C of [Product.Editorial,Product.EditorialNote,Legal.Faq]) {
  const normal=render(C,props(d));const editing=render(C,props(d,true));
  assert.doesNotMatch(normal,/href="tel:|href="\/login"/);assert.match(normal,/#service-unavailable/);
  assert.ok(editing.includes(d.body.jsonValue.value));assert.equal(JSON.stringify(d),before);
  assert.match(render(C,props({body:field('body','')},true)),/test-only-body/);
 }
 assert.match(render(Product.Editorial,props(d)),/m-axlIntroductionBlock/);
 const note=render(Product.EditorialNote,props(d));assert.match(note,/t-bg-grey-muted axlTileCollection/);assert.match(note,/o-richTextEditor__wrapper/);assert.doesNotMatch(note,/m-axlIntroductionBlock/);
 assert.match(render(Legal.Faq,props({body:field('body','')})),/col-md-12 content-body disclosure/);
});
