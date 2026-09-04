import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
const {
    loadSlbDamAssetDescriptors,
    serializeSitecoreDamImage,
} = require("./lib/slb-sitecore-image.cjs");
const { createContentRevision } = require("./lib/slb-sitecore-revision.cjs");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(appRoot, "..", "..");
const serializationRoot = path.join(
    repositoryRoot,
    "authoring/items/slb-content/slb.site/slb",
);
const fallbackCatalog = JSON.parse(
    fs.readFileSync(
        path.join(appRoot, "src/content/slb-fallback-content.json"),
        "utf8",
    ),
);

const createdTimestamp = "20260831T150000Z";
// Sitecore only overwrites an existing language/version when the serialized
// __Updated value is later than the value already stored in the database.
// Advance the relevant timestamp when that generated content scope changes.
// Keeping page and datasource releases separate prevents a datasource-only
// update from overwriting newer presentation details authored in Pages.
const pageContentReleaseTimestamp = "20260831T191500Z";
const datasourceContentReleaseTimestamp = "20260904T184356Z";
const owner = "sitecore\\thomas.lin@sitecore.com";
const locales = ["en", "es-MX"];

const ids = {
    device: "FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3",
    workflow: "a4f985d9-98b3-4b52-aaaf-4344f6e747c6",
    datasourceWorkflow: "A053ED9F-4099-4682-9411-2B4C98E481E4",
    datasourceApproved: "4460E76C-87E9-4859-9DE6-DE122774937F",
    pageApproved: "F7FE5BDD-A991-4A58-9735-CD08F9B097AB",
    workflowState: "3e431de1-525e-47a3-b6b0-1ccbec3a8c98",
    sharedRevision: "dbbbeca1-21c7-4906-9dd2-493c1efa59a2",
    created: "25bed78c-4957-4165-998a-ca1b52f67497",
    owner: "52807595-0f8f-4b20-8d2a-cb71d28c6103",
    createdBy: "5dd74568-4d4b-44c1-b513-0af5f4cda34f",
    revision: "8cdc337e-a112-42fb-bbb4-4143751e123f",
    updatedBy: "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a",
    updated: "d9cf14b1-fa16-4ba6-9288-e8a174d4d522",
    finalRenderings: "04bf00db-f5fb-41f7-8ab7-22408372a981",
    pageSummary: "2485de13-6c39-468c-9c26-fe08c27088f4",
    pageShortTitle: "27cd428b-f652-4534-b76f-33f64b742659",
    pageTitle: "5c01b675-9b56-4d6b-aee4-0ecb1a0021f6",
    pageHeaderTitle: "b7979eed-6bcb-4117-80bc-4bcc6aab12a9",
    navigationTitle: "b29c617f-d9b1-42bd-badb-9504dbf19a75",
    metadataTitle: "8535365d-ae76-4875-ab5b-a618d5819af0",
    metadataDescription: "9b600e71-cf7a-4874-9032-f394a9bd2e48",
    metadataKeywords: "f6fcc0b6-31b2-49cd-8a66-4ba282a8ad24",
    metadataAuthor: "e7f8a9b0-c1d2-4e3f-8a9b-0c1d2e3f4a5b",
    ogTitle: "ed981ca0-271d-4543-b735-ecc955bd58a1",
    ogDescription: "4dd4e18f-b1a3-4225-967f-b4ec9f68928c",
    ogImage: "65408499-25bc-49d0-a2ff-b2fdd798aafc",
    displayName: "b5e02ad9-d56f-4c41-a065-a133db87bdeb",
};

const datasourceFolders = {
    hero: {
        id: "fce52196-25c1-99b5-3493-d30f9bef5f14",
        path: "/sitecore/content/slb/slb/Data/SLB Heroes",
        directory: "Data/SLB Heroes",
    },
    promo: {
        id: "b139b412-67ba-4dd3-8451-9a5eaf7754d2",
        path: "/sitecore/content/slb/slb/Data/Animated Promos",
        directory: "Data/Animated Promos",
    },
    multiPromo: {
        id: "24c6f461-b1a0-4463-8438-39fb73debef5",
        path: "/sitecore/content/slb/slb/Data/MultiPromos",
        directory: "Data/MultiPromos",
    },
    richText: {
        id: "f5f05e55-aea6-492e-8bc0-0264ee06bf75",
        path: "/sitecore/content/slb/slb/Data/Rich Texts",
        directory: "Data/Rich Texts",
    },
    cta: {
        id: "92a4c774-f20e-4f57-8dbb-1a57e8f1f137",
        path: "/sitecore/content/slb/slb/Data/Calls to Action Banners",
        directory: "Data/Calls to Action Banners",
    },
};

// Sitecore Pages currently surfaces the shared item name in datasource
// pickers, rather than the localized __Display name. Keep those shared names
// concise and meaningful so editors can identify content without decoding the
// original page/component implementation keys.
const datasourceItemPageLabels = {
    H01: "Home",
    S01: "Solutions",
    S02: "Digital operations",
    S03: "Industrial decarbonization",
    S04: "New energy",
    P01: "Products and services",
    P02: "Subsurface and wells",
    P03: "Data and AI",
    P04: "CCUS",
    U01: "Sustainability",
    U02: "Climate action",
    U03: "People and communities",
    U04: "Nature and operations",
    N01: "News and insights",
    N02: "Insights",
    N03: "Trusted AI context",
    N04: "Decarbonization article",
    N05: "Newsroom",
    A01: "Who we are",
    A02: "Technology and innovation",
    A03: "People and culture",
    A04: "Global presence",
    C01: "Contact us",
};

