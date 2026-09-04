import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(appRoot, "..", "..");
const datasourceRoot = path.join(
    repositoryRoot,
    "authoring/items/slb-content/slb.site/slb/Data",
);
const datasourceTemplates = new Set([
    "a19c3230-c5ee-47a1-ae3f-12a1fc3c4273",
    "bd372d9d-6e4f-4ae9-a54c-dbc2acdebe2a",
    "775d6354-cf01-4f34-9713-d34645079c88",
    "f94c8c17-70e8-4d8b-9d35-d0465c0e0945",
    "58041043-7bea-44f0-b1b8-08e4ea7054f4",
    "bee4869d-b588-42c2-9797-76510c397e6a",
]);
const expectedDatasourceCount = 270;
const expectedLocalizedDisplayNameCount = 536;
const locales = ["en", "es-MX"];
const displayNameFieldId = "b5e02ad9-d56f-4c41-a065-a133db87bdeb";
const sitecoreItemNamePattern = /^[A-Za-z0-9_*$][A-Za-z0-9_ $-]*$/;
const applyChanges = process.argv.includes("--apply");
const authoringHost = process.env.SITECORE_AUTHORING_HOST?.replace(/\/+$/, "");
const accessToken = process.env.SITECORE_ACCESS_TOKEN;

if (!authoringHost || !accessToken) {
    throw new Error(
        "Set SITECORE_AUTHORING_HOST and SITECORE_ACCESS_TOKEN before running this migration.",
    );
}

function normalizedGuid(value) {
    const hex = String(value ?? "")
        .replace(/[^0-9a-f]/gi, "")
        .toLowerCase();
    if (hex.length !== 32) return "";
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function serializedFiles(directory) {
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) return serializedFiles(entryPath);
            return entry.isFile() && entry.name.endsWith(".yml")
                ? [entryPath]
                : [];
        });
}

function chunks(values, size) {
    const result = [];
    for (let index = 0; index < values.length; index += size) {
        result.push(values.slice(index, index + size));
    }
    return result;
}

function graphQlString(value) {
    return JSON.stringify(String(value));
}

async function graphQl(query) {
    const response = await fetch(
        `${authoringHost}/sitecore/api/authoring/graphql/v1/`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
        },
    );
    const result = await response.json();
    if (!response.ok || result.errors?.length) {
        throw new Error(
            `Sitecore Authoring API request failed: ${JSON.stringify(result.errors ?? result)}`,
        );
    }
    return result.data;
}

function loadRenameManifest() {
    const manifest = serializedFiles(datasourceRoot)
        .map((filePath) => {
            const source = fs
                .readFileSync(filePath, "utf8")
                .replace(/^\uFEFF/, "");
            return { filePath, document: yaml.load(source) };
        })
        .filter(({ document }) =>
            datasourceTemplates.has(normalizedGuid(document.Template)),
        )
        .map(({ filePath, document }) => {
            const targetPath = String(document.Path);
            const targetName = targetPath.split("/").at(-1) ?? "";
            const targetDisplayNames = {};
            for (const language of document.Languages ?? []) {
                const displayNameFields = (language.Fields ?? []).filter(
                    (field) => normalizedGuid(field.ID) === displayNameFieldId,
                );
                if (displayNameFields.length > 1) {
                    throw new Error(
                        `${targetPath} has duplicate ${language.Language} __Display name fields.`,
                    );
                }
                if (displayNameFields.length === 1) {
                    const value = String(
                        displayNameFields[0].Value ?? "",
                    ).trim();
                    if (!value) {
                        throw new Error(
                            `${targetPath} has a blank ${language.Language} __Display name.`,
                        );
                    }
                    targetDisplayNames[language.Language] = value;
                }
            }
            if (!sitecoreItemNamePattern.test(targetName)) {
                throw new Error(
                    `${targetName} does not satisfy Sitecore ItemNameValidation (${filePath}).`,
                );
            }
            const relativePath = targetPath.replace(
                /^\/sitecore\/content\/slb\/slb\//,
                "",
            );
            if (relativePath.length > 100) {
                throw new Error(
                    `${targetPath} exceeds the configured 100-character relative path limit.`,
                );
            }
            return {
                id: normalizedGuid(document.ID),
                parentId: normalizedGuid(document.Parent),
                templateId: normalizedGuid(document.Template),
                targetName,
                targetPath,
                targetDisplayNames,
                depth: targetPath.split("/").length,
            };
        });

    if (manifest.length !== expectedDatasourceCount) {
        throw new Error(
            `Found ${manifest.length} serialized datasource items; expected ${expectedDatasourceCount}.`,
        );
    }

    const localizedDisplayNameCount = manifest.reduce(
        (count, item) => count + Object.keys(item.targetDisplayNames).length,
        0,
    );
    if (localizedDisplayNameCount !== expectedLocalizedDisplayNameCount) {
        throw new Error(
            `Found ${localizedDisplayNameCount} localized display names; expected ${expectedLocalizedDisplayNameCount}.`,
        );
    }

    const ids = new Set();
    const paths = new Set();
    for (const item of manifest) {
        const pathKey = item.targetPath.toLowerCase();
        if (ids.has(item.id))
            throw new Error(`Duplicate datasource ID ${item.id}.`);
        if (paths.has(pathKey)) {
            throw new Error(`Duplicate datasource path ${item.targetPath}.`);
        }
        ids.add(item.id);
        paths.add(pathKey);
    }
    return manifest.sort(
        (left, right) =>
            right.depth - left.depth ||
            left.targetPath.localeCompare(right.targetPath),
    );
}

