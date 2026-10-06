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

test('expanded native accordion defeats recovered max-height zero regardless of stylesheet order', () => {
  const recovered = rule(source, '.c-accordion .c-accordion__item-content');
  assert.equal(value(recovered, 'max-height'), '0');
  const expanded = rule(overrides, '.allianz-modern .c-accordion .c-accordion__trigger[aria-expanded="true"] + .c-accordion__item-content:not([hidden])');
  assert.ok(stronger(expanded.selector, recovered.selector));
  assert.equal(value(expanded, 'display'), 'block');
  assert.equal(value(expanded, 'max-height'), 'none');
  assert.equal(value(expanded, 'overflow'), 'visible');
  const collapsed = rule(overrides, '.allianz-modern .c-accordion .c-accordion__item-content[hidden]');
  assert.equal(value(collapsed, 'display'), 'none');
  assert.ok(stronger(collapsed.selector, recovered.selector));
  const component = read('../components/allianz-accordion/AllianzAccordion.tsx');
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /className="c-accordion__item-content" hidden=\{!expanded\}/);
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
