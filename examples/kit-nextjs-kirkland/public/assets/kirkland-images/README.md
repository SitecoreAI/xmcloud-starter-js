# Kirkland demo image library

These original, AI-generated images are intended as demonstration assets for the Kirkland site. The collection uses a consistent editorial direction: architectural scale, candid professional environments, deep charcoal, warm ivory, muted slate blue, controlled light, and generous negative space for page titles.

The images were inspired by the visual tone of a premium global law firm website. They do not reproduce photographs from kirkland.com, and no Kirkland logo or wordmark is embedded in them.

The 26 landscape assets are 1536 × 1024 RGB PNG files. The seven attorney
headshots are 1122 × 1402 RGB PNG files, composed as crop-safe 4:5 portraits
for the lawyer profile header.

## Asset map

| File                                           | Intended use                                                   | Suggested alt text                                                      |
| ---------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `home-hero.png`                                | Home page hero                                                 | Contemporary law firm office at blue hour                               |
| `practice-transactional.png`                   | Home page Transactional practice feature                       | Boardroom set for a transaction above a modern city                     |
| `practice-intellectual-property.png`           | Home page Intellectual Property practice feature               | Abstract interplay of light, glass, and engineered surfaces             |
| `service-litigation.png`                       | Home page Litigation feature and Litigation service page       | Formal courthouse corridor with open chamber doors                      |
| `service-restructuring.png`                    | Home page Restructuring feature and Restructuring service page | Strategy materials in a city conference room at night                   |
| `lawyers-landing.png`                          | Lawyers landing page hero                                      | Legal professionals collaborating in a contemporary office              |
| `lawyer-profile-chairman-placeholder.png`      | Chairman profile placeholder                                   | Senior legal professional in an architectural office setting            |
| `lawyer-profile-corporate-placeholder.png`     | Corporate lawyer profile placeholder                           | Corporate legal professional in a modern office setting                 |
| `lawyer-profile-litigation-placeholder.png`    | Litigation lawyer profile placeholder                          | Litigation professional in a refined office setting                     |
| `lawyer-profile-restructuring-placeholder.png` | Restructuring lawyer profile placeholder                       | Restructuring professional in a city office setting                     |
| `lawyer-donna-m-welch-headshot.png`            | Donna M. Welch demo profile portrait                           | Professional portrait placeholder for the Donna M. Welch profile        |
| `lawyer-jennifer-s-perkins-headshot.png`       | Jennifer S. Perkins demo profile portrait                      | Professional portrait placeholder for the Jennifer S. Perkins profile   |
| `lawyer-jon-a-ballis-headshot.png`             | Jon A. Ballis demo profile portrait                            | Professional portrait placeholder for the Jon A. Ballis profile         |
| `lawyer-joshua-a-sussberg-headshot.png`        | Joshua A. Sussberg demo profile portrait                       | Professional portrait placeholder for the Joshua A. Sussberg profile    |
| `lawyer-allan-kirk-headshot.png`               | Allan Kirk demo profile portrait                               | Professional portrait placeholder for the Allan Kirk profile            |
| `lawyer-cedric-van-den-borren-headshot.png`    | Cedric Van den Borren demo profile portrait                    | Professional portrait placeholder for the Cedric Van den Borren profile |
| `lawyer-mark-gardner-headshot.png`             | Mark Gardner demo profile portrait                             | Professional portrait placeholder for the Mark Gardner profile          |
| `services-landing.png`                         | Services landing page hero                                     | Legal team gathered in a modern boardroom overlooking a city            |
| `service-private-equity.png`                   | Private Equity service page                                    | Transaction documents on a boardroom table above a city                 |
| `service-mergers-acquisitions.png`             | Mergers and Acquisitions service page                          | Transaction documents against intersecting glass and stone architecture |
| `service-capital-markets.png`                  | Capital Markets service page                                   | Capital markets boardroom overlooking London at blue hour               |
| `service-antitrust-competition.png`            | Antitrust and Competition service page                         | Civic and modern architecture viewed through layered glass              |
| `social-commitment.png`                        | Social Commitment page                                         | Community legal clinic volunteers working together                      |
| `careers.png`                                  | Careers page                                                   | Early-career and experienced professionals collaborating                |
| `news-insights.png`                            | News and Insights landing page hero                            | Editorial desk with legal and business research materials               |
| `news-blackrock-meta-data-center.png`          | BlackRock and Meta data center article                         | Large-scale data center infrastructure at dusk                          |
| `news-pai-pasubio-refinancing.png`             | PAI Partners and Pasubio refinancing article                   | Leather materials and design patterns arranged in an Italian workshop   |
| `news-uk-nsi-act.png`                          | UK National Security and Investment Act article                | Westminster-inspired civic architecture and modern city geometry        |
| `locations.png`                                | Locations page hero                                            | City skyline at blue hour seen through a modern office                  |
| `location-houston.png`                         | Houston office page                                            | Houston skyline from a contemporary law office at blue hour             |
| `location-london.png`                          | London office page                                             | City of London from a contemporary law office at blue hour              |
| `location-new-york.png`                        | New York office page                                           | Midtown Manhattan from a contemporary law office at blue hour           |
| `about.png`                                    | About page hero                                                | Historic stone colonnade integrated with modern glass architecture      |

