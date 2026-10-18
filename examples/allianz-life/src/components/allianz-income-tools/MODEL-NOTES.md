# Fictional sample model

This module supplies deterministic sample math for a local demonstration. It is **not an actual product formula, current rate, forecast, offer, recommendation or financial advice**. Strategy names and term labels identify the requested seven-row subset. Every numeric default is fictional, editable and unrelated to an issued contract. Index Dual Precision is deliberately excluded.

## API and units

`STRATEGIES` contains seven immutable entries with `id`, `name`, `termYears`, `rule` and sample `assumptions`. Each assumptions object is also frozen; the UI should copy it before editing. `filterSampleRates(strategyId, termYears)` returns a new filtered array in catalogue order, retaining the immutable entries.

`CalculationInput` requires `strategyId`, `amount`, `indexReturnPct`, `allocationPct` and all five numeric assumptions: `capPct`, `bufferPct`, `floorPct`, `triggerPct`, `participationPct`. Percentages use percentage points: `10` means 10%, not 0.10. The return is for the **entire displayed term**. A three- or six-year label never annualizes or compounds it.

`validateCalculation` returns flat control keys: `strategyId`, `amount`, `indexReturnPct`, `allocationPct`, and each assumptions key. All assumptions are validated even when a particular rule does not use them. `calculateIllustration` throws `RangeError` when validation fails; it does not silently clamp invalid inputs or substitute defaults.

## Simplified sample rules

- At exactly zero index return, sample credit is zero for every rule. A trigger does not apply.
- For a positive return, cap-based rules use `min(indexReturnPct × participationPct / 100, capPct)`.
- For a positive return, trigger-based rules use the fixed `triggerPct`; they do not multiply it by the index return or participation.
- For a negative return, buffer rules use `max(min(indexReturnPct + bufferPct, 0), -100)`.
- For a negative return, the floor rule uses `max(indexReturnPct, floorPct)`.
- For a negative return, protected rules use zero sample credit.

Participation applies only on the positive cap branch. These short rules are intentionally simplified sample rules, not representations of contract terms.

`allocatedAmount = amount × allocationPct / 100`. The remainder is unchanged cash. `illustratedValue` applies sample credit only to the allocated amount. `indexComparisonValue` applies the entered index return to that same allocated amount and keeps the same cash remainder. `gainLoss = illustratedValue - amount`.

The module performs no currency rounding. Presentation may format values independently. `ruleDescription` labels the math as sample/total-term and displays participation as a multiplier (`100%` participation becomes `× 1`). Percentages inside that explanation alone are rounded to at most six decimal places, and its participation multiplier to at most eight, for readability.

## Validation bounds

| Input | Inclusive range |
| --- | --- |
| Amount | 0 through 10,000,000 |
| Total-term index return | -100% through 1,000% |
| Allocation | 0% through 100% |
| Cap, buffer, trigger | 0% through 100% |
| Floor | -100% through 0% |
| Participation | 0% through 300% |

Only finite numbers are valid; strings, missing values, `NaN` and infinities fail. Zero amount is valid. Unknown strategy IDs fail, including object-prototype property names.

## Deliberate omissions and verification

No fees, taxes, withdrawals, timing adjustments, dividends, contract conditions, actual rates, current market data, compounding or additional product features are modeled. No network, CMS, browser, environment, random-number or clock dependency exists in the model. No financial source copy is rewritten by this module.

The focused Node tests transpile this one TypeScript module using the already installed TypeScript dependency. They do not load Next.js, React, Sitecore, credentials, environment files or remote data. Tests use manual arithmetic examples for every rule, allocation/cash symmetry, inclusive bounds, rejected values, zero cases, total-term behavior, deterministic reuse, immutable inputs and seven-row filtering.