const conciseDatasourceTopics = {
    "Turn operational complexity into clear decisions":
        "Clear operational decisions",
    "See the subsurface clearly. Build every well with intent":
        "Clear subsurface and intentional wells",
    "From scientific insight to field-ready technology":
        "Field-ready scientific innovation",
    "A global team built around curiosity and purpose": "Curiosity and purpose",
    "A practical path from challenge to outcome": "Challenge-to-outcome path",
    "Connect the workflows that run the asset": "Connected asset workflows",
    "A connected action cycle": "Action cycle",
    "Apply the right technology to the right source":
        "Match technology to emissions sources",
    "Characterize uncertainty before it becomes operational risk":
        "Characterize uncertainty before risk",
    "Build teams where difference becomes strength":
        "Difference strengthens teams",
    "Connect environmental context to the operating plan":
        "Environmental context and planning",
    "Prioritize where engineering and value meet":
        "Engineering and value priorities",
    "Engineer for the environment that matters":
        "Engineer for the operating environment",
    "Global reach becomes useful through local understanding":
        "Global reach, local understanding",
    "Begin with the decision, not the dashboard": "Decision before dashboard",
    "Find the right capability for your operation":
        "Find the right operating capability",
    "Explore by operating need": "Operating needs",
    "Connect the well lifecycle": "Well lifecycle",
    "Three connected areas of focus": "Three focus areas",
    "Related perspectives": "Related content",
    "AI in energy starts with trusted context":
        "AI needs trusted energy context",
    "Designing decarbonization for execution": "Decarbonization for execution",
    "Carbon capture, utilization, and sequestration": "CCUS lifecycle",
    "What it takes to scale subsurface innovation":
        "Scaling subsurface innovation",
    "Nature and responsible operations": "Nature and operations",
    "Ideas shaping energy's next chapter":
        "Ideas shaping the next chapter of energy",
    "Step into energy's next questions": "Explore the next questions in energy",
    "Build what's next with SLB": "Build what comes next with SLB",
    "Technology built for energy's toughest work":
        "Technology for the toughest work in energy",
    "Global capability. Local understanding":
        "Global capability and local understanding",
    "Technology that travels. Solutions that fit":
        "Technology that travels and solutions that fit",
    "One challenge. Four connected paths":
        "One challenge and four connected paths",
    "Verify, learn, and improve": "Verify then learn and improve",
    "Global reach, local understanding":
        "Global reach with local understanding",
    "SLB in Mexico, Central America, and Venezuela":
        "SLB across Mexico Central America and Venezuela",
    "Technology and expertise, connected": "Connected technology and expertise",
};

const generatedSerializationFileById = new Map();
const generatedSerializationIdByFile = new Map();
const serializationModuleParentPath = "/sitecore/content/slb/slb";

const templates = {
    hero: "a19c3230-c5ee-47a1-ae3f-12a1fc3c4273",
    promo: "bd372d9d-6e4f-4ae9-a54c-dbc2acdebe2a",
    multiPromo: "775d6354-cf01-4f34-9713-d34645079c88",
    multiPromoItem: "f94c8c17-70e8-4d8b-9d35-d0465c0e0945",
    richText: "58041043-7bea-44f0-b1b8-08e4ea7054f4",
    cta: "bee4869d-b588-42c2-9797-76510c397e6a",
};

const renderings = {
    hero: "927FE09D-C039-B897-165C-995487B11B87",
    promo: "241A1B8E-E69A-4E07-B5E4-53975371AD3C",
    multiPromo: "D806DDF7-39A7-4A6D-8E0A-D138BC53845D",
    richText: "50B36874-8C4E-4958-9DD6-8B95C6AFD09A",
    cta: "3332F59B-F5F3-44DF-B66E-2811C31AEB3C",
};

const approvedRelatedTitleByCard = {
    H01: {
        "Innovate in oil and gas": "Subsurface and well delivery",
        "Deliver digital and AI at scale": "Digital operations",
        "Decarbonize industry": "Industrial decarbonization",
        "Scale new energy systems": "New energy systems",
        "Innovar en petróleo y gas": "Subsuelo y construcción de pozos",
        "Llevar la tecnología digital y la IA a escala":
            "Operaciones digitales",
        "Descarbonizar la industria": "Descarbonización industrial",
        "Escalar nuevos sistemas de energía": "Nuevos sistemas de energía",
    },
    S01: {
        "Improve performance": "Products and services",
        "Connect decisions": "Digital operations",
        "Reduce emissions": "Industrial decarbonization",
        "Develop new systems": "New energy systems",
        "Mejorar el desempeño": "Productos y servicios",
        "Conectar decisiones": "Operaciones digitales",
        "Reducir emisiones": "Descarbonización industrial",
        "Desarrollar nuevos sistemas": "Nuevos sistemas de energía",
    },
    S04: {
        "Carbon storage": "Carbon capture, utilization, and sequestration",
        "Almacenamiento de carbono":
            "Captura, utilización y almacenamiento de carbono",
    },
    P01: {
        "Understand the subsurface": "Subsurface and well delivery",
        "Connect data and AI": "Data and AI",
        "Comprender el subsuelo": "Subsuelo y construcción de pozos",
        "Conectar datos e IA": "Datos e IA",
    },
    U01: {
        "Climate action": "Climate action",
        People: "People and communities",
        Nature: "Nature and responsible operations",
        "Acción climática": "Acción climática",
        Personas: "Personas y comunidades",
        Naturaleza: "Naturaleza y operaciones responsables",
    },
    N02: {
        "AI in energy starts with trusted context":
            "AI in energy starts with trusted context",
        "Designing decarbonization for execution":
            "Designing decarbonization for execution",
        "La IA en energía comienza con un contexto confiable":
            "La IA en energía comienza con un contexto confiable",
        "Diseñar la descarbonización para la ejecución":
            "Diseñar la descarbonización para la ejecución",
        "What it takes to scale subsurface innovation":
            "Subsurface and well delivery",
        "Lo que se necesita para escalar la innovación del subsuelo":
            "Subsuelo y construcción de pozos",
    },
    N05: {
        "Company news": "News and insights",
        "Technology updates": "Insights",
        "Project stories": "News and insights",
        "Noticias de la compañía": "Noticias y análisis",
        "Actualizaciones de tecnología": "Análisis",
        "Historias de proyectos": "Noticias y análisis",
    },
    A01: {
        People: "People and culture",
        Technology: "Technology and innovation",
        Personas: "Personas y cultura",
        Tecnología: "Tecnología e innovación",
    },
    C01: {
        "Discuss a technical challenge": "Solutions",
        "Explore products and services": "Products and services",
        "Company and media inquiries": "Newsroom",
        "Analizar un desafío técnico": "Soluciones",
        "Explorar productos y servicios": "Productos y servicios",
        "Consultas corporativas y de medios": "Sala de prensa",
    },
};

const variants = {
    hero: "15CBD817-374B-4B98-A545-91DA6BE1E810",
    promoDefault: "FC79554C-E39F-47E3-9D7A-CF372BC7ADEB",
    promoImageRight: "B3288C2C-2BEB-4306-8924-814316385F2D",
    multiPromo: "0FDAD00A-510F-442F-B2FE-0E8C7B8BC245",
    richText: "97934C2E-BDBA-471D-B8C0-71EB934DC5A8",
};

