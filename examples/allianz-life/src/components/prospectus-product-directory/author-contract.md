# Prospectus product directory

Two archived routes, `/what-we-offer/annuities/prospectuses` and `/new-york/annuities/prospectuses`, show two ordered single-column striped tables. The headings **Current Products** and **Past Products** are fixed source UI copy.

Authors manage **Current product prospectus links** (`currentProducts`, ordered Multilist) and **Past product prospectus links** (`pastProducts`, ordered Multilist). Each referenced item has one **Product prospectus page** (`productLink`, General Link), which owns the caption and destination together. The complete link field and its editing metadata are passed to the SDK; empty collections stay empty and cleared links stay cleared.

The only parameter is `RenderingIdentifier`. The source row and content host are fixed. Page heading, prospectus introduction, sidebar when present, and legal disclosures are separate components. The shared exact-source/SDK tests and route witnesses live beside `prospectus-document-table`.

This is a proposed frontend field/query contract. Actual native template, datasource, and referenced link-item identities require verification before adoption. No candidate identity or row ordinal is asserted as a native ID.
