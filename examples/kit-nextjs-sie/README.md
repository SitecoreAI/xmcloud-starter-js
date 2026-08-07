# SiEnergy Site (Next.js) - kit-nextjs-sie

## Overview

This head application is the independent SiEnergy counterpart to
`kit-nextjs-nwn`. It begins with the same component contracts, rendering
variants, placeholders, responsive layout patterns, forms, search experience,
and accessibility behavior so the two utility sites can evolve in parallel.

The app is intentionally isolated as the Sitecore site and rendering host
`kit-nextjs-sie`. Its runtime styling, routes, navigation fallbacks, search,
metadata, contact experience, and customer-facing language follow the SiEnergy
brand and public information architecture.

Internal `Nwn*` variant and `nwn-*` CSS names are retained during this initial
deployment phase because they are implementation contracts, not displayed
content. They can be renamed later only if the corresponding Sitecore rendering
variants and placeholder settings are migrated at the same time.

## Current scope

- Independent npm and Content SDK app name: `kit-nextjs-sie`
- Independent default Sitecore site: `kit-nextjs-sie`
- Default Sitecore collection: `utilities`
- XM Cloud rendering-host entry: `kit-nextjs-sie`
- `SIE_SITE_CONTENT.json` defines the approved page, navigation, metadata,
  component, and datasource blueprint for the Sitecore content tree
- `assets/` contains the earth-tone DAM handoff and placement guidance
- `public/assets/sie-images/` contains official SiEnergy identity assets used by
  the application shell
- No local environment files, dependencies, caches, or generated build output
  are committed

## Run locally

1. Copy `.env.remote.example` to `.env.local`.
2. Populate the Sitecore environment values without committing `.env.local`.
3. Run `npm install`.
4. Run `npm run dev`.

For a remote deployment, set `NEXT_PUBLIC_DEFAULT_SITE_NAME=kit-nextjs-sie`
along with the Sitecore Edge context and editing secret supplied for the
environment.

## Sitecore authoring

Create the SiEnergy page tree and site-owned datasources from
`SIE_SITE_CONTENT.json`. Keep image fields empty until the matching files in
`assets/` have been uploaded to Content Hub DAM. Never reference datasource
items from the NW Natural site.
