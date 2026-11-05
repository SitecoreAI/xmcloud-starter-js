import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const appRoot = process.env.ALLIANZ_NY_TEST_ROOT || fileURLToPath(new URL('../../../../', import.meta.url));
const videoCSS = fs.readFileSync(path.join(appRoot, 'src/components/allianz-video/AllianzVideo.css'), 'utf8');
const videoRules = postcss.parse(videoCSS);
const sourceCSS = fs.readFileSync(path.join(appRoot, 'public/allianz-assets/source-style.css'), 'utf8');
const sourceRules = postcss.parse(sourceCSS);
const legacyRules = postcss.parse(fs.readFileSync(path.join(appRoot, 'public/allianz-legacy-assets/legacy-style.css'), 'utf8'));
const titleSelector = '.allianz-legacy.new-york:has(.allianz-legacy-new-york-video) .page-header h1';
const scrollbarBoundary = ':where(html:not(:has(#page-new-york.allianz-legacy.new-york, .allianz-legacy.new-york .allianz-legacy-new-york-video)), html:not(:has(#page-new-york.allianz-legacy.new-york, .allianz-legacy.new-york .allianz-legacy-new-york-video)) *, .mfe *)';
const suffixes = ['::-webkit-scrollbar', '::-webkit-scrollbar:horizontal', '::-webkit-scrollbar:vertical', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-track'];
const declarations = rule => Object.fromEntries(rule.nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]));
const mediaAllows = (rule, width) => {
  for (let parent = rule.parent; parent?.type !== 'root'; parent = parent.parent) {
    if (parent?.type !== 'atrule' || parent.name !== 'media') return false;
    const min = /min-width:\s*(\d+)px/.exec(parent.params);
    const max = /max-width:\s*(\d+)px/.exec(parent.params);
    if ((min && width < Number(min[1])) || (max && width > Number(max[1]))) return false;
  }
  return true;
};
const retainedSourceTitle = width => {
  const result = {};
  legacyRules.walkRules(rule => {
    if (!rule.selectors.includes('.allianz-legacy.page-header h1') || !mediaAllows(rule, width)) return;
    for (const declaration of rule.nodes.filter(n => n.type === 'decl')) {
      // The recovery retained invalid historical pxrem declarations. Browsers
      // ignore those; select the valid px source fallback rather than inventing rem.
      if (declaration.prop === 'font-size' && /^\d+px$/.test(declaration.value)) result.fontSize = declaration.value;
      if (declaration.prop === 'margin') result.margin = declaration.value;
    }
  });
  return result;
};

test('the retained public legacy rules establish the exact mobile and desktop title values', () => {
  assert.deepEqual(retainedSourceTitle(370), { fontSize: '32px', margin: '0 0 20px' });
  assert.deepEqual(retainedSourceTitle(1280), { fontSize: '40px', margin: '-8px 0 19px' });
  const inheritedLineHeights = [];
  legacyRules.walkRules(rule => {
    if (rule.selectors.includes('.allianz-legacy h1')) {
      for (const decl of rule.nodes.filter(n => n.type === 'decl' && n.prop === 'line-height')) inheritedLineHeights.push(decl.value);
    }
  });
  assert.ok(inheritedLineHeights.includes('1.1'));
  // The recovered selector matches a wrapper that is ALSO page-header, not
  // the actual descendant header. Correcting only the named opt-in reconnects it.
  assert.notEqual('.allianz-legacy.page-header h1', '.allianz-legacy .page-header h1');
});

test('the named NY player reconnects source title typography without changing other page owners', () => {
  const matches = [];
  videoRules.walkRules(titleSelector, rule => matches.push(rule));
  assert.equal(matches.length, 2);
  const base = matches.find(rule => rule.parent.type === 'root');
  const desktop = matches.find(rule => rule.parent.type === 'atrule' && rule.parent.name === 'media' && rule.parent.params === '(min-width: 768px)');
  assert.ok(base);
  assert.ok(desktop);
  assert.deepEqual(declarations(base), { 'font-size': '32px', 'line-height': '1.1', margin: '0 0 20px' });
  assert.deepEqual(declarations(desktop), { 'font-size': '40px', margin: '-8px 0 19px' });
  for (const rule of matches) {
    assert.ok(rule.selector.startsWith('.allianz-legacy.new-york:has(.allianz-legacy-new-york-video) '));
    for (const declaration of rule.nodes.filter(n => n.type === 'decl')) {
      assert.ok(['font-size', 'line-height', 'margin'].includes(declaration.prop));
      assert.equal(Boolean(declaration.important), false);
    }
  }
  assert.doesNotMatch(videoCSS, /(?:padding-right|margin-right|width):\s*(?:9|15)px/, 'No measured gutter or transcript compensation');
});

