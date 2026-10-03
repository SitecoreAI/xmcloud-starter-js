# InvestmentPortfolio

Status: source implementation and source-backed tests. Native template IDs, field IDs, content items, image bindings, component registration, current page composition and live query/browser acceptance remain unverified. This component is not a production source-data fallback.

## Purpose-typed native content

Use one page-local `Data/Portfolio` datasource, template `InvestmentPortfolio`, with `activeHeading` and `exitedHeading` (Single-Line Text). Initial source labels are “Active Investments” and “Exited investments”; both remain editable and intentional blank fields stay blank.

Insert option: `Investment` only. Each child is a content record, without a page template, layout or public route:

- `name`: Company name, Single-Line Text, required
- `investmentStatus`: Investment status, required Droplist; canonical values `Active` and `Exited`. Use a real native options parent containing those two options, resolving its path/IDs before assigning Source. Default new records to Active
- `details`: Company details, Rich Text; semantic description and acquisition captions/inline links
- `logo`: Company logo, Image; complete native Content Hub Image field, original asset and exact author alt, including blank alt
- `websiteLink`: Company website link, General Link, optional; preserve href, label, target and metadata. A nonempty link needs accessible link text

Investment status describes the investment. It is independent of workflow, draft status and publication. There are no per-status folders, manually maintained references or sort-order fields. The two groups are fixed Active then Exited. Each is alphabetized using the request locale, case-insensitive comparison, comparison-only Unicode/whitespace normalization and native GUID tie-breaking. Editing an item name need not rename the underlying Sitecore item.

## SDK integration and native binding gate

The source owner calls `enrichInvestmentPortfolioComponentMap(map, { getData, fetchOptions, bindings })` from the existing shared automatic-component composition. Instantiate it once per request using the same configured SDK client, language/site and incoming preview authorization options. The hook supports dynamic component modules and transports `{ investmentPortfolio }` through the real SDK `getComponentData` / `useComponentProps(rendering.uid)` flow. No server exports live in the client component.

`bindings` is optional before native staging. Once independently verified, supply actual `datasourceTemplateId`, `investmentTemplateId`, `siteName` and `siteRootPath`. No native IDs are invented or assumed from the source fixture. Source deployment alone is compatible, but no CMS query runs until the source owner supplies verified bindings in the shared integration. Missing/invalid bindings fail closed before any query; both real section heading fields remain available to editors. Passing source tests does not establish native Portfolio registrations, child content or page layout as complete. The hook copies its input map and only shares reads within that invocation/request.

The root query verifies actual datasource template and direct page-local Data ownership inside the bound site Home. It deliberately has no hardcoded Portfolio route. The search uses `_templates CONTAINS` for the actual Investment base template, `_parent EQ` for the actual datasource, request language and latest version. Native inherited Investment templates participate automatically. Returned children must independently retain the direct-parent relationship and a native template identity. Search provenance carries the base template, actual route/datasource and language through selection; raw/manual arrays are not a substitute.

Read all ten-record cursor pages and reconcile stable totals, unique IDs, cursor progress and exact final counts. Invalid scope, failed reads, malformed required fields, duplicate IDs and incomplete pagination expose no partial collection. A genuinely complete empty collection is valid. The source inventory's 19 active and 9 exited counts are initial acceptance evidence only, never runtime limits.

The Delivery endpoint decides what is public; the existing Preview endpoint decides what is visible to an authorized editor. No workflow/published/status flags or layout requirement are applied in application code. Native records need no page routes, and the component does not request item URLs.

## Fields, links and presentation

Original SDK field objects are passed unchanged to Text, RichText, Image and Link, including metadata. Native blanks never revert to source content. Optional blank fields retain authoring chrome in editing mode. A failed collection leaves section headings editable and shows a bounded diagnostic without requests, exception bodies or credentials.

Company CTAs use a generic HTTP/HTTPS validator. It retains valid and intentionally empty original fields, rejects unsafe schemes, invalid absolute URLs, control/space characters and URL credentials, and never rewrites individual company/host links. Unlabelled CTAs are hidden from visitors and flagged to editors. Ordinary external company links work; unrelated forms/auth integrations retain their own existing mock behavior. Source Rich Text captions, including inline acquisition links, remain semantic native content.

Fixed markup retains the source transparent tile collection, left-aligned h2/h3 headings, logo-above-content stacked tiles and exact right-arrow geometry. The existing Allianz grid supplies one column below 704px and four from 704px. One wrapping row per business group replaces the source's manual four-record row collections. The small scoped CSS adds stretch behavior and intrinsic image height without crop/resize transformations. No author-supplied theme, column count, heading level or row boundary changes this design.

## Evidence and safe migration

Official source: https://www.allianzlife.com/about/ventures/portfolio

`__tests__/portfolio.source.html` is the complete public capture from 2026-10-03 16:03:04 UTC, normalized to LF for portable Git checkouts. The original raw capture is 135,763 bytes, SHA-256 `48f056bc557e6f8e47639136227ada4f3ac19980a742e7d4ee7e3eeec00bdd1b`; its raw provenance is retained separately from the canonical fixture hash/size in the inventory. No semantic text, links, logos or details were changed by line-ending normalization. `__tests__/source-inventory.json` records the 28 source companies, full descriptions, original logo URLs/alt/srcset, active CTA destinations/targets and exited acquisition inline links. Both files are test evidence only and are never imported by runtime modules. Synthetic test IDs are explicitly unrelated to native identities.

Freshly read/snapshot the actual page, datasource/child records, current layout, template fields, revisions and Image/Link XML before native adoption. Preserve existing IDs and user-authored fields, including deliberate blanks. Seed only proven new fields/items; reconcile divergent existing values. Existing row records may need safe same-ID adoption after reference analysis. Replace only verified investment controls, retaining surrounding hero/navigation/CTA composition and unreferenced old content for recovery. An absent native layout needs separately verified initial composition; synthetic fixture UIDs are not native receipts.

Stage templates, native fields, options and records first. Bind actual IDs and verified Original media only after readback. Register the JSON rendering and its adjacent ComponentQuery, datasource location `./Data`, Default variant and required insert options through the ordinary authoring workflow. Activate only after exact source deployment is verified. Publish the complete datasource subtree and required dependencies, then establish the actual Delivery response and real browser output.

## Verification

From the starter directory:

- `node --test src/lib/investment-portfolio.test.mjs`
- `npm exec -- eslint src/lib/investment-portfolio-data.ts src/lib/investment-portfolio-server.ts src/components/investment-portfolio/*.ts src/components/investment-portfolio/*.tsx --max-warnings=0`
- `npm run type-check`

Tests use the installed Content SDK, its actual ComponentPropsService, SitecoreClient and editing renderer. Coverage includes all 28 source entries, >20-item pagination, inherited templates, ownership/provenance, insertion/removal/rename/status changes, request-local preview isolation, malformed/failed pages, alphabetical ties, source links, native blank fields and editable metadata, safe CTAs, exact arrow geometry and the source 704px grid rule.

The source owner must regenerate the SDK maps and run the final integrated build; `.props.ts` sidecars are excluded by the existing generator rules. These source checks do not prove native schema compatibility, live insertion, publication, image delivery or pixel parity. Real Pages save/reload, status/name changes, complete Delivery results, responsive browser screenshots and keyboard checks remain acceptance gates.
