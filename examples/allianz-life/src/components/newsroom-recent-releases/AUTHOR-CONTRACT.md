# Recent news releases author contract

Technical componentName: `NewsroomRecentReleases`. Friendly rendering display: Recent news releases. Fixed variant: Default. All content fields use versioned storage (`Shared=false`, `Unversioned=false`). Only RenderingIdentifier is used; theme, heading level, columns, spacing, alignment and split controls are ignored.

- heading (Heading): Single-Line Text
- releases (News releases): ordered Multilist of existing PressRelease datasource items
- moreLink (More releases link): General Link

Centered H2, fixed source three-column whole-card links, H4 referenced titles, Date: MM/DD/YYYY and native summaries. The curated source list contains six references, with no truncation in code and no images. The final CTA is an arrow link.

## Reference and field integrity

Title, summary and releaseDate come from existing native PressRelease items through ordered references. The selected article's returned `parent.parent.id` and `url.path` supply its owning Page link. No headline-derived URL, copied Card fields, fixture identity lookup, descendant traversal, date search or automatic selection. The compact datasource fieldCollection preserves exact SDK Field objects, metadata and intentional clears; article projection selects only title/summary/date so its body is not fetched. A target-supported selective fieldCollection can replace those aliases only after schema proof. No invented query arguments are used. Arrays are rendered completely in authored order, including equal-date ties; known incomplete/total-mismatched projections are rejected rather than rendered partially.

Native URL/reference schema, full 32-item Preview cost and definition acceptance are pending. Validate actual MultilistField.targetItems, featured reference GraphQL type/targetItem, parent.parent ownership, URL shape, date jsonValue and collection completeness at the target endpoint before binding. Queries here are proposed contracts. Do not claim native acceptance from local GraphQL syntax or SSR tests. If measured native cost rejects the integrated projection, the parent can add the reviewed server-side eight-item batching resolver in a separately owned shared module; complete every reference and preserve reference order. No speculative client fetches or hard-coded fallback batches exist here.

## Native definition reads

The full bounded definition packet is in `../press-release-archive/AUTHOR-CONTRACT.json`: exact small fields, friendly labels, versioned storage, existing CompanyHero/LegalDisclosures reuse and variants, one new PressRelease Date field, recorded actual parent IDs to fresh-read, actual parameter/data/variant/media/Page reads, and landing insertion order. It contains no invented new identity. The parent owns native definition/content creation and readback. Existing template sections/base/parameter paths must be read before creating children; only service-returned identities may be bound.

Source media matches, SDK image fields and intentionally empty alts are preserved. Native Rich Text is canonical XHTML through the established codec, without invalid demo attributes. Existing public native internal references navigate through allianzLinkField; original external services remain inert under existing mock rules. No new original-service integration is introduced.

## Source proof and validation

Canonical source snippets and the complete 81-release source manifest are copied into these component test folders. Tests use the installed real Sitecore Content SDK and SitecoreProvider, cover all 32/25/24 rows, exact native reference order/URLs, six recent cards and curated feature, date formats/timezones, deliberate clearing and editing metadata, fixed source markup and no runtime fixture IDs. Native browser authoring, source visual comparison and 703/704/991/992 acceptance remain separate proof. These source changes do not create native items, publish, deploy, generate .sitecore files or build the app.

Run `node --test src/components/press-release-archive/__tests__/*.test.mjs src/components/newsroom-recent-releases/__tests__/*.test.mjs src/components/newsroom-featured-update/__tests__/*.test.mjs` from the starter, then ESLint and TypeScript checks.
