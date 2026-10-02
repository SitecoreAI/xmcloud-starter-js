# Product FAQ Intro

The fixed source introduction uses a centered `h3`, `m-axlIntroductionBlock -is--stacked -no--image`, a `u-margin-bottom-lg u-padding-top-lg` row and `tileIcon t-bg-primary-brand t-icon-primary-white`. The only rendering parameter is `RenderingIdentifier`.

## Author contract

| Item | Field | Author label | Sitecore type |
| --- | --- | --- | --- |
| Root datasource | `heading` | FAQ heading | Single-Line Text |
| Root datasource | `icon` | FAQ icon | Image |

`product-faq-intro.graphql` is the named `ProductFaqIntroData` query and requests exactly root `id`, `heading` and `icon`. The runtime accepts those canonical root fields only. It does not promote legacy children or images or restore cleared content.

The intended datasource reuses actual child identity `c6260944-ffe4-4af6-9077-d1e5a59b36e1`, currently `/sitecore/content/allianz/allianz-life/Home/what-we-offer/annuities/Data/AllianzCardGrid 08/Entry 01`. Its verified heading is “Frequently asked questions”. `__tests__/product-faq-intro.receipt.json` preserves the complete existing child receipt and the old empty generic collection root `c8b126fd-337f-48ec-80a3-4aa490493f12` separately. It also includes the intended canonical fixture representation; that representation is not a claim that the native template or bindings have already changed.

The question icon remains `pendingContentHub`. `SOURCE-REVIEWED-PLAN.json` identifies the pending field as `icon`, with historical field ID `233f9efc-e990-5e8c-8f9c-7db449482d49` and media candidate `42314e16-d0b6-56ff-878a-0a1ceef1101b`. The exact pending plan entry is preserved in the fixture. The receipt's blank generic `image` field is unrelated to that pending icon. No binary or invented fallback URL is delivered here. After Content Hub mapping and approved native field setup, authors bind `icon` to the delivered asset. The rendering uses real SDK `Image`, with scoped 26px/40px image width and a white filter matching source SVG styling. Real cleared fields retain their SDK metadata and editing chrome.

Exact recovered reference: `/workspace/scratch/19d699b9a9db/annuity-audit-input/source/99f6a498352a3445.html`, lines 925–943; copied source evidence is in `__tests__/product-faq-intro.source.html`. Receipt: `/workspace/scratch/19d699b9a9db/annuity-audit-input/Allianz-Life-Annuities-Native-Draft-Readback-2026-10-01/ANNUITIES-NATIVE-DRAFT-RECEIPT.json`.

Real SDK SSR coverage runs via `node --test src/components/product-faq/__tests__/product-faq.test.mjs`. Native template creation or change, component registration, route adoption, authoring and connected rendering QA, and publication remain separate steps.
