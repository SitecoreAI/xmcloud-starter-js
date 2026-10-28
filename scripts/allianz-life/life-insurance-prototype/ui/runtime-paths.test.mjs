import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { resolveAppRoot, resolveDependenciesRoot } from './runtime-paths.mjs';

const configuredApp = process.env.LIFE_UI_APP_ROOT;
const configuredDeps = process.env.LIFE_UI_DEPS_ROOT;

test('portable discovery finds an enclosing repository app after copying under scripts', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'life-ui-paths-'));
  try {
    const app = path.join(temp, 'repo/examples/allianz-life');
    const moduleDirectory = path.join(temp, 'repo/scripts/allianz-life/life-insurance-prototype/ui');
    await fs.mkdir(app, { recursive: true });
    await fs.mkdir(moduleDirectory, { recursive: true });
    await fs.writeFile(path.join(app, 'package.json'), '{"private":true}\n');
    const file = path.join(moduleDirectory, 'runtime-paths.mjs');
    await fs.copyFile(new URL('./runtime-paths.mjs', import.meta.url), file);
    delete process.env.LIFE_UI_APP_ROOT;
    const copied = await import(pathToFileURL(file));
    assert.equal(await fs.realpath(copied.resolveAppRoot()), await fs.realpath(app));
  } finally {
    if (configuredApp === undefined) delete process.env.LIFE_UI_APP_ROOT;
    else process.env.LIFE_UI_APP_ROOT = configuredApp;
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test('explicit local path overrides reuse installed dependencies without copying them', () => {
  if (configuredApp) assert.equal(resolveAppRoot(), path.resolve(configuredApp));
  if (configuredDeps) assert.equal(resolveDependenciesRoot(), path.resolve(configuredDeps));
});

test('missing dependencies fail clearly instead of installing packages', () => {
  process.env.LIFE_UI_DEPS_ROOT = path.join(os.tmpdir(), 'life-ui-deliberately-missing-dependencies');
  try { assert.throws(resolveDependenciesRoot, /Existing React\/TypeScript dependencies were not found/); }
  finally {
    if (configuredDeps === undefined) delete process.env.LIFE_UI_DEPS_ROOT;
    else process.env.LIFE_UI_DEPS_ROOT = configuredDeps;
  }
});
