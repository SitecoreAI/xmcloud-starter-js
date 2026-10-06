/** Offline contract/handler checks plus real Content SDK SSR. No browser or native CMS writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const realSdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const formRoot = path.join(sourceRoot, 'components/allianz-form');
const schemas = JSON.parse(fs.readFileSync(path.join(formRoot, 'source-schemas.json'), 'utf8'));
function sourceLoader(overrides = {}) {
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    modules.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (specifier.endsWith('.css')) return {}; // App build evaluates local CSS; the handler harness does not.
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
      if (local) {
        const resolved = [local, `${local}.ts`, `${local}.tsx`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (resolved && /\.tsx?$/.test(resolved)) return load(resolved);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  return load;
}
const { formDefinitions, visibleDefinitions, validateForm } = sourceLoader()(path.join(formRoot, 'form-rules.props.ts'));
const ProductComponent = sourceLoader()(path.join(formRoot, 'ProductContactForm.props.tsx')).default;
const DefaultComponent = sourceLoader()(path.join(formRoot, 'AllianzForm.tsx')).Default;
const PRODUCT = 'ProductInterest.ProductLines';
const sample = { 'ProductInterest.Name': 'Sample Person', 'ProductInterest.Email': 'sample@example.invalid', 'ProductInterest.Phone': '202-555-0148' };
const nativeField = (name, value, fieldType = 'Single-Line Text') => ({ jsonValue: { value, metadata: { itemId: 'product-test', fieldId: `product-${name}`, fieldType } } });
function datasource(key = 'product-contact') {
  return { schemaKey: nativeField('schemaKey', key), heading: nativeField('heading', 'Contact us'), body: nativeField('body', '', 'Rich Text'), secondaryHeading: nativeField('secondaryHeading', 'Already working with a financial professional?'), secondaryBody: nativeField('secondaryBody', '', 'Rich Text'), submitLabel: nativeField('submitLabel', 'Submit'), reviewHeading: nativeField('reviewHeading', 'Review sample information'), successMessage: nativeField('successMessage', '<p>Demo success.</p>', 'Rich Text'), failureMessage: nativeField('failureMessage', '<p>Demo failure.</p>', 'Rich Text'), children: { results: schemas[key].fields.map((definition, i) => ({ id: `product-field-${i}`, name: nativeField(`name-${i}`, definition.name), label: nativeField(`label-${i}`, definition.label), options: nativeField(`options-${i}`, JSON.stringify(definition.options)), placeholder: nativeField(`placeholder-${i}`, definition.placeholder), maxLength: nativeField(`maxLength-${i}`, String(definition.maxLength)) })) } };
}
function sdkRender(data, editing = false, Component = DefaultComponent) {
 const page = { mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Product contact', fields: {}, placeholders: {} } } } };
 return renderToStaticMarkup(React.createElement(realSdk.SitecoreProvider, { page, api: {}, componentMap: new Map(), loadImportMap: async () => ({}) }, React.createElement(Component, { fields: { data: { datasource: data } }, params: {} })));
}
for (const [key, count] of [['product-contact', 11], ['new-york-product-contact', 3]]) {
 const definitions = formDefinitions(key);
 test(`${key}: source fields, options and optionality are exact`, () => {
  assert.deepEqual(definitions.map((d) => d.name), [PRODUCT, 'ProductInterest.Other', ...Object.keys(sample)]);
  assert.equal(definitions[0].options.length, count); assert.equal(new Set(definitions[0].options.map((o) => o.value)).size, count);
  assert.equal(definitions[0].multiple, true); assert.equal(definitions[0].required, false); assert.equal(definitions[1].required, false);
  assert.deepEqual(definitions.slice(1).map((d) => d.maxLength), [70, 70, 5000, 50]);
  assert.deepEqual(visibleDefinitions(key, definitions, {}, 1), definitions);
  assert.deepEqual(visibleDefinitions(key, definitions, { [PRODUCT]: [definitions[0].options.at(-1).value] }, 1), definitions);
 });
 test(`${key}: validates source required fields and simultaneous independent checkbox selections`, () => {
  assert.deepEqual(validateForm(definitions, sample, key), {});
  assert.deepEqual(Object.keys(validateForm(definitions, {}, key)), Object.keys(sample));
  assert.deepEqual(validateForm(definitions, { ...sample, [PRODUCT]: [] }, key), {});
  const chosen = definitions[0].options.map((o) => o.value);
  assert.deepEqual(validateForm(definitions, { ...sample, [PRODUCT]: chosen, 'ProductInterest.Other': 'Optional details' }, key), {});
  for (const bad of ['', chosen[0], ['bad'], [chosen[0], 'bad'], [42], [null]]) assert.ok(validateForm(definitions, { ...sample, [PRODUCT]: bad }, key)[PRODUCT]);
  for (const [name, invalid] of [['ProductInterest.Other', 'a'.repeat(71)], ['ProductInterest.Name', 'a'], ['ProductInterest.Name', 'a'.repeat(71)], ['ProductInterest.Name', 'Sample1'], ['ProductInterest.Email', 'bad'], ['ProductInterest.Phone', '123'], ['ProductInterest.Phone', '2'.repeat(51)]]) assert.ok(validateForm(definitions, { ...sample, [name]: invalid }, key)[name], `${name}: ${invalid}`);
  for (const phone of ['2025550148', '202-555-0148', '(202) 555-0148']) assert.deepEqual(validateForm(definitions, { ...sample, 'ProductInterest.Phone': phone }, key), {});
 });
 test(`${key}: Default routes to product-specific closed accordion with safe source controls`, () => {
  const html = sdkRender(datasource(key));
  assert.equal((html.match(/type="checkbox"/g) || []).length, count);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 2);
  assert.equal((html.match(/hidden=""/g) || []).length, 2);
  assert.equal((html.match(/type="submit"/g) || []).length, 1);
  assert.equal((html.match(/<textarea/g) || []).length, 1);
  assert.match(html, /I want to learn more about/); assert.match(html, /Other \(specify\)/);
  assert.match(html, /Information entered here stays in this browser and is not sent/);
  assert.doesNotMatch(html, /action=|method=|checked=""|<script|ContactUsReason|SelectFirm|ContactInfo/);
  assert.equal((html.match(/required=""/g) || []).length, 3);
  assert.match(html, /<sup>®<\/sup>/);
 });
 test(`${key}: SDK editing exposes native metadata and no interactive controls; clear/restore retains identity`, () => {
  const data = datasource(key), original = JSON.stringify(data); const html = sdkRender(data, true);
  for (const name of ['heading','body','secondaryHeading','secondaryBody','submitLabel','reviewHeading','successMessage','failureMessage',...Array.from({length:5},(_,i)=>`label-${i}`)]) assert.ok(html.includes(`product-${name}`), name);
  assert.doesNotMatch(html, /<form|<input|<textarea|<button|<select/);
  const cleared = structuredClone(data); cleared.heading.jsonValue.value=''; cleared.secondaryHeading.jsonValue.value=''; cleared.children.results.forEach((c)=>{c.label.jsonValue.value='';});
  const empty = sdkRender(cleared, true); for(let i=0;i<5;i++) assert.ok(empty.includes(`product-label-${i}`));
  assert.equal(JSON.stringify(data), original); assert.equal(sdkRender(data,true),html);
 });
}
test('native edits retain labels/options/limits but do not override compiled safety or introduce fields', () => {
 const data=datasource(); data.children.results[0].options.jsonValue.value=JSON.stringify([{value:'ProductInterest.ProductLines[6].Selected',label:'Updated Survivor®'}]);
 data.children.results[1].required={jsonValue:{value:'1'}}; data.children.results[2].inputType=nativeField('inputType','password'); data.children.results[2].label.jsonValue.value='Updated name'; data.children.results[2].maxLength.jsonValue.value='9000';
 data.children.results.push({id:'bad',name:nativeField('name','secret'),inputType:nativeField('inputType','password')});
 const defs=formDefinitions('product-contact',data.children.results);
 assert.equal(defs.length,5);assert.equal(defs[0].options[0].label,'Updated Survivor®');assert.equal(defs[0].options[0].superscript,'®');assert.equal(defs[1].required,false);assert.equal(defs[2].inputType,'text');assert.equal(defs[2].label,'Updated name');assert.equal(defs[2].maxLength,5000);
 for (const raw of ['', 'invalid', '{}', '[]', '[{}]', '[null]', '[1]', '[{"value":"","label":"Blank value"}]', '[{"value":"test","label":{}}]', '[{"value":"test","label":" "}]', '[{"value":"same","label":"One"},{"value":"same","label":"Two"}]']) { data.children.results[0].options.jsonValue.value=raw; assert.equal(formDefinitions('product-contact',data.children.results)[0].options.length,11); }
});

for (const key of ['product-contact', 'new-york-product-contact']) test(`${key}: malformed native choices cannot erase, merge or manufacture blank options`, () => {
 const data = datasource(key);
 for (const items of [[{}], [null], [1], [{ value: '', label: 'Blank' }], [{ value: 'test', label: {} }], [{ value: 'test', label: ' ' }], [{ value: 'same', label: 'One' }, { value: 'same', label: 'Two' }]]) {
  data.children.results[0].options.jsonValue.value = JSON.stringify(items);
  assert.deepEqual(formDefinitions(key, data.children.results)[0].options, schemas[key].fields[0].options);
 }
 const defs = formDefinitions(key);
 assert.deepEqual(validateForm(defs, { ...sample, 'ProductInterest.Name': 'a'.repeat(70), 'ProductInterest.Other': 'a'.repeat(70) }, key), {});
 const email = `${'a'.repeat(4990)}@example.x`;
 assert.equal(email.length, 5000);
 assert.deepEqual(validateForm(defs, { ...sample, 'ProductInterest.Email': email }, key), {});
 assert.match(validateForm(defs, { ...sample, 'ProductInterest.Email': `a${email}` }, key)['ProductInterest.Email'], /5000/);
});

test('product helper stays internal to the existing AllianzForm component', () => {
 const config = fs.readFileSync(path.join(sourceRoot, '../sitecore.cli.config.ts'), 'utf8');
 assert.match(config, /src\/components\/\*\*\/\*\.props\.tsx/);
 assert.ok(fs.existsSync(path.join(formRoot, 'ProductContactForm.props.tsx')));
 assert.ok(!fs.existsSync(path.join(formRoot, 'ProductContactForm.dev.tsx')));
});

// Element/handler harness; this is not a real browser or accessibility-tree test.
const pendingFrames=[];
function harness(key='product-contact', params={}) {
 let state=[], cursor=0, tree, refCursor=0;const refs=[],focus=[]; const data=datasource(key);
 const hooks={...React,useId:()=> 'product-harness',useMemo:(fn)=>fn(),useRef:()=>refs[refCursor++]||=( {current:null}),useState:(initial)=>{const i=cursor++;if(!(i in state)) state[i]=initial;return[state[i],(next)=>{state[i]=typeof next==='function'?next(state[i]):next;}];}};
 const sdk={...realSdk,useSitecore:()=>({page:{mode:{isEditing:false}}})};
 const Component=sourceLoader({react:hooks,'@sitecore-content-sdk/nextjs':sdk})(path.join(formRoot,'ProductContactForm.props.tsx')).default;
 function nodes(node=tree){if(Array.isArray(node))return node.flatMap((child)=>nodes(child??null));if(!React.isValidElement(node))return[];return[node,...nodes(node.props.children??null)];}
 function text(node=tree){if(Array.isArray(node))return node.map((child)=>text(child??null)).join('');if(node==null||typeof node==='boolean')return'';if(!React.isValidElement(node))return String(node);if(node.type===sdk.Text||node.type===sdk.RichText)return node.props.field?.value||'';return text(node.props.children??null);}
 function render(){cursor=0;refCursor=0;tree=Component({fields:{data:{datasource:data}},params});for(const n of nodes())if(n.props.ref)n.props.ref.current={focus:()=>focus.push(n.props.id||n.type),querySelector:(s)=>({focus:()=>focus.push(s)})};while(pendingFrames.length)pendingFrames.shift()();return tree;}
 function find(fn){const n=nodes().find(fn);assert.ok(n,'expected element');return n;}
 function click(label){find((n)=>n.type==='button'&&text(n)===label).props.onClick();render();}
 function change(name,value,checked=true){find((n)=>n.props.name===name).props.onChange({target:{value,checked}});render();}
 function submit(){find((n)=>n.type==='form').props.onSubmit({preventDefault(){}});render();}
 function fill(){for(const[n,v]of Object.entries(sample))change(n,v);}
 render();return{state:()=>state,nodes,text,render,find,click,change,submit,fill,focus};
}
let requests=0,stores=0;
globalThis.requestAnimationFrame=(fn)=>{pendingFrames.push(fn);return 1;};globalThis.window={location:{search:''}};
globalThis.fetch=()=>{requests++;throw Error('no requests');};globalThis.XMLHttpRequest=class{constructor(){requests++;throw Error('no requests');}};
globalThis.localStorage=globalThis.sessionStorage={getItem(){stores++;throw Error('no storage');},setItem(){stores++;throw Error('no storage');}};
for (const key of ['product-contact','new-york-product-contact']) {
 test(`${key} handlers: multiple selection, review/edit/clear/reset and repeated outcomes retain only local state`,()=>{
  const h=harness(key);const options=formDefinitions(key)[0].options;h.click('Contact us');h.fill();h.change(options[0].value,'true');h.change(options[1].value,'true');h.change('ProductInterest.Other','Synthetic sample');h.submit();
  assert.equal(h.state()[3],'review');assert.match(h.text(),/Information entered here stays in this browser/);assert.ok(h.text().includes(options[0].label));assert.ok(h.text().includes(options[1].label));assert.ok(h.focus.includes('h2'));
  h.click('Edit information');assert.equal(h.state()[3],'entry');assert.deepEqual(h.state()[1][PRODUCT],options.slice(0,2).map(o=>o.value));assert.ok(h.focus.includes('input, textarea'));
  h.change(options[0].value,'true',false);h.change(options[1].value,'true',false);h.change('ProductInterest.Other','');h.submit();assert.equal(h.state()[3],'review');h.click('Continue');assert.equal(h.state()[3],'complete');assert.deepEqual(h.state()[1],{});assert.match(h.text(),/No information was sent/);
  h.click('Start again');h.fill();h.submit();h.click('Start again');assert.deepEqual(h.state()[1],{});assert.deepEqual(h.state()[2],{});assert.equal(h.state()[3],'entry');
 });
 test(`${key} handlers: invalid focus, optional Other independence, and checkbox duplicate events`,()=>{
  const h=harness(key);const option=formDefinitions(key)[0].options.at(-1);h.click('Contact us');h.submit();assert.equal(h.state()[3],'entry');assert.deepEqual(Object.keys(h.state()[2]),Object.keys(sample));assert.ok(h.focus.includes('[aria-invalid="true"]'));
  h.change(option.value,'true');h.change(option.value,'true');assert.deepEqual(h.state()[1][PRODUCT],[option.value]);h.change('ProductInterest.Other','a'.repeat(71));h.fill();h.submit();assert.ok(h.state()[2]['ProductInterest.Other']);h.change(option.value,'true',false);h.change('ProductInterest.Other','');h.submit();assert.equal(h.state()[3],'review');
 });
}
test('accordion handlers: exclusive repeated toggling, collapse retains entry/review, native button keyboard contract',()=>{
 const h=harness();const first=()=>h.find(n=>n.type==='button'&&n.props['aria-controls']?.endsWith('-1'));const second=()=>h.find(n=>n.type==='button'&&n.props['aria-controls']?.endsWith('-2'));
 assert.equal(h.state()[0],null);assert.equal(first().props['aria-expanded'],false);h.click('Contact us');h.fill();h.click('Already working with a financial professional?');assert.equal(h.state()[0],2);assert.equal(first().props['aria-expanded'],false);assert.equal(second().props['aria-expanded'],true);assert.deepEqual(h.state()[1],sample);
 h.click('Contact us');h.submit();h.click('Contact us');assert.equal(h.state()[0],null);h.click('Contact us');assert.equal(h.state()[3],'review');
 let prevented=0;for(const key of ['ArrowDown','ArrowUp','End','Home'])first().props.onKeyDown({key,preventDefault(){prevented++;}});assert.equal(prevented,4);assert.ok(h.focus.some(x=>x.endsWith('-2-trigger')));assert.ok(h.focus.some(x=>x.endsWith('-1-trigger')));
 assert.equal(first().props.type,'button');assert.equal(first().props['aria-controls'],h.find(n=>n.props.id==='product-harness-product-contact-1').props.id);
});
for(const outcome of ['error','failure'])test(`local mock ${outcome} clears values and permits repeat`,()=>{const h=harness('product-contact',{mockOutcome:outcome});h.click('Contact us');h.fill();h.submit();h.click('Continue');assert.equal(h.state()[3],'failure');assert.deepEqual(h.state()[1],{});assert.match(h.text(),/No information was sent/);h.click('Start again');h.fill();h.submit();assert.equal(h.state()[3],'review');});
test('query mock failure is local; no requests, persistence, executable source HTML or form endpoints exist',()=>{window.location.search='?formOutcome=error';const h=harness();h.click('Contact us');h.fill();h.submit();h.click('Continue');assert.equal(h.state()[3],'failure');window.location.search='';assert.equal(requests,0);assert.equal(stores,0);const source=fs.readFileSync(path.join(formRoot,'ProductContactForm.props.tsx'),'utf8');assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|dangerouslySetInnerHTML|\baction=|\bmethod=/);});
