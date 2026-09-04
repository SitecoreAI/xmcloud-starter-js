import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(appRoot, "..", "..");
const serializationRoot = path.join(
    repositoryRoot,
    "authoring/items/slb-content/slb.site/slb",
);
const fallbackPath = path.join(
    appRoot,
    "src/content/slb-fallback-content.json",
);
const damMapPath = path.join(appRoot, "src/content/slb-dam-assets.json");

const expected = {
    pages: 23,
    generatedDatasources: 267,
    logicalRenderings: 144,
    englishRenderings: 144,
    spanishRenderings: 143,
};

const locales = ["en", "es-MX"];
const finalRenderingsFieldId = "04bf00db-f5fb-41f7-8ab7-22408372a981";
const displayNameFieldId = "b5e02ad9-d56f-4c41-a065-a133db87bdeb";
const revisionFieldId = "8cdc337e-a112-42fb-bbb4-4143751e123f";
const sharedRevisionFieldId = "dbbbeca1-21c7-4906-9dd2-493c1efa59a2";
const heroRenderingId = "927fe09d-c039-b897-165c-995487b11b87";
const campaignRenderingUid = "0abd1a13-bd83-4060-8e54-f9b577ed4db1";
const campaignDefaultDatasourceId = "aadba9e9-3b8c-4f24-8b3a-0dd30a602ff1";
const campaignVariantDatasourceId = "8b14ed5b-b5b7-4a14-bea9-58b58fc1fd81";

const renderingIds = new Map([
    [heroRenderingId, "SLB Hero"],
    ["241a1b8e-e69a-4e07-b5e4-53975371ad3c", "PromoAnimated"],
    ["d806ddf7-39a7-4a6d-8e0a-d138bc53845d", "MultiPromo"],
    ["50b36874-8c4e-4958-9dd6-8b95c6afd09a", "RichTextBlock"],
    ["3332f59b-f5f3-44df-b66e-2811c31aeb3c", "CtaBanner"],
]);

const datasourceTemplates = new Map([
    ["a19c3230-c5ee-47a1-ae3f-12a1fc3c4273", "SLB Hero"],
    ["bd372d9d-6e4f-4ae9-a54c-dbc2acdebe2a", "PromoAnimated"],
    ["775d6354-cf01-4f34-9713-d34645079c88", "MultiPromo"],
    ["f94c8c17-70e8-4d8b-9d35-d0465c0e0945", "MultiPromo item"],
    ["58041043-7bea-44f0-b1b8-08e4ea7054f4", "RichTextBlock"],
    ["bee4869d-b588-42c2-9797-76510c397e6a", "CtaBanner"],
]);

const authoredFieldsByTemplate = new Map([
    [
        "a19c3230-c5ee-47a1-ae3f-12a1fc3c4273",
        [
            ["3f384b8c-9364-4f44-91ea-7f7fa3a76de9", "titleRequired"],
            ["e2223200-5161-4e5a-9a35-9a5ac126c05c", "descriptionOptional"],
            ["c17f89f8-7429-4af1-a47d-b7b1e037fe45", "linkOptional"],
            ["1c4089ef-d9fa-4515-ad8b-eac558420564", "heroImageOptional1"],
        ],
    ],
    [
        "bd372d9d-6e4f-4ae9-a54c-dbc2acdebe2a",
        [
            ["84a2a397-786e-43bd-85a0-bfbcc51fc3f3", "image"],
            ["da7db0f2-08eb-47c5-af07-ed12a1e998db", "title"],
            ["c00d4bd2-a452-4067-a861-e8c6d47201a7", "description"],
            ["e9e9c847-e0f0-497d-8e41-5211a087029a", "primaryLink"],
            ["3a2a1142-68ca-4f5b-afb0-c17d2c0ef8ea", "secondaryLink"],
        ],
    ],
    [
        "775d6354-cf01-4f34-9713-d34645079c88",
        [
            ["24fa0354-d116-4f42-9eaa-bdab15a8ade7", "title"],
            ["2fe9bed7-7bcc-4a35-a209-34bcb84fcb42", "description"],
        ],
    ],
    [
        "f94c8c17-70e8-4d8b-9d35-d0465c0e0945",
        [
            ["5c33f772-5806-4ad8-a236-730f1b299531", "heading"],
            ["54a924ec-8e98-4597-b9c2-d616dd66cc7c", "description"],
            ["7eca61ae-f0c1-49e6-b131-686ab895a1dc", "image"],
            ["8ec6e4b8-3a38-4115-a892-38051924f3f1", "link"],
        ],
    ],
    [
        "58041043-7bea-44f0-b1b8-08e4ea7054f4",
        [["8b57dadd-0825-4f5d-9c32-187c0af7e1fd", "text"]],
    ],
    [
        "bee4869d-b588-42c2-9797-76510c397e6a",
        [
            ["7a8c2095-39f5-4f40-b69d-16ddff188a68", "titleRequired"],
            ["a35015fe-805c-45d7-9446-f88b33a157d4", "descriptionOptional"],
            ["9fdcf3e1-5289-4ae0-b4e4-9460ad50814f", "linkOptional"],
        ],
    ],
]);

