# Kirkland demo site

This Next.js rendering host is a lightweight, Kirkland-inspired law-firm demo for Sitecore XM Cloud. It intentionally reuses the Alaris starter's existing components and Sitecore templates instead of introducing a bespoke component library.

The demo targets the recognizable structure of a large law-firm site—prominent editorial imagery, restrained typography, practices, lawyers, insights, careers, and offices—without attempting to reproduce kirkland.com exactly.

## Local development

1. Copy `.env.remote.example` to `.env.local`.
2. Add the XM Cloud values for `SITECORE_EDGE_CONTEXT_ID`, `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID`, and `SITECORE_EDITING_SECRET`.
3. Keep `NEXT_PUBLIC_DEFAULT_SITE_NAME` set to the exact Sitecore Site Grouping name, `kit-nextjs-kirkland`.
4. Keep `SITECORE_SITE_COLLECTION_NAME` set to the containing Sitecore collection, `legal`.
5. Install and run:

    ```bash
    npm install
    npm run dev
    ```

The application is available at `http://localhost:3000`.

## Deployment

The root `xmcloud.build.json` registers this app as the enabled rendering host `kit-nextjs-kirkland`. When split deployment is enabled, create an editing host with that exact name.

The deployed Sitecore site is named **kit-nextjs-kirkland** in the **legal** site collection. Its Site Grouping `RenderingHost` field must remain `kit-nextjs-kirkland`, and the Vercel environment variable `NEXT_PUBLIC_DEFAULT_SITE_NAME` must use that same exact value.

## Suggested Sitecore AI page composition

Keep the first demo deliberately small:

- **Home:** `GlobalHeader`, `PageHeader.FiftyFifty`, `TextBanner`, `MultiPromo` for practices, `PromoImage` for careers, another `MultiPromo` for insights, `CtaBanner`, and `GlobalFooter.BlackLargeVariant`.
- **Lawyers:** `PageHeader`, `MultiPromo` cards, with profile pages composed from `PageHeader.FiftyFifty`, `RichTextBlock`, and `AccordionBlock`.
- **Services:** `PageHeader`, `TopicListing`, and `AccordionBlock`.
- **News & Insights:** `PageHeader` and `MultiPromo`; detail pages use `ArticleHeader` and `RichTextBlock`.
- **Careers:** `PageHeader.FiftyFifty`, `PromoImage`, and `TestimonialCarousel`.
- **Locations:** office cards built with `MultiPromo`; detail pages use the image-backed `PageHeader.OfficeBanner`, office-specific `TextBanner` treatments, and a `CtaBanner`. Use `LocationSearch` only when a Google Maps key is configured.
- **About:** `PageHeader`, `TextBanner`, `RichTextBlock`, and `LogoTabs`.

The Sitecore AI Marketer MCP should populate and validate these pages after the rendering host has been deployed and its component map is available.

## Validation

Run from this folder:

```bash
npm run lint
npm run type-check
npm run test:unit
npm run build
```

## Documentation

- [Repository capability map](../../docs/Skills.md)
- [Sitecore Content SDK for XM Cloud](https://doc.sitecore.com/xmc/en/developers/content-sdk/sitecore-content-sdk-for-xm-cloud.html)
