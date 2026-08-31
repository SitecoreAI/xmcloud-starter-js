const crypto = require("node:crypto");

function normalizeValue(value) {
    return String(value ?? "")
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replaceAll("\u2028", "\n")
        .replaceAll("\u2029", "\n");
}

function createContentRevision({
    itemId,
    scope,
    fields,
    revisionFieldIds = [],
}) {
    const excludedIds = new Set(
        revisionFieldIds.map((fieldId) => String(fieldId).toLowerCase()),
    );
    const canonicalFields = (fields ?? [])
        .filter((entry) => !excludedIds.has(String(entry.ID).toLowerCase()))
        .map((entry) => [
            String(entry.ID).toLowerCase(),
            normalizeValue(entry.Value),
        ])
        .sort((left, right) =>
            `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`),
        );
    const hash = crypto
        .createHash("sha256")
        .update(
            JSON.stringify({
                itemId: String(itemId).replace(/[{}]/g, "").toLowerCase(),
                scope,
                fields: canonicalFields,
            }),
        )
        .digest("hex");

    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

module.exports = { createContentRevision };
