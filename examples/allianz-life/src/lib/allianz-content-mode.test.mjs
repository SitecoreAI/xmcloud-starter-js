import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const appRoot = fileURLToPath(new URL('../..', import.meta.url));
function load(filename) {
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = compiled.require.bind(compiled);
  compiled.require = (specifier) => specifier.startsWith('.')
    ? load(path.resolve(path.dirname(filename), `${specifier}.ts`)) : nativeRequire(specifier);
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}
const mode = load(path.join(appRoot, 'src/lib/allianz-content-mode.ts'));

test('only explicitly selected development/test samples bypass CMS', () => {
  const oldNode = process.env.NODE_ENV, oldMode = process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE;
  try {
    for (const environment of [undefined, 'development', 'test', 'production']) {
      for (const selection of [undefined, '', 'connected', 'fixture', 'unknown']) {
        if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment;
        if (selection === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = selection;
        const samples = ['development', 'test'].includes(environment) && selection === 'fixture';
        assert.equal(mode.usesFixtureContent(), samples);
        assert.equal(mode.isConnected(), !samples);
      }
    }
  } finally {
    if (oldNode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNode;
    if (oldMode === undefined) delete process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE; else process.env.NEXT_PUBLIC_ALLIANZ_CONTENT_MODE = oldMode;
  }
});

// Isolated processes receive only synthetic settings; no host credentials are inspected.
function configResult(environment) {
  const script = `
    const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
    const ts = require('typescript');
    function load(filename) {
      const compiled = new Module(filename); compiled.filename = filename;
      compiled.paths = Module._nodeModulePaths(path.dirname(filename));
      const nativeRequire = compiled.require.bind(compiled);
      compiled.require = (specifier) => specifier.startsWith('.') ? load(path.resolve(path.dirname(filename), specifier + '.ts')) : nativeRequire(specifier);
      compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
      return compiled.exports;
    }
    try {
      const config = load(path.resolve('sitecore.config.ts')).default;
      console.log(JSON.stringify({ ok: true, context: config.api.edge.contextId, clientContext: config.api.edge.clientContextId,
        localHost: config.api.local.apiHost, codeGenerationDisabled: config.disableCodeGeneration, multisite: config.multisite.enabled,
        staticPaths: config.generateStaticPaths, defaultSite: config.defaultSite }));
    } catch (error) { console.log(JSON.stringify({ ok: false, message: error.message })); }
  `;
  const child = spawnSync(process.execPath, ['-e', script], { cwd: appRoot, env: environment, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout.trim().split('\n').at(-1));
}

for (const selection of [undefined, 'fixture', 'unknown']) {
  test(`production ${selection ?? 'unset'} keeps standard SDK server and client context configuration`, () => {
    const result = configResult({ NODE_ENV: 'production', SITECORE_EDGE_CONTEXT_ID: 'synthetic-server-context',
      NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID: 'synthetic-client-context',
      ...(selection === undefined ? {} : { NEXT_PUBLIC_ALLIANZ_CONTENT_MODE: selection }) });
    assert.equal(result.ok, true);
    assert.equal(result.context, 'synthetic-server-context');
    assert.equal(result.clientContext, 'synthetic-client-context');
    assert.equal(result.multisite, true);
    assert.equal(result.codeGenerationDisabled, false);
    assert.equal(result.defaultSite, 'allianz-life');
  });
}

test('production missing CMS configuration fails through the real SDK instead of selecting fixtures', () => {
  for (const selection of [undefined, 'fixture']) {
    const result = configResult({ NODE_ENV: 'production', ...(selection ? { NEXT_PUBLIC_ALLIANZ_CONTENT_MODE: selection } : {}) });
    assert.equal(result.ok, false);
    assert.match(result.message, /MV_007|context|apiHost|API/i);
    assert.doesNotMatch(result.message, /synthetic|disconnected-fixture-do-not-send/);
  }
});

test('explicit development/test samples remain credential-free and disable remote discovery', () => {
  for (const environment of ['development', 'test']) {
    const result = configResult({ NODE_ENV: environment, NEXT_PUBLIC_ALLIANZ_CONTENT_MODE: 'fixture' });
    assert.equal(result.ok, true);
    assert.equal(result.multisite, false);
    assert.equal(result.staticPaths, false);
    assert.equal(result.codeGenerationDisabled, true);
  }
});

test('production retains the SDK local API alternative and static-path override', () => {
  const result = configResult({ NODE_ENV: 'production', SITECORE_API_HOST: 'https://synthetic-cm.invalid',
    SITECORE_API_KEY: 'synthetic-local-key', GENERATE_STATIC_PATHS: 'false' });
  assert.equal(result.ok, true);
  assert.equal(result.context, '');
  assert.equal(result.localHost, 'https://synthetic-cm.invalid');
  assert.equal(result.staticPaths, false);
});
