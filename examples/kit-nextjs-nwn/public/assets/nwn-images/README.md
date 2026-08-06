# NW Natural image manifest

This folder contains original, text-free imagery for the `kit-nextjs-nwn` site plus the official NW Natural light-theme logo. Upload the assets to Content Hub DAM, preserve the filenames, and use the mapping below when assigning images in SitecoreAI Page Builder.

These files are an upload package only. The application does not import or substitute them at runtime; visitors see an image only after its Sitecore field is assigned to a Content Hub asset.

The photographic images contain no logos or embedded copy and leave intentional negative space for responsive web text. Use the Sitecore focal point to preserve the named subject on narrow crops. The logo is the unchanged transparent asset used by NW Natural's live white header; retain its proportions and colors.

| Filename                                                   |      Size | Page / component                                 | Sitecore field        | Suggested alt text                                                       | Focal point  |
| ---------------------------------------------------------- | --------: | ------------------------------------------------ | --------------------- | ------------------------------------------------------------------------ | ------------ |
| `global-header-nw-natural-logo-light.png`                  |    388x90 | Global Header / light theme                      | `headerLogo`          | NW Natural                                                               | Center       |
| `homepage-hero-family-comfort-pacific-northwest-wide.png`  |  1814x867 | Home / Hero                                      | `image`               | Family enjoying a warm Pacific Northwest home on a rainy evening         | Right center |
| `homepage-hero-call-811-before-you-dig-wide.png`           |  1814x867 | Home / Customer Resources / Call 811             | `image`               | Homeowner and utility locator beside marked lines in a garden            | Right center |
| `homepage-hero-bill-assistance-wide.png`                   |  1817x866 | Home / Customer Resources / Payment Assistance   | `image`               | Customer care advisor reviewing assistance options with a homeowner      | Right center |
| `homepage-hero-manage-account-24-7-wide.png`               |  1817x866 | Home / Customer Resources / Manage Service       | `image`               | Customer managing a utility account on a laptop and phone                | Right center |
| `start-stop-transfer-moving-home-landscape.png`            | 1536x1024 | Start, Stop or Transfer / Page Header            | `image`               | Couple carrying moving boxes into their new home                         | Right center |
| `rebates-high-efficiency-furnace-landscape.png`            | 1536x1024 | Home / Rebates resource, product card, and Promo | `image` / `cardImage` | Technician inspecting a high-efficiency home furnace                     | Right center |
| `services-gas-fireplace-tune-up-landscape.png`             | 1536x1024 | Services; Inspections & Tune-Ups / Promo         | `image`               | Service technician testing a residential gas fireplace                   | Right center |
| `safety-smell-gas-call-from-outside-landscape.png`         | 1536x1024 | Home / Safety card; Safety page headers          | `cardImage` / `image` | Family safely outside calling for help after leaving their home          | Right center |
| `benefits-natural-gas-family-winter-comfort-landscape.png` | 1536x1024 | Get Natural Gas; Benefits of Natural Gas / Promo | `image`               | Parent and children reading beside a warm fireplace in winter            | Right center |
| `cooking-with-gas-home-chef-landscape.png`                 | 1536x1024 | Home / Cooking card; Cooking page header         | `cardImage` / `image` | Home cook preparing vegetables over a blue gas flame                     | Right center |
| `about-community-tree-planting-landscape.png`              | 1536x1024 | About Us; Company Overview / Promo               | `image`               | Community volunteers planting native trees near a Pacific Northwest city | Right center |
| `renewable-natural-gas-oregon-farm-landscape.png`          | 1536x1024 | Renewable Natural Gas / Promo                    | `image`               | Renewable gas facility operating on an Oregon farm                       | Right center |
| `less-we-can-oregon-coast-sunrise-panoramic.png`           |  1817x866 | Less We Can / Hero                               | `image`               | Sunrise over the Oregon coast and a large sea stack                      | Right center |

Official logo source: `https://www.nwnatural.com/Project.Nwnatural/img/nwn-logo-2x.png` (displayed by NW Natural at 194x45 on light backgrounds).

## Current empty homepage image fields

| Content item                | Item ID                                | Field       |
| --------------------------- | -------------------------------------- | ----------- |
| Home Page Hero              | `97dc967d-7919-407c-9927-edca35af1a97` | `image`     |
| Call 811 resource           | `e83eef3d-a9f6-4c30-975e-485f8c51bc85` | `image`     |
| Payment Assistance resource | `49d1a51d-ee58-4d7d-91da-b17cd76d6638` | `image`     |
| Manage Service resource     | `24733a7a-11b3-4d96-8e0a-f3321c5199a1` | `image`     |
| Rebates resource            | `44819653-8336-4c32-b328-4ab9da327d20` | `image`     |
| Home Page Promo             | `02181a41-c99d-4bab-9be3-164a7c9b27c5` | `image`     |
| Rebates product card        | `5551e26e-18e3-46c9-9cd6-bf6991eaa2ca` | `cardImage` |
| Cooking product card        | `e1b6f0a7-2e6f-4d75-8c60-3841a62b3901` | `cardImage` |
| Safety product card         | `b46edb68-d4cc-4ccb-8e3b-568481fda013` | `cardImage` |

## Recommended DAM renditions

- Homepage and environmental heroes: 2880x1360 desktop, 1536x1000 mobile.
- Interior page headers: 1600x1067 desktop, 1200x1200 mobile.
- Promo cards: 1400x933 landscape and 900x1200 portrait.
- Keep the original PNG as the archival master; let Content Hub generate AVIF/WebP delivery renditions.

## Generation direction

The prompt set used a documentary Pacific Northwest utility aesthetic: authentic residents and field professionals, warm interiors balanced with cool evergreen exteriors, subtle teal accents, credible safety behavior, uncluttered left-side copy space, and no marks or embedded lettering. The images are original approximations of the live site's subject matter, not copies of its photography.
