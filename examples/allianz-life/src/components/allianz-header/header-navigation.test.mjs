/** Offline navigation checks. No browser, server, credentials or external service is used. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
function load(file, mocks = {}) {
  const filename = fileURLToPath(file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('.', file)));
  const sourceRequire = createRequire(filename);
  compiled.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : sourceRequire(id);
  compiled._compile(code, filename);
  return compiled.exports;
}
const rules = load(new URL('./allianz-header.props.ts', import.meta.url));
const contentMode = load(new URL('../../lib/allianz-content-mode.ts', import.meta.url));
const fields = load(new URL('../../lib/allianz-fields.ts', import.meta.url), { './allianz-content-mode': contentMode });
const navItem = (id, title, href, children = []) => ({
  id, title: { jsonValue: { value: title } }, link: { jsonValue: { value: { href, text: title } } }, children: { results: children },
});
const items = [navItem('offer', 'What We Offer', '/what-we-offer', [
  navItem('overview', 'Overview', '/what-we-offer'),
  navItem('annuities', 'Annuities', '/what-we-offer/annuities', [navItem('fixed', 'Fixed annuities', '/what-we-offer/annuities/fixed-index-annuities')]),
]), navItem('answers', 'Get Answers', '/get-answers')];

test('mobile menu enter, back, cancel and reopen reset the correct list', () => {
  const reduce = rules.mobileMenuReducer;
  let state = reduce(rules.initialMobileMenuState, { type: 'toggle' });
  assert.deepEqual(state, { open: true, path: [] });
  state = reduce(state, { type: 'enter', id: 'offer' });
  assert.equal(rules.navigationAtPath(items, state.path).parent.id, 'offer');
  state = reduce(state, { type: 'enter', id: 'annuities' });
  assert.equal(rules.navigationAtPath(items, state.path).items[0].id, 'fixed');
  state = reduce(state, { type: 'back' });
  assert.deepEqual(state.path, ['offer']);
  state = reduce(state, { type: 'back' });
  assert.deepEqual(state.path, []);
  assert.equal(reduce(state, { type: 'back' }).open, false);
  assert.deepEqual(reduce(state, { type: 'close' }), rules.initialMobileMenuState);
  assert.deepEqual(reduce(reduce(state, { type: 'enter', id: 'offer' }), { type: 'toggle' }), rules.initialMobileMenuState);
  assert.deepEqual(rules.navigationAtPath(items, ['missing']).items, items);
});

test('desktop hover preview, explicit activation and repeated activation have coherent state', () => {
  const reduce = rules.desktopMenuReducer;
  let state = reduce(rules.initialDesktopMenuState, { type: 'hover', path: ['offer'] });
  assert.deepEqual(state, { path: ['offer'], hoverOpened: ['offer'] });
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(state, { path: ['offer'], hoverOpened: [] }, 'first explicit activation pins a hover-open branch');
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(state, rules.initialDesktopMenuState, 'repeated activation closes the pinned branch');
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(state.path, ['offer', 'annuities']);
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(state, rules.initialDesktopMenuState, 'closing the parent resets descendants');
  state = reduce(state, { type: 'hover', path: ['offer'] });
  state = reduce(state, { type: 'hover', path: ['answers'] });
  assert.deepEqual(state, { path: ['answers'], hoverOpened: ['answers'] }, 'a new top-level branch replaces the prior one');
  assert.deepEqual(reduce(state, { type: 'leave', path: ['offer'] }), state, 'late leave from the prior branch cannot close the new one');
  assert.deepEqual(reduce(state, { type: 'close' }), rules.initialDesktopMenuState);
});

test('desktop reducer ignores hover below the first level without disturbing clicked branches', () => {
  const reduce = rules.desktopMenuReducer;
  let state = reduce(rules.initialDesktopMenuState, { type: 'hover', path: ['offer'] });
  for (const path of [['offer', 'annuities'], ['offer', 'annuities', 'fixed']]) {
    assert.equal(reduce(rules.initialDesktopMenuState, { type: 'hover', path }), rules.initialDesktopMenuState);
    assert.equal(reduce(state, { type: 'hover', path }), state);
    state = reduce(state, { type: 'toggle', path });
    assert.deepEqual(state.path, path, 'each deeper branch opens on its first explicit activation');
    assert.deepEqual(state.hoverOpened, ['offer'], 'nested branches are never recorded as hover previews');
    assert.equal(reduce(state, { type: 'hover', path: ['offer', 'life'] }), state, 'hovering a sibling leaves the active branch alone');
  }
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities', 'fixed'] });
  assert.deepEqual(state.path, ['offer', 'annuities'], 'a second activation closes the deepest branch immediately');
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(state.path, ['offer'], 'a second activation closes the nested branch immediately');
  state = reduce(state, { type: 'leave', path: ['offer'] });
  assert.deepEqual(state, rules.initialDesktopMenuState);
});

function flatten(element) {
  if (Array.isArray(element)) return element.flatMap(flatten);
  if (!element || typeof element !== 'object' || !element.props) return [];
  return [element, ...flatten(element.props.children)];
}
function harness(mobile, navigationItems = items) {
  const hooks = [];
  let cursor = 0;
  const fakeReact = {
    ...React,
    useState(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = initial;
      return [hooks[slot], (value) => { hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value; }];
    },
    useReducer(reducer, initial) {
      const [state, set] = fakeReact.useState(initial);
      return [state, (action) => set((previous) => reducer(previous, action))];
    },
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in hooks)) hooks[slot] = { current: initial };
      return hooks[slot];
    },
    useSyncExternalStore() { return mobile; },
  };
  const { Default } = load(new URL('./AllianzHeader.tsx', import.meta.url), {
    react: fakeReact,
    '@sitecore-content-sdk/nextjs': { Image: 'img', Link: 'a', Text: 'span' },
    'next/link': 'a',
    'next/navigation': { useRouter: () => ({ push() {} }) },
    'components/content-sdk/NoDataFallback': 'no-data',
    'lib/allianz-fields': fields,
    'lib/allianz-field-icon': { AllianzFieldIcon: 'field-icon' },
    './allianz-header.props': rules,
  });
  let root;
  const props = { fields: { data: { datasource: { primaryNav: { targetItems: navigationItems } } } } };
  return {
    render(override = props) { cursor = 0; root = Default(override); return root; },
    nodes() { return flatten(root); },
    one(predicate) { const match = flatten(root).find(predicate); assert.ok(match, 'expected control exists'); return match; },
  };
}

const previousFrame = globalThis.requestAnimationFrame;
globalThis.requestAnimationFrame = (callback) => { callback(); return 0; };
test.after(() => { globalThis.requestAnimationFrame = previousFrame; });

test('mobile component drills into accessible on-screen lists and returns without navigating home', () => {
  const h = harness(true);
  h.render();
  assert.equal(h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation').props.inert, true);
  h.one((x) => x.props['aria-label'] === 'Open menu').props.onClick();
  h.render();
  assert.match(h.one((x) => x.type === 'header').props.className, /m-navigation-primary-open/);
  assert.equal(h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation').props.inert, undefined);
  let prevented = false;
  h.one((x) => x.type === 'a' && x.props.field?.value.href === '/what-we-offer').props.onClick({ preventDefault() { prevented = true; } });
  h.render();
  assert.equal(prevented, true);
  const second = h.one((x) => x.type === 'ul' && x.props['data-level'] === 2);
  assert.equal(second.props.style.left, 0);
  assert.equal(second.props.style.position, 'relative');
  assert.equal(h.nodes().filter((x) => x.type === 'ul' && x.props['data-level']).length, 1, 'only active menu list is rendered');
  h.one((x) => x.props['aria-label'] === 'Open Annuities submenu').props.onClick();
  h.render();
  assert.ok(h.one((x) => x.type === 'ul' && x.props['data-level'] === 3));
  h.one((x) => x.props.className?.includes('m-nav-slide-back')).props.onClick({ preventDefault() {} });
  h.render();
  assert.ok(h.one((x) => x.type === 'ul' && x.props['data-level'] === 2));
  h.one((x) => x.type === 'a' && x.props.field?.value.href === '/what-we-offer').props.onClick({ preventDefault() {} });
  h.render();
  assert.equal(h.one((x) => x.props['aria-label'] === 'Open menu').props['aria-expanded'], false, 'overview destination closes menu');
});

test('Escape cancels mobile navigation and search and restores each opener focus', () => {
  const h = harness(true);
  h.render();
  let focused = '';
  const opener = h.one((x) => x.props['aria-label'] === 'Open menu');
  opener.props.ref.current = { focus() { focused = 'menu'; } };
  opener.props.onClick();
  h.render();
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape' });
  h.render();
  assert.equal(focused, 'menu');
  assert.equal(h.one((x) => x.props['aria-label'] === 'Open menu').props['aria-expanded'], false);
  const search = h.one((x) => x.props['aria-controls'] === 'allianz-header-search');
  search.props.ref.current = { focus() { focused = 'search'; } };
  search.props.onClick();
  h.render();
  assert.ok(h.one((x) => x.type === 'form' && x.props.role === 'search'));
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape' });
  h.render();
  assert.equal(focused, 'search');
  assert.equal(h.nodes().some((x) => x.type === 'form'), false);
});

test('desktop nested links are inert until their keyboard toggle opens them', () => {
  const h = harness(false);
  h.render();
  assert.equal(h.one((x) => x.type === 'ul' && x.props['data-level'] === 2).props.inert, true);
  h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props.onClick();
  h.render();
  assert.equal(h.one((x) => x.type === 'ul' && x.props['data-level'] === 2).props.inert, undefined);
  let focused = false;
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape', target: { closest: () => ({ querySelector: () => ({ getAttribute: () => 'allianz-nav-offer', focus() { focused = true; } }) }) } });
  h.render();
  assert.equal(focused, true);
  assert.equal(h.one((x) => x.type === 'ul' && x.props['data-level'] === 2).props.inert, true);
  assert.equal(h.render({}).type, 'no-data', 'missing native datasource remains safe');
});

test('desktop hover then pointer activation keeps the submenu usable and a second activation closes it', () => {
  const h = harness(false);
  h.render();
  h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseEnter();
  h.render();
  let toggle = h.one((x) => x.props['aria-label'] === 'What We Offer submenu');
  assert.equal(toggle.props['aria-expanded'], true);
  assert.equal(toggle.props['aria-controls'], 'allianz-nav-offer');
  toggle.props.onClick();
  h.render();
  assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-offer').props.inert, undefined);
  h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props.onClick();
  h.render();
  assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-offer').props.inert, true);
  assert.equal(h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props['aria-expanded'], false);
});

test('desktop hover opens only the top level and every deeper disclosure requires a click', () => {
  const h = harness(false, [navItem('offer', 'What We Offer', '/what-we-offer', [
    navItem('annuities', 'Annuities', '/what-we-offer/annuities', [
      navItem('fixed', 'Fixed annuities', '/what-we-offer/annuities/fixed-index-annuities', [
        navItem('fixed-product', 'Fixed product', '/what-we-offer/annuities/fixed-index-annuities/product'),
      ]),
    ]),
    navItem('life', 'Life insurance', '/what-we-offer/life-insurance', [navItem('life-product', 'Life product', '/what-we-offer/life-insurance/product')]),
  ])]);
  const row = (id) => h.one((x) => x.type === 'li' && x.key === id);
  const panel = (id) => h.one((x) => x.type === 'ul' && x.props.id === `allianz-nav-${id}`);
  const toggle = (id) => h.one((x) => x.type === 'button' && x.props['aria-controls'] === `allianz-nav-${id}`);
  h.render();
  row('offer').props.onMouseEnter();
  h.render();
  assert.equal(panel('offer').props.inert, undefined);
  assert.equal(toggle('offer').props['aria-expanded'], true);
  for (const id of ['annuities', 'fixed']) {
    assert.equal(row(id).props.onMouseEnter, undefined, 'nested groups do not receive hover-open handlers');
    assert.equal(row(id).props.onMouseLeave, undefined, 'moving between rows cannot close a clicked nested group');
    row(id).props.onMouseEnter?.();
    h.render();
    assert.equal(panel(id).props.inert, true);
    assert.equal(panel(id).props['aria-hidden'], true);
    assert.equal(toggle(id).props['aria-expanded'], false);
    toggle(id).props.onClick();
    h.render();
    assert.equal(panel(id).props.inert, undefined);
    assert.equal(panel(id).props['aria-hidden'], undefined);
    assert.equal(toggle(id).props['aria-expanded'], true);
  }
  row('life').props.onMouseEnter?.();
  row('annuities').props.onMouseLeave?.();
  h.render();
  assert.equal(panel('life').props.inert, true, 'hover does not open a sibling');
  assert.equal(panel('fixed').props.inert, undefined, 'hover does not collapse the selected descendants');
  toggle('life').props.onClick();
  h.render();
  assert.equal(panel('life').props.inert, undefined, 'click changes the active nested branch');
  assert.equal(panel('annuities').props.inert, true);
  assert.equal(panel('fixed').props.inert, true, 'switching nested branches resets descendants');
  toggle('life').props.onClick();
  h.render();
  assert.equal(panel('life').props.inert, true, 'second nested click closes immediately');
});

test('desktop disclosures retain native keyboard and touch activation and real link destinations', () => {
  for (const activation of [{ detail: 0 }, { detail: 1, pointerType: 'touch' }]) {
    const h = harness(false);
    h.render();
    for (const title of ['What We Offer', 'Annuities']) {
      const toggle = h.one((x) => x.props['aria-label'] === `${title} submenu`);
      assert.equal(toggle.type, 'button');
      assert.equal(toggle.props.type, 'button');
      assert.equal(toggle.props.onKeyDown, undefined, 'native Enter/Space activation is not replaced or prevented');
      toggle.props.onClick(activation);
      h.render();
      assert.equal(h.one((x) => x.props['aria-label'] === `${title} submenu`).props['aria-expanded'], true);
    }
    for (const href of ['/what-we-offer', '/what-we-offer/annuities', '/what-we-offer/annuities/fixed-index-annuities']) {
      const link = h.one((x) => x.type === 'a' && x.props.field?.value.href === href);
      assert.equal(link.props.onClick, undefined, 'desktop destinations remain separate from submenu activation');
    }
    const header = h.one((x) => x.type === 'header');
    for (const key of ['Enter', ' ']) header.props.onKeyDown({ key, preventDefault() { assert.fail('keyboard activation must not be prevented'); } });
    h.render();
    assert.equal(h.one((x) => x.props['aria-label'] === 'Annuities submenu').props['aria-expanded'], true);
  }
});

test('top-level pointer exit respects focus and resets descendants before reopening', () => {
  const h = harness(false);
  h.render();
  h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseEnter();
  h.render();
  h.one((x) => x.props['aria-label'] === 'Annuities submenu').props.onClick();
  h.render();
  const previousDocument = globalThis.document;
  const focused = {};
  globalThis.document = { activeElement: focused };
  try {
    const top = h.one((x) => x.type === 'li' && x.key === 'offer');
    top.props.onMouseLeave({ currentTarget: { contains: (element) => element === focused } });
    h.render();
    assert.equal(h.one((x) => x.props['aria-label'] === 'Annuities submenu').props['aria-expanded'], true, 'keyboard focus keeps the branch visible');
    top.props.onMouseLeave({ currentTarget: { contains: () => false } });
    h.render();
    assert.equal(h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props['aria-expanded'], false);
    assert.equal(h.one((x) => x.props['aria-label'] === 'Annuities submenu').props['aria-expanded'], false);
    h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseEnter();
    h.render();
    assert.equal(h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props['aria-expanded'], true);
    assert.equal(h.one((x) => x.props['aria-label'] === 'Annuities submenu').props['aria-expanded'], false, 'reopening starts with nested groups collapsed');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('desktop Escape from a leaf restores its nearest disclosure button and outside blur closes all branches', () => {
  const h = harness(false);
  h.render();
  h.one((x) => x.props['aria-label'] === 'What We Offer submenu').props.onClick();
  h.render();
  h.one((x) => x.props['aria-label'] === 'Annuities submenu').props.onClick();
  h.render();
  let focused = false;
  const parent = { querySelector: () => ({ getAttribute: () => 'allianz-nav-annuities', focus() { focused = true; } }) };
  const leaf = { querySelector: () => null, parentElement: { closest: () => parent } };
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape', target: { closest: () => leaf } });
  h.render();
  assert.equal(focused, true);
  assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-annuities').props.inert, true);
  assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-offer').props.inert, undefined, 'ancestor remains open so the nested disclosure focus stays visible');
  h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation').props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
  h.render();
  assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-offer').props.inert, true);
});

test('navigation glyphs and CTA arrow match saved source assets', () => {
  const css = fs.readFileSync(new URL('../../../public/allianz-assets/source-style.css', import.meta.url), 'utf8');
  const header = fs.readFileSync(new URL('./AllianzHeader.tsx', import.meta.url), 'utf8');
  for (const glyph of ['chevron-down', 'chevron-right', 'arrow-left', 'search', 'bars', 'close']) assert.ok(css.includes(`.c-icon--${glyph}:before`), `source glyph ${glyph} exists`);
  assert.equal(header.includes('a-icon--chevron-down'), false);
  const card = fs.readFileSync(new URL('../allianz-card-grid/AllianzCardGrid.tsx', import.meta.url), 'utf8');
  const arrow = card.match(/<path fillRule="evenodd" d="([^"]+)"/)[1];
  // Original right-arrow path captured from public-site/html/99f6a498352a3445.html.
  // Its digest keeps this test portable without including raw source HTML in the repo.
  assert.equal(createHash('sha256').update(arrow).digest('hex'), '7124b4cce7e1ad3e5f42d521958e5d613be46f97f9507b9b539710031d97e870');
  assert.equal(card.includes('a-icon--long-arrow-right'), false);
});
