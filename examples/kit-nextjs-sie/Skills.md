# Skills: SiEnergy

## Purpose

This file records starter-specific constraints for the `kit-nextjs-sie` head
app. Repository-wide guidance remains in
[`../../docs/Skills.md`](../../docs/Skills.md).

## Starter-specific rules

- Keep the app isolated to the Sitecore site `kit-nextjs-sie` in the
  `utilities` collection.
- Reuse the copied component contracts and placeholder structure so authored
  layouts can parallel NW Natural without sharing datasource items.
- Treat the inherited `Nwn*`, `NWN_*`, and `nwn-*` implementation names as
  temporary compatibility contracts. Do not rename them independently of the
  related Sitecore variants, dictionary items, and placeholder settings.
- Build content-tree paths through `src/lib/site-path.ts`.
- Keep all visible text, links, phone numbers, account destinations, metadata,
  media references, and CDP form context specific to SiEnergy.
- Use Sitecore fields and Content Hub DAM assets for visible content. Do not add
  runtime fallback imagery or reference NW Natural datasource items.
- Preserve Page Builder editing behavior, keyboard accessibility, valid XHTML,
  and image alternative text.
- Regenerate component maps with the Content SDK tooling; do not edit generated
  `.sitecore` output manually.

## Current phase

Only the deployable head-app scaffold exists. SiEnergy styles and Sitecore
content are intentionally deferred until the rendering host and site are
available.
