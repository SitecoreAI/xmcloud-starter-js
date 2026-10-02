# NewsroomCompanyProfile author contract

Rendering: `NewsroomCompanyProfile`, fixed `Default` variant.

| Field | Author label | Native type |
| --- | --- | --- |
| heading | Heading | Single-Line Text |
| facts | Company facts | Rich Text |
| companyImage | Company image | Image |
| parentHeading | Parent company heading | Single-Line Text |
| parentBody | Parent company description | Rich Text |
| parentImage | Parent company image | Image |

Six root fields, no children or reusable generic tile records. The source heading is H2, the parent heading H3. The blue section contains two white 5050 tiles with the canonical source DOM and first tile's flipped class; below 704px each tile stacks content then image. Facts and parent description remain Rich Text, preserving bullets, superscripts, paragraph indentation, labels and link metadata. No theme, alignment, ratio, heading-level, spacing, or image-orientation fields/parameters exist. Only RenderingIdentifier is consumed.

Orientation verification remains open: the planning prose called the company image right and parent image left, but captured DOM puts content before image while recovered source CSS uses `row-reverse` for the first flipped tile and `row` for the second at 704px. Keep canonical DOM/classes and recovered source direction rules until matched-width source-browser evidence resolves that discrepancy; the component does not override direction from planning prose.

Native `jsonValue` fields, including metadata and deliberate clears, pass through projection without fallback. Editing receives the exact Rich Text Field object. Visitor Rich Text reconciles anchor destinations through the established `safeLink` mock policy, cloning only the display value when needed while preserving metadata and other Field properties. Canonical stored XHTML, labels and rel attributes are unchanged; external services stay unavailable. Empty authored fields remain mounted for SDK authoring chrome. Captured company image alts are a single blank space and must not be replaced with inferred labels.

The compact `fieldCollection: fields { name jsonValue }` query is proposed pending native Preview/schema/cost acceptance. Direct canonical fields take priority over collection values, including clears. There are no source paths, native IDs, record descendants, copied seeded content or historical aliases in runtime code. Main TSX is the rendering; props and links sidecars are not renderings.

Evidence: canonical newsroom HTML `c61ffe61ef4cb216.html`, section character range 63290–68293. The committed source witness has SHA-256 `2000cd3504a5c6d07f6986eb31d5d1654b4d27b9d3b81510d4049e3f5a3ed07f`; tests derive source fields from that witness and run the installed Content SDK with SitecoreProvider. Source image paths are evidence, not assigned native Media Library identities. Fresh native media matching and edit-save-reload-restore acceptance remain required before binding.

Run `node --test src/components/newsroom-company-profile/__tests__/*.test.mjs`. This implementation does not perform native item changes, registration, layout binding, build/deploy or publication.
