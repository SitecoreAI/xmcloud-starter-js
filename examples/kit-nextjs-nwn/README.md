# NW Natural Site (Next.js) - kit-nextjs-nwn

## Table of Contents

- [Overview](#overview)
- [Content and asset handoff](#content-and-asset-handoff)
- [Developer Expectations](#developer-expectations)
- [Preconditions](#preconditions)
- [Build and run site locally](#build-and-run-site-locally)
- [Add Editing host to XM Cloud](#add-editing-host-to-xm-cloud)
- [Documentation](#documentation)

## Overview

This head application powers an NW Natural customer experience inspired by
the public utility website. It focuses on high-value customer journeys:
account and billing tasks, starting or transferring service, natural gas safety,
energy-saving resources, and the company's Pacific Northwest story.

The app maps the seeded components' `Default` exports to NW Natural
presentations while preserving the underlying starter presentations as named
variants. This keeps existing rendering instances and Sitecore field contracts
usable while isolating the NW Natural site from other sites deployed to the same
XM Cloud environment.

## Content and asset handoff

- [`NWN_SITE_CONTENT.json`](NWN_SITE_CONTENT.json) is the source-of-truth brief
  for the 18-page information architecture, page copy and calls to action.
- [`public/assets/nwn-images/README.md`](public/assets/nwn-images/README.md)
  maps every generated image to its intended page, component, alt text,
  focal point and suggested Content Hub DAM name.
- [`../../authoring/items/nwn-site.module.json`](../../authoring/items/nwn-site.module.json)
  scopes Sitecore serialization to the NW Natural site, project templates,
  renderings and placeholder settings.

The serialization module currently registers those scopes only; it does not yet
contain a serialized YAML item tree. The MCP-authored items remain live Drafts
in the current Sitecore environment because a serialization pull could not be
completed without a reachable Authoring CM and Sitecore CLI authentication.
Before treating the repository as a reproducible deployment source, run an
authenticated serialization pull, commit the resulting YAML, and publish the
items needed by the public site.

The local images are DAM upload sources for authoring. After uploading them to
Content Hub, assign the corresponding image fields in Page
Builder using the asset map and publish the authored items before launch.

## Developer Expectations

- Tailwind-based styling (Shadcn)
- NW Natural color and typography foundation using open-source DIN substitutes
- Page Builder variants for header, footer, hero, page headers and promo cards
- Modular components with editor-safe fields and responsive behavior
- Localization support for English (en) and Canadian English (en-CA)

## Preconditions

1. You have deployed your XM Cloud environment already. If not follow this link: [Deploy a Project and Environment](https://doc.sitecore.com/xmc/en/developers/xm-cloud/deploy-a-project-and-environment.html)

## Build and run site locally

1. Clone the repository (if not yet done)
   `git clone https://github.com/Sitecore/xmcloud-starter-js`
2. Starting from the root of the repository navigate to site app folder
   `cd examples\kit-nextjs-nwn\`
3. Copy the environment file `.env.remote.example`
4. Rename the copied file to `.env.local`
5. Edit `.env.local` and provide a value for `SITECORE_EDGE_CONTEXT_ID`, `NEXT_PUBLIC_DEFAULT_SITE_NAME`, `NEXT_PUBLIC_SITECORE_EDGE_CONTEXT_ID`, `SITECORE_EDITING_SECRET`. (More info: [Environment variables in XM Cloud](https://doc.sitecore.com/xmc/en/developers/xm-cloud/get-the-environment-variables-for-a-site.html)) Request-time metadata derives its public origin from trusted `Host`/`X-Forwarded-*` headers when `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BASE_URL` are unset. Set one of those URL variables for static generation or any host that does not supply the forwarding headers; production never falls back to localhost.

6. Install dependencies:
   from `kit-nextjs-nwn` run `npm install`
7. Run the site locally:
   `npm run dev`
8. Access the site:
   Visit http://localhost:3000 in your browser.

## NW Natural Page Builder variants

The existing `Default` rendering variants resolve to NW Natural presentations
for GlobalHeader, GlobalFooter, Hero, ImageCarousel, PageHeader and
ProductListing. These named variants are also available for explicit authoring:

- GlobalHeader / Nwn
- GlobalFooter / Nwn
- Hero / NwnHome
- ImageCarousel / NwnResources (NwnHome remains an alias)
- PageHeader / NwnEditorial
- ProductListing / NwnResources
- MultiPromo / NwnQuickActions
- MultiPromo / NwnCards

These variants preserve the existing Sitecore field contracts. Multi Promo
items may additionally expose their existing description field; both NW Natural
variants remain usable when that field is empty.

The app also exposes two NW Natural-only canonical components:

- NwnUtilityAlert for information, service and emergency notices
- NwnCardGrid with the dynamic placeholder key nwn-card-grid-{DynamicPlaceholderId}

Hero / NwnHome recreates the live homepage's four-slide feature, account panel
and three overlapping customer task cards. The carousel uses Sitecore-authored
fields for every slide, including Content Hub images.

ImageCarousel / NwnResources is a distinct customer-resources carousel. Its
authored background text supports the format Title||Description. The component
renders only authored imagery; it does not substitute local assets.

## Add Editing host to XM Cloud

If you have not enabled the split deployment feature your editing hosts are automatically created based on the xmcloud.build.json if enabled is set to true. The following steps are not required. Only if you have enabled the split deployment feature, continue with the next steps.

1. Go to Sitecore Cloud Portal https://portal.sitecorecloud.io
2. Open XM Cloud Deploy
3. Select Project that has been deployed
4. Switch to tab "Editing Hosts"
5. Click "Add editing host"
6. Provide Editing host name `kit-nextjs-nwn` as per xmcloud.build.json
7. Check if the link to authoring environment is set correctly (should be by default)
8. Check if the source code provider is set correctly (should be by default)
9. Check if the GitHub Account is set correctly (should be by default)
10. Check if repository is set correctly (should be by default)
11. Check if Branch is set correctly (should be by default)
12. Set the Auto deploy option (recommended)
13. Confirm the editing host forwards the public host/protocol headers, or set `NEXT_PUBLIC_SITE_URL` to its public origin. This is required for static generation and recommended when the proxy header behavior is unknown.
14. Click "Save"
15. On the new editing host click the ... and hit "Build and deploy"

Additional Info: You do not have to create rendering host items in XM Cloud as those are created automatically for you when creating a rendering host. Mapping of sites using site templates to editing hosts is also done automatically.

## Documentation

- [Skills: capability map for this starter](Skills.md) — High-level capability groupings; see also the repo [docs/Skills.md](../../docs/Skills.md).
- [Sitecore Content SDK for XM Cloud](https://doc.sitecore.com/xmc/en/developers/content-sdk/sitecore-content-sdk-for-xm-cloud.html)
