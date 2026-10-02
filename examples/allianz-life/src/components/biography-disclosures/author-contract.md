# BiographyDisclosures author and adoption contract

One body-only purpose is justified by exactly three source grey sections: Jean-Roch Sibille's investment-management disclosure, Jason Wellmann's LIMRA source footnote, and Paul Cahill's ETF distribution disclosure. These are separately sourced from each page's final legal section.

Native field: body, author label 'Biography note or disclosure', Rich Text. No title, theme, layout, heading-level or spacing fields and no child insert options. Keep exact authored source HTML and whitespace inside the fixed tileBody. The component fixes l-container--full-width, t-bg-grey-muted, axlTileCollection, l-grid--max-width, plain row, medium-12 column and the left-aligned m-axlIntroductionBlock shell with empty source header divs.

The final legal section on all 41 biography routes exactly matches the existing LegalDisclosures and is reused independently. Do not substitute this grey source design for that legal shell, and do not create another legal primitive.

Adjacent source witnesses and the real SDK suite live in ../executive-biography/__tests__/. All three source sections are validated independently and exact contents survive RichText. Blank fields keep their own metadata in editing mode and remain blank in normal mode. Query reads only id and true native body with full jsonValue; it has no child collection or first truncation.

Fresh native datasource/template/rendering IDs and source/presentation preservation snapshots are required before adoption. Existing native page existence and parent/module IDs are unverified. No deterministic fixture UUIDs are used as native IDs and no runtime source lookup exists.

Source code only; focused ESLint, full starter TypeScript and the shared SDK tests verify the source contract. No shared files, component maps, native items, publishing, deployment or browser acceptance were changed or claimed.
