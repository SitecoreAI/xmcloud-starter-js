# AllianzCardGrid.EditorialLegal

Additive frontend variant for independently authored no-media editorial introduction rows. Default, EditorialIntro, every other existing export, all shared helpers, queries, styles and native items remain unchanged. The implementation contains no page text, routes, native IDs, image fallback, or whole-page RTE.

## Data and authoring

Reuse the existing modern AllianzCardGrid rendering and datasource template, with one ordered AllianzCard child per placement for this page:

- Datasource template: `/sitecore/templates/Project/Allianz Life/Components/AllianzCardGrid`
- Child template: `/sitecore/templates/Project/Allianz Life/Data/AllianzCard`
- Child fields consumed: `heading` (Single-Line Text), `subheading` (Rich Text), `body` (Rich Text), `headingLevel` (existing h1–h6 Droplist)
- Heading and body remain separate native editable SDK fields. Body is only that article's prose. An empty subheading retains the source's empty tileSubHeading scaffold for visitors and the actual SDK field editor when metadata is present
- Card `headingLevel` takes precedence over rendering `headingLevel`; the existing `headingTag` helper accepts h1–h6 and falls back to h2 for absent/invalid values. Do not alter EditorialIntro's existing h2/h3 semantics
- No media, icon, badge, footer/link collection or root grid-heading fields are consumed by this narrow variant. Keep these fields empty on new datasources. Other CardGrid variants continue to consume their original fields
- The existing `allianzCardFields` adapter supports named query fields and compact modern `fieldCollection: fields { name jsonValue }`, preserving complete SDK jsonValue objects, metadata and explicit clears. Do not flatten them into strings or substitute the legacy card query
- No datasource returns the existing NoDataFallback. A missing/empty children list yields no articles, with no fixture fallback. Existing render errors propagate normally. The frontend renders every supplied child; the page-specific authoring contract requires one child per row datasource and exact connection completeness readback
- Visitor body/subheading links use the existing `safeEditorialRichText` service policy. Editing receives the original SDK field objects, including original value and chrome. No sanitizer, link policy or allowlist is changed

## Minimal finite layout contract

The variant always uses source introduction markup:

`l-grid__column-medium-12 > article.m-axlIntroductionBlock.-is--stacked.-no--image > .tileContent.u-text-left > header(.tileHeading, .tileSubHeading) + .tileBody`

- `container=row` renders only its row/column/article within an existing parent grid
- Any other `container` value, including omitted or `content`, renders one standalone contained `l-container t-bg-transparent axlTileCollection` with `l-grid l-grid--max-width l-grid--no-gutters-outer`
- Only `paddingTop`, `paddingBottom`, `marginBottom` are forwarded to existing finite `rowSpacing`; accepted nonempty sizes are sm/md/lg/xl, with none/invalid treated as no utility
- `RenderingIdentifier` attaches to the owning row or standalone outer container as in EditorialFrame
- `headingLevel` is the semantic fallback described above
- `sectionWidth`, `theme`, `columns`, `layout`, `alignment`, `bodySize`, `sectionSpacing`, `introSpacer`, `spacing` and arbitrary class strings cannot change this variant's fixed visual contract

There is no new CSS. Existing global source introduction/grid/spacing classes provide the styling. Font rendering and final responsive visual acceptance still require permitted live QA.

## Confidentiality composition

Source route: `/confidentiality-for-victims-of-domestic-abuse`

Frozen full source: `9c3bf6646080fd47.html`, 65,298 bytes, SHA-256 `c141e749a8103aa3d80198ffa236fced8a44dcb4740a120a3303bd7e4775d6aa`. The checked-in main-only witness retains raw source markup (including original link destinations). The two-row fixture preserves supplied candidate body values, exact visible text, paragraph order and the existing demo-disabled service anchors. It is a test/native field plan, never runtime content.

One existing `AllianzEditorialSection.Default` owns the shared container and grid:

- Section params: `sectionWidth=contained`, `theme=transparent`, `layout=grid`; leave section spacing/padding/margin empty. Its `DynamicPlaceholderId` must come from actual native SXA placement
- Two child rendering placements, in order, each `componentName=AllianzCardGrid`, `FieldNames=EditorialLegal`, its own datasource and one AllianzCard child
- First row: `container=row`, `paddingTop=lg`, `paddingBottom=none`, `marginBottom=lg`, `headingLevel=h1`; card heading “Confidentiality for Victims of Domestic Abuse”, card headingLevel h1
- Second row: `container=row`, `paddingTop=none`, `paddingBottom=none`, `marginBottom=xl`, `headingLevel=h2`; card heading “Additional Information for New York Residents”, card headingLevel h2
- Copy each card's body once from the corresponding fixture/source-verified field plan. Both subheadings are explicitly empty. Do not duplicate the New York article as RichText or another card. Both repeated addresses and 3-business-day notices are intentional source content
- Do not place these child rows again at page root, combine them in one Default grid, or use two standalone containers. The native `allianz-editorial-section-{*}` placeholder must allow the verified modern CardGrid rendering
- Keep the separately planned breadcrumbs. After the shared section, retain the source's separate empty disclosure scaffold using the existing `LegalDisclosures.Faq` with a real body-only datasource whose body is empty, if that source scaffold is not already provided by the page composition. Do not duplicate it. This is downstream composition, not part of the two intro rows or a new variant

