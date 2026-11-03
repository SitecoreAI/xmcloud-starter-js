import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../../..');
const require = createRequire(path.join(app, 'package.json'));
const ts = require('typescript');
const React = require('react');
const postcss = require('postcss');
const componentFile = path.join(here, 'SourceToolFrame.props.tsx');
const css = fs.readFileSync(path.join(here, 'SourceToolFrame.module.css'), 'utf8');
const sourceCss = fs.readFileSync(path.join(app, 'public/allianz-assets/rila-strategy/index-advantage-plus.css'), 'utf8');

// Isolated hook-state inputs exercise the real component's render decisions.
// No global React mutation, DOM implementation, timer, observer or browser is used.
function renderFrame({ preset = 'strategy-plus', profile, status, height = 3877 } = {}) {
  let stateIndex = 0;
  const compiled = new Module(componentFile);
  compiled.filename = componentFile;
  compiled.paths = Module._nodeModulePaths(app);
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => {
    if (specifier === 'react') return { ...React,
      useRef: () => ({ current: null }),
      useState: () => [stateIndex++ === 0 ? height : status, () => {}],
      useEffect: () => {},
    };
    if (specifier === './source-tool-frame') return { observeSourceToolFrame: () => { throw new Error('No effect should run in this render-only test'); } };
    if (specifier === './SourceToolFrame.module.css') return { __esModule: true, default: {
      strategyViewportContainer: 'strategy-frame-container-class', strategyMobileViewport: 'strategy-mobile-viewport-class',
    } };
    return originalRequire(specifier);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(componentFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, componentFile);
  const result = compiled.exports.SourceToolFrame({ preset, src: '/exact-local-frame.html', title: 'Source tool', sourcePagePath: '/exact-demo-route', viewportProfile: profile });
  const [wrapper, alert] = React.Children.toArray(result.props.children);
  return { wrapper, frame: wrapper.props.children, alert };
}

test('Income and unprofiled frames keep their exact shared auto-height render behavior', () => {
  for (const preset of ['income-adv', 'income-plus', 'income-select', 'strategy-plus']) {
    const { wrapper, frame, alert } = renderFrame({ preset, status: { preset, available: true } });
    assert.equal(wrapper.props.className, undefined);
    assert.deepEqual(wrapper.props.style, { width: '100%', overflow: 'hidden' });
    assert.equal(frame.props.className, undefined);
    assert.deepEqual(frame.props.style, { display: 'block', width: '100%', height: 3877, border: 0 });
    assert.equal(frame.props.src, '/exact-local-frame.html');
    assert.equal(alert, undefined);
  }
});

test('only a ready, explicitly profiled Strategy frame receives the mobile viewport class', () => {
  const { wrapper, frame } = renderFrame({ profile: 'strategy-mobile', status: { preset: 'strategy-plus', available: true } });
  assert.equal(wrapper.props.className, 'strategy-frame-container-class');
  assert.equal(frame.props.className, 'strategy-mobile-viewport-class');
  // Keep this original auto-height value for desktop; the container rule overrides it only on mobile.
  assert.equal(frame.props.style.height, 3877);
  assert.equal(frame.props.style.width, '100%');
});

test('loading, failed and stale-preset states retain auto-height and the normal failure alert', () => {
  for (const status of [undefined, { preset: 'strategy-plus', available: false }, { preset: 'income-plus', available: true }]) {
    const { wrapper, frame, alert } = renderFrame({ profile: 'strategy-mobile', status, height: 44 });
    assert.equal(wrapper.props.className, undefined);
    assert.equal(frame.props.className, undefined);
    assert.equal(frame.props.style.height, 44);
    if (status?.available === false) {
      assert.equal(alert.props.role, 'alert');
      assert.equal(alert.props.children, 'The calculator could not be loaded. Please try again later.');
    } else assert.equal(alert, undefined);
  }
});

test('the container-width override matches the source threshold760/761 and uses stable viewport height', () => {
  const root = postcss.parse(css);
  const rules = [];
  root.walkRules((rule) => rules.push(rule));
  assert.equal(rules.length, 2);
  assert.equal(rules[0].selector, '.strategyViewportContainer');
  assert.deepEqual(rules[0].nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]), [['container-type', 'inline-size']]);
  assert.equal(rules[1].selector, '.strategyMobileViewport');
  assert.equal(rules[1].parent.name, 'container');
  assert.equal(rules[1].parent.params, '(max-width: 760px)');
  const threshold = Number(/max-width:\s*(\d+)px/.exec(rules[1].parent.params)[1]);
  assert.deepEqual([746, 760, 761].map((frameWidth) => frameWidth <= threshold), [true, true, false]);
  assert.deepEqual(rules[1].nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value, node.important]), [['height', '100vh', true], ['height', '100svh', true]]);
  const source = postcss.parse(sourceCss);
  let sourceBreakpoint;
  source.walkRules((rule) => {
    if (rule.selector === '.mobile__results__button,.mobile__disclosures__section') sourceBreakpoint = rule.parent.params;
  });
  assert.equal(sourceBreakpoint.replace(/\s/g, ''), 'onlyscreenand(max-width:760px)');
});

test('the code-owned registry opts in Strategy alone without changing any Income preset', () => {
  function load(relative) {
    const filename = path.join(here, relative);
    const compiled = new Module(filename);
    compiled.filename = filename;
    compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
    return compiled.exports;
  }
  const strategy = load('rila-strategy-presets.props.ts').RILA_STRATEGY_PRESETS;
  const income = load('rila-income-presets.ts').RILA_INCOME_PRESETS;
  assert.deepEqual(Object.keys(strategy), ['strategy-plus']);
  assert.equal(strategy['strategy-plus'].viewportProfile, 'strategy-mobile');
  for (const preset of Object.values(income)) assert.equal(preset.viewportProfile, undefined);
});
