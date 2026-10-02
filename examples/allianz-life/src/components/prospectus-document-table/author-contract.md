# Prospectus document table

The source library has 26 three-column tables and 134 ordered document records. Twenty directory-detail routes use the fixed labels **Description / Name**, **Revision Date**, and **Size**. Six product routes use **Description**, **Revision Date**, and **Size** and the source anchor `prospectusTable`. Table stripes, spacing, typography, and labels are presentation code, not author fields.

Authors manage an ordered **Prospectus documents** multilist. Each referenced document record has:

- **Prospectus document link** (`documentLink`, General Link): destination, document caption, and link editing metadata
- **Contract or supplement note** (`contractNote`, Single-Line Text): the short plain-copy issuance/eligibility/supplement note directly below the document link; source nonbreaking spaces are preserved as text characters
- **Revision date as displayed** (`revisionDate`, Single-Line Text): source display copy, including a deliberately blank date
- **Document size as displayed** (`fileSize`, Single-Line Text): source units/copy, including a deliberately blank size

Each complete `jsonValue` goes to an installed SDK renderer. Clearing a field retains its editing metadata; cleared links and content stay empty for visitors. Record order and duplicate prospectus names remain intact. No default document records or source HTML are loaded by the component.

`Default` supplies the source `row > col-md-12 content-body content` host. `Product` supplies the anchored table for insertion into the source product-content host alongside product navigation and next steps. `Embedded` supplies an unanchored table for the two source routes with an existing outer host: the archived New York contract page and the Select Income directory page with its embedded page heading. `RenderingIdentifier` is the sole standard parameter; product tables retain their fixed source anchor.

The adjacent `__tests__/manifest.json` contains exact archived-source witnesses for all 30 document-library routes. `captureBase64` and `captureSha256` preserve each original raw UTF-8 fragment. Readable HTML captures allow only LF/CRLF checkout conversion, verified against `captureLfSha256`; exact source field values are always checked against the preserved raw fragment. The tests run full source/SDK comparisons for both checkout styles and reject other content normalization. Its `remainingSections` lists the headings, disclosures, product navigation, mock contact sections, and special hosts that must still be composed around these components. These tests establish document-section DOM and editing behavior, not whole-page browser acceptance.

The proposed field names and GraphQL query are a frontend contract. Actual native template IDs, datasource adoption, row IDs, and Content Hub delivery mappings remain unverified. Existing candidate source keys are recorded for reconciliation; they are not represented as native receipts.

Public document links first pass `localDocumentHref`. Rejected destinations become unavailable, including unverified same-origin PDFs in connected mode; they do not fall through to the broader page-navigation policy. Accepted local document destinations retain their source/native target, with SDK protection for new-tab links. Their captured href query and fragment survive remapping; `allianzLinkField` retains encoded values, repeated query keys, href-before-native query ordering, and native anchor precedence. The three directory supplements open a new tab, while their three registered-product counterparts remain in the same tab. External Broadridge/RightProspectus services retain the established unavailable behavior. Three mapped supplement PDFs referenced by this family are absent in the recovered cloud filesystem: `252fa950f8b87ae4-IAINCADV-Supplement.pdf`, `5feb237344a4d4f7-IAIP-Supplement.pdf`, and `3b2109dd203c234a-IASI-IBS.pdf`. Mac asset validation and verified native/DAM URL witnesses must complete download acceptance. The existing asset checks have not been changed.

Run `node --test src/components/prospectus-document-table/__tests__/document-library.test.mjs` from the starter. This uses the actual installed Sitecore provider, Link, Text, and RichText components, an independent Python source DOM oracle, all 30 archived captures, and synthetic test-only editing metadata.
