import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { loadSource, sourceRoot, render, metadata } from '../../executive-biography/__tests__/sdk-test-helper.mjs';

const { Default, RilaStrategyPlus } = loadSource(path.join(sourceRoot, 'components/allianz-calculator/AllianzCalculator.tsx'));
const { rilaStrategyPreset } = loadSource(path.join(sourceRoot, 'components/allianz-calculator/source-tool-frame/rila-strategy-presets.props.ts'));
const { sourceFrameLink } = loadSource(path.join(sourceRoot, 'components/allianz-calculator/source-tool-frame/source-tool-frame.ts'));
const sourcePage = '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/calculator';
const field = (value, name, type = 'Rich Text') => ({ jsonValue: { value, metadata: metadata(`strategy-source-${name}`, type) } });
const data = (key) => ({
  heading: field('Authored strategy heading', 'heading', 'Single-Line Text'),
  body: field('<p>Authored introduction <a href="https://www.allianzlife.com/about" target="_blank">About</a></p>', 'body'),
  disclaimer: field('<p>Authored strategy disclosure.</p>', 'disclaimer'),
  schemaKey: { jsonValue: { value: key } },
  iframeUrl: { jsonValue: { value: 'https://unregistered.example/frame' } },
});

test('only the exact strategy key selects one fixed code-owned source preset', () => {
  assert.equal(rilaStrategyPreset('rila-strategy-plus-source'), 'strategy-plus');
  assert.match(render(Default, data('rila-strategy-plus-source')), /src="\/allianz-assets\/rila-strategy\/index-advantage-plus\.html"/);
  for (const key of [undefined, '', 'strategy-plus', 'rila-strategy-plus-source-extra', 'rila-income-plus-source',
    'https://unregistered.example/frame', '/allianz-assets/rila-strategy/index-advantage-plus.html']) {
    assert.equal(rilaStrategyPreset(key), null);
    assert.doesNotMatch(render(Default, data(key)), /allianz-assets\/rila-strategy\//);
  }
});

test('native strategy fields retain edit ownership and clear without borrowing fallback copy', () => {
  const input = data('rila-strategy-plus-source'), before = JSON.stringify(input);
  const editing = render(RilaStrategyPlus, input, true, { RenderingIdentifier: 'native-strategy' });
  for (const name of ['heading', 'body', 'disclaimer']) assert.ok(editing.includes(`test-strategy-source-${name}-field`));
  assert.match(editing, /id="native-strategy"/);
  assert.match(editing, /https:\/\/www\.allianzlife\.com\/about/);
  assert.doesNotMatch(editing, /unregistered\.example/);
  const visitor = render(RilaStrategyPlus, input);
  assert.match(visitor, /href="\/about" target=""/);
  assert.doesNotMatch(visitor, /href="https:\/\/www\.allianzlife\.com/);
  assert.equal(JSON.stringify(input), before);
  const cleared = render(RilaStrategyPlus, { heading: field('', 'heading'), body: field('', 'body'), disclaimer: field('', 'disclaimer') });
  assert.doesNotMatch(cleared, /Authored strategy|Authored introduction/);
  assert.match(cleared, /title="Allianz Index Advantage\+ strategy calculator"/);
  assert.doesNotMatch(cleared, /<form|Your inputs are ready|A result is not available/);
});

test('the shared adapter retains only local routes or #, while source fragments remain in-frame', () => {
  const incomeRoute = '/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus-income/income-calculator';
  // The retained policy has not released the new Income destination yet.
  assert.deepEqual(sourceFrameLink('https://www.allianzlife.com' + incomeRoute, '_blank', sourcePage), { href: '#', target: '', rel: '' });
  assert.deepEqual(sourceFrameLink('https://www.allianzlife.com/about', '_blank', sourcePage), { href: '/about', target: '_top', rel: '' });
  assert.deepEqual(sourceFrameLink('https://www.allianzlife.com/what-we-offer/annuities/index-variable-annuities/index-advantage-income/income-calculator-for-index-advantage-income', '_blank', sourcePage), { href: '#', target: '', rel: '' });
  assert.deepEqual(sourceFrameLink('#rates', '_top', sourcePage), { href: '#rates', target: '', rel: '' });
  assert.equal(sourceFrameLink('javascript:alert(1)', '', sourcePage).href, '#service-unavailable');
});
