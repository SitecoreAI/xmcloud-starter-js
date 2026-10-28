import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const app = fileURLToPath(new URL('../../', import.meta.url));
const deps = process.env.LIFE_UI_DEPS_ROOT || path.join(app, 'node_modules');
const require = createRequire(path.join(deps, 'package.json'));
const postcss = require('postcss');
const stylesheet = fileURLToPath(new URL('./life-insurance/life-insurance.css', import.meta.url));
const css = postcss.parse(fs.readFileSync(stylesheet, 'utf8'), { from: stylesheet });
const runtime = postcss.parse(fs.readFileSync(path.join(app, 'public/allianz-assets/source-style.css'), 'utf8'));

test('every native calculator selector stays inside its explicit wrapper, including media and print rules', () => {
  let rules = 0;
  css.walkRules((rule) => {
    rules++;
    for (const selector of rule.selectors) assert.match(selector, /^\.allianz-life-insurance-calculator(?=[\s.:#\[]|$)/,
      `Unscoped calculator selector: ${selector}`);
  });
  assert.ok(rules > 0);
  css.walkAtRules((rule) => assert.equal(rule.name, 'media', 'No stylesheet imports, font faces or other global definitions'));
});

test('adapter leaves source input width100/200,height38 and form primitive spacing intact', () => {
  const declarations = (tree, selector) => {
    const result = {};
    tree.walkRules((rule) => { if (rule.selectors.includes(selector)) rule.walkDecls((decl) => { result[decl.prop] = decl.value; }); });
    return result;
  };
  assert.equal(declarations(runtime, '.a-input.--is-small').width, '100px');
  assert.equal(declarations(runtime, '.a-input.--is-large').width, '200px');
  assert.equal(declarations(runtime, '.a-input').height, '38px');
  css.walkRules((rule) => {
    if (rule.selectors.some((selector) => /(?:^|\s)\.(?:a-input|m-form-group)(?=[\s.:#\[]|$)/.test(selector))) {
      rule.walkDecls((decl) => assert.equal(decl.prop, 'max-width', `Source primitive override: ${rule.selector} ${decl.prop}`));
    }
  });
});

test('print adapters target only the local report context and do not hide site-wide content', () => {
  let printRules = 0;
  css.walkAtRules('media', (media) => {
    if (media.params !== 'print') return;
    media.walkRules((rule) => {
      printRules++;
      for (const selector of rule.selectors) assert.match(selector, /^\.allianz-life-insurance-calculator\.life-print-document(?=[\s.:#\[]|$)/);
    });
  });
  assert.ok(printRules > 0);
});
