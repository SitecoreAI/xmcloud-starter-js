# Supported read-only migration tooling

`sitecore-mcp-read.py` initializes the installed Codex app-server and uses its
existing managed `marketer` OAuth connection. It does not perform login, directly
read credential stores, approve interactive requests or call mutating tools.
A tool must be on the fixed read allowlist and explicitly marked read-only by
the current catalog. The script uses `codex` from PATH, falling back to the
installed ChatGPT Mac bundle.

```sh
python3 scripts/allianz-life/sitecore-mcp-read.py --tool list_sites --output /tmp/sitecore-sites.json
```

Use it only for the intended authenticated environment. Keep responses outside
Git until their contents and sharing destination have been reviewed. A stale
task catalog alone is not a reason to repeat OAuth or create credentials.

`generate-acceptance-ledger.py` reconciles existing repository checkpoints with
a separately supplied native inventory. It reads no credentials and makes no
service requests. It retains unknown acceptance states, distinguishes source
candidates from native-only extras, and never equates HTTP/build counts with
page acceptance. `validate-acceptance-ledger.py` verifies input hashes, evidence
pointers, unique identities and explicit scope counts.

```sh
python3 scripts/allianz-life/generate-acceptance-ledger.py --repo-root . --current-inventory /path/to/local-inventory.json --representative-readback /path/to/local-readback.json --output-dir /tmp/allianz-ledger
python3 scripts/allianz-life/validate-acceptance-ledger.py --repo-root . --ledger /tmp/allianz-ledger/route-acceptance-ledger.json --receipt-dir /path/to/local-receipts
```

The inventory and readback inputs use the schemas consumed by the generator.
Use `--source-commit` to pin a reviewed source checkpoint for reproducible
outputs after documentation commits. These scripts target the existing migration
registries; their finite-count assertions deliberately surface scope drift.
They do not run publishing preflight, perform writes, or infer editor acceptance.

This tooling-only checkpoint includes no newly collected CMS response or inventory.
