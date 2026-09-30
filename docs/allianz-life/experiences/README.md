# Allianz Life native experiences: offline configuration packet

**Status: preparation only, 2026-09-30. No native rule, audience, affinity or test is configured or proven by this packet.** There are no credentials, external calls, runtime imports, fixture assignments or generator changes here. Every native binding remains `null` until actual configured readback. `readyToApply` is false.

## Deliverables and scope

- `experience-plan.json`: declared target, consent contract, mutually exclusive campaign/affinity policy, tagged-page list, independent A/B design and recovery boundary
- `content-drafts.json`: source-grounded original/variant datasource fields, typed children/link drafts, image references and content provenance
- `journeys.json`: reproducible authoring and live journeys, including consent, reset, precedence and failures
- `evidence-gates.json`: required native evidence, with every status initially `not-verified`
- `test-offline-policy.py`: standard-library, offline policy/content-contract assertions; no native SDK, routing, telemetry or random-assignment implementation

Run from the repository root:

```sh
python3 docs/allianz-life/experiences/test-offline-policy.py
```

A pass establishes only internal consistency of this packet against the local content snapshot. It cannot establish tenant entitlement, authoring UI behavior, scoring, publishing, deployed variant delivery, consent network suppression, experiment assignment or goal reporting. Do not wire the evaluator or JSON into the rendering host, fixtures, proxy, source extraction or import generators.

Scope is exactly:

1. Original homepage is the default, with its original page-local datasources
2. One homepage UTM scenario, `utm_campaign=retirement_income`
3. `product_interest` native affinity values `annuities` and `life_insurance`, with campaign precedence
4. One native component A/B CTA-label test on the unpersonalized `/what-we-offer/annuities` page

Preserve the Sales Engineer 2 `thlt-mnp-demo` project, its existing environment and all MNP content. Local documents record expected project `7f3XlRhEqdT8l8FrbjQync` and environment `56W3hhEUAQ5GLwsHAehRhe`; these are **expected discovery identifiers, not current live verification**. All work is gated on actual native environment/site/scope readback through the authorized workflow. No project creation, slot release, subscription change or credential generation is proposed.

## Source and model choices

The granular local source is [native-content.json](../../../examples/allianz-life/content/native-content.json), extracted from saved public English `www.allianzlife.com` HTML. The [content contract](../../../authoring/allianz-life/content-contract.json), [native model README](../../../authoring/allianz-life/README.md) and [deployment plan](../deployment-plan.md) define the existing finite templates and editorial ownership. The task workspace also holds `discovery/model/content-model.md`, `discovery/model/import-candidates.json`, `discovery/public-site/canonical_inventory.json`, the native media ledger and `discovery/capabilities/native-capabilities.md`.

Source selectors and full field values appear in `content-drafts.json`; source fixture rendering/datasource identities are provenance only. The native importer uses its own item identities, so never assume a fixture UID/ID is a configured native item or rendering ID. Native bindings must be resolved by page path plus the actual published component/datasource readback.

### Homepage controls and personalized content

