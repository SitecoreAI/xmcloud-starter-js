import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

/** Read only these task-specific, nonsecret path overrides; never inspect local env files. */
export function resolveAppRoot() {
  if (process.env.LIFE_UI_APP_ROOT) {
    const configured = path.resolve(process.env.LIFE_UI_APP_ROOT);
    if (fs.existsSync(path.join(configured, 'package.json'))) return configured;
    throw new Error('LIFE_UI_APP_ROOT must identify the existing Allianz app directory.');
  }
  for (let candidate = directory; ; candidate = path.dirname(candidate)) {
    const app = path.join(candidate, 'examples/allianz-life');
    if (fs.existsSync(path.join(app, 'package.json'))) return app;
    const parent = path.dirname(candidate);
    if (candidate === parent) break;
  }
  throw new Error('No enclosing repository app found. Set LIFE_UI_APP_ROOT to examples/allianz-life.');
}

export function resolveDependenciesRoot() {
  const configured = process.env.LIFE_UI_DEPS_ROOT && path.resolve(process.env.LIFE_UI_DEPS_ROOT);
  const candidate = configured || path.join(resolveAppRoot(), 'node_modules');
  if (fs.existsSync(path.join(candidate, 'react/package.json')) && fs.existsSync(path.join(candidate, 'typescript/package.json')))
    return candidate;
  throw new Error('Existing React/TypeScript dependencies were not found. Set LIFE_UI_DEPS_ROOT; this prototype installs nothing.');
}
