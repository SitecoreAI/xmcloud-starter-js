# Skills: Kirkland demo

## Purpose

This file provides a starter-specific capability view for the **kit-nextjs-kirkland** app. Use it with the repository skills map when assembling its law-firm pages with existing editor-safe components.

---

## Repository capability map

Use the repository-level skill areas as the primary capability reference:

**[Repository Skills (docs/Skills.md)](../../docs/Skills.md)**

---

## This starter in short

- **Focus:** A compact law-firm demo with lawyers, services, insights, careers, and offices.
- **Router:** Next.js App Router (`src/app/`).
- **Route pattern:** Catch-all at `src/app/[site]/[locale]/[[...path]]/page.tsx`; pass `site` and `locale` into layout fetch. Uses next-intl; config in `src/i18n/`.
- **Capabilities:** All repository skill areas apply. This app retains the location starter's broad component set, map support, editorial components, and GEO endpoints while applying a Kirkland-inspired presentation.

---

## Starter-specific notes

Apply all **When to use**, **How to perform**, and **Hard rules** from the [Repository Skills](../../docs/Skills.md) (Component Registration, Data Strategy, Local Dev, Editing & Preview, Routing, Project Structure). In this starter only:

- **Offices:** Prefer simple office cards for the demo. When a map is required, fetch location or layout data at the catch-all page and pass serializable data into the existing finder components.
- **Map and GEO:** Use this starter’s map and GEO integration patterns; pass only serializable data to client components. Do not add location/GEO fetches inside non-route components unless the starter already does so.
- **Component maps:** Use server map (`.sitecore/component-map.ts`) and client map (`.sitecore/component-map.client.ts`); register with the same name as in the layout.
- **Props sidecars:** Keep component props in sidecar files (`*.props.ts` / `*.props.tsx`) and exclude those files from component-map generation in `sitecore.cli.config.ts`. Regenerate maps after props-file changes and confirm sidecars are not registered as components.
- **Project structure:** `src/app/`, `src/components/`, `src/lib/`, `src/i18n/`; follow existing patterns for new finder or map components.
- **Local dev:** Copy `.env.remote.example` to `.env.local` in this folder; set XM Cloud and any GEO/API keys; run the dev server from this folder.

---

## Stop conditions (for this starter)

- App loads with the connected Kirkland XM Cloud site locally.
- Core Home, Lawyers, Services, News & Insights, Careers, Locations, and About pages render.
- Map integration works when the optional location finder is used.
- New/updated components resolve from component maps without binding errors.
- Editing and preview remain functional for finder and map components.

---

## Related

- [This starter's README](README.md)
- [Root README — How to run a starter locally](../../README.md#how-to-run-a-nextjs-starter-locally)
- [Root README — Getting started guide](../../README.md#getting-started-guide)
