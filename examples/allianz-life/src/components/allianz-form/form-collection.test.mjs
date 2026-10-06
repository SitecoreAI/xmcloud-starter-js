/** Static-form selection and full inventory regression, independent of CMS query envelopes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const sdk = require('@sitecore-content-sdk/nextjs'), { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = fileURLToPath(new URL('../../', import.meta.url));
const formRoot = path.join(sourceRoot, 'components/allianz-form');
function loader() {
 const modules = new Map();
 function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename); compiled.filename=filename; compiled.paths=Module._nodeModulePaths(path.dirname(filename)); modules.set(filename,compiled);
  const nativeRequire=compiled.require.bind(compiled);
  compiled.require=(specifier)=>{
   if(specifier.endsWith('.css'))return{};
   const local=specifier.startsWith('.')?path.resolve(path.dirname(filename),specifier):/^(lib|components)\//.test(specifier)?path.join(sourceRoot,specifier):undefined;
   if(local){const resolved=[local,`${local}.ts`,`${local}.tsx`].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());if(resolved&&/\.tsx?$/.test(resolved))return load(resolved);}
   return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return compiled.exports;
 }
 return load;
}
const load=loader(),{MIGRATION_FORMS,resolveMigrationForm,migrationFormCopy}=load(path.join(formRoot,'migration-form-config.props.ts'));
const {formDefinitions}=load(path.join(formRoot,'form-rules.props.ts'));
const Default=load(path.join(formRoot,'AllianzForm.tsx')).Default;
const fixtures=JSON.parse(fs.readFileSync(path.join(sourceRoot,'../content/native-content.json'),'utf8'));
const schemas=JSON.parse(fs.readFileSync(path.join(formRoot,'source-schemas.json'),'utf8'));
const page=(itemId,itemPath,editing=false)=>({mode:{isEditing:editing,isNormal:!editing},siteName:'allianz-life',layout:{sitecore:{context:{itemPath},route:{itemId,name:'Static form',fields:{},placeholders:{}}}}});
function render(props,p=page()) {return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider,{page:p,api:{},componentMap:new Map(),loadImportMap:async()=>({})},React.createElement(Default,{params:{},...props})));}
const emptyEnvelopes=[undefined,{}, {data:{}}, {data:{datasource:undefined}}, {data:{datasource:{}}}, {data:{datasource:{fieldCollection:[]}}}];
for(const config of MIGRATION_FORMS) {
 test(`${config.id}: exact rendering identity works without data or route context`,()=>{
  for(const uid of config.renderingIds) assert.equal(resolveMigrationForm({rendering:{uid}},page())?.id,config.id);
  for(const ds of config.datasourceIds) {
   assert.equal(resolveMigrationForm({rendering:{dataSource:`{${ds.toLowerCase()}}`}},page())?.id,config.id);
   assert.equal(resolveMigrationForm({fields:{data:{datasource:{id:ds}}}},page())?.id,config.id);
  }
 });
 test(`${config.id}: explicit static form gives identical SDK output for missing, empty and stale CMS fields`,()=>{
  for(const editing of [false,true]) {
   const p=page(undefined,'/api/editing/render',editing),props={params:{formId:config.id}};
   const expected=render(props,p);
   for(const fields of [...emptyEnvelopes,{data:{datasource:{schemaKey:{jsonValue:{value:'password'}},heading:{jsonValue:{value:'STALE CMS COPY'}},children:{results:[{id:'bad',label:{jsonValue:{value:'STALE LABEL'}},inputType:{jsonValue:{value:'password'}}}]}}}}]) assert.equal(render({...props,fields},p),expected);
   assert.doesNotMatch(expected,/allianz-missing-data|STALE|type="password"|action=|method=|fieldId|itemId/);
   assert.match(expected,new RegExp(`data-form-id="${config.id}"`));
   if(config.sourceHidden&&!editing) assert.match(expected,/data-source-hidden-form="true" hidden="" style="display:none"/);
  }
 });
 for(const nativeId of config.pageIds) test(`${config.id}: native page identity selects correctly at editing endpoint`,()=>{
  assert.equal(resolveMigrationForm({},page(nativeId,'/api/editing/render',true))?.id,config.id);
  assert.match(render({},page(nativeId,'/api/editing/render',true)),new RegExp(`data-form-id="${config.id}"`));
 });
 test(`${config.id}: every compiled field and option survives static definition generation`,()=>{
  const defs=formDefinitions(config.schemaKey);
  assert.deepEqual(defs.map(({labelField,...field})=>field),schemas[config.schemaKey].fields);
  for(const definition of defs) assert.equal(definition.labelField.jsonValue.value,definition.label);
  assert.deepEqual(Object.keys(migrationFormCopy(config)),Object.keys(config.copy));
 });
}
test('all 12 historical fixtures resolve to verified static forms without mutating fixtures',()=>{
 let count=0;
 for(const route of Object.values(fixtures.routes))for(const rendering of route.components)if(rendering.componentName==='AllianzForm'){
  const before=JSON.stringify(rendering),config=resolveMigrationForm({rendering,fields:rendering.fields},page());
  assert.ok(config,route.path);assert.ok(config.routes.includes(route.path));assert.equal(config.sourceHidden,rendering.params.nextSteps==='1');
  assert.doesNotMatch(render({rendering,fields:rendering.fields,params:rendering.params}),/temporarily unavailable|missing-data/);
  assert.equal(JSON.stringify(rendering),before);count++;
 }
 assert.equal(count,12);assert.equal(MIGRATION_FORMS.length,12);assert.equal(new Set(MIGRATION_FORMS.map(f=>f.id)).size,12);
});
test('ambiguous routes, conflicting known identities, invalid explicit config and unknown CMS schemas fail safely',()=>{
 const first=MIGRATION_FORMS[0], second=MIGRATION_FORMS[1], contact=MIGRATION_FORMS.find(f=>f.id==='ny-contact');
 assert.equal(resolveMigrationForm({},page(undefined,first.routes[0])),undefined);
 for(const f of [first,second])assert.equal(resolveMigrationForm({rendering:{uid:f.renderingIds[0]}},page(undefined,f.routes[0]))?.id,f.id);
 assert.equal(resolveMigrationForm({rendering:{uid:first.renderingIds[0],dataSource:second.datasourceIds[0]}},page()),undefined);
 assert.equal(resolveMigrationForm({rendering:{uid:first.renderingIds[0]}},page(contact.pageIds[0])),undefined);
 assert.equal(resolveMigrationForm({},page(contact.pageIds[0],MIGRATION_FORMS[2].routes[0])),undefined);
 assert.equal(resolveMigrationForm({params:{formId:'bad'},rendering:{uid:contact.renderingIds[0]}},page()),undefined);
 assert.equal(resolveMigrationForm({fields:{data:{datasource:{schemaKey:{jsonValue:{value:'death-claim'}}}}}},page()),undefined);
 assert.equal(resolveMigrationForm({},page(undefined,'//external.invalid/new-york/contact-us')),undefined);
 assert.match(render({}),/This form is temporarily unavailable/);
 assert.match(render({},page(undefined,undefined,true)),/known formId rendering parameter/);
});
test('exact public and native context paths select unambiguous routes; URL aliases cannot match missing context',()=>{
 for(const config of MIGRATION_FORMS){
  const route=config.routes[0];if(MIGRATION_FORMS.filter(f=>f.routes.includes(route)).length>1)continue;
  for(const pathname of [route,route+'/',`/sitecore/content/allianz/allianz-life/Home${route}`])assert.equal(resolveMigrationForm({},page(undefined,pathname))?.id,config.id);
 }
 for(const pathname of [undefined,'','https://example.invalid/new-york/contact-us','/missing','/api/editing/render'])assert.equal(resolveMigrationForm({},page(undefined,pathname)),undefined);
});
test('NY product inquiry retains seven source definitions and hides preset reason/product blocks',()=>{
 const config=MIGRATION_FORMS[0];assert.equal(config.fieldNames.length,7);assert.equal(config.hiddenFields.length,2);
 assert.equal(config.initialValues['ContactUsReason.SelectedReason'],'PurchaseProducts');
 const html=render({params:{formId:config.id}});
 assert.doesNotMatch(html,/name="ContactUsReason|name="_ProductSelector|SelectFirm|ProductCategory/);
 assert.equal((html.match(/class="form-control"/g)||[]).length,5);
});
test('generic source extraction keeps exact safe search fields; site search routing remains separate',()=>{
 assert.deepEqual(formDefinitions('generic').map(f=>f.name),['searchInput','selectPageCount','selectPage']);
 assert.equal(formDefinitions('generic')[0].maxLength,50);assert.deepEqual(formDefinitions('generic')[1].options.map(o=>o.value),['12','24','60','0']);
 assert.ok(fs.readFileSync(path.join(sourceRoot,'app/[site]/[locale]/search/SearchUtilityPage.tsx'),'utf8').includes('LocalSearchUtility'));
});
test('serialized Form query is empty, helpers excluded from generated component/import maps, no runtime service calls',()=>{
 const yaml=fs.readFileSync(path.resolve(sourceRoot,'../../../authoring/allianz-life/items/allianz.renderings/Allianz Life/Form.yml'),'utf8');
 assert.match(yaml,/Hint: ComponentQuery\n  Value: ""/);
 const cli=fs.readFileSync(path.join(sourceRoot,'../sitecore.cli.config.ts'),'utf8');assert.match(cli,/src\/components\/\*\*\/\*\.props\.tsx/);
 for(const filename of ['AllianzForm.tsx','GenericForm.props.tsx','ProductContactForm.props.tsx','migration-form-config.props.ts']){
  const source=fs.readFileSync(path.join(formRoot,filename),'utf8');
  assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|dangerouslySetInnerHTML|\baction=|\bmethod=|formDatasource\(/);
 }
});
