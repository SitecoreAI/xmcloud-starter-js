import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveDependenciesRoot } from './runtime-paths.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const deps = resolveDependenciesRoot();
const require = createRequire(path.join(deps, 'package.json'));
const ts = require('typescript');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8'));
const config = ts.parseJsonConfigFileContent(raw, ts.sys, root);
const options = { ...config.options, baseUrl: root, typeRoots: [path.join(deps, '@types')], paths: {
  react: [path.join(deps, '@types/react')], 'react/*': [path.join(deps, '@types/react/*')],
  'react-dom/*': [path.join(deps, '@types/react-dom/*')],
} };
const program = ts.createProgram(config.fileNames, options);
const errors = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else console.log('Private UI strict TypeScript: PASS');
