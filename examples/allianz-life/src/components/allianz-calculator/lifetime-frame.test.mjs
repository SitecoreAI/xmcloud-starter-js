import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const file = fileURLToPath(new URL('./lifetime-frame.ts', import.meta.url));
const compiled = new Module(file);
compiled._compile(require('typescript').transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: require('typescript').ModuleKind.CommonJS },
}).outputText, file);
const { observeLifetimeFrame } = compiled.exports;

function fixture(t, cached) {
  const original = globalThis.ResizeObserver;
  const observers = [];
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(root) { this.root = root; }
    disconnect() { this.disconnected = true; }
  };
  t.after(() => { globalThis.ResizeObserver = original; });
  const frame = new EventTarget();
  let height = 1800, ready = cached;
  const root = { getBoundingClientRect: () => ({ height }) };
  frame.contentDocument = { getElementById: () => ready ? root : null };
  const heights = [], availability = [];
  const cleanup = observeLifetimeFrame(frame, (value) => heights.push(value), (value) => availability.push(value));
  return { frame, observers, heights, availability, cleanup,
    load(value = true) { ready = value; frame.dispatchEvent(new Event('load')); },
    resize(value) { height = value; observers.at(-1).callback(); } };
}

test('a cached frame is measured immediately without waiting for another load event', t => {
  const f = fixture(t, true);
  assert.deepEqual(f.heights, [1802]);
  assert.deepEqual(f.availability, [true]);
  f.resize(2450.3);
  assert.equal(f.heights.at(-1), 2453);
  f.cleanup();
  assert.equal(f.observers[0].disconnected, true);
});

test('a delayed load initializes sizing and a replacement disconnects the previous observer', t => {
  const f = fixture(t, false);
  assert.deepEqual(f.heights, []);
  assert.deepEqual(f.availability, []);
  f.load();
  assert.deepEqual(f.heights, [1802]);
  f.load();
  assert.equal(f.observers[0].disconnected, true);
  f.cleanup();
  f.load();
  assert.equal(f.observers.length, 2);
});

test('a failed document reports unavailable and a later valid load recovers without invented results', t => {
  const f = fixture(t, false);
  f.load(false);
  assert.deepEqual(f.availability, [false]);
  assert.deepEqual(f.heights, []);
  f.load(true);
  assert.deepEqual(f.availability, [false, true]);
  assert.deepEqual(f.heights, [1802]);
  f.cleanup();
});
