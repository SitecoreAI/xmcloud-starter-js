# Life Insurance calculator — private implementation prototype

This backs up source-faithful implementation work for the distinct
[Life Insurance calculator](https://www.allianzlife.com/what-we-offer/Life-Insurance/Calculator).
It is outside the application source tree and has no Sitecore component-map,
route, content, deployment or publication integration. It does not change the
public calculator or complete its migration.

The prototype includes a dependency-closed source calculation adapter with
provenance, source-equivalence tests, the 17-field/five-stage React UI, and a
localhost-only QA harness. Numeric references use fixed fictional inputs from
two observed official browser scenarios. No user financial information,
credentials, environment files or CMS-derived inventories are included.

From this directory, with the existing Allianz application dependencies installed:

```sh
node --test engine/life-insurance-engine.test.mjs engine/formatting/formatting.test.cjs
node --test ui/*.test.mjs
node ui/typecheck.mjs
node ui/build.mjs
node ui/serve.mjs
```

The UI scripts discover the enclosing repository's `examples/allianz-life`
directory. `LIFE_UI_APP_ROOT` and `LIFE_UI_DEPS_ROOT` can point to an existing app
and installed dependencies; these are nonsecret paths. The scripts install
nothing and do not read local environment files. Generated `ui/dist/` files are
ignored. See the engine and UI READMEs for source contracts and remaining limits.

The two recorded cases establish 18 displayed monetary comparisons. They do not
cover the full financial boundary space. Fresh no-partner inputs without retained
partner values remain an unverified official-browser case. Inline source icons,
the raw-series pie candidate and Summary-only printing are now implemented.
Native Edge report preview/cancellation and 370px A/B1 amounts were checked.
Highcharts pixel/tooltip parity, CalcXML video/text behavior, complete responsive
coverage, native SDK field ownership/editor acceptance and production regression remain open.
No financial formula, rate or placeholder output has been invented to close them.

The local harness sends no calculations or inputs to external services; its CSP
blocks connections and external frames, allowing only a local print document.
The tested CalcXML URL builder does not load its returned URLs. Shipping requires completing the
remaining source, functional, responsive, editor and financial equivalence QA.
