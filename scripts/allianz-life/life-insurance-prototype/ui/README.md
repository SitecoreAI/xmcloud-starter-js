# Life Insurance core runtime QA harness

This private harness tests the distinct Allianz Life Insurance core runtime now
located in `examples/allianz-life/src/lib/life-insurance`. The existing native
Calculator component selects it only for `life-insurance-source-core`. Saved CMS
placement, Page Builder editing, publication and live acceptance remain separate.
The source reference is retained here, with synthetic official cases in `../reference/`.

Implemented: all 17 source fields, five stages, exact recovered labels/placeholders
and help copy, both partner branches, source defaults, event-driven desired-income
prefill, input masks, free stage-menu navigation, source invalid-summary handling,
three source report tables, five inline stage icons, the raw-series pie candidate
and a Summary-only print document. Numeric fields initially stay
undefined; placeholder text is never substituted for data. Hidden partner values
remain stored when No is selected. The source has no Back or Reset app button, so
none was added. Financial logic stays in the source engine; this UI adds no formula.

The Summary uses the source computed-value guard, independently of strict schema
validity. Currency/percent **input** display uses the source Intl masks; **report**
display uses the separately recovered numeral 2.0.6 formatter. Source min/max
messages and unusual rounding are preserved by the engine adapter. Full Yup cast
message equivalence remains a separately documented engine limitation.

## Run with existing dependencies

When copied under `scripts/allianz-life/life-insurance-prototype`, these commands
discover the nearest repository's `examples/allianz-life` directory and its existing
`node_modules` by default. No dependency installation or environment-file read occurs.

From the prototype directory:

```sh
node ui/typecheck.mjs
node --test ui/*.test.mjs
node ui/build.mjs
node ui/serve.mjs
```

The current external private workspace can instead point at an existing app and
dependency directory using only these nonsecret path overrides:

```sh
export LIFE_UI_APP_ROOT=/path/to/repository/examples/allianz-life
export LIFE_UI_DEPS_ROOT=/path/to/existing/node_modules
node ui/typecheck.mjs
node --test ui/*.test.mjs
node ui/build.mjs
node ui/serve.mjs
```

The server binds `localhost:4196`; `LIFE_UI_PORT` can choose another local port.
Its finite routes serve only the built harness, the application's actual source CSS and whitelisted local
Allianz fonts. CSP blocks connections and external frames, permitting a same-origin
print document only, so no private input or computed
quantity is sent to CalcXML or another service. The page has no telemetry, storage,
query-value import, fixture buttons or diagnostic panels. Build output stays in
`ui/dist/` and is not source backup content.

## Verification and remaining limits

State/SSR tests exercise initial disabled Continue, invalid Summary, hidden-partner
retention, event-driven prefill/manual override, free menu navigation, every numeric
field's inclusive bounds, and all 18 displayed monetary values from the two official
browser cases. Strict TypeScript and the browser bundle build pass. Path tests check
portable repository discovery and fail without installing missing packages.

The pie preserves source series/colors/formatting, source-library invalid/zero-point
rules, legend visibility toggles and modifier-key selection. It uses native SVG;
fixed chart height, measured physical geometry and pointer/focus tooltip now follow
the recovered Highcharts defaults. Rounded paths, exact tooltip/legend pixels and
broader live edge references remain unaccepted. Icons retain source paths, wrapper and labels;
instance IDs are unique rather than repeating across responsive control sets.

The print helper clones only the valid report intro, amounts, chart and three tables,
excluding menu, outer Summary heading, action and surrounding legal content. It
copies local stylesheets and waits for styles/fonts. Cleanup, error handling and
trigger-focus restoration are explicit improvements over source defaults. Native
Edge rendered a two-page preview without clipping and cancellation restored the
enabled print control. This is not yet source-versus-candidate PDF acceptance.

The current Report and sidebar Actions markup are pinned against exact source
render functions for the recorded cases. The layout now uses the source natural
flex structure, title-before-icon menu order, h3 headings, live source-engine
sidebar values and source error classes. A single control set moves at the source
704px breakpoint; values and a focused input are retained. The e4 private harness
now matches all 18 recorded amounts at desktop/mobile, preserves a focused input
across resize, and restores results after repeated edits. Chart selection and
legend controls pass. Two desktop and one 370px native Edge print/cancel cycles
showed the chart and all three tables across two pages, then restored an enabled,
focused print button. Native integration and its scoped CSS require separate QA.

Seventeen print lifecycle tests cover loading, timeout/error, duplicate activation,
cancellation, cleanup and reentrant focus. They reproduced and closed two bugs:
failed iframe insertion left a stale job, and focus-triggered cancellation could
still invoke print. React unmount integration and broader browser behavior remain
separate acceptance checks.

`calcxml-urls.mjs` preserves both exact source endpoints and all six raw unrounded
parameters. Calling the builder sends nothing. External video/description rendering
remains absent and blocked in this harness.

The single active control set is placed under its active menu item on
mobile and beside the menu on desktop; source uses duplicate responsive control
sets. Mobile 370px A/B1 retained all 18 official amounts and 4/3 sectors with no
horizontal overflow. Complete geometry, source tooltip appearance and mobile print
still require acceptance. The focus-on-navigation addition is an
explicit accessibility adaptation; source static inspection established scrolling
but did not establish a focus call.

Exact page-level legal/disclosures remain surrounding authored content, outside
this widget. Native SDK selection and editable/cleared surrounding fields pass
installed-SDK tests; type checking, lint, production webpack build and app
regression pass. Actual CMS placement, Page Builder editing, live delivery and full
financial boundary/reference coverage remain unfinished. These checks do not close
the complete calculator migration gate.
