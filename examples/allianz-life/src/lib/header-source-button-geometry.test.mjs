/** Focused source/cascade regression; deployed browser measurements remain required. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const read = (file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const source = postcss.parse(read('../../public/allianz-assets/source-style.css'));
const globals = postcss.parse(read('../app/globals.css'));
const overrides = postcss.parse(read('../assets/allianz-native-overrides.css'));
const boundary = ':where(.allianz-modern *, .allianz-legacy *)';
const hamburger = 'm-navigation-mobile-btn';

function specificity(selector) {
  const flat = selector.replace(/:where\([^)]*\)/g, '');
  return [(flat.match(/#[\w-]+/g) || []).length,
    (flat.match(/\.[\w-]+|:[\w-]+/g) || []).length,
    (flat.replace(/\.[\w-]+|:[\w-]+/g, '').match(/\b[a-zA-Z][\w-]*\b/g) || []).length];
}

// These are the selectors matching the small source-anchor/native-button
// fixtures, not a general CSS engine. Only the witnessed adapter geometry is
// resolved; shorthand expansion and browser layout are checked separately.
function declarations(roots, tag, control, width, focused = false) {
  const selectors = new Set([
    tag, `${tag}${boundary}`, `.${control}`,
    `.O-azl-header .${control}`,
    `.allianz-modern .O-azl-header .${control}`,
    `.allianz-modern .O-azl-header ${tag}.${control}`,
  ]);
  if (control === hamburger) selectors.add('.c-header__navigation-desktop-hide');
  if (control === 'allianz-text-button') {
    selectors.add('.a-link');
    if (focused) selectors.add('.a-link:focus-visible');
  }
  const result = {};
  let order = 0;
  for (const root of roots) root.walkRules((rule) => {
    let parent = rule.parent;
    while (parent.type !== 'root') {
      if (parent.type === 'atrule') {
        const max = parent.params.match(/^\(max-width:\s*(\d+)px\)$/);
        const min = parent.params.match(/^\(min-width:\s*(\d+)px\)$/);
        if ((!max && !min) || (max && width > +max[1]) || (min && width < +min[1])) return;
      }
      parent = parent.parent;
    }
    for (const selector of rule.selectors) {
      if (!selectors.has(selector)) continue;
      const weight = specificity(selector);
      for (const node of rule.nodes) {
        if (node.type !== 'decl') continue;
        const candidate = { value: node.value, rank: [Number(Boolean(node.important)), ...weight, ++order] };
        const previous = result[node.prop];
        if (!previous || candidate.rank.some((n, i) => n > previous.rank[i] &&
          candidate.rank.slice(0, i).every((v, j) => v === previous.rank[j]))) result[node.prop] = candidate;
      }
    }
  });
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value.value]));
}

test('source anchor avoids the recovered generic button geometry that contaminated the native adapter', () => {
  const anchor = declarations([source], 'a', hamburger, 703);
  const button = declarations([globals, source], 'button', hamburger, 703);
  assert.equal(anchor.display, 'inline');
  assert.equal(anchor['margin-top'], '3px');
  assert.equal(anchor.padding, undefined);
  assert.equal(anchor['min-width'], undefined);
  assert.equal(button.padding, '8px 18px');
  assert.equal(button.margin, '0 0 24px');
  assert.equal(button.border, '2px solid #000');
  assert.equal(button.width, '100%');
  assert.equal(button['min-width'], 'fit-content');
});

test('only native header adapters lose generic button spacing, even when source CSS loads last', () => {
  for (const roots of [[globals, source, overrides], [globals, overrides, source]]) {
    for (const width of [703, 704]) {
      for (const control of [hamburger, 'allianz-text-button', 'allianz-nav-toggle']) {
        const resolved = declarations(roots, 'button', control, width);
        assert.equal(resolved.width, 'auto', `${control} at ${width}`);
        assert.equal(resolved.margin, '0');
        assert.equal(resolved['border-radius'], '0');
        assert.equal(resolved['letter-spacing'], control === 'allianz-text-button'
          ? declarations([source], 'a', control, width)['letter-spacing'] : 'normal');
        assert.equal(resolved['min-width'], control === 'allianz-nav-toggle' ? '28px' : '0');
      }
      const menu = declarations(roots, 'button', hamburger, width);
      assert.equal(menu.display, width === 703 ? 'inline' : 'none');
      assert.equal(menu['margin-top'], '3px');
      assert.equal(menu.order, '2');
      assert.equal(menu.padding, '0');
      assert.equal(menu.border, '0');
      assert.equal(menu.background, 'transparent');
      assert.equal(menu.font, 'inherit');
      assert.equal(menu.color, declarations([source], 'a', hamburger, width).color);
    }
  }
  const ordinary = declarations([globals, overrides, source], 'button', 'c-button', 703);
  assert.equal(ordinary.width, '100%');
  assert.equal(ordinary.margin, '0 0 24px');
  assert.equal(ordinary.padding, '8px 18px');
});

test('the adapter reset retains source Search focus treatment and existing submenu hit targets', () => {
  const search = declarations([globals, overrides, source], 'button', 'allianz-text-button', 704, true);
  assert.equal(search.padding, '10px');
  assert.equal(search['background-color'], '#8a679c');
  assert.equal(search.color, '#fff');
  const submenu = declarations([globals, overrides, source], 'button', 'allianz-nav-toggle', 703);
  assert.equal(submenu.padding, '4px');
  assert.equal(submenu['min-width'], '28px');
  assert.equal(submenu['min-height'], '28px');
  overrides.walkRules((rule) => {
    if (rule.selector.includes(hamburger)) assert.ok(!rule.nodes.some((node) => node.prop === 'display'),
      'source desktop/mobile visibility remains authoritative');
  });
});

test('native buttons retain accessible labels, expanded state, control targets and click/focus handlers', () => {
  const header = read('../components/allianz-header/AllianzHeader.tsx');
  assert.match(header, /<button ref=\{menuToggle\} type="button" className="m-navigation-mobile-btn c-header__navigation-desktop-hide" aria-expanded=\{menu\.open\} aria-controls="allianz-main-navigation" aria-label=\{menu\.open \? 'Close menu' : 'Open menu'\} onClick=/);
  assert.match(header, /<button ref=\{searchToggle\}[^>]*aria-expanded=\{searchOpen\} aria-controls="allianz-header-search" onClick=/);
  assert.match(header, /<button type="button" className="allianz-nav-toggle"[^>]*aria-label=/);
  assert.match(header, /event\.key !== 'Escape'/);
  assert.match(header, /menuToggle\.current\?\.focus\(\)/);
  assert.match(header, /searchToggle\.current\?\.focus\(\)/);
  assert.match(header, /const mobileQuery = '\(max-width: 703px\)'/);
});

test('Search restores the source 32 by 24 functional icon without changing the breakpoint', () => {
  const rules = new Map();
  overrides.walkRules((rule) => rules.set(rule.selector,
    Object.fromEntries(rule.nodes.filter((node) => node.type === 'decl').map((node) => [node.prop, node.value]))));
  const control = rules.get('.allianz-modern .O-azl-header .allianz-text-button');
  const icon = rules.get('.allianz-modern .O-azl-header .allianz-text-button > .c-icon--search');
  assert.equal(control.display, 'inline-flex');
  assert.equal(control.gap, '0');
  assert.equal(control['line-height'], '24px');
  assert.equal(control['letter-spacing'], declarations([source], 'a', 'allianz-text-button', 704)['letter-spacing']);
  assert.deepEqual(icon, { display: 'block', flex: '0 0 32px', width: '32px', height: '24px', 'line-height': '24px' });
  assert.equal(declarations([globals, overrides, source], 'button', hamburger, 703).display, 'inline');
  assert.equal(declarations([globals, overrides, source], 'button', hamburger, 704).display, 'none');
});
