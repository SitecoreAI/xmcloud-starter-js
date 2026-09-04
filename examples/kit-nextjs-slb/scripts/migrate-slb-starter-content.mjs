import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");
const { createContentRevision } = require("./lib/slb-sitecore-revision.cjs");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(appRoot, "..", "..");
const serializationRoot = path.join(
    repositoryRoot,
    "authoring/items/slb-content/slb.site/slb",
);

const applyFiles = process.argv.includes("--apply-files");
const applyLive = process.argv.includes("--apply-live");
const publishLive = process.argv.includes("--publish");
const releaseTimestamp = "20260904T203000Z";
const owner = "sitecore\\thomas.lin@sitecore.com";
const revisionFieldId = "8cdc337e-a112-42fb-bbb4-4143751e123f";
const sharedRevisionFieldId = "dbbbeca1-21c7-4906-9dd2-493c1efa59a2";
const updatedFieldId = "d9cf14b1-fa16-4ba6-9288-e8a174d4d522";
const updatedByFieldId = "badd9cf9-53e0-4d0c-bcc0-2d784c282f6a";

if (publishLive && !applyLive) {
    throw new Error("--publish requires --apply-live.");
}

const pageIds = {
    solutions: "ac069f53-cd2b-431c-911f-198961034026",
    digital: "aeb8f2eb-5186-49a9-997c-5b3df3f3a551",
    decarbonization: "8820d35f-f544-4e9a-88a9-a0f49b23a25e",
    newEnergy: "5c955743-7376-48cb-9442-98187a9686bd",
    products: "9d42bcda-09fd-4a75-883e-0e15be202902",
    subsurface: "cf8f795e-5f79-467d-bd10-620d3b585c67",
    dataAndAi: "35f6c80d-d0b1-46ab-8a45-e1b143f8fc40",
    sustainability: "1bd44a6c-c817-4214-9347-ed52ceb6804a",
    climate: "8d9abeac-7781-44e0-ba94-75d76e1b6fae",
    people: "ab58855d-eff9-42e1-a9b7-74c6f30788f0",
    nature: "b3b10ff5-0d79-44ab-89b3-8246a9c23cec",
    news: "dde0a656-28db-42ae-91cc-f37c85089cb9",
    about: "0a9d8ff9-e3ac-4a15-bfd9-68b981e38eb5",
    contact: "6c22fc8e-534e-4b2f-9f7b-638c01b2db43",
};

const damImages = {
    logo: '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/6c243fbaffa74bf2b8b8d038894409cd?v=2d0f1d15" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/6c243fbaffa74bf2b8b8d038894409cd?v=2d0f1d15" dam-content-type="Image" alt="SLB" />',
    hero: '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/2a769a236a594bc1845bc00e2c779366?v=8dcdc8aa" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/2a769a236a594bc1845bc00e2c779366?v=8dcdc8aa" dam-id="114111" dam-content-type="Image" width="1416" height="1140" alt="View looking up between four white industrial storage vessels as two SLB operators climb the structures." />',
    people: '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/78c08584a221494b87ed7b84df318dfa?v=cdcff087" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/78c08584a221494b87ed7b84df318dfa?v=cdcff087" dam-id="114127" dam-content-type="Image" width="1100" height="900" alt="Colleagues meet in a spacious modern SLB workplace." />',
    subsurface:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/c1a62aad5a4e41ca94c2500ddcdc4937?v=1423fd76" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/c1a62aad5a4e41ca94c2500ddcdc4937?v=1423fd76" dam-id="114114" dam-content-type="Image" width="1130" height="730" alt="SLB technician inspects a circular piece of precision industrial equipment." />',
    digital:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/62c654cc341b43b882000c2f6da5dbd6?v=908be320" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/62c654cc341b43b882000c2f6da5dbd6?v=908be320" dam-id="114117" dam-content-type="Image" width="1130" height="730" alt="Presenter explains a digital subsurface visualization to an audience." />',
    decarbonization:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/44bbbb788f354b81ae644a9d658ddc88?v=93f6bac3" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/44bbbb788f354b81ae644a9d658ddc88?v=93f6bac3" dam-id="114120" dam-content-type="Image" width="1130" height="730" alt="SLB operator crosses the glass-lined atrium of a technology facility." />',
    newEnergy:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/1ae6355316334fa9a7a59c39e49aec17?v=610e91ff" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/1ae6355316334fa9a7a59c39e49aec17?v=610e91ff" dam-id="114124" dam-content-type="Image" width="1130" height="730" alt="Geothermal power plant in a green mountain landscape." />',
    biodiversity:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-biodiversity-field-survey" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-biodiversity-field-survey" dam-id="114397" dam-content-type="Image" width="1672" height="941" alt="Field ecologists record biodiversity observations in native wetland habitat near an operating site." />',
    circularity:
        '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-equipment-circularity-workshop" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-equipment-circularity-workshop" dam-id="114398" dam-content-type="Image" width="1672" height="941" alt="A technician inspects an industrial component in a circular equipment refurbishment center." />',
    water: '<image mediaid="" src="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-water-sampling-operation" thumbnailsrc="https://thlt-demo.sitecoresandbox.cloud/api/public/content/slb-nature-water-sampling-operation" dam-id="114399" dam-content-type="Image" width="1672" height="941" alt="Environmental specialists collect a clear-water sample at an industrial water reuse facility." />',
};

function internalLink(itemId, text) {
    return `<link class="" querystring="" id="{${itemId.toUpperCase()}}" anchor="" target="" title="" linktype="internal" text="${text}" url="" />`;
}

