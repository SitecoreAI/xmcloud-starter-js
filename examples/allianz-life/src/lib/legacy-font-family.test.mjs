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
const postcss = require('postcss');
const root = fileURLToPath(new URL('..', import.meta.url));
const componentMap = new Map();
// CSS checks are source contracts. SSR does not establish a browser's loaded or rendered font.
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
    // Non-layout shells are irrelevant to these real SDK placeholder tests.
    if (['src/Scripts', 'components/content-sdk/SitecoreStyles', 'components/content-sdk/ConsentControls',
      'components/content-sdk/ServiceUnavailable'].includes(specifier)) return { __esModule: true, default: () => null };
    const local = specifier.startsWith('.') ? path.resolve(path.dirname(filename), specifier)
      : /^(components|lib)\//.test(specifier) ? path.join(root, specifier)
        : specifier.startsWith('src/') ? path.join(root, specifier.slice(4)) : undefined;
    if (local) {
      const resolved = [local, `${local}.ts`, `${local}.tsx`].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved && /\.tsx?$/.test(resolved)) return loadSource(resolved);
      if (resolved?.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
    return nativeRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const appRoot = path.dirname(root.replace(/\/$/, ''));
const globalCss = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const legacyCss = fs.readFileSync(path.join(root, 'assets/allianz-legacy.css'), 'utf8');
const globalRules = postcss.parse(globalCss);
const legacyRules = postcss.parse(legacyCss);
const family = (value) => value.replace(/['"]/g, '');
const declarations = (node) => Object.fromEntries(node.nodes.filter((n) => n.type === 'decl').map((n) => [n.prop, n.value]));
const faces = [];
globalRules.walkAtRules('font-face', (rule) => faces.push(declarations(rule)));

test('legacy Regular-only alias restores the original normal weight-500 face with the existing asset', () => {
  const alias = faces.filter((face) => family(face['font-family']) === 'AllianzNeoRegular');
  assert.deepEqual(alias, [{
    'font-family': "'AllianzNeoRegular'", 'font-style': 'normal', 'font-weight': '500',
    'font-display': 'swap', src: "url('/fonts/allianz/AllianzNeoW01-Regular.woff2') format('woff2')",
  }]);
});

test('modern unified Neo face selection retains Light 300, Regular 400, SemiBold 600 and Bold 700', () => {
  const modern = faces.filter((face) => family(face['font-family']) === 'Allianz Neo');
  assert.equal(modern.length, 4);
  for (const [weight, name] of [['300', 'Light'], ['400', 'Regular'], ['600', 'SemiBold'], ['700', 'Bold']]) {
    assert.deepEqual(modern.find((face) => face['font-weight'] === weight), {
      'font-family': "'Allianz Neo'", 'font-style': 'normal', 'font-weight': weight, 'font-display': 'swap',
      src: `url('/fonts/allianz/AllianzNeoW01-${name}.woff2') format('woff2')`,
    });
  }
  assert.equal(faces.length, 6, 'No unverified Light/Bold aliases or replacement assets');
});

test('the restored family is used only by the important legacy-root rule', () => {
  const aliases = [];
  legacyRules.walkDecls('font-family', (decl) => {
    if (decl.value.includes('AllianzNeoRegular')) aliases.push(decl);
  });
  assert.equal(aliases.length, 1);
  const alias = aliases[0];
  assert.equal(alias.parent.selector, '.allianz-legacy.new-york,.allianz-legacy');
  assert.equal(alias.value, 'AllianzNeoRegular,sans-serif');
  assert.equal(alias.important, true);
  assert.deepEqual(alias.parent.nodes.map((n) => n.prop), ['font-family']);
  globalRules.walkRules((rule) => {
    rule.walkDecls('font-family', (decl) => assert.ok(!decl.value.includes('AllianzNeoRegular')));
  });
  legacyRules.walkDecls('font-family', (decl) => {
    if (decl.parent.selector?.includes('.allianz-modern')) assert.ok(!decl.value.includes('AllianzNeoRegular'));
  });
});

test('the served public legacy stylesheet is byte-identical and still wired by the root layout', () => {
  assert.equal(fs.readFileSync(path.join(appRoot, 'public/allianz-legacy-assets/legacy-style.css'), 'utf8'), legacyCss);
  const layout = fs.readFileSync(path.join(root, 'app/layout.tsx'), 'utf8');
  assert.match(layout, /import '\.\/globals\.css';/);
  assert.match(layout, /href="\/allianz-legacy-assets\/legacy-style\.css"/);
  assert.match(layout, /href="\/allianz-assets\/source-style\.css"/);
});

const LegacyRichText = loadSource(path.join(root, 'components/allianz-legacy-rich-text/AllianzLegacyRichText.tsx'));
const ModernRichText = loadSource(path.join(root, 'components/allianz-rich-text/AllianzRichText.tsx'));
const Layout = loadSource(path.join(root, 'Layout.tsx')).default;
componentMap.set('AllianzLegacyRichText', LegacyRichText);
componentMap.set('AllianzRichText', ModernRichText);
const field = (name, value) => ({ jsonValue: { value, metadata: {
  itemId: 'font-test-item', fieldId: `font-test-${name}`, fieldType: 'Rich Text',
} } });
const body = '<p>Ordinary editorial text with <strong>emphasis</strong> and <a href="/privacy">a link</a>.</p>';
function fixture(editing, shell, value = body) {
  const legacy = shell !== 'modern';
  const componentName = legacy ? 'AllianzLegacyRichText' : 'AllianzRichText';
  return {
    mode: { isEditing: editing, isNormal: !editing }, siteName: 'allianz-life',
    layout: { sitecore: { context: {}, route: { name: 'Font contract', fields: {
      shellFamily: { value: legacy ? 'legacy' : '' }, legacySharedKey: { value: shell === 'new-york' ? 'new-york' : '' },
    }, placeholders: {
      'headless-header': [], 'headless-footer': [], 'headless-main': [{
        componentName, uid: 'font-test-rendering', params: { layout: 'rich-text' },
        fields: { data: { datasource: { body: field('body', value) } } },
      }],
    } } } },
  };
}
function render(page) {
  return renderToStaticMarkup(React.createElement(sdk.SitecoreProvider, {
    page, api: {}, componentMap, loadImportMap: async () => ({}),
  }, React.createElement(Layout, { page })));
}

for (const editing of [false, true]) {
  for (const shell of ['new-york', 'legacy', 'modern']) {
    test(`real SDK ${editing ? 'editing' : 'visitor'} ${shell} keeps the intended root and ordinary RichText inheritance`, () => {
      const page = fixture(editing, shell);
      const before = JSON.stringify(page);
      const html = render(page);
      const classValue = html.match(/<div[^>]*class="((?:editing|prod)-mode [^"]*)"/)?.[1];
      assert.ok(classValue);
      const classes = classValue.split(/\s+/);
      assert.equal(classes.includes('allianz-legacy'), shell !== 'modern');
      assert.equal(classes.includes('allianz-modern'), shell === 'modern');
      assert.equal(classes.includes('new-york'), shell === 'new-york');
      assert.ok(html.includes(body));
      assert.doesNotMatch(html, /style="[^"]*font|AllianzNeoRegular/);
      if (shell === 'modern') {
        assert.match(html, /class="o-richTextEditor__wrapper"/);
        assert.doesNotMatch(html, /allianz-legacy-editorial|id="content-body"/);
      } else {
        assert.match(html, /class="allianz-legacy-editorial"/);
        assert.match(html, /id="content-body" class="col-md-10 col-md-offset-1 center-column"/);
      }
      if (editing) {
        assert.match(html, /fieldId.*font-test-body/);
        assert.match(html, /chrometype="placeholder"/);
        assert.match(html, /chrometype="rendering"[^>]*id="font-test-rendering"/);
      }
      assert.equal(JSON.stringify(page), before);
    });
  }
}

test('cleared legacy body retains genuine SDK editing metadata without invented font or text', () => {
  const normal = render(fixture(false, 'new-york', ''));
  const editing = render(fixture(true, 'new-york', ''));
  assert.doesNotMatch(normal, /Ordinary editorial|font-test-body|AllianzNeoRegular/);
  assert.match(editing, /fieldId.*font-test-body/);
  assert.doesNotMatch(editing, /Ordinary editorial|AllianzNeoRegular/);
});