## Current Sitecore assignment checklist

Every current Kirkland page without a configured primary visual already has a
matching file in this folder. Upload these files to Content Hub without
renaming them, then assign them as follows:

| Page or component         | File                                        | Sitecore target                                                                   |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| About                     | `about.png`                                 | Add to the landing-page visual selected in Page Builder                           |
| Careers                   | `careers.png`                               | Add to the landing-page visual selected in Page Builder                           |
| Lawyers                   | `lawyers-landing.png`                       | Add to the landing-page visual selected in Page Builder                           |
| Locations                 | `locations.png`                             | Add to the landing-page visual selected in Page Builder                           |
| News and Insights         | `news-insights.png`                         | Add to the landing-page visual selected in Page Builder                           |
| Social Commitment         | `social-commitment.png`                     | Add to the landing-page visual selected in Page Builder                           |
| Services                  | `services-landing.png`                      | Services Header → `imageRequired`                                                 |
| Litigation                | `service-litigation.png`                    | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Mergers and Acquisitions  | `service-mergers-acquisitions.png`          | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Private Equity            | `service-private-equity.png`                | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Restructuring             | `service-restructuring.png`                 | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Capital Markets           | `service-capital-markets.png`               | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Antitrust and Competition | `service-antitrust-competition.png`         | Practice Header → `imageRequired`; reuse for the Services carousel item → `image` |
| Allan Kirk                | `lawyer-allan-kirk-headshot.png`            | Profile Header → `imageRequired`; reuse for page-level `pageThumbnail`            |
| Cedric Van den Borren     | `lawyer-cedric-van-den-borren-headshot.png` | Profile Header → `imageRequired`; reuse for page-level `pageThumbnail`            |
| Mark Gardner              | `lawyer-mark-gardner-headshot.png`          | Profile Header → `imageRequired`; reuse for page-level `pageThumbnail`            |
| Houston                   | `location-houston.png`                      | Office page header image and page-level `pageThumbnail`                           |
| London                    | `location-london.png`                       | Office page header image and page-level `pageThumbnail`                           |
| New York                  | `location-new-york.png`                     | Office page header image and page-level `pageThumbnail`                           |
| BlackRock/Meta article    | `news-blackrock-meta-data-center.png`       | Article Header → `imageRequired`                                                  |
| PAI/Pasubio article       | `news-pai-pasubio-refinancing.png`          | Article Header → `imageRequired`                                                  |
| UK NSI Act article        | `news-uk-nsi-act.png`                       | Article Header → `imageRequired`                                                  |

The article component displays images at 16:9 and the default page header at
30:19. The landscape files include crop-safe framing for both uses.
Assign the same file to the page item's `pageThumbnail` field so cards and
search results also have a 16:9 visual.

## Lawyer image notice

The lawyer profile assets are non-identifying, AI-generated placeholders. They
are not portraits of, and should not be presented as likenesses of, any real
Kirkland attorney. Their filenames only map each demo asset to its intended
profile page. Replace them with approved official headshots before any public
or client-facing launch.

## Logo

Upload an approved Kirkland wordmark—preferably SVG from the firm or its brand
kit—and assign it to the editable header and footer logo fields. Empty logo
fields remain available in Page Builder without rendering an imitation
wordmark on the public site.
