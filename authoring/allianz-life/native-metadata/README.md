# Verified rendering metadata source candidate

This is a bounded source reconciliation of the native audit observed at
2026-10-04 21:04:53 UTC against source commit
`741701cfd660db819f0dffeaf595ab2048af4261`. It does not perform native writes or
make the historical structural module deployable.

## Exact scope

- Nineteen of the audit's twenty verified same-ID renames have a complete
  historical rendering definition. Their current paths are applied after the
  original path has generated the existing UUID, preserving every reference
- Video's separately verified current active path is also reconciled. This is
  a native-read observation, not a claim that the rename batch changed it
- All seven verified English `__Display name` changes are included, in existing
  unversioned storage
- Nine of the forty-four verified icon corrections match complete historical
  rendering definitions and are included in existing shared `__Icon` storage
- All 491 source IDs, parents, templates, technical component/query names,
  datasource definitions, parameters and placeholder reference order are retained

`verified-rendering-metadata.json` pins the source commit, audit ZIP hash/version,
exact item IDs, historical/current paths, known previous and verified target
metadata values, and evidence-file hashes. Its canonical JSON fingerprint is
checked before use. A changed capture needs a new explicit review; updating a
claimed value alone is rejected.

The generator's technical component keys intentionally still include their
original names. Historical group hints are retained as compatibility metadata;
they do not define current Available Renderings membership or author-facing UI.

## What remains unavailable

Company Profile's twentieth verified rename has only an earlier partial label
projection, not a complete historical rendering definition. Twenty-three of the
32 rendering icon changes and all 12 section icon changes also lack complete
definitions in this module. Do not fabricate items or fill unknown fields to
close those gaps. A separate current native serialization/dependency capture is
required before any complete synchronization or import.

The eight inactive native version-0 definitions are intentionally unchanged in
the historical source. Their actual names were observed, but their current
technical bindings and English display labels remain unknown. Generic selector
icons are not proof of stored overrides. Existing historical English version-1
fixtures must not be treated as current native state or imported to reactivate
those items. This candidate creates no versions and invents no blank values.

The evidence covers 74 saved rendering IDs, of which 66 were active, and 14
palette sections. The native folder getter was limited to 50 children; new
items outside its returned children and saved IDs cannot be excluded. Later
BiographyBody/pilot layout changes are outside this capture. No folder/category
renames, membership changes, inactive cleanups or native deletions are proposed.

## Regeneration and review

Apply the reviewed source patch including its twenty same-ID YAML file renames.
The generator refuses to run when an old renamed YAML filename is still present;
it never silently deletes or renames files. This avoids duplicate serialized IDs.
Historical item content is retained, with only the scoped metadata changed.

From the repository root:

```sh
python3 scripts/allianz-life/native-palette.py
python3 scripts/allianz-life/generate-structure.py
python3 scripts/allianz-life/test-native-rendering-metadata.py
python3 scripts/allianz-life/test-structure-authoring.py
python3 scripts/allianz-life/test-native-palette.py
python3 scripts/allianz-life/test-structure-safety.py
python3 scripts/allianz-life/test-structure-queries.py
```

The original palette capture and its nine partial field snapshots remain
immutable historical evidence. Its generated dependency report now points at
the reconciled historical source paths, without claiming complete native
agreement. Local tests do not establish SCS CLI compatibility, Pages insertion,
published rendering or live metadata. Keep `deployItems.modules = []`; no
deployment configuration, runtime component or native module scope is changed.
