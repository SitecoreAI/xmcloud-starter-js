#!/usr/bin/env python3
"""Verify native SCS readback blobs without printing binary/base64 content."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import re


def verify(expected: dict, directory: Path) -> dict:
    results = []
    wanted = {item["id"].lower(): item for item in expected["readbackVerification"]}
    observed = {}
    for path in directory.rglob("*.yml"):
        text = path.read_text(encoding="utf-8-sig")
        item_id = re.search(r'^ID:\s*"?([^"\n]+)', text, re.M)
        if not item_id or item_id.group(1).lower() not in wanted:
            continue
        identifier = item_id.group(1).lower()
        match = re.search(r'Hint: Blob\n\s+BlobID:\s*"?([^"\n]+)"?\n\s+Value:\s*(\S+)', text)
        if not match:
            raise ValueError("Native readback contains no serialized Blob/BlobID")
        token = match.group(2)
        encoded = json.loads(token) if token.startswith('"') else token
        binary = base64.b64decode(encoded, validate=True)
        row = wanted[identifier]
        digest = hashlib.sha256(binary).hexdigest()
        if digest != row["sha256"] or len(binary) != row["bytes"]:
            raise ValueError("Native media round-trip bytes differ from reviewed source")
        observed[identifier] = True
        results.append({"id": identifier, "path": row["path"], "sha256": digest, "bytes": len(binary), "nativeBlobId": match.group(1), "sourceBlobId": row["blobId"], "verified": True})
    if set(observed) != set(wanted):
        raise ValueError("Not every expected media item was present in native readback")
    return {"status": "native-media-byte-roundtrip-verified", "mediaCount": len(results), "results": results, "remoteWrites": 0, "privateReadbackDirectory": str(directory)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("expected", type=Path)
    parser.add_argument("items", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = verify(json.loads(args.expected.read_text()), args.items)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ("status", "mediaCount", "remoteWrites")}))


if __name__ == "__main__":
    main()
