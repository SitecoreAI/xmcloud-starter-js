# Verified native palette field model

This is a durable, non-deployable source projection of nine verified native
fields captured on 2026-10-04. It records seven Available Renderings membership
fields, the project Main Allowed Controls field and the unversioned English
Company Profile display label. All actual item IDs, parents, templates, paths,
technical names and captured reference order are retained.

`verified-fields.json` is the input to `scripts/allianz-life/native-palette.py`.
The generator validates the bounded field scope, stable identities, native field
storage, captured value hashes and ordered Main references before emitting the
nine partial YAML files under `field-values/` and `dependency-report.json`.
It also retains the 14 captured category identities/order, 74 project renderer
identities and 122 current site palette observations. Category capture order is
the reader's observed order, not a claim about native sort fields or Pages UI.
Generic inventory guards verify canonical GUIDs, native item path/name/root
relationships, rendering/template/field identities, record schemas, section
storage, numeric native versions and agreement between renderer, palette and
resolved-control records. Ordered SHA256 fingerprints bind every captured array
to the original ZIP, its receipt/CSV hashes and observation time. Reordering
records or updating a claimed hash cannot authorize a changed capture.

The historical `generate-structure.py` consumes only the validated matching
Main field. Regeneration therefore preserves its exact 67 raw references, all
original 40 in their original order and 27 additions. The independent active
palette resolves 59 of those references. The eight versionless references are
retained without inventing active bindings. The later `../native-metadata` reconciliation updates only 20 matching active
rendering paths, seven labels and nine icons. All 491 UUIDs and every technical
rendering/datasource/query/parameter field remain intact. This original palette
capture and its nine field-value snapshots stay byte-for-byte historical evidence.

Run from the repository root:

```sh
python3 scripts/allianz-life/native-palette.py
python3 scripts/allianz-life/generate-structure.py
python3 scripts/allianz-life/test-native-palette.py
```

Before applying the existing-file changes to another source checkout, the
baseline guard checks all three original Git blobs from commit
`241b6912e9f25577f6ba89123ce79aa5adb2b7fc`:

```sh
python3 scripts/allianz-life/native-palette.py --check-source-baseline /absolute/path/to/unmodified-checkout
```

These field-only files are evidence, not complete Sitecore items or an import
module. They intentionally contain no deployable SCS module. Never push them to
CM, replay their creates/updates or replace complete rendering items from them.
The existing managed build must continue to use `deployItems.modules = []`.

The supplied capture cannot establish complete native serialization. The nine
verified fields reference 79 distinct renderer IDs, of which 52 have no complete
rendering definition in the pinned historical source. The dependency report
lists every missing target and its consumers in captured order. Even the 27
historical definitions present have not been reconciled with complete current
native rendering, datasource, child-template, parameter and query/source schema
dependencies. Those need a separately scoped native capture before a complete
deployable synchronization can be proposed. Platform dependencies and the
Available Renderings parent/template also require independent verification.

In this original capture, Company Profile had physical name/path `About Allianz
Life` and technical binding `NewsroomCompanyProfile`. The later native audit
verified its same-ID rename to `Company Profile`, preserving that binding. The
old partial field projection remains historical evidence, not an import target;
there is no complete current Company Profile definition in the historical module. Core Components' acknowledged label
is excluded because its raw field/UI readback is pending. The failed Site
Components folder label is also excluded. Naming remains incomplete; native
Pages category grouping and insertion acceptance remain unverified. This source
handoff performs no native writes, publication, commits, pushes or deployments.

Offline palette, authoring, structural safety and query regressions pass with
self-contained non-secret configuration. Full deployment-config validation was
not run because that configuration was deliberately excluded from the supplied
source snapshot. No deployment configuration or credential values were read.
