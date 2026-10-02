import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
export const sourceRoot = fileURLToPath(new URL('../../..', import.meta.url));
const modules = new Map();
export function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, compiled);
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate));
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
export const component = (folder, name) => loadSource(path.join(sourceRoot, `components/${folder}/${name}.tsx`));
export const contract = (folder) => loadSource(path.join(sourceRoot, `components/${folder}/${folder}.props.ts`));
export const fixture = (folder) => JSON.parse(fs.readFileSync(path.join(sourceRoot, `components/${folder}/__tests__/native-draft.json`), 'utf8'));
export const witness = (folder) => fs.readFileSync(path.join(sourceRoot, `components/${folder}/__tests__/${folder}.source.html`), 'utf8');
export function render(Component, datasource, isEditing = false, params = {}) {
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Why Allianz', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params, fields: { data: { datasource } } })));
}
export const wire = (entry) => ({ id: entry.id, ...(entry.children ? { children: { ...entry.children, results: entry.children.results.map(wire) } } : {}),
  fieldCollection: Object.entries(entry).filter(([name]) => !['id', 'children'].includes(name))
    .map(([name, field]) => ({ name, jsonValue: field?.jsonValue })) });
export const field = (id, type, value) => ({ jsonValue: { value, metadata: { itemId: 'native-author-item', fieldId: id, fieldType: type } } });
export const decode = (html) => html.replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");
export const editingIds = (html) => [...html.matchAll(/<code [^>]*kind="open"[^>]*>(.*?)<\/code>/g)].map((m) => JSON.parse(decode(m[1])).fieldId).sort();
export const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/g)].map((m) => m[1]);
export const complete = (entries) => ({ total: entries.length, pageInfo: { hasNext: false, endCursor: null }, results: entries });
