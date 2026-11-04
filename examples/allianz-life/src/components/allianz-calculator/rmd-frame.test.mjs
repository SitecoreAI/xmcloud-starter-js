import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRequire = createRequire(import.meta.url);
const ts = appRequire('typescript');
const file = path.join(here, 'rmd-frame.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { observeRmdFrame } = compiled.exports;

function fixture(t, { cached = true, workbook = 'pending', form = false } = {}) {
  const original = { ResizeObserver: globalThis.ResizeObserver, MutationObserver: globalThis.MutationObserver,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const resizes = [], mutations = [], timers = new Map();
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; resizes.push(this); }
    observe(root) { this.root = root; }
    disconnect() { this.disconnected = true; }
  };
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; mutations.push(this); }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
  };
  globalThis.setTimeout = (callback, delay) => { const id = Symbol(); timers.set(id, { callback, delay }); return id; };
  globalThis.clearTimeout = (id) => timers.delete(id);
  t.after(() => Object.assign(globalThis, original));
  let present = cached, height = 1800;
  const field = Object.defineProperty({}, 'value', { get() { throw new Error('Financial input values must not be read'); } });
  const root = {
    getBoundingClientRect: () => ({ height }),
    getAttribute: (name) => name === 'data-rmd-static-load' ? workbook : null,
    querySelector: (selector) => form && ['clientBirthDate', 'accountBalance', 'estimatedReturnRate']
      .some((name) => selector === `input[name="${name}"]`) ? field : null,
    querySelectorAll: (selector) => form && selector === 'input[name="primaryBeneficiary"][type="radio"]' ? [field, field] : [],
  };
  const frame = new EventTarget();
  frame.contentDocument = { getElementById: (id) => present && id === 'allianz-rmd-frame' ? root : null };
  const heights = [], states = [];
  const cleanup = observeRmdFrame(frame, (h) => heights.push(h), (s) => states.push(s));
  return { frame, root, resizes, mutations, timers, heights, states, cleanup,
    load(value = true) { present = value; frame.dispatchEvent(new Event('load')); },
    error() { frame.dispatchEvent(new Event('error')); },
    change(nextWorkbook = workbook, nextForm = form) { workbook = nextWorkbook; form = nextForm; mutations.at(-1)?.callback(); },
    resize(next) { height = next; resizes.at(-1).callback(); },
    expire() { const entry = [...timers.entries()].at(-1); assert.ok(entry); timers.delete(entry[0]); entry[1].callback(); },
  };
}

test('cached verified workbook plus owned inputs initializes ready and sizes without reading values', t => {
  const f = fixture(t, { workbook: 'verified', form: true });
  assert.deepEqual(f.states, ['loading', 'ready']);
  assert.deepEqual(f.heights, [1802]);
  assert.equal(f.timers.size, 0);
  f.resize(2450.3);
  assert.equal(f.heights.at(-1), 2453);
  f.resize(0); f.resize(25000); f.resize(NaN);
  assert.equal(f.heights.at(-1), 2453);
  f.cleanup();
});

test('root and source form alone cannot indicate ready before workbook verification', t => {
  const f = fixture(t, { form: true });
  assert.deepEqual(f.states, ['loading']);
  assert.equal([...f.timers.values()][0].delay, 15000);
  f.change('verified', true);
  assert.deepEqual(f.states, ['loading', 'ready']);
  f.cleanup();
});

test('failed workbook wins when inputs already exist', t => {
  const f = fixture(t, { workbook: 'failed', form: true });
  assert.deepEqual(f.states, ['loading', 'failed']);
  assert.equal(f.timers.size, 0);
  f.change('failed', true);
  assert.deepEqual(f.states, ['loading', 'failed']);
  f.cleanup();
});

test('failed workbook remains unavailable when inputs appear later', t => {
  const f = fixture(t, { workbook: 'failed' });
  f.change('failed', true);
  assert.deepEqual(f.states, ['loading', 'failed']);
  f.cleanup();
});

test('failure after a ready form overrides readiness', t => {
  const f = fixture(t, { workbook: 'verified', form: true });
  f.change('failed', true);
  assert.deepEqual(f.states, ['loading', 'ready', 'failed']);
  f.cleanup();
});

test('verified bytes alone still wait for source UI, then accept it', t => {
  const f = fixture(t, { workbook: 'verified' });
  assert.deepEqual(f.states, ['loading']);
  f.change('verified', true);
  assert.deepEqual(f.states, ['loading', 'ready']);
  f.cleanup();
});

test('stalled first read expires without retries and stays failed until a fresh document load', t => {
  const f = fixture(t);
  f.expire();
  assert.deepEqual(f.states, ['loading', 'failed']);
  f.change('verified', true);
  assert.deepEqual(f.states, ['loading', 'failed']);
  assert.equal(f.mutations[0].disconnected, true);
  assert.equal(f.resizes[0].disconnected, true);
  f.load();
  assert.deepEqual(f.states, ['loading', 'failed', 'loading', 'ready']);
  assert.equal(f.timers.size, 0);
  f.cleanup();
});

test('delayed navigation, wrong document and subsequent fresh valid load are distinct', t => {
  const f = fixture(t, { cached: false });
  assert.deepEqual(f.states, ['loading']);
  f.load(false);
  assert.deepEqual(f.states, ['loading', 'failed']);
  f.load(true);
  assert.deepEqual(f.states, ['loading', 'failed', 'loading']);
  f.change('verified', true);
  assert.equal(f.states.at(-1), 'ready');
  f.cleanup();
});

test('cleanup disconnects observers, deadline and all late callbacks', t => {
  const f = fixture(t);
  f.cleanup();
  assert.equal(f.resizes[0].disconnected, true);
  assert.equal(f.mutations[0].disconnected, true);
  assert.equal(f.timers.size, 0);
  const before = [f.states.length, f.heights.length, f.resizes.length];
  f.change('verified', true); f.load(); f.resize(2000);
  assert.deepEqual([f.states.length, f.heights.length, f.resizes.length], before);
});

test('frame error reports failed and cancels loading work', t => {
  const f = fixture(t);
  f.error();
  assert.deepEqual(f.states, ['loading', 'failed']);
  assert.equal(f.timers.size, 0);
  assert.equal(f.resizes[0].disconnected, true);
  f.cleanup();
});
