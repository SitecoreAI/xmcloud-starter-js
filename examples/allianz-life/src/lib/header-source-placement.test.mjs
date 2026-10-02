/** Source/cascade and rendered-markup checks; these do not measure browser layout. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { SitecoreProvider } = require('@sitecore-content-sdk/nextjs');
const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const source = postcss.parse(read('../../public/allianz-assets/source-style.css'));
const globals = postcss.parse(read('../app/globals.css'));
const overrides = postcss.parse(read('../assets/allianz-native-overrides.css'));
const src = fileURLToPath(new URL('..', import.meta.url));

// Resolve only the witnessed Search flex-item selectors, including margin
// shorthand. This is a cascade fixture, not an emulation of a browser's layout.
function searchMargins(roots, width, native = true, inHeader = true) {
  const control = native ? 'allianz-header-search' : 'c-navigation__search';
  const selectors = new Set([`.${control}`]);
  if (inHeader) {
    selectors.add(`.O-azl-header .${control}`);
    selectors.add(`.allianz-modern .O-azl-header .${control}`);
  }
  const resolved = new Map();
  let order = 0;
  for (const root of roots) root.walkRules((rule) => {
    for (let parent = rule.parent; parent.type !== 'root'; parent = parent.parent) {
      if (parent.type !== 'atrule') continue;
      if (parent.name !== 'media' || /print/.test(parent.params)) return;
      const min = parent.params.match(/\(min-width:\s*(\d+)px\)/);
      const max = parent.params.match(/\(max-width:\s*(\d+)px\)/);
      if ((!min && !max) || (min && width < +min[1]) || (max && width > +max[1])) return;
    }
    for (const selector of rule.selectors) {
      if (!selectors.has(selector)) continue;
      const classes = (selector.match(/\.[\w-]+/g) || []).length;
      for (const decl of rule.nodes) {
        if (decl.type !== 'decl' || !/^margin(?:-(?:top|right|bottom|left))?$/.test(decl.prop)) continue;
        const rank = [Number(Boolean(decl.important)), classes, ++order];
        const values = {};
        if (decl.prop === 'margin') {
          const [top, right = top, bottom = top, left = right] = decl.value.split(/\s+/);
          Object.assign(values, { top, right, bottom, left });
        } else values[decl.prop.slice('margin-'.length)] = decl.value;
        for (const [side, value] of Object.entries(values)) {
          const previous = resolved.get(side);
          const comparison = previous && rank.findIndex((part, index) => part !== previous.rank[index]);
          if (!previous || (comparison >= 0 && rank[comparison] > previous.rank[comparison])) {
            resolved.set(side, { rank, value });
          }
        }
      }
    }
  });
  return Object.fromEntries(['top', 'right', 'bottom', 'left']
    .map((side) => [side, resolved.get(side)?.value ?? '0']));
}

test('recovered Search has zero margins through 991px, unlike the deployed adapter baseline', () => {
  for (const width of [375, 703, 704, 768, 991]) {
    assert.deepEqual(searchMargins([source], width, false), { top: '0', right: '0', bottom: '0', left: '0' });
  }
  // These globals were present in integratedpublic26af19c74e447779705c771dbf2b717594cc2d7d.
  assert.equal(searchMargins([globals, source], 703).right, '16px');
  assert.equal(searchMargins([globals, source], 704).left, 'auto');
  assert.equal(searchMargins([globals, source], 991).left, 'auto');
});

test('Search removes the mobile gap and starts the tablet row at the exact source breakpoints', () => {
  for (const roots of [[globals, source, overrides], [globals, overrides, source], [overrides, globals, source]]) {
    for (const width of [375, 703]) {
      assert.deepEqual(searchMargins(roots, width), { top: '0', right: '0', bottom: '0', left: '0' });
    }
    for (const width of [704, 768, 991]) {
      assert.deepEqual(searchMargins(roots, width), { top: '0', right: 'auto', bottom: '0', left: '0' });
    }
    // The desktop row continues to use its already-matched auto left margin.
    for (const width of [992, 1024, 1440]) {
      assert.deepEqual(searchMargins(roots, width), searchMargins([globals, source], width));
    }
  }
});

test('placement rules remain isolated to native header Search', () => {
  for (const width of [703, 704, 991, 992]) {
    assert.deepEqual(searchMargins([globals, overrides, source], width, true, false),
      searchMargins([globals, source], width, true, false));
    assert.deepEqual(searchMargins([globals, overrides, source], width, false),
      searchMargins([source], width, false));
  }
  const placementRules = [];
  overrides.walkRules((rule) => {
    if (rule.selector.includes('allianz-header-search')) placementRules.push(rule);
  });
  assert.ok(placementRules.length > 0);
  for (const rule of placementRules) {
    assert.deepEqual(rule.selectors, ['.allianz-modern .O-azl-header .allianz-header-search']);
    assert.ok(rule.nodes.every((node) => node.type === 'decl' && /^margin-(left|right)$/.test(node.prop)),
      'placement must not add speculative vertical, transform, or control-size changes');
  }
});

test('the Search inline-flex adapter restores source top alignment without a pixel offset', () => {
  function verticalAlign(roots, native) {
    const selectors = new Set(native ? ['button', 'button:where(.allianz-modern *, .allianz-legacy *)',
      '.allianz-text-button', '.allianz-header-search > button',
      '.allianz-modern .O-azl-header .allianz-text-button'] : ['a', '.c-link']);
    let winner;
    let order = 0;
    for (const root of roots) root.walkRules((rule) => {
      // The witnessed inline alignment is not conditional on viewport width.
      if (rule.parent.type !== 'root') return;
      for (const selector of rule.selectors) {
        if (!selectors.has(selector)) continue;
        const flat = selector.replace(/:where\([^)]*\)/g, '');
        const classes = (flat.match(/\.[\w-]+/g) || []).length;
        const elements = (flat.replace(/\.[\w-]+/g, '').match(/\b[a-zA-Z][\w-]*\b/g) || []).length;
        rule.walkDecls('vertical-align', (decl) => {
          const rank = [Number(Boolean(decl.important)), classes, elements, ++order];
          const comparison = winner && rank.findIndex((part, index) => part !== winner.rank[index]);
          if (!winner || (comparison >= 0 && rank[comparison] > winner.rank[comparison])) {
            winner = { value: decl.value, rank };
          }
        });
      }
    });
    return winner?.value ?? 'baseline';
  }
  assert.equal(verticalAlign([source], false), 'top');
  assert.equal(verticalAlign([globals, source], true), 'baseline');
  for (const roots of [[globals, source, overrides], [globals, overrides, source], [overrides, globals, source]]) {
    assert.equal(verticalAlign(roots, true), verticalAlign([source], false));
  }
});

function renderHeader(mobile, isEditing) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, compiled);
    const nativeRequire = compiled.require.bind(compiled);
    compiled.require = (specifier) => {
      if (filename.endsWith('AllianzHeader.tsx') && specifier === 'react') {
        return { ...React, useSyncExternalStore: () => mobile };
      }
      if (specifier === 'next/navigation') return { useRouter: () => ({ push() {} }) };
      const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
        : /^(components|lib)\//.test(specifier) ? path.join(src, specifier) : undefined;
      if (local) {
        const file = [local, local + '.ts', local + '.tsx'].find((candidate) => fs.existsSync(candidate));
        if (file && /\.tsx?$/.test(file)) return load(file);
      }
      return nativeRequire(specifier);
    };
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, filename);
    return compiled.exports;
  }
  const Header = load(path.join(src, 'components/allianz-header/AllianzHeader.tsx')).Default;
  return renderToStaticMarkup(React.createElement(SitecoreProvider, {
    page: { mode: { isEditing, isNormal: !isEditing, isPreview: false }, siteName: 'allianz-life',
      layout: { sitecore: { context: {}, route: { name: 'Search placement contract', fields: {}, placeholders: {} } } } },
    api: {}, componentMap: new Map(), loadImportMap: async () => ({}),
  }, React.createElement(Header, { fields: { data: { datasource: {
    logo: { jsonValue: { value: { src: '/allianz-assets/logo.svg', alt: 'Allianz Life', width: 122, height: 30 } } },
    tagline: { jsonValue: { value: 'Allianz Life' } }, primaryNav: { targetItems: [] }, utilityNav: { targetItems: [] },
  } } } })));
}

test('rendered Search retains an explicit name when the source mobile styling hides its text', () => {
  const hidden = [];
  globals.walkRules((rule) => {
    if (rule.selector === '.allianz-header-search > button span') {
      rule.walkDecls('display', (decl) => hidden.push({ value: decl.value, media: rule.parent.params }));
    }
  });
  assert.deepEqual(hidden, [{ value: 'none', media: '(max-width: 703px)' }]);
  for (const mobile of [false, true]) for (const isEditing of [false, true]) {
    const html = renderHeader(mobile, isEditing);
    const button = html.match(/<button\b[^>]*class="allianz-text-button a-link"[^>]*>.*?<\/button>/s)?.[0];
    assert.ok(button, 'the native Search control is rendered');
    assert.match(button, /aria-label="Search"/);
    assert.match(button, /aria-expanded="false"/);
    assert.match(button, /aria-controls="allianz-header-search"/);
    assert.match(button, /<i aria-hidden="true" class="c-icon c-icon--search"><\/i><span>Search<\/span>/);
  }
});