const datasourceFieldIds = {
    hero: {
        title: "3f384b8c-9364-4f44-91ea-7f7fa3a76de9",
        description: "e2223200-5161-4e5a-9a35-9a5ac126c05c",
        link: "c17f89f8-7429-4af1-a47d-b7b1e037fe45",
        image1: "1c4089ef-d9fa-4515-ad8b-eac558420564",
    },
    promo: {
        image: "84a2a397-786e-43bd-85a0-bfbcc51fc3f3",
        title: "da7db0f2-08eb-47c5-af07-ed12a1e998db",
        description: "c00d4bd2-a452-4067-a861-e8c6d47201a7",
        primaryLink: "e9e9c847-e0f0-497d-8e41-5211a087029a",
        secondaryLink: "3a2a1142-68ca-4f5b-afb0-c17d2c0ef8ea",
    },
    multiPromo: {
        title: "24fa0354-d116-4f42-9eaa-bdab15a8ade7",
        description: "2fe9bed7-7bcc-4a35-a209-34bcb84fcb42",
    },
    multiPromoItem: {
        heading: "5c33f772-5806-4ad8-a236-730f1b299531",
        description: "54a924ec-8e98-4597-b9c2-d616dd66cc7c",
        image: "7eca61ae-f0c1-49e6-b131-686ab895a1dc",
        link: "8ec6e4b8-3a38-4115-a892-38051924f3f1",
    },
    richText: {
        text: "8b57dadd-0825-4f5d-9c32-187c0af7e1fd",
    },
    cta: {
        title: "7a8c2095-39f5-4f40-b69d-16ddff188a68",
        description: "a35015fe-805c-45d7-9446-f88b33a157d4",
        link: "9fdcf3e1-5289-4ae0-b4e4-9460ad50814f",
    },
};

function deterministicGuid(key) {
    const hash = crypto
        .createHash("md5")
        .update(`slb-sitecore:${key}`)
        .digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}

