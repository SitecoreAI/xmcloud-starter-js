import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveDependenciesRoot } from './runtime-paths.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(resolveDependenciesRoot(), 'package.json'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'life-summary-print-test-'));
const compiled = path.join(temporary, 'summary-print.cjs');
await require('esbuild').build({ entryPoints: [path.join(directory, 'summary-print.ts')], bundle: true,
  platform: 'node', format: 'cjs', outfile: compiled, logLevel: 'silent' });
const { printSummary } = require(compiled);

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = () => new Promise(resolve => setImmediate(resolve));
const event = (target, type) => target.dispatchEvent(new Event(type));

/**
 * Small DOM port double: native EventTarget, element trees, importNode and focus.
 * It has no HTML parser, layout, CSS engine, networking, print dialog or React
 * renderer. Tests exercise the actual helper's resource/lifecycle decisions;
 * browser rendering and physical/PDF output remain separate acceptance work.
 */
class Element extends EventTarget {
  constructor(tag, document, namespaceURI = 'http://www.w3.org/1999/xhtml') {
    super();
    this.tagName = tag.toUpperCase();
    this.ownerDocument = document;
    this.namespaceURI = namespaceURI;
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.dataset = {};
    this.style = {};
    this.ownText = '';
    this.focusCalls = [];
  }
  get isConnected() { return this === this.ownerDocument.documentElement || Boolean(this.parentElement?.isConnected); }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.children.forEach(child => { child.parentElement = null; }); this.children = []; this.ownText = value; }
  appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; return child; }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  querySelector(selector) {
    const tags = selector.split(',').map(tag => tag.trim().toUpperCase());
    return descendants(this).find(node => tags.includes(node.tagName)) ?? null;
  }
  focus(options) { this.focusCalls.push(options); }
}
const descendants = root => root.children.flatMap(child => [child, ...descendants(child)]);
const nodes = (root, tag) => descendants(root).filter(node => node.tagName === tag.toUpperCase());

class Document {
  constructor() {
    this.documentElement = new Element('html', this);
    this.head = this.documentElement.appendChild(new Element('head', this));
    this.body = this.documentElement.appendChild(new Element('body', this));
  }
  createElement(tag) { return this.createFrame && tag === 'iframe' ? this.createFrame() : new Element(tag, this); }
  importNode(original, deep) {
    const copy = new Element(original.tagName, this, original.namespaceURI);
    for (const name of ['className', 'href', 'rel', 'disabled', 'media', 'ownText']) copy[name] = original[name];
    copy.attributes = { ...original.attributes };
    copy.dataset = { ...original.dataset };
    copy.style = { ...original.style };
    if (deep) original.children.forEach(child => copy.appendChild(this.importNode(child, true)));
    return copy;
  }
  querySelectorAll(selector) {
    assert.equal(selector, 'style, link[rel~="stylesheet"]', 'The double supports only the exercised stylesheet selection.');
    return descendants(this.documentElement).filter(node => node.tagName === 'STYLE' ||
      (node.tagName === 'LINK' && node.rel?.split(/\s+/).includes('stylesheet')));
  }
}

class Window extends EventTarget {
  constructor() {
    super();
    this.location = { origin: 'http://localhost:4196' };
    this.innerWidth = 1180;
    this.innerHeight = 820;
    this.timers = new Map();
    this.clock = 0;
    this.printCalls = 0;
    this.focusCalls = 0;
  }
  setTimeout(callback, milliseconds) { const id = Symbol(); this.timers.set(id, { at: this.clock + milliseconds, callback }); return id; }
  clearTimeout(id) { this.timers.delete(id); }
  advance(milliseconds) {
    this.clock += milliseconds;
    for (const [id, timer] of this.timers) if (timer.at <= this.clock) { this.timers.delete(id); timer.callback(); }
  }
  focus() { this.focusCalls++; }
  print() { this.printCalls++; }
}

