# Optional RichText icons: native authoring contract

Status: optional `Default`/`BrandIcon` contract. This patch adds optional frontend rendering; native registration and bindings remain unchanged. Native visual acceptance remains pending; local SDK/browser fixture checks do not establish native binding or acceptance. Immutable v6 remains untouched.

## Existing Image and query

Reuse actual optional versioned Image field `icon` / **Icon**, ID `97E10D8C-DFEA-4CD1-8D34-6573D5F0FED7`, on RichText template `932869D2-552A-5963-984F-6FC3C1E8A4A8`, Content section `9593C942-D4FF-546B-A6D2-D73686FCF96B`. Parent reports this field independently reopened: Shared 0 / Unversioned 0, sort 500 after primaryLink 400, empty source/default/validation. Do not create another field or replay prior bindings.

RichText rendering `7956AAF8-596E-5405-85D5-721989505A95` already projects `icon: field(name: "icon") { jsonValue }` through ComponentQuery field `17BB046A-A32A-41B3-8315-81217947611B`. Keep id/heading/subheading/body/primaryLink and existing variables/selections. No further schema/query change is required for this extension. Per-owner live SDK Image/readback checks are still required.

## Exact frontend/authoring behavior

`Default` optionally renders the original `data.icon.jsonValue` through SDK Image before its existing heading in the introduction branch: gray `#3c3c3c` glyph on transparent background. Existing early `rich-text`/`disclosures` body-only returns remain unchanged. Keep complete heading, subheading, Body, primaryLink, anchors/headings and original theme/alignment/spacing/layout/other parameters.

`BrandIcon` is a named export delegating the **complete Default**: `(props: AllianzRichTextProps) => <Default {...props} brandIcon />`. `AllianzRichTextDefaultProps` adds only an internal `brandIcon?: boolean` prop. This produces a white glyph on a `#003781` circle. **brandIcon is not an authored field or rendering parameter.** Do not add a native brandIcon/iconAppearance control for RichText.

The scoped styling contract is `data-allianz-rich-text-icon="gray"|"brand"`, SDK Image class `allianz-rich-text-icon-glyph`, and `AllianzRichTextIcons.css`. Wrapper/glyph dimensions are 40/26 px below 704 px and 64/40 px from 704 px. Use `shouldRenderImageField(data.icon?.jsonValue,isEditing)`; retain the original field object, authored src/version query, alt (including empty alt), metadata and editability. A real cleared Image keeps its editor; missing/visitor-cleared Images produce no invented control, fallback or wrapper. Optional icon selection introduces no runtime asset URL/ID or page/owner/field-GUID dispatch.

All other variants, including the OfferFootnotes body-only prefilter, retain their current behavior. Do not substitute AAPlus/AboutInformationHeading or another specialized variant that drops Body or other source-owned fields.

## Current selectors and content to preserve

All four currently retain Default selector `DA435E21-954E-59E2-A33C-1E7A08A78FBF` / effective `FieldNames=Default`:

| Parent-supplied owner | Existing content that must survive | Future selector scope |
| --- | --- | --- |
| Benefits `1605592A-DB14-40F5-AD43-BC8BD39855A5` | Complete Body, including `#video` | Default |
| Features `556BEBDF-1D9E-4489-A6F0-0FA6B573D739` | All original fields/Body | Default |
| Allocation `5B34205A-E732-481F-8095-634134322B88` | Complete Body, including `#allocation-options` | Default |
| Questions `DADE857E-4A99-45FB-BF5D-1E7C8FCC4EA0` | Complete Body, including `<h3>Common questions:</h3>` | Only this placement may later select BrandIcon |

No selector/layout/field mutation occurs now. Parent's latest page revision snapshot is `9875220c-4d4c-4399-a7e1-8b65c063aafe`, including current CardGrid parameter changes. Its page ID is not supplied by this contract. Freshly resolve current page/effective placement/UID/datasource/revision before any separately coordinated save; preserve those CardGrid changes, order, placeholders, every other parameter and exact guards.

## Future native BrandIcon registration

1. Resolve existing Default item `DA435E21-954E-59E2-A33C-1E7A08A78FBF` and rendering `7956AAF8-596E-5405-85D5-721989505A95` in native CMS. Read the **actual existing RichText Headless Variants group path/ID**, group template and compatible child Variant Definition template. These identities/compatibility are not available locally; do not guess a path, group or template ID or create a parallel group.
2. Read that group's children for a `BrandIcon` name/case collision. Reuse a compatible existing definition only after verifying its actual identity and behavior. Do not overwrite an unrelated item.
3. If absent, use the supported normal native Variant Definition creation flow under that resolved group, exact child name **BrandIcon**, and verified compatible template. Accept its normal generated GUID; capture and independently reopen the item. The future variant GUID remains **unassigned** here.
4. Verify the definition resolves to the exact frontend named export and actual SDK `params.FieldNames="BrandIcon"`. Use the native variant selector and its supported raw layout representation; do not invent another authorable parameter.
5. Only the resolved Questions placement is a future binding candidate. Preserve its datasource/rendering UID/definition/order/placeholder, complete fields and every original parameter/guard. Benefits/Features/Allocation remain Default. Re-read current page revision/layout before saving; no full-layout replacement or replay.
6. Independently reopen the saved native definition/binding and verify actual SDK owner/Image metadata, selector, fields, original Body anchors/headings and preserved layout/guards. Then perform actual native Edit/visitor desktop/mobile QA. This document performs no registration or binding.

## Assets and remaining acceptance

These verified public URLs are **transport fixtures only**, not proof that any of the four owners is bound or visually accepted:

- List 124981: `https://thlt-demo.sitecoresandbox.cloud/api/public/content/5c1c69973d934b1cb5525bc3f42b0df0?v=729b203e`.
- Information 124967: `https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b64afa0fa0a4f7f87a12e01f2de3ca0?v=cba3d72e`.

LightBulb and LineGraph bindings remain **unproven/on hold**. Verify exact source geometry/alt/layout and native Content Hub Image values for each owner; do not infer an assignment or substitute a runtime asset. Preserve existing asset bindings. Native Image/selector readback and complete desktop/mobile visual/content/editor acceptance remain pending. No CMS, credential/browser/settings, asset upload, guard, publication or release action is part of this contract work.
