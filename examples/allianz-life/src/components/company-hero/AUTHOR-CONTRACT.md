# CompanyHero author and adoption contract

Rendering name: `CompanyHero`. Fixed variants: Overlay (Default alias).

## Canonical insertion schema

| Field | Author label | Type |
| --- | --- | --- |
| heading | Heading | Single-Line Text |
| subtitle | Subtitle | Rich Text |
| image | Image | Image |

No child insert options. No separately authored mobile image: the actual source has one picture and no art-direction source element. Subtitle accepts the existing authored HTML; the source plain subtitle is a fixed styled paragraph.

## Same-ID adoption mapping

- Same root `000ca06c-975b-40db-ade1-a85a855920b0`
- heading → heading; body → subtitle; desktopImage → image
- Retain desktopImage and mobileImage originals independently in preservation evidence. mobileImage is neither rendered nor used as a hidden fallback. Do not replace blanks with fixture assets
- Fixed source classes: c-hero m-hero-overlay / m-axlHero; centered h1 and subtitle, one cover picture. Source lines 632–649

## Evidence and integration boundary

Public source: https://www.allianzlife.com/why-allianz, archive `fccbe91baad6ced8.html`, SHA-256 `40427bca432b07cf393744b6d6f756cefe5abd9437d2ba929624eb8df4685617`. A verbatim section witness is checked into this folder's `__tests__`; the receipt-backed SDK fixture uses actual returned item IDs and intentionally blank pending image fields. It is historical data evidence, not a current native read or DAM acceptance.

The component preserves complete SDK field objects, including editing metadata, and passes authored HTML to SDK RichText. Direct canonical fields, including explicitly cleared objects, take priority over historical aliases and collection values. Extra generic design fields and rendering parameters cannot change the fixed design. Only RenderingIdentifier is used.

The query keeps fieldCollection compact; child connections include total/pageInfo. Incomplete connections fail closed rather than silently dropping content. Register only the main TSX rendering and its named variants; `.props.ts` contains types and narrowly scoped projection helpers and is already excluded by the starter's generator configuration.

Before native changes, fresh-read actual items and snapshot field/XML values. Migrate templates and values on the same returned IDs; do not recreate items. Preserve old values and deliberately blank fields. Use the canonical schema for new insertion. This implementation makes no native changes and does not register renderings, deploy, bind page presentation, publish, or complete browser authoring QA.

Thirteen Why image fields remain pending DAM mapping, including two historical Hero fields, six strength icons, three commitment images, one portrait and one Information icon. No ready asset URLs are invented. The fixed source Badge is additional visual coverage restored separately. The shared FieldIcon helper intentionally accepts only verified sources; new DAM icon sources require separate verified allowlist integration.

## Validation

Run `node --test src/components/company-hero/__tests__/*.test.mjs` from the starter. Tests use the installed real Content SDK and SitecoreProvider, not mocked field components. Five-purpose suite: `node --test src/components/{company-hero,company-strengths,sustainability-commitment,leadership-quote,offerings-prompt}/__tests__/*.test.mjs`.