function fixture() {
  const owner = new Document();
  const parent = owner.defaultView = new Window();
  owner.documentElement.lang = 'en-US';
  const outside = owner.body.appendChild(new Element('nav', owner));
  outside.textContent = 'Private calculator navigation: must not print';
  const report = owner.body.appendChild(new Element('section', owner));
  report.className = 'life-summary';
  const amount = report.appendChild(new Element('strong', owner));
  amount.textContent = '$285,000.00';
  const chart = report.appendChild(new Element('svg', owner, 'http://www.w3.org/2000/svg'));
  chart.setAttribute('viewBox', '0 0 100 100');
  const chartTitle = chart.appendChild(new Element('title', owner, chart.namespaceURI));
  chartTitle.textContent = 'Life insurance resources';
  const path = chart.appendChild(new Element('path', owner, chart.namespaceURI));
  path.setAttribute('d', 'M50 50 L50 0 A50 50 0 0 1 100 50 Z');
  path.setAttribute('fill', '#99ABD5');
  const trigger = owner.body.appendChild(new Element('button', owner));
  trigger.textContent = 'Print my report';
  const frames = [];
  owner.createFrame = () => {
    const frame = new Element('iframe', owner);
    frame.contentDocument = new Document();
    frame.contentWindow = frame.contentDocument.defaultView = new Window();
    frame.fonts = deferred();
    frame.contentDocument.fonts = { ready: frame.fonts.promise };
    frames.push(frame);
    return frame;
  };
  const stylesheet = (href, options = {}) => {
    const link = owner.head.appendChild(new Element('link', owner));
    Object.assign(link, { rel: 'stylesheet', href, disabled: false }, options);
    return link;
  };
  const start = () => {
    const job = printSummary(report, trigger);
    // Observe failures immediately, avoiding a transient unhandled rejection.
    const outcome = job.done.then(() => ({ ok: true }), error => ({ ok: false, error }));
    return { job, outcome, frame: frames.at(-1) };
  };
  return { owner, parent, report, trigger, frames, stylesheet, start };
}

test('print document contains only the selected report, preserving amounts, SVG and local styling', async () => {
  const f = fixture();
  const inline = f.owner.head.appendChild(new Element('style', f.owner));
  inline.textContent = '.life-summary{color:#006192}';
  f.stylesheet('http://localhost:4196/harness.css');
  f.stylesheet('https://unrelated.example/remote.css');
  f.stylesheet('http://localhost:4196/disabled.css', { disabled: true });
  const { job, outcome, frame } = f.start();
  assert.equal(frame.isConnected, true);
  assert.equal(frame.getAttribute('aria-hidden'), 'true');
  assert.equal(frame.tabIndex, -1);
  event(frame, 'load');
  await settle();
  const document = frame.contentDocument;
  assert.equal(document.documentElement.lang, 'en-US');
  assert.equal(document.title, 'Life insurance report');
  assert.equal(document.body.textContent, '$285,000.00Life insurance resources');
  assert.equal(nodes(document.body, 'nav').length, 0);
  assert.equal(nodes(document.body, 'button').length, 0);
  assert.equal(nodes(document.body, 'section').length, 1);
  assert.notEqual(nodes(document.body, 'section')[0], f.report);
  assert.equal(nodes(document.body, 'svg')[0].namespaceURI, 'http://www.w3.org/2000/svg');
  assert.deepEqual(nodes(document.body, 'path')[0].attributes, nodes(f.report, 'path')[0].attributes);
  assert.ok(document.head.textContent.includes(inline.textContent));
  const links = nodes(document.head, 'link');
  assert.deepEqual(links.map(link => link.href), ['http://localhost:4196/harness.css']);
  event(links[0], 'load');
  frame.fonts.resolve();
  await settle();
  assert.equal(frame.contentWindow.printCalls, 1);
  assert.equal(f.owner.body.children.includes(f.report), true, 'Original report stays attached.');
  event(frame.contentWindow, 'afterprint');
  assert.deepEqual(await outcome, { ok: true });
  assert.equal(frame.isConnected, false);
  assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
  job.cancel();
});

test('printing waits for every stylesheet and fonts before invoking the print dialog', async () => {
  const f = fixture();
  f.stylesheet('http://localhost:4196/one.css');
  f.stylesheet('http://localhost:4196/two.css');
  const { job, frame } = f.start();
  event(frame, 'load');
  await settle();
  const links = nodes(frame.contentDocument.head, 'link');
  assert.equal(frame.contentWindow.printCalls, 0);
  event(links[0], 'load');
  await settle();
  assert.equal(frame.contentWindow.printCalls, 0);
  event(links[1], 'load');
  await settle();
  assert.equal(frame.contentWindow.printCalls, 0, 'Font readiness remains pending.');
  frame.fonts.resolve();
  await settle();
  assert.equal(frame.contentWindow.focusCalls, 1);
  assert.equal(frame.contentWindow.printCalls, 1);
  assert.equal(f.parent.timers.size, 0, 'Preparation deadline must not close an active dialog.');
  job.cancel();
  await job.done;
});

