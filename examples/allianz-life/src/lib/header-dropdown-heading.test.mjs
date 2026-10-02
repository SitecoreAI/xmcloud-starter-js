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
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const root = fileURLToPath(new URL('..',import.meta.url));

function render(items, isEditing, mobile) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename,compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (filename.endsWith('AllianzHeader.tsx') && specifier === 'react') {
        return {...React,useSyncExternalStore:()=>mobile};
      }
      if (specifier === 'next/navigation') return {useRouter:()=>({push(){}})};
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename),specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(root,specifier) : undefined;
      if (local) {
        const source = [local,local+'.ts',local+'.tsx'].find(p=>fs.existsSync(p));
        if (source && /\.tsx?$/.test(source)) return load(source);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
    }).outputText,filename);
    return compiled.exports;
  }
  const Header = load(path.join(root,'components/allianz-header/AllianzHeader.tsx')).Default;
  return renderToStaticMarkup(React.createElement(SitecoreProvider,{
    page:{mode:{isEditing,isNormal:!isEditing,isPreview:false},siteName:'allianz-life',
      layout:{sitecore:{context:{},route:{name:'Dropdown title contract',fields:{},placeholders:{}}}}},
    api:{},componentMap:new Map(),loadImportMap:async()=>({}),
  },React.createElement(Header,{fields:{data:{datasource:{
    logo:{jsonValue:{value:{src:'/allianz-assets/logo.svg',alt:'Allianz Life',width:122,height:30}}},
    tagline:{jsonValue:{value:'Allianz Life'}},primaryNav:{targetItems:items},utilityNav:{targetItems:[]},
  }}}})));
}

const field = (fieldId,fieldType,value,itemId='test-nav-item')=>({value,metadata:{fieldId,fieldType,itemId}});
const leaf = {id:'faq',title:{jsonValue:field('faq-title','Single-Line Text','FAQs')},
  link:{jsonValue:field('faq-link','General Link',{href:'/customer-service-frequently-asked-questions',text:'FAQs'})},children:{results:[]}};
const support = {id:'cb05cb4f-4ad1-55f5-8ded-583af0ddc478',
  title:{jsonValue:field('support-title','Single-Line Text','Support')},
  link:{jsonValue:field('support-empty-link','General Link',{href:'',text:''})},children:{results:[leaf]}};
const chrome = html=>[...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)]
  .map(m=>JSON.parse(m[1].replaceAll('&quot;','"').replaceAll('&amp;','&')));

test('source-proved empty-destination Support stays a title with its disclosure on desktop/mobile',()=>{
  // Recovered Home markup: <a href="" ...>Support <i ...></i></a> plus
  // Contact Us/FAQs/Claims children. Its empty href is not a page destination.
  for (const mobile of [false,true]) for (const editing of [false,true]) {
    const html=render([support],editing,mobile);
    assert.match(html,/<span[^>]*>Support<\/span>/);
    assert.match(html,new RegExp(`aria-label="${mobile?'Open ':''}Support submenu"`));
    assert.doesNotMatch(html,/\[No text in field\]/);
    const anchors=[...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)];
    assert.ok(!anchors.some(([, ,body])=>body.includes('>Support<')), 'Support is not a fabricated navigation link');
    if(editing) {
      assert.ok(chrome(html).some(x=>x.fieldId==='support-title'));
      assert.ok(!chrome(html).some(x=>x.fieldId==='support-empty-link'));
    }
  }
});

test('linked parents retain their real SDK link/title fields and actual child destination',()=>{
  const linked={...support,id:'linked-parent',link:{jsonValue:field('linked-parent-link','General Link',{href:'/contact-us',text:'Support'})}};
  const html=render([linked],true,false);
  assert.match(html,/href="\/contact-us"/);
  assert.match(html,/href="\/customer-service-frequently-asked-questions"/);
  assert.ok(chrome(html).some(x=>x.fieldId==='linked-parent-link'));
  assert.ok(chrome(html).some(x=>x.fieldId==='support-title'));
});

test('a cleared required leaf link keeps real authoring chrome',()=>{
  const cleared={...leaf,id:'cleared-leaf',link:{jsonValue:field('cleared-leaf-link','General Link',{href:'',text:''})}};
  const html=render([cleared],true,false);
  assert.ok(chrome(html).some(x=>x.fieldId==='cleared-leaf-link'));
  assert.match(html,/\[No text in field\]/);
});

test('no destination is invented and group detection does not treat a real anchor as empty',()=>{
  const anchor={...support,link:{jsonValue:field('anchor-link','General Link',{href:'#claims',text:'Support'})}};
  const html=render([anchor],true,false);
  assert.match(html,/href="#claims"/);
  assert.ok(chrome(html).some(x=>x.fieldId==='anchor-link'));
});
