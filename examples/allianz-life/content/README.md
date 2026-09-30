# Allianz editorial extraction

357 canonical routes are enumerated with 2242 typed native datasource components. 253 routes pass the current extraction/import gate. No visual or authoring QA is implied.

The gate fails closed for source omissions, unsupported component/parameter contracts, legacy layouts, unverified interactions and missing media. `native-content.json` can contain partial routes for review; only routes with `readyForImport: true` in `import-manifest.json` may be imported. `--strict` exits nonzero when any selected route fails. No importer should use the number of extracted routes as a completed implementation count.

There are 103 routes with explicit layout/interaction issues, 7 unresolved image references, and 1 unresolved documents. See the manifests for source URLs and affected routes. 20 public source candidates remain separately unavailable; no content has been invented for them.

Rich text is limited to semantic paragraphs, emphasis, headings, lists and tables within individually identified editorial components. Scripts, styles, arbitrary wrapper DOM, forms, input controls, embeds, SVG and event attributes cannot enter rich text. Approved source SVG icons are separately sanitized into standalone media. External, authenticated and contact destinations are inert.

Re-run locally: `python3 scripts/allianz-life/extract_public_content.py --source-dir <public-site-directory>`; optional `--routes / /what-we-offer/annuities /customer-service-frequently-asked-questions --strict`. The source directory is authorized research input and is not a production dependency.
