import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDependenciesRoot } from './runtime-paths.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const dependencyRoot = resolveDependenciesRoot();
const require = createRequire(path.join(dependencyRoot, 'package.json'));
const esbuild = require('esbuild');
await esbuild.build({ entryPoints: [path.join(root, 'harness.tsx')], bundle: true, format: 'iife', platform: 'browser',
  outfile: path.join(root, 'dist/harness.js'), nodePaths: [dependencyRoot], jsx: 'automatic', sourcemap: true,
  define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'warning' });
await fs.writeFile(path.join(root, 'dist/index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Life Insurance Calculator — Private QA</title><link rel="stylesheet" href="/global-source.css"><link rel="stylesheet" href="/harness.css"></head><body><main id="main"><div id="dx-life-insurance"></div></main><script src="/harness.js"></script></body></html>\n');
console.log('Private UI built; no production files, requests or financial inputs were transmitted.');