test('the five scrollbar rules exempt only the old NY shell or the named NY player owner', () => {
  assert.equal(sourceCSS.split(scrollbarBoundary).length - 1, 5);
  for (const suffix of suffixes) {
    const matches = [];
    sourceRules.walkRules(scrollbarBoundary + suffix, rule => matches.push(rule));
    assert.equal(matches.length, 1, suffix);
  }
  assert.ok(scrollbarBoundary.includes('#page-new-york.allianz-legacy.new-york'));
  assert.ok(scrollbarBoundary.includes('.allianz-legacy.new-york .allianz-legacy-new-york-video'));
  assert.ok(scrollbarBoundary.endsWith(', .mfe *)'));
  assert.doesNotMatch(scrollbarBoundary, /:has\([^)]*:has\(/, 'No invalid nested :has');
  assert.doesNotMatch(scrollbarBoundary, /page-video|allianz-modern/, 'No blanket video-route or modern-site exemption');
});

test('source MFE and table scrollbar controls remain independent of the page exemption', () => {
  for (const selector of ['.o-table__container::-webkit-scrollbar:vertical', '.mfe ::-webkit-scrollbar']) {
    // The modern stylesheet has its own table rule and the retained legacy
    // stylesheet keeps its explicitly scoped MFE rule. Neither is rewritten.
    const corpus = selector.startsWith('.mfe ') ? legacyRules : sourceRules;
    const expected = selector.startsWith('.mfe ') ? '.allianz-legacy ' + selector : selector;
    const matches = [];
    corpus.walkRules(expected, rule => matches.push(rule));
    assert.ok(matches.length > 0, expected);
  }
  const fallback = [];
  sourceRules.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'supports' && rule.parent.params === 'not (selector(html:has(*)) and selector(:where(html)))') fallback.push(rule.selector);
  });
  assert.deepEqual(fallback, suffixes);
});


test('the named native NY split uses one source collapsed transcript gap', () => {
  const sourceArticle = [];
  const sourceAccordion = [];
  legacyRules.walkRules('.allianz-legacy article.video-block', rule => sourceArticle.push(declarations(rule)));
  legacyRules.walkRules('.allianz-legacy .accordion.panel-group', rule => sourceAccordion.push(declarations(rule)));
  assert.equal(sourceArticle.at(-1)['margin-bottom'], '15px');
  assert.equal(sourceAccordion.at(-1).margin, '20px 0');
  const splitOwnership = [];
  videoRules.walkRules('.allianz-legacy.new-york .allianz-legacy-new-york-video', rule => splitOwnership.push(rule));
  assert.equal(splitOwnership.length, 1);
  assert.equal(splitOwnership[0].parent.type, 'root');
  assert.deepEqual(declarations(splitOwnership[0]), { 'margin-bottom': '0' });
  // Source siblings collapse 15px with 20px. Native's floated transcript row
  // contains its own 20px margin, so the standalone video must not add 15px.
  const sourceGap = Math.max(Number.parseFloat(sourceArticle.at(-1)['margin-bottom']),
    Number.parseFloat(sourceAccordion.at(-1).margin));
  const nativeGap = Number.parseFloat(declarations(splitOwnership[0])['margin-bottom'])
    + Number.parseFloat(sourceAccordion.at(-1).margin);
  assert.equal(sourceGap, 20);
  assert.equal(nativeGap, sourceGap);
});

test('transcript gap ownership leaves ordinary video and other page owners unchanged', () => {
  const marginRules = [];
  videoRules.walkRules(rule => {
    if (rule.nodes.some(n => n.type === 'decl' && n.prop === 'margin-bottom')) marginRules.push(rule);
  });
  assert.equal(marginRules.length, 1);
  assert.equal(marginRules[0].selector, '.allianz-legacy.new-york .allianz-legacy-new-york-video');
  assert.equal(Boolean(marginRules[0].nodes.find(n => n.type === 'decl').important), false);
  assert.doesNotMatch(videoCSS, /margin-(?:top|bottom):\s*-\d/);
  const ordinary = [];
  legacyRules.walkRules('.allianz-legacy article.video-block', rule => ordinary.push(declarations(rule)));
  assert.equal(ordinary.at(-1)['margin-bottom'], '15px');
  const modern = [];
  videoRules.walkRules('section.allianz-local-video article.video-block', rule => modern.push(declarations(rule)));
  assert.equal(modern.at(-1).margin, '64px auto');
});
