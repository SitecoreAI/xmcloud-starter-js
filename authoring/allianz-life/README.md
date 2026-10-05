# Allianz Life native authoring model

The managed editing host uses the existing project and environment. Its build explicitly sets `deployItems.modules` to an empty array. An editing-host deployment must not replay structural items, overwrite authored content or import media. The isolated SCS module remains available for separately scoped, current-state structural validation and reviewed native changes. Never push the historical module wholesale to the live environment.

The preserved project is `7f3XlRhEqdT8l8FrbjQync`, renamed in place to `thlt-allianz-demo`; the CM environment is `56W3hhEUAQ5GLwsHAehRhe`. Display names can change; target checks use these stable identities. The existing Allianz site is `/sitecore/content/allianz/allianz-life`. Do not create another site or replace project/environment/editing-host slots. The user owns cleanup of the other old sites.

## Current authoring contract

Home uses eight fixed-purpose components: Homepage Hero, Olympic Partnership, Retirement Solutions Intro, Product Offerings, Retirement Goals Intro, Secure Future Feature, Helpful Resources and Product Disclosures. About uses Company Mission. These have small, relevant content fields and fixed presentation. Rich Text is a semantic field where needed, not an author-facing freeform layout component. Technical SDK component names and accepted native IDs remain stable.

All accepted Home rendering UIDs and datasource IDs were retained through migration. Preserve current user-authored HTML, deliberate blanks, complete Content Hub image XML, link XML and child identities. New author insertions should create purpose-typed data under that page's Data folder. Header/Footer are shared data composed through native partial designs; they are not ordinary Main insertions.

The historical `content-contract.json`, generated YAML and structure manifest describe the earlier generic extraction/bootstrap model. They are compatibility/source evidence, not the full current native model or a live rollback target. Locally regenerating them never authorizes applying them. Existing generic definitions and recovery child content stay until actual dependency analysis; generic Rich Text is excluded from the author toolbox.

## Bounded native rendering metadata reconciliation

`native-metadata/verified-rendering-metadata.json` records a separately reviewed
2026-10-04 native audit. The generator now reconciles 20 active historical
rendering paths by their existing IDs, seven English labels and nine icons.
Technical component names, query identifiers, datasource/parameter fields, all
491 item IDs and all existing references remain unchanged. This is a source
candidate only; complete current native item/dependency capture is still absent.
Do not replay the historical module. See `native-metadata/README.md` for exact
coverage, exclusions and safe regeneration.

## Validate safely

`validate-structure.py` validates the isolated historical source/YAML boundaries and optionally invokes the scoped SCS validator. It does not establish tenant query compatibility, native field editability, content completeness or deployment readiness. Its target schema must come from the preserved project/environment. Keep an explicit empty build module list even when running a read-only SCS validation.

Use small current-state native changes with exact item/template/field identities, fresh reads before writes, and independent readback. Save recovery exports and receipts outside the public checkout. Never restore authored content from historical fixtures or delete/recreate a target to match generated identities.

## Images and integrations

Images use the existing Content Hub integration at `thlt-demo.sitecoresandbox.cloud`, with the Allianz brand and approved uncropped/unresized Original delivery links. Keep original SHA/dimensions and native DAM selection XML. Existing Media Library references remain until each replacement is verified through the real selector and browser. Documents/fonts are a separate requirement. Do not use serialized media uploads as the ongoing large-scale image workflow.

`prepare-import.py` creates source candidates and exceptions; `import-planner.py` preserves unowned fields, current author edits and actual native-created identities. Native authored HTML and serializer values must be preserved. Source Rich Text cleanup removes only the extractor's synthetic unavailable-link attribute, retaining its href/title/copy and working mock modal.

## Native workflow acceptance

The current Home render, relevant fields, all eight Default selectors,11 images and modern source breakpoint checks have actual browser proof. Company Mission has actual native edit/render proof. That does not complete all357 routes or establish new toolbox insertion, Page Branch cloning or public delivery. Report each stage separately.

The three Home palette categories contain2/4/2 fixed purposes. Main additions preserve unrelated current controls until a separately reviewed restriction is appropriate. Verify the actual Pages gallery, drag insertion, local datasource creation, sensible field labels/icons/thumbnails, child insert options and save/full reload. Page Branches use existing page templates, native designs and independent copies of local data. Verify their actual insertion rules and publication rather than fabricating rule/template-map encodings.

Published-site and Page Builder browser checks remain mandatory: content edit/save/reload/publish, responsive layout at real source boundaries, navigation/search/forms, complete collections and loaded original images. Mock integrations never authenticate or submit to real Allianz services. Analytics stays disabled and demo delivery stays noindex. Native UTM/affinity personalization and the independent unpersonalized-page A/B test require their own tenant configuration and browser proof.

Official references:

- [SitecoreAI content serialization](https://doc.sitecore.com/sai/en/developers/sitecoreai/sitecore-content-serialization/sitecore-content-serialization.html)
- [Build module selection](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/the-sitecoreai-build-configuration.html)
- [Data sources](https://doc.sitecore.com/sai/en/developers/sitecoreai/content-modeling-and-presentation/data-sources.html)
- [Page Branch creation and insertion](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/building-page-templates-and-branches/create-and-configure-a-page-branch.html)
