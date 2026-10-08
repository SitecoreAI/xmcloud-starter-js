import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const require = createRequire(path.join(sourceRoot, '../package.json'));
const ts = require('typescript'), React = require('react'), sdk = require('@sitecore-content-sdk/nextjs');
const { renderToStaticMarkup } = require('react-dom/server');
export function runtime(sectionOverride) {
 const componentMap = new Map(), modules = new Map();
 function load(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = new Module(filename); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename)); modules.set(filename, mod);
  const nativeRequire = mod.require.bind(mod);
  mod.require = specifier => {
   if (specifier.endsWith('.css')) return {};
   if (specifier === '.sitecore/component-map') return { __esModule: true, default: componentMap };
   const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier) : /^(lib|components)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
   if (local) { const p = [local, `${local}.ts`, `${local}.tsx`].find(p => fs.existsSync(p) && fs.statSync(p).isFile()); if (p && /\.tsx?$/.test(p)) return load(p); }
   return nativeRequire(specifier);
  };
  const override = filename.endsWith('/allianz-editorial-section/AllianzEditorialSection.tsx') && sectionOverride;
  mod._compile(ts.transpileModule(override || fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
 }
 for (const [name, dir] of [['AllianzEditorialSection','allianz-editorial-section'],['AllianzCardGrid','allianz-card-grid'],['AllianzArticle','allianz-article']]) componentMap.set(name, load(path.join(sourceRoot, `components/${dir}/${name}.tsx`)));
 return { componentMap, render(rendering, editing = false) {
  const page = { mode: { isEditing: editing, isNormal: !editing, isPreview: false }, siteName: 'allianz-life', layout: { sitecore: { context: {}, route: { name: 'Test-only structural composition', fields: {}, placeholders: {} } } } };
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, { page, api: {}, componentMap, loadImportMap: async () => ({}) }, React.createElement(componentMap.get(rendering.componentName)[rendering.params?.FieldNames || 'Default'], { page, params: rendering.params, fields: rendering.fields, rendering })));
 } };
}
export const fixtures = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'lib/editorial-section-containers.fixture.json'))).cases;
export function field(name, value, item) { return { jsonValue: { value, metadata: { itemId: `test-only-${item}`, fieldId: `test-only-${item}-${name}`, fieldType: ['body','subheading'].includes(name) ? 'Rich Text' : ['icon','image'].includes(name) ? 'Image' : name === 'link' ? 'General Link' : 'Single-Line Text' } } }; }
function cardData(card) {
 const item = card.sourceJobKey;
 return { id: `test-only-${item}`, ...Object.fromEntries(Object.entries(card).filter(([name]) => !['sourceJobKey','sourceJobSha256','links'].includes(name)).map(([name,value]) => [name,field(name,value,item)])), links: { targetItems: card.links.map((link,index) => ({ id: `test-only-${item}-link-${index}`, ...Object.fromEntries(Object.entries(link).map(([name,value])=>[name,field(name,value,`${item}-link-${index}`)])) })) } };
}
export function tree(fixture, resolved = false) {
 let serial = 101;
 const next = () => String(serial++);
 function section(params, children, key) { const id = next(); return { componentName: 'AllianzEditorialSection', uid: `test-only-${key}-${id}`, params: { FieldNames: 'Default', ...params, DynamicPlaceholderId:id }, placeholders: { [`allianz-editorial-section-${resolved ? id : '{*}'}`]: children } }; }
 const card = (block,variant) => ({ componentName: 'AllianzCardGrid', uid: `test-only-${block.card.sourceJobKey}`, dataSource: `test-only-${block.card.sourceJobKey}-datasource`, params: { FieldNames:variant,...block.params }, fields: { data: { datasource: { children: { results:[cardData(block.card)] } } } } });
 const children = [];
 if(fixture.anchor) children.push(section({ container:'content',RenderingIdentifier:fixture.anchor },[],'anchor'));
 children.push(card(fixture.intro,'EditorialIntro'));
 if(fixture.tail) children.push(section(fixture.tail.params,[],'tail'));
 if(fixture.contentCards.length) children.push(section(fixture.contentRowParams,fixture.contentCards.map(c=>card(c,'EditorialTiles')),'shared-column'));
 return section(fixture.sectionParams,children,fixture.name);
}
