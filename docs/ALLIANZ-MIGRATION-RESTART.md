# Allianz migration restart checkpoint

Updated 2026-10-27. Continue the existing migration; this checkpoint does not declare completion.

## Repository and release

- Repository SitecoreAI/xmcloud-starter-js, branch `allianz-life`, app `examples/allianz-life`.
- Previous verified release `5dcc0f9f3529f042efa10d4ad70bb831fc02bef1` (skip link); earlier `63905ed3c8c99ae941c4570cd5c324b74cc927c9` (product menu) and `414427fc698e6d2f56cb8a86fc71e66f964c7e0f` (migration/navigation batch).
- Pushes automatically deploy both `allianz-life.vercel.app` and `thlt-allianz-demo/dev` editing host. Verify terminal outcomes and affected live behavior. Never push broken WIP here.
- This checkpoint migrates two legacy header snapshot logo references to the existing Content Hub Original. HTTP 200 image/png, 870 bytes, SHA-256 `89b8d5945101db114ccf2acb59ab5270d1cead4ed271b0a06b86440379f30f5a`, identical to `public/allianz-legacy-assets/logo.png`. Sixteen focused logo/media tests pass.
- Generated `next-env.d.ts` changes are excluded and preserved. No credentials, environment files, generated build output or unrelated changes belong in this checkpoint.

## Saved CMS work: verify before repeating

- NY homepage `/new-york`: page `214D3628-E161-5337-97F7-2F74DB7DD027`, Hero `BF9F1739-7EBD-4D7F-8436-EA25A0817696`. Desktop image saved to existing Content Hub asset **118445**, Original 848×350, alt “Allianz New York”. Independently reopened: only desktopImage, revision and updated changed. Revision `3e271c98-ff7e-4045-b9e5-87bf1f54f161`, updated `20261027T123634Z`. SDK resolves the saved image correctly, with unchanged heading/body. **Publication and live image verification remain pending**; do not save again.
- NY product `/new-york/annuities/registered-index-linked-annuities/index-advantage-plus-new-york`, page `0A246F0D-338C-44F5-9B46-4B9CFEA287AE`: published and desktop/mobile visibility verified. Terminal Data job `27f33490-bae0-4ea0-9681-80d7686f0721`, page job `d510fc94-3322-4dfb-8fdb-80177eedffc3`. Do not repeat.
- Historical visibility ledger: 25 of original 28 prompt routes recovered, plus Concierge and this NY product. Qualified visibility is not full acceptance.

## Next ready work

1. Keep one browser writer. Publish the verified NY homepage Hero scope, monitor terminal result, then check loaded image at desktop/mobile. Publish the page only if separately needed after checking results.
2. Glossary footer: page `BFBCD304-87A6-411B-AE71-DB48EDEA8D76`, `/what-we-offer/annuities/fixed-index-annuities/my-lifetime-income-plus/glossary`. Current SDK has footer composition; public footer absent. Fresh eligibility and first page-only publication remain unattempted.
3. Investment Options heading: page `202F11F2-C6CF-59EF-89AE-10318E5B3858`, `/what-we-offer/annuities/investment-strategies/allianz-investment-options`. Official and saved SDK title are H1; public output remains H2. Fresh preflight and first page-only publication remain unattempted.
4. IUL category `D2153A79-0FDB-576B-8C72-5477EFCEEB93`: official body intentionally empty, header/footer present. Public shell absent. Current draft includes 12 previously adopted demo main placements. **Do not publish those while repairing the shell**. Preserve exact layout rollback before scoped correction.

## Held operations and acceptance limits

- Authoring API denied access. No retry or alternate-route bypass. Operator-only exact FULL republication is prepared for Core `EC1439DD-3041-5674-B573-0F14DDAC00A6`, RFA `8B85231C-9FAA-52AA-94CE-EA0A5D3E7BF1`, Tools `C8C16CA0-3E34-43CD-9884-9A943D23F267`, without subitems/related content. Smart publication and ISR did not repair the upstream layout mismatch.
- Culture Data `8F581AA0-9DD1-4114-ACDA-332C21797754`: navigation denied, known not executed. Held.
- Legal Data `F9C984FD-94E6-4938-B589-20F46FD16D48`: historical publication outcome unknown; correlate logs before resubmission.
- 222 Hero `1EBE5D7E-37E0-486A-B32A-52A95DE02DA4`: two blocked nonpersisted saves. No repeat absent relevant recovery evidence.
- Native heading activation autosave normalization remains reproducible; exact Tools heading was restored. Do not disable editing or invent a save interceptor.
- Calculator remains incomplete: no invented financial formulas or source framing bypass. PDF/document identity, remaining assets and recoverable Media Library cleanup remain incomplete; denied PDF actions stay held.
- The 322-route public structural screen and 382-page builds are not whole-site visual, legal, functional or WYSIWYG acceptance.
- Qualified migration publication/deployment is authorized; platform reviews still apply. No credential/security/permission changes, lock overrides or permanent purges.

## Evidence and continuity

Detailed local receipts and the active acceptance matrix are retained under task-workspace `migration-resume-after-routing-release-20261021/benefit-control-live-visibility-diagnosis-20261026/`. Do not assume these local receipts exist on a different laptop. Use the item/job IDs above to check current state rather than replay operations. Obtain existing project access through normal sign-in; no authentication is transferred by this repository.