function xmlEscape(value) {
    return normalizeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function htmlEscape(value) {
    return normalizeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeText(value) {
    return String(value ?? "")
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replaceAll("\u2028", "\n")
        .replaceAll("\u2029", "\n");
}

function cleanItemName(value) {
    const cleaned = normalizeText(value)
        .normalize("NFKC")
        .replaceAll("&", " and ")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/[\u2018\u2019']/g, "")
        .replace(/[^A-Za-z0-9_* $-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^[^A-Za-z0-9_*$]+/, "")
        .replace(/[^A-Za-z0-9_$]+$/g, "")
        .trim();
    if (!/^[A-Za-z0-9_*$][A-Za-z0-9_ $-]*$/.test(cleaned)) {
        throw new Error(
            `Generated item name does not satisfy Sitecore ItemNameValidation: ${cleaned}`,
        );
    }
    return cleaned;
}

function conciseDatasourceTopic(value) {
    const normalized = normalizeText(value)
        .replace(/\s+/g, " ")
        .replace(/[.!?]+$/g, "")
        .trim();
    return conciseDatasourceTopics[normalized] ?? normalized;
}

function limitItemName(value, maxLength) {
    const cleaned = cleanItemName(value);
    if (cleaned.length <= maxLength) return cleaned;
    throw new Error(
        `Datasource item name exceeds its ${maxLength}-character budget; add a concise topic mapping instead of truncating it: ${cleaned}`,
    );
}

function datasourceItemName(page, label, maxLength = 67) {
    const pageLabel =
        datasourceItemPageLabels[page.id] ??
        page.fields.en.navigationTitle ??
        page.sourceTitle ??
        page.id;
    return limitItemName(
        `${pageLabel} - ${conciseDatasourceTopic(label)}`,
        maxLength,
    );
}

function multiPromoChildItemName(label) {
    return limitItemName(conciseDatasourceTopic(label), 32);
}

function datasourceDisplayName(page, locale, label) {
    const pageLabel =
        page.fields[locale]?.navigationTitle ??
        page.fields.en.navigationTitle ??
        page.sourceTitle ??
        page.id;
    return `${pageLabel} — ${label}`;
}

const damAssetDescriptors = loadSlbDamAssetDescriptors(
    path.join(appRoot, "src/content/slb-dam-assets.json"),
);

function imageXml(image) {
    return serializeSitecoreDamImage(image, damAssetDescriptors);
}

function linkXml(cta, locale) {
    if (!cta?.target) return undefined;
    if (cta.targetType === "internal" || cta.target.startsWith("/")) {
        const [targetWithQuery, anchor = ""] = cta.target.split("#", 2);
        const [targetPath, querystring = ""] = targetWithQuery.split("?", 2);
        const targetPage = routeTargetPage(targetPath, locale);
        if (!targetPage) {
            throw new Error(
                `Unable to resolve internal link target: ${cta.target}`,
            );
        }
        return `<link class="" querystring="${xmlEscape(querystring)}" id="{${pageItemId(targetPage).toUpperCase()}}" anchor="${xmlEscape(anchor)}" target="" title="" linktype="internal" text="${xmlEscape(cta.label)}" url="" />`;
    }
    return `<link linktype="external" url="${xmlEscape(cta.target)}" target="" text="${xmlEscape(cta.label)}" title="" class="" />`;
}

function field(ID, Hint, Value) {
    return { ID, Hint, Value };
}

function contentSensitiveRevision(itemId, scope, contentFields) {
    return createContentRevision({
        itemId,
        scope,
        fields: contentFields,
        revisionFieldIds: [ids.revision, ids.sharedRevision],
    });
}

function standardVersionFields(
    extraFields,
    releaseTimestamp = datasourceContentReleaseTimestamp,
) {
    const normalizedExtraFields = extraFields.map((entry) => ({
        ...entry,
        Value: entry.Value ?? "",
    }));

    return [
        field(ids.created, "__Created", createdTimestamp),
        field(
            ids.workflowState,
            "__Workflow state",
            `{${ids.datasourceApproved}}`,
        ),
        field(ids.owner, "__Owner", owner),
        field(ids.createdBy, "__Created by", owner),
        field(ids.updatedBy, "__Updated by", owner),
        field(ids.updated, "__Updated", releaseTimestamp),
        // Generated datasource items must own every field we pass here. An
        // omitted field is NULL in Sitecore and inherits the starter kit's
        // Standard Values; an explicit blank intentionally suppresses those
        // sample titles, descriptions, and links.
        ...normalizedExtraFields,
    ].sort((left, right) => left.ID.localeCompare(right.ID));
}

function datasourceItem({
    id,
    parent,
    template,
    itemPath,
    localizedFields,
    releaseTimestamp = datasourceContentReleaseTimestamp,
}) {
    const relativeItemPath = itemPath.startsWith(
        `${serializationModuleParentPath}/`,
    )
        ? itemPath.slice(serializationModuleParentPath.length + 1)
        : itemPath;
    if (relativeItemPath.length > 100) {
        throw new Error(
            `Generated Sitecore path exceeds the configured 100-character relative path limit (${relativeItemPath.length}): ${itemPath}`,
        );
    }
    return {
        ID: id,
        Parent: parent,
        Template: template,
        Path: itemPath,
        SharedFields: [
            field(ids.workflow, "__Workflow", `{${ids.datasourceWorkflow}}`),
        ],
        Languages: locales.map((locale) => {
            const displayNameFields = localizedFields[locale].filter(
                (entry) => entry.ID === ids.displayName,
            );
            if (
                Object.values(templates).includes(template) &&
                displayNameFields.length !== 1
            ) {
                throw new Error(
                    `${itemPath} ${locale} must define exactly one localized __Display name.`,
                );
            }
            const versionedFields = localizedFields[locale].filter(
                (entry) => entry.ID !== ids.displayName,
            );
            return {
                Language: locale,
                ...(displayNameFields.length
                    ? { Fields: displayNameFields }
                    : {}),
                Versions: [
                    {
                        Version: 1,
                        Fields: standardVersionFields(
                            versionedFields,
                            releaseTimestamp,
                        ),
                    },
                ],
            };
        }),
    };
}

function finalizeDocumentRevisions(document) {
    const sharedFields = document.SharedFields ?? [];
    if (sharedFields.length) {
        upsertField(
            sharedFields,
            ids.sharedRevision,
            "__Shared revision",
            contentSensitiveRevision(document.ID, "shared", sharedFields),
        );
        sharedFields.sort((left, right) => left.ID.localeCompare(right.ID));
    }

    for (const language of document.Languages ?? []) {
        for (const version of language.Versions ?? []) {
            const fields = version.Fields ?? (version.Fields = []);
            upsertField(
                fields,
                ids.revision,
                "__Revision",
                contentSensitiveRevision(
                    document.ID,
                    `${language.Language}:version:${version.Version}`,
                    [...(language.Fields ?? []), ...fields],
                ),
            );
            fields.sort((left, right) => left.ID.localeCompare(right.ID));
        }
    }
}

function serializeItem(document) {
    finalizeDocumentRevisions(document);
    return `---\n${yaml.dump(document, {
        lineWidth: -1,
        noRefs: true,
        noCompatMode: true,
        quoteStyle: "double",
        sortKeys: false,
    })}`.replace(/^(\s*Value:) ""$/gm, "$1");
}

function writeSerializedItem(relativeDirectory, itemName, document) {
    const directory = path.join(serializationRoot, relativeDirectory);
    fs.mkdirSync(directory, { recursive: true });
    const filePath = path.join(directory, `${cleanItemName(itemName)}.yml`);
    const normalizedId = String(document.ID).toLowerCase();
    const resolvedFilePath = path.resolve(filePath);
    const normalizedFileKey = resolvedFilePath.toLowerCase();
    const previousFilePath = generatedSerializationFileById.get(normalizedId);
    if (previousFilePath && previousFilePath !== resolvedFilePath) {
        throw new Error(
            `Generated item ${document.ID} was assigned to two serialization files: ${previousFilePath} and ${filePath}`,
        );
    }
    const previousId = generatedSerializationIdByFile.get(normalizedFileKey);
    if (previousId && previousId !== normalizedId) {
        throw new Error(
            `Generated serialization file ${filePath} was assigned to two item IDs: ${previousId} and ${document.ID}`,
        );
    }
    generatedSerializationFileById.set(normalizedId, resolvedFilePath);
    generatedSerializationIdByFile.set(normalizedFileKey, normalizedId);
    const next = serializeItem(document);
    const previous = fs.existsSync(filePath)
        ? fs.readFileSync(filePath, "utf8")
        : undefined;
    if (previous !== next) fs.writeFileSync(filePath, next, "utf8");
    return filePath;
}

function uniqueSupportingImages(fields) {
    const seen = new Set();
    return (fields.supportingImages ?? []).filter((image) => {
        if (!image?.filename || seen.has(image.filename)) return false;
        seen.add(image.filename);
        return true;
    });
}

function supportingImageCount(component) {
    if (component.type === "cardGrid" || component.type === "contentRail") {
        return component.items?.length ?? 0;
    }
    return component.type === "contentSection" ? 1 : 0;
}

function imageAllocations(fields) {
    const images = uniqueSupportingImages(fields);
    let cursor = 0;
    return fields.components.map((component) => {
        const count = supportingImageCount(component);
        const allocation = images.slice(cursor, cursor + count);
        cursor += count;
        return allocation;
    });
}

function routeTargetPage(route, locale) {
    const cleanRoute = route.split("#", 1)[0];
    return fallbackCatalog.pages.find((candidate) => {
        const candidateLocales = locale ? [locale] : locales;
        return candidateLocales.some(
            (candidateLocale) =>
                candidate.routes[candidateLocale] === cleanRoute ||
                candidate.routeAliases?.[candidateLocale]?.includes(
                    cleanRoute,
                ) ||
                (candidateLocale === "es-MX" &&
                    `/es-mx${candidate.routes.en === "/" ? "" : candidate.routes.en}` ===
                        cleanRoute),
        );
    });
}

function approvedCardTarget(page, locale, cardTitle) {
    const expectedRelatedTitle =
        approvedRelatedTitleByCard[page.id]?.[cardTitle];
    if (!expectedRelatedTitle) return undefined;

    for (const route of page.relatedPageRoutes[locale] ?? []) {
        const target = routeTargetPage(route, locale);
        if (target?.fields[locale].navigationTitle === expectedRelatedTitle) {
            return route;
        }
    }
    return undefined;
}

function localizedAnchorIds(page, componentIndex) {
    return Object.fromEntries(
        locales
            .map((locale) => [
                locale,
                page.fields[locale].components[componentIndex]?.anchorId,
            ])
            .filter(([, anchorId]) => Boolean(anchorId)),
    );
}

function heroDatasource(page) {
    const key = `${page.id}:hero`;
    const id = deterministicGuid(key);
    const name = datasourceItemName(page, page.fields.en.hero.heading);
    const folder = datasourceFolders.hero;
    const localizedFields = {};
    for (const locale of locales) {
        const hero = page.fields[locale].hero;
        localizedFields[locale] = [
            field(
                ids.displayName,
                "__Display name",
                datasourceDisplayName(page, locale, hero.heading),
            ),
            field(datasourceFieldIds.hero.title, "titleRequired", hero.heading),
            field(
                datasourceFieldIds.hero.description,
                "descriptionOptional",
                hero.summary,
            ),
            field(
                datasourceFieldIds.hero.link,
                "linkOptional",
                linkXml(hero.primaryCta, locale),
            ),
            field(
                datasourceFieldIds.hero.image1,
                "heroImageOptional1",
                imageXml(hero.image),
            ),
        ];
    }
    const document = datasourceItem({
        key,
        id,
        parent: folder.id,
        template: templates.hero,
        itemPath: `${folder.path}/${name}`,
        localizedFields,
    });
    writeSerializedItem(folder.directory, name, document);
    return { id, kind: "hero" };
}

function promoDatasource(page, componentIndex, images) {
    const component = page.fields.en.components[componentIndex];
    const key = `${page.id}:${component.id}:promo`;
    const id = deterministicGuid(key);
    const name = datasourceItemName(page, component.heading);
    const folder = datasourceFolders.promo;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = page.fields[locale].components[componentIndex];
        const image = images[locale]?.[0];
        localizedFields[locale] = [
            field(
                ids.displayName,
                "__Display name",
                datasourceDisplayName(page, locale, localized.heading),
            ),
            field(datasourceFieldIds.promo.image, "image", imageXml(image)),
            field(datasourceFieldIds.promo.title, "title", localized.heading),
            field(
                datasourceFieldIds.promo.description,
                "description",
                localized.body,
            ),
            field(
                datasourceFieldIds.promo.primaryLink,
                "primaryLink",
                linkXml(localized.cta, locale),
            ),
            // Override the starter template's Sitecore.com standard value so
            // authored SLB promos show only the intentional page CTA.
            field(datasourceFieldIds.promo.secondaryLink, "secondaryLink", ""),
        ];
    }
    const document = datasourceItem({
        key,
        id,
        parent: folder.id,
        template: templates.promo,
        itemPath: `${folder.path}/${name}`,
        localizedFields,
    });
    writeSerializedItem(folder.directory, name, document);
    return {
        id,
        kind: "promo",
        promoVariant: componentIndex % 2 === 0 ? "image-right" : "image-left",
        presentation: componentIndex % 2 === 0 ? "split-white" : "split-frost",
        anchorIdByLocale: localizedAnchorIds(page, componentIndex),
    };
}

function multiPromoDatasource(page, componentIndex, images, related = false) {
    const enComponent = related
        ? {
              id: "related",
              heading: "Related perspectives",
              body: "Continue exploring connected capabilities, ideas, and operating outcomes.",
              items: page.relatedPageRoutes.en.map((route) => {
                  const target = routeTargetPage(route);
                  return {
                      title: target?.fields.en.navigationTitle ?? route,
                      summary: target?.fields.en.hero.summary ?? "",
                  };
              }),
          }
        : page.fields.en.components[componentIndex];
    const key = `${page.id}:${enComponent.id}:multi-promo`;
    const id = deterministicGuid(key);
    const name = datasourceItemName(page, enComponent.heading, 46);
    const folder = datasourceFolders.multiPromo;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = related
            ? {
                  heading:
                      locale === "en"
                          ? "Related perspectives"
                          : "Perspectivas relacionadas",
                  body:
                      locale === "en"
                          ? "Continue exploring connected capabilities, ideas, and operating outcomes."
                          : "Continúe explorando capacidades, ideas y resultados operativos relacionados.",
              }
            : page.fields[locale].components[componentIndex];
        localizedFields[locale] = [
            field(
                ids.displayName,
                "__Display name",
                datasourceDisplayName(page, locale, localized.heading),
            ),
            field(
                datasourceFieldIds.multiPromo.title,
                "title",
                localized.heading,
            ),
            field(
                datasourceFieldIds.multiPromo.description,
                "description",
                localized.body,
            ),
        ];
    }
    const document = datasourceItem({
        key,
        id,
        parent: folder.id,
        template: templates.multiPromo,
        itemPath: `${folder.path}/${name}`,
        localizedFields,
    });
    writeSerializedItem(folder.directory, name, document);

    const childDirectory = `${folder.directory}/${name}`;
    const childPath = `${folder.path}/${name}`;
    const itemCount = related
        ? page.relatedPageRoutes.en.length
        : (enComponent.items?.length ?? 0);
    const childNames = new Set();
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const childKey = `${key}:item:${itemIndex + 1}`;
        const childId = deterministicGuid(childKey);
        const englishItem = related
            ? (() => {
                  const route = page.relatedPageRoutes.en[itemIndex];
                  const target = routeTargetPage(route);
                  return {
                      title:
                          target?.fields.en.navigationTitle ??
                          `Related item ${itemIndex + 1}`,
                  };
              })()
            : enComponent.items[itemIndex];
        const childName = multiPromoChildItemName(englishItem.title);
        if (childNames.has(childName)) {
            throw new Error(
                `Duplicate MultiPromo child name for ${page.id}: ${childName}`,
            );
        }
        childNames.add(childName);
        const childLocalizedFields = {};
        for (const locale of locales) {
            const localizedItem = related
                ? (() => {
                      const route = page.relatedPageRoutes[locale][itemIndex];
                      const target = routeTargetPage(route);
                      return {
                          title:
                              target?.fields[locale].navigationTitle ?? route,
                          summary: target?.fields[locale].hero.summary ?? "",
                      };
                  })()
                : page.fields[locale].components[componentIndex].items[
                      itemIndex
                  ];
            const target = related
                ? page.relatedPageRoutes[locale][itemIndex]
                : approvedCardTarget(page, locale, localizedItem.title);
            const link = target
                ? {
                      label: locale === "en" ? "Explore" : "Explorar",
                      target,
                  }
                : undefined;
            childLocalizedFields[locale] = [
                field(ids.displayName, "__Display name", localizedItem.title),
                field(
                    datasourceFieldIds.multiPromoItem.heading,
                    "heading",
                    localizedItem.title,
                ),
                field(
                    datasourceFieldIds.multiPromoItem.description,
                    "description",
                    localizedItem.summary,
                ),
                field(
                    datasourceFieldIds.multiPromoItem.image,
                    "image",
                    imageXml(images[locale]?.[itemIndex]),
                ),
                field(
                    datasourceFieldIds.multiPromoItem.link,
                    "link",
                    linkXml(link, locale),
                ),
            ];
        }
        const childDocument = datasourceItem({
            key: childKey,
            id: childId,
            parent: id,
            template: templates.multiPromoItem,
            itemPath: `${childPath}/${childName}`,
            localizedFields: childLocalizedFields,
        });
        childDocument.SharedFields.push(
            field(
                "ba3f86a2-4a1c-4d78-b63d-91c2779c1b5e",
                "__Sortorder",
                itemIndex * 100,
            ),
        );
        childDocument.SharedFields.sort((left, right) =>
            left.ID.localeCompare(right.ID),
        );
        writeSerializedItem(childDirectory, childName, childDocument);
    }

    return {
        id,
        kind: "multiPromo",
        presentation: related
            ? "related"
            : enComponent.type === "contentRail"
              ? "content-rail"
              : "card-grid",
        anchorIdByLocale: related
            ? undefined
            : localizedAnchorIds(page, componentIndex),
        itemCount,
    };
}

function richTextMarkup(component, locale) {
    const heading = component.heading
        ? `<h2>${htmlEscape(component.heading)}</h2>`
        : "";
    if (component.type === "processSteps") {
        const steps = (component.body ?? "")
            .split(/(?<=[.!?])\s+/)
            .map((step) => step.trim())
            .filter(Boolean);
        return `<div class="ck-content"><p class="slb-kicker">${locale === "en" ? "How we work" : "Cómo trabajamos"}</p>${heading}<ol>${steps.map((step) => `<li>${htmlEscape(step)}</li>`).join("")}</ol></div>`;
    }
    if (component.type === "filterBar") {
        const filters = (component.body ?? "")
            .split("|")
            .map((filter) => filter.trim())
            .filter(Boolean);
        return `<div class="ck-content slb-filter-content">${heading}<ul>${filters.map((filter) => `<li>${htmlEscape(filter)}</li>`).join("")}</ul></div>`;
    }
    const body = component.body ? `<p>${htmlEscape(component.body)}</p>` : "";
    const items = component.items?.length
        ? `<ul>${component.items.map((item) => `<li><strong>${htmlEscape(item.title)}</strong><br />${htmlEscape(item.summary)}</li>`).join("")}</ul>`
        : "";
    return `<div class="ck-content">${heading}${body}${items}</div>`;
}

function richTextDatasource(page, componentIndex) {
    const component = page.fields.en.components[componentIndex];
    const key = `${page.id}:${component.id}:rich-text`;
    const id = deterministicGuid(key);
    const name = datasourceItemName(page, component.heading);
    const folder = datasourceFolders.richText;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = page.fields[locale].components[componentIndex];
        localizedFields[locale] = [
            field(
                ids.displayName,
                "__Display name",
                datasourceDisplayName(page, locale, localized.heading),
            ),
            field(
                datasourceFieldIds.richText.text,
                "text",
                richTextMarkup(localized, locale),
            ),
        ];
    }
    const document = datasourceItem({
        key,
        id,
        parent: folder.id,
        template: templates.richText,
        itemPath: `${folder.path}/${name}`,
        localizedFields,
    });
    writeSerializedItem(folder.directory, name, document);
    return {
        id,
        kind: "richText",
        anchorIdByLocale: localizedAnchorIds(page, componentIndex),
    };
}

