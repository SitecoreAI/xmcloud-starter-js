#!/usr/bin/env python3
"""Independently check ledger integrity and evidence references, without services."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", "--source-repo", dest="source_repo", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--receipt-dir", type=Path, help="Local uncommitted receipt overrides, default: ledger's directory")
    args = parser.parse_args()
    data = json.loads(args.ledger.read_text())
    rows = data["routes"]
    paths = [r["route"] for r in rows]
    assert paths == sorted(set(paths)), "Routes must be unique and sorted"
    assert len(rows) == data["summary"]["reconciledRouteCandidateRows"]
    assert sum("seed" in r["populations"] for r in rows) == 357
    assert len(data["redirectAliases"]) == 3
    assert data["summary"]["acceptedPageCount"] is None
    assert data["summary"]["overallCompletionPercentage"] is None
    assert all(r["wholePageAccepted"] is None for r in rows)
    source = {}
    for file_id, metadata in data["inputs"].items():
        path = metadata["path"]
        actual = args.source_repo / path
        if not actual.is_file() and path.startswith("docs/migration-checkpoints/recovery-20261028/"):
            actual = (args.receipt_dir or args.ledger.parent) / Path(path).name
        raw = actual.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == metadata["sha256"], f"Input changed: {path}"
        source[file_id] = json.loads(raw) if path.endswith(".json") else raw.decode()
    references = 0

    def check(value):
        nonlocal references
        if isinstance(value, dict):
            if "input" in value and ("pointer" in value or "section" in value):
                file_id = value["input"]
                assert file_id in source, f"Unhashed evidence input: {file_id}"
                if "pointer" in value:
                    cursor = source[file_id]
                    pointer = value["pointer"]
                    assert pointer == "" or pointer.startswith("/")
                    for part in pointer.split("/")[1:]:
                        part = part.replace("~1", "/").replace("~0", "~")
                        cursor = cursor[int(part)] if isinstance(cursor, list) else cursor[part]
                else:
                    assert value["section"] in source[file_id], f"Missing Markdown section: {value}"
                references += 1
            for item in value.values():
                check(item)
        elif isinstance(value, list):
            for item in value:
                check(item)
        elif isinstance(value, str) and re.fullmatch(r"e\d{4}", value):
            assert value in data["evidenceIndex"], f"Dangling evidence reference {value}"
        elif isinstance(value, str) and re.fullmatch(r"q\d{2}", value):
            assert value in data["qualifications"], f"Dangling qualification reference {value}"
    check(data)
    identities = [uuid.UUID(r["native"]["pageId"]) for r in rows if r["native"]["pageId"]]
    assert len(identities) == len(set(identities)), "Page identity shared across distinct route rows"
    assert len(identities) == data["summary"]["currentEnglishNativePages"] == 382
    assert sum(r["native"]["currentInventoryPresence"] == "present" for r in rows) == 382
    for row in rows:
        if row["native"]["pageId"]:
            assert row["native"]["pageIdEvidence"]
        for observation in row["native"]["pageRevisionObservations"]:
            uuid.UUID(observation["revision"])
            assert row["native"]["pageId"], "Page revision without a page identity"
        for facet in ("delivery", "desktop", "mobile", "editor"):
            assert row[facet]["status"] != "passed", "Unqualified pass prohibited"
            assert row[facet]["status"] == "unknown" or row[facet]["evidence"]
    ids = [uuid.UUID(i) for scope in data["preparedFourPublicationScopes"] for i in scope["itemIds"]]
    assert len(ids) == len(set(ids)) == 110
    assert [len(s["itemIds"]) for s in data["preparedFourPublicationScopes"]] == [65, 16, 18, 11]
    for facet, counts in data["summary"]["facetStatusCounts"].items():
        assert dict(collections.Counter(r[facet]["status"] for r in rows)) == counts
    print(json.dumps({"result": "PASS", "routeRows": len(rows), "uniqueNativePageIds": len(identities),
                      "evidenceReferencesResolved": references, "inputHashesVerified": len(source),
                      "preparedUniqueItemIds": len(set(ids)), "completionClaims": False}, indent=2))


if __name__ == "__main__":
    main()
