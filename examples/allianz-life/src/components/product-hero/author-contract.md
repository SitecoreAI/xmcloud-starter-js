# Annuities component author contract

These components implement fixed, source-backed sections from the captured Annuities page. Authors edit content and order collection children. Typography, heading tags, orientation, spacing, colors and column counts belong to the named component variant. `RenderingIdentifier` is the only rendering parameter.

This source work does not adopt or publish a native page. The historical 39-item receipt supplies existing identities and literal values; action-time native readback, any template transition and connected authoring/browser QA remain separate work. Keep all 39 native items. Unused generic collection roots and navigation references are not deletion targets.

## Purpose fields

| Purpose | Location | Internal name | Author label | Type |
| --- | --- | --- | --- | --- |
| ProductHero | Root | heading | Headline | Single-Line Text |
| ProductHero | Root | image | Hero image | Image |
| ProductIntroduction | Root | heading | Section heading | Single-Line Text |
| ProductIntroduction | Root | body | Introduction text | Rich Text |
| ProductBenefits | Child | heading | Benefit heading | Single-Line Text |
| ProductBenefits | Child | body | Benefit description | Rich Text |
| ProductBenefits | Child | icon | Benefit icon | Image |
| ProductTypeChoices | Child | heading | Product type heading | Single-Line Text |
| ProductTypeChoices | Child | body | Product type description | Rich Text |
| ProductTypeChoices | Child | image | Product type image | Image |
| ProductTypeChoices | Child | link | Learn more link | General Link |
| ProductFaqIntro | Root | heading | FAQ heading | Single-Line Text |
| ProductFaqIntro | Root | icon | FAQ icon | Image |
| ProductFaq | Child | question | Question | Single-Line Text |
| ProductFaq | Child | answer | Answer | Rich Text |
| ProductFootnotes | Root | body | Footnote text | Rich Text |
| ProductRiskDisclosures | Root | body | Risk disclosure text | Rich Text |

ProductBenefits, ProductTypeChoices and ProductFaq roots have no authored content fields. Their queries use `fieldCollection: fields { name jsonValue }` and retain ordered native children, their SDK field objects, `total` and `pageInfo`. Incomplete collections fail closed. Empty canonical fields remain empty; no component restores old content over a cleared field.

Their pure projections live in `product-benefits-fields.props.ts`, `product-type-choices-fields.props.ts` and `product-faq-fields.props.ts`. The existing CLI excludes `*.props.ts` sidecars from component discovery. These helpers are field contracts, not renderings.

## Existing identity and source sequence

| Position | Purpose / variant | Existing native datasource ID |
| --- | --- | --- |
| 1 | Existing Breadcrumbs | a4751d16-2427-41b2-a34b-71bd92ba5c4d |
| 2 | ProductHero / Default | 789e3c9c-689a-4115-9077-3e3dcce20804 |
| 3 | ProductIntroduction / Default | 7e20a874-bbef-4272-bcb1-8ff2be81c4c4 |
| 4 | ProductBenefits / Default | a4d02aa9-3981-42b0-990b-0b403b3baa05 |
| 5 | ProductBenefits / TwoUpFinal | 0c113246-9fc9-4721-a7db-988be486fe8f |
| 6 | ProductIntroduction / Blue | 65fad7e9-896f-4146-b005-920963fd6f67 |
| 7 | ProductTypeChoices / Default | 7c2db29f-59ae-4ecf-ad89-555bd39476c1 |
| 8 | ProductFaqIntro / Default | c6260944-ffe4-4af6-9077-d1e5a59b36e1 |
| 9 | ProductFaq / Default | 6e889a7e-d7be-4abd-a4fc-d8ac0a5b2126 |
| 10 | ProductFootnotes / Default | 149ade89-a5ae-410b-b034-ad116b329d33 |
| 11 | ProductRiskDisclosures / Default | 2c5a9453-93d5-463b-8e77-65513d357a6e |

The FAQ introduction uses the existing child that owns its content. The empty old generic root `c8b126fd-337f-48ec-80a3-4aa490493f12` remains preserved. The seven FAQ child identities also remain unchanged; their existing `heading` and `body` values map to `question` and `answer` without rebuilding SDK field metadata.

The Annuities source has two two-column benefit rows with h4 headings and md text. The second row has fixed bottom spacing. ProductBenefits / ThreeUp is separately supported by the adjacent FIA and RILA source captures, with h3 headings and md text; it is not the Annuities layout.

## Pending images and value preservation

Nine historical image fields and eight source binaries remain pending Content Hub delivery. ProductHero replaces duplicate desktop/mobile controls for the same source picture with one `image` field. Preserve the existing Hero item ID and move only a verified mapped value when available. ProductBenefits and ProductFaqIntro use their actual `icon` fields; the unrelated blank generic `image` fields do not supply those icons. ProductTypeChoices uses one image per child. No runtime component inserts a substitute image.

The evidence fixtures preserve literal native rich-text strings, including the existing unavailable-service links inside risk disclosures. The General Links in product choices use the existing safe-link helpers and retain original SDK metadata in editing mode. The source captures remain test references, not runtime content fallbacks.
