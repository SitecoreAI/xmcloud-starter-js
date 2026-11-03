# Source-backed Plus Strategy calculator

This package adds only the Index Advantage+ Strategy preset. The original source JS, CSS and both public workbook payloads are byte-pinned in `source-assets.json`; no financial formula or workbook parser is replaced. The other five Strategy product/state presets are not implemented by this key.

## Native binding plan

Use the existing Sitecore Calculator template and rendering on the standard SDK catch-all route:

`/what-we-offer/annuities/registered-index-linked-annuities/index-advantage-plus/calculator`

Freshly verify the actual page, Data folder, language/version, rendering definition and existing placements before editing. Create a Calculator datasource with `schemaKey` exactly `rila-strategy-plus-source`, select the normal `Default` export or the `RilaStrategyPlus` variant, and add it between the existing introduction and disclosures. Preserve the hero, breadcrumbs, source copy and all existing placements. Heading/body/disclaimer remain optional native fields with normal edit/clear behavior; authored fields cannot choose a frame URL. No CMS item, binding, publication or deployment was performed while preparing this package.

## Runtime and links

The fixed same-origin frame starts inert. The existing SourceToolFrame adapter installs navigation containment and resize observers before activating the original source controls. Only the two exact workbook static paths bypass the page proxy; neighboring resources and ordinary CMS routes retain normal proxy behavior.

Source navigation to available, verified demo routes uses local paths. Unavailable Allianz destinations remain literal `#`; malformed/unapproved destinations retain the existing rejection rules. Source workbook/image requests and internal fragment controls are not rewritten as page links. Existing Income destinations remain gated by their current release policy; this package does not expand that policy.

The Strategy UI updates results as controls change; it has no Calculate button. Preserve source term/index options, allocation balancing/locks, comparison controls, Credit Result/Rates tabs, charts/tables and mobile Results drawer. Repeated `id="principle"` values exist in the original source; browser QA should use unique observed data-test/label scopes instead.

## Offline verification

From `examples/allianz-life`:

```sh
node --test src/components/allianz-calculator/rila-strategy-source/source-assets.test.mjs src/components/allianz-calculator/rila-strategy-source/source-reference.test.cjs src/components/allianz-calculator/source-tool-frame/strategy-native-sdk.test.mjs src/components/allianz-calculator/source-tool-frame/source-tool-frame.test.mjs src/lib/static-asset-routing.test.mjs
```

The original-source reference helper omits DOM mounting and replaces only the two fixed workbook GETs with exact local bytes. It exposes no financial-input transport or credential/environment access. The synthetic fixture records 50 source cases, a 101-point curve and repeated-input restoration. Its identifiers are public source-workbook configuration identifiers, not CMS inventories. Replay tests preserve source rounding quirks; they are source-differential checks, not independent financial certification or browser/native acceptance. Test helpers are not application imports or debug endpoints.

## Browser/native QA still required

Use the real parent/native SDK route and exact candidate revision. Establish that both workbook responses deliver the pinned bytes and appropriate XLSX MIME type, the frame is non-inert, and actual input changes recalculate source output. Verify term/index changes, strategy and portfolio allocation balancing/locks, comparison toggles, range data/chart/table switching, tooltips, keyboard and repeated edits at desktop and measured 370px. Compare displayed formatting with source UI rather than inferring it from raw reference fractions. Check parent resizing and page/table containment, native field save/readback/restoration, and print behavior only through supported controls. Publication/code release/live QA remain separate gates.

The frame uses the unchanged Strategy stylesheet after the existing pinned base CSS. All 48 Strategy CSS resources are inline SVG; its base CSS reuses the 18 existing pinned Allianz font files. No production image fallback, new image import, permission, credential or CSP change is part of this package.
