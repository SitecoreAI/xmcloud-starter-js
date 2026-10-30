import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { require } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const postcss = require('postcss');
const css = postcss.parse(fs.readFileSync(new URL('../AllianzVideo.css', import.meta.url), 'utf8'));
const declarations = selector => {
  const rules = [];
  css.walkRules(selector, rule => rules.push(rule.nodes.filter(node => node.type === 'decl')
    .map(({ prop, value, important }) => [prop, value, Boolean(important)])));
  assert.equal(rules.length, 1, `Expected one ${selector} rule`);
  return rules[0];
};

test('source player sizing crosses the observed Pages field span without changing its geometry contract', () => {
  // Native Pages hydrates open-code/iframe/close-code into open-code/span>iframe/close-code.
  // Keep sizing on the existing player class at either depth; do not style editor chrome.
  assert.deepEqual(declarations('.allianz-source-static-video .allianz-video-player'), [
    ['display', 'block', false], ['width', '100%', false], ['height', 'auto', false],
    ['aspect-ratio', '16 / 9', false], ['border', '0', false],
  ]);
  assert.deepEqual(declarations('.allianz-source-static-video'), [
    ['width', '100%', false], ['max-width', '640px', false],
  ]);
  css.walkRules(rule => {
    if (!rule.selector.includes('allianz-video-player')) return;
    assert.ok(['.allianz-source-static-video .allianz-video-player',
      '.allianz-local-video .allianz-video-player'].includes(rule.selector),
    `Player sizing escaped its existing component owners: ${rule.selector}`);
  });
});

test('Default video and source placeholder retain their distinct sizing contracts', () => {
  assert.deepEqual(declarations('.allianz-local-video .allianz-video-player'), [
    ['position', 'absolute', false], ['inset', '0', false], ['display', 'block', false],
    ['width', '100%', false], ['height', '100%', false], ['border', '0', false],
  ]);
  assert.deepEqual(declarations('.allianz-source-static-video .allianz-video-placeholder'), [
    ['display', 'block', false], ['width', '100%', false], ['height', 'auto', false],
    ['aspect-ratio', '16 / 9', false],
  ]);
  css.walkRules(rule => {
    assert.doesNotMatch(rule.selector, /(?:^|[\s,])(?:iframe|span|\.scpm)(?:$|[\s,:[.#>+~])/,
      'No generic iframe or native chrome selector may be introduced');
  });
});