async function readCurrentItems(manifest) {
    const currentById = new Map();
    for (const batch of chunks(manifest, 20)) {
        const selections = batch
            .flatMap((item, index) =>
                locales.map(
                    (locale) =>
                        `i${index}_${locale === "en" ? "en" : "es"}: item(where: { database: "master", itemId: ${graphQlString(item.id)}, language: ${graphQlString(locale)} }) {
                            itemId
                            name
                            displayName
                            path
                            version
                            parent { itemId path }
                            template { templateId }
                            displayNameField: field(name: "__Display name") { value }
                            businessFields: fields(first: 100, ownFields: true, excludeStandardFields: true, withLanguageFallback: false) {
                                nodes { fieldId value }
                            }
                        }`,
                ),
            )
            .join("\n");
        const data = await graphQl(`query DatasourceNames { ${selections} }`);
        batch.forEach((item, index) => {
            const localized = Object.fromEntries(
                locales.map((locale) => [
                    locale,
                    data[`i${index}_${locale === "en" ? "en" : "es"}`],
                ]),
            );
            const current = localized.en;
            if (!current)
                throw new Error(`Datasource ${item.id} was not found.`);
            for (const [locale, localizedItem] of Object.entries(localized)) {
                if (normalizedGuid(localizedItem?.itemId) !== item.id) {
                    throw new Error(
                        `Sitecore returned the wrong ${locale} item for ${item.id}.`,
                    );
                }
            }
            if (normalizedGuid(current.parent?.itemId) !== item.parentId) {
                throw new Error(
                    `${item.id} has an unexpected parent ${current.parent?.itemId}.`,
                );
            }
            if (
                normalizedGuid(current.template?.templateId) !== item.templateId
            ) {
                throw new Error(
                    `${item.id} has an unexpected template ${current.template?.templateId}.`,
                );
            }
            currentById.set(item.id, { ...current, localized });
        });
    }
    return currentById;
}

function businessSnapshot(current) {
    return JSON.stringify({
        templateId: normalizedGuid(current.template?.templateId),
        locales: Object.fromEntries(
            locales.map((locale) => {
                const localizedItem = current.localized[locale];
                const fields = (localizedItem.businessFields?.nodes ?? [])
                    .map((field) => ({
                        fieldId: normalizedGuid(field.fieldId),
                        value: field.value,
                    }))
                    .sort((left, right) =>
                        left.fieldId.localeCompare(right.fieldId),
                    );
                return [locale, { version: localizedItem.version, fields }];
            }),
        ),
    });
}

async function assertNoLiveCollisions(changes) {
    for (const batch of chunks(changes, 40)) {
        const selections = batch
            .map(({ item, current }, index) => {
                const collisionPath = `${current.parent.path}/${item.targetName}`;
                return `c${index}: item(where: { database: "master", path: ${graphQlString(collisionPath)}, language: "en" }) { itemId path }`;
            })
            .join("\n");
        const data = await graphQl(
            `query DatasourceNameCollisions { ${selections} }`,
        );
        batch.forEach(({ item }, index) => {
            const collision = data[`c${index}`];
            if (collision && normalizedGuid(collision.itemId) !== item.id) {
                throw new Error(
                    `${item.targetName} collides with ${collision.itemId} at ${collision.path}.`,
                );
            }
        });
    }
}

async function renameItems(changes) {
    let completed = 0;
    for (const batch of chunks(changes, 20)) {
        const selections = batch
            .map(
                ({ item }, index) =>
                    `r${index}: renameItem(input: { database: "master", itemId: ${graphQlString(item.id)}, newName: ${graphQlString(item.targetName)} }) { item { itemId name path } }`,
            )
            .join("\n");
        const data = await graphQl(
            `mutation RenameSlbDatasources { ${selections} }`,
        );
        batch.forEach(({ item }, index) => {
            const renamed = data[`r${index}`]?.item;
            if (
                normalizedGuid(renamed?.itemId) !== item.id ||
                renamed?.name !== item.targetName
            ) {
                throw new Error(
                    `Sitecore did not confirm rename for ${item.id}.`,
                );
            }
        });
        completed += batch.length;
        console.log(`Renamed ${completed}/${changes.length} datasource items.`);
    }
}

