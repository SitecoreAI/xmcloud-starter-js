# ExecutiveBiography author and adoption contract

Source coverage: 8 archived executive biographies. Rendering variants are fixed designs selected during source adoption. They are not author-selectable layout, theme, spacing or heading parameters.

## Minimal author panels

The four non-linked variants expose exactly four fields. Only LinkedPortrait exposes the fifth field. Do not provision or display portraitLink in the other four panels.

| Field | Author label | Native type | Purpose |
| --- | --- | --- | --- |
| name | Person name | Single-Line Text | Fixed H1 identity |
| role | Role and organization | Rich Text | Exact semantic role copy inside a block-safe DIV with fixed .h4/.h2 typography and heading ARIA level 4/2 |
| portrait | Portrait | Image | One native image, independently clearable |
| biography | Biography | Rich Text | Semantic background, experience and education content |
| portraitLink | Portrait image link | General Link | LinkedPortrait only; independently clearable native image destination |

No child insert options. No generic heading, body, summary, layout, colors, mobile-image substitute, arbitrary heading level or design controls. Role stores the contents of the recovered role heading, including semantic block/inline markup and intentional line breaks. Native one-/two-paragraph editor values and recovered DIV/SPAN values pass through unchanged inside a valid DIV with the existing source .h4 or .h2 typography, role=heading and fixed aria-level=4 or 2. Scoped component CSS retains the source role margin 0 0 24px and resets only direct editor-P margins; no inline-only editor profile is assumed. Biography stores only the source editorial contents of tileBody, including source headings, lists, emphasis, links and whitespace; it does not own a page-layout shell.

## Fixed source variants

| Variant | Routes | Fixed identity and portrait | Fixed biography |
| --- | --- | --- | --- |
| Default | bill-gaumond, eric-thomes, jean-roch-sibille, jenny-guldseth | H1/H4, no identity section margin, 768px/max-width 100% image in centered 4/4/4 columns | Full-width section, source u-row-spacing, plain row |
| Extended | adam-brown | H1/H4, no identity section margin, max-width 100% image | Full-width section, source u-row-spacing and row bottom XL |
| Contained | gretchen-cepek | H1/H4, no identity section margin, 768px/max-width 100% image | l-container section, no-gutters-outer grid, source u-row-spacing and row bottom XL |
| ChiefExecutive | jasmine-jirele | H1/H2, source u-row-spacing, 768px/max-width 100% image | Full-width section, source u-row-spacing, plain row |
| LinkedPortrait | luca-gallo | H1/H4, no identity section margin, max-width 100% linked image inside the source P wrapper | Full-width section, source u-row-spacing, plain row |

All routes use fixed l-grid/l-grid--max-width, a source identity row with top LG/bottom LG, m-axlIntroductionBlock, centered identity and a separately sourced left-aligned biography. Portrait width is constrained by the existing responsive medium-4 grid. The malformed literal '=;' in Adam's archived image style has no CSS effect; the raw attribute is retained in the witness and the effective max-width rule is rendered. CSS declaration order differences do not change the source width constraint.

## Page composition and source evidence

Each route uses ExecutiveBiography, optional BiographyDisclosures, then the existing LegalDisclosures. Jean-Roch Sibille has the additional source grey note section. Every final legal section, including deliberately blank sections, has exactly the existing LegalDisclosures design. Do not fold it into the biography or create another legal primitive.

All 41 biography source routes, 8 executive routes, exact raw-byte source SHA-256 values, verbatim main fragments and independently extracted field values are in adjacent __tests__/manifest.json and __tests__/captures/. Each fragmentBase64 raw witness decodes to a byte-for-byte substring of the original archived file, preserving original CRLF and HTML whitespace; raw archiveSha256 and fragmentSha256 remain unchanged. Readable .source.html companions use LF and permit standard Git LF/CRLF checkout conversion, verified by fragmentLfSha256 and comparison to only the EOL-canonical raw witness. The oracle and SDK source fixtures use the raw Base64 witness; they do not normalize native/source field values or their exact jsonValue objects. Both checkout EOL forms are tested, while changes beyond EOL still fail provenance checks. The fixture UUIDs from content/native-content.json were not used. These witnesses and the synthetic test metadata are test data, not native item-ID receipts, an import payload or live media evidence.

Public source roots: https://www.allianzlife.com/about/executives/adam-brown, https://www.allianzlife.com/about/executives/bill-gaumond, https://www.allianzlife.com/about/executives/eric-thomes, https://www.allianzlife.com/about/executives/gretchen-cepek, https://www.allianzlife.com/about/executives/jasmine-jirele, https://www.allianzlife.com/about/executives/jean-roch-sibille, https://www.allianzlife.com/about/executives/jenny-guldseth and https://www.allianzlife.com/about/executives/luca-gallo.

## Native adoption and media prerequisites

Parent module IDs, page IDs, datasource IDs and actual native page existence were not read or verified in this source-only task. Before changing native content, freshly read actual items and template/rendering/presentation IDs, snapshot every original field and presentation XML, then migrate on the same returned IDs. Preserve deliberately blank native fields. Resolve structural generic source sections to their small purpose contracts using the verbatim source, not a fixture UUID or runtime source-key/GUID fallback. Do not recreate already existing pages or datasources.

All eight source portraits require verified native DAM mapping and delivery before population. Public source URLs in test-only exactSourceFieldValues and sourcePortrait are archival references. They are never looked up by runtime code and are not ready assets. LinkedPortrait also needs a verified native image General Link; clearing it leaves the portrait independent. Clearing the image leaves no anchor or generated URL label. Empty image/link editing controls keep their separate SDK metadata.

The shared biographyLinkField sidecar allows exactly 33 recovered public biography PDF paths and the one recovered linked portrait path on the HTTPS source origin. All 33 PDF paths have archived successful HTTP 200 PDF transport receipts, and the linked portrait has a successful HTTP 200 JPEG receipt, dated 2026-09-30; those receipts are copied into the adjacent witness manifest. It preserves the allowed General Link metadata, target, query string and fragment without a fixture-route gate. Arbitrary origins, original-service routes and unverified local/native paths fail closed with no replacement destination. No new native DAM/document delivery origin or path shape has been verified here: add any such contract only after fresh native/delivery verification. Editing mode receives each original SDK field unchanged. Archived source transport receipts do not prove native URL delivery or import readiness.

Queries read true named native fields and complete jsonValue objects. This root-only contract has no child connection to truncate and needs no fieldCollection projection. portraitLink returns no field for templates that do not contain it. The starter already excludes *.props.ts from component generation; only the TSX rendering and its five named variants are eligible. No shared files, maps, dependencies, native items or Git state were changed.

## Verification boundary

Run node --test src/components/executive-biography/__tests__/*.test.mjs. The 18 tests use the real installed Content SDK and SitecoreProvider, independently validate all 41 captured sources, compare every recovered shell with only the explicit valid role-wrapper accommodation, preserve exact HTML values and test metadata, cleared fields, optional portraits, PDF links, fixed variants, named-field GraphQL and 87 captured source CSS rules. Populated one-/two-P, recovered DIV/SPAN and cleared role values retain exact content and metadata in normal/editing modes across all fixed variants. Runtime image delivery and browser authoring behavior still need acceptance after verified native mapping.

This is source code only. Focused ESLint and full starter TypeScript checks are applicable; no component-map generation or build was run because those would write shared/generated files outside this task's scope. There is no claim of native import, rendering registration, page binding, publishing, deployment, DAM/PDF readiness or browser acceptance.
