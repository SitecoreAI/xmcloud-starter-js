# LegalDisclosures NewsroomGrey variant

Existing body-only LegalDisclosures datasource: body (Rich Text). `Default` retains its original renderer and direct body query. `NewsroomGrey` accepts that same body contract, including compact fieldCollection projection if supplied. No additional datasource is required.

The fixed source grey tile collection contains an introduction article, empty heading/subheading wrappers, and left-aligned body. A second empty `a-axlDisclosures` wrapper follows with the exact source grid/row/column/disclosure geometry. It is structural, has no field and receives no second identifier or authoring chrome.

The original native body Field and SDK metadata remain intact in editing, including cleared fields. Visitor-only anchor reconciliation clones the display HTML when necessary and uses existing safeLink mock behavior; labels, rel, disclosure-finra class, superscripts, rule and paragraph markup survive. Canonical stored href/target values are never mutated. External original services remain unavailable through SSR inert anchors and the existing ServiceUnavailable dialog. There are no author theme, spacing, heading, link, trailing-copy or layout controls.

Evidence: canonical newsroom HTML `c61ffe61ef4cb216.html`, grey section character range 71129–73410, SHA-256 `c07a67444e4efedc5ea37c7083afe757d0af9b968d76dee7b9a4585b9f935aaa`; empty trailing wrapper character range 73421–73816, SHA-256 `ab86afc46fa17dd7ac05a07693b48c285655e7e796e890a69a48887aa81fc7ca`. Both witnesses are checked into this component's tests. Tests run the installed real Content SDK and verify source fields, edit metadata, deliberate clears, mock links and trailing geometry.

Run `node --test src/components/legal-disclosures/__tests__/*.test.mjs`. This code does not change native items, query registration, layouts, build/deploy or publication.