test('duplicate activation shares one job and frame, then completed cleanup permits a fresh job', async () => {
  const f = fixture();
  const { job, frame } = f.start();
  assert.equal(printSummary(f.report, f.trigger), job);
  assert.equal(f.frames.length, 1);
  event(frame, 'load');
  frame.fonts.resolve();
  await settle();
  assert.equal(frame.contentWindow.printCalls, 1);
  event(frame.contentWindow, 'afterprint');
  await job.done;
  const replacement = f.start();
  assert.notEqual(replacement.job, job);
  assert.equal(f.frames.length, 2);
  replacement.job.cancel();
  await replacement.job.done;
});

test('stylesheet failure rejects with a useful error and removes the frame, timer and active job', async () => {
  const f = fixture();
  f.stylesheet('http://localhost:4196/unavailable.css');
  const { frame, outcome } = f.start();
  event(frame, 'load');
  await settle();
  event(nodes(frame.contentDocument.head, 'link')[0], 'error');
  const result = await outcome;
  assert.equal(result.ok, false);
  assert.match(result.error.message, /stylesheet could not load/);
  assert.equal(frame.contentWindow.printCalls, 0);
  assert.equal(frame.isConnected, false);
  assert.equal(f.parent.timers.size, 0);
  assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
  const retry = f.start();
  assert.equal(f.frames.length, 2);
  retry.job.cancel();
  await retry.job.done;
});

for (const phase of ['frame load', 'stylesheet', 'fonts']) {
  test(`preparation deadline cleans up while waiting for ${phase}; late readiness cannot print`, async () => {
    const f = fixture();
    f.stylesheet('http://localhost:4196/pending.css');
    const { frame, outcome } = f.start();
    if (phase !== 'frame load') { event(frame, 'load'); await settle(); }
    if (phase === 'fonts') { event(nodes(frame.contentDocument.head, 'link')[0], 'load'); await settle(); }
    f.parent.advance(9999);
    assert.equal(frame.isConnected, true);
    f.parent.advance(1);
    const result = await outcome;
    assert.equal(result.ok, false);
    assert.match(result.error.message, /could not finish loading for print/);
    assert.equal(frame.isConnected, false);
    assert.equal(f.parent.timers.size, 0);
    assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
    event(frame, 'load');
    nodes(frame.contentDocument.head, 'link').forEach(link => event(link, 'load'));
    frame.fonts.resolve();
    await settle();
    assert.equal(frame.contentWindow.printCalls, 0);
  });
}

for (const phase of ['frame load', 'stylesheet', 'fonts', 'active dialog']) {
  test(`explicit cancellation during ${phase} is idempotent and restores connected trigger focus once`, async () => {
    const f = fixture();
    if (phase === 'stylesheet') f.stylesheet('http://localhost:4196/pending.css');
    const { frame, job, outcome } = f.start();
    if (phase !== 'frame load') { event(frame, 'load'); await settle(); }
    if (phase === 'active dialog') { frame.fonts.resolve(); await settle(); }
    job.cancel();
    job.cancel();
    assert.deepEqual(await outcome, { ok: true });
    assert.equal(frame.isConnected, false);
    assert.equal(f.parent.timers.size, 0);
    assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
    event(frame, 'load');
    nodes(frame.contentDocument.head, 'link').forEach(link => event(link, 'load'));
    frame.fonts.resolve();
    event(frame.contentWindow, 'afterprint');
    event(f.parent, 'pagehide');
    f.parent.advance(10000);
    await settle();
    assert.equal(frame.contentWindow.printCalls, phase === 'active dialog' ? 1 : 0);
    assert.equal(f.trigger.focusCalls.length, 1);
  });
}

test('pagehide cancels preparation, and component unmount cleanup does not focus a disconnected trigger', async () => {
  const page = fixture();
  const pending = page.start();
  event(page.parent, 'pagehide');
  await pending.job.done;
  assert.equal(pending.frame.isConnected, false);
  assert.equal(page.parent.timers.size, 0);

  const unmounted = fixture();
  const current = unmounted.start();
  event(current.frame, 'load');
  await settle();
  // The component's unmount effect calls cancel after React detaches its UI.
  unmounted.report.remove();
  unmounted.trigger.remove();
  current.job.cancel();
  await current.job.done;
  current.frame.fonts.resolve();
  await settle();
  assert.equal(current.frame.isConnected, false);
  assert.equal(current.frame.contentWindow.printCalls, 0);
  assert.deepEqual(unmounted.trigger.focusCalls, []);
  assert.equal(unmounted.parent.timers.size, 0);
});