function ctaDatasource(page, componentIndex, final = false) {
    const enComponent = final
        ? page.fields.en.finalCta
        : page.fields.en.components[componentIndex];
    const key = `${page.id}:${final ? "final" : enComponent.id}:cta`;
    const id = deterministicGuid(key);
    const name = datasourceItemName(page, enComponent.heading);
    const folder = datasourceFolders.cta;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = final
            ? page.fields[locale].finalCta
            : page.fields[locale].components[componentIndex];
        const title = final ? localized.heading : localized.heading;
        const description = final
            ? locale === "en"
                ? "Connect with SLB specialists to turn the next operating challenge into an actionable plan."
                : "Conecte con especialistas de SLB para convertir el próximo desafío operativo en un plan de acción."
            : localized.body;
        const cta = final
            ? { label: localized.label, target: localized.target }
            : localized.cta;
        localizedFields[locale] = [
            field(
                ids.displayName,
                "__Display name",
                datasourceDisplayName(page, locale, localized.heading),
            ),
            field(datasourceFieldIds.cta.title, "titleRequired", title),
            field(
                datasourceFieldIds.cta.description,
                "descriptionOptional",
                description,
            ),
            field(
                datasourceFieldIds.cta.link,
                "linkOptional",
                linkXml(cta, locale),
            ),
        ];
    }
    const document = datasourceItem({
        key,
        id,
        parent: folder.id,
        template: templates.cta,
        itemPath: `${folder.path}/${name}`,
        localizedFields,
    });
    writeSerializedItem(folder.directory, name, document);
    return {
        id,
        kind: "cta",
        presentation: final ? "final-cta" : "dark-feature",
        anchorIdByLocale: final
            ? undefined
            : localizedAnchorIds(page, componentIndex),
    };
}

