# Breadcrumb trail

This fixed component reads the current page and its native ancestors. Authors
maintain each page's existing native caption and Title fields. There is no datasource,
independent link list, layout choice, or duplicated ancestry content.

Each caption uses the first nonblank string from the canonical SXA
NavigationTitle (Caption), native Title, `Item.displayName`, then `Item.name`, in that
order in both Pages and visitor mode. Whitespace-only or malformed values do
not qualify. Values are rendered as authored, without trimming, prettifying
slugs, or deriving captions from paths, context, or article headlines. An
explicit NavigationTitle always wins, including a caption that looks like a slug.
If it is blank or absent, Title takes precedence over DisplayName and item name.

NavigationTitle and Title retain their original SDK field objects and editing metadata;
fallback captions never write to those fields. All breadcrumb captions are
read-only in Pages (`editable={false}`). Authors edit NavigationTitle, Title, DisplayName, or the item name
independently on the owning item, including when NavigationTitle is empty.
The current caption is plain text with `aria-current="page"`. Ancestor links
come from native `url.path`. Incomplete or unsafe trails, or an item with no
usable label in any of the four sources, show an explicit unavailable state.

The query selects both verified native fields through their actual GUIDs with
separate aliases: `navigationTitle` selects canonical SXA NavigationTitle
4e0720e9-9d50-4ddc-87cf-ecd65e8e94c8 (display label "Link caption in navigation"),
and `title` selects Title 6c7fab7b-a9c2-4b26-838a-830bdc49fe00. Both are versioned
Single-Line Text fields. Native proof on 2026-10-04 at 01:02:09 UTC resolved each
GUID to its own field metadata and value "What We Offer". The separate project
`navigationTitle` field beginning 516cabf1 remains empty and must never be
substituted. Neither field is selected by an ambiguous field name, and the
component never writes a fallback into either owning field.
Source-specific labels differ from article headlines on 44 of 81 releases.
Bind those source labels to the existing field; never infer labels from slugs.

Registration uses one optional-datasource Json Rendering, a Default Headless
Variant and the corrected standard parameter lineage. No datasource template,
location, default, automatic creation property, or `withDatasourceCheck` is
used. This label correction does not change the older datasource-driven
breadcrumb component definition.

Native Preview and browser acceptance must establish the full ancestor chain,
field identity, fallback precedence, no datasource creation, read-only captions
and independent owning-item editing, internal navigation, and source geometry
at its actual responsive boundaries.
