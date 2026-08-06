# Skills: NW Natural Demo

## Purpose

This file provides a starter-specific capability view for the
**kit-nextjs-nwn** app. Use it with the repository skills map when building
editor-safe utility customer journeys and NW Natural presentation variants.

---

## Repository capability map

Use the repository-level skill areas as the primary capability reference:

**[Repository Skills (docs/Skills.md)](../../docs/Skills.md)**

---

## This starter in short

- **Focus:** Customer self-service, safety, residential and business resources,
  and NW Natural company storytelling.
- **Router:** Next.js App Router (`src/app/`).
- **Route pattern:** Catch-all at `src/app/[site]/[locale]/[[...path]]/page.tsx`; pass `site` and `locale` into layout fetch. Uses next-intl; config in `src/i18n/`.
- **Capabilities:** All repository skill areas apply. Site-specific presentation
  stays inside this head app; Sitecore items remain isolated beneath the NW
  Natural site collection and site.

---

## Starter-specific notes

Apply all **When to use**, **How to perform**, and **Hard rules** from the [Repository Skills](../../docs/Skills.md) (Component Registration, Data Strategy, Local Dev, Editing & Preview, Routing, Project Structure). In this starter only:

- **NWN variants:** Keep exports prefixed with Nwn and classes prefixed with
  nwn-. Preserve other variants so existing component definitions continue to
  resolve.
- **Site isolation:** Use kit-nextjs-nwn as the Sitecore site and utilities as
  the default collection. Build content-tree paths through src/lib/site-path.ts.
- **Data:** Reuse existing component field contracts whenever practical.
  Sitecore-authored links, text and images must remain editable in Pages.
- **NWN canonical components:** NwnUtilityAlert and NwnCardGrid require isolated
  Sitecore renderings/templates. The card-grid placeholder setting uses
  nwn-card-grid-{\*}; rendering instances resolve
  nwn-card-grid-{DynamicPlaceholderId}.
- **Component maps:** Use server map (`.sitecore/component-map.ts`) and client map (`.sitecore/component-map.client.ts`); register with the same name as in the layout.
- **Props sidecars:** Keep component props in sidecar files (`*.props.ts` / `*.props.tsx`) and exclude those files from component-map generation in `sitecore.cli.config.ts`. Regenerate maps after props-file changes and confirm sidecars are not registered as components.
- **Project structure:** src/app/, src/components/, src/lib/, src/i18n/; keep
  all NW Natural code inside this head app.
- **Local dev:** Copy .env.remote.example to .env.local in this folder, set the
  XM Cloud values, and run the dev server here. Do not commit a local
  environment file.

---

## Stop conditions (for this starter)

- App loads with connected XM Cloud content locally.
- NW Natural header, footer, hero, page header and promo variants resolve.
- Desktop and mobile navigation remain keyboard accessible.
- Empty fields remain editable in Pages and do not create broken media in
  normal mode.
- New/updated components resolve from component maps without binding errors.
- Editing and preview remain functional for finder and map components.

---

## Related

- [This starter's README](README.md)
- [Root README — How to run a starter locally](../../README.md#how-to-run-a-nextjs-starter-locally)
- [Root README — Getting started guide](../../README.md#getting-started-guide)
