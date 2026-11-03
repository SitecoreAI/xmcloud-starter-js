const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const references = require('./source-reference.fixture.json');
const { loadReference, SOURCE_HASH } = require('./source-reference.test-helper.cjs');
const { snapshot } = require('./source-snapshot.test-helper.cjs');
const plain = (value) => JSON.parse(JSON.stringify(value));
let reference, store;
const expected = (name) => references.cases.find((item) => item.name === name).state;
const term = (guid) => store.indexTermStore.activeIndexTerms.find((item) => item.guid === guid);
before(async () => { reference = await loadReference(); store = reference.store; });
beforeEach(async () => { await store.initialize(); });
after(() => reference.close());

test('pinned source and both workbooks initialize with no DOM mounting or external transport', () => {
  assert.equal(reference.metadata.sourceSha256, SOURCE_HASH);
  assert.deepEqual(reference.metadata.financialModelSourceHashes, references.model.financialModelSourceHashes);
  assert.deepEqual([...new Set(reference.requests.map((item) => item.path))], references.workbookReads.uniquePaths);
  assert.equal(store.uiStore.loading, false);
  assert.equal(store.versionStore.active.guid, 'index-advantage-plus-m24');
});

test('all three term selections replay their positive, zero and negative frozen source results', async () => {
  for (const catalog of references.catalog) for (const value of [-20, 0, 10]) {
    await store.initialize();
    store.indexTermStore.selectIndexTerm(term(catalog.term.guid).indexTermId);
    store.externalIndexReturnStore.activeExternalIndexReturn.value = value;
    assert.deepEqual(plain(store.calculatorStore.calculationsForExternalIndexReturn), expected(`${catalog.term.guid}:return:${value}`).outputs);
  }
});

test('alternate index selection replays actual source results in every term', async () => {
  for (const catalog of references.catalog) {
    await store.initialize();
    store.indexTermStore.selectIndexTerm(term(catalog.term.guid).indexTermId);
    const index = store.indexAllocationStore.activeIndexAllocations.at(-1);
    store.indexAllocationStore.selectIndexAllocation(index.indexAllocationId);
    store.externalIndexReturnStore.activeExternalIndexReturn.value = 10;
    assert.deepEqual(snapshot(store), expected(`${catalog.term.guid}:index:${index.guid}`));
  }
});

test('source allocation balancing reaches each selected 100-percent strategy without replacement formulas', async () => {
  for (const catalog of references.catalog) {
    await store.initialize();
    store.indexTermStore.selectIndexTerm(term(catalog.term.guid).indexTermId);
    const strategy = store.strategyStore.activeStrategies.at(-1);
    store.strategyStore.balanceActiveStrategies({ strategyId: strategy.strategyId, value: 100, locked: false });
    store.externalIndexReturnStore.activeExternalIndexReturn.value = 10;
    assert.deepEqual(snapshot(store), expected(`${catalog.term.guid}:allocation:${strategy.guid}`));
  }
});

test('locked allocation preserves original source rounding and balancing behavior', () => {
  const [first, second] = store.strategyStore.activeStrategies;
  first.lock();
  store.strategyStore.balanceActiveStrategies({ strategyId: second.strategyId, value: 50, locked: false });
  assert.deepEqual(snapshot(store), expected('allocation:locked-first-second-50'));
});

test('comparison inputs and visibility toggle preserve source calculations', () => {
  store.hypotheticalEquityReturnStore.activeHypotheticalEquityReturn.value = 6;
  store.hypotheticalBondReturnStore.activeHypotheticalBondReturn.value = 3;
  assert.deepEqual(snapshot(store), expected('comparison:equity6-bond3'));
  store.portfolioComparisonStore.activePortfolioComparison.deselect();
  assert.deepEqual(snapshot(store), expected('comparison:hidden-same-inputs'));
});

test('repeated return edits change output and restore the exact preceding result', () => {
  store.externalIndexReturnStore.activeExternalIndexReturn.value = 10;
  assert.deepEqual(snapshot(store), references.repeat.before);
  store.externalIndexReturnStore.activeExternalIndexReturn.value = -20;
  assert.deepEqual(snapshot(store), references.repeat.changed);
  assert.notDeepEqual(references.repeat.before.outputs, references.repeat.changed.outputs);
  store.externalIndexReturnStore.activeExternalIndexReturn.value = 10;
  assert.deepEqual(snapshot(store), references.repeat.restored);
});

test('range-chart data exactly replays the unchanged 101-point source curve', () => {
  store.externalIndexReturnStore.activeExternalIndexReturn.value = 10;
  assert.deepEqual(plain(store.calculatorStore.calculationsForExternalIndexReturns), references.curve);
});
