# CompanyStrengths author and adoption contract

Rendering name: `CompanyStrengths`. Fixed variants: Introduction (Default alias), Continuation.

## Canonical insertion schema

Root: introduction (author label Introduction; Multi-Line Text, optional).

Child insert option: Company Strength only, with heading (Single-Line Text), body (Rich Text), icon (Image), link (General Link, optional). Preserve native child order. No theme, heading-level, alignment, spacing, columns or arbitrary links-list fields.

## Same-ID adoption mapping

- Introduction root `d0495cc5-7b04-415f-9f25-5b3a5b8e9368`; existing heading → introduction
- Continuation root `b33094f2-4d96-4e24-861c-aac7c4ae0e11`; keep existing deliberate empty heading/introduction
- Existing children retain IDs and heading/body/icon/link. The redundant existing links folders/reference values remain preserved; the fixed design uses the child General Link once
- Introduction: source h5 intro; three centered h4 benefits. Continuation: terminal row u-margin-bottom-xl and outer u-row-spacing. Existing shared source CSS provides the 704px three-column boundary. Source lines 651–846

## Evidence and integration boundary

Public source: https://www.allianzlife.com/why-allianz, archive `fccbe91baad6ced8.html`, SHA-256 `40427bca432b07cf393744b6d6f756cefe5abd9437d2ba929624eb8df4685617`. A verbatim section witness is checked into this folder's `__tests__`; the receipt-backed SDK fixture uses actual returned item IDs and intentionally blank pending image fields. It is historical data evidence, not a current native read or DAM acceptance.

The component preserves complete SDK field objects, including editing metadata, and passes authored HTML to SDK RichText. Direct canonical fields, including explicitly cleared objects, take priority over historical aliases and collection values. Extra generic design fields and rendering parameters cannot change the fixed design. Only RenderingIdentifier is used.

The query keeps fieldCollection compact; child connections include total/pageInfo. Incomplete connections fail closed rather than silently dropping content. Register only the main TSX rendering and its named variants; `.props.ts` contains types and narrowly scoped projection helpers and is already excluded by the starter's generator configuration.

Before native changes, fresh-read actual items and snapshot field/XML values. Migrate templates and values on the same returned IDs; do not recreate items. Preserve old values and deliberately blank fields. Use the canonical schema for new insertion. This implementation makes no native changes and does not register renderings, deploy, bind page presentation, publish, or complete browser authoring QA.

Thirteen Why image fields remain pending DAM mapping, including two historical Hero fields, six strength icons, three commitment images, one portrait and one Information icon. No ready asset URLs are invented. The fixed source Badge is additional visual coverage restored separately. The shared FieldIcon helper intentionally accepts only verified sources; new DAM icon sources require separate verified allowlist integration.

## Validation

Run `node --test src/components/company-strengths/__tests__/*.test.mjs` from the starter. Tests use the installed real Content SDK and SitecoreProvider, not mocked field components. Five-purpose suite: `node --test src/components/{company-hero,company-strengths,sustainability-commitment,leadership-quote,offerings-prompt}/__tests__/*.test.mjs`.
