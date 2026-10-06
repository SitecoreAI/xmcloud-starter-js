# Document service rail: offline native activation contract

Status: reviewable code and source preparation only. No native rendering, template, variant, datasource, placeholder, page, or layout changes have been made by this patch. All unresolved native identities in `native-activation.json` are intentionally `null`. This directory is not an import package or executable CMS write payload.

## Isolated implementation

- Component: `AllianzLegacyDocumentServices`
- `Default`: route19, route20, route21, route25. The source account dropdown is deliberately empty
- `LoginWidget`: route26–route30. The source account dropdown contains the local visual login widget
- Both variants include source Contact Us and Social/Social Media controls, one shared social panel and ordered Facebook, Twitter, LinkedIn, YouTube links
- Exactly one `right-nav` list and its source flex spacer are emitted per instance
- Existing `AllianzLegacyLinkList.Default`, `AccountServices`, `ContactServices`, shared Layout, header, sidebar, disclosures, document controls, contact forms and all unrelated variants remain untouched
- No content fixture is used by runtime code. Values come from the integrated native query and SDK fields

## Source and deliberate safe differences

The nine source routes are proven as two byte-identical right-rail source groups in the adjacent component's `__tests__/document-services.source-proof.json`. The source page and fragment hashes, safe test fragments, exact authored field values and ordered social destinations are retained. The original source sprite is copied unchanged into `public/allianz-legacy-assets/document-services-social-sprite.png` and referenced only by this component's scoped CSS. Its SHA256 is `4c63258a51742d70d173a28436cd7b46c4556e1e9992f114b8bd3d7e96dedd0f`.

Production authentication scripts, forms, handlers, registration/recovery URLs, tracking attributes, hidden metadata inputs and tokens are absent. This is intentional:

1. Dropdown triggers use native buttons and disclosure semantics, with expanded state, Escape, normal Tab order, focus-exit/outside dismissal, route/history reset and unique instance IDs
2. Login fields and Remember me are disabled, nameless, and have no credential state. No `<form>`, action or submit control exists. Login/Register/recovery buttons show an in-memory unavailable dialog; no information is submitted
3. The exact source social destinations remain native editable General Link fields. Visitor rendering follows the existing `safeLink` policy, which routes these offsite services to the local unavailable notice. Editing mode preserves original SDK link objects and metadata
4. Contact Us uses the ordinary local `/contact-us` page, never `/new-york/contact-us`. Verify that page independently; this patch does not change it
5. On mobile, the existing source Social Media control opens the one shared social panel below it. The hidden desktop social control does not hide that shared panel. Account remains hidden at the source mobile breakpoint
6. Source icon names and dimensions are retained; the sprite is self-hosted. The exact source CSS recovery-link chevron is also self-hosted unchanged as `document-services-link-chevron.png` (SHA256 `d3de39162e6cfca6bc2c301f63f5f75fdad5cf1e9ceeadc222acb62253d2ae74`). Keyboard focus outlines and editing-only visible fields intentionally improve accessibility/authorability
7. Credential disabled appearance, native button metrics, mobile panel behavior, editorial chrome and responsive/print visuals still require browser acceptance. Source-exact content/structure preparation does not establish complete pixel parity

## Native reads before any activation

Before binding or changing each target, verify that the required source exports are available in both public delivery and the existing editing host for `thlt-allianz-demo/dev`, then freshly read the target native state. Existing renderings, variants, datasources, and page bindings may already be active; reconcile verified existing items rather than recreating them.

Freshly read the current state before every native change:

- Current page shared/final layouts, designs, all existing UIDs, datasources, variants and child order
- Current dedicated Allianz Legacy Layout, its Foundation view and existing header/main/footer/sidebar settings; preserve them. Never edit the protected Foundation layout
- Current `headless-right-rail` placeholder setting and allowed renderings; no placeholder identity is inferred from its name
- Real rendering/template/variant groups and existing matching content; reuse only exact, current matches. Do not duplicate an existing component name or shared datasource
- Current picker datasource roots, language versions and insert options. Choose a shared root the native picker can actually select

Do not write historical layout XML, archived IDs, fixture IDs or source hashes into native fields. All new IDs must come from actual create/readback, not generated GUIDs. Conflicting user edits block reconciliation.

## Native schema and query

`native-activation.json` enumerates the root native fields and types. Most are Single-Line Text; `socialBody` is Multi-Line Text; `contactLink` is General Link. This purpose-specific datasource may reuse verified native `AllianzLinkListEntry` children because only editable `heading` and `link` fields are needed. Confirm the current child schema and insert options first. Do not modify the existing LinkList template or its shared rendering query.