function componentDatasource(page, componentIndex, allocations) {
    const component = page.fields.en.components[componentIndex];
    if (
        (component.type === "cardGrid" || component.type === "contentRail") &&
        component.items?.length
    ) {
        return multiPromoDatasource(page, componentIndex, allocations);
    }
    if (component.type === "contentSection") {
        return promoDatasource(page, componentIndex, allocations);
    }
    if (
        component.type === "productFeature" ||
        component.type === "resourceLinks"
    ) {
        return ctaDatasource(page, componentIndex);
    }
    if (component.type === "contentRail") {
        return ctaDatasource(page, componentIndex);
    }
    return richTextDatasource(page, componentIndex);
}

function renderingParameters(entry, index, locale) {
    const dynamic = `DynamicPlaceholderId=${index + 1}`;
    const anchorId = entry.anchorIdByLocale?.[locale];
    const anchorParameter = anchorId
        ? `&RenderingIdentifier=${encodeURIComponent(anchorId)}`
        : "";
    if (entry.kind === "hero") {
        return `${dynamic}&FieldNames=%7B${variants.hero}%7D&colorScheme=dark`;
    }
    if (entry.kind === "promo") {
        const variant =
            entry.promoVariant === "image-right"
                ? variants.promoImageRight
                : variants.promoDefault;
        return `${dynamic}&FieldNames=%7B${variant}%7D&colorScheme=light&slbPresentation=${entry.presentation}${anchorParameter}`;
    }
    if (entry.kind === "multiPromo") {
        const columns = entry.itemCount >= 4 ? 4 : 3;
        return `${dynamic}&FieldNames=%7B${variants.multiPromo}%7D&numColumns=${columns}&slbPresentation=${entry.presentation}${anchorParameter}`;
    }
    if (entry.kind === "richText") {
        return `${dynamic}&FieldNames=%7B${variants.richText}%7D${anchorParameter}`;
    }
    return `${dynamic}&colorScheme=default&slbPresentation=${entry.presentation}${anchorParameter}`;
}