function externalLink(url, text) {
    return `<link linktype="external" url="${url}" target="_blank" text="${text}" title="" class="" />`;
}

function fields(values) {
    return Object.fromEntries(
        Object.entries(values).map(([hint, value]) => [hint, { value }]),
    );
}

function explicitField(id, value) {
    return { id, value };
}

const commonFaq = {
    what: {
        question: "What is SLB?",
        answer: "SLB is a global technology company that drives energy innovation for a balanced planet. Its teams combine science, digital technology, and domain expertise to help improve energy performance, reduce emissions, and develop new energy systems.",
    },
    where: {
        question: "Where does SLB operate?",
        answer: "SLB works across global energy markets, combining shared technology and expertise with teams who understand local geology, infrastructure, operations, and communities. Explore Global presence or Contact us to reach the right regional team.",
    },
    media: {
        question: "Where can I find SLB news and media resources?",
        answer: "Visit News and insights for company updates, technology perspectives, and media resources. For a specific press inquiry, use Contact us to reach the appropriate SLB team.",
    },
    contact: {
        question: "How can I contact SLB?",
        answer: "Use the Contact us page to route questions about technologies, operations, careers, investors, or media. Include the topic and region so the request can reach the right SLB team.",
    },
};

const homeMetadata = fields({
    pageSummary:
        "SLB brings together science, digital technology, and global energy expertise to help teams improve performance today while building lower-carbon systems for tomorrow.",
    pageShortTitle: "Home",
    pageTitle: "Engineering progress for a balanced planet",
    pageHeaderTitle: "Engineering progress for a balanced planet",
    metadataTitle: "SLB | Energy technology for a balanced planet",
    metadataDescription:
        "Discover how SLB combines science, digital technology, and energy expertise to improve performance, decarbonize industry, and scale new energy systems.",
    metadataKeywords:
        "SLB, energy technology, digital, decarbonization, new energy",
    metadataAuthor: "SLB",
    ogTitle: "SLB | Energy technology for a balanced planet",
    ogDescription:
        "Discover how SLB combines science, digital technology, and energy expertise to improve performance, decarbonize industry, and scale new energy systems.",
    ogImage: damImages.hero,
});

