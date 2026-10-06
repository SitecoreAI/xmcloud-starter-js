# Code-owned migration forms

The Allianz migration's form controls, source copy, options, validation and demonstration outcomes are developer-managed. Page composition and surrounding editorial content remain native Sitecore content. Existing CMS form items are retained but cannot override these definitions.

## Inventory and selection

`migration-forms.json` contains all 12 captured `AllianzForm` placements across 11 routes. It records exact fixture and verified native identity aliases, source-hidden placement, and static copy. The source inventory and activation receipts distinguish fixture provenance from native readbacks. `source-schemas.json` contains the captured claim, general NY contact, NY/main product-interest and safe generic-search controls.

Resolution uses:

1. An explicit `params.formId` matching one manifest ID
2. An exact known rendering UID or datasource identity, checked against known route context
3. A single exact native route item ID or public/native `context.itemPath` match

A page with two forms requires an instance identity or explicit `formId`. Unknown, contradictory, and ambiguous configurations fail safely. Browser pathname, substring route guessing, CMS schema keys and CMS child fields are never used. This works independently of the browser's `/api/editing/render` URL. `formId` is a runtime rendering-parameter contract, not a newly installed Page Builder picker.

| Form ID | Source placement | Contract |
|---|---|---|
| ny-product-details-inquiry | NY Index Advantage+ overview | 7 definitions; preset reason/product hidden; 5 visible contact inputs |
| ny-product-details-interest | Same overview, second form | NY product interest; 3 choices |
| ny-product-prospectus | NY Index Advantage+ prospectus | NY product interest; 3 choices |
| ny-contact | NY contact-us | 9 fields with reason-dependent firm/product/category branches |
| ny-death-claim | NY report-a-death | 44 definitions; 1–20 policy fields |
| ny-search | Historical NY search extraction | 3 safe scalar controls; routed site search remains separate |
| death-claim | Main report-a-death | 44 definitions; 1–20 policy fields |
| product-income-adv-prospectus | Income ADV prospectus | Main product interest; 11 choices |
| product-plus-income-prospectus | Plus Income prospectus | Main product interest; 11 choices |
| product-plus-nf-prospectus | Plus NF prospectus | Main product interest; 11 choices |
| product-plus-select-income-prospectus | Plus Select Income prospectus | Main product interest; 11 choices |
| product-plus-prospectus | Plus prospectus | Main product interest; 11 choices |

Product forms have five logical fields rather than historical per-checkbox extraction counts. Other is independent and optional. Source-hidden NextSteps stay hidden; static configuration is not permission to expose them. Ancestor Page Builder shells retain their existing source visibility.

A keyed form instance discards prior sample state on placement/form changes. Claim/contact/product entry, validation, review, edit, reset, and success/failure are local demonstrations. No request, persistence, authentication or production submission is performed. Use synthetic sample information only.

## Other input controls

- The retirement calculator uses the fixed three `RETIREMENT_INPUTS`. Surrounding heading/body/disclaimer remain editable. No verified financial formula exists, so validation produces an unavailable-result message rather than a numerical claim
- Reusable search controls and result copy are code-owned; surrounding heading/body remains editable. Existing app-routed search and header controls were already code-owned
- Disabled document-service login fields use fixed source copy. They remain nameless and disabled. The surrounding account/contact/social rail content remains editable
- The standalone account-access mock remains disabled and code-owned

## Native activation

The serialized Form rendering now records an empty `ComponentQuery` as the intended steady state. Do not import the whole serialized item during this rollout: its other authoring metadata may differ from native state.

Deploy and verify the code first, then canary the existing route07 placement with the original native query untouched to demonstrate datasource-envelope independence. After that proof, the native owner may back up and clear only `ComponentQuery` on existing rendering `03243A2C-97E5-54B8-B60C-2F94B98675A1`, save, and verify the actual layout/component in the existing editing host. Keep all CMS form items, bindings, templates, and child data. Existing known placements need no new parameter. Unknown future placements must receive an explicit code configuration/manifest mapping.

This source change alone does not establish native publication, Page Builder acceptance, production integration, or datasource-free creation of a new component placement.


## Authoring contract and optional binding cleanup

The Content panel may still display retained legacy form datasource fields while a native placement is bound to that item. These fields are ignored by the new runtime. Forms are developer-managed; edit surrounding page content through its own native components.

After the unchanged-query canary succeeds, the owner can remove the active Form placement's datasource binding without deleting the datasource or children:

1. Capture the exact page ID, Form rendering UID, placeholder, parameters, current datasource GUID and saved layout before changing anything
2. Confirm this placement resolves with `fields` absent and `dataSource` blank using an exact known rendering UID/native route identity. For an unknown or ambiguous placement, first provide an explicit manifest `formId`; do not infer one from its old CMS schema key
3. Clear the obsolete Form ComponentQuery separately, with backup/readback, then clear only that verified placement's datasource property in the existing native rendering editor. Preserve rendering UID, placeholder, ordering, variants, all other parameters and all CMS items
4. Save/reload and check Page Builder and visitor output. Hidden NextSteps remain hidden; surrounding metadata and editability must still work. Confirm the Content panel no longer encourages editing obsolete form fields
5. If the rendering editor requires a datasource or selector proof is missing, stop the binding cleanup and leave the retained binding intact. Do not modify shared datasource templates/locations or auto-datasource settings to force it

Rollback binding cleanup by restoring that same saved datasource GUID to that same rendering UID and preserving the rest of its layout. Restore the exact saved native query only if it was separately cleared. The source packet does not perform any of these native operations.

The Layout completeness guard exempts only the unused `fields` subtree of an exact `AllianzForm` rendering. It still checks unrelated components, the form's own other properties, and nested rendering placeholders. This prevents stale/truncated legacy Form query payloads from blocking a static form's containing page without weakening surrounding content guards.
