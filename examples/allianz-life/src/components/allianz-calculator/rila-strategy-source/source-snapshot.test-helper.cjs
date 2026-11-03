const plain = (value) => JSON.parse(JSON.stringify(value));
function snapshot(store) {
  return plain({
    term: store.indexTermStore.selectedIndexTerm.guid,
    index: store.indexAllocationStore.selectedIndexAllocation.guid,
    returnInput: store.externalIndexReturnStore.activeExternalIndexReturn.value,
    returnBounds: { min: store.externalIndexReturnStore.activeExternalIndexReturn.min, max: store.externalIndexReturnStore.activeExternalIndexReturn.max },
    comparison: store.portfolioComparisonStore.activePortfolioComparison.selected,
    equityReturn: store.hypotheticalEquityReturnStore.activeHypotheticalEquityReturn.value,
    bondReturn: store.hypotheticalBondReturnStore.activeHypotheticalBondReturn.value,
    strategies: store.strategyStore.activeStrategies.map((item) => ({ guid: item.guid, name: item.name, value: item.value, locked: item.locked })),
    portfolio: store.portfolioAllocationStore.activePortfolioAllocations.map((item) => ({ guid: item.guid, value: item.value })),
    outputs: plain(store.calculatorStore.calculationsForExternalIndexReturn),
  });
}

module.exports={snapshot};
