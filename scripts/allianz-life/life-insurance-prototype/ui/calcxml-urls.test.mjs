import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCalcXmlUrls } from './calcxml-urls.mjs';

test('both source endpoints preserve six raw quantities and exact parameter order', () => {
  const input = Object.freeze({ immediateNeeds: 285000, longTermNeeds: 2043789.580734562,
    totalNeeds: 2328789.580734562, shortfall: -94486.850412345,
    totalResources: 2234302.730322217, additionalLifeInsuranceNeeded: 94486.850412345 });
  const suffix = '?immediateNeeds=285000&longtermNeeds=2043789.580734562&totalNeeds=2328789.580734562'
    + '&shortfall=-94486.850412345&totalResources=2234302.730322217&lifeInsuranceNeeded=94486.850412345';
  assert.deepEqual(buildCalcXmlUrls(input), {
    video: 'https://www.calcxml.com/ins01.htm' + suffix,
    description: 'https://www.calcxml.com/ins01t.htm' + suffix,
  });
});

test('source string coercion stays separate from currency rounding, clamping and URL encoding', () => {
  const result = buildCalcXmlUrls({ immediateNeeds: 0.1 + 0.2, longTermNeeds: 1e21,
    totalNeeds: -0, shortfall: -12.345, totalResources: 1000, additionalLifeInsuranceNeeded: 0 });
  assert.equal(result.video, 'https://www.calcxml.com/ins01.htm?immediateNeeds=0.30000000000000004'
    + '&longtermNeeds=1e+21&totalNeeds=0&shortfall=-12.345&totalResources=1000&lifeInsuranceNeeded=0');
  assert.ok(!result.video.includes('%2B'));
  assert.ok(!result.video.includes('$'));
});
