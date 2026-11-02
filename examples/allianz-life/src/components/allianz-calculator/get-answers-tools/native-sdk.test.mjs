import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const { Default, RetirementIncome, TaxDeferral } = loadSource(path.join(sourceRoot, 'components/allianz-calculator/AllianzCalculator.tsx'));
const field = (value, name, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(`source-tool-${name}`, type) } });
const data = key => ({
  heading: field('Authored tool heading', 'heading', 'Single-Line Text'),
  body: field('<p>Authored tool explanation.</p>', 'body'),
  disclaimer: field('<p>Authored tool disclosure.</p>', 'disclaimer'),
  schemaKey: { jsonValue: { value: key } },
});

test('only exact authored source keys select the corresponding native tool', () => {
  const retirement = render(Default, data('retirement-income-source'));
  const tax = render(Default, data('tax-deferral-source'));
  assert.match(retirement, /data-tool="retirement-income"/);
  assert.doesNotMatch(retirement, /name="marginalTaxRate"/);
  assert.match(tax, /data-tool="tax-deferral"/);
  assert.equal((tax.match(/type="radio"/g) || []).length, 7);
  for (const key of ['', 'retirement-income-source-extra', 'tax-deferral-source-extra']) {
    assert.doesNotMatch(render(Default, data(key)), /data-tool="(?:retirement-income|tax-deferral)"/);
  }
});

for (const Component of [RetirementIncome, TaxDeferral]) {
  test(`${Component.name}: surrounding native ownership survives and fields can be cleared`, () => {
    const source = data('unused'), before = JSON.stringify(source);
    const editing = render(Component, source, true);
    for (const name of ['heading', 'body', 'disclaimer']) assert.ok(editing.includes(`test-source-tool-${name}-field`));
    assert.match(editing, /name="(?:principal|principle)"/);
    assert.match(editing, /type="submit" form="[^"]+-form"/);
    assert.equal(JSON.stringify(source), before);
    const cleared = render(Component, { heading: field('', 'heading'), body: field('', 'body'), disclaimer: field('', 'disclaimer') });
    assert.doesNotMatch(cleared, /Authored tool|Your inputs are ready|Calculator placeholder/);
    assert.match(cleared, /role="rowheader"/);
    assert.match(cleared, /aria-live="polite">-/);
  });
}
