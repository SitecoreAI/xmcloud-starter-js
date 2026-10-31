# Executive directory card fields

The directory reads the actual executive biography datasources. It does not own
duplicate cards, manual child links or a second set of biography content. The
biography's name, role, portrait, body and portrait link remain independent.

Two optional fields on the ExecutiveBiography template customize directory cards:

| Field | Native type | Directory output |
| --- | --- | --- |
| `directoryPortrait` | Image | Native SDK image field, with its original alt, dimensions, URL and metadata |
| `directoryRole` | Single-Line Text | Encoded SDK text in the source card's `h6` title |

Populate these fields on the owning biography datasource through the native
content fields. Cards remain read-only in Page Builder. Full biography renderers
continue to read the original `role` and `portrait` fields. Expert directories do
not query or use either override.

## Independent fallback

Each override is optional. Unset, cleared, whitespace-only or malformed values
restore the corresponding original biography field. Clearing an override means
"use the biography value"; it does not hide the title or portrait. A valid title
with no valid image uses the original image, and the reverse is also supported.
If the original field is also empty, its existing absent-field behavior remains.

The title must contain single-line text. It is never interpreted as HTML; angle
brackets and ampersands are encoded by the SDK. The original biography role keeps
its Rich Text markup when used as fallback. Stored field values and metadata are
not rewritten while selecting the presentation.

An image override must have an ordinary rooted relative or credential-free HTTPS
source, without whitespace, controls or backslashes. Protocol-relative, data,
blob and script sources are not selected. Empty alt text and missing dimensions
are valid. This structural check does not prove successful image delivery: verify
the exact source asset, native DAM identity, delivered bytes and desktop/mobile
crop before release. A 404, blocked request or incorrect image is not detected by
this selector and does not trigger a runtime network fallback.

## Collection and acceptance

Overrides apply only after the complete directory search passes the existing
scope, membership, ownership, count and pagination checks. An invalid or incomplete
collection still shows the unavailable state with no partial cards. Overrides
cannot substitute another page, change ordering or bypass those guards.

For a pilot, verify both override fields and clearing/reload behavior on one
biography, then confirm its full biography and the other directory cards remain
unchanged. Compare exact card image/title, card keyboard navigation and wrapping
at desktop/mobile widths in the native Preview and published visitor page. A
successful fallback is compatibility behavior, not source-parity acceptance for
that card. Verify every remaining card before accepting the full directory.