async function updateDisplayNames(changes) {
    let completed = 0;
    for (const batch of chunks(changes, 20)) {
        const selections = batch
            .map(
                ({ item, locale, targetDisplayName }, index) =>
                    `u${index}: updateItem(input: { database: "master", itemId: ${graphQlString(item.id)}, language: ${graphQlString(locale)}, fields: [{ name: ${graphQlString(displayNameFieldId)}, value: ${graphQlString(targetDisplayName)} }] }) { item { itemId displayName field(name: "__Display name") { value } } }`,
            )
            .join("\n");
        const data = await graphQl(
            `mutation NameSlbDatasources { ${selections} }`,
        );
        batch.forEach(({ item, targetDisplayName }, index) => {
            const updated = data[`u${index}`]?.item;
            if (
                normalizedGuid(updated?.itemId) !== item.id ||
                updated?.field?.value !== targetDisplayName
            ) {
                throw new Error(
                    `Sitecore did not confirm localized display name for ${item.id}.`,
                );
            }
        });
        completed += batch.length;
        console.log(
            `Set ${completed}/${changes.length} localized datasource display names.`,
        );
    }
}

const manifest = loadRenameManifest();
const currentById = await readCurrentItems(manifest);
const targetPathById = new Map(
    manifest.map((item) => [item.id, item.targetPath]),
);
for (const item of manifest) {
    const current = currentById.get(item.id);
    const targetParentPath =
        targetPathById.get(item.parentId) ?? current.parent.path;
    if (`${targetParentPath}/${item.targetName}` !== item.targetPath) {
        throw new Error(
            `${item.id} has an inconsistent serialized target path ${item.targetPath}.`,
        );
    }
}
const businessSnapshotsById = new Map(
    manifest.map((item) => [
        item.id,
        businessSnapshot(currentById.get(item.id)),
    ]),
);
const renameChanges = manifest
    .map((item) => ({ item, current: currentById.get(item.id) }))
    .filter(({ item, current }) => current.name !== item.targetName);
const displayNameChanges = [];
const preservedDisplayNames = [];
for (const item of manifest) {
    const current = currentById.get(item.id);
    for (const [locale, targetDisplayName] of Object.entries(
        item.targetDisplayNames,
    )) {
        const localizedItem = current.localized[locale];
        if (localizedItem.version < 1) {
            throw new Error(`${item.id} has no ${locale} version.`);
        }
        const currentDisplayName = localizedItem.displayNameField?.value ?? "";
        if (currentDisplayName === targetDisplayName) continue;
        const change = {
            item,
            locale,
            currentDisplayName,
            targetDisplayName,
        };
        if (currentDisplayName.trim()) preservedDisplayNames.push(change);
        else displayNameChanges.push(change);
    }
}

await assertNoLiveCollisions(renameChanges);

console.log(
    `Preflight passed for ${manifest.length} datasource items; ${renameChanges.length} require a same-GUID rename and ${displayNameChanges.length} blank localized display names will be populated.`,
);
for (const { item, current } of renameChanges.slice(0, 10)) {
    console.log(`- ${current.name} -> ${item.targetName} (${item.id})`);
}
if (renameChanges.length > 10) {
    console.log(`- ...and ${renameChanges.length - 10} more`);
}
if (preservedDisplayNames.length) {
    console.log(
        `Preserving ${preservedDisplayNames.length} editor-authored localized display names.`,
    );
}

if (!applyChanges) {
    console.log("Dry run only. Add --apply to perform the renames.");
    process.exit(0);
}

await renameItems(renameChanges);
await updateDisplayNames(displayNameChanges);

const verifiedById = await readCurrentItems(manifest);
const failures = manifest.filter((item) => {
    const current = verifiedById.get(item.id);
    return current.name !== item.targetName || current.path !== item.targetPath;
});
if (failures.length) {
    throw new Error(
        `Post-rename verification failed for ${failures.length} datasource items.`,
    );
}

const displayNameFailures = [
    ...displayNameChanges.filter(
        ({ item, locale, targetDisplayName }) =>
            verifiedById.get(item.id).localized[locale].displayNameField
                ?.value !== targetDisplayName,
    ),
    ...preservedDisplayNames.filter(
        ({ item, locale, currentDisplayName }) =>
            verifiedById.get(item.id).localized[locale].displayNameField
                ?.value !== currentDisplayName,
    ),
];
if (displayNameFailures.length) {
    throw new Error(
        `Post-rename localized display-name verification failed for ${displayNameFailures.length} values.`,
    );
}

const businessFieldFailures = manifest.filter(
    (item) =>
        businessSnapshot(verifiedById.get(item.id)) !==
        businessSnapshotsById.get(item.id),
);
if (businessFieldFailures.length) {
    throw new Error(
        `Post-rename business-field verification failed for ${businessFieldFailures.length} datasource items.`,
    );
}

console.log(
    `Verified ${manifest.length} datasource names and paths, localized display names, and unchanged GUIDs, parents, templates, versions, and business fields.`,
);
