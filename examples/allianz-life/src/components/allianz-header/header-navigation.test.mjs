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
  navItem('annuities', 'Annuities', '/what-we-offer/annuities', [
    navItem('annuity-overview', 'About annuities', '/what-we-offer/annuities'),
    navItem('fixed', 'Fixed annuities', '/what-we-offer/annuities/fixed-index-annuities'),
  ]),
]), navItem('answers', 'Get Answers', '/get-answers')];

test('mobile menu enter, back, cancel and reopen reset the correct list', () => {
  const reduce = rules.mobileMenuReducer;
  let state = reduce(rules.initialMobileMenuState, { type: 'toggle' });
  assert.deepEqual(state, { open: true, path: [] });
  state = reduce(state, { type: 'enter', id: 'offer' });
  assert.equal(rules.navigationAtPath(items, state.path).parent.id, 'offer');
  state = reduce(state, { type: 'enter', id: 'annuities' });
  assert.equal(rules.navigationAtPath(items, state.path).items[1].id, 'fixed');
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
  assert.deepEqual(rules.desktopMenuPath(state), ['offer']);
  assert.equal(state.hoverOpened, true);
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer'], 'first activation keeps a hover-open branch usable');
  assert.equal(state.hoverOpened, false);
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), [], 'repeated activation closes the branch');
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities']);
  state = reduce(state, { type: 'toggle', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), [], 'closing the root hides descendants');
  state = reduce(state, { type: 'hover', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities'], 're-hover restores selected descendants');
  state = reduce(state, { type: 'hover', path: ['another-root'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['another-root'], 'new root replaces the visible root');
  assert.equal(reduce(state, { type: 'leave', path: ['offer'] }), state, 'late prior-root leave cannot close the new root');
  state = reduce(state, { type: 'close' });
  assert.deepEqual(rules.desktopMenuPath(state), []);
  state = reduce(state, { type: 'hover', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities']);
});

test('desktop reducer ignores deeper hover and retains descendants across collapse and sibling selection', () => {
  const reduce = rules.desktopMenuReducer;
  let state = reduce(rules.initialDesktopMenuState, { type: 'hover', path: ['offer'] });
  for (const path of [['offer', 'annuities'], ['offer', 'annuities', 'fixed']]) {
    assert.equal(reduce(rules.initialDesktopMenuState, { type: 'hover', path }), rules.initialDesktopMenuState);
    assert.equal(reduce(state, { type: 'hover', path }), state);
    state = reduce(state, { type: 'toggle', path });
    assert.deepEqual(rules.desktopMenuPath(state), path, 'deeper branches require explicit activation');
    assert.equal(state.hoverOpened, true, 'deeper activation leaves the root hover state alone');
    assert.equal(reduce(state, { type: 'hover', path: ['offer', 'life'] }), state);
  }
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer']);
  assert.equal(reduce(state, { type: 'toggle', path: ['offer', 'annuities', 'fixed'] }), state, 'hidden controls cannot activate a branch');
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities', 'fixed'], 'parent reopening restores its deeper selection');
  state = reduce(state, { type: 'toggle', path: ['offer', 'life'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'life'], 'expandable siblings are exclusive');
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities', 'fixed'], 'switching back restores the remembered sibling branch');
  state = reduce(state, { type: 'toggle', path: ['offer', 'annuities', 'fixed'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities'], 'second activation collapses the selected child');
  state = reduce(state, { type: 'leave', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), []);
  state = reduce(state, { type: 'hover', path: ['offer'] });
  assert.deepEqual(rules.desktopMenuPath(state), ['offer', 'annuities'], 're-hover preserves the explicit deeper collapse');
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
    setViewport(value) { mobile = value; },
    nodes() { return flatten(root); },
    one(predicate) { const match = flatten(root).find(predicate); assert.ok(match, 'expected control exists'); return match; },
  };
}

function navigationTargets(navigationItems) {
  const targets = new Map();
  let focused;
  const visit = (navigationItems, parent = null) => {
    for (const item of navigationItems) {
      const children = item.children?.results ?? [];
      const row = {
        parent,
        parentElement: { closest: () => parent },
        closest: () => row,
        querySelector: () => opener,
      };
      const opener = children.length ? {
        closest: () => row,
        getAttribute: () => `allianz-nav-${item.id}`,
        focus() { focused = { id: item.id, target: opener, row }; },
      } : null;
      targets.set(item.id, { row, opener });
      row.id = item.id;
      visit(children, row);
    }
  };
  visit(navigationItems);
  return { targets, focused: () => focused };
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
  assert.equal(panel('fixed').props.inert, true, 'remembered descendants stay inert when their ancestor is hidden');
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

test('deeper row text and chevron share one native Enter/Space disclosure while the first child stays a destination', () => {
  const overview = navItem('group-overview', 'About group', '/group');
  const group = navItem('group', 'Generic group', '/group', [overview, navItem('leaf', 'Leaf', '/leaf')]);
  group.title.jsonValue.editable = '<span>Generic group</span>';
  overview.link.jsonValue.editable = '<a href="/group">About group</a>';
  const h = harness(false, [navItem('root', 'Root', '/root', [group])]);
  const disclosure = () => h.one((x) => x.props['aria-controls'] === 'allianz-nav-group');
  h.render();
  h.one((x) => x.props['aria-controls'] === 'allianz-nav-root').props.onClick();
  h.render();
  for (const detail of [1, 0, 0]) {
    const button = disclosure();
    assert.equal(button.type, 'button', 'row text uses native Enter and Space activation');
    assert.equal(button.props.type, 'button');
    assert.equal(button.props.onKeyDown, undefined, 'native keyboard semantics remain available');
    const children = flatten(button.props.children);
    assert.equal(children.find((x) => x.type === 'span').props.field, group.title.jsonValue, 'editable title field identity is retained');
    assert.equal(children.find((x) => x.type === 'i').props['aria-hidden'], 'true', 'chevron is inside the same disclosure');
    const before = button.props['aria-expanded'];
    button.props.onClick({ detail });
    h.render();
    assert.equal(disclosure().props['aria-expanded'], !before);
    const destination = h.one((x) => x.type === 'a' && x.props.field?.value.href === '/group');
    assert.equal(destination.props.onClick, undefined, 'the actual first child follows its destination');
    assert.equal(destination.props.field.editable, overview.link.jsonValue.editable, 'link authoring markup is retained');
    assert.equal(h.nodes().filter((x) => x.type === 'a' && x.props.field?.value.href === '/group').length, 1, 'the disclosure row does not duplicate the child link');
  }
});

test('desktop parent collapse, sibling switching and top transitions retain branches without exposing hidden descendants', () => {
  const h = harness(false, [navItem('root', 'Root', '/root', [
    navItem('left', 'Left', '/left', [
      navItem('middle', 'Middle', '/middle', [navItem('deep', 'Deep', '/deep', [navItem('leaf', 'Leaf', '/leaf')])]),
    ]),
    navItem('right', 'Right', '/right', [navItem('right-leaf', 'Right leaf', '/right-leaf')]),
  ]), navItem('other', 'Other', '/other', [navItem('other-leaf', 'Other leaf', '/other-leaf')])]);
  const panel = (id) => h.one((x) => x.type === 'ul' && x.props.id === `allianz-nav-${id}`);
  const toggle = (id) => h.one((x) => x.props['aria-controls'] === `allianz-nav-${id}`);
  const hover = (id) => { h.one((x) => x.type === 'li' && x.key === id).props.onMouseEnter(); h.render(); };
  const activate = (id) => { toggle(id).props.onClick(); h.render(); };
  const assertHidden = (ids) => {
    for (const id of ids) {
      assert.equal(panel(id).props.inert, true, `${id} descendants cannot receive focus`);
      assert.equal(panel(id).props['aria-hidden'], true, `${id} descendants are absent from accessibility navigation`);
      assert.equal(toggle(id).props['aria-expanded'], false);
    }
  };
  h.render();
  hover('root');
  for (const id of ['left', 'middle', 'deep']) activate(id);
  activate('left');
  assertHidden(['left', 'middle', 'deep']);
  activate('left');
  for (const id of ['left', 'middle', 'deep']) assert.equal(panel(id).props.inert, undefined, 'parent reopen restores each selected descendant');
  activate('right');
  assertHidden(['left', 'middle', 'deep']);
  assert.equal(panel('right').props.inert, undefined);
  activate('left');
  assertHidden(['right']);
  assert.equal(panel('deep').props.inert, undefined, 'returning to a sibling restores its deeper branch');
  hover('other');
  assertHidden(['root', 'left', 'middle', 'deep']);
  assert.equal(panel('other').props.inert, undefined);
  hover('root');
  assertHidden(['other']);
  assert.equal(panel('deep').props.inert, undefined, 'returning to a root restores its prior branch');
});

test('focused top switching moves to the new visible opener before collapse without a blur-close race', () => {
  const navigationItems = [...items, navItem('another-root', 'Another root', '/another-root', [navItem('another-leaf', 'Another leaf', '/another-leaf')])];
  const previousDocument = globalThis.document;
  try {
    for (const focusInsidePanel of [true, false]) {
      const h = harness(false, navigationItems);
      h.render();
      h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseEnter();
      h.render();
      h.one((x) => x.props['aria-controls'] === 'allianz-nav-annuities').props.onClick();
      h.render();
      const priorFocus = {};
      let focusMoves = 0;
      const newOpener = {
        focus() {
          focusMoves++;
          assert.equal(h.one((x) => x.props['aria-controls'] === 'allianz-nav-annuities').props['aria-expanded'], true, 'focus moves before its old containing panel collapses');
          globalThis.document.activeElement = newOpener;
          nav.props.onBlur({ currentTarget: navElement, relatedTarget: newOpener });
        },
      };
      const oldPanel = { contains: (element) => focusInsidePanel && element === priorFocus };
      const navElement = { querySelector: () => oldPanel, contains: (element) => element === newOpener || (focusInsidePanel && element === priorFocus) };
      const nav = h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation');
      nav.props.ref.current = navElement;
      globalThis.document = { activeElement: priorFocus };
      h.one((x) => x.type === 'li' && x.key === 'another-root').props.onMouseEnter({ currentTarget: { querySelector: () => newOpener } });
      h.render();
      assert.equal(focusMoves, focusInsidePanel ? 1 : 0, 'focus outside the replaced panel is preserved');
      assert.equal(globalThis.document.activeElement, focusInsidePanel ? newOpener : priorFocus);
      assert.equal(h.one((x) => x.props['aria-controls'] === 'allianz-nav-another-root').props['aria-expanded'], true, 'the new root remains open after blur');
      assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-offer').props.inert, true);
      assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-another-root').props.inert, undefined);
      h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseLeave({ currentTarget: { contains: () => false } });
      h.render();
      assert.equal(h.one((x) => x.props['aria-controls'] === 'allianz-nav-another-root').props['aria-expanded'], true, 'a late pointer exit from the old root cannot dismiss the new one');
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('top-level pointer exit respects focus and retains descendants before reopening', () => {
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
    assert.equal(h.one((x) => x.props['aria-label'] === 'Annuities submenu').props['aria-expanded'], true, 'reopening restores the clicked branch');
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

test('outside blur, search and mobile navigation hide desktop menus while preserving the remembered branch', () => {
  const h = harness(false);
  const panel = (id) => h.one((x) => x.type === 'ul' && x.props.id === `allianz-nav-${id}`);
  const hoverRoot = () => { h.one((x) => x.type === 'li' && x.key === 'offer').props.onMouseEnter(); h.render(); };
  h.render();
  hoverRoot();
  h.one((x) => x.props['aria-controls'] === 'allianz-nav-annuities').props.onClick();
  h.render();
  let nav = h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation');
  nav.props.onBlur({ currentTarget: { contains: () => true }, relatedTarget: {} });
  h.render();
  assert.equal(panel('annuities').props.inert, undefined, 'focus within navigation keeps its branch visible');
  nav.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: {} });
  h.render();
  assert.equal(panel('offer').props.inert, true);
  assert.equal(panel('annuities').props.inert, true);
  hoverRoot();
  assert.equal(panel('annuities').props.inert, undefined, 're-hover after outside blur restores its branch');
  let focused = '';
  const search = h.one((x) => x.props['aria-controls'] === 'allianz-header-search');
  search.props.ref.current = { focus() { focused = 'search'; } };
  search.props.onClick();
  h.render();
  assert.equal(panel('offer').props.inert, true);
  assert.equal(panel('annuities').props.inert, true);
  assert.ok(h.one((x) => x.type === 'input').props.autoFocus);
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape' });
  h.render();
  assert.equal(focused, 'search');
  hoverRoot();
  assert.equal(panel('annuities').props.inert, undefined, 'search dismissal leaves prior branch selection available');
  h.setViewport(true);
  h.render();
  const menu = h.one((x) => x.props['aria-label'] === 'Open menu');
  menu.props.ref.current = { focus() { focused = 'menu'; } };
  menu.props.onClick();
  h.render();
  h.one((x) => x.props['aria-label'] === 'Open What We Offer submenu').props.onClick();
  h.render();
  assert.equal(h.nodes().filter((x) => x.type === 'ul' && x.props['data-level']).length, 1, 'mobile still renders only its current list');
  h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape' });
  h.render();
  assert.equal(focused, 'menu');
  nav = h.one((x) => x.type === 'nav' && x.props.id === 'allianz-main-navigation');
  assert.equal(nav.props.inert, true);
  h.setViewport(false);
  h.render();
  assert.equal(panel('offer').props.inert, true, 'mobile dismissal keeps desktop panels hidden');
  hoverRoot();
  assert.equal(panel('annuities').props.inert, undefined, 'desktop remembered selection remains independent of mobile drilling');
});

test('header destinations pass validated native targets and rel alongside authoring fields', () => {
  const root = navItem('root', 'Root', '/root', [navItem('overview', 'Overview', '/root'), navItem('blank', 'Blank', '/blank')]);
  const ordinary = navItem('ordinary', 'Ordinary', '/ordinary');
  const utility = navItem('utility', 'Utility', '/utility');
  for (const item of [root, root.children.results[1], utility]) {
    item.link.jsonValue.value.target = '_blank';
    item.link.jsonValue.editable = `<a href="${item.link.jsonValue.value.href}" target="_blank">${item.title.jsonValue.value}</a>`;
  }
  const props = { fields: { data: { datasource: { primaryNav: { targetItems: [root, ordinary] }, utilityNav: { targetItems: [utility] } } } } };
  for (const mobile of [false, true]) {
    const h = harness(mobile);
    h.render(props);
    for (const item of [root, utility]) {
      const link = h.one((x) => x.type === 'a' && x.props.field?.value.href === item.link.jsonValue.value.href);
      assert.equal(link.props.field.value.target, '_blank');
      assert.match(link.props.rel, /noopener/);
      assert.match(link.props.rel, /noreferrer/);
      assert.equal(link.props.field.editable, item.link.jsonValue.editable);
    }
    assert.equal(h.one((x) => x.type === 'a' && x.props.field?.value.href === '/ordinary').props.rel, undefined);
    if (!mobile) {
      const leaf = h.one((x) => x.type === 'a' && x.props.field?.value.href === '/blank');
      assert.equal(leaf.props.field.value.target, '_blank');
      assert.match(leaf.props.rel, /noopener/);
      assert.match(leaf.props.rel, /noreferrer/);
      assert.equal(leaf.props.onClick, undefined, 'leaf target follows native navigation');
    }
  }
});

for (const depth of [3, 4, 6]) {
  test(`repeated desktop Escape closes one open ancestor at a time through ${depth} disclosure levels`, () => {
    const ids = Array.from({ length: depth }, (_, index) => `group-${index}`);
    const navigationItems = ids.reduceRight((children, id) => [navItem(id, id, `/${id}`, children)], [navItem('leaf', 'Leaf', '/leaf')]);
    const h = harness(false, navigationItems);
    const dom = navigationTargets(navigationItems);
    const panel = (id) => h.one((x) => x.type === 'ul' && x.props.id === `allianz-nav-${id}`);
    const toggle = (id) => h.one((x) => x.type === 'button' && x.props['aria-controls'] === `allianz-nav-${id}`);
    h.render();
    h.one((x) => x.type === 'li' && x.key === ids[0]).props.onMouseEnter();
    h.render();
    for (const id of ids.slice(1)) {
      toggle(id).props.onClick();
      h.render();
    }
    let target = dom.targets.get('leaf').row;
    for (let index = depth - 1; index >= 0; index--) {
      h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape', target });
      h.render();
      const focused = dom.focused();
      assert.equal(focused.id, ids[index], 'Escape skips the collapsed opener and focuses the nearest open ancestor');
      for (let level = 0; level < depth; level++) {
        assert.equal(toggle(ids[level]).props['aria-expanded'], level < index, 'only the nearest open branch and its descendants close');
        assert.equal(panel(ids[level]).props.inert, level < index ? undefined : true);
      }
      for (let ancestor = focused.row.parent; ancestor; ancestor = ancestor.parent) {
        assert.equal(panel(ancestor.id).props.inert, undefined, 'the focused opener remains outside every collapsed panel');
      }
      target = focused.target;
    }
    h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape', target });
    h.render();
    assert.equal(dom.focused().id, ids[0], 'Escape after the final close keeps focus on the top-level opener');
    assert.equal(toggle(ids[0]).props['aria-expanded'], false);
  });
}

test('desktop Escape from collapsed sibling openers and their leaf targets closes the nearest open ancestor', () => {
  const navigationItems = [navItem('root', 'Root', '/root', [
    navItem('parent', 'Parent', '/parent', [
      navItem('active', 'Active', '/active', [navItem('active-leaf', 'Active leaf', '/active-leaf')]),
      navItem('collapsed', 'Collapsed', '/collapsed', [navItem('collapsed-leaf', 'Collapsed leaf', '/collapsed-leaf')]),
      navItem('visible-leaf', 'Visible leaf', '/visible-leaf'),
    ]),
  ])];
  for (const targetId of ['collapsed', 'collapsed-leaf', 'visible-leaf']) {
    const h = harness(false, navigationItems);
    const dom = navigationTargets(navigationItems);
    const toggle = (id) => h.one((x) => x.type === 'button' && x.props['aria-controls'] === `allianz-nav-${id}`);
    h.render();
    for (const id of ['root', 'parent', 'active']) {
      toggle(id).props.onClick();
      h.render();
    }
    const target = dom.targets.get(targetId);
    h.one((x) => x.type === 'header').props.onKeyDown({ key: 'Escape', target: target.opener ?? target.row });
    h.render();
    assert.equal(dom.focused().id, 'parent', `Escape from ${targetId} restores its open parent rather than a collapsed sibling`);
    assert.equal(toggle('root').props['aria-expanded'], true);
    for (const id of ['parent', 'active', 'collapsed']) assert.equal(toggle(id).props['aria-expanded'], false);
    assert.equal(h.one((x) => x.type === 'ul' && x.props.id === 'allianz-nav-root').props.inert, undefined, 'focused parent opener stays visible');
  }
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