const heroDatasourceTemplateId = "a19c3230-c5ee-47a1-ae3f-12a1fc3c4273";
const supportingImageFieldIds = new Set([
    "84a2a397-786e-43bd-85a0-bfbcc51fc3f3",
    "7eca61ae-f0c1-49e6-b131-686ab895a1dc",
]);
const allowedPersonalizationDatasourceIds = new Set([
    campaignDefaultDatasourceId,
    campaignVariantDatasourceId,
]);
const legacySignatures = [
    { label: "Solterra", pattern: /\bsolterra\b/i },
    { label: "wellness starter copy", pattern: /\bwellness\b/i },
    { label: "lifestyle starter copy", pattern: /\blifestyle\b/i },
    {
        label: "confidence-revolution starter copy",
        pattern: /\bconfidence revolution\b/i,
    },
];
const starterPlaceholderSignatures = [
    { label: "Hero title", pattern: /^\s*Title\s*$/i },
    { label: "Hero description", pattern: /^\s*Description Text\s*$/i },
    { label: "Animated Promo title", pattern: /Animated Promo Title/i },
    {
        label: "Animated Promo description",
        pattern:
            /This is a description field and can be longer for more information\./i,
    },
    { label: "Primary Link CTA", pattern: /Primary Link CTA/i },
    { label: "Secondary Link CTA", pattern: /Secondary Link CTA/i },
    { label: "Multi-Promo title", pattern: /Multi-Promo Title Field/i },
    {
        label: "Multi-Promo description",
        pattern: /Multi-Promo Description Field/i,
    },
    { label: "Simple Promo heading", pattern: /This is the Promo Heading/i },
    {
        label: "Simple Promo description",
        pattern:
            /This is a description field, the text can be longer and provide some information about the promo\./i,
    },
    {
        label: "Simple Promo link",
        pattern: /This is a Call to Action link/i,
    },
    {
        label: "Simple Promo image",
        pattern: /04DAD0FD-DB66-4070-881F-17264CA257E1/i,
    },
    {
        label: "CTA Banner title",
        pattern: /This is the Banner Title field/i,
    },
    { label: "CTA Banner link", pattern: /\bClick Here\b/i },
    {
        label: "CTA Banner description",
        pattern:
            /This is the CTA Banner description field, the text can be longer here/i,
    },
    {
        label: "starter Sitecore URL",
        pattern: /https?:\/\/(?:www\.)?sitecore\.(?:ai|com)(?:[\/"\s]|$)/i,
    },
    { label: "empty starter image", pattern: /^\s*<image\s*\/>\s*$/i },
    {
        label: "generic description placeholder",
        pattern: /^\s*description\s*$/i,
    },
];

const generatedDatasourcePathPattern =
    /^\/sitecore\/content\/slb\/slb\/Data\/(?:SLB Heroes|Animated Promos|MultiPromos|Rich Texts|Calls to Action Banners)\/([A-Z]\d{2})(?:\s|\/)/;

const failures = [];

function fail(message) {
    failures.push(message);
}

function normalizedGuid(value) {
    const match = String(value ?? "")
        .trim()
        .match(
            /^\{?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\}?$/i,
        );
    return match?.[1].toLowerCase();
}

function serializedFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .flatMap((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) return serializedFiles(entryPath);
            return entry.isFile() && entry.name.endsWith(".yml")
                ? [entryPath]
                : [];
        });
}

