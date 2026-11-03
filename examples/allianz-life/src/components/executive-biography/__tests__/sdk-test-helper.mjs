import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const sourceRoot = path.resolve(here, '../../..');
const dependencyRoot = path.resolve(sourceRoot, '..');
export const require = createRequire(path.join(dependencyRoot, 'package.json'));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const { PathnameContext } = require('next/dist/shared/lib/hooks-client-context.shared-runtime');
const preventSSRNavigation = () => { throw new Error('SSR must not navigate'); };
const ssrRouter = Object.fromEntries(['push', 'replace', 'back', 'forward', 'refresh', 'prefetch']
  .map(name => [name, preventSSRNavigation]));
export const withTestAppRouter = (children, pathname = '/') => React.createElement(AppRouterContext.Provider, {
  value: ssrRouter,
}, React.createElement(PathnameContext.Provider, { value: pathname }, children));
const modules = new Map();
export function loadSource(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(dependencyRoot);
  modules.set(filename, compiled);
  compiled.require = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(sourceRoot, specifier) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`]
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) return /\.tsx?$/.test(resolved) ? loadSource(resolved) : require(resolved);
    }
    return require(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
export function render(Component, datasource, isEditing = false, params = {}) {
  return renderToStaticMarkup(withTestAppRouter(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Biography', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Component, { params,
    fields: datasource === undefined ? undefined : { data: { datasource } },
  }))));
}
export const field = (value) => ({ jsonValue: { value } });
export const metadata = (name, type) => ({ fieldId: `test-${name}-field`, fieldType: type, itemId: 'test-biography-item' });
