# ExpertBiography author and adoption contract

One recovered source design serves 29 subject-matter experts and all 4 venture biographies. The exact venture source is the same H5 identity, flipped blue 66/33 focus tile, editorial biography and PDF link design. A separate VentureBiography primitive would duplicate this contract.

## Minimal panel: six purpose fields

| Field | Author label | Native type | Purpose |
| --- | --- | --- | --- |
| name | Person name | Single-Line Text | Fixed H1 identity |
| role | Role and organization | Rich Text | Exact source copy in a valid DIV with fixed .h5 typography and heading ARIA level 5 |
| focus | Areas of focus | Rich Text | Semantic list under fixed H3 'Focused on:' |
| portrait | Portrait | Image | Optional native image in the fixed 33% picture column |
| biography | Biography | Rich Text | Semantic background/expertise, experience and education content |
| downloadLink | Biography PDF | General Link | Independently editable native PDF destination, text, target and metadata |

No child insert options or generic layout/design parameters. Role is the exact contents of the source H5, including source BR, DIV and SPAN markup. It renders unchanged inside a block-safe DIV using the existing source .h5 typography alias, role=heading and fixed aria-level=5. Scoped CSS reproduces the source 24px 0 role margin and resets only direct editor-P margins, so ordinary one-/two-paragraph native editor values are valid without assuming an inline-only authoring profile. Focus and biography are semantic formatted copy; they never own the fixed page layout. The fixed rendering keeps the source grid, top LG/bottom LG identity row, bottom XL content row, left text alignment, t-bg-blue-soft, flipped tile--6633 split, optional picture/c-image/c-teaser__image and fixed download glyph. It inherits the already present responsive source stylesheet; no shared CSS was changed.

There are 26 expert portraits and 3 venture portraits. Preserve intentional source absence for /about/subject-matter-experts/benjamin-thomason, /about/subject-matter-experts/jeng-chiu, /about/subject-matter-experts/paul-cahill and /about/ventures/clay-bottensek. Do not substitute another person, stock image or a fixture image. All 33 download links are independently present in source; no portrait presence rule suppresses the PDF field.

Venture routes: /about/ventures/clay-bottensek, /about/ventures/collin-bhojwani, /about/ventures/ron-gonen and /about/ventures/taylor-sieverling. The full exact 33-route source manifest, raw-byte SHA-256 values, verbatim source and source values are held in ../executive-biography/__tests__/ alongside all 8 executives. Captures are self-contained and tests do not depend on the research archive, discovery directory or normalized generic extraction.

## Composition and native prerequisites

ExpertBiography is followed by optional BiographyDisclosures, then the existing LegalDisclosures. Jason Wellmann has the source LIMRA footnote in a separate grey section. Paul Cahill has a separate source ETF disclosure in the same grey design. The final legal shell matches existing LegalDisclosures for every route, including blanks.

Fresh native page/datasource/template/rendering ID readback and preservation snapshots are required before adoption. No native IDs, page existence or module parents are verified by these source witnesses. Do not use deterministic fixture UUIDs or create hidden runtime source/GUID lookup fallbacks. The exact-source value objects are test-only references, not population receipts.

The 29 present source portraits require verified native DAM mappings and delivery. The archive's signed responsive source srcset values and exact alt text are retained as original sourcePortrait attributes. Runtime uses the full native Image field and the fixed source sizes='100vw' picture structure. Source-signed crop hashes cannot be treated as native DAM responsive assets; native media responsiveness and image delivery remain acceptance prerequisites.

All 33 PDF links require verified native media/delivery mappings. Literal public /-/media/Files/... links in the test witnesses are archival evidence only. Runtime reads the actual authored native General Link, preserves target/query/fragment and SDK metadata, and does not depend on fixture route availability or manufacture a 'service unavailable' destination. The small safety projection is in excluded expert-biography.props.ts and is reused by the one linked executive image variant. It permits exactly these 33 recovered public PDF paths and the one recovered image-link path on the HTTPS source origin, supported by archived successful transport receipts dated 2026-09-30 in the witness manifest. Arbitrary HTTP(S) origins, original-service routes and unverified local/native delivery paths are unavailable in normal mode; editing mode retains each original SDK field unchanged. No native delivery origin/path shape is presumed: verify it and explicitly integrate its narrow contract before native media acceptance. A populated URL or archived public receipt alone is not evidence of native PDF readiness.

Queries request only id and the six true named native fields as complete jsonValue objects. There are no child collections or arbitrary first limits. Sidecar helpers are excluded by the existing starter generator configuration. No shared files, maps, dependencies, native data or Git state were changed.

## Validation

The shared 18-case real-SDK suite is node --test src/components/executive-biography/__tests__/*.test.mjs. It covers source shells/classes/heading levels with the explicit block-safe role-wrapper accommodation and exact inner source HTML, all semantic HTML/whitespace, the download glyph, field metadata and clearing, four absent portraits, native media link handling, field GraphQL and shared responsive source CSS, populated/cleared role metadata and LF/CRLF capture checkout portability. Raw Base64 witnesses and raw source SHA values preserve original bytes independently of readable capture EOL conversion; native/source field values are never normalized by runtime code. Focused ESLint and full starter TypeScript are required as source checks.

Source code only; no native, publish, deployment, media delivery or browser acceptance claim.
