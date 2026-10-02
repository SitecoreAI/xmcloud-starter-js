# Press release archive author contract

Technical componentName: `PressReleaseArchive`. Fixed variant: Default. RenderingIdentifier is the only consumed parameter. Authors edit the widget heading on its existing datasource.

- heading (Heading): versioned Single-Line Text

## Automatic content

List direct child News pages of the current year. Sort valid typed release dates newest first, then normalized owning-page GUID and datasource GUID. Missing or invalid dates appear last. Enumerate only verified News template `273e2551-3e06-52a6-bea5-6f7d6e506913` pages. Year pages use native Page template `2d50c9b4-9f1e-42ae-aa00-0c85fd2b689e` and the source archive URL pattern, directly beneath Newsroom `0971f3ec-8aae-5950-9ad5-11e62f6b5770`. Exclude folders, other templates, unrelated years and deeper nested pages.

Read headline, summary and releaseDate from each page’s existing Press Release datasource `8c7ba106-bf89-4b94-8667-06f4febe9d1a`; use its verified owning page URL. Native Field objects and intentional clears are retained. Teaser fields render read-only in Pages: authors maintain each release once on its owning page. A new eligible page joins automatically, and a removed or moved page leaves. No copied cards, authored release Multilist, manual-list fallback, headline-derived URL or fixture IDs are used. Missing article content is reported to authors while populated stories remain visible. Duplicate owned article sources or incomplete reads produce an explicit unavailable state.

The server hook uses the existing configured SDK client and per-request authoring fetch options. It follows every cursor with total/pageInfo checks, aggregates the complete scoped catalog before ordering and applying the recent limit, and supplies `automaticReleases` through ComponentPropsContext keyed by rendering UID. Authorization remains server-side. Native integrated queries select only the widget’s own fields.

## Fixed source presentation

Stored summary HTML stays intact; its block typography inherits source 16px/24px/400. Archive dates use MMM dd, yyyy and Recent dates use MM/DD/YYYY. The source responsive classes and breakpoints remain intact. No appearance knobs are exposed. The stored heading remains editable in Pages, while automatically derived child copy has no inline editing chrome.

## Native activation

Deploy the component server hook and frontend together; update only the two recorded rendering ComponentQuery values, then verify actual native counts, order, child inclusion, headings, links and browser behavior. Snapshot obsolete `releases` field values before removing those two template field definitions through the normal recoverable authoring flow. Do not remove Press Release pages, article datasources or reference targets. Current native values and user edits require fresh preservation checks. Local tests do not establish native query or browser acceptance.
