import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const { sourceFrameLink, observeSourceToolFrame } = loadSource(path.join(sourceRoot,
  'components/allianz-calculator/source-tool-frame/source-tool-frame.ts'));
const sourcePage = '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-income-adv/income-calculator';

test('official navigation uses the existing local-route policy and escapes the frame, preserving query/hash', () => {
  for (const href of ['https://www.allianzlife.com/about?one=1&one=2#team',
    'http://www.allianzlife.com/about?one=1&one=2#team', '//www.allianzlife.com/about?one=1&one=2#team',
    '/about?one=1&one=2#team']) {
    assert.deepEqual(sourceFrameLink(href, '_blank', sourcePage), {
      href: '/about?one=1&one=2#team', target: '_top', rel: '',
    });
  }
});

test('unavailable source tools, accounts, corporate sites and PDFs are literal #, not production fallbacks', () => {
  for (const href of ['/Login', '/calculators/index-strategy-calculator-for-index-advantage-income',
    '/calculators/index-strategy-calculator-for-index-advantage-income-np',
    '/-/media/not-imported.pdf', 'https://www.allianz.com/en_GB.html', '/not-a-verified-demo-route']) {
    assert.deepEqual(sourceFrameLink(href, '_blank', sourcePage), { href: '#', target: '', rel: '' });
  }
});

test('in-widget fragment controls stay in the widget; cleared href stays cleared', () => {
  for (const href of ['', '#', '#strategy-details']) {
    assert.deepEqual(sourceFrameLink(href, '_top', sourcePage), { href, target: '', rel: '' });
  }
});

test('malformed schemes, ports, authorities, controls and unapproved external destinations remain rejected', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,test', 'https://example.test/account',
    'https://www.allianzlife.com:443/about', '//www.allianzlife.com:443/about',
    'https://user:pass@www.allianzlife.com/about', 'https://www.allianzlife.com.evil.test/about',
    ' https://www.allianzlife.com/about', '/about\\invalid', '/about\ninvalid',
    'https://www.allianzlife.com/%2fabout']) {
    assert.equal(sourceFrameLink(href, '_blank', sourcePage).href, '#service-unavailable', href);
  }
  assert.equal(sourceFrameLink('/about', '', 'https://untrusted.test/page').href, '#service-unavailable');
});

test('approved external destinations retain a permitted new tab and safe rel', () => {
  const result = sourceFrameLink('https://www.pimco.com/us/en', '_blank', sourcePage);
  assert.equal(result.href, 'https://www.pimco.com/us/en');
  assert.equal(result.target, '_blank');
  assert.match(result.rel, /noopener/);
  assert.match(result.rel, /noreferrer/);
});

class Anchor {
  constructor(href, target = '') { this.attrs = new Map([['href', href], ['target', target]]); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  setAttribute(name, value) { this.attrs.set(name, value); }
  removeAttribute(name) { this.attrs.delete(name); }
  closest() { return this; }
}

function fixture(t, { cached = false, preset = 'income-adv', anchors = [], mounted = true } = {}) {
  const originalResize = globalThis.ResizeObserver, originalMutation = globalThis.MutationObserver;
  const resizeObservers = [], mutationObservers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; resizeObservers.push(this); }
    observe(root) { this.root = root; }
    disconnect() { this.disconnected = true; }
  };
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; mutationObservers.push(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
  };
  t.after(() => { globalThis.ResizeObserver = originalResize; globalThis.MutationObserver = originalMutation; });
  const frame = new EventTarget(), document = new EventTarget();
  let ready = cached, height = 800;
  const root = {
    inert: true, getAttribute: (name) => name === 'data-source-preset' ? preset : null,
    getBoundingClientRect: () => ({ height }), querySelectorAll: () => anchors,
    querySelector: () => mounted ? {} : null,
    contains: (anchor) => anchors.includes(anchor),
  };
  document.getElementById = () => ready ? root : null;
  frame.contentDocument = document;
  const heights = [], availability = [];
  const cleanup = observeSourceToolFrame(frame, sourcePage, 'income-adv',
    (value) => heights.push(value), (value) => availability.push(value));
  return { frame, document, root, anchors, heights, availability, cleanup, resizeObservers, mutationObservers,
    load(value = true) { ready = value; frame.dispatchEvent(new Event('load')); },
    resize(value) { height = value; resizeObservers.at(-1).callback(); },
    mount() { mounted = true; mutationObservers.at(-1).callback(); },
    activate(anchor, type = 'click') {
      const event = new Event(type, { cancelable: true });
      event.composedPath = () => [anchor];
      document.dispatchEvent(event);
    },
  };
}

test('cached widgets become interactive only after initial link policy and sizing are attached', (t) => {
  const anchor = new Anchor('https://www.allianzlife.com/about', '_blank');
  const f = fixture(t, { cached: true, anchors: [anchor] });
  assert.equal(anchor.getAttribute('href'), '/about');
  assert.equal(anchor.getAttribute('target'), '_top');
  assert.equal(f.root.inert, false);
  assert.deepEqual(f.heights, [802]);
  assert.deepEqual(f.availability, [true]);
  f.resize(1320.2);
  assert.equal(f.heights.at(-1), 1323);
  f.cleanup();
  assert.equal(f.root.inert, true);
  assert.equal(f.mutationObservers[0].disconnected, true);
  assert.equal(f.resizeObservers[0].disconnected, true);
});

test('a failed or delayed source script does not activate an empty static shell', (t) => {
  const f = fixture(t, { cached: true, mounted: false });
  assert.equal(f.root.inert, true);
  assert.deepEqual(f.availability, []);
  f.mount();
  assert.equal(f.root.inert, false);
  assert.deepEqual(f.availability, [true]);
  f.cleanup();
});

test('dynamic links and source rewrites are contained before pointer, keyboard and auxiliary activation', (t) => {
  const f = fixture(t, { cached: true });
  const dynamic = new Anchor('https://www.allianzlife.com/Login', '_blank');
  f.anchors.push(dynamic);
  f.mutationObservers[0].callback();
  assert.equal(dynamic.getAttribute('href'), '#');
  for (const type of ['click', 'keydown', 'auxclick']) {
    dynamic.setAttribute('href', 'https://www.allianzlife.com/about');
    dynamic.setAttribute('target', '_blank');
    f.activate(dynamic, type);
    assert.equal(dynamic.getAttribute('href'), '/about');
    assert.equal(dynamic.getAttribute('target'), '_top');
  }
  f.cleanup();
  dynamic.setAttribute('href', 'https://www.allianzlife.com/about');
  f.activate(dynamic);
  assert.equal(dynamic.getAttribute('href'), 'https://www.allianzlife.com/about');
});

test('wrong preset and failed documents remain unavailable and inert; a later valid load recovers', (t) => {
  const wrong = fixture(t, { cached: true, preset: 'income-plus' });
  assert.deepEqual(wrong.availability, [false]);
  assert.equal(wrong.root.inert, true);
  assert.equal(wrong.mutationObservers.length, 0);
  wrong.cleanup();
  const f = fixture(t);
  f.load(false);
  assert.deepEqual(f.availability, [false]);
  f.load(true);
  assert.deepEqual(f.availability, [false, true]);
  assert.equal(f.root.inert, false);
  f.load();
  assert.equal(f.mutationObservers[0].disconnected, true);
  f.cleanup();
  const count = f.mutationObservers.length;
  f.load();
  assert.equal(f.mutationObservers.length, count);
});