const items = [
    {
        file: "Home.yml",
        id: "7c4e1c03-65c5-4cf5-91b9-dcbaaef23e09",
        sharedFields: {
            __Thumbnail: explicitField(
                "c7c26117-dbb1-42b2-ab5e-f7223845cca3",
                damImages.hero,
            ),
        },
        versions: [{ language: "en", versions: [1, 2], fields: homeMetadata }],
    },
    {
        file: "Data/AI Config/Summary.yml",
        id: "980cd5c3-fc47-4388-8647-d7039b74fc51",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "SLB",
                    description:
                        "SLB is a global technology company that drives energy innovation for a balanced planet. This site presents capabilities across subsurface and well delivery, digital operations, industrial decarbonization, and new energy, together with sustainability, company, news, and contact information.",
                }),
            },
        ],
    },
    {
        file: "Data/AI Config/FAQ/What is Solterra.yml",
        targetFile: "Data/AI Config/FAQ/What is SLB.yml",
        targetName: "What is SLB",
        id: "0f366dfc-8e07-4c13-b6fc-c9f6f3cdff06",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields(commonFaq.what),
            },
        ],
    },
    {
        file: "Data/AI Config/FAQ/Brands Available.yml",
        targetFile: "Data/AI Config/FAQ/Where SLB operates.yml",
        targetName: "Where SLB operates",
        id: "460970f7-0996-45c3-bd32-a0ba2d4084bc",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields(commonFaq.where),
            },
        ],
    },
    {
        file: "Data/AI Config/FAQ/Media Kit.yml",
        targetFile: "Data/AI Config/FAQ/News and media.yml",
        targetName: "News and media",
        id: "e9f5c362-92fd-4e8b-aafc-e7b4c6519106",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields(commonFaq.media),
            },
        ],
    },
    {
        file: "Data/AI Config/FAQ/Account Setup.yml",
        targetFile: "Data/AI Config/FAQ/Contact SLB.yml",
        targetName: "Contact SLB",
        id: "b3b1bdae-9e07-4781-8c9f-dd1f8c1e4e38",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields(commonFaq.contact),
            },
        ],
    },
    {
        file: "Data/AI Config/Services/Article and Topic Listings.yml",
        targetFile:
            "Data/AI Config/Services/Energy technology and well delivery.yml",
        targetName: "Energy technology and well delivery",
        id: "c7ef62f4-ac67-43f9-8464-5aeac0617666",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    name: "Energy technology and well delivery",
                    description:
                        "Explore SLB capabilities for understanding the subsurface, constructing wells, improving production, and operating assets across the energy lifecycle.",
                    category: "Products and services",
                }),
            },
        ],
    },
    {
        file: "Data/AI Config/Services/Hero and Promo Sections.yml",
        targetFile: "Data/AI Config/Services/Digital operations and AI.yml",
        targetName: "Digital operations and AI",
        id: "e9f86cb5-cebd-4fc9-9c94-c13c8c11436a",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    name: "Digital operations and AI",
                    description:
                        "Connect trusted data, domain workflows, automation, and AI to help teams make clearer operating decisions and improve performance at scale.",
                    category: "Solutions",
                }),
            },
        ],
    },
    {
        file: "Data/AI Config/Services/Multi-Locale Content Delivery.yml",
        targetFile:
            "Data/AI Config/Services/Decarbonization and new energy.yml",
        targetName: "Decarbonization and new energy",
        id: "d48dfb9b-d94d-48a8-a7e4-978b6f155766",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    name: "Decarbonization and new energy",
                    description:
                        "Turn emissions data into action and apply subsurface and industrial expertise to carbon storage, geothermal, hydrogen, lithium, and other evolving energy systems.",
                    category: "Solutions",
                }),
            },
        ],
    },
    {
        file: "Home/Data/Accordion.yml",
        id: "fa67a79d-3706-462f-9f03-46ba5d46f961",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ heading: "Common questions" }),
            },
            {
                language: "es-MX",
                versions: "all",
                fields: fields({ heading: "Preguntas frecuentes" }),
            },
        ],
    },
    {
        file: "Home/Data/Accordion/Slide 1.yml",
        id: "5307f09b-0741-402c-a15d-f03990b0d19e",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    heading: commonFaq.what.question,
                    description: `<div class="ck-content"><p>${commonFaq.what.answer}</p></div>`,
                }),
            },
        ],
    },
    {
        file: "Home/Data/Accordion/Slide 2.yml",
        id: "8271c341-4351-4193-aa6c-15fb999b6a7b",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    heading: commonFaq.where.question,
                    description: `<div class="ck-content"><p>${commonFaq.where.answer}</p></div>`,
                }),
            },
        ],
    },
    {
        file: "Home/Data/Accordion/Slide 3.yml",
        id: "7a9795bc-2330-4633-ad0b-3c3697c0a7b9",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    heading: commonFaq.contact.question,
                    description: `<div class="ck-content"><p>${commonFaq.contact.answer}</p></div>`,
                }),
            },
        ],
    },
    {
        file: "Home/Data/AnimatedPromo.yml",
        id: "7046414e-2735-46ad-8287-daf64b543233",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    image: damImages.people,
                    title: "Build the future of energy with us",
                    description:
                        "Join a global team applying science, technology, and domain expertise to the world's most complex energy challenges.",
                    primaryLink: externalLink(
                        "https://careers.slb.com",
                        "Explore careers",
                    ),
                    secondaryLink: "",
                }),
            },
            {
                language: "es-MX",
                versions: "all",
                fields: fields({
                    image: damImages.people,
                    title: "Construya con nosotros el futuro de la energía",
                    description:
                        "Únase a un equipo global que aplica ciencia, tecnología y experiencia especializada a los desafíos energéticos más complejos del mundo.",
                    primaryLink: externalLink(
                        "https://careers.slb.com",
                        "Explore oportunidades profesionales",
                    ),
                    secondaryLink: "",
                }),
            },
        ],
    },
    {
        file: "Home/Data/CTA Banner.yml",
        id: "7dac80a8-18c4-4605-9e4a-93252cbfe98f",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    titleRequired: "Bring your next energy challenge",
                    descriptionOptional:
                        "Connect with SLB specialists to turn the next operating challenge into an actionable plan.",
                    linkOptional: internalLink(pageIds.contact, "Contact us"),
                }),
            },
            {
                language: "es-MX",
                versions: "all",
                fields: fields({
                    titleRequired: "Traiga su próximo desafío energético",
                    descriptionOptional:
                        "Conecte con especialistas de SLB para convertir el próximo desafío operativo en un plan de acción.",
                    linkOptional: internalLink(pageIds.contact, "Contáctenos"),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Hero.yml",
        id: "f5480f3d-2018-4d0c-837b-df78e01ae29d",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    titleRequired: "Engineering progress for a balanced planet",
                    descriptionOptional:
                        "SLB brings together science, digital technology, and global energy expertise to help teams improve performance today while building lower-carbon systems for tomorrow.",
                    linkOptional: internalLink(
                        pageIds.solutions,
                        "Explore our solutions",
                    ),
                    heroImageOptional1: damImages.hero,
                    heroImageOptional2: "",
                    heroImageOptional3: "",
                    heroImageOptional4: "",
                    heroVideoOptional1: "",
                    heroVideoOptional3: "",
                }),
            },
            {
                language: "es-MX",
                versions: "all",
                fields: fields({
                    titleRequired:
                        "Ingeniería para avanzar hacia un planeta equilibrado",
                    descriptionOptional:
                        "SLB reúne ciencia, tecnología digital y experiencia energética global para mejorar el desempeño actual mientras construye sistemas con menos carbono para el futuro.",
                    linkOptional: internalLink(
                        pageIds.solutions,
                        "Explore nuestras soluciones",
                    ),
                    heroImageOptional1: damImages.hero,
                    heroImageOptional2: "",
                    heroImageOptional3: "",
                    heroImageOptional4: "",
                    heroVideoOptional1: "",
                    heroVideoOptional3: "",
                }),
            },
        ],
    },
    {
        file: "Home/Data/Hero 2.yml",
        id: "884bde8b-34ee-4725-ab02-ebf4ba9903e3",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    titleRequired: explicitField(
                        "3f384b8c-9364-4f44-91ea-7f7fa3a76de9",
                        "Connected expertise for complex energy systems",
                    ),
                    descriptionOptional: explicitField(
                        "e2223200-5161-4e5a-9a35-9a5ac126c05c",
                        "Bring science, technology, and field experience together around the operating decision.",
                    ),
                    linkOptional: explicitField(
                        "c17f89f8-7429-4af1-a47d-b7b1e037fe45",
                        "",
                    ),
                    heroImageOptional1: explicitField(
                        "1c4089ef-d9fa-4515-ad8b-eac558420564",
                        "",
                    ),
                },
            },
            {
                language: "es-MX",
                versions: "all",
                fields: {
                    titleRequired: explicitField(
                        "3f384b8c-9364-4f44-91ea-7f7fa3a76de9",
                        "Experiencia conectada para sistemas energéticos complejos",
                    ),
                    descriptionOptional: explicitField(
                        "e2223200-5161-4e5a-9a35-9a5ac126c05c",
                        "Integre ciencia, tecnología y experiencia de campo en torno a la decisión operativa.",
                    ),
                    linkOptional: explicitField(
                        "c17f89f8-7429-4af1-a47d-b7b1e037fe45",
                        "",
                    ),
                    heroImageOptional1: explicitField(
                        "1c4089ef-d9fa-4515-ad8b-eac558420564",
                        "",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/Test Hero.yml",
        id: "1512f68d-501f-41d7-9b62-c257fbe1c14a",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    titleRequired: explicitField(
                        "3f384b8c-9364-4f44-91ea-7f7fa3a76de9",
                        "Make the next decision clearer",
                    ),
                    descriptionOptional: explicitField(
                        "e2223200-5161-4e5a-9a35-9a5ac126c05c",
                        "Use trusted context and domain expertise to move from insight to action.",
                    ),
                    linkOptional: explicitField(
                        "c17f89f8-7429-4af1-a47d-b7b1e037fe45",
                        "",
                    ),
                    heroImageOptional1: explicitField(
                        "1c4089ef-d9fa-4515-ad8b-eac558420564",
                        "",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoCarousel.yml",
        id: "1c2553a6-4244-4b02-82fc-d970f2bf677e",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "One challenge. Four connected paths",
                    description:
                        "Bring together subsurface insight, digital operations, industrial decarbonization, and new energy expertise around the outcomes that matter.",
                }),
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoCarousel/Promo1.yml",
        id: "c4eaf5c4-f3c3-4808-9213-3ae8a8805c4f",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        heading: "Subsurface and well delivery",
                        image: damImages.subsurface,
                        link: internalLink(
                            pageIds.subsurface,
                            "Explore subsurface and wells",
                        ),
                    }),
                    description: explicitField(
                        "54a924ec-8e98-4597-b9c2-d616dd66cc7c",
                        "See more clearly below ground and execute the well lifecycle with greater confidence.",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoCarousel/Promo2.yml",
        id: "c8c53fc4-7641-4ac9-ac0f-6039c823ebf4",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        heading: "Digital operations",
                        image: damImages.digital,
                        link: internalLink(
                            pageIds.digital,
                            "Explore digital operations",
                        ),
                    }),
                    description: explicitField(
                        "54a924ec-8e98-4597-b9c2-d616dd66cc7c",
                        "Connect data, workflows, automation, and AI around operating decisions.",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoCarousel/Promo3.yml",
        id: "b72cde8b-f81d-4c60-a486-2dcc6b21c80a",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        heading: "Industrial decarbonization",
                        image: damImages.decarbonization,
                        link: internalLink(
                            pageIds.decarbonization,
                            "Explore decarbonization",
                        ),
                    }),
                    description: explicitField(
                        "54a924ec-8e98-4597-b9c2-d616dd66cc7c",
                        "Turn emissions baselines into engineering priorities and measurable action.",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoCarousel/Promo4.yml",
        id: "4aa63f1b-3f3c-4402-84db-8e98e7f282c7",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        heading: "New energy systems",
                        image: damImages.newEnergy,
                        link: internalLink(
                            pageIds.newEnergy,
                            "Explore new energy",
                        ),
                    }),
                    description: explicitField(
                        "54a924ec-8e98-4597-b9c2-d616dd66cc7c",
                        "Apply proven subsurface and industrial expertise to emerging energy systems.",
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoTabs.yml",
        id: "f4fde065-f3a9-466c-a06e-23d7a6602357",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "Four priorities for responsible operations",
                    droplistLabel: "Explore a priority",
                }),
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoTabs/Climate.yml",
        id: "3e814193-7dbe-4f8e-99c2-71b7f49b2ba1",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "Climate action",
                    "image 1": damImages.decarbonization,
                    link1: internalLink(
                        pageIds.climate,
                        "Measure and reduce emissions",
                    ),
                    image2: damImages.newEnergy,
                    link2: internalLink(
                        pageIds.newEnergy,
                        "Scale lower-carbon systems",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoTabs/Livelihoods.yml",
        id: "5cb88e2b-7527-4f7b-b108-93b451d87470",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({ title: "People and communities" }),
                    "image 1": explicitField(
                        "22427604-b117-4985-a6a4-cc8aba4e044d",
                        damImages.people,
                    ),
                    link1: explicitField(
                        "60629870-4b2c-4574-a086-ad5cf20fce16",
                        internalLink(
                            pageIds.people,
                            "Build capability close to the work",
                        ),
                    ),
                    image2: explicitField(
                        "c1dedbd1-c877-4834-8b0b-0ef9ce90af87",
                        damImages.hero,
                    ),
                    link2: explicitField(
                        "c4d68c1f-0cd0-41e2-b986-0fec9a910176",
                        internalLink(
                            pageIds.about,
                            "Meet the people behind SLB",
                        ),
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoTabs/Nature.yml",
        id: "766bfabe-423e-40e6-a1f5-0650671cbfb2",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "Nature",
                    "image 1": damImages.biodiversity,
                    link1: internalLink(pageIds.nature, "Protect biodiversity"),
                    image2: damImages.water,
                    link2: internalLink(
                        pageIds.nature,
                        "Strengthen water stewardship",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/MultiPromoTabs/Tab3.yml",
        targetFile: "Home/Data/MultiPromoTabs/Circularity.yml",
        targetName: "Circularity",
        id: "2d3824a4-46f7-4e86-83a7-b19ed1121942",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    title: "Circularity",
                    "image 1": damImages.circularity,
                    link1: internalLink(pageIds.nature, "Design out waste"),
                    image2: damImages.subsurface,
                    link2: internalLink(
                        pageIds.products,
                        "Extend equipment life",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Small Promo.yml",
        id: "a898a323-4f18-4cf6-baa8-7fc5479308c0",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        heading: "Responsible operations",
                        description:
                            "Connect environmental context, engineering choices, and measurable action throughout the operating lifecycle.",
                        image: damImages.water,
                    }),
                    link: explicitField(
                        "8ec6e4b8-3a38-4115-a892-38051924f3f1",
                        internalLink(
                            pageIds.nature,
                            "Explore responsible operations",
                        ),
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/Test Promo 1.yml",
        id: "366710fe-465d-4301-ab19-dc012faad6da",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    PromoText:
                        '<div class="ck-content"><p>Science, technology, and domain expertise move together from insight to execution.</p></div>',
                }),
            },
        ],
    },
    {
        file: "Home/Data/Testimonial.yml",
        id: "f0840d06-5838-4442-b048-4c311afce249",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ Title: "Operating principles" }),
            },
        ],
    },
    {
        file: "Home/Data/Testimonial/Testimonial 1.yml",
        id: "9413e72f-1e1a-452d-b62f-39063ae41f2d",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    testimonialAttribution: "ENGINEERING COLLABORATION",
                    testimonialQuote:
                        "Complex energy challenges move faster when domain expertise, data, and operations share one context.",
                }),
            },
        ],
    },
    {
        file: "Home/Data/Testimonial/Testimonial 2.yml",
        id: "31c9ca3f-688f-40a8-acd5-007144803900",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    testimonialAttribution: "LOCAL DELIVERY",
                    testimonialQuote:
                        "Global technology creates value when local teams adapt it to the geology, infrastructure, and operating reality.",
                }),
            },
        ],
    },
    {
        file: "Home/Data/Text 1.yml",
        id: "9b2c07f6-5580-4625-bd84-a883f3e24db6",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    text: '<div class="ck-content"><p>SLB connects science, digital technology, and energy expertise to help customers improve performance and build lower-carbon systems.</p></div>',
                }),
            },
        ],
    },
    {
        file: "Home/Data/Text 2.yml",
        id: "7a63dd1d-4142-43ee-a7ea-94edcb2e7c32",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    text: '<div class="ck-content"><p><strong>Energy innovation for a balanced planet</strong></p></div>',
                }),
            },
        ],
    },
    {
        file: "Home/Data/Text 3.yml",
        id: "03466635-140f-4591-826a-92ce8a9ed920",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    text: explicitField(
                        "8b57dadd-0825-4f5d-9c32-187c0af7e1fd",
                        '<div class="ck-content"><p>Every decision starts with trusted context.</p></div>',
                    ),
                },
            },
        ],
    },
    {
        file: "Home/Data/Topic Listing.yml",
        id: "b7ffc99a-1315-4e3d-ba50-881de1f899a3",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    titleRequired: "Explore connected energy capabilities",
                }),
            },
        ],
    },
    {
        file: "Home/Data/Topic Listing/Topic Link 1.yml",
        id: "f7061fea-714d-4590-9081-57d30b6533a6",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    linkOptional: internalLink(
                        pageIds.subsurface,
                        "Subsurface and well delivery",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Topic Listing/Topic Link 2.yml",
        id: "bb27c925-b6b9-4aff-bbca-64164c874df9",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    linkOptional: internalLink(
                        pageIds.digital,
                        "Digital operations",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Topic Listing/Topic Link 3.yml",
        id: "2dd70bb2-8570-4aeb-930e-2dd00900fde0",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    linkOptional: internalLink(
                        pageIds.decarbonization,
                        "Industrial decarbonization",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Topic Listing/Topic Link 4.yml",
        id: "20f39090-a2d7-4588-abfd-7ee5eee61604",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    linkOptional: internalLink(
                        pageIds.newEnergy,
                        "New energy systems",
                    ),
                }),
            },
        ],
    },
    {
        file: "Home/Data/Video 1.yml",
        id: "ca74d7aa-9c25-4aca-b3ff-07e4364026c9",
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ image: damImages.hero, video: "" }),
            },
        ],
    },
    {
        file: "Presentation/Partial Designs/Global/Header/Data/Global Header.yml",
        id: "1468d70d-bebf-46f7-b404-65712a324ef3",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({
                    headerLogo: damImages.logo,
                    headerContact: internalLink(pageIds.contact, "Contact us"),
                }),
            },
        ],
    },
    {
        file: "Presentation/Partial Designs/Global/Footer/Data/Global Footer.yml",
        id: "cd1943ed-1668-4452-9f48-00d4b77aa22f",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: {
                    ...fields({
                        footerSocialLinks: "",
                        footerLogo: damImages.logo,
                        footerPromoDescription:
                            "Get the latest SLB technology, energy innovation, and industry insights delivered to your inbox.",
                        footerPromoTitle: "Energy insights, delivered",
                        footerCopyright: "© 2026 SLB. All rights reserved.",
                        footerPromoLink: "",
                    }),
                    emailSubscriptionTitle: explicitField(
                        "f76bf9b9-3dfe-4cea-ac52-a87f3043911b",
                        "Energy insights, delivered",
                    ),
                    tagline: explicitField(
                        "42460973-3c52-4b54-8ee5-6b335f256705",
                        "Energy innovation for a balanced planet.",
                    ),
                },
            },
        ],
    },
    ...[
        ["Facebook", "bb6188cc-6733-4cf9-8ce2-181352dd6c4a"],
        ["Instagram", "8adb16f4-18cd-4b15-9bd3-01822a798901"],
        ["LinkedIn", "a31baf91-78bb-4b39-8d27-c65be22e0c76"],
    ].map(([name, id]) => ({
        file: `Presentation/Partial Designs/Global/Footer/Data/Global Footer/${name}.yml`,
        id,
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ link: "", socialIcon: "" }),
            },
        ],
    })),
    {
        file: "Presentation/Partial Designs/Global/Footer/Data/Column One.yml",
        id: "a3499b25-e1d0-4aed-9423-3ecdac27f9da",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ header: "Solutions" }),
            },
        ],
    },
    {
        file: "Presentation/Partial Designs/Global/Footer/Data/Column Two.yml",
        id: "ca16140c-3b5b-4677-8fbb-071d7faff455",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ header: "Products and services" }),
            },
        ],
    },
    {
        file: "Presentation/Partial Designs/Global/Footer/Data/Column Three.yml",
        id: "194a7c9d-1977-4f11-9c2d-5d2ab083e05e",
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ header: "Company" }),
            },
        ],
    },
    ...[
        [
            "Column One/How It Works",
            "b001c3d1-f52e-449e-b553-30b5e475fbbb",
            pageIds.digital,
            "Digital operations",
        ],
        [
            "Column One/Platform",
            "414aa5be-fda6-4408-955b-bac33a6b7306",
            pageIds.decarbonization,
            "Industrial decarbonization",
        ],
        [
            "Column One/Pricing",
            "1a408ae6-201c-43cd-beda-f7c89c3f1cb3",
            pageIds.newEnergy,
            "New energy systems",
        ],
        [
            "Column One/Solutions",
            "518f9278-550d-4323-a818-1354b5840671",
            pageIds.solutions,
            "All solutions",
        ],
        [
            "Column Two/Company",
            "a6734fcc-67d5-44fe-a74a-8c42b8c10d16",
            pageIds.subsurface,
            "Subsurface and well delivery",
        ],
        [
            "Column Two/QA Link",
            "d587ae91-aa15-4e58-8e06-a06683a6ecd7",
            pageIds.dataAndAi,
            "Data and AI",
        ],
        [
            "Column Three/Blog",
            "a4e67407-bb8a-434a-852d-9685e0322c5e",
            pageIds.about,
            "Who we are",
        ],
        [
            "Column Three/Resources",
            "0c5d819a-f0c0-4e58-a35c-f72ee5c3cd1b",
            pageIds.news,
            "News and insights",
        ],
    ].map(([relativePath, id, targetId, text]) => ({
        file: `Presentation/Partial Designs/Global/Footer/Data/${relativePath}.yml`,
        id,
        publish: true,
        versions: [
            {
                language: "en",
                versions: "all",
                fields: fields({ link: internalLink(targetId, text) }),
            },
        ],
    })),
];

