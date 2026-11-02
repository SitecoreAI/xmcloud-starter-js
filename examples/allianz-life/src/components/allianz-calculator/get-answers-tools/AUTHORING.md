# Source-backed Get Answers tools

Use the existing native AllianzCalculator rendering with its native Calculator datasource. Select the `RetirementIncome` or `TaxDeferral` rendering variant. The Default rendering also recognizes the authored `schemaKey` values `retirement-income-source` and `tax-deferral-source`.

These are shared native components. They do not add routes, use page-path fallbacks or inject widgets into Rich Text. The existing SDK catch-all continues to resolve the pages.

Heading, Body and Disclaimer stay authored SDK fields. The input labels, source validation and arithmetic are code-owned parts of the verified original tool. Authors should preserve the page's original title, explanatory copy, footnotes and disclosures and remove an old placeholder only after a verified native binding. Historical fixture/page IDs must be reverified against the current CMS before editing.

Financial arithmetic and formatting come from hash-fenced official public source modules. No external calculation request is made. Source quirks, including raw-string coercion and zero-interest/fractional-period behavior, are retained rather than replaced with familiar formulas. The explicit execution-budget guard declines excessive work and returns no invented result.

The RMD calculator is not implemented or enabled by this package. Its source date logic/table dependency and the recorded source text/age inconsistencies require separate source-parity QA.

Before publication: verify current native owners and surrounding text, make the supported datasource/variant binding, test field edit/save/restoration and native Preview, then perform exact-commit hosted and live desktop/mobile and input/error/result checks. Local widget QA and a build alone do not establish native integration or whole-page acceptance. Keep card links contained until the local tools are genuinely functional.