`AllianzLegacyDocumentServices.graphql` mirrors the complete accepted native integrated query captured on 2026-10-06 at 12:06 UTC for rendering `C2CB5F96-618A-4400-997C-EC0095D5F90B`. Its exact UTF-8 SHA256 is `c59824d8ad5b8d2d189b7027f9306105056baf8ddcd0c8108fc6bae935fefdba`; the single-line file deliberately has no trailing newline so its bytes match that native receipt.

Keep the root `id` and `fieldCollection: fields { name jsonValue }`. The existing component helper maps collection entries to the component's named fields while retaining each SDK `jsonValue` and its metadata; no runtime component change is required. This complete projection is the accepted query for both `Default` and `LoginWidget`. The earlier repeated 16 named-field root projection failed native execution; do not restore it as the activation query. The evidence does not establish an exact complexity cost or failure cause.

Preserve `children(first: 20)`, `total`, `pageInfo { hasNext }`, and each child's `id`, `heading: field(name: "heading") { jsonValue }`, and `link: field(name: "link") { jsonValue }`. Connected Layout fails closed for the entire page when either collection metadata field is absent. The child query has a finite capacity of 20; native activation requires exactly the four source social children in verified `__Sortorder` 100/200/300/400 order, with no pagination or truncation. A query-only count of four does not establish sibling order; verify native order and returned order. Re-read the current rendering query before any later native change; this source reconciliation does not authorize overwriting newer native edits or recreating existing items.

Create/register the real variant entries with the exact exported names `Default` and `LoginWidget` under a group that explicitly associates with this new renderer. Resolve actual variant IDs into the existing site's `FieldNames` convention; do not assume export strings are native GUIDs. The generated component map should discover only `AllianzLegacyDocumentServices`, not the props helper, tests or fixture files.

Create or reuse one shared, separately editable datasource with the source values in `native-activation.json`, then insert the four social children in source order. General Link XML must be serialized with an XML encoder. For example, source Contact Us may use external-link XML with relative `url="/contact-us"`; a verified native internal link is also acceptable when it emits the same destination. Social links use their exact source URLs with no `_blank` target. There are no account destination fields. Do not add production auth URLs.

## Nine-page binding plan

1. Resolve the actual page IDs using the route paths in `native-activation.json`
2. Keep all unrelated placements and content intact. When a page already has the prior partial AccountServices/ContactServices pair, identify those exact purpose placements from a fresh read and replace only that rail pair with this one renderer. Do not append a duplicate rail and do not remove unrelated components
3. Bind `Default` on the four empty-account pages and `LoginWidget` on the five widget pages. Preserve route26–30's Prospectus self-link left navigation
4. Route19/20/21/25 must retain or receive the source empty left sidebar placement. Existing Layout chooses its eight-column center only when the sidebar has a rendering. Right rail alone is insufficient for source 2/8/2 geometry; this code does not change Layout
5. Verify the shared datasource picker and variant selector in Page Builder. Save/reselect bindings, then publish only the scoped verified items and necessary dependencies if publication is later authorized

## Required authoring and live acceptance

- Page Builder insertion, variant switching, selecting the shared datasource, and exactly one rail instance
- Inline editing of all visible labels, social body and every child heading/link; preserve SDK metadata even when empty
- Save/reload and clear/restore each field. Cleared labels must not leave unnamed visitor controls. No hard-coded source text should reappear
- Child edit/reorder/save/reload; metadata must identify the correct child item
- Desktop/tablet/mobile geometry against the original source; correct social icons, dropdown alignment, no overflow, eight-column center and source empty/self-link left rail
- Repeated click and native Enter/Space open/close; Escape and focus restoration; normal forward/backward Tab; outside clicks; opening one panel closes the other
- Repeated login/register/recovery/social notices, backdrop/Close/Escape dismissal, focus trap and return to the still-visible initiating control; only one dialog
- Back/Forward, same-page hash changes, route navigation, source clearing and component removal must not leave stale UI/listeners
- Credential controls never accept text, remember state or autofill; no auth, tracking or offsite social requests; no captured or submitted data
- Contact Us reaches the intended local page; existing print and document/table/report/filter/download controls remain unchanged
- Print hides account and social controls; inspect actual paginated print output

Offline Node handler tests exercise state transitions and focus calls, not a browser DOM or native keyboard default actions. Real SDK server rendering proves field-marker retention, not live Page Builder save/publish. These distinctions are acceptance gates, not implied passes.