const publishParentIds = [
    "a1db0acf-e311-4433-93d9-733600ff9ff1",
    "9675def5-1ea2-476e-9524-48c79be1fbbb",
    "57b80ae5-9ada-4658-aa98-98e6c43e9c2a",
];

function normalizedGuid(value) {
    const hex = String(value ?? "")
        .replace(/[^0-9a-f]/gi, "")
        .toLowerCase();
    if (hex.length !== 32) return "";
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function loadYaml(filePath) {
    return yaml.load(
        fs
            .readFileSync(filePath, "utf8")
            .replace(/^\uFEFF/, "")
            .replace(/^(\s*Value:\s*)\*(\s*)$/gm, '$1"*"$2'),
    );
}

function fieldById(fieldList, id) {
    const target = normalizedGuid(id);
    return (fieldList ?? []).find(
        (entry) => normalizedGuid(entry.ID) === target,
    );
}

function fieldIdFor(document, hint, explicitId) {
    if (explicitId) return normalizedGuid(explicitId);
    const fieldCollections = [document.SharedFields ?? []];
    for (const language of document.Languages ?? []) {
        fieldCollections.push(language.Fields ?? []);
        for (const version of language.Versions ?? []) {
            fieldCollections.push(version.Fields ?? []);
        }
    }
    const matches = fieldCollections
        .flat()
        .filter((field) => field.Hint === hint)
        .map((field) => normalizedGuid(field.ID))
        .filter(Boolean);
    const ids = [...new Set(matches)];
    if (ids.length !== 1) {
        throw new Error(
            `${document.Path} field ${hint} resolved to ${ids.length} IDs.`,
        );
    }
    return ids[0];
}

function upsertField(fieldList, id, hint, value) {
    let field = fieldById(fieldList, id);
    if (!field) {
        field = { ID: normalizedGuid(id), Hint: hint, Value: value };
        fieldList.push(field);
    } else {
        field.Hint = hint;
        field.Value = value;
    }
    return field;
}

function finalizeRevisions(document) {
    if (document.SharedFields?.length) {
        upsertField(
            document.SharedFields,
            sharedRevisionFieldId,
            "__Shared revision",
            createContentRevision({
                itemId: document.ID,
                scope: "shared",
                fields: document.SharedFields,
                revisionFieldIds: [sharedRevisionFieldId],
            }),
        );
        document.SharedFields.sort((left, right) =>
            String(left.ID).localeCompare(String(right.ID)),
        );
    }
    for (const language of document.Languages ?? []) {
        for (const version of language.Versions ?? []) {
            const versionFields = version.Fields ?? (version.Fields = []);
            upsertField(
                versionFields,
                revisionFieldId,
                "__Revision",
                createContentRevision({
                    itemId: document.ID,
                    scope: `${language.Language}:version:${version.Version}`,
                    fields: [...(language.Fields ?? []), ...versionFields],
                    revisionFieldIds: [revisionFieldId, sharedRevisionFieldId],
                }),
            );
            versionFields.sort((left, right) =>
                String(left.ID).localeCompare(String(right.ID)),
            );
        }
    }
}

function serialize(document) {
    finalizeRevisions(document);
    return `---\n${yaml.dump(document, {
        lineWidth: -1,
        noRefs: true,
        noCompatMode: true,
        quoteStyle: "double",
        sortKeys: false,
    })}`.replace(/^(\s*Value:) ""$/gm, "$1");
}

function resolveItemFile(item) {
    const source = path.join(serializationRoot, item.file);
    const target = path.join(serializationRoot, item.targetFile ?? item.file);
    if (fs.existsSync(target)) return { source, target, current: target };
    if (fs.existsSync(source)) return { source, target, current: source };
    throw new Error(`Missing serialized item ${item.file}.`);
}

function applyItemEdits(item) {
    const paths = resolveItemFile(item);
    const document = loadYaml(paths.current);
    if (normalizedGuid(document.ID) !== normalizedGuid(item.id)) {
        throw new Error(`${item.file} has unexpected item ID ${document.ID}.`);
    }

    const liveUpdates = [];
    if (item.targetName) {
        document.Path = `${String(document.Path).split("/").slice(0, -1).join("/")}/${item.targetName}`;
    }

    if (item.sharedFields) {
        const shared = document.SharedFields ?? (document.SharedFields = []);
        const updateFields = [];
        for (const [hint, specification] of Object.entries(item.sharedFields)) {
            const id = fieldIdFor(document, hint, specification.id);
            upsertField(shared, id, hint, specification.value);
            updateFields.push({ id, value: specification.value });
        }
        liveUpdates.push({
            itemId: normalizedGuid(item.id),
            language: "en",
            fields: updateFields,
            expectedPath: document.Path,
        });
    }

    for (const scope of item.versions ?? []) {
        const language = (document.Languages ?? []).find(
            (entry) => entry.Language === scope.language,
        );
        if (!language) {
            throw new Error(
                `${document.Path} has no ${scope.language} language.`,
            );
        }
        const selectedVersions = (language.Versions ?? []).filter(
            (version) =>
                scope.versions === "all" ||
                scope.versions.includes(Number(version.Version)),
        );
        if (
            scope.versions !== "all" &&
            selectedVersions.length !== scope.versions.length
        ) {
            throw new Error(
                `${document.Path} ${scope.language} is missing a requested version.`,
            );
        }
        for (const version of selectedVersions) {
            const versionFields = version.Fields ?? (version.Fields = []);
            const updateFields = [];
            for (const [hint, specification] of Object.entries(scope.fields)) {
                const id = fieldIdFor(document, hint, specification.id);
                upsertField(versionFields, id, hint, specification.value);
                updateFields.push({ id, value: specification.value });
            }
            upsertField(versionFields, updatedByFieldId, "__Updated by", owner);
            upsertField(
                versionFields,
                updatedFieldId,
                "__Updated",
                releaseTimestamp,
            );
            liveUpdates.push({
                itemId: normalizedGuid(item.id),
                language: scope.language,
                version: Number(version.Version),
                fields: updateFields,
                expectedPath: document.Path,
            });
        }
    }

    const serialized = serialize(document);
    return { item, document, paths, serialized, liveUpdates };
}

const migrations = items.map(applyItemEdits);
const changedFiles = migrations.filter(({ paths, serialized }) => {
    const current = fs.readFileSync(paths.current, "utf8");
    return current !== serialized || paths.current !== paths.target;
});

console.log(
    `Preflight passed for ${migrations.length} items; ${changedFiles.length} serialized files require changes.`,
);
for (const migration of changedFiles) {
    console.log(`- ${migration.document.Path}`);
}

if (applyFiles) {
    for (const { paths, serialized } of changedFiles) {
        fs.mkdirSync(path.dirname(paths.target), { recursive: true });
        fs.writeFileSync(paths.target, serialized, "utf8");
        if (paths.current !== paths.target && fs.existsSync(paths.source)) {
            fs.unlinkSync(paths.source);
        }
    }
    console.log(`Updated ${changedFiles.length} serialized files.`);
}

function graphQlString(value) {
    return JSON.stringify(String(value));
}

async function graphQl(query) {
    const authoringHost = process.env.SITECORE_AUTHORING_HOST?.replace(
        /\/+$/,
        "",
    );
    const accessToken = process.env.SITECORE_ACCESS_TOKEN;
    if (!authoringHost || !accessToken) {
        throw new Error(
            "Set SITECORE_AUTHORING_HOST and SITECORE_ACCESS_TOKEN for --apply-live.",
        );
    }
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

function chunks(values, size) {
    const result = [];
    for (let index = 0; index < values.length; index += size) {
        result.push(values.slice(index, index + size));
    }
    return result;
}

async function updateLiveItems(liveUpdates) {
    let completed = 0;
    for (const batch of chunks(liveUpdates, 10)) {
        const mutations = batch
            .map((update, index) => {
                const updateFields = update.fields
                    .map(
                        (field) =>
                            `{ name: ${graphQlString(field.id)}, value: ${graphQlString(field.value)} }`,
                    )
                    .join(", ");
                const versionInput = Number.isInteger(update.version)
                    ? `, version: ${update.version}`
                    : "";
                return `u${index}: updateItem(input: { database: "master", itemId: ${graphQlString(update.itemId)}, language: ${graphQlString(update.language)}${versionInput}, fields: [${updateFields}] }) { item { itemId path name version } }`;
            })
            .join("\n");
        const data = await graphQl(`mutation CleanSlbContent { ${mutations} }`);
        batch.forEach((update, index) => {
            const result = data[`u${index}`]?.item;
            if (
                normalizedGuid(result?.itemId) !== update.itemId ||
                (Number.isInteger(update.version) &&
                    Number(result?.version) !== update.version)
            ) {
                throw new Error(
                    `Sitecore did not confirm ${update.itemId} ${update.language}${Number.isInteger(update.version) ? ` v${update.version}` : " shared fields"}.`,
                );
            }
        });
        completed += batch.length;
        console.log(
            `Updated ${completed}/${liveUpdates.length} live item versions.`,
        );
    }
}

async function renameLiveItems(renameItems) {
    for (const batch of chunks(renameItems, 10)) {
        const mutations = batch
            .map(
                (item, index) =>
                    `r${index}: renameItem(input: { database: "master", itemId: ${graphQlString(normalizedGuid(item.id))}, newName: ${graphQlString(item.targetName)} }) { item { itemId name path } }`,
            )
            .join("\n");
        const data = await graphQl(
            `mutation RenameSlbContent { ${mutations} }`,
        );
        batch.forEach((item, index) => {
            const result = data[`r${index}`]?.item;
            if (
                normalizedGuid(result?.itemId) !== normalizedGuid(item.id) ||
                result?.name !== item.targetName
            ) {
                throw new Error(
                    `Sitecore did not confirm rename for ${item.id}.`,
                );
            }
        });
    }
    if (renameItems.length) {
        console.log(
            `Renamed ${renameItems.length} live items without changing GUIDs.`,
        );
    }
}

async function verifyLive(migrations) {
    for (const migration of migrations) {
        for (const update of migration.liveUpdates) {
            const selections = update.fields
                .map(
                    (field, index) =>
                        `f${index}: field(name: ${graphQlString(field.id)}) { value }`,
                )
                .join("\n");
            const versionInput = Number.isInteger(update.version)
                ? `, version: ${update.version}`
                : "";
            const data = await graphQl(`query VerifySlbContent {
                item(where: { database: "master", itemId: ${graphQlString(update.itemId)}, language: ${graphQlString(update.language)}${versionInput} }) {
                    itemId name path version
                    ${selections}
                }
            }`);
            const current = data.item;
            if (
                normalizedGuid(current?.itemId) !== update.itemId ||
                (Number.isInteger(update.version) &&
                    Number(current?.version) !== update.version) ||
                update.fields.some(
                    (field, index) =>
                        current?.[`f${index}`]?.value !== field.value,
                )
            ) {
                throw new Error(
                    `Live verification failed for ${update.itemId} ${update.language} v${update.version}.`,
                );
            }
            if (
                migration.item.targetName &&
                current?.name !== migration.item.targetName
            ) {
                throw new Error(
                    `Live rename verification failed for ${update.itemId}.`,
                );
            }
        }
    }
    console.log(
        `Verified ${migrations.length} live items and every changed field.`,
    );
}

async function publishItems(itemIds, publishSubItems = false) {
    const roots = [...new Set(itemIds.map(normalizedGuid))];
    const data = await graphQl(`mutation PublishSlbContent {
        publishItem(input: {
            rootItemIds: [${roots.map(graphQlString).join(", ")}]
            languages: ["en", "es-MX"]
            sourceDatabase: "master"
            targetDatabases: ["experienceedge"]
            publishItemMode: SMART
            publishSubItems: ${publishSubItems}
            publishRelatedItems: false
        }) { operationId }
    }`);
    const operationId = data.publishItem?.operationId;
    if (!operationId)
        throw new Error("Sitecore did not return a publish operation ID.");
    for (let attempt = 0; attempt < 60; attempt += 1) {
        const statusData = await graphQl(`query PublishStatus {
            publishingStatus(publishingOperationId: ${graphQlString(operationId)}) {
                isDone isFailed processed state
            }
        }`);
        const status = statusData.publishingStatus;
        if (status?.isFailed) {
            throw new Error(
                `Sitecore publish failed: ${JSON.stringify(status)}`,
            );
        }
        if (status?.isDone) {
            console.log(
                `Published ${roots.length} cleaned root items${publishSubItems ? " with descendants" : ""} to Experience Edge.`,
            );
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Timed out waiting for Sitecore publish.");
}

if (applyLive) {
    const liveUpdates = migrations.flatMap(
        (migration) => migration.liveUpdates,
    );
    await updateLiveItems(liveUpdates);
    await renameLiveItems(items.filter((item) => item.targetName));
    await verifyLive(migrations);
    if (publishLive) {
        await publishItems([
            ...publishParentIds,
            ...items.filter((item) => item.publish).map((item) => item.id),
        ]);
        await publishItems(["5313907a-cb9d-469b-b761-db8641732c61"], true);
    }
}

if (!applyFiles && !applyLive) {
    console.log(
        "Dry run only. Use --apply-files for serialization and --apply-live after the guarded editing host has deployed.",
    );
}