test('afterprint from a closed or canceled dialog completes cleanup once and restores focus', async () => {
  const f = fixture();
  const { frame, job } = f.start();
  event(frame, 'load');
  frame.fonts.resolve();
  await settle();
  event(frame.contentWindow, 'afterprint');
  await job.done;
  event(frame.contentWindow, 'afterprint');
  event(f.parent, 'pagehide');
  assert.equal(frame.isConnected, false);
  assert.equal(f.parent.timers.size, 0);
  assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
});

test('font failure and a synchronous print exception both reject and restore the UI', async () => {
  for (const failure of ['font', 'print']) {
    const f = fixture();
    const { frame, outcome } = f.start();
    if (failure === 'print') frame.contentWindow.print = () => { throw new Error('Print unavailable'); };
    event(frame, 'load');
    await settle();
    if (failure === 'font') frame.fonts.reject(new Error('Font unavailable')); else frame.fonts.resolve();
    const result = await outcome;
    assert.equal(result.ok, false);
    assert.match(result.error.message, /unavailable/);
    assert.equal(frame.isConnected, false);
    assert.equal(f.parent.timers.size, 0);
    assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
  }
});

test('unavailable frame document rejects cleanly, while forbidden embedded content is rejected before frame creation', async () => {
  const unavailable = fixture();
  const { frame, outcome } = unavailable.start();
  frame.contentDocument = null;
  event(frame, 'load');
  const result = await outcome;
  assert.equal(result.ok, false);
  assert.match(result.error.message, /print document is unavailable/);
  assert.equal(frame.isConnected, false);
  assert.equal(unavailable.parent.timers.size, 0);
  assert.deepEqual(unavailable.trigger.focusCalls, [{ preventScroll: true }]);
  for (const tag of ['script', 'iframe', 'object', 'embed']) {
    const f = fixture();
    f.report.appendChild(new Element(tag, f.owner));
    assert.throws(() => printSummary(f.report, f.trigger), /cannot print embedded external content/);
    assert.equal(f.frames.length, 0);
    assert.equal(f.parent.timers.size, 0);
  }
});

test('a DOM insertion failure releases preparation resources and allows a new print attempt', async (t) => {
  const f = fixture();
  const append = f.owner.body.appendChild;
  f.owner.body.appendChild = () => { throw new Error('Report frame insertion failed'); };
  let failedJob;
  let error;
  try { failedJob = printSummary(f.report, f.trigger); } catch (caught) { error = caught; }
  f.owner.body.appendChild = append;
  if (failedJob) {
    const result = await failedJob.done.then(() => ({ ok: true }), error => ({ ok: false, error }));
    assert.equal(result.ok, false);
    error = result.error;
  }
  assert.match(error?.message ?? '', /frame insertion failed/);
  const remainingTimers = f.parent.timers.size;
  const retry = f.start();
  t.after(() => retry.job.cancel());
  assert.equal(remainingTimers, 0, 'Failed insertion must release the preparation deadline immediately.');
  assert.equal(f.frames.length, 2, 'Retry must create a new frame rather than reuse the failed job.');
  event(retry.frame, 'load');
  retry.frame.fonts.resolve();
  await settle();
  assert.equal(retry.frame.contentWindow.printCalls, 1);
  retry.job.cancel();
  await retry.job.done;
});

test('synchronous cancellation caused by frame focus prevents printing the removed frame', async () => {
  const f = fixture();
  const { frame, job } = f.start();
  // Window focus can run application blur/focus handlers, including unmount cleanup.
  frame.contentWindow.focus = () => job.cancel();
  event(frame, 'load');
  frame.fonts.resolve();
  await job.done;
  await settle();
  assert.equal(frame.isConnected, false);
  assert.equal(frame.contentWindow.printCalls, 0, 'A completed cancellation must win over the pending print call.');
  assert.deepEqual(f.trigger.focusCalls, [{ preventScroll: true }]);
  assert.equal(f.parent.timers.size, 0);
});

test.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
