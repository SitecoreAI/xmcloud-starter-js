# Private Life Insurance source engine

This folder is outside Git and is not a released application. No CMS, publication, deployment, service, CalcXML result-video, or credential action is part of it.

`life-insurance-engine.mjs` is the browser-friendly public interface for the private UI. Its financial arithmetic uses only the two exact source classes in `source-engine-exact.mjs`. The separate CJS copy is an extraction/orchestration oracle. Both are selected from the verified official v14 / package 0.7.2 bundle, SHA-256 `75aa6f4d5c0dd662839844b490f99ab1534a24c8330f81b1c5cfd31a9d7371d7`; the full minified bundle was never saved. `source-engine-provenance.json` records exact offsets and hashes for each selected declaration.

The schema has 17 inputs and five stages. The adapter preserves source `parseFloat` numeric normalization, the `yes` default, initially undefined numeric fields, retained hidden partner values, and the exact income-change prefill handler. `updateLifeInsuranceField` (also exported as `updateSourceIncome`) is that source-derived field handler, not an independently invented financial rule. No intermediate projection or sum is rounded.

Use `calculateLifeInsurance(raw)` for `projections`, `summary`, `sourceSummaryValid`, validation diagnostics and warnings. `sourceSummaryValid` is the recovered source Summary guard: a nonempty object whose values are not NaN. It is deliberately independent of both `schemaValid` (all 17 fields) and `valid` (selected/visible-field validation). The source can calculate a no-partner result while hidden partner fields are undefined. That extraction behavior does not substitute for the missing fresh-no-partner official browser case B2.

The numeric min/max limits and their custom error messages follow the extracted schema, including its original spelling and formatter choices. The adapter does not claim to implement every Yup cast/type-error message for arbitrary non-UI inputs. Raw controls must supply canonical numeric text; it does not strip commas/currency symbols or turn blanks into zero. Source zero/fractional-year horizons produce NaN summaries; those outcomes remain invalid and are never replaced with invented amounts. Only unsupported out-of-schema horizons are refused before array allocation.

`formatLifeCurrency` and `formatLifePercent` re-export the original numeral 2.0.6 wrappers isolated under `formatting/`. They preserve source rounding, including asymmetric negative half cases. Formatting NaN as `$0.00` is an original formatter behavior, so the source Summary validity guard must run before rendering output. No guessed `Intl` replacement is used.

Run:

```sh
node --test life-insurance-engine.test.mjs formatting/formatting.test.cjs
```

The suite compares every pipeline stage for 34 synthetic representative/boundary scenarios against the exact extracted original functions. This is a check of extraction and adapter/orchestration behavior, not an independent financial model certification. Independently, the tests read `../reference/official-browser-cases.json`, recorded by root from the official interactive browser, and match all nine displayed monetary outputs in each of cases A and B1. The fresh no-partner B2 and full browser boundary/domain cases remain unrecorded after the denied browser action. They were not retried.

Remaining release evidence includes broader authoritative reference cases, full source UI/validation behavior, source disclosures and CalcXML privacy/result integration, responsive/accessibility/print/native authoring acceptance, and applicable final QA. Private test success does not close these gates.
