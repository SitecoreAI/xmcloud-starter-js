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
const fallbackCatalog = JSON.parse(
    fs.readFileSync(
        path.join(appRoot, "src/content/slb-fallback-content.json"),
        "utf8",
    ),
);

const fixedTimestamp = "20260831T150000Z";
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
    return value
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

function parseDamUrls() {
    const source = fs.readFileSync(
        path.join(appRoot, "src/lib/slb-dam-assets.ts"),
        "utf8",
    );
    const urls = new Map();
    const pattern = /'([^']+)':\s*\n?\s*'([^']+)'/g;
    for (const match of source.matchAll(pattern)) urls.set(match[1], match[2]);
    return urls;
}

const damUrls = parseDamUrls();

function imageUrl(filename) {
    return damUrls.get(filename) ?? `/images/slb/${filename}`;
}

function imageXml(image) {
    if (!image?.filename) return undefined;
    const src = imageUrl(image.filename);
    const thumbnail = damUrls.has(image.filename)
        ? ` thumbnailsrc="${xmlEscape(src)}"`
        : "";
    return `<image mediaid="" src="${xmlEscape(src)}"${thumbnail} alt="${xmlEscape(image.alt)}" />`;
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

function standardVersionFields(itemKey, locale, extraFields) {
    return [
        field(ids.created, "__Created", fixedTimestamp),
        field(
            ids.workflowState,
            "__Workflow state",
            `{${ids.datasourceApproved}}`,
        ),
        field(ids.owner, "__Owner", owner),
        field(ids.createdBy, "__Created by", owner),
        field(
            ids.revision,
            "__Revision",
            deterministicGuid(`${itemKey}:${locale}:revision`),
        ),
        field(ids.updatedBy, "__Updated by", owner),
        field(ids.updated, "__Updated", fixedTimestamp),
        // Generated datasource items must own every field we pass here. An
        // omitted field is NULL in Sitecore and inherits the starter kit's
        // Standard Values; an explicit blank intentionally suppresses those
        // sample titles, descriptions, and links.
        ...extraFields.map((entry) => ({
            ...entry,
            Value: entry.Value ?? "",
        })),
    ].sort((left, right) => left.ID.localeCompare(right.ID));
}

function datasourceItem({
    key,
    id,
    parent,
    template,
    itemPath,
    localizedFields,
}) {
    return {
        ID: id,
        Parent: parent,
        Template: template,
        Path: itemPath,
        SharedFields: [
            field(ids.workflow, "__Workflow", `{${ids.datasourceWorkflow}}`),
            field(
                ids.sharedRevision,
                "__Shared revision",
                deterministicGuid(`${key}:shared`),
            ),
        ].sort((left, right) => left.ID.localeCompare(right.ID)),
        Languages: locales.map((locale) => ({
            Language: locale,
            Versions: [
                {
                    Version: 1,
                    Fields: standardVersionFields(
                        key,
                        locale,
                        localizedFields[locale],
                    ),
                },
            ],
        })),
    };
}

function serializeItem(document) {
    return `---\n${yaml.dump(document, {
        lineWidth: -1,
        noRefs: true,
        noCompatMode: true,
        quoteStyle: "double",
        sortKeys: false,
    })}`;
}

function writeSerializedItem(relativeDirectory, itemName, document) {
    const directory = path.join(serializationRoot, relativeDirectory);
    fs.mkdirSync(directory, { recursive: true });
    const filePath = path.join(directory, `${cleanItemName(itemName)}.yml`);
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
    const name = `${page.id} Hero`;
    const folder = datasourceFolders.hero;
    const localizedFields = {};
    for (const locale of locales) {
        const hero = page.fields[locale].hero;
        localizedFields[locale] = [
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
    const name = `${page.id} ${component.id} Promo`;
    const folder = datasourceFolders.promo;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = page.fields[locale].components[componentIndex];
        const image = images[locale]?.[0];
        localizedFields[locale] = [
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
    const name = `${page.id} ${related ? "Related" : enComponent.id} Cards`;
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
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const childKey = `${key}:item:${itemIndex + 1}`;
        const childId = deterministicGuid(childKey);
        const childName = `Card ${String(itemIndex + 1).padStart(2, "0")}`;
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
    const name = `${page.id} ${component.id} Rich Text`;
    const folder = datasourceFolders.richText;
    const localizedFields = {};
    for (const locale of locales) {
        const localized = page.fields[locale].components[componentIndex];
        localizedFields[locale] = [
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
    const name = `${page.id} ${final ? "Final" : enComponent.id} CTA`;
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
        return `${dynamic}&FieldNames=%7B${variants.hero}%7D&colorScheme=primary`;
    }
    if (entry.kind === "promo") {
        const variant =
            index % 2 === 0 ? variants.promoDefault : variants.promoImageRight;
        return `${dynamic}&FieldNames=%7B${variant}%7D&colorScheme=light${anchorParameter}`;
    }
    if (entry.kind === "multiPromo") {
        const columns = entry.itemCount >= 4 ? 4 : 3;
        return `${dynamic}&FieldNames=%7B${variants.multiPromo}%7D&numColumns=${columns}${anchorParameter}`;
    }
    if (entry.kind === "richText") {
        return `${dynamic}&FieldNames=%7B${variants.richText}%7D${anchorParameter}`;
    }
    return `${dynamic}&colorScheme=${index % 2 === 0 ? "primary" : "default"}${anchorParameter}`;
}

function renderingId(kind) {
    return renderings[kind];
}

function renderingXml(entry, index, previousUid, locale) {
    const uid = deterministicGuid(
        `${entry.pageId}:${entry.key}:rendering`,
    ).toUpperCase();
    const position = previousUid
        ? `p:after="r[@uid='{${previousUid}}']"`
        : 'p:before="*"';
    const parameters = xmlEscape(renderingParameters(entry, index, locale));
    return {
        uid,
        xml: `            <r\n              uid="{${uid}}"\n              ${position}\n              s:ds="${entry.id}"\n              s:id="{${renderingId(entry.kind)}}"\n              s:par="${parameters}"\n              s:ph="headless-main" />`,
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
        const values = [
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
            [
                ids.revision,
                "__Revision",
                deterministicGuid(`${page.id}:${locale}:page-revision`),
            ],
            [ids.updatedBy, "__Updated by", owner],
            [ids.updated, "__Updated", fixedTimestamp],
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
        localizedFields: Object.fromEntries(
            locales.map((locale) => [locale, []]),
        ),
    });
    writeSerializedItem("Data", "SLB Heroes", document);
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
        }
    }
    const missing = [...referenced].filter(
        (filename) =>
            !damUrls.has(filename) &&
            !fs.existsSync(path.join(appRoot, "public/images/slb", filename)),
    );
    if (missing.length) {
        throw new Error(
            `Missing ${missing.length} referenced images: ${missing.join(", ")}`,
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
    console.log(
        `Generated ${datasourceCount} editable datasource items and ${renderingCount} rendering instances across ${fallbackCatalog.pages.length} pages (${locales.join(", ")}); validated ${imageCount} unique image assets.`,
    );
}

generate();
