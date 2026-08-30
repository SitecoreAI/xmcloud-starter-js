import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourcePath = process.argv[2];
const requestedOutputPath = process.argv[3];

if (!sourcePath) {
    throw new Error(
        "Pass the approved SLB content JSON path: npm run content:fallback -- /absolute/path/slb-site-content.json",
    );
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = requestedOutputPath
    ? path.resolve(requestedOutputPath)
    : path.resolve(
          scriptDirectory,
          "../src/content/slb-fallback-content.json",
      );
const source = JSON.parse(await readFile(path.resolve(sourcePath), "utf8"));

const authoringInstruction =
    /\b(?:do not|dynamic rail|provide governed|query news|revalidate|use (?:this|approved|current)|must include)\b/i;

const omittedComponents = new Set([
    "U01:component-04",
    "U02:component-04",
    "U04:component-04",
    "N01:component-01",
    "N01:component-04",
    "N02:component-03",
    "A04:component-02",
]);

const headingOverrides = {
    "N05:component-01:en": "Latest news from SLB",
    "N05:component-01:es-MX": "Noticias recientes de SLB",
    "N05:component-02:en": "Media inquiries",
    "N05:component-02:es-MX": "Consultas de medios",
};

const itemOverrides = {
    "N05:component-01:en": [
        {
            title: "Company news",
            summary:
                "Read current corporate announcements and updates from teams across SLB.",
        },
        {
            title: "Technology updates",
            summary:
                "Explore newly released capabilities for energy operations and emerging systems.",
        },
        {
            title: "Project stories",
            summary:
                "See how technology, expertise, and collaboration come together in the field.",
        },
    ],
    "N05:component-01:es-MX": [
        {
            title: "Noticias de la compañía",
            summary:
                "Consulte anuncios corporativos y novedades de los equipos de SLB.",
        },
        {
            title: "Actualizaciones de tecnología",
            summary:
                "Explore nuevas capacidades para las operaciones energéticas y los sistemas emergentes.",
        },
        {
            title: "Historias de proyectos",
            summary:
                "Descubra cómo la tecnología, la experiencia y la colaboración se unen en campo.",
        },
    ],
};

const bodyOverrides = {
    "P01:component-03:es-MX":
        "Descubra tecnologías recientes que convierten la ciencia, los datos y la experiencia de campo en capacidades prácticas para operaciones energéticas más eficientes y sostenibles.",
    "N05:component-01:es-MX":
        "Explore anuncios corporativos, lanzamientos tecnológicos e historias de proyectos que muestran cómo los equipos de SLB convierten la innovación energética en resultados.",
    "A04:component-03:en":
        "SLB has a long-standing presence in Mexico and works with local talent, customers, communities, and institutions across the region. Local teams combine technological innovation with responsible performance to address the energy priorities of each market.",
    "A04:component-03:es-MX":
        "SLB tiene una presencia de larga trayectoria en México y colabora con talento local, clientes, comunidades e instituciones de toda la región. Los equipos locales combinan la innovación tecnológica con un desempeño responsable para responder a las prioridades energéticas de cada mercado.",
};

const relatedPageRouteOverrides = {
    H01: {
        en: [
            "/products-and-services/subsurface-and-well-delivery",
            "/solutions/digital-operations",
            "/solutions/industrial-decarbonization",
            "/solutions/new-energy-systems",
        ],
        "es-MX": [
            "/es-mx/productos-y-servicios/subsuelo-y-construccion-de-pozos",
            "/es-mx/soluciones/operaciones-digitales",
            "/es-mx/soluciones/descarbonizacion-industrial",
            "/es-mx/soluciones/sistemas-de-nueva-energia",
        ],
    },
    S01: {
        en: [
            "/products-and-services",
            "/solutions/digital-operations",
            "/solutions/industrial-decarbonization",
            "/solutions/new-energy-systems",
        ],
        "es-MX": [
            "/es-mx/productos-y-servicios",
            "/es-mx/soluciones/operaciones-digitales",
            "/es-mx/soluciones/descarbonizacion-industrial",
            "/es-mx/soluciones/sistemas-de-nueva-energia",
        ],
    },
    U02: {
        en: [
            "/sustainability",
            "/solutions/industrial-decarbonization",
            "/solutions/new-energy-systems",
            "/news-and-insights/insights/designing-decarbonization-for-execution",
        ],
        "es-MX": [
            "/es-mx/sostenibilidad",
            "/es-mx/soluciones/descarbonizacion-industrial",
            "/es-mx/soluciones/sistemas-de-nueva-energia",
            "/es-mx/noticias-y-analisis/analisis/disenar-la-descarbonizacion-para-la-ejecucion",
        ],
    },
    N02: {
        en: [
            "/news-and-insights/insights/ai-starts-with-trusted-context",
            "/news-and-insights/insights/designing-decarbonization-for-execution",
            "/products-and-services/subsurface-and-well-delivery",
        ],
        "es-MX": [
            "/es-mx/noticias-y-analisis/analisis/la-ia-comienza-con-un-contexto-confiable",
            "/es-mx/noticias-y-analisis/analisis/disenar-la-descarbonizacion-para-la-ejecucion",
            "/es-mx/productos-y-servicios/subsuelo-y-construccion-de-pozos",
        ],
    },
    A01: {
        en: [
            "/about-us/people-and-culture",
            "/about-us/technology-and-innovation",
            "/about-us/global-presence",
        ],
        "es-MX": [
            "/es-mx/quienes-somos/personas-y-cultura",
            "/es-mx/quienes-somos/tecnologia-e-innovacion",
            "/es-mx/quienes-somos/presencia-global",
        ],
    },
};

const finalCtaTargetOverrides = {
    "N01:en": "/newsroom#newsletter",
    "N01:es-MX": "/es-mx/sala-de-prensa#newsletter",
};

const normalizedAnchors = new Map([
    ["dise-ado-para-la-realidad-operativa", "realidad-operativa"],
    ["descarbonizaci-n-dise-ada-para-la-ejecuci-n", "ejecucion"],
    ["la-gobernanza-convierte-la-ambici-n-en-responsabilidad", "gobernanza"],
    ["cta-de-bolet-n", "boletin"],
]);

const normalizeTarget = (target) => {
    const [pathname, fragment] = target.split("#", 2);
    if (!fragment) return target;
    return `${pathname}#${normalizedAnchors.get(fragment) || fragment}`;
};

const cleanCta = (cta) => {
    if (!cta?.label || !cta?.target) return undefined;

    return {
        label: cta.label,
        target: normalizeTarget(cta.target),
        targetType: cta.targetType || "internal",
    };
};

const cleanImage = (image) => {
    if (!image?.filename) return undefined;

    return {
        filename: image.filename,
        alt: image.alt || "",
    };
};

const cleanBody = (body) => {
    if (!body || authoringInstruction.test(body)) return undefined;
    return body;
};

const cleanComponent = (component, pageId, locale) => ({
    id: component.id,
    type: component.type,
    order: component.order,
    heading:
        headingOverrides[`${pageId}:${component.id}:${locale}`] ||
        component.heading,
    body:
        bodyOverrides[`${pageId}:${component.id}:${locale}`] ||
        cleanBody(component.body),
    items: Array.isArray(
        itemOverrides[`${pageId}:${component.id}:${locale}`] || component.items,
    )
        ? (
              itemOverrides[`${pageId}:${component.id}:${locale}`] ||
              component.items
          ).map(({ title, summary }) => ({ title, summary }))
        : undefined,
    cta: cleanCta(component.cta),
});

const cleanFields = (fields, pageId, locale) => {
    const hero = {
        eyebrow: fields.hero?.eyebrow || fields.hero?.topic,
        heading: fields.hero?.heading,
        summary: fields.hero?.summary,
        image: cleanImage(fields.hero?.image),
        primaryCta: cleanCta(fields.hero?.primaryCta),
        secondaryCta: cleanCta(fields.hero?.secondaryCta),
        searchLabel: fields.hero?.searchLabel,
        filterLabels: fields.hero?.filterLabels,
    };
    const components = (fields.components || [])
        .filter(
            (component) => !omittedComponents.has(`${pageId}:${component.id}`),
        )
        .map((component) => cleanComponent(component, pageId, locale))
        .sort((left, right) => left.order - right.order);

    const heroAnchor = [hero.primaryCta, hero.secondaryCta]
        .map((cta) => cta?.target.split("#", 2)[1])
        .find(Boolean);
    if (heroAnchor && components[0]) components[0].anchorId = heroAnchor;
    components.forEach((component) => {
        const componentAnchor = component.cta?.target.split("#", 2)[1];
        if (componentAnchor) component.anchorId = componentAnchor;
    });

    return {
        pageTitle: fields.pageTitle,
        navigationTitle: fields.navigationTitle,
        seo: fields.seo,
        hero,
        components,
        supportingImages: (fields.supportingImages || [])
            .map(cleanImage)
            .filter(Boolean),
        finalCta: fields.finalCta
            ? {
                  heading: fields.finalCta.heading,
                  ...cleanCta(fields.finalCta),
                  ...(finalCtaTargetOverrides[`${pageId}:${locale}`] && {
                      target:
                          finalCtaTargetOverrides[`${pageId}:${locale}`],
                  }),
              }
            : undefined,
    };
};

const cleanNavigationItem = (item) => ({
    pageId: item.pageId,
    labels: item.labels,
    routes: item.routes,
    children: item.children?.map(cleanNavigationItem),
});

const contactPage = {
    id: "C01",
    section: "contact-us",
    template: "Contact",
    routes: {
        en: "/contact-us",
        "es-MX": "/es-mx/contactenos",
    },
    routeAliases: {
        en: [],
        "es-MX": ["/es-mx/contact-us"],
    },
    relatedPageRoutes: {
        en: ["/solutions", "/products-and-services", "/newsroom"],
        "es-MX": [
            "/es-mx/soluciones",
            "/es-mx/productos-y-servicios",
            "/es-mx/sala-de-prensa",
        ],
    },
    fields: {
        en: {
            pageTitle: "Talk with an SLB specialist",
            navigationTitle: "Contact us",
            seo: {
                title: "Contact us | SLB",
                description:
                    "Tell us what you're working on. We'll connect you with the right technical and commercial team.",
                openGraphTitle: "Talk with an SLB specialist | SLB",
                openGraphDescription:
                    "Tell us what you're working on. We'll connect you with the right technical and commercial team.",
                openGraphImageFilename: "solutions-local-expertise.jpg",
            },
            hero: {
                eyebrow: "Contact SLB",
                heading: "Talk with an SLB specialist",
                summary:
                    "Tell us what you're working on. We'll connect you with the right technical and commercial team.",
                image: {
                    filename: "solutions-local-expertise.jpg",
                    alt: "SLB engineer in blue coveralls stands on a bridge with a city behind her.",
                },
                primaryCta: {
                    label: "Continue to the contact form",
                    target: "https://www.slb.com/contact-us",
                    targetType: "external",
                },
            },
            components: [
                {
                    id: "component-01",
                    type: "cardGrid",
                    order: 1,
                    heading: "How can we help?",
                    body: "Choose the reason that best matches your work so your inquiry reaches the right team.",
                    items: [
                        {
                            title: "Discuss a technical challenge",
                            summary:
                                "Connect with domain specialists across subsurface, wells, production, digital, decarbonization, and new energy.",
                        },
                        {
                            title: "Explore products and services",
                            summary:
                                "Find the right technology, service, or digital capability for your operating context.",
                        },
                        {
                            title: "Company and media inquiries",
                            summary:
                                "Reach the appropriate corporate, investor, careers, or media resource.",
                        },
                    ],
                },
                {
                    id: "component-02",
                    type: "contentSection",
                    order: 2,
                    heading: "Start with the context",
                    body: "Share the outcome you need, where the work is happening, and the best way to reach you. The SLB team will route your inquiry to the specialists best equipped to respond.",
                    cta: {
                        label: "Open the SLB contact form",
                        target: "https://www.slb.com/contact-us",
                        targetType: "external",
                    },
                },
            ],
            supportingImages: [
                {
                    filename: "home-collaborative-workplace.jpg",
                    alt: "Colleagues meet in a spacious modern SLB workplace.",
                },
            ],
            finalCta: {
                heading: "Ready to connect?",
                label: "Contact SLB",
                target: "https://www.slb.com/contact-us",
                targetType: "external",
            },
        },
        "es-MX": {
            pageTitle: "Hable con un especialista de SLB",
            navigationTitle: "Contáctenos",
            seo: {
                title: "Contáctenos | SLB",
                description:
                    "Cuéntenos en qué está trabajando. Le pondremos en contacto con el equipo técnico y comercial adecuado.",
                openGraphTitle: "Hable con un especialista de SLB | SLB",
                openGraphDescription:
                    "Cuéntenos en qué está trabajando. Le pondremos en contacto con el equipo técnico y comercial adecuado.",
                openGraphImageFilename: "solutions-local-expertise.jpg",
            },
            hero: {
                eyebrow: "Contacte a SLB",
                heading: "Hable con un especialista de SLB",
                summary:
                    "Cuéntenos en qué está trabajando. Le pondremos en contacto con el equipo técnico y comercial adecuado.",
                image: {
                    filename: "solutions-local-expertise.jpg",
                    alt: "Una ingeniera de SLB con overol azul se encuentra en un puente con una ciudad al fondo.",
                },
                primaryCta: {
                    label: "Continuar al formulario de contacto",
                    target: "https://www.slb.com/contact-us",
                    targetType: "external",
                },
            },
            components: [
                {
                    id: "component-01",
                    type: "cardGrid",
                    order: 1,
                    heading: "¿Cómo podemos ayudarle?",
                    body: "Elija el motivo que mejor describa su trabajo para que su consulta llegue al equipo adecuado.",
                    items: [
                        {
                            title: "Analizar un desafío técnico",
                            summary:
                                "Conéctese con especialistas en subsuelo, pozos, producción, tecnología digital, descarbonización y nuevas energías.",
                        },
                        {
                            title: "Explorar productos y servicios",
                            summary:
                                "Encuentre la tecnología, el servicio o la capacidad digital adecuada para su contexto operativo.",
                        },
                        {
                            title: "Consultas corporativas y de medios",
                            summary:
                                "Acceda al recurso adecuado para temas corporativos, inversionistas, carreras o medios.",
                        },
                    ],
                },
                {
                    id: "component-02",
                    type: "contentSection",
                    order: 2,
                    heading: "Comience con el contexto",
                    body: "Comparta el resultado que necesita, dónde se realizará el trabajo y la mejor forma de comunicarnos con usted. El equipo de SLB dirigirá su consulta a los especialistas mejor preparados para responder.",
                    cta: {
                        label: "Abrir el formulario de contacto de SLB",
                        target: "https://www.slb.com/contact-us",
                        targetType: "external",
                    },
                },
            ],
            supportingImages: [
                {
                    filename: "home-collaborative-workplace.jpg",
                    alt: "Un grupo de colegas se reúne en un espacio de trabajo moderno y amplio de SLB.",
                },
            ],
            finalCta: {
                heading: "¿Desea conversar?",
                label: "Contacte a SLB",
                target: "https://www.slb.com/contact-us",
                targetType: "external",
            },
        },
    },
};

const output = {
    schemaVersion: source.schemaVersion,
    site: {
        name: source.site.name,
        purposeLine: source.site.purposeLine,
        locales: source.site.locales.map(
            ({ code, displayName, routePrefix }) => ({
                code,
                displayName,
                routePrefix,
            }),
        ),
    },
    navigation: source.navigation.map(cleanNavigationItem),
    pages: [
        ...source.pages.map((page) => ({
            id: page.id,
            section: page.section,
            template: page.template,
            routes: page.routes,
            relatedPageRoutes:
                relatedPageRouteOverrides[page.id] || page.relatedPageRoutes,
            fields: {
                en: cleanFields(page.fields.en, page.id, "en"),
                "es-MX": cleanFields(page.fields["es-MX"], page.id, "es-MX"),
            },
        })),
        contactPage,
    ],
};

const serializedOutput = `${JSON.stringify(output, null, 4)}\n`.replace(
    /\n/g,
    "\r\n",
);
await writeFile(outputPath, serializedOutput, "utf8");
console.log(`Wrote ${output.pages.length} bilingual pages to ${outputPath}`);
