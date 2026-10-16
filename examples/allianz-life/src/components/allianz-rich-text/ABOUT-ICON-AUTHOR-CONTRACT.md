# About icon authoring contract

Status: the seven-file code/query contract is implemented locally. The parent task3 ledger records six Facts Image bindings saved and independently reopened. Information field creation, live ComponentQuery save, asset binding and native/browser acceptance remain pending. This worker performed no CMS, Content Hub, publication or deployment operation.

## Approved Information field

Use the existing datasource `0A94E9DA-DD38-4B67-908E-363578BA2846`, `/sitecore/content/allianz/allianz-life/Home/about/Data/Take a closer look heading`, on template `932869D2-552A-5963-984F-6FC3C1E8A4A8` (`/sitecore/templates/Project/Allianz Life/Components/AllianzRichText`). Existing rendering `7956AAF8-596E-5405-85D5-721989505A95` has Component Name `AllianzRichText`, placement UID `7E61FD65-CA1D-5E1B-9A75-6A084FFB6D7F` and variant `AboutInformationHeading` (`EC4421A2-3474-4120-A01C-A1234490F3DF`). No new datasource, rendering or variant is needed.

The CMS owner is authorized to create exactly one ordinary optional field with this approved contract. Re-read the live template first to prevent duplication; the supplied proposal recorded it as not created.

| Property | Exact value |
| --- | --- |
| Field ID | `97E10D8C-DFEA-4CD1-8D34-6573D5F0FED7` |
| Name / display name | `icon` / `Icon` |
| Parent Content section | `9593C942-D4FF-546B-A6D2-D73686FCF96B` (parent native confirmation) |
| Type | `Image` |
| Storage | Versioned: Shared=`0`, Unversioned=`0` |
| Sort order | `500`, after existing `primaryLink` at `400` |
| Source, default value, validation, validation text | Empty |
| Required | False |

The GUID is approved and allocated, not proof of a created native field. The supplied bounded UUID search returned no exact hit; it is not exhaustive database uniqueness proof. This patch contains no new schema item YAML. Preserve existing template/base fields, controls, values, layouts and exact Never publish values. Do not use the system `__Icon`, Body HTML or a link field for this image.

## Exact local/live ComponentQuery contract

The existing rendering ComponentQuery field is `17BB046A-A32A-41B3-8315-81217947611B`. Preserve its four existing field selections and add only `icon: field(name: "icon") { jsonValue }`:

```graphql
query AllianzRichTextQuery($datasource: String!, $language: String!) {
  datasource: item(path: $datasource, language: $language) {
    id
    heading: field(name: "heading") { jsonValue }
    subheading: field(name: "subheading") { jsonValue }
    body: field(name: "body") { jsonValue }
    primaryLink: field(name: "primaryLink") { jsonValue }
    icon: field(name: "icon") { jsonValue }
  }
}
```

The local `authoring/allianz-life/items/allianz.renderings/Allianz Life/Rich Text.yml` contains this additive query. It does not change the live rendering definition. The CMS owner must create/check the field, save/read back the actual live query, bind Information and inspect the real SDK result. Re-read current revisions before native changes; proposal snapshots are historical.

## Content Hub bindings

Information uses approved Allianz Content Hub asset **124967**, source alt **Information**:

[Information Original public delivery](https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b64afa0fa0a4f7f87a12e01f2de3ca0?v=cba3d72e)

Bind through the native Image field with the exact authored public src/version query, alt and 24×24 dimensions. Retain Content Hub metadata and SDK metadata. Do not construct delivery URLs from IDs, write Media Library copies or insert runtime asset/GUID fallbacks.

Facts uses existing datasource `00276504-079F-4B50-A265-79D6E332A56C`, `/sitecore/content/allianz/allianz-life/Home/about/Data/Key company facts`, template `CEBF507C-E631-499E-9235-978185E0D3BD`. Its IconCards rendering is `0DB31973-59F9-4DD7-8789-2776CCD1CC17`, placement UID `C5924FBB-A7DF-5639-833E-BEBFED74B471`, variant `AboutFacts` (`6ABA7A45-353C-4F69-A3AA-D8E56F87BFCA`). All six IconCard children use template `20288AD4-282C-4312-8D5C-537E26A4A863` and existing versioned Image field `icon` (`4B67CB30-A8F1-46B8-8E0D-09D0F230A444`). Its existing query already supplies child IDs and `fieldCollection: fields { name jsonValue }`; no Facts query/schema change is needed.