function renderingId(kind) {
    return renderings[kind];
}

function ccusTestRulesXml() {
    return `
              <rls>
                <ruleset s:pet="true">
                  <rule uid="{F5BDBFB2-306B-4BA1-B420-5070A49A153D}" s:name="9db8ec3a95d5ee03d327ca8cecad2d0e_454b1ed978704ea79756fe8833e97bac">
                    <conditions>
                      <condition uid="2497E8044D9F429C94AFFB8DB8A0B8AB" s:id="{8E7426A4-12ED-4C44-8625-E7191860E726}" s:VariantName="9db8ec3a95d5ee03d327ca8cecad2d0e_454b1ed978704ea79756fe8833e97bac" />
                    </conditions>
                    <actions>
                      <action uid="{570C56C3-6841-4378-988A-CF3BFCCA98B2}" s:id="{0F3C6BEC-E56B-4875-93D7-2846A75881D2}" s:DataSource="5049d31d-7c2f-4ab8-b30a-136a3f039be0" />
                    </actions>
                  </rule>
                  <rule uid="{00000000-0000-0000-0000-000000000000}" s:name="Default">
                    <conditions>
                      <condition uid="19A3507D02B8418CAC436E09480CEC32" s:id="{4888ABBB-F17D-4485-B14B-842413F88732}" />
                    </conditions>
                  </rule>
                </ruleset>
              </rls>`;
}

function renderingXml(entry, index, previousUid, locale) {
    const uid = deterministicGuid(
        `${entry.pageId}:${entry.key}:rendering`,
    ).toUpperCase();
    const position = previousUid
        ? `p:after="r[@uid='{${previousUid}}']"`
        : 'p:before="*"';
    const parameters = xmlEscape(renderingParameters(entry, index, locale));
    const testRules =
        entry.pageId === "P04" && entry.kind === "hero" && locale === "en"
            ? ccusTestRulesXml()
            : "";
    return {
        uid,
        xml: `            <r\n              uid="{${uid}}"\n              ${position}\n              s:ds="${entry.id}"\n              s:id="{${renderingId(entry.kind)}}"\n              s:par="${parameters}"\n              s:ph="headless-main"${testRules ? ">" : " />"}${testRules}${testRules ? "\n            </r>" : ""}`,
    };
}

function personalizedCampaignRendering(previousUid) {
    const uid = "0ABD1A13-BD83-4060-8E54-F9B577ED4DB1";
    const position = previousUid
        ? `p:after="r[@uid='{${previousUid}}']"`
        : 'p:before="*"';
    return {
        uid,
        xml: `            <r\n              uid="{${uid}}"\n              ${position}\n              s:ds="aadba9e9-3b8c-4f24-8b3a-0dd30a602ff1"\n              s:id="{${renderings.cta}}"\n              s:par="colorScheme&amp;CSSStyles&amp;DynamicPlaceholderId=90"\n              s:ph="headless-main">\n              <rls>\n                <ruleset s:pet="true">\n                  <rule uid="{E457CF59-C1B2-4A7E-93BA-196B73EDA07A}" s:name="0abd1a13bd8340608e54f9b577ed4db1_fc9afc5bfa694163a1ef46d0b69a3435">\n                    <conditions>\n                      <condition uid="1AEFCEBE5A1144039B39BDE940A3D79C" s:id="{8E7426A4-12ED-4C44-8625-E7191860E726}" s:VariantName="0abd1a13bd8340608e54f9b577ed4db1_fc9afc5bfa694163a1ef46d0b69a3435" />\n                    </conditions>\n                    <actions>\n                      <action uid="{27716C4B-21C5-4560-813E-E222910D3E6C}" s:id="{0F3C6BEC-E56B-4875-93D7-2846A75881D2}" s:DataSource="8b14ed5b-b5b7-4a14-bea9-58b58fc1fd81" />\n                    </actions>\n                  </rule>\n                  <rule uid="{00000000-0000-0000-0000-000000000000}" s:name="Default">\n                    <conditions>\n                      <condition uid="19503F182BBD4F47B5EECB29E594278B" s:id="{4888ABBB-F17D-4485-B14B-842413F88732}" />\n                    </conditions>\n                  </rule>\n                </ruleset>\n              </rls>\n            </r>`,
    };
}

function layoutXml(entries, pageId, locale) {
    const rendered = [];
    let previousUid;
    entries.forEach((entry, index) => {
        const result = renderingXml(
            { ...entry, pageId, key: `${entry.kind}:${index}` },
            index,
            previousUid,
            locale,
        );
        rendered.push(result.xml);
        previousUid = result.uid;
    });
    if (pageId === "S03" && locale === "en") {
        const campaign = personalizedCampaignRendering(previousUid);
        rendered.push(campaign.xml);
        previousUid = campaign.uid;
    }
    return `<r xmlns:p="p" xmlns:s="s" p:p="1">\n  <d id="{${ids.device}}">\n${rendered.join("\n")}\n  </d>\n</r>`;
}

function upsertField(fields, ID, Hint, Value) {
    const existing = fields.find(
        (entry) => entry.ID.toLowerCase() === ID.toLowerCase(),
    );
    if (existing) {
        existing.Hint = Hint;
        existing.Value = Value;
    } else {
        fields.push(field(ID, Hint, Value));
    }
}

function pageFile(page) {
    if (page.routes.en === "/") return path.join(serializationRoot, "Home.yml");
    const segments = page.routes.en.split("/").filter(Boolean);
    return path.join(serializationRoot, "Home", ...segments) + ".yml";
}

function pageItemId(page) {
    const document = yaml.load(fs.readFileSync(pageFile(page), "utf8"));
    if (!document?.ID) throw new Error(`Missing item ID for ${page.id}`);
    return String(document.ID);
}

