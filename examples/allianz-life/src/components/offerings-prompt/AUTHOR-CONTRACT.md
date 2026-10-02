# OfferingsPrompt author and adoption contract

Rendering name: `OfferingsPrompt`. Fixed variants: Default.

## Canonical insertion schema

| Field | Author label | Type |
| --- | --- | --- |
| heading | Heading | Single-Line Text |
| body | Supporting text | Rich Text |
| icon | Icon | Image |
| link | Link | General Link |

No child insert options after minimal-template migration. One green introduction, circular brand Information icon, h2/h5 content and primary button. No CTA style switch or card model.

## Same-ID adoption mapping

- Same root `31377e86-0863-4f70-bd9b-f458ddf39449`
- Fresh-read its existing child `22c00cc1-65a9-4bda-b3ba-6e48100dfa73`; preserve it and map child heading → root heading; child subheading → root body; child icon → root icon; child link → root link
- Capture/preserve both child link and root primaryLink XML. Their source destinations agree; keep deliberate differences if a fresh read finds any and resolve with the owner before overwriting
- Runtime and query consume only the four root fields heading/body/icon/link. There are no native GUIDs, secondary sources, child reads, or historical fallbacks in the reusable component. Complete the value-copy migration before binding it to the existing root. Missing or deliberately cleared root fields remain empty
- Fixed source t-bg-green-soft, Information icon t-bg-primary-brand/t-icon-primary-white, h2/h5, m-axlButton m-axlButton--primary. Source lines 1074–1112

## Evidence and integration boundary

Public source: https://www.allianzlife.com/why-allianz, archive `fccbe91baad6ced8.html`, SHA-256 `40427bca432b07cf393744b6d6f756cefe5abd9437d2ba929624eb8df4685617`. A verbatim section witness is checked into this folder's `__tests__`; the receipt-backed SDK fixture uses actual returned item IDs and intentionally blank pending image fields. It is historical data evidence, not a current native read or DAM acceptance.

The component preserves complete SDK field objects, including editing metadata, and passes authored HTML to SDK RichText. Direct root fields, including explicitly cleared objects, take priority over collected values. The component never reads historical aliases or child values. Extra generic design fields and rendering parameters cannot change the fixed design. Only RenderingIdentifier is used.

The query keeps the four root fields in a compact fieldCollection read and has no child collection projection. Register only the main TSX rendering and its named variants; `.props.ts` contains types and narrowly scoped projection helpers and is already excluded by the starter's generator configuration.

Before native changes, fresh-read actual items and snapshot field/XML values. Migrate templates and values on the same returned IDs; do not recreate items. Preserve old values and deliberately blank fields. Use the canonical schema for new insertion. This implementation makes no native changes and does not register renderings, deploy, bind page presentation, publish, or complete browser authoring QA.

Thirteen Why image fields remain pending DAM mapping, including two historical Hero fields, six strength icons, three commitment images, one portrait and one Information icon. No ready asset URLs are invented. The fixed source Badge is additional visual coverage restored separately. The shared FieldIcon helper intentionally accepts only verified sources; new DAM icon sources require separate verified allowlist integration.

## Validation

Run `node --test src/components/offerings-prompt/__tests__/*.test.mjs` from the starter. Tests use the installed real Content SDK and SitecoreProvider, not mocked field components. Five-purpose suite: `node --test src/components/{company-hero,company-strengths,sustainability-commitment,leadership-quote,offerings-prompt}/__tests__/*.test.mjs`.
