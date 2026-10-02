# Product FAQ

The source fixes this component's light accordion, transparent background, outer `u-padding-bottom-xl` row, 10-column large-screen content width, and inner `u-padding-bottom-md`. Authors edit content, not the design. The only rendering parameter is `RenderingIdentifier`.

## Author contract

| Item | Field | Author label | Sitecore type |
| --- | --- | --- | --- |
| Collection root | None | Product FAQ | No content fields |
| Ordered child | `question` | Question | Single-Line Text |
| Ordered child | `answer` | Answer | Rich Text |

`product-faq.graphql` is the named `ProductFaqData` query. It requests root identity and up to 40 ordered children using `fieldCollection: fields { name jsonValue }`, with `total` and `pageInfo { hasNext endCursor }` to expose truncation. Rendering requires a child array and completeness metadata. Incomplete or missing connections render nothing for visitors and a clear status for editors. A verified zero-child connection remains an authored empty list.

`productFaqFields` maps the existing children's `heading`/`body` fields to `question`/`answer` without rebuilding their SDK JSON objects. Explicit canonical properties, including clears and `undefined`, take precedence. Canonical compact fields precede historical aliases, and directly supplied historical fields precede their compact equivalents. Item identity, complete field metadata and the original collection are preserved.

The helper lives in `product-faq-fields.props.ts`, which the existing CLI excludes from component discovery. Only `ProductFaq.tsx` supplies the rendering.

The seven draft child IDs and their verified values are in `__tests__/product-faq.receipt.json`; the existing collection root is `6e889a7e-d7be-4abd-a4fc-d8ac0a5b2126`. The fixture is a receipt-derived representation, not a claimed Edge SDK readback: the receipt does not contain native field metadata.

## Behavior and evidence

Native buttons preserve keyboard activation and multiple independently open panels. `useId` plus child identity and position keeps trigger and panel IDs unique across repeated instances, including repeated source item IDs. Editing opens all real fields and retains cleared-field SDK chrome. A cleared question does not create an unlabeled toggle; any remaining answer stays visible. Local CSS only adapts panel visibility from source JavaScript to React state; source typography and spacing remain in control.

Exact recovered reference: `/workspace/scratch/19d699b9a9db/annuity-audit-input/source/99f6a498352a3445.html`, lines 946–1050. `__tests__/product-faq.source.html` retains the source FAQ container byte content after newline normalization. Receipt: `/workspace/scratch/19d699b9a9db/annuity-audit-input/Allianz-Life-Annuities-Native-Draft-Readback-2026-10-01/ANNUITIES-NATIVE-DRAFT-RECEIPT.json`.

The real SDK SSR tests are self-contained in this directory and also cover Product FAQ Intro. Run `node --test src/components/product-faq/__tests__/product-faq.test.mjs` from the starter root. Component registration, native template changes, route adoption and publication are separate integration steps.