function parseSerializedFile(filePath) {
    try {
        // Sitecore can serialize a wildcard as an unquoted YAML scalar. Quote
        // only that exact value so js-yaml does not interpret it as an alias.
        const source = fs
            .readFileSync(filePath, "utf8")
            .replace(/^\uFEFF/, "")
            .replace(/^(\s*Value:\s*)\*(\s*)$/gm, '$1"*"$2');
        return yaml.load(source);
    } catch (error) {
        fail(
            `Could not parse ${path.relative(repositoryRoot, filePath)}: ${error.message}`,
        );
        return undefined;
    }
}

function language(document, locale) {
    return document?.Languages?.find((entry) => entry.Language === locale);
}

function latestVersion(document, locale) {
    const versions = language(document, locale)?.Versions ?? [];
    return [...versions].sort(
        (left, right) => Number(right.Version) - Number(left.Version),
    )[0];
}

function fieldById(fields, id) {
    const normalizedId = id.toLowerCase();
    return (fields ?? []).find(
        (entry) => String(entry.ID).toLowerCase() === normalizedId,
    );
}

function expectedContentRevision(itemId, scope, fields) {
    const canonicalFields = (fields ?? [])
        .filter(
            (entry) =>
                ![revisionFieldId, sharedRevisionFieldId].includes(
                    String(entry.ID).toLowerCase(),
                ),
        )
        .map((entry) => [
            String(entry.ID).toLowerCase(),
            String(entry.Value ?? "")
                .replaceAll("\r\n", "\n")
                .replaceAll("\r", "\n")
                .replaceAll("\u2028", "\n")
                .replaceAll("\u2029", "\n"),
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

function assertContentSensitiveRevisions(document, context) {
    if (document.SharedFields?.length) {
        const revision = fieldById(
            document.SharedFields,
            sharedRevisionFieldId,
        )?.Value;
        const expectedRevision = expectedContentRevision(
            document.ID,
            "shared",
            document.SharedFields,
        );
        if (String(revision).toLowerCase() !== expectedRevision) {
            fail(`${context} has a stale or identity-only shared revision.`);
        }
    }

    for (const languageItem of document.Languages ?? []) {
        for (const version of languageItem.Versions ?? []) {
            const revision = fieldById(version.Fields, revisionFieldId)?.Value;
            const expectedRevision = expectedContentRevision(
                document.ID,
                `${languageItem.Language}:version:${version.Version}`,
                [...(languageItem.Fields ?? []), ...(version.Fields ?? [])],
            );
            if (String(revision).toLowerCase() !== expectedRevision) {
                fail(
                    `${context} ${languageItem.Language} v${version.Version} has a stale or identity-only version revision.`,
                );
            }
        }
    }
}

function xmlAttribute(tag, attribute) {
    const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return tag.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`, "i"))?.[1];
}

function layoutRenderings(layout) {
    return [...String(layout).matchAll(/<r\b[^>]*>/gi)]
        .map((match) => match[0])
        .filter((tag) => xmlAttribute(tag, "s:id"))
        .map((tag) => ({
            tag,
            uid: normalizedGuid(xmlAttribute(tag, "uid")),
            id: normalizedGuid(xmlAttribute(tag, "s:id")),
            datasource: xmlAttribute(tag, "s:ds"),
            placeholder: xmlAttribute(tag, "s:ph"),
        }));
}

function namespacedDatasourceReferences(layout) {
    return [...String(layout).matchAll(/\bs:(?:ds|DataSource)="([^"]+)"/g)].map(
        (match) => match[1],
    );
}

function pageFile(page) {
    if (page.routes.en === "/") return path.join(serializationRoot, "Home.yml");
    return (
        path.join(
            serializationRoot,
            "Home",
            ...page.routes.en.split("/").filter(Boolean),
        ) + ".yml"
    );
}

function expectedPageItemPath(page) {
    return `/sitecore/content/slb/slb/Home${page.routes.en === "/" ? "" : page.routes.en}`;
}

function fieldValues(fields) {
    return (fields ?? []).map((entry) => String(entry.Value ?? ""));
}

function assertNoLegacyValues(values, context) {
    for (const value of values) {
        for (const signature of legacySignatures) {
            if (signature.pattern.test(value)) {
                fail(`${context} contains legacy ${signature.label}.`);
            }
        }
    }
}

function assertNoStarterPlaceholders(values, context) {
    for (const value of values) {
        for (const signature of starterPlaceholderSignatures) {
            if (signature.pattern.test(value)) {
                fail(`${context} contains starter ${signature.label}.`);
            }
        }
    }
}

function assertExplicitAuthoredFields(document, itemPath, templateId) {
    const requiredFields = authoredFieldsByTemplate.get(templateId) ?? [];
    for (const languageItem of document.Languages ?? []) {
        for (const version of languageItem.Versions ?? []) {
            const fields = version.Fields ?? [];
            for (const [fieldId, fieldHint] of requiredFields) {
                const matches = fields.filter(
                    (entry) =>
                        String(entry.ID).toLowerCase() ===
                        fieldId.toLowerCase(),
                );
                if (matches.length === 0) {
                    fail(
                        `${itemPath} ${languageItem.Language} v${version.Version} does not explicitly serialize ${fieldHint} (${fieldId}); a starter Standard Value could leak through.`,
                    );
                } else if (matches.length > 1) {
                    fail(
                        `${itemPath} ${languageItem.Language} v${version.Version} serializes ${fieldHint} (${fieldId}) ${matches.length} times.`,
                    );
                } else if (!Object.hasOwn(matches[0], "Value")) {
                    fail(
                        `${itemPath} ${languageItem.Language} v${version.Version} serializes ${fieldHint} (${fieldId}) without an explicit Value.`,
                    );
                }
            }

            assertNoStarterPlaceholders(
                fieldValues(fields),
                `${itemPath} ${languageItem.Language} v${version.Version}`,
            );
        }
    }
}

function damUrlToFilename() {
    const descriptors = JSON.parse(fs.readFileSync(damMapPath, "utf8"));
    return new Map(
        Object.entries(descriptors).map(([filename, descriptor]) => [
            descriptor.publicUrl,
            filename,
        ]),
    );
}

const filenameByDamUrl = damUrlToFilename();

function imageIdentity(fieldValue) {
    const source = String(fieldValue ?? "")
        .match(/\bsrc="([^"]+)"/i)?.[1]
        ?.replaceAll("&amp;", "&");
    if (!source) return undefined;
    const mappedFilename = filenameByDamUrl.get(source);
    if (mappedFilename) return mappedFilename;
    if (source.startsWith("/images/slb/")) {
        return decodeURIComponent(source.slice("/images/slb/".length));
    }
    return source.toLowerCase();
}

const fallbackCatalog = JSON.parse(fs.readFileSync(fallbackPath, "utf8"));
const pages = Array.isArray(fallbackCatalog.pages) ? fallbackCatalog.pages : [];

if (pages.length !== expected.pages) {
    fail(
        `Fallback catalog maps ${pages.length} pages; expected ${expected.pages}.`,
    );
}

const pageIds = new Set(pages.map((page) => page.id));
if (pageIds.size !== pages.length) {
    fail("Fallback catalog contains duplicate page IDs.");
}

const items = [];
const itemByFile = new Map();
const itemById = new Map();
const itemByPath = new Map();

for (const filePath of serializedFiles(serializationRoot)) {
    const document = parseSerializedFile(filePath);
    if (!document) continue;
    const item = { document, filePath };
    items.push(item);
    itemByFile.set(path.resolve(filePath), item);

    const id = normalizedGuid(document.ID);
    if (id) itemById.set(id, item);
    if (document.Path) itemByPath.set(String(document.Path), item);
}

const mappedPageItems = [];
const mappedPageFiles = new Set();
const mappedPageIds = new Set();
const pageLayouts = new Map();
const renderingsByLocale = new Map(locales.map((locale) => [locale, []]));

for (const page of pages) {
    const filePath = path.resolve(pageFile(page));
    const item = itemByFile.get(filePath);
    if (!item) {
        fail(
            `${page.id} does not map to a serialized page item at ${path.relative(repositoryRoot, filePath)}.`,
        );
        continue;
    }

    mappedPageItems.push(item);
    mappedPageFiles.add(filePath);
    const itemId = normalizedGuid(item.document.ID);
    if (itemId) mappedPageIds.add(itemId);

    const expectedPath = expectedPageItemPath(page);
    if (item.document.Path !== expectedPath) {
        fail(
            `${page.id} maps to ${item.document.Path}; expected ${expectedPath}.`,
        );
    }

    for (const locale of locales) {
        const languageItem = language(item.document, locale);
        const version = latestVersion(item.document, locale);
        if (!languageItem || !version) {
            fail(`${page.id} is missing a version for ${locale}.`);
            continue;
        }

        assertNoLegacyValues(
            [
                ...fieldValues(languageItem.Fields),
                ...fieldValues(version.Fields),
            ],
            `${page.id} ${locale} latest page fields`,
        );

        const layout = fieldById(version.Fields, finalRenderingsFieldId)?.Value;
        if (!String(layout ?? "").trim()) {
            fail(
                `${page.id} ${locale} latest version has no final-renderings layout.`,
            );
            continue;
        }

        const renderings = layoutRenderings(layout);
        const headlessMain = renderings.filter(
            (rendering) => rendering.placeholder === "headless-main",
        );
        if (headlessMain.length === 0) {
            fail(
                `${page.id} ${locale} latest version has no nonempty headless-main presentation.`,
            );
        }
        if (headlessMain.length !== renderings.length) {
            fail(
                `${page.id} ${locale} contains a rendering outside headless-main.`,
            );
        }

        const heroRenderings = renderings.filter(
            (rendering) => rendering.id === heroRenderingId,
        );
        if (renderings[0]?.id !== heroRenderingId) {
            fail(
                `${page.id} ${locale} does not begin with the approved SLB Hero rendering ID.`,
            );
        }
        if (heroRenderings.length !== 1) {
            fail(
                `${page.id} ${locale} has ${heroRenderings.length} SLB Hero renderings; expected 1.`,
            );
        }

        for (const rendering of renderings) {
            if (!rendering.uid) {
                fail(
                    `${page.id} ${locale} has a rendering without a valid UID.`,
                );
            }
            if (!rendering.id || !renderingIds.has(rendering.id)) {
                fail(
                    `${page.id} ${locale} uses unapproved rendering ID ${xmlAttribute(rendering.tag, "s:id") ?? "<missing>"}.`,
                );
            }
        }

        pageLayouts.set(`${page.id}:${locale}`, {
            layout: String(layout),
            renderings,
        });
        renderingsByLocale.get(locale).push(...renderings);
    }
}

if (
    mappedPageItems.length !== expected.pages ||
    mappedPageFiles.size !== expected.pages ||
    mappedPageIds.size !== expected.pages
) {
    fail(
        `Mapped page inventory is ${mappedPageItems.length} items, ${mappedPageFiles.size} files, and ${mappedPageIds.size} item IDs; expected exactly ${expected.pages} of each.`,
    );
}

const generatedDatasources = items.filter((item) =>
    generatedDatasourcePathPattern.test(String(item.document.Path ?? "")),
);

for (const item of [...mappedPageItems, ...generatedDatasources]) {
    assertContentSensitiveRevisions(item.document, String(item.document.Path));
}

if (generatedDatasources.length !== expected.generatedDatasources) {
    fail(
        `Found ${generatedDatasources.length} generated datasource items; expected ${expected.generatedDatasources}.`,
    );
}

const generatedDatasourcesByPage = new Map();

for (const item of generatedDatasources) {
    const itemPath = String(item.document.Path);
    const serializedSource = fs.readFileSync(item.filePath, "utf8");
    if (/^\s*Value:\s*(?:""|'')\s*$/m.test(serializedSource)) {
        fail(
            `${itemPath} serializes a quoted blank Value; Sitecore requires an empty Value scalar to clear Standard Values.`,
        );
    }
    const pageId = itemPath.match(generatedDatasourcePathPattern)?.[1];
    if (!pageId || !pageIds.has(pageId)) {
        fail(`${itemPath} is not assigned to a mapped fallback page.`);
        continue;
    }
    if (!generatedDatasourcesByPage.has(pageId)) {
        generatedDatasourcesByPage.set(pageId, []);
    }
    generatedDatasourcesByPage.get(pageId).push(item);

    const templateId = normalizedGuid(item.document.Template);
    if (!templateId || !datasourceTemplates.has(templateId)) {
        fail(
            `${itemPath} uses unapproved datasource template ${item.document.Template}.`,
        );
    } else {
        assertExplicitAuthoredFields(item.document, itemPath, templateId);
    }

    for (const locale of locales) {
        const languageItem = language(item.document, locale);
        const version = latestVersion(item.document, locale);
        if (!languageItem || !version) {
            fail(`${itemPath} is missing a generated ${locale} version.`);
            continue;
        }

        const displayNameFields = (version.Fields ?? []).filter(
            (field) => String(field.ID).toLowerCase() === displayNameFieldId,
        );
        if (displayNameFields.length !== 1) {
            fail(
                `${itemPath} ${locale} serializes ${displayNameFields.length} localized __Display name fields; expected exactly 1.`,
            );
        } else if (!String(displayNameFields[0].Value ?? "").trim()) {
            fail(`${itemPath} ${locale} has a blank localized __Display name.`);
        }

        assertNoLegacyValues(
            [
                ...fieldValues(languageItem.Fields),
                ...fieldValues(version.Fields),
            ],
            `${itemPath} ${locale}`,
        );
    }
}

for (const [locale, renderings] of renderingsByLocale) {
    const expectedCount =
        locale === "en"
            ? expected.englishRenderings
            : expected.spanishRenderings;
    if (renderings.length !== expectedCount) {
        fail(
            `${locale} has ${renderings.length} rendering placements; expected ${expectedCount}.`,
        );
    }
}

const uniqueRenderingUids = new Set(
    [...renderingsByLocale.values()]
        .flat()
        .map((rendering) => rendering.uid)
        .filter(Boolean),
);
if (uniqueRenderingUids.size !== expected.logicalRenderings) {
    fail(
        `Found ${uniqueRenderingUids.size} logical rendering instances across localized layouts; expected ${expected.logicalRenderings}.`,
    );
}

for (const page of pages) {
    for (const locale of locales) {
        const pageLayout = pageLayouts.get(`${page.id}:${locale}`);
        if (!pageLayout) continue;

        for (const datasourceValue of namespacedDatasourceReferences(
            pageLayout.layout,
        )) {
            const datasourceId = normalizedGuid(datasourceValue);
            if (!datasourceId) {
                fail(
                    `${page.id} ${locale} has a non-item datasource reference: ${datasourceValue}.`,
                );
                continue;
            }
            if (
                !itemById.has(datasourceId) &&
                !allowedPersonalizationDatasourceIds.has(datasourceId)
            ) {
                fail(
                    `${page.id} ${locale} rendering datasource ${datasourceId} does not resolve to the serialized snapshot.`,
                );
            }
        }

        for (const rendering of pageLayout.renderings) {
            const datasourceId = normalizedGuid(rendering.datasource);
            const datasource = datasourceId
                ? itemById.get(datasourceId)?.document
                : undefined;
            const templateId = normalizedGuid(datasource?.Template);
            if (
                templateId === heroDatasourceTemplateId &&
                rendering.id !== heroRenderingId
            ) {
                fail(
                    `${page.id} ${locale} renders an SLB Hero datasource with ${rendering.id ?? "an invalid rendering ID"}.`,
                );
            }
            if (
                rendering.id === heroRenderingId &&
                templateId !== heroDatasourceTemplateId
            ) {
                fail(
                    `${page.id} ${locale} SLB Hero does not resolve to an SLB Hero datasource.`,
                );
            }
        }
    }
}

for (const page of pages) {
    for (const locale of locales) {
        const seenImages = new Map();
        for (const item of generatedDatasourcesByPage.get(page.id) ?? []) {
            const version = latestVersion(item.document, locale);
            for (const imageField of (version?.Fields ?? []).filter((field) =>
                supportingImageFieldIds.has(String(field.ID).toLowerCase()),
            )) {
                const image = imageIdentity(imageField.Value);
                if (!image) continue;
                if (seenImages.has(image)) {
                    fail(
                        `${page.id} ${locale} allocates supporting image ${image} more than once (${seenImages.get(image)} and ${item.document.Path}).`,
                    );
                } else {
                    seenImages.set(image, item.document.Path);
                }
            }
        }
    }
}

const natureFocusImages = [
    "nature-biodiversity-field-survey.jpg",
    "nature-water-sampling-operation.jpg",
    "nature-equipment-circularity-workshop.jpg",
];

for (const locale of locales) {
    const actualImages = natureFocusImages.map((_, index) => {
        const cardPath = `/sitecore/content/slb/slb/Data/MultiPromos/U04 component-02 Cards/Card ${String(index + 1).padStart(2, "0")}`;
        const card = itemByPath.get(cardPath)?.document;
        const version = card ? latestVersion(card, locale) : undefined;
        const imageField = (version?.Fields ?? []).find((field) =>
            supportingImageFieldIds.has(String(field.ID).toLowerCase()),
        );
        return imageIdentity(imageField?.Value);
    });
    if (
        actualImages.some(
            (image, index) => image !== natureFocusImages[index],
        ) ||
        new Set(actualImages).size !== natureFocusImages.length
    ) {
        fail(
            `U04 ${locale} nature-focus images are ${actualImages.join(", ")}; expected unique biodiversity, water, and circularity assets in that order.`,
        );
    }
}

const campaignLayout = pageLayouts.get("S03:en");
const campaignRendering = campaignLayout?.renderings.find(
    (rendering) => rendering.uid === campaignRenderingUid,
);

if (!campaignRendering) {
    fail("S03 en is missing the campaign personalization rendering UID.");
} else {
    if (campaignRendering.id !== "3332f59b-f5f3-44df-b66e-2811c31aeb3c") {
        fail("S03 en campaign personalization does not use CtaBanner.");
    }
    if (
        normalizedGuid(campaignRendering.datasource) !==
        campaignDefaultDatasourceId
    ) {
        fail(
            "S03 en campaign personalization has the wrong default datasource.",
        );
    }
}

const campaignXml = campaignLayout?.layout ?? "";
if (!/<rls\b/i.test(campaignXml)) {
    fail("S03 en personalization has no <rls> rule block.");
}
if (!/<ruleset\b[^>]*\bs:pet="true"/i.test(campaignXml)) {
    fail("S03 en personalization has no active personalization ruleset.");
}
if (!/\bs:VariantName="[^"]+"/i.test(campaignXml)) {
    fail("S03 en personalization has no campaign variant rule.");
}
if (
    !namespacedDatasourceReferences(campaignXml)
        .map(normalizedGuid)
        .includes(campaignVariantDatasourceId)
) {
    fail(
        "S03 en personalization rule does not reference the variant datasource.",
    );
}

if (failures.length > 0) {
    console.error(
        `SLB Sitecore authoring-content audit failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`,
    );
    failures.forEach((failure, index) => {
        console.error(`${index + 1}. ${failure}`);
    });
    process.exitCode = 1;
} else {
    console.log("SLB Sitecore authoring-content audit passed.");
    console.log(`- ${mappedPageItems.length} mapped page items`);
    console.log(
        `- ${generatedDatasources.length} generated bilingual datasource items`,
    );
    console.log(
        `- ${uniqueRenderingUids.size} logical rendering instances (${renderingsByLocale.get("en").length} en, ${renderingsByLocale.get("es-MX").length} es-MX placements)`,
    );
    console.log(
        "- SLB Hero IDs, datasource references, and campaign rules valid",
    );
    console.log(
        "- All generated datasource fields explicitly serialized; no starter placeholders",
    );
    console.log(
        "- All generated datasource items have localized display names",
    );
    console.log(
        "- Serialized item revisions are content-sensitive and current",
    );
    console.log("- Supporting images unique per page; U04 focus imagery valid");
    console.log("- No legacy Solterra signatures in authored content");
}
