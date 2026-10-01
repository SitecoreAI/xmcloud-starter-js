# Allianz Life native authoring model

`Project.AllianzLife.Structure` contains only isolated Allianz templates,
renderings, placeholder settings, finite rendering options and two traditional
datasource branches. `xmcloud.build.json` selects this exact module for IAR.
Editorial content, media bytes, sites, users and tenant configuration are not
included. Every SCS include is `CreateAndUpdate`; no delete operation exists.
This permission does not establish equivalent preservation semantics for IAR.

Generate and validate locally:

```sh
python3 scripts/allianz-life/generate-structure.py
python3 scripts/allianz-life/validate-structure.py --with-cli --target-schema <verified-local-template-schema.json>
python3 scripts/allianz-life/test-import-planner.py
```

The pinned native CLI validates serialization format. Runtime GraphQL delivery,
Pages editing/publishing and Page Branch cloning require separate native checks.
`content-contract.json` is the exact lowerCamel datasource/parameter contract,
and `structure-manifest.json` records deterministic identities. The original
design remains the default; demonstration variants use separate datasource items.

The preserved target is Sales Engineer 2 / `thlt-mnp-demo`, project
`7f3XlRhEqdT8l8FrbjQync`, environment `56W3hhEUAQ5GLwsHAehRhe`. The new site tree
is `/sitecore/content/allianz/allianz-life`, alongside the preserved MNP tree.
The intended native architecture is:

```text
Allianz/allianz-life
  Home/<public source route>/Data/<component datasources and typed children>
  Data/Allianz Life
    Navigation/<modern and legacy header datasources, native links>
    Footer/<modern and legacy footer datasources, native links>
    Documents/<reusable native document references>
    Demo Variants/<campaign and product-interest variants>
  Presentation
    Partial Designs/<Modern, Legacy Allianz, Legacy New York header/footer>
    Page Designs/<matching native shell designs>
    Page Branches/<published prototype page plus native insertion rules>
```

Traditional branches under `/sitecore/templates/Branches/Project/Allianz Life`
seed card/accordion datasources. They are separate from the current Page Branches
library under the site Presentation tree. Create page branches through a
supported native authoring/API operation and verify clone datasource independence
before presenting that feature.

`prepare-import.py` converts granular SDK fields to native field GUIDs, image/file
and General Link XML, typed child items, and ordered page-local rendering XML.
It preserves explicit exceptions and never submits to Allianz services. It
does not treat the count of candidate routes as completed implementation.
`import-planner.py` reconciles a source manifest with a native snapshot and a
successful prior import ledger. It refuses path/template collisions, preserves
unowned fields, detects author edits, carries revision preconditions, and reports
removed-source orphans without deleting them. Native-created identities such as
Home must be independently bound in the manifest and the verified snapshot.

`serialize-media.py` creates a **private, create-only** SCS media module outside
the repository. It uses verified native unversioned media templates and the
starter's native `BlobID` plus base64 `Value` serialization format. Genuine source
bytes are checked against their reviewed SHA256 before encoding, with identical
bytes sharing deterministic media identity. Push one small pilot, pull it back
with the native CLI, decode its Blob and compare SHA256 before bulk import.
Existing blobs are skipped; changed source bytes create a new recoverable item.
Never commit this generated module or binary/base64 content, and never add it to
`deployItems.modules`.

Before content apply, create the Allianz site through the native headless site
wizard and read back the actual Site, Home, Data, Presentation, Settings and site
definition identities. Configure page-relative datasource behavior with the
actual Settings/Editing item and its native enum options; do not guess values.
The actual bounded native serialization probe created the Header/Footer partial
items without stored signatures, layouts or generated placeholder items. Compose
them using the version-specific native model and exact readback rather than
assuming a particular creation event. Preserve any native-generated placeholders
observed after composition. Assign the native page design and verify shared
navigation stays reusable and ordinary content data is page-local. No
MNP/project/environment deletion or purge is part of this workflow.

Keep before/after native exports, target-bound import ledgers, source/media hashes,
and the cloud deployment commit outside the public repository as recovery
evidence. Restore individual changed Allianz fields from the reviewed export
after a fresh revision check. Never restore by deleting/recreating the project.

Required native acceptance checks are: edit and publish a Hero RichText heading,
replace an image through Media Library, edit card/accordion children, reorder a
rendering, add a component with a page-local datasource, clone a published Page
Branch and prove datasource independence, and confirm Edge layout contains the
same canonical fields. Preserve consent rejection as the untracked baseline.
Native UTM/affinity personalization and A/B testing are configured separately;
an A/B test page must be unpersonalized. Demo traffic proves assignment/events,
not a statistical winning result.

Official references:

- [SCS configuration and permitted operations](https://doc.sitecore.com/sai/en/developers/sitecoreai/sitecore-content-serialization/configuration/sitecore-content-serialization-configuration-reference.html)
- [Build deployItems module selection](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/the-sitecoreai-build-configuration.html)
- [Native partial designs](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/building-page-templates-and-branches/work-with-partial-designs.html)
- [Current Page Branch library](https://doc.sitecore.com/sai/en/users/sitecoreai/build-pages/building-page-templates-and-branches/create-and-configure-a-page-branch.html)