The original hero is `AllianzHero`, source key `/:section:0`, saved source HTML `html/3177a91958996385.html`, source [original homepage](https://www.allianzlife.com/). The imported intended baseline path is:

`/sitecore/content/Allianz/allianz-life/Home/Data/AllianzHero 01`

The unchanged original heading is `Allianz annuities and life insurance: for all that's ahead`, with its saved rich-text formatting preserved. The original issuer introduction, original mountain desktop/mobile images, mock login rendering parameter, and all seven non-hero homepage components remain intact. Empty original hero links remain empty on the default. No default field is edited while making variants.

Create separate `AllianzHero` datasource items under:

`/sitecore/content/Allianz/allianz-life/Data/Allianz Life/Demo Variants/Homepage`

Only `heading` and `primaryLink` change:

| Native intended variant | Heading reused from source | Original homepage link reused |
|---|---|---|
| Retirement Income Hero | `Retirement income`, annuities `:section:3`, second benefit-card heading | `Learn about annuities` → `/what-we-offer/annuities` |
| Annuities Interest Hero | `Help prepare for the future with an annuity`, annuities `:section:0` | `Learn about annuities` → `/what-we-offer/annuities` |
| Life Insurance Interest Hero | `What is indexed universal life insurance?`, life-insurance `:section:0` | `Learn about life insurance` → `/what-we-offer/life-insurance` |

Sources: [annuities overview](https://www.allianzlife.com/what-we-offer/annuities), saved `html/99f6a498352a3445.html`; [life-insurance overview](https://www.allianzlife.com/what-we-offer/life-insurance), saved `html/d2fc6eeb01bb3607.html`; homepage `/:section:3` navigation cards. These are reused educational headings/navigation, with no newly authored product guarantee, tax promise, individualized advice, benefit amount or rate.

Keep the original homepage disclosure at `/:section:7` unchanged in every variant, including the statement that indexed universal life insurance is not a source for a guaranteed stream of retirement income. Do not transplant product claims without their relevant disclosure context. Personalization changes navigation emphasis only. Reuse originals through the verified native media ledger; `/allianz-assets/...` URLs in the draft are offline reference evidence, not connected-mode media bindings. Do not hotlink production Allianz resources or carry historical local machine paths into the configuration.

### Independent native CTA A/B test

The actual source annuities page contains **no standalone `AllianzCTA` component**. Its existing two-product `AllianzCardGrid`, source key `/what-we-offer/annuities:section:5`, contains the testable fixed-index-annuity CTA. Use this native component as the test boundary; do not add a new rendering merely to satisfy the component name.

The intended original page-local control is:

`/sitecore/content/Allianz/allianz-life/Home/what-we-offer/annuities/Data/AllianzCardGrid 07`

- A: unchanged original first CTA `Learn about Allianz® fixed index annuities`
- B: neutral authored draft `Explore fixed index annuities`
- Both: same internal destination `/what-we-offer/annuities/fixed-index-annuities`, same target, same product cards, images, body text, rendering parameters, order and disclosures
- Split: proposed 50% A / 50% B
- Goal: native **Increase page views** to the already-published fixed-index-annuity overview; this measures a destination visit, not a distinct CTA-click event or lead submission

B's word `Explore` follows the source `Explore our annuities` heading at `:section:4`; the product term is the source first CTA. B is explicitly new microcopy, not an exact original quote or a claim of improved conversion.

B must deep-clone the entire component datasource, both typed `AllianzCard` children and both referenced `AllianzNavigationLink` items into:

`/sitecore/content/Allianz/allianz-life/Data/Allianz Life/Demo Variants/Annuities CTA/Explore Fixed Index Annuities`

The visible component uses `links.targetItems` when present, before falling back to the card's `link`; changing only `AllianzCard.link` will not reliably change the displayed label. B changes the first card's General Link text plus its cloned link item's `title` and General Link text. Remap the card's `links` Treelist to the **cloned** items. Never share control children/link items with B. No fields in the second card change. Preserve complete disclosures at `:section:7` and `:section:8`.

Existing finite template paths are reused: `Components/AllianzHero`, `Components/AllianzCardGrid`, `Data/AllianzCard` and `Data/AllianzNavigationLink`, all beneath `/sitecore/templates/Project/Allianz Life`. Every new item uses the exact lowerCamel fields in the content contract. No template additions are required. An A/B test page must remain unpersonalized, even though it may legitimately contribute the native `product_interest=annuities` affinity signal.

## Native configuration procedure and gates

This is an implementation checklist for the later authorized connected task. UI labels and capabilities are based on the already-saved official documentation research in `discovery/capabilities/native-capabilities.md`. They were not rechecked remotely by this offline task; record the actual tenant UI and supported settings before mutation.

### 1. Verify target, feature access and consent scope

1. Read the exact organization, existing project/environment, native Allianz site and site definition, editing host, deployment commit and public preview hostname. Bind actual Home/annuity/goal page IDs, source rendering UIDs, original datasource IDs and media IDs. Retain a scoped recoverable before-export with revision/hash evidence.
2. Confirm the selected Pages site/language is `allianz-life` / English. Check read-only availability of homepage Personalize/UTM conditions, Performance → Settings → Affinities, Top Affinity, component A/B creation and native reporting. Record permissions and rollout state. Do not create a draft just to probe entitlement.
3. Verify the isolated demo analytics/site identity and personalization scope against the real Edge context. Account/org identity alone does not prove data-scope isolation. Do not copy credentials, reveal context/secret values, initialize a second SDK stack or create new persistent access.
4. Verify both browser and server behavior: optional analytics off by default, explicit grant required, normal connected mode only, and rejection/withdrawal resolves original content. Inspect the existing `Bootstrap.tsx`, `CdpPageView.tsx`, `ConsentControls.tsx` and `proxy.ts`; their presence is not native consent proof. The declared contract uses `allianz_demo_consent=granted` and `NEXT_PUBLIC_ALLIANZ_ANALYTICS_ENABLED=true`. Keep analytics disabled until these gates pass.
5. Confirm no original Allianz tracker, portal, form, API, chat or authentication endpoint receives a request. Capture browser requests plus safe server/upstream audit evidence, because absence of browser requests cannot prove a server personalization call was skipped. Editing/preview emits no optional tracking.

If affinity rollout is unavailable, report that feature as blocked. Do not implement a local affinity substitute, purchase access or imply the requested native scenario exists. UTM and A/B may be prepared separately if their own gates pass; incomplete affinity remains explicit.

### 2. Protect originals and author native homepage variants

1. Open the homepage default in native Pages; inspect all original component/datasource bindings and baseline viewport screenshots. Save the original fields/revisions and page layout before making changes.
2. Create/review the separate three hero datasources above in the normal editorial workflow, using the existing template. Bind actual media IDs through the reviewed media ledger. Keep ordinary datasource items page-local and demonstration variants shared under `Demo Variants`.
3. In Personalize, create exactly three intended page variants/audiences: campaign, annuities affinity and life-insurance affinity. Keep default available. Select each variant, then assign its separate hero datasource through the component's datasource selection. **Do not inline-edit the shared original fields**, because the saved documentation warns inline variant editing can change default content too.
4. Verify native preview of each variant at the agreed desktop/tablet/mobile baseline, and read back default unchanged. Save native page/audience/rule/variant IDs only after actual configuration. Draft content/source identifiers are not native IDs.

### 3. Configure one campaign and mutually exclusive affinity audiences

The intended homepage audience logic is:

- Campaign: native UTM **campaign** value exactly `retirement_income`
- Annuities: Top Affinity, name `product_interest`, value `annuities`, **AND campaign does not match**
- Life insurance: Top Affinity, name `product_interest`, value `life_insurance`, **AND campaign does not match**

A global runtime consent/scope gate suppresses all optional personalization when not allowed. Fresh/no-interest/unknown state is original. Campaign intent wins by exclusion, not by assumed page-variant ordering. Do not add extra campaign/source/medium scenarios.

1. Inspect actual UTM comparison operators and audience-builder grouping. Capture the native Preview/expression readback. Implement `NOT campaign match` only with the supported operator/group semantics. Specifically verify that it is true when campaign is absent; a naïve `not equals` operator may exclude missing values. If the UI cannot express the intended missing-value case, pause for a supported native solution rather than secretly introducing a local rule.
2. Verify whether the native UTM condition evaluates the current URL, saved session/profile campaign, or another documented context, including campaign removal and new navigation. The offline test uses a symbolic `nativeCampaignValue`; it does not pretend a parsed URL is the native campaign context. Removing UTM alone is not a reset.
3. Under Performance → Settings → Affinities, configure only the five exact page pairs in `experience-plan.json`, using one dimension `product_interest` and the two exact values. Each page has only its relevant value. Do not tag the homepage with both interests or infer personal/financial attributes from browsing. A repository `affinityTag` page field is not the native affinity setup.
4. In each affinity audience, require the supported Top Affinity condition with the correct name/value plus the campaign exclusion. Confirm the native score/value readback. Do not promise a fixed number of page views, weight, delay or instant switch; public documentation does not supply those guarantees.
5. Check mixed browsing, ties, no score and an unknown value. The desired offline policy uses original for ambiguous ties. If native Top Affinity picks a tie winner or hides the information needed to enforce this, mark the original-on-tie behavior unresolved. Do not claim the offline ambiguity gate is a native condition. A custom condition is only a later supported, authorized option after actual data/operator inspection.
6. Publish only the reviewed affected Allianz pages/variant content through the authorized flow. Test the real deployed layout/variant IDs, including reload, Back/Forward and repeated navigation. Combined UTM/Top Affinity may not execute edge-only; do not promise Vercel edge execution from the existing SitecoreAI-hosted documentation claim.

### 4. Create, configure, start and verify the native A/B test

1. Confirm `/what-we-offer/annuities` has **no page personalization** in native readback. Check no inherited rule/test/layout setting invalidates that condition. Its affinity tag is allowed because a signal tag is not page personalization.
2. Save a page/component/control snapshot. Select the existing `AllianzCardGrid` at `:section:5` in Pages and use **Create A/B/n test**. Existing content is control A. Create only alternative B, with a separate cloned datasource/children/links as described above. Verify A is unchanged and B changes only the first CTA label.
3. Configure the native supported audience and proposed 50/50 allocation. Select **Increase page views**, point it to the actual published native `/what-we-offer/annuities/fixed-index-annuities` item, and record the goal settings/ID. Do not use a custom mock form as a Sitecore Form goal, or change the destination to customer lead capture.
4. Record actual completion/automatic-action settings. Prefer a supported return-to-control action for this demo if available. Do not invent a force-variant query parameter, cookie value, custom assignment or scoring system.
5. Start through the native UI: the saved documentation describes Draft → Pending on Start, then Pending → Live when the tested page is published. Record observed statuses/timestamps and actual readback. If the UI differs, use its supported flow and record it; a local file is not evidence of Live status.
6. Verify published runtime assignment on the actual selected Content SDK/App Router/hosting output. Page static-generation/caching compatibility remains a gate. If A/B cannot execute under the deployed rendering configuration, hand the exact readback/cache blocker to the runtime owner. This packet changes no route/runtime code.
7. For a reliable visual walkthrough, native authoring preview may select A or B. For live assignment evidence, use clean anonymous demo browser contexts and native random assignment; retain observed A/B contexts only after recording their native IDs. Refresh/repeated-navigation stability is a test, not an assumed promise.
8. Follow the internal CTA to the goal page and verify the native experiment-scoped visit event/report. Reaching the same destination through other links may also count; a page-view goal is not proof that this particular CTA was clicked. Show assignment and observed goal reporting, not a causal uplift.
9. Saved documentation says reporting may take up to 24 hours. Keep report status pending until the native readback becomes available or a relevant observation window/blocker is agreed. A small demo sample does not support a statistical winner; do not alter significance settings to manufacture one.
10. After the approved demo evidence is collected, stop through the supported native flow, restore/confirm original A, and verify the page is still unpersonalized. Preserve original/B items for recovery. Do not delete project, environment, profiles or unrelated experiments.

## Consent, reset and honest repeatability

- No choice/rejected: original homepage and original annuities control; no optional identifier initialization, behavioral page views or personalization/test calls. Connected read-only CMS/media requests may still be necessary to render content and are a separate allowed class
- Grant: apply the choice before native runtime reevaluation, then perform campaign/affinity/test journeys in the verified demo scope
- Withdrawal after activity: reject, reload, verify original and no further optional events/native assignment; inspect both browser and server traces. Previous native profile data is not erased by withdrawal
- Anonymous reset: use a dedicated anonymous context or clear only the **demo origin's** observed anonymous identifier/personalization cookies and storage, plus that origin's consent state. Saved docs name `sc_cid` and `sc_cid_personalize`; verify actual cookie names/domain/path and any SDK state before clearing. Never clear the Sitecore sign-in origin or delete tenant profiles
- After reset: open homepage without query/history, choose/reject consent explicitly as needed, and verify original before the next native journey. New consent choice does not by itself clear affinity/campaign history
- Browser request failures/timeouts: verify original fallback and no privacy bypass. Capture actual timeout/caching behavior; do not count a locally evaluated policy as fallback proof

Use `journeys.json` as the run sheet. Every live result must include actual target/site/scope, consent/context setup, native variant/experiment ID, affected datasource/media binding, deployed commit, timestamp, viewport and relevant safe request/report evidence. Redact credentials and unnecessary anonymous visitor identifiers from shared screenshots/reports.

## Evidence, recovery and completion statement

`evidence-gates.json` is intentionally all unverified. Populate it only with actual later native artifacts, clearly separating:

1. Offline policy/content checks
2. Native authoring configuration/readback
3. Published runtime selection/consent/network evidence
4. Native analytics/goal reporting

Before changing author-managed content, compare revisions with the current snapshot/previous import ledger; preserve author edits and record conflicts. Never let a general import replay overwrite native experiment variants. Scope restoration to the reviewed Allianz fields/layout/datasource bindings and permitted publish operation after a fresh revision check. Stop this one test/disable these rules through supported UI where necessary; do not delete original variants or rebuild the project to reset a demo.

The accurate current completion statement is: **“Source-grounded native configuration/content drafts and offline policy tests are prepared. Native entitlement, configuration, publishing, assignment and analytics validation remain pending.”**

## Official references already cited by saved discovery

These links are implementation references from the existing offline capability report; this task made no external requests or current tenant claims.

- [UTM and Top Affinity condition variables](https://doc.sitecore.com/sai/en/users/sitecoreai/personalize/specifying-variables-for-conditions.html)
- [Audience condition grouping](https://doc.sitecore.com/sai/en/users/sitecoreai/personalize/understanding-the-order-of-operations-in-conditions.html)
- [Edit a page variant](https://doc.sitecore.com/sai/en/users/sitecoreai/personalize/edit-a-page-variant.html)
- [Native affinity setup and rollout](https://doc.sitecore.com/sai/en/users/sitecoreai/set-up-affinities-for-a-site.html)
- [Affinity behavior](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities.html)
- [Personalize using affinities](https://doc.sitecore.com/sai/en/users/sitecoreai/audience-and-insights/affinities/personalize-a-page-using-affinities.html)
- [Create an A/B/n test](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/create-an-a-b-n-test.html)
- [Configure test settings](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/configure-a-b-n-test-settings.html)
- [Start/publish a test and reporting delay](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/get-started-with-a-b-n-testing/start-an-a-b-n-test.html)
- [Native test metrics](https://doc.sitecore.com/sai/en/users/sitecoreai/a-b-n-testing/test-metrics-and-calculations.html)
- [Content SDK initialization](https://doc.sitecore.com/sai/en/developers/content-sdk/20/initializing-tracking-events-and-personalization-in-the-content-sdk.html)
- [Page personalization and component testing rendering constraints](https://doc.sitecore.com/sai/en/developers/jss/22/jss-sai/page-personalization-and-component-a-b-n-testing.html)