function updatePageItem(page, entries) {
    const filePath = pageFile(page);
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `Missing serialized page item for ${page.id}: ${filePath}`,
        );
    }
    const document = yaml.load(fs.readFileSync(filePath, "utf8"));
    for (const locale of locales) {
        const language = document.Languages.find(
            (entry) => entry.Language === locale,
        );
        if (!language?.Versions?.length) {
            throw new Error(`Missing ${locale} version for ${page.id}`);
        }
        const version = [...language.Versions].sort(
            (left, right) => Number(right.Version) - Number(left.Version),
        )[0];
        const fields = version.Fields ?? (version.Fields = []);
        const localized = page.fields[locale];
        const languageFields = language.Fields ?? (language.Fields = []);
        upsertField(
            languageFields,
            ids.displayName,
            "__Display name",
            localized.navigationTitle,
        );
        languageFields.sort((left, right) => left.ID.localeCompare(right.ID));
        const pageLayout = layoutXml(entries, page.id, locale);
        const contentValues = [
            [ids.finalRenderings, "__Final Renderings", pageLayout],
            [ids.pageSummary, "pageSummary", localized.hero.summary],
            [ids.pageShortTitle, "pageShortTitle", localized.navigationTitle],
            [ids.pageTitle, "pageTitle", localized.pageTitle],
            [ids.pageHeaderTitle, "pageHeaderTitle", localized.hero.heading],
            [ids.navigationTitle, "navigationTitle", localized.navigationTitle],
            [ids.metadataTitle, "metadataTitle", localized.seo.title],
            [
                ids.metadataDescription,
                "metadataDescription",
                localized.seo.description,
            ],
            [
                ids.metadataKeywords,
                "metadataKeywords",
                `SLB, energy technology, ${page.section}`,
            ],
            [ids.metadataAuthor, "metadataAuthor", "SLB"],
            [ids.ogTitle, "ogTitle", localized.seo.openGraphTitle],
            [
                ids.ogDescription,
                "ogDescription",
                localized.seo.openGraphDescription,
            ],
            [ids.ogImage, "ogImage", imageXml(localized.hero.image)],
            [ids.workflowState, "__Workflow state", `{${ids.pageApproved}}`],
        ];
        const values = [
            ...contentValues,
            [ids.updatedBy, "__Updated by", owner],
            [ids.updated, "__Updated", pageContentReleaseTimestamp],
        ];
        values.forEach(([ID, Hint, Value]) =>
            upsertField(fields, ID, Hint, Value),
        );
        fields.sort((left, right) => left.ID.localeCompare(right.ID));
    }
    document.Languages = document.Languages.map((language) => ({
        Language: language.Language,
        ...(language.Fields?.length ? { Fields: language.Fields } : {}),
        Versions: language.Versions,
    }));
    fs.writeFileSync(filePath, serializeItem(document), "utf8");
}

function ensureHeroFolder() {
    const folder = datasourceFolders.hero;
    const document = datasourceItem({
        key: "slb:hero-folder",
        id: folder.id,
        parent: "428f962d-09ec-47ad-a7d1-4ef1799c4e3b",
        template: "767723ae-ea5c-4d23-89c1-bd18fd051650",
        itemPath: folder.path,
        releaseTimestamp: pageContentReleaseTimestamp,
        localizedFields: Object.fromEntries(
            locales.map((locale) => [locale, []]),
        ),
    });
    writeSerializedItem("Data", "SLB Heroes", document);
}

function serializedYamlFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .flatMap((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) return serializedYamlFiles(entryPath);
            return entry.isFile() && entry.name.endsWith(".yml")
                ? [entryPath]
                : [];
        });
}

function removeEmptyChildDirectories(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const childDirectory = path.join(directory, entry.name);
        removeEmptyChildDirectories(childDirectory);
        if (fs.readdirSync(childDirectory).length === 0) {
            fs.rmdirSync(childDirectory);
        }
    }
}

function removeStaleGeneratedSerializationFiles() {
    let removed = 0;
    for (const folder of Object.values(datasourceFolders)) {
        const directory = path.join(serializationRoot, folder.directory);
        for (const filePath of serializedYamlFiles(directory)) {
            const document = yaml.load(fs.readFileSync(filePath, "utf8"));
            const expectedFilePath = generatedSerializationFileById.get(
                String(document?.ID ?? "").toLowerCase(),
            );
            if (
                expectedFilePath &&
                expectedFilePath !== path.resolve(filePath)
            ) {
                fs.unlinkSync(filePath);
                removed += 1;
            }
        }
        removeEmptyChildDirectories(directory);
    }
    return removed;
}

function validateImages() {
    const referenced = new Set();
    for (const page of fallbackCatalog.pages) {
        for (const locale of locales) {
            const fields = page.fields[locale];
            if (fields.hero.image?.filename)
                referenced.add(fields.hero.image.filename);
            fields.supportingImages.forEach((image) =>
                referenced.add(image.filename),
            );
            if (fields.seo.openGraphImageFilename)
                referenced.add(fields.seo.openGraphImageFilename);
        }
    }
    const missing = [...referenced].filter(
        (filename) => !damAssetDescriptors.has(filename),
    );
    if (missing.length) {
        throw new Error(
            `Missing ${missing.length} Content Hub DAM descriptors for referenced content images: ${missing.join(", ")}`,
        );
    }
    return referenced.size;
}

function generate() {
    const imageCount = validateImages();
    ensureHeroFolder();
    let datasourceCount = 0;
    let renderingCount = 0;
    for (const page of fallbackCatalog.pages) {
        const allocationsByLocale = Object.fromEntries(
            locales.map((locale) => [
                locale,
                imageAllocations(page.fields[locale]),
            ]),
        );
        const entries = [heroDatasource(page)];
        datasourceCount += 1;
        page.fields.en.components.forEach((component, componentIndex) => {
            const allocations = Object.fromEntries(
                locales.map((locale) => [
                    locale,
                    allocationsByLocale[locale][componentIndex],
                ]),
            );
            entries.push(
                componentDatasource(page, componentIndex, allocations),
            );
            datasourceCount += 1 + (component.items?.length ?? 0);
        });
        if (page.relatedPageRoutes.en.length) {
            const related = multiPromoDatasource(
                page,
                -1,
                Object.fromEntries(locales.map((locale) => [locale, []])),
                true,
            );
            entries.push(related);
            datasourceCount += 1 + page.relatedPageRoutes.en.length;
        }
        if (page.fields.en.finalCta) {
            entries.push(ctaDatasource(page, -1, true));
            datasourceCount += 1;
        }
        updatePageItem(page, entries);
        renderingCount += entries.length + (page.id === "S03" ? 1 : 0);
    }
    const removedStaleFiles = removeStaleGeneratedSerializationFiles();
    console.log(
        `Generated ${datasourceCount} editable datasource items and ${renderingCount} rendering instances across ${fallbackCatalog.pages.length} pages (${locales.join(", ")}); removed ${removedStaleFiles} stale serialization files; validated ${imageCount} unique image assets.`,
    );
}

generate();
