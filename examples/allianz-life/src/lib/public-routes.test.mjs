import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const filename = fileURLToPath(new URL('./public-routes.ts', import.meta.url));
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL('.', import.meta.url)));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { canonicalPath, publicRouteAliases } = compiled.exports;
const routes = {
  '/': { aliases: ['https://www.allianzlife.com/'] },
  '/resources': { aliases: ['https://www.allianzlife.com/Resources/', 'https://www.allianzlife.com/resources/legacy-article', 'https://malicious.invalid/resources'] },
  '/canonical': { aliases: ['https://www.allianzlife.com/other'] },
  '/other': {},
};
const aliases = publicRouteAliases(routes);
assert.equal(canonicalPath('/Resources/'), '/resources');
assert.equal(canonicalPath('/name%24value'), '/name$value');
assert.equal(canonicalPath('https://malicious.invalid/'), null);
assert.equal(aliases.get('/resources/legacy-article'), '/resources');
assert.equal(aliases.has('/resources'), false);
assert.equal(aliases.has('/other'), false);
assert.equal(aliases.has('/'), false);
console.log('7 recorded-public-alias assertions passed. No missing source content is invented.');
