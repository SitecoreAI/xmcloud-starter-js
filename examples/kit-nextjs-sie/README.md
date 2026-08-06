# SiEnergy Site (Next.js) - kit-nextjs-sie

## Overview

This head application is the independent SiEnergy counterpart to
`kit-nextjs-nwn`. It begins with the same component contracts, rendering
variants, placeholders, responsive layout patterns, forms, search experience,
and accessibility behavior so the two utility sites can evolve in parallel.

The app is intentionally isolated as the Sitecore site and rendering host
`kit-nextjs-sie`. SiEnergy styling, routes, authored content, media, navigation,
and component datasource items will be added after the new Sitecore site is
deployed.

Internal `Nwn*` variant and `nwn-*` CSS names are retained during this initial
deployment phase because they are implementation contracts, not displayed
content. They can be renamed later only if the corresponding Sitecore rendering
variants and placeholder settings are migrated at the same time.

## Current deployment scope

- Independent npm and Content SDK app name: `kit-nextjs-sie`
- Independent default Sitecore site: `kit-nextjs-sie`
- Default Sitecore collection: `utilities`
- XM Cloud rendering-host entry: `kit-nextjs-sie`
- No SiEnergy Sitecore page tree or datasource content is included yet
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

## Next phase

After the rendering host is deployed and the `kit-nextjs-sie` Sitecore site is
available, create the SiEnergy page tree, navigation, global header and footer,
component datasources, search index, metadata, workflow assignments, and
Content Hub DAM references. The existing NW Natural content tree must not be
used as a datasource for this app.
