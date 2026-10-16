# CardGrid icon appearance authoring contract

The parent/cloud owner independently reopened the native schema, sole CardGrid rendering assignment and three appearance additions listed below. Exact native SDK/Edit/visitor visual acceptance remains outstanding. This document adds no runtime behavior or schema serialization.

## Native schema and assignment

| Item | Actual native identity |
| --- | --- |
| AllianzCardGridParameters | `48B1A3E0-5BEF-47B0-B1B4-04C381CEA6A6` |
| Direct bases, in order | `E01E61F7-ACA5-5A55-A517-2C84EFF33FC5` then `5483EB83-D7B1-411D-8DF5-9A4070B10A39` |
| Card icon section | `399CEC10-CE92-48A9-A8B1-23C504C5EB80` |
| Optional Droplist `iconAppearance` | `74619EB9-1444-4A4E-88D0-F7064AD8C765` |
| Option folder | `109F0FE0-47DE-45A8-84AC-F2ED6872220D` |
| Literal `white-on-black` | `C7211DA5-1D03-4712-9C00-CCBE64E3A26B` |
| Literal `gray-on-transparent` | `D9634A3E-07CC-4CDE-B254-08FF0A9937C1` |
| AllianzCardGrid rendering | `EA0674F1-31A1-540C-8622-91399E29FFE0` |
| Parameters Template assignment field | `A77E8568-1AB3-44F1-A664-B7C37EC7810D` → `48B1A3E0-5BEF-47B0-B1B4-04C381CEA6A6` |

The template is `/sitecore/templates/Project/Allianz Life/Rendering Parameters/AllianzCardGridParameters`, revision `ece4523f-6d63-4d5f-98d5-0c8ba89a3ccd`. The assignment revision is `a10b0c69-ff28-4fd5-b126-bdb362f67fde`; its reported diff is only ParametersTemplate plus automatic metadata. The Droplist source is `/sitecore/system/Settings/Project/Allianz Life/Rendering Options/iconAppearance`; its default is blank and it is optional.

The additive bases retain E01 directly and add AllianzEditorialParameters (`5483…`), which itself directly inherits `1930BBEB-7805-471A-A3BE-4858AC7CF696` and E01. The parent reopened all 21 Allianz and 10 Editorial inherited controls once, with no duplicate effective names. These are parent-reported counts, not a total field count across SXA/system bases; no separate field-ID deduplication receipt was supplied. Preserve every inherited control, default and original parameter. Do not copy/remove fields or change the shared bases. The rendering YAML's historical E01-only assignment and the historical 28 local references do not describe current native assignments.

Only CardGrid's assignment changed. Preserve Article's `5483EB83-D7B1-411D-8DF5-9A4070B10A39` and Video/Accordion's `FCE5A9CF-4913-48FB-93B0-D628DEDEA6C8`, plus every other actual assignment.

## Finite runtime behavior

Only `Default` and `EditorialStacked` consume the exact, case-sensitive literals `white-on-black` and `gray-on-transparent`. Default applies the treatment when its existing card-icon block renders; EditorialStacked mounts that block before the header only for a recognized value. The parameter does not add icons to Default's list/cards branches. Other exports retain their existing behavior. The native parameter control is assigned at rendering level, not separately per variant.

`white-on-black` uses a white monochrome glyph on a `#3c3c3c` circle; `gray-on-transparent` uses a `#3c3c3c` glyph on transparent. Below 704px the wrapper/glyph are 40/26px; at 704px and above they are 64/40px. Blank, absent or unknown values retain prior output and `card.iconTheme` behavior. Do not change the existing datasource `iconTheme` to activate this parameter.

## Field and query contract

Keep the existing ComponentQuery (field `17BB046A-A32A-41B3-8315-81217947611B`), its variables and root `id`, heading, subheading, body and primaryLink selections. Its child projection already supplies icons:

```graphql
children(first: 40) {
  total
  pageInfo { hasNext endCursor }
  results { id fieldCollection: fields { name jsonValue } }
}
```

`allianzCardFields` projects `icon` and `iconTheme` case-insensitively, preserving original SDK field objects. Pass `card.icon.jsonValue` unchanged to SDK Image, including authored Content Hub URL/version, alt (including empty alt), metadata and editability. A real cleared Image retains its Edit control; an absent field creates no synthetic control or fallback. Keep `card.image` and footer/navigation `item.icon` separate. `iconAppearance` comes from effective rendering parameters, not a datasource query selection. No icon-specific query addition is needed locally.

## Verified scope and remaining acceptance

The parent independently reopened these three Final-rendering parameter additions; all other page fields/layout bytes and guards at `1` were preserved:

| Placement label | Literal value | Page revision |
| --- | --- | --- |
| Legal | `white-on-black` | `fa7cb7de-43e2-46ac-b038-4bfe7ee7d554` |
| Privacy | `white-on-black` | `8ac7b776-41ec-469e-9398-87ba48276f5d` |
| Accumulation Advantage Resources | `gray-on-transparent` | `9875220c-4d4c-4399-a7e1-8b65c063aafe` |

These labels/revisions do not supply page IDs or placement UIDs; none are inferred here. Getting Started's three gray placements remain separate, with effective-UID verification pending. Local actual-SDK regressions and source-color/geometry fixtures do not establish exact native Edit/visitor visual acceptance. Verify the actual SDK payload, effective variant/parameters, authored fields and desktop/mobile output before claiming that acceptance. Do not replay existing bindings.
