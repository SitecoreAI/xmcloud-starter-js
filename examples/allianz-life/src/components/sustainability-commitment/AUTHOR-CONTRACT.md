# SustainabilityCommitment author and adoption contract

Rendering name: `SustainabilityCommitment`. Fixed variants: Default.

## Canonical insertion schema

Root: heading (Single-Line Text), overview (Rich Text), link (General Link), supportingStatement (author label Supporting statement; Rich Text).

Child insert option: Sustainability Commitment only, with heading (Single-Line Text), body (Rich Text), image (Image), link (General Link). Preserve authored child order; the captured page has three commitments. No general layout/appearance controls.

## Same-ID adoption mapping

- Same root `313573d7-08dc-418e-b1f6-527ba6973180`
- heading → heading; body → overview; primaryLink → link
- Fresh-read supporting item `61835e8b-d39a-4b89-b894-fd657a930487`; copy its body value exactly into the same root's new supportingStatement field during the same-ID migration, preserving author HTML. Retain the old supporting item, its body and all other field values; do not recreate/delete/flatten it
- Do not also bind the old supporting item as a standalone rendering after the copy, which would duplicate the paragraph
- Runtime/query read only the datasource's supportingStatement. No page-specific secondary GUID/query, missing-field historical fallback, or author-facing multi-source binding is present. A deliberately cleared new field remains empty. New insertions work independently
- The fixture canonicalMigrationPreview is an explicitly labeled value-copy preview using the preserved supporting item's SDK field object. It is not a claim that native migration has occurred
- One blue section: h2 overview/arrow link; supporting paragraph inside the intro before the tile row; then three white flipped image tiles, h3 headings and separate arrow links. Source lines 847–1007

## Evidence and integration boundary

Public source: https://www.allianzlife.com/why-allianz, archive `fccbe91baad6ced8.html`, SHA-256 `40427bca432b07cf393744b6d6f756cefe5abd9437d2ba929624eb8df4685617`. A verbatim section witness is checked into this folder's `__tests__`; the receipt-backed SDK fixture uses actual returned item IDs and intentionally blank pending image fields. It is historical data evidence, not a current native read or DAM acceptance.

The component preserves complete SDK field objects, including editing metadata, and passes authored HTML to SDK RichText. Direct canonical fields, including explicitly cleared objects, take priority over historical aliases and collection values. Extra generic design fields and rendering parameters cannot change the fixed design. Only RenderingIdentifier is used.

The query keeps fieldCollection compact; child connections include total/pageInfo. Incomplete connections fail closed rather than silently dropping content. Register only the main TSX rendering and its named variants; `.props.ts` contains types and narrowly scoped projection helpers and is already excluded by the starter's generator configuration.

Before native changes, fresh-read actual items and snapshot field/XML values. Migrate templates and values on the same returned IDs; do not recreate items. Preserve old values and deliberately blank fields. Use the canonical schema for new insertion. This implementation makes no native changes and does not register renderings, deploy, bind page presentation, publish, or complete browser authoring QA.

Thirteen Why image fields remain pending DAM mapping, including two historical Hero fields, six strength icons, three commitment images, one portrait and one Information icon. No ready asset URLs are invented. The fixed source Badge is additional visual coverage restored separately. The shared FieldIcon helper intentionally accepts only verified sources; new DAM icon sources require separate verified allowlist integration.

## Validation

Run `node --test src/components/sustainability-commitment/__tests__/*.test.mjs` from the starter. Tests use the installed real Content SDK and SitecoreProvider, not mocked field components. Five-purpose suite: `node --test src/components/{company-hero,company-strengths,sustainability-commitment,leadership-quote,offerings-prompt}/__tests__/*.test.mjs`.
