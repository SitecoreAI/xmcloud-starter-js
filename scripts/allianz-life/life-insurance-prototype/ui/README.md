# Private Life Insurance UI prototype

This is private implementation and QA for the distinct Allianz Life Insurance
calculator. It is not registered with Sitecore, attached to a route, published,
deployed, or accepted as a completed migration. It uses the source-isolated engine
in `../engine/` and the synthetic official browser cases in `../reference/`.

Implemented: all 17 source fields, five stages, exact recovered labels/placeholders
and help copy, both partner branches, source defaults, event-driven desired-income
prefill, input masks, free stage-menu navigation, source invalid-summary handling,
three source report tables and local print control. Numeric fields initially stay
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
Its finite routes serve only the built harness, source CSS and whitelisted local
Allianz fonts. CSP blocks connections and frames, so no private input or computed
quantity is sent to CalcXML or another service. The page has no telemetry, storage,
query-value import, fixture buttons or diagnostic panels. Build output stays in
`ui/dist/` and is not source backup content.

## Verification and remaining limits

State/SSR tests exercise initial disabled Continue, invalid Summary, hidden-partner
retention, event-driven prefill/manual override, free menu navigation, every numeric
field's inclusive bounds, and all 18 displayed monetary values from the two official
browser cases. Strict TypeScript and the browser bundle build pass. Path tests check
portable repository discovery and fail without installing missing packages.

The source pie chart, stage icons and external CalcXML video/description integration
are absent. The single active control set is placed under its active menu item on
mobile and beside the menu on desktop; source uses duplicate responsive control
sets. Geometry, tooltip behavior, focus/scroll, resize/input retention and print
still require actual browser acceptance. The focus-on-navigation addition is an
explicit accessibility adaptation; source static inspection established scrolling
but did not establish a focus call.

Exact page-level legal/disclosures remain surrounding authored content, outside
this widget. Native SDK field ownership, Page Builder editing, component-map
registration, production build/regression and full financial boundary/reference
coverage remain unfinished. Neither the UI nor its tests close the migration gate.
