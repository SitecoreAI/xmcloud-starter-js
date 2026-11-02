# Get Answers source calculator adapters

The retirement-income and tax-deferral routes were already in the original
migration inventory. Their recovered public scripts calculate locally. These
modules retain only the exact source financial functions, source schemas and
dependency-closed Validate.js 0.12.0 / Numeral.js 2.0.6 factories. They do not
import the full source application or introduce a network client, storage,
credentials, a calculation endpoint or a new package dependency.

`source-provenance.json` identifies the official public assets and exact UTF-8
byte fences. `source-library-provenance.json` pins both recovered library
factories against both official bundles. The engine and schema tests provide
source differential/provenance evidence, not independent financial truth or
observed live-source output cases.

The native wrapper owns surrounding Sitecore heading/body/disclaimer fields.
The fixed source form controls are code-owned. The existing SDK catch-all owns
the routes; these helpers do not register bespoke routes or replace CMS data.

## Preserve the source behavior

- Retirement forwards raw numeric strings into its exact function. In
  particular, zero interest retains source `NaN`; no familiar alternate formula
  is substituted. Its validation retains the source length checks and copy.
- Tax applies `parseFloat` to all four fields before its exact functions. Its
  principal field intentionally has source presence-only validation. Fractional
  years retain the source whole-loop behavior.
- Retirement edits and blur hide the result; unsuccessful Compute also hides
  it. Tax edits/blur do not clear visibility, and an already visible result is a
  getter of the current values. Unsuccessful Compute does not hide it.
- Blur validation replaces only the touched field's error. Compute validates
  all fields.
- Retirement currency/percent input masking is separate from report currency
  formatting. Input focus exposes the stored raw string; report output uses
  source Numeral rounding.
- The adapter rejects positive iteration counts above 1,000,000 through a
  distinct error. This is an execution budget, not a source financial bound or
  alternate calculation. The UI must show no fabricated result on rejection.

Run the focused offline contracts from the repository root:

```sh
node --test examples/allianz-life/src/components/allianz-calculator/get-answers-tools/*.test.mjs
```

## Remaining RMD gate

The third original tool computes locally using a public static XLSX of life
expectancy tables. It is not implemented here. Its current editorial age table,
72/73 engine branch and 70.5 chart accessibility copy are inconsistent. The
table asset, input defaults and source observation are recorded in provenance.
Do not invent or silently update financial policy. Classify the exact behavior
and resolve the release gate before accepting that tool.

An unchanged source UI may be bootstrapped on loopback for reference display
checks. A private test harness must prohibit connections, frame loads and form
actions; a connection fence alone does not prevent native form navigation.
This is local QA guidance, not a production security-setting change. Source
CSS/fonts and full native/public acceptance remain separate verification.
