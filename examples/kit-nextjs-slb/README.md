# SLB XM Cloud rendering host

## Overview

This Next.js rendering host powers the bilingual SLB site in Sitecore XM Cloud. It uses the Sitecore Content SDK, supports English and Spanish (Mexico), and preserves full Page Builder editing and preview behavior.

The app also contains a route-aware SLB presentation layer. When a known Sitecore route exists but has no components in its `headless-main` placeholder, the app renders approved localized content and local Content Hub assets. As soon as authors add a presentation component, normal Sitecore rendering takes precedence.

## Local development

1. Copy `.env.remote.example` to `.env.local`.
2. Populate the Sitecore environment values, including `SITECORE_EDGE_CONTEXT_ID`, `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID`, and `SITECORE_EDITING_SECRET`.
3. Keep `NEXT_PUBLIC_DEFAULT_SITE_NAME=slb` and `SITECORE_SITE_COLLECTION_NAME=SLB`.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

The app is available at [http://localhost:3000](http://localhost:3000).

## Useful commands

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

To regenerate the route-aware content bundle from an approved content model:

```bash
npm run content:fallback -- /absolute/path/slb-site-content.json
```

## XM Cloud editing host

The root `xmcloud.build.json` registers this app as the `slb` editing host. In split deployment configurations, select that entry and connect it to the intended authoring environment. Site mappings and rendering-host items are managed by XM Cloud.

## Documentation

- [Starter capability map](Skills.md)
- [Sitecore Content SDK for XM Cloud](https://doc.sitecore.com/xmc/en/developers/content-sdk/sitecore-content-sdk-for-xm-cloud.html)