## Native registration, eligibility and deployment gates

This file documents a plan, not proof of current native state. No registration or activation is performed by the patch.

1. Publish reviewed source to the authorized Allianz branch/hosts only through the separate publisher. Before activating any layout/variant, verify the exact deployed revision and that BOTH public and existing Allianz Life editing hosts expose the AllianzCardGrid named export `EditorialLegal`. Generated component maps must still register `AllianzCardGrid` and its named exports; do not register tests, fixtures or props as renderings. A source commit or one host alone is insufficient
2. Resolve the actual modern CardGrid JSON rendering by `componentName=AllianzCardGrid`, its current author-facing path, item ID, datasource template, parameter template and ComponentQuery. `/sitecore/layout/Renderings/Project/Allianz Life/AllianzCardGrid` is the repository's historical identity path, not a promise that its live display path has not moved. Retain the existing modern `children(first:40) { total pageInfo { hasNext endCursor } results { id fieldCollection: fields { name jsonValue } } }` query and its root fields. Verify Preview and Delivery support plus actual return shape/completeness. Do not overwrite it with the legacy six-field query or create a duplicate core rendering
3. Freshly read `/sitecore/content/allianz/allianz-life/Presentation/Headless Variants/AllianzCardGrid`, existing Default and EditorialIntro siblings, their actual templates/field definitions, and existing ordered compatibility values. The observed site uses a `HeadlessVariants` group and `Variant Definition` children; revalidate rather than reuse historical IDs
4. Create only the missing `EditorialLegal` Variant Definition under that actual CardGrid group, with its name exactly matching the named TSX export. Do not rename/remove/change Default or other variants. Preserve unrelated fields and existing restriction values. Resolve every resulting native item ID and validate UUID/readback
5. The SXA field is named `Compatible Renderings` (TreelistEx), at `/sitecore/templates/Foundation/Experience Accelerator/Variants/ICompatibleRenderings/Variant Details/Compatible Renderings`. Native connectors may expose its normalized key as `CompatibleRenderings`; use the field identity/name returned by current schema. Ensure the actual CardGrid rendering ID is present in the group's compatibility list, appending only if absent and preserving existing members/order. Check variant-level compatibility and AllowedInTemplates restrictions using current native semantics so EditorialLegal is eligible on the Legal page; do not broaden unrelated restrictions, overwrite the group with a singleton, or infer the field ID from code
6. Verify existing AllianzEditorialSection registration, its Default variant, real numeric SXA DynamicPlaceholderId and `allianz-editorial-section-{*}` placeholder settings. Preserve allowed controls and add the verified CardGrid rendering only if the authorized workflow needs it. Check real parameter-template options (`container=row`, row spacing values and headingLevel) and native card h1/h2 options. If missing, report the precise registration/parameter prerequisite; do not invent IDs or silently substitute defaults
7. Select EditorialLegal via the native variant selector and verify resulting layout JSON has `params.FieldNames=EditorialLegal`; do not put a guessed variant GUID in that SDK property. Native authoring serialization can store selection differently: use the verified native workflow and inspect its resolved layout JSON
8. Only after source/host gates pass, construct the shared section, two distinct row rendering UIDs/datasources, and separate one-card children. Save/reload native values and final layout. Inspect normal and editing delivery, SDK native field edits/clears/restores, one h1 and one h2, exact body text and order, only one New York heading, empty disclosure scaffold, and demo service links. Compare public desktop and actual mobile, not only Page Builder presets

All native rendering, variant, datasource, card, section and placeholder identities remain unresolved/null in the offline plan. Test-only identities never become native IDs.

## Scope and current release state

Exact reviewed predecessor: `676a5facf1ea17cd4125869d2e1e2d0c2b032bc4`. This patch appends one export to AllianzCardGrid.tsx and adds this contract, one source witness, one fixture and one test file. It changes no existing export bytes, shared helper, query, CSS/font file, dependency, config, generated map, asset, route or native item.

The coordinating publisher reported branch advance to `4a1aea647ea68a93737bae48c6b682d2597376ed`, limited to the separate four-file legacy font correction. This patch is disjoint from globals.css, both legacy stylesheet mirrors and legacy-font-family.test.mjs. Reconcile against the actual branch HEAD before applying: verify the exact CardGrid predecessor blob and new-file absence, inspect any additional branch changes, run git apply --check, apply only listed deltas, and rerun validation. Never reset/overwrite the font change.

The same report says a deployment rate limit prevents the final font build until at least 2026-10-06 23:18:52 UTC; latest public READY revision was `c76568e6afcfd3c22c13333817816db612391eb4`. These are coordination observations, not independently fetched deployment proof. Do not activate EditorialLegal on that older host, trigger deployment here, or bypass the rate limit. Recheck the current deployment and both hosts through the authorized publisher when permitted.
