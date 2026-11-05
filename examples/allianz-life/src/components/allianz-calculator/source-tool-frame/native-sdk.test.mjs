import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const { Default, RilaIncomeADV, RilaIncomePlus, RilaIncomeSelect } = loadSource(path.join(sourceRoot,
  'components/allianz-calculator/AllianzCalculator.tsx'));
const { rilaIncomePreset } = loadSource(path.join(sourceRoot,
  'components/allianz-calculator/source-tool-frame/rila-income-presets.ts'));
const field = (value, name, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(`rila-source-${name}`, type) } });
const data = (key) => ({
  heading: field('Authored income tool heading', 'heading', 'Single-Line Text'),
  body: field('<p>Authored introduction <a href="https://www.allianzlife.com/about" target="_blank">About</a></p>', 'body'),
  disclaimer: field('<p>Authored source disclosure.</p>', 'disclaimer'),
  schemaKey: { jsonValue: { value: key } },
  iframeUrl: { jsonValue: { value: 'https://not-a-configurable-frame.test/' } },
});
const cases = [
  ['rila-income-adv-source', 'income-adv', 'income-adv.html', RilaIncomeADV],
  ['rila-income-plus-source', 'income-plus', 'plus-income.html', RilaIncomePlus],
  ['rila-income-select-source', 'income-select', 'plus-select-income.html', RilaIncomeSelect],
];

test('only three exact native keys select fixed source presets; URLs and suffix variants cannot select frames', () => {
  for (const [key, preset, file] of cases) {
    assert.equal(rilaIncomePreset(key), preset);
    assert.match(render(Default, data(key)), new RegExp(`src="/allianz-assets/rila-income/${file}"`));
  }
  for (const value of [undefined, '', 'income-adv', 'rila-income-adv-source-extra',
    'https://not-a-frame.test/', '/allianz-assets/rila-income/income-adv.html']) {
    assert.equal(rilaIncomePreset(value), null);
    assert.doesNotMatch(render(Default, data(value)), /allianz-assets\/rila-income\//);
  }
});

for (const [key, , file, Component] of cases) {
  test(`${Component.name}: native surrounding fields stay owned, editable, clearable and source-link contained`, () => {
    const input = data(key), before = JSON.stringify(input);
    const editing = render(Component, input, true);
    for (const name of ['heading', 'body', 'disclaimer']) assert.ok(editing.includes(`test-rila-source-${name}-field`));
    assert.match(editing, /https:\/\/www\.allianzlife\.com\/about/);
    assert.match(editing, new RegExp(`src="/allianz-assets/rila-income/${file}"`));
    assert.doesNotMatch(editing, /not-a-configurable-frame/);
    const visitor = render(Component, input);
    assert.match(visitor, /href="\/about" target=""/);
    assert.doesNotMatch(visitor, /href="https:\/\/www\.allianzlife\.com/);
    assert.equal(JSON.stringify(input), before);
    const cleared = render(Component, { heading: field('', 'heading'), body: field('', 'body'), disclaimer: field('', 'disclaimer') });
    assert.doesNotMatch(cleared, /Authored income tool|Authored introduction|Authored source disclosure/);
    assert.match(cleared, /<iframe[^>]+title="Allianz Index Advantage/);
    assert.doesNotMatch(cleared, /Your inputs are ready|A result is not available|<form/);
  });
}
