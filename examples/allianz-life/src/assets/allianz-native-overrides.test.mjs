/** Source and cascade regression checks only; these are not browser acceptance. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = postcss.parse(read('../../public/allianz-assets/source-style.css'));
const overrides = postcss.parse(read('./allianz-native-overrides.css'));
const legacy = postcss.parse(read('./allianz-legacy.css'));

test('Ratewatch adaptation cannot match unrelated Allianz tables or editor content', () => {
  const rules = [];
  overrides.walkRules((node) => {
    if (node.selector.includes('allianz-local-rates')) rules.push(node);
  });
  assert.ok(rules.length > 0);
  for (const node of rules) {
    for (const arm of node.selector.split(',')) {
      assert.match(arm.trim(), /^\.allianz-local-rates \.azl-ratewatch-product-tables /);
    }
    for (const entry of node.nodes.filter((entry) => entry.type === 'decl' && entry.important)) {
      assert.ok(['width', 'border'].includes(entry.prop));
      if (entry.prop === 'width') assert.match(node.selector, / col(?::first-child)?$/);
      if (entry.prop === 'border') assert.match(node.selector, /figure\.table/);
    }
  }
});

test('Rates primary and year headers retain their different official treatments', () => {
  const prefix = '.allianz-local-rates .azl-ratewatch-product-tables .product-table';
  const primary = rule(overrides, `${prefix} > thead > tr > th.primary.fia`);
  assert.equal(value(primary, 'background-color'), '#5f259f');
  const head = rule(overrides, `${prefix} > thead > tr > th`);
  assert.equal(value(head, 'text-align'), 'center');
  assert.equal(value(head, 'color'), '#fff');
  const years = rule(overrides, `${prefix} th.default`);
  assert.equal(value(years, 'background-color'), '#c1c1c1');
  assert.equal(value(years, 'font-weight'), '400');
  assert.equal(value(years, 'text-align'), 'left');
  assert.ok(stronger(primary.selector, '.ck-content .table table th'),
    'native rich-text table styling must not turn the purple primary header gray');
});

test('Rates editor figure adds no extra margin around the source table spacing', () => {
  const prefix = '.allianz-local-rates .azl-ratewatch-product-tables';
  const figure = rule(overrides, `${prefix} figure.table`);
  assert.equal(value(figure, 'margin'), '0');
  assert.equal(value(figure, 'display'), 'block');
  const table = overrides.nodes.find(n => n.type === 'rule' && n.selector === `${prefix} .product-table`);
  assert.equal(value(table, 'margin'), '0 0 20px');
  assert.equal(value(table, 'width'), '100%');
  assert.equal(value(table, 'border-collapse'), 'collapse');
  assert.equal(value(overrides.nodes.find(n => n.type === 'rule' && n.selector === `${prefix} .product-table th`), 'padding'), '8px');
  assert.equal(value(rule(overrides, `${prefix} .product-table > tbody > tr > td`), 'padding'), '10px');
  assert.equal(value(rule(overrides, `${prefix} .product-table.is-fixed col:first-child`), 'width'), '50%');
});
function rule(root, selector) {
  let found;
  root.walkRules((node) => { if (node.selector.split(',').map((part) => part.trim()).includes(selector)) found = node; });
  assert.ok(found, `rule exists: ${selector}`);
  return found;
}
function value(node, property) { return node.nodes.find((entry) => entry.prop === property)?.value; }
function lastDeclaration(root, selector, property) {
  let found;
  root.walkRules((node) => {
    if (!node.selector.split(',').map((part) => part.trim()).includes(selector)) return;
    for (const entry of node.nodes) if (entry.prop === property) found = entry.value;
  });
  assert.ok(found, `declaration exists: ${selector} / ${property}`);
  return found;
}
// All selectors compared below use only classes, attributes, types and :not.
// :not contributes its argument, not an additional pseudo-class.
function specificity(selector) {
  const flat = selector.replace(/:not\(([^()]*)\)/g, '$1');
  return [
    (flat.match(/#[\w-]+/g) || []).length,
    (flat.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length,
    (flat.replace(/\[[^\]]+\]|\.[\w-]+|#[\w-]+/g, '').match(/\b[a-zA-Z][\w-]*\b/g) || []).length,
  ];
}
function stronger(a, b) {
  const left = specificity(a), right = specificity(b);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return left[i] > right[i];
  return false;
}

test('root layout serves complete legacy source and wires scoped native overrides', () => {
  const layout = read('../app/layout.tsx');
  assert.match(layout, /import '\.\.\/assets\/allianz-native-overrides\.css'/);
  assert.match(layout, /href="\/allianz-assets\/source-style\.css"/);
  assert.match(layout, /href="\/allianz-legacy-assets\/legacy-style\.css"/);
  assert.equal(read('./allianz-legacy.css'), read('../../public/allianz-legacy-assets/legacy-style.css'), 'served raw legacy CSS must include every source adaptation');
});

test('mobile Sidebar button occupies the source right-edge target above the root link', () => {
  const toggle = rule(overrides, '.allianz-legacy .left-nav > .dropdown > button.allianz-legacy-section-toggle');
  const rootLink = rule(legacy, '.allianz-legacy .nav.navbar-nav.left-nav .dropdown a');
  const adapter = rule(legacy, '.allianz-legacy .allianz-legacy-section-toggle');
  assert.equal(toggle.parent.name, 'media');
  assert.equal(toggle.parent.params, 'only screen and (max-width: 767px)');
  assert.equal(value(rootLink, 'z-index'), '100');
  assert.ok(Number(value(toggle, 'z-index')) > Number(value(rootLink, 'z-index')));
  assert.equal(value(toggle, 'width'), '50px');
  // The first matching source rule defines geometry; a later rule sets border color.
  let sourceWidth;
  legacy.walkRules((node) => {
    if (node.selector.split(',').includes('.allianz-legacy .left-column .nav>li>a.dropdown-toggle')) {
      sourceWidth = value(node, 'width') ?? sourceWidth;
    }
  });
  assert.equal(value(toggle, 'width'), sourceWidth);
  assert.equal(value(toggle, 'height'), '50px');
  assert.equal(value(adapter, 'position'), 'absolute');
  assert.equal(value(adapter, 'right'), '0');
  assert.equal(value(adapter, 'top'), '0');
  assert.ok(stronger(toggle.selector, adapter.selector));
  assert.equal(value(toggle, 'display'), undefined, 'retain source mobile, desktop and print visibility');
  assert.deepEqual(toggle.nodes.filter((node) => node.type === 'decl').map((node) => node.prop).sort(), ['height', 'width', 'z-index']);
});

test('expanded native accordion defeats recovered max-height zero in both shells regardless of stylesheet order', () => {
  const recoveredSelector = '.c-accordion .c-accordion__item-content';
  const recovered = rule(source, recoveredSelector);
  assert.equal(value(recovered, 'max-height'), '0');
  for (const shell of ['allianz-modern', 'allianz-legacy']) {
    const expandedSelector = `.${shell} .c-accordion .c-accordion__trigger[aria-expanded="true"] + .c-accordion__item-content:not([hidden])`;
    const expanded = rule(overrides, expandedSelector);
    // Compare one matching arm, never the sum of a comma-separated selector list.
    assert.ok(stronger(expandedSelector, recoveredSelector));
    assert.equal(value(expanded, 'display'), 'block');
    assert.equal(value(expanded, 'max-height'), 'none');
    assert.equal(value(expanded, 'overflow'), 'visible');
    const collapsedSelector = `.${shell} .c-accordion .c-accordion__item-content[hidden]`;
    const collapsed = rule(overrides, collapsedSelector);
    assert.equal(value(collapsed, 'display'), 'none');
    assert.ok(stronger(collapsedSelector, recoveredSelector));
    if (shell === 'allianz-legacy') {
      const scopedRecoveredSelector = '.allianz-legacy .mfe .c-accordion .c-accordion__item-content';
      assert.equal(value(rule(legacy, scopedRecoveredSelector), 'max-height'), '0');
      assert.ok(stronger(expandedSelector, scopedRecoveredSelector));
      // The witnessed NY shell has no .mfe ancestor. Its hidden rule beats the
      // applicable global rule; no order-independent hidden claim is made for .mfe.
    }
  }
  const component = read('../components/allianz-accordion/AllianzAccordion.tsx');
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /className="c-accordion__item-content" hidden=\{!expanded\}/);
  assert.match(component, /<\/button>\s*<div id=\{panelId\} role="region"/);
});

test('native accordion recovery retains state gates and excludes Bootstrap panels and unrelated content', () => {
  const arms = [];
  overrides.walkRules((node) => {
    if (node.selector.includes('.c-accordion')) arms.push(...node.selector.split(',').map((part) => part.trim()));
  });
  assert.deepEqual(arms.sort(), ['allianz-modern', 'allianz-legacy'].flatMap((shell) => [
    `.${shell} .c-accordion .c-accordion__item-content[hidden]`,
    `.${shell} .c-accordion .c-accordion__trigger[aria-expanded="true"] + .c-accordion__item-content:not([hidden])`,
    `.${shell} .c-accordion > .c-accordion__item-wrapper > button.c-accordion__trigger[aria-expanded="true"] + .c-accordion__item-content:not([hidden]) > .accordionContent`,
  ]).sort(), 'only native state controls and their direct expanded answer receive shell coverage');
  // Actual legacy Bootstrap markup has no modern c-accordion wrapper, trigger or
  // panel class, so neither arm can match it or a standalone RichText/region.
  const bootstrap = read('../components/allianz-legacy-accordion/AllianzLegacyAccordion.tsx');
  assert.match(bootstrap, /panel-group accordion/);
  assert.match(bootstrap, /className=\{`panel-collapse collapse/);
  assert.doesNotMatch(bootstrap, /c-accordion/);
  assert.doesNotMatch(arms.join('\n'), /panel-group|panel-collapse|\[role=/);
  for (const selector of arms.filter((arm) => arm.includes('.accordionContent'))) {
    assert.match(selector, /button\.c-accordion__trigger\[aria-expanded="true"\] \+ \.c-accordion__item-content:not\(\[hidden\]\) > \.accordionContent$/);
  }
});

test('mobile native answer inset preserves source bottom spacing, authored margins and desktop cascade', () => {
  const recoveredSelector = '.c-accordion .accordionContent';
  assert.equal(value(rule(source, recoveredSelector), 'padding'), '0 64px 40px');
  for (const shell of ['allianz-modern', 'allianz-legacy']) {
    const selector = `.${shell} .c-accordion > .c-accordion__item-wrapper > button.c-accordion__trigger[aria-expanded="true"] + .c-accordion__item-content:not([hidden]) > .accordionContent`;
    const inset = rule(overrides, selector);
    assert.equal(inset.parent.name, 'media');
    assert.equal(inset.parent.params, '(max-width: 703px)', '704px and desktop retain recovered padding');
    assert.deepEqual(inset.nodes.filter((entry) => entry.type === 'decl').map((entry) => [entry.prop, entry.value, !!entry.important]), [
      ['padding-left', '16px', false], ['padding-right', '16px', false],
    ], 'do not override bottom spacing, authored margins, widths, visibility or SDK markup');
    assert.ok(stronger(selector, recoveredSelector), 'the scoped rule survives later recovered stylesheet loading');
  }
});

test('mobile open header does not clip the source absolute menu and closed menus have no layout box', () => {
  const recovered = rule(source, '.m-navigation-primary-open');
  assert.equal(value(recovered, 'overflow'), 'hidden');
  const opened = rule(overrides, '.allianz-modern .O-azl-header.m-navigation-primary-open');
  assert.ok(stronger(opened.selector, recovered.selector));
  assert.equal(value(opened, 'overflow'), 'visible');
  assert.equal(opened.parent.params, '(max-width: 703px)');
  const panel = rule(overrides, '.allianz-modern .O-azl-header.m-navigation-primary-open .m-navigation-primary');
  assert.equal(value(panel, 'max-height'), 'calc(100dvh - 127px)');
  assert.equal(value(panel, 'overflow-y'), 'auto');
  assert.equal(value(rule(overrides, '.allianz-modern .O-azl-header .m-navigation-primary[aria-hidden="true"]'), 'display'), 'none');
  assert.equal(value(rule(overrides, '.allianz-modern .O-azl-header .m-navigation-primary ul[aria-hidden="true"]'), 'display'), 'none');
  assert.equal(value(rule(overrides, '.allianz-modern .O-azl-header .m-navigation-primary > ul[data-level="1"] > li:last-child > .nav-list-nested'), 'right'), '0');
});

test('legacy form rows clear floats, date fieldsets retain width and responsive footer stays inside its wrapper', () => {
  const rows = rule(legacy, '.allianz-legacy .allianz-local-form .form-group');
  assert.equal(value(rows, 'display'), 'flow-root');
  assert.equal(value(rows, 'clear'), 'both');
  const fieldset = rule(legacy, '.allianz-legacy .allianz-local-form fieldset.form-group');
  assert.equal(value(fieldset, 'width'), '100%');
  assert.equal(value(fieldset, 'min-width'), '0');
  const legend = rule(legacy, '.allianz-legacy .allianz-local-form fieldset.form-group legend');
  assert.equal(value(legend, 'width'), '25%');
  assert.equal(legend.parent.params, '(min-width:768px)');
  const footer = rule(legacy, '.allianz-legacy .allianz-legacy-footer');
  assert.equal(value(footer, 'margin-left'), '0');
  assert.equal(value(footer, 'margin-right'), '0');
  assert.equal(value(rule(legacy, '.allianz-legacy .navbar>.container-fluid .navbar-brand:has(img)'), 'background'), 'none');
  assert.equal(value(rule(legacy, '.allianz-legacy .navbar>.container-fluid .navbar-brand img'), 'display'), 'block');
});

test('native toggle spacing reserves text room and utility image glyphs retain source dimensions', () => {
  assert.equal(value(rule(overrides, '.allianz-modern .O-azl-header .m-navigation-primary > ul[data-level="1"] > li > a'), 'padding-right'), '28px');
  const glyph = rule(overrides, '.allianz-modern .O-azl-header .allianz-nav-toggle .c-icon');
  assert.equal(value(glyph, 'line-height'), '1');
  assert.equal(value(glyph, 'margin'), '0');
  const image = rule(overrides, '.allianz-modern .O-azl-header .m-navigationUtility .a-link__icon img');
  assert.equal(value(image, 'width'), '18px');
  assert.equal(value(image, 'height'), '18px');
});

test('field-driven masks color current native vectors without modifying their media source', () => {
  // allianz-page.ts reads this package in fixture mode. The older src/content
  // fixture has different, pre-colored media and cannot establish actual color.
  const fixture = JSON.parse(read('../../content/native-content.json'));
  const nativePage = read('../lib/allianz-page.ts');
  assert.match(nativePage, /content\/native-content\.json/);
  const sourceColors = [];
  source.walkDecls('fill', (node) => {
    if (['.a-link__icon svg', '.m-footer__social-link'].includes(node.parent.selector)) sourceColors.push(node.value);
  });
  assert.equal(sourceColors.filter((color) => color === '#005074').length, 2, 'recovered inline utility and social icons use source teal');
  const header = read('../components/allianz-header/AllianzHeader.tsx');
  const footer = read('../components/allianz-footer/AllianzFooter.tsx');
  assert.match(header, /<AllianzFieldIcon field=\{item\.icon\?\.jsonValue\} decorative/);
  assert.match(footer, /<AllianzFieldIcon field=\{item\.icon\?\.jsonValue\} decorative/);
  const mask = rule(overrides, '.allianz-modern .allianz-field-icon');
  assert.equal(value(mask, 'background-color'), '#005074');
  assert.equal(value(mask, 'mask-mode'), 'alpha');
  assert.equal(value(mask, 'mask-size'), 'contain');
  const social = rule(overrides, '.allianz-modern .m-footer__social-link .a-icon > .allianz-field-icon');
  assert.equal(value(social, 'width'), '1.25rem');
  assert.equal(value(social, 'height'), '1.25rem');
  const vectors = [];
  for (const item of fixture.shared.header.fields.data.datasource.utilityNav.targetItems) {
    const path = item.icon?.jsonValue?.value?.src;
    if (path) vectors.push(path);
  }
  for (const item of fixture.shared.footer.fields.data.datasource.socialNav.targetItems) {
    const path = item.icon?.jsonValue?.value?.src;
    if (path) vectors.push(path);
  }
  assert.equal(vectors.length, 7);
  for (const path of vectors) {
    assert.match(path, /^\/allianz-assets\/[a-f0-9]+\.svg$/);
    const svg = read(`../../public${path}`);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.doesNotMatch(svg, /\bfill\s*=/, `${path} retains the uncolored source bytes; visitor CSS supplies the fill`);
  }
});

test('mask dimensions and interaction colors match recovered inline SVG declarations exactly', () => {
  const utility = rule(overrides, '.allianz-modern .O-azl-header .m-navigationUtility .a-link__icon > .allianz-field-icon');
  const social = rule(overrides, '.allianz-modern .m-footer__social-link .a-icon > .allianz-field-icon');
  for (const dimension of ['width', 'height']) {
    assert.equal(value(utility, dimension), lastDeclaration(source, '.a-link__icon svg', dimension));
    assert.equal(value(social, dimension), lastDeclaration(source, '.m-footer__social-link .a-icon svg', dimension));
  }
  const pairs = [
    ['.a-link:active .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:active .allianz-field-icon'],
    ['.a-link:visited .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:visited .allianz-field-icon'],
    ['.a-link:hover .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:hover .allianz-field-icon'],
    ['.a-link:focus-visible .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:focus-visible .allianz-field-icon'],
    ['.m-footer__social-link:visited', '.allianz-modern .m-footer__social-link:visited .allianz-field-icon'],
    ['.m-footer__social-link:hover', '.allianz-modern .m-footer__social-link:hover .allianz-field-icon'],
    ['.m-footer__social-link:active', '.allianz-modern .m-footer__social-link:active .allianz-field-icon'],
    ['.m-footer__social-link:focus', '.allianz-modern .m-footer__social-link:focus .allianz-field-icon'],
  ];
  for (const [original, masked] of pairs) assert.equal(value(rule(overrides, masked), 'background-color'), lastDeclaration(source, original, 'fill'));
});


test('native image geometry and local SourceAlpha filter retain every source interaction color', () => {
  const native = rule(overrides, '.allianz-modern .allianz-field-icon--native');
  const background = native.nodes.find((entry) => entry.prop === 'background-color');
  assert.equal(background.value, 'transparent');
  assert.equal(background.important, true, 'no solid square may cover native image transparency');
  const image = rule(overrides, '.allianz-modern .allianz-field-icon--native > .allianz-field-icon__image');
  assert.equal(value(image, 'width'), '100%');
  assert.equal(value(image, 'height'), '100%');
  assert.equal(value(image, 'object-fit'), 'contain');
  const filter = rule(overrides, '.allianz-modern .allianz-field-icon--native > .allianz-field-icon__filter');
  assert.equal(value(filter, 'width'), '0');
  assert.equal(value(filter, 'height'), '0');
  assert.ok(stronger(filter.selector, '.a-link__icon svg'), 'source SVG dimensions cannot reveal the filter definition');
  assert.equal(value(rule(overrides, '.allianz-modern .allianz-field-icon'), 'color'), '#005074');
  const pairs = [
    ['.a-link:active .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:active .allianz-field-icon'],
    ['.a-link:visited .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:visited .allianz-field-icon'],
    ['.a-link:hover .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:hover .allianz-field-icon'],
    ['.a-link:focus-visible .a-link__icon svg', '.allianz-modern .O-azl-header .m-navigationUtility .a-link:focus-visible .allianz-field-icon'],
    ['.m-footer__social-link:visited', '.allianz-modern .m-footer__social-link:visited .allianz-field-icon'],
    ['.m-footer__social-link:hover', '.allianz-modern .m-footer__social-link:hover .allianz-field-icon'],
    ['.m-footer__social-link:active', '.allianz-modern .m-footer__social-link:active .allianz-field-icon'],
    ['.m-footer__social-link:focus', '.allianz-modern .m-footer__social-link:focus .allianz-field-icon'],
  ];
  for (const [original, native] of pairs) assert.equal(value(rule(overrides, native), 'color'), lastDeclaration(source, original, 'fill'));
});

test('native social images do not introduce a fallback font glyph or inherit em-sized geometry', () => {
  const fontPseudo = rule(source, '.a-icon:before');
  assert.equal(value(fontPseudo, 'content'), undefined, 'the unmodified a-icon wrapper defines no fallback character');
  assert.equal(value(fontPseudo, 'font-family'), 'Allianz-Icons');
  assert.equal(lastDeclaration(source, '.m-footer__social-link', 'font-size'), '24px');
  const frame = rule(overrides, '.allianz-modern .m-footer__social-link .a-icon > .allianz-field-icon');
  assert.equal(value(frame, 'width'), '1.25rem');
  assert.equal(value(frame, 'height'), '1.25rem');
  const filter = rule(overrides, '.allianz-modern .allianz-field-icon--native > .allianz-field-icon__filter');
  assert.ok(stronger(filter.selector, '.m-footer__social-link .a-icon svg'));
});

test('Rates editor column widths cannot force equal-width wrapping on mobile', () => {
  const prefix = '.allianz-local-rates .azl-ratewatch-product-tables';
  const columns = rule(overrides, `${prefix} .product-table col`);
  assert.equal(value(columns, 'width'), 'auto');
  assert.ok(columns.nodes.find(d => d.prop === 'width').important);
  const fixed = rule(overrides, `${prefix} .product-table.is-fixed col:first-child`);
  assert.equal(value(fixed, 'width'), '50%');
  assert.ok(fixed.nodes.find(d => d.prop === 'width').important);
  const table = rule(overrides, `${prefix} figure.table table.product-table`);
  assert.equal(value(table, 'border'), '0');
  let mobile; overrides.walkRules(n => { if (n.selector === `${prefix} .product-table` && n.parent.params === 'only screen and (max-width: 767px)') mobile = n; });
  assert.equal(mobile.parent.params, 'only screen and (max-width: 767px)');
  assert.equal(value(mobile, 'font-size'), '15px');
});

test('Rates narrow tables preserve source horizontal scrolling and row-group sizing', () => {
  const prefix = '.allianz-local-rates .azl-ratewatch-product-tables .product-table';
  const narrow = rule(overrides, prefix);
  assert.equal(narrow.parent.params, '(max-width: 992px)');
  assert.equal(value(narrow, 'overflow-x'), 'auto');
  assert.equal(value(narrow, 'white-space'), 'nowrap');
  assert.equal(value(rule(overrides, `${prefix} tbody`), 'display'), 'table');
  let group; overrides.walkRules(n => { if (n.selector.includes(`${prefix} thead`) && n.parent.params === '(max-width: 992px)') group = n; });
  assert.equal(value(group, 'width'), '100%');
  assert.equal(value(rule(overrides, `${prefix} thead:has(th.default) + tbody > tr:nth-of-type(odd)`), 'background-color'), '#e4e4e4');
});

test('Rates source colors remain visible above inherited legacy header gradients', () => {
  const prefix = '.allianz-local-rates .azl-ratewatch-product-tables .product-table';
  assert.equal(value(rule(overrides, `${prefix} thead`), 'background-image'), 'none');
  assert.equal(value(rule(overrides, `${prefix} th`), 'background-image'), 'none');
});

test('NY product comparison scrolls within its mobile table instead of widening the document', () => {
  const table = rule(overrides, '#page-index-advantage-plus-new-york .allianz-legacy-editorial table');
  assert.equal(table.parent.params, '(max-width: 767px)');
  assert.equal(value(table, 'display'), 'block');
  assert.equal(value(table, 'width'), '100%');
  assert.equal(value(table, 'max-width'), '100%');
  assert.equal(value(table, 'overflow-x'), 'auto');
  assert.ok(!table.nodes.some(d => d.important));
});
