"""Bounded native SCS Value encoding, based on observed CLI 6.0.23 format.

The native reader does not decode JSON escapes in quoted Values. Complex values
therefore use the observed physical ``Value: |`` form, with exactly one final LF.
The logical source and expected wire value are separate, explicit contracts.
Empty quoted Values store literal quotes. NEW desired-empty overrides must omit
the whole field and require actual native Standard Values/default evidence.
Offline parsing or a contract never proves a successful native write/readback.
"""
from __future__ import annotations

import hashlib
import json
import re

ENCODING = "sitecore-cli-6.0.23-observed-literal-value-v2-empty-create-omission"


def empty_create_contract() -> dict:
    return {
        "payloadOverride": "omitted-desired-empty",
        "requiresEmptyDefaultProof": True,
        "acceptedNativeStoredStates": ["absent"],
        "expectedEffectiveDefaultValue": "",
    }


def value_contract(value: str) -> dict:
    if not isinstance(value, str):
        raise ValueError("Native Value must be a string")
    if any((ord(c) < 32 and c not in "\n\t") or c in "\x7f\u0085\u2028\u2029" for c in value):
        raise ValueError("Unsupported native Value control/line format")
    try:
        logical_bytes = value.encode("utf-8")
    except UnicodeEncodeError as error:
        raise ValueError("Native Value must be valid UTF-8") from error
    if value.endswith("\n\n"):
        raise ValueError("Multiple trailing LFs cannot be silently clipped; actual preservation probe required")
    complex_value = any(c in value for c in '\n\\"\t') or value.lstrip().startswith("<")
    if complex_value and any(line and not line.strip() for line in value.split("\n")):
        raise ValueError("Whitespace-only block lines are not proved")
    wire = value if not complex_value or value.endswith("\n") else value + "\n"
    return {
        "style": "observed-literal-block" if complex_value else "simple-double-quoted-no-escapes",
        "sourceLogicalValue": value,
        "expectedSerializedWireValue": wire,
        "allowedNativeClipDifference": "exactly-one-appended-LF" if wire != value else None,
        "sourceLogicalSha256": hashlib.sha256(logical_bytes).hexdigest(),
        "expectedWireSha256": hashlib.sha256(wire.encode("utf-8")).hexdigest(),
        "nativeWriteVerified": False,
    }


def quote_scalar(value: str) -> str:
    """Quote only strings that need no escape interpretation by native SCS."""
    contract = value_contract(value)
    if contract["style"] != "simple-double-quoted-no-escapes":
        raise ValueError("Unsupported escaped native identity/header attribute")
    return json.dumps(value, ensure_ascii=False)


def value_lines(value: str, indent: int) -> list[str]:
    if value == "":
        raise ValueError('Desired-empty create fields must be omitted; existing clears require native probe evidence, never Value: ""')
    contract = value_contract(value)
    prefix = " " * indent
    if contract["style"] == "simple-double-quoted-no-escapes":
        return [prefix + "Value: " + quote_scalar(value)]
    body = value[:-1] if value.endswith("\n") else value
    return [prefix + "Value: |"] + [prefix + "  " + line for line in body.split("\n")]


def validate_tokens(raw: str) -> None:
    """Reject Python-only escape/chomping assumptions in prepared payloads.

    Literal body text may itself contain ``Value:``; it is content, not an SCS
    token. The full structural parser remains a separate mandatory gate.
    """
    block_indent = None
    for line in raw.lstrip("\ufeff").splitlines():
        indent = len(line) - len(line.lstrip(" "))
        if block_indent is not None:
            if not line.strip() or indent >= block_indent:
                continue
            block_indent = None
        match = re.fullmatch(r"( *)Value:(?: (.*))?", line)
        if not match:
            continue
        token = match.group(2) or ""
        if token == '""':
            raise ValueError('Unsafe empty quoted native Value; omit the create field, never Value: ""')
        if token == "|":
            block_indent = len(match.group(1)) + 2
        elif token.startswith('"'):
            if not token.endswith('"') or "\\" in token or '"' in token[1:-1]:
                raise ValueError("Unsafe JSON-escaped native Value; observed literal block required")
            quote_scalar(json.loads(token))
        elif token.startswith(("|", ">")):
            raise ValueError("Only safe quoted Value or observed Value: | is supported; no chomping/folding assumption")
