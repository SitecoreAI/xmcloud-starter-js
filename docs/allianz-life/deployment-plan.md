# Allianz Life deployment and acceptance plan

This branch prepares a client-authorized experiment inside the existing SitecoreAI project and Vercel project. The current change is local configuration and implementation preparation. It does not demonstrate a completed native import, connected editor, personalization rule, experiment, or deployment.

## Deployment boundary

- Keep the Sales Engineer 2 organization's existing `thlt-mnp-demo` project and environment in place. **Never delete this project, its environment, or release its slot.** Record the exact project/environment/editing-host identifiers from the verified root discovery checkpoint before any apply. Preserve recoverable MNP content and previous configuration.
- Use the existing GitHub-connected Vercel `mnp` project in Thomas's personal account. Verify the selected account/project and its current branch/root/runtime mapping before updating them. Do not create another project, upgrade a plan, purchase a service, or change the account.
- Use branch `allianz-life`; no commit or external change occurs merely because this plan/config exists. Keep `main` and `dmz` unchanged.
- Implement source pages and documents only within public English `www.allianzlife.com`. Portals and external sites remain outside the recreated content scope. Forms, searches, tools and integrations provide local mock behavior; never call production forms, trackers, authentication, customer APIs or CRM.

The branch's `xmcloud.build.json` explicitly selects `Project.AllianzLife.Structure`, enables only the `allianz-life` host at `./examples/allianz-life`, and pins Node `24.14.1`. All stock unrelated hosts are disabled in this branch. Existing host entries are preserved for review/history; they are not deleted remotely by this change. The active host contains no newly created or copied deployment secret. Its authentication mechanism must be verified through the existing platform configuration before deployment; do not publish or invent a credential to satisfy configuration.

Only CM warm-up remains among the stock post-actions. Empty schema-population and reindex lists were removed because Sitecore treats them as all indexes. There is no SCS content push, broad publish, cleanup or item-deletion post-action. The exact module list prevents the still-discoverable `Project.click-click-launch` and `nextjs-starter` sample modules from being included in this deployment.

