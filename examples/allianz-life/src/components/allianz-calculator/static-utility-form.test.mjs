/** Code-owned utility controls, editable surrounding content, and local-only validation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),sdk=require('@sitecore-content-sdk/nextjs');
const {renderToStaticMarkup}=require('react-dom/server'),root=fileURLToPath(new URL('../../',import.meta.url));
function loader(overrides={}){
 const modules=new Map();
 function load(file){if(modules.has(file))return modules.get(file).exports;const m=new Module(file);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));modules.set(file,m);const native=m.require.bind(m);
  m.require=(spec)=>{if(Object.hasOwn(overrides,spec))return overrides[spec];const local=spec.startsWith('.')?path.resolve(path.dirname(file),spec):/^(lib|components)\//.test(spec)?path.join(root,spec):undefined;if(local){const p=[local,local+'.ts',local+'.tsx'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());if(p&&/\.tsx?$/.test(p))return load(p);}return native(spec);};
  m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);return m.exports;
 }return load;
}
const file=path.join(root,'components/allianz-calculator/AllianzCalculator.tsx'),Default=loader()(file).Default;
const field=(name,value)=>({jsonValue:{value,metadata:{fieldId:name,itemId:'surrounding',fieldType:name==='heading'?'Single-Line Text':'Rich Text'}}});
const surrounding={heading:field('heading','Retirement calculator'),body:field('body','<p>Authored explanation.</p>'),disclaimer:field('disclaimer','<p>Authored disclaimer.</p>')};
function render(data,editing=false){const page={mode:{isEditing:editing,isNormal:!editing},layout:{sitecore:{context:{},route:{name:'Utility',fields:{},placeholders:{}}}},siteName:'allianz-life'};return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page,api:{},componentMap:new Map(),loadImportMap:async()=>({})},React.createElement(Default,{params:{},fields:data?{data:{datasource:data}}:undefined})));}
test('calculator controls render without any datasource, with exact source defaults and no invented result',()=>{
 const html=render();assert.equal((html.match(/<input/g)||[]).length,3);assert.match(html,/name="principal"[^>]*value="\$0.00"/);assert.match(html,/name="interest"[^>]*value="0.00%"/);assert.match(html,/name="payments"[^>]*value=""/);assert.match(html,/Compute/);assert.match(html,/How much you need to save/);assert.doesNotMatch(html,/missing-data|Sample scenario|action=|method=/);
});
test('stale CMS controls, labels, initial values and sample results cannot override calculator',()=>{
 const stale={schemaKey:field('schema','unknown'),submitLabel:field('submit','OVERRIDE'),resultLabel:field('result','OVERRIDE'),initialResult:field('initial','$999999'),sampleResult:field('sample','OVERRIDE'),children:{results:[{id:'credential',name:field('name','password'),label:field('label','OVERRIDE'),initialValue:field('initial','secret')}]} };
 for(const editing of [false,true])assert.equal(render(stale,editing),render(undefined,editing));
});
test('calculator surrounding heading/body/disclaimer remain editable without form-field chrome',()=>{
 const html=render(surrounding,true);for(const name of ['heading','body','disclaimer'])assert.match(html,new RegExp(`fieldId&quot;:&quot;${name}`));assert.doesNotMatch(html,/fieldId&quot;:&quot;(principal|interest|payments)|<form|<input/);
 for(const editing of [false,true]){const changed=structuredClone(surrounding);changed.heading.jsonValue.value='';changed.body.jsonValue.value='';changed.disclaimer.jsonValue.value='';assert.doesNotMatch(render(changed,editing),/Retirement calculator|Authored explanation|Authored disclaimer/);}
});
test('calculator invalid/valid/edit/reset repeat locally, with no computed financial result',()=>{
 let state=[],cursor=0,tree,requests=0,stores=0;const focus=[];
 const hooks={...React,useId:()=> 'calc',useMemo:fn=>fn(),useRef:()=>({current:{querySelector:()=>({focus:()=>focus.push(true)})}}),useState:initial=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}];}};
 const Component=loader({react:hooks,'@sitecore-content-sdk/nextjs':{...sdk,useSitecore:()=>({page:{mode:{isEditing:false}}})}})(file).Default;
 const saved={raf:globalThis.requestAnimationFrame,fetch:globalThis.fetch,local:globalThis.localStorage,session:globalThis.sessionStorage};
 globalThis.requestAnimationFrame=fn=>{fn();return 1;};globalThis.fetch=()=>{requests++;throw Error('Forbidden');};globalThis.localStorage=globalThis.sessionStorage={setItem(){stores++;throw Error('Forbidden');},getItem(){stores++;throw Error('Forbidden');}};
 function nodes(n=tree){if(Array.isArray(n))return n.flatMap(child=>nodes(child??null));return React.isValidElement(n)?[n,...nodes(n.props.children??null)]:[];}
 function draw(){cursor=0;tree=Component({params:{}});}function find(fn){const n=nodes().find(fn);assert.ok(n);return n;}function submit(){find(n=>n.type==='form').props.onSubmit({preventDefault(){}});draw();}function change(name,value){find(n=>n.props.name===name).props.onChange({target:{value}});draw();}
 try{draw();submit();assert.ok(state[1].payments);assert.ok(focus.length);for(const[name,value]of Object.entries({principal:'$1,000.00',interest:'4.50%',payments:'20'}))change(name,value);submit();assert.equal(state[2],true);assert.ok(nodes().some(n=>n.props.role==='status'&&n.props.children==='Your inputs are ready. A result is not available.'));change('payments','20.5');assert.equal(state[2],false);submit();assert.ok(state[1].payments);change('payments','20');submit();find(n=>n.type==='button'&&n.props.children==='Reset').props.onClick();draw();assert.deepEqual(state[0],{principal:'$0.00',interest:'0.00%',payments:''});assert.equal(state[2],false);assert.equal(requests,0);assert.equal(stores,0);}finally{globalThis.requestAnimationFrame=saved.raf;globalThis.fetch=saved.fetch;globalThis.localStorage=saved.local;globalThis.sessionStorage=saved.session;}
});
test('reusable search control/results copy is code-owned; headings remain separate editable content',()=>{
 const source=fs.readFileSync(path.join(root,'components/allianz-search/AllianzSearch.tsx'),'utf8');assert.match(source,/placeholder="e.g. Annuities"/);assert.doesNotMatch(source,/data\?\.(placeholder|resultLabel|noResultsMessage)/);assert.match(source,/field=\{data.heading.jsonValue\}/);assert.match(source,/field=\{data.body.jsonValue\}/);assert.match(source,/No results found. Please try a different search./);
});

test('reusable search real SDK output ignores CMS form copy and keeps editable surroundings',()=>{
 const Search=loader({'next/navigation':{usePathname:()=>'/search',useRouter:()=>({push(){throw Error('SSR must not navigate');}}),useSearchParams:()=>new URLSearchParams('q=unfindablezzzz')}})(path.join(root,'components/allianz-search/AllianzSearch.tsx')).Default;
 function view(data,editing=false){const page={mode:{isEditing:editing,isNormal:!editing},layout:{sitecore:{context:{},route:{name:'Search',fields:{},placeholders:{}}}},siteName:'allianz-life'};return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page,api:{},componentMap:new Map(),loadImportMap:async()=>({})},React.createElement(Search,{params:{},fields:{data:{datasource:data}}})));}
 const stale={placeholder:field('placeholder','OVERRIDE'),resultLabel:field('result','OVERRIDE'),noResultsMessage:field('empty','OVERRIDE')};
 for(const editing of [false,true])assert.equal(view(stale,editing),view(undefined,editing));
 const html=view({heading:surrounding.heading,body:surrounding.body},true);assert.match(html,/Retirement calculator/);assert.match(html,/Authored explanation/);for(const name of ['heading','body'])assert.match(html,new RegExp(`fieldId&quot;:&quot;${name}`));assert.match(html,/No results found. Please try a different search/);assert.doesNotMatch(html,/OVERRIDE|action=|method=/);
});
