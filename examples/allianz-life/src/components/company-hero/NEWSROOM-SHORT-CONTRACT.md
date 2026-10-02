# CompanyHero NewsroomShort variant

Existing three-field CompanyHero datasource: heading (Single-Line Text), subtitle (Rich Text), image (Image). No new template, datasource shape, child records or design parameters. `Overlay` and its `Default` alias retain their existing behavior.

`NewsroomShort` uses the canonical newsroom short-cover picture, centered H1/subtitle and fixed source wrapper. The picture has `c-stage__image--short`; the image's source maximum height is 300px from 992px. It has no overlay classes. Empty and cleared native fields keep SDK editability and original field metadata. Subtitle Rich Text is passed intact; block markup uses a div to avoid invalid nested paragraphs. Captured image alt is empty and must remain empty.

Evidence: canonical newsroom HTML `c61ffe61ef4cb216.html`, section character range 39775–41143, committed `newsroom-short.source.html` witness SHA-256 `18ce8a2d87da47de2f4f1d648d2cd82ed656672b5fff7d4c6a8c6defac0534a1`. Source media path is evidence; native Media Library mapping is still required. Existing compact native fieldCollection query is unchanged and remains subject to native acceptance.

Run `node --test src/components/company-hero/__tests__/*.test.mjs` for both the existing and new variant. Native variant registration, page binding and authoring/browser acceptance are separate work.