[Sitecore build configuration](https://doc.sitecore.com/sai/en/developers/sitecoreai/deploying-sitecoreai/the-sitecoreai-build-configuration.html) explains module selection, matching host/SDK Node majors, and the all-index behavior of empty post-action lists. Omitting `deployItems` deploys all modules discovered by `sitecore.json`; do not remove this explicit selection.

## Content and serialization ownership

`authoring/allianz-life/Project.AllianzLife.Structure.module.json` owns only isolated project templates, JSON renderings, placeholder definitions and visual rendering-option definitions. `sitecore.json` must discover this exact module location. Every include uses `CreateAndUpdate` and an explicit scope. No broad content tree, media binary, shared Rendering Hosts, roles/users, old site subtree or organization/project configuration belongs in the module.

Site-native shell items, partial designs, page designs, Page Branches, page layouts, editorial pages, datasource items, navigation, disclosures, personalization variants, test data and media belong to a separate repeatable bootstrap/import manifest. This separation preserves author-managed content across code deployments. Shared editable data belongs under the main site's `Data/Allianz Life`; page-unique data belongs under its own page's `Data`.

`CreateAndUpdate` preserves remote-only items during an SCS push. It is **not verified as an IAR preservation guarantee**; narrow item ownership remains essential. Native IAR templates/rendering definitions are code-owned. Never serialize author-managed presentation/editorial trees into this structural module merely to get them deployed. [Current SCS configuration reference](https://doc.sitecore.com/sai/en/developers/sitecoreai/sitecore-content-serialization/configuration/sitecore-content-serialization-configuration-reference.html)

Bootstrap/import uses deterministic stable IDs, dependency ordering, a source URL→item/media map and source hashes. Default to dry-run. Before apply, save the existing-item/config snapshot and compare planned changes to the previous successful import ledger. Author-changed fields become conflicts; unchanged imported fields can update. Replays do not delete orphans, overwrite unrelated fields/versions, or silently replace native experiment variants. Media uses content hashes to avoid duplicate upload. Keep mutation counts, affected paths, conflicts and result evidence, without credential values.

## Formal inventory and QA scope

The discovery checkpoint on 2026-09-30 reports **357 distinct successfully retrieved canonical HTML routes**, normalized from 429 successful URL responses. The starting sitemap contained 380 rows, including malformed/out-of-scope rows and aliases; 380 is not the implementation page count. The crawl checked 598 page candidates.

| QA population | Count | Treatment |
|---|---:|---|
| Successful canonical public HTML routes | 357 | Core route/content acceptance matrix; every route must be mapped and checked |
| Unrecovered biography source | 1 | `/about/subject-matter-experts/aimee-johnson`: initial HTTP 500; one ordinary recheck at 2026-09-30T14:48:59Z returned HTTP 302 to `/error-pages/500?error=An+error+occurred.` without following it. No usable biography content; source recovery needed before acceptance |
| Blocked distinct public candidates needing review | 19 | Canonical unresolved paths from `blocked_public_candidates.json`; resolve scope/content independently and do not fabricate source content |
| Excluded sitemap entries | 20 | 9 account/authentication workflows, 9 robots-disallowed entries and 2 test/opaque pages; separate from the raw linked-URL attempt counts below |
| Case aliases blocked by source | 131 | Alias/normalization checks against successful canonical paths; no duplicate page items |
| Authenticated portals | 5 | Excluded, no portal implementation |
| Robots-disallowed linked alias | 1 | `/Rates` is conservatively excluded along with `/rates`; not an additional public candidate |
| Malformed/internal navigation links | 7 | Excluded source routes; correct or mock links through explicit mapping |
| Error route | 1 | Model as demo error state only |
| Same-host referenced documents | 194 | One ordinary exact-URL GET each: 193 genuine binaries available (192 PDF + 1 DOCX), 168,097,103 bytes; S2004.pdf redirects to `/login` and stays unavailable. No client-package wait; use `document_download_manifest.json` and preserve the unavailable state |
| Same-host asset references | 2,581 | Deduplicate source paths/hashes; verify required actual binaries and font licensing/availability |
| Verified selected raster resources | 426 | Ordinary exact selected-source GETs all succeeded: 414 JPEG + 11 PNG + 1 GIF, 84,604,482 bytes, 422 unique content hashes. Bind required originals through `asset_download_manifest.json`; keep unrepresented source-image gates explicit |
| Verified original source fonts | 5 | Ordinary GETs recovered Regular, SemiBold, Light, Bold and Icons WOFF2 files with magic/hash checks; 124,664 bytes. Retrieval and declarations do not prove actual rendered face usage; verify during screenshot QA |

These counts are a frozen discovery checkpoint, not a claim that the source is exhaustive. Update the manifest and scope ledger when a failed source recovers or new distinct public pages are found. Keep added, excluded, alias and unresolved counts explicit. Source files: `discovery/public-site/canonical_inventory.json`, `canonical_inventory.csv`, `page_inventory.json`, `403_classification.json`, `document_inventory.json`, `reconciled_summary.json` and `source_exceptions_manifest.json` in the task workspace; they are not the native CMS content store. `crawl_summary.json` counts raw traversal attempts rather than implementation pages.

The canonical set contains 16 observed archetypes:

| Archetype | Canonical routes |
|---|---:|
| Home | 1 |
| Marketing / topic landing | 56 |
| Directory / collection landing | 9 |
| Person biography | 41 |
| Press release year listing | 3 |
| Press release | 81 |
| Legal / policy | 11 |
| Contact / claim form | 5 |
| FAQ / glossary | 7 |
| Editorial insight / article | 45 |
| Interactive tool / calculator | 15 |
| Document / disclosure library | 30 |
| Product detail / guide | 22 |
| Product rates | 23 |
| Product video | 6 |
| Site search | 2 |

Every core route must have source URL, canonical key, aliases, native item ID/path, template/design, datasource references, content completeness, media readiness, interaction requirements and QA status in a route ledger. Every document reference requires a source/download status, local checksum, native media ID, label and demo-link behavior. Failed or inaccessible binaries remain flagged.

## Staged milestones and exit criteria

| Stage | Implementation outcome | Required evidence before advancing |
|---|---|---|
| 0. Identity and scope checkpoint | Frozen account/project/environment/source mappings and approved URL/asset model | Exact read-only identities; 357-route ledger; failed/blocked candidate decisions; project preservation checkpoint |
| 1. Build and homepage baseline | Node 24 production fixture build, native field/placeholder component contracts, shared shell and homepage | Build/lint/type checks; working responsive navigation; default content/assets; agreed screenshots and viewports; no production network calls |
| 2. Archetype vertical slices | Representative page from each of 16 source archetypes; annuities landing remains unpersonalized | Content/asset comparison, keyboard interactions, local form/tool behavior, correct document/external/auth link handling, meaningful 404s |
| 3. Native structural/bootstrap pilot | Exact structural module, site shell, designs and a small import sample in the existing environment | Bounded dry-run/export; verified built-in template/field IDs; native Pages edit/save and placeholder/branch clone evidence; author-edit preservation on import replay |
| 4. Complete scoped import | All 357 core routes and verified document/media inventory mapped natively | Full route/content ledger; alias and broken-link checks; exact import counts/conflicts; unresolved sources retained as blockers |
| 5. Native demo variants | Original homepage, UTM retirement-income variant and supported annuities/life-insurance affinity variants; separate CTA A/B test on unpersonalized annuities landing | Tenant feature availability; clear precedence/reset; native editor/rule/test evidence; scoped demo telemetry; repeatable journeys without production integrations |
| 6. Existing Vercel project preview and acceptance | Existing `mnp` project configured for approved branch/app, accepted demo baseline | Verified account/project/root/runtime; preview build; independent route/network/media check; screenshots at agreed viewports; agreed demo script and recovery checkpoint |

Stages 3–6 require the separate authorized external mutation workflow and validated target identity. A local fixture implementation, config file, or simulator does not satisfy these stages. No timing promise is made until the demo deadline, source blockers, import API/authentication and accepted visual criteria are settled.

## Visual and behavioral acceptance

Set screenshot baselines before promising pixel perfection. Proposed starting viewports are desktop `1440×900`, tablet `768×1024`, and mobile `390×844`, pending Thomas's acceptance. Pin browser/device scale, fonts loaded, cookie/banner state, scroll position, animation timing and original default page content. Capture each archetype, every exceptional layout, and open interactive states. Route-level checks cover all 357 pages; representative screenshots alone cannot prove all pages match.

Keep the original design/content as the default baseline. Native personalized/test variants get their own reference expectations. Compare hero crops, typography/wrapping, gutters, spacing, navigation/menu behavior, card layouts, footnotes/legal disclosures, document labels and responsive state. Run keyboard menu/accordion/tab/form tests, input error/success states, calculators' mock outputs, search/filter state, download links, reduced motion and mobile overflow checks. Sanitized rich text retains useful formatting and links without source scripts.

Audit requests in **production fixture mode**, because the starter's default development mode hides tracking/personalization behavior. Allowed requests are the local/demo host and later explicitly verified demo Sitecore services/media. There must be no original Allianz trackers, forms, portals, API, chat, CAPTCHA or customer calls. Demo Sitecore analytics may run only in connected/native demo mode with clear scope/consent controls. Authentication and sensitive input do not persist in mocks.

Native A/B/n cannot be configured on a personalized page. Keep the homepage UTM/affinity demo and an unpersonalized annuities CTA test separate. Affinity is phased rollout and remains a tenant availability gate; do not replace missing native entitlement with a simulator and describe it as native. [Create native A/B/n test](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/create-an-a-b-n-test.html), [Affinity availability](https://doc.sitecore.com/sai/en/users/sitecoreai/set-up-affinities-for-a-site.html)

## Local validation and connected-build gates

The frontend worker owns `examples/allianz-life`. Preserve its committed lock versions and use a workspace Node 24 runtime. Its selected host must provide `build` and `next:start` scripts. Use `npm ci`, production fixture build, lint and type checking from that app. Credentials do not belong in tracked config or environment examples. A real editing secret/Edge context is connected-mode configuration provided by the established authorized account flow, not a value generated to make an offline build work.

Offline config validation checks JSON syntax, official documented property types/enums, exactly one active host, Node 24, a present app root and build/start scripts, exact structural module selection, and CM-local warm-up without publish/SCS/global indexing actions. The repository does **not** ship an official `xmcloud.build.json` JSON Schema, so these local schema assertions do not prove the hosted platform will accept the configuration or authenticate the host. Module JSON can additionally be checked against the committed `.sitecore/schemas/ModuleFile.schema.json`, but that schema is permissive and does not fully validate scopes or IAR semantics. Final hosted validation remains a connected-stage gate.

Before any remote action, re-read the selected target IDs and apply plan, verify module selection against resolved module namespaces, confirm no editorial/media subtree entered IAR, and check that the active host is using connected mode only with its verified configuration. Preserve the existing project's ID/slot and the existing Vercel project's identity throughout.