The parent `about-facts-image-bindings/ledger.json` reports all six saved/reopened, exact immediate/readback values, independent reopen, unchanged other fields/layout, and retained item/page Never publish=`1`. This supersedes the earlier empty-field snapshot. These are parent native actions, separate from this worker’s unit rendering and still awaiting actual SDK/browser acceptance.

| Order | Child owner | Asset / authored source alt | Saved and reopened revision |
| --- | --- | --- | --- |
| 1 | `B34055C9-5EE0-445A-BB7B-E9B2EEC5A8CD` | [124926 — Heart](https://thlt-demo.sitecoresandbox.cloud/api/public/content/c8eb843c9f2f4fde96270c76a65bad1e?v=99e1a8e8) | `cb19a636-94b1-4907-ba59-259f183187e9` |
| 2 | `4DD4FC6D-A3E8-4F21-B189-7D381C78EC61` | [125251 — Receive](https://thlt-demo.sitecoresandbox.cloud/api/public/content/f604959bef2b404da3469d2f9ae151ce?v=8583f9c6) | `d9e09c9a-0d33-4669-b69c-7ce438a4614a` |
| 3 | `BB21B046-DFB2-48E5-BDD2-DDD38DE2B879` | [125011 — Minnesota](https://thlt-demo.sitecoresandbox.cloud/api/public/content/e7e73ed8387e4d8498bac0f5a8dcccbf?v=ea39d35b) | `a323cb8d-0d41-4012-8503-a52393703c8d` |
| 4 | `F1F7C286-6753-4D80-8F25-6BD1CAD282C9` | [125024 — Portfolio](https://thlt-demo.sitecoresandbox.cloud/api/public/content/ef9c3fbf925942cc9ada49c0493d4514?v=3eb35032) | `d0894693-ea5c-4a3e-a182-faa04d9119e7` |
| 5 | `1D9A2017-1507-4BD6-B797-728B943B9AE6` | [125278 — Game](https://thlt-demo.sitecoresandbox.cloud/api/public/content/b76c48eec8534e2db69375f40d36f776?v=bfec6e37) | `be4774f4-a97f-4534-b7ee-0b121cd05849` |
| 6 | `222DE77D-B13C-4AFA-9ADC-01A267F56328` | [125306 — titleIconDetailedGlobe](https://thlt-demo.sitecoresandbox.cloud/api/public/content/05b657e171274f668ca65651c0661938?v=7be34f64) | `84da5421-e7d9-4aa2-a729-0d62b896cb7a` |

All seven source/delivery files and official About HTML are copied with hashes into `evidence/about-assets-approved-contract/assets/`; the immutable parent mapping and four native receipts are under `supporting-evidence/`. The mapping verifies seven matching path geometry/transform and paint signatures. **All seven delivery SVG byte sequences differ from source**; no pixel, computed-style or inline-versus-external embedding equivalence is claimed. DetailedGlobe source alt is literally `titleIconDetailedGlobe`; DAM metadata is distinct from authored Image alt. The delivery changed a duplicate description ID, and its metadata description is not visual proof.

## Renderer and acceptance boundary

Facts preserves the six owners and source 3+3 order, passing original SDK Image fields rather than reconstructing them. Only `AboutInformationHeading` consumes the optional root Image field; other RichText exports retain their original behavior. Information keeps its blue circle, existing source 26px/40px white glyph styling at 704px, and heading/body controls. A real cleared Image remains editable in Edit mode; missing fields produce no invented Image editor or visitor fallback. Authored alt remains authoritative, including an empty alt.

Before native acceptance, the CMS owner must independently reopen Information schema/query/Image values and verify exact field owner/ID/type/storage, source URL, source alt, dimensions and metadata through the actual SDK query; also verify all six Facts field objects, effective variant/placement, original content/layout and retained guards. Then perform actual desktop/mobile browser QA for geometry, paint, order, alt/editor behavior and layout. Unit SDK tests using real public URLs are not native query, field creation, binding or browser acceptance.

The separate forward-after-held31 and rollback patches restore exact code/query-contract bytes. Apply only against the recorded held31 composition and check hashes. This worker has no CMS writes to roll back. Code rollback does not authorize removing a later native field, deleting assets or reverting the parent’s six bindings; coordinate native corrections separately. No commit, push, upload, publication or deployment is included.
