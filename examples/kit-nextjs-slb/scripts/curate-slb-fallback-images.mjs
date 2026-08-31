import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_LOCALES = ["en", "es-MX"];

const EXISTING_ASSET_FILENAMES = [
    "about-global-presence.jpg",
    "about-innovation-factori.jpg",
    "about-technology-center-team.jpg",
    "home-collaborative-workplace.jpg",
    "home-decarbonizing-industry.jpg",
    "home-digital-at-scale.jpg",
    "home-energy-infrastructure.jpg",
    "home-precision-engineering.jpg",
    "home-scaling-new-energy.jpg",
    "news-artificial-lift-technologies.jpg",
    "news-havstjerne-carbon-storage.jpg",
    "news-shreveport-infrastructure.jpg",
    "products-intelligent-power-management.jpg",
    "products-lumi-platform.jpg",
    "products-reda-agile-esp.jpg",
    "products-tela-ai.jpg",
    "products-test-facility.jpg",
    "solutions-laboratory-innovation.jpg",
    "solutions-local-expertise.jpg",
    "solutions-manufacturing-expertise.jpg",
    "sustainability-climate-action.jpg",
    "sustainability-field-employee.jpg",
    "sustainability-iceland-road.jpg",
    "sustainability-nature.jpg",
    "sustainability-our-people.jpg",
];

const NEW_ASSET_FILENAMES = [
    "ccus-reservoir-uncertainty-review.jpg",
    "ccus-basin-screening-workstation.jpg",
    "ccus-core-characterization-lab.jpg",
    "ccus-injection-well-manifold.jpg",
    "ccus-monitoring-seismic-array.jpg",
    "ccus-storage-operations-control-room.jpg",
    "contact-media-briefing.jpg",
    "contact-products-specialist.jpg",
    "contact-technical-consultation.jpg",
    "decarbonization-compressor-maintenance.jpg",
    "decarbonization-engineers-prioritize-tablet.jpg",
    "decarbonization-execution-toolbox-talk.jpg",
    "decarbonization-inventory-aerial-survey.jpg",
    "decarbonization-methane-sensor-wellhead.jpg",
    "decarbonization-technology-selection.jpg",
    "decarbonization-verification-dashboard.jpg",
    "digital-data-context.jpg",
    "digital-data-governance-review.jpg",
    "digital-workflow-automation.jpg",
    "global-presence-local-field-briefing.jpg",
    "global-presence-regional-technology-center.jpg",
    "insight-decarbonization-baseline-workshop.jpg",
    "insight-decarbonization-control-room-hero.jpg",
    "insight-decarbonization-evidence-review.jpg",
    "insight-decarbonization-intervention-planning.jpg",
    "insight-trusted-ai-context.jpg",
    "insights-energy-research-roundtable-hero.jpg",
    "insights-research-exchange-hero.jpg",
    "nature-biodiversity-field-survey.jpg",
    "nature-equipment-circularity-workshop.jpg",
    "nature-place-context.jpg",
    "nature-water-sampling-operation.jpg",
    "new-energy-geothermal-well.jpg",
    "new-energy-grid-storage.jpg",
    "new-energy-hydrogen-electrolyzer.jpg",
    "new-energy-lithium-extraction.jpg",
    "new-energy-offshore-wind.jpg",
    "newsroom-global-energy-network-hero.jpg",
    "newsroom-media-briefing-hero.jpg",
    "newsroom-technology-release.jpg",
    "people-community-stem-workshop.jpg",
    "people-field-safety-training.jpg",
    "people-inclusive-engineering-team.jpg",
    "solutions-field-deployment.jpg",
    "subsurface-lifecycle-planning-hero.jpg",
    "well-decommissioning-restored-site.jpg",
    "climate-action-methane-detection-hero.jpg",
];

const STATIC_ASSET_ALT_TEXT = {
    "about-global-presence.jpg": {
        en: "SLB engineer walks between large industrial pipes at an operations site.",
        "es-MX":
            "Un ingeniero de SLB camina entre grandes tuberías industriales en un sitio de operaciones.",
    },
    "about-innovation-factori.jpg": {
        en: "Colleagues collaborate in an Innovation Factori workspace.",
        "es-MX":
            "Un grupo de colegas colabora en un espacio de Innovation Factori.",
    },
    "about-technology-center-team.jpg": {
        en: "Two SLB engineers pose between test fixtures in a technology center.",
        "es-MX":
            "Dos ingenieros de SLB posan entre equipos de prueba en un centro tecnológico.",
    },
    "ccus-basin-screening-workstation.jpg": {
        en: "Geoscientists compare basin models on a large workstation display.",
        "es-MX":
            "Un grupo de geocientíficos compara modelos de cuenca en una pantalla de gran formato.",
    },
    "ccus-core-characterization-lab.jpg": {
        en: "A laboratory specialist examines a rock core prepared for carbon storage analysis.",
        "es-MX":
            "Una especialista de laboratorio examina un núcleo de roca preparado para el análisis de almacenamiento de carbono.",
    },
    "ccus-injection-well-manifold.jpg": {
        en: "Engineers inspect an injection well manifold at a carbon storage site.",
        "es-MX":
            "Un grupo de ingenieros inspecciona un múltiple de un pozo de inyección en un sitio de almacenamiento de carbono.",
    },
    "ccus-monitoring-seismic-array.jpg": {
        en: "Field specialists deploy a seismic monitoring array across an open landscape.",
        "es-MX":
            "Especialistas de campo despliegan una red de monitoreo sísmico en un paisaje abierto.",
    },
    "ccus-storage-operations-control-room.jpg": {
        en: "Operators monitor a carbon storage network from a modern control room.",
        "es-MX":
            "Un grupo de operadores monitorea una red de almacenamiento de carbono desde una sala de control moderna.",
    },
    "contact-media-briefing.jpg": {
        en: "Communications specialists prepare for a media briefing in a modern studio.",
        "es-MX":
            "Especialistas en comunicación se preparan para una sesión informativa con medios en un estudio moderno.",
    },
    "contact-products-specialist.jpg": {
        en: "A product specialist discusses industrial equipment with a customer.",
        "es-MX":
            "Una especialista de producto conversa con un cliente sobre equipos industriales.",
    },
    "contact-technical-consultation.jpg": {
        en: "Engineers review a technical challenge around a digital workstation.",
        "es-MX":
            "Un grupo de ingenieros analiza un desafío técnico frente a una estación de trabajo digital.",
    },
    "decarbonization-compressor-maintenance.jpg": {
        en: "Maintenance specialists inspect a large industrial compressor.",
        "es-MX":
            "Especialistas de mantenimiento inspeccionan un compresor industrial de gran tamaño.",
    },
    "decarbonization-engineers-prioritize-tablet.jpg": {
        en: "Engineers prioritize emissions interventions on a tablet beside an operating facility.",
        "es-MX":
            "Un grupo de ingenieros prioriza intervenciones de emisiones en una tableta junto a una instalación en operación.",
    },
    "decarbonization-execution-toolbox-talk.jpg": {
        en: "A field supervisor leads a toolbox talk before an emissions-reduction intervention.",
        "es-MX":
            "Un supervisor de campo dirige una charla de seguridad antes de una intervención para reducir emisiones.",
    },
    "decarbonization-inventory-aerial-survey.jpg": {
        en: "An aerial survey maps emissions sources across an industrial facility.",
        "es-MX":
            "Un levantamiento aéreo permite mapear las fuentes de emisiones de una instalación industrial.",
    },
    "decarbonization-methane-sensor-wellhead.jpg": {
        en: "A technician calibrates a methane sensor at an industrial wellhead.",
        "es-MX":
            "Un técnico calibra un sensor de metano en un cabezal de pozo industrial.",
    },
    "decarbonization-verification-dashboard.jpg": {
        en: "An analyst reviews verified emissions performance on a control-room dashboard.",
        "es-MX":
            "Una analista revisa el desempeño verificado de emisiones en un tablero de sala de control.",
    },
    "digital-data-context.jpg": {
        en: "Engineers review a contextualized asset model across large digital displays.",
        "es-MX":
            "Un grupo de ingenieros revisa un modelo contextualizado de activos en grandes pantallas digitales.",
    },
    "digital-workflow-automation.jpg": {
        en: "An operations team coordinates automated workflows from an integrated control room.",
        "es-MX":
            "Un equipo de operaciones coordina flujos de trabajo automatizados desde una sala de control integrada.",
    },
    "global-presence-local-field-briefing.jpg": {
        en: "A local field team gathers for an operations briefing beside energy infrastructure.",
        "es-MX":
            "Un equipo de campo local se reúne para una sesión operativa junto a infraestructura energética.",
    },
    "global-presence-regional-technology-center.jpg": {
        en: "Engineers collaborate inside a regional technology and training center.",
        "es-MX":
            "Un grupo de ingenieros colabora en un centro regional de tecnología y capacitación.",
    },
    "home-collaborative-workplace.jpg": {
        en: "Colleagues meet in a spacious modern SLB workplace.",
        "es-MX":
            "Un grupo de colegas se reúne en un espacio de trabajo moderno y amplio de SLB.",
    },
    "home-decarbonizing-industry.jpg": {
        en: "SLB operator crosses the glass-lined atrium of a technology facility.",
        "es-MX":
            "Un operador de SLB cruza el atrio acristalado de un centro tecnológico.",
    },
    "home-digital-at-scale.jpg": {
        en: "Presenter explains a digital subsurface visualization to an audience.",
        "es-MX":
            "Una presentadora explica una visualización digital del subsuelo a un grupo de asistentes.",
    },
    "home-energy-infrastructure.jpg": {
        en: "View looking up between four white industrial storage vessels as two SLB operators climb the structures.",
        "es-MX":
            "Vista ascendente entre cuatro depósitos industriales blancos mientras dos operadores de SLB ascienden por las estructuras.",
    },
    "home-precision-engineering.jpg": {
        en: "SLB technician inspects a circular piece of precision industrial equipment.",
        "es-MX":
            "Un técnico de SLB inspecciona un equipo industrial circular de alta precisión.",
    },
    "home-scaling-new-energy.jpg": {
        en: "Geothermal power plant in a green mountain landscape.",
        "es-MX":
            "Planta de energía geotérmica en un paisaje montañoso y verde.",
    },
    "insight-decarbonization-baseline-workshop.jpg": {
        en: "An engineering team establishes an emissions baseline around maps and operating data.",
        "es-MX":
            "Un equipo de ingeniería establece una línea base de emisiones con mapas y datos operativos.",
    },
    "insight-decarbonization-control-room-hero.jpg": {
        en: "Engineers assess industrial decarbonization performance in a control room.",
        "es-MX":
            "Un grupo de ingenieros evalúa el desempeño de descarbonización industrial en una sala de control.",
    },
    "insight-decarbonization-evidence-review.jpg": {
        en: "Specialists compare verified performance evidence across digital displays.",
        "es-MX":
            "Un grupo de especialistas compara evidencia verificada de desempeño en pantallas digitales.",
    },
    "insight-decarbonization-intervention-planning.jpg": {
        en: "Engineers plan emissions interventions around an operating model and site map.",
        "es-MX":
            "Un grupo de ingenieros planifica intervenciones de emisiones con un modelo operativo y un mapa del sitio.",
    },
    "insight-trusted-ai-context.jpg": {
        en: "A multidisciplinary energy team reviews governed data lineage, subsurface context, and equipment telemetry in an operations center.",
        "es-MX":
            "Un equipo multidisciplinario del sector energético revisa el linaje de datos gobernados, el contexto del subsuelo y la telemetría de equipos en un centro de operaciones.",
    },
    "insights-energy-research-roundtable-hero.jpg": {
        en: "Energy specialists exchange research insights around a collaborative table.",
        "es-MX":
            "Especialistas en energía intercambian hallazgos de investigación alrededor de una mesa de trabajo.",
    },
    "nature-biodiversity-field-survey.jpg": {
        en: "Field scientists document biodiversity in a wetland near distant energy infrastructure.",
        "es-MX":
            "Un grupo de científicos de campo documenta la biodiversidad en un humedal cerca de infraestructura energética distante.",
    },
    "nature-equipment-circularity-workshop.jpg": {
        en: "A technician inspects a component in an industrial equipment refurbishment center.",
        "es-MX":
            "Un técnico inspecciona un componente en un centro de reacondicionamiento de equipos industriales.",
    },
    "nature-place-context.jpg": {
        en: "An operations team studies a watershed map while overlooking a semi-arid landscape.",
        "es-MX":
            "Un equipo de operaciones estudia un mapa de la cuenca frente a un paisaje semiárido.",
    },
    "nature-water-sampling-operation.jpg": {
        en: "Engineers collect a clear-water sample at an industrial water reuse facility.",
        "es-MX":
            "Un grupo de ingenieros toma una muestra de agua clara en una instalación industrial de reúso de agua.",
    },
    "new-energy-geothermal-well.jpg": {
        en: "Engineers inspect piping at a geothermal well in a volcanic landscape.",
        "es-MX":
            "Un grupo de ingenieros inspecciona las tuberías de un pozo geotérmico en un paisaje volcánico.",
    },
    "new-energy-grid-storage.jpg": {
        en: "A technician walks between utility-scale battery storage containers at dusk.",
        "es-MX":
            "Un técnico camina entre contenedores de almacenamiento de baterías a escala de red al atardecer.",
    },
    "new-energy-hydrogen-electrolyzer.jpg": {
        en: "An engineer inspects a hydrogen electrolyzer installation inside a clean industrial hall.",
        "es-MX":
            "Una ingeniera inspecciona una instalación de electrolizadores de hidrógeno en una nave industrial limpia.",
    },
    "new-energy-lithium-extraction.jpg": {
        en: "Engineers review a direct lithium extraction system at a brine processing facility.",
        "es-MX":
            "Un grupo de ingenieros revisa un sistema de extracción directa de litio en una planta de procesamiento de salmuera.",
    },
    "new-energy-offshore-wind.jpg": {
        en: "A service vessel approaches offshore wind turbines under a clear sky.",
        "es-MX":
            "Una embarcación de servicio se aproxima a turbinas eólicas marinas bajo un cielo despejado.",
    },
    "news-artificial-lift-technologies.jpg": {
        en: "Two SLB field specialists review work beside pumpjacks.",
        "es-MX":
            "Dos especialistas de campo de SLB revisan el trabajo junto a unidades de bombeo.",
    },
    "news-havstjerne-carbon-storage.jpg": {
        en: "SLB employee in orange coveralls stands on an offshore platform facing the sea.",
        "es-MX":
            "Un empleado de SLB con overol naranja se encuentra en una plataforma costa afuera frente al mar.",
    },
    "news-shreveport-infrastructure.jpg": {
        en: "SLB employees work around a forklift inside the Shreveport manufacturing facility.",
        "es-MX":
            "Empleados de SLB trabajan alrededor de un montacargas en la planta de manufactura de Shreveport.",
    },
    "newsroom-global-energy-network-hero.jpg": {
        en: "Editors review stories across a wall-sized visualization of the global energy network.",
        "es-MX":
            "Un equipo editorial revisa historias frente a una visualización mural de la red energética mundial.",
    },
    "people-community-stem-workshop.jpg": {
        en: "An SLB volunteer guides students through a hands-on STEM workshop.",
        "es-MX":
            "Una persona voluntaria de SLB guía a estudiantes durante un taller práctico de ciencia y tecnología.",
    },
    "people-field-safety-training.jpg": {
        en: "A field team practices a safety procedure beside industrial equipment.",
        "es-MX":
            "Un equipo de campo practica un procedimiento de seguridad junto a equipos industriales.",
    },
    "people-inclusive-engineering-team.jpg": {
        en: "A diverse engineering team collaborates around a digital project model.",
        "es-MX":
            "Un equipo diverso de ingeniería colabora en torno a un modelo digital de proyecto.",
    },
    "products-intelligent-power-management.jpg": {
        en: "Branded rendering of a land rig with a footprint reduction icon.",
        "es-MX":
            "Representación de un equipo de perforación terrestre con un icono de reducción de superficie.",
    },
    "products-lumi-platform.jpg": {
        en: "Lumi data and AI platform interface.",
        "es-MX": "Interfaz de la plataforma de datos e IA Lumi.",
    },
    "products-reda-agile-esp.jpg": {
        en: "Three-dimensional rendering of the Reda Agile ESP system.",
        "es-MX": "Representación tridimensional del sistema ESP Reda Agile.",
    },
    "products-tela-ai.jpg": {
        en: "Tela AI search interface on a dark-blue digital screen.",
        "es-MX":
            "Interfaz de búsqueda con IA de Tela sobre una pantalla digital azul oscuro.",
    },
    "products-test-facility.jpg": {
        en: "SLB technician operates a test system in a bright manufacturing facility.",
        "es-MX":
            "Un técnico de SLB opera un sistema de pruebas en una luminosa planta de manufactura.",
    },
    "solutions-laboratory-innovation.jpg": {
        en: "SLB engineer holds a laboratory flask between columns of material samples.",
        "es-MX":
            "Una ingeniera de SLB sostiene un matraz de laboratorio entre columnas de muestras de materiales.",
    },
    "solutions-local-expertise.jpg": {
        en: "SLB engineer in blue coveralls stands on a bridge with a city behind her.",
        "es-MX":
            "Una ingeniera de SLB con overol azul se encuentra en un puente con una ciudad al fondo.",
    },
    "solutions-manufacturing-expertise.jpg": {
        en: "Engineer examines equipment in an SLB manufacturing facility.",
        "es-MX":
            "Un ingeniero examina un equipo en una planta de manufactura de SLB.",
    },
    "sustainability-climate-action.jpg": {
        en: "Two people walk along a boardwalk through a restored natural landscape.",
        "es-MX":
            "Dos personas caminan por una pasarela en un paisaje natural restaurado.",
    },
    "sustainability-field-employee.jpg": {
        en: "SLB field employee in safety glasses and a white hard hat at sunset.",
        "es-MX":
            "Un empleado de campo de SLB con lentes de seguridad y casco blanco al atardecer.",
    },
    "sustainability-iceland-road.jpg": {
        en: "Road crossing a snow-covered Icelandic landscape.",
        "es-MX": "Una carretera atraviesa un paisaje nevado de Islandia.",
    },
    "sustainability-nature.jpg": {
        en: "Turquoise lake and open plain beneath snowcapped mountains.",
        "es-MX": "Lago turquesa y llanura abierta bajo montañas nevadas.",
    },
    "sustainability-our-people.jpg": {
        en: "Two SLB employees in blue coveralls walk across a field site at sunrise.",
        "es-MX":
            "Dos empleados de SLB con overoles azules caminan por un sitio de operaciones al amanecer.",
    },
};

const generatedAssetManifestUrl = new URL(
    "../public/images/slb/generated-assets-manifest.json",
    import.meta.url,
);
const generatedAssetManifest = JSON.parse(
    await readFile(generatedAssetManifestUrl, "utf8"),
);
const generatedAssetAltText = Object.fromEntries(
    generatedAssetManifest.assets.map((asset) => [
        asset.filename,
        { en: asset.alt_en, "es-MX": asset.alt_es_mx },
    ]),
);
const ASSET_ALT_TEXT = {
    ...STATIC_ASSET_ALT_TEXT,
    ...generatedAssetAltText,
};

// Image order is significant: the fallback renderer consumes this list once,
// in component order, assigning one image to a content section and one image
// per card or content-rail item.
const PAGE_IMAGE_ASSIGNMENTS = {
    H01: [
        "home-precision-engineering.jpg",
        "home-digital-at-scale.jpg",
        "home-decarbonizing-industry.jpg",
        "home-scaling-new-energy.jpg",
        "digital-data-governance-review.jpg",
        "decarbonization-execution-toolbox-talk.jpg",
        "newsroom-global-energy-network-hero.jpg",
    ],
    S01: [
        "home-energy-infrastructure.jpg",
        "decarbonization-engineers-prioritize-tablet.jpg",
        "decarbonization-compressor-maintenance.jpg",
        "new-energy-grid-storage.jpg",
        "contact-technical-consultation.jpg",
        "products-test-facility.jpg",
        "solutions-field-deployment.jpg",
        "decarbonization-verification-dashboard.jpg",
        "about-global-presence.jpg",
    ],
    S02: [
        "digital-data-context.jpg",
        "products-lumi-platform.jpg",
        "products-intelligent-power-management.jpg",
        "news-artificial-lift-technologies.jpg",
        "digital-workflow-automation.jpg",
        "insight-trusted-ai-context.jpg",
        "about-innovation-factori.jpg",
    ],
    S03: [
        "decarbonization-inventory-aerial-survey.jpg",
        "decarbonization-methane-sensor-wellhead.jpg",
        "decarbonization-engineers-prioritize-tablet.jpg",
        "decarbonization-compressor-maintenance.jpg",
        "decarbonization-verification-dashboard.jpg",
        "decarbonization-technology-selection.jpg",
        "insight-decarbonization-control-room-hero.jpg",
    ],
    S04: [
        "solutions-manufacturing-expertise.jpg",
        "news-havstjerne-carbon-storage.jpg",
        "new-energy-geothermal-well.jpg",
        "new-energy-lithium-extraction.jpg",
        "new-energy-hydrogen-electrolyzer.jpg",
        "new-energy-offshore-wind.jpg",
        "new-energy-grid-storage.jpg",
    ],
    P01: [
        "ccus-basin-screening-workstation.jpg",
        "products-intelligent-power-management.jpg",
        "products-reda-agile-esp.jpg",
        "products-lumi-platform.jpg",
        "decarbonization-methane-sensor-wellhead.jpg",
        "new-energy-geothermal-well.jpg",
        "news-shreveport-infrastructure.jpg",
    ],
    P02: [
        "ccus-core-characterization-lab.jpg",
        "ccus-basin-screening-workstation.jpg",
        "products-intelligent-power-management.jpg",
        "products-reda-agile-esp.jpg",
        "news-artificial-lift-technologies.jpg",
        "well-decommissioning-restored-site.jpg",
        "digital-data-governance-review.jpg",
    ],
    P03: [
        "digital-data-context.jpg",
        "home-digital-at-scale.jpg",
        "digital-workflow-automation.jpg",
        "products-tela-ai.jpg",
        "digital-data-governance-review.jpg",
    ],
    P04: [
        "ccus-storage-operations-control-room.jpg",
        "ccus-basin-screening-workstation.jpg",
        "ccus-core-characterization-lab.jpg",
        "ccus-injection-well-manifold.jpg",
        "ccus-monitoring-seismic-array.jpg",
        "ccus-reservoir-uncertainty-review.jpg",
    ],
    U01: [
        "nature-place-context.jpg",
        "sustainability-field-employee.jpg",
        "sustainability-our-people.jpg",
        "sustainability-nature.jpg",
        "insight-decarbonization-evidence-review.jpg",
    ],
    U02: [
        "decarbonization-execution-toolbox-talk.jpg",
        "decarbonization-methane-sensor-wellhead.jpg",
        "new-energy-grid-storage.jpg",
        "decarbonization-verification-dashboard.jpg",
        "insight-decarbonization-baseline-workshop.jpg",
    ],
    U03: [
        "people-field-safety-training.jpg",
        "people-inclusive-engineering-team.jpg",
        "people-community-stem-workshop.jpg",
        "sustainability-climate-action.jpg",
    ],
    U04: [
        "nature-place-context.jpg",
        "nature-biodiversity-field-survey.jpg",
        "nature-water-sampling-operation.jpg",
        "nature-equipment-circularity-workshop.jpg",
    ],
    N01: [
        "insights-energy-research-roundtable-hero.jpg",
        "decarbonization-inventory-aerial-survey.jpg",
    ],
    N02: [
        "products-tela-ai.jpg",
        "insight-decarbonization-control-room-hero.jpg",
        "subsurface-lifecycle-planning-hero.jpg",
    ],
    N03: [
        "digital-data-context.jpg",
        "insight-trusted-ai-context.jpg",
        "decarbonization-technology-selection.jpg",
        "digital-workflow-automation.jpg",
        "global-presence-regional-technology-center.jpg",
    ],
    N04: [
        "insight-decarbonization-baseline-workshop.jpg",
        "insight-decarbonization-intervention-planning.jpg",
        "insight-decarbonization-evidence-review.jpg",
        "insight-decarbonization-control-room-hero.jpg",
    ],
    N05: [
        "newsroom-global-energy-network-hero.jpg",
        "newsroom-technology-release.jpg",
        "new-energy-offshore-wind.jpg",
        "contact-media-briefing.jpg",
    ],
    A01: [
        "solutions-laboratory-innovation.jpg",
        "home-collaborative-workplace.jpg",
        "home-precision-engineering.jpg",
        "solutions-field-deployment.jpg",
        "global-presence-local-field-briefing.jpg",
        "about-innovation-factori.jpg",
    ],
    A02: [
        "solutions-laboratory-innovation.jpg",
        "ccus-core-characterization-lab.jpg",
        "about-technology-center-team.jpg",
        "insights-research-exchange-hero.jpg",
    ],
    A03: [
        "people-field-safety-training.jpg",
        "people-inclusive-engineering-team.jpg",
        "people-community-stem-workshop.jpg",
        "global-presence-local-field-briefing.jpg",
    ],
    A04: [
        "sustainability-iceland-road.jpg",
        "global-presence-regional-technology-center.jpg",
        "solutions-local-expertise.jpg",
    ],
    C01: [
        "contact-technical-consultation.jpg",
        "contact-products-specialist.jpg",
        "contact-media-briefing.jpg",
        "global-presence-local-field-briefing.jpg",
    ],
};

function fail(message) {
    throw new Error(`[SLB image curation] ${message}`);
}

function assert(condition, message) {
    if (!condition) fail(message);
}

function supportingImageSlotCount(component) {
    switch (component.type) {
        case "cardGrid":
        case "contentRail":
            return component.items?.length || 0;
        case "contentSection":
            return 1;
        default:
            return 0;
    }
}

function pageSlotCount(fields) {
    return (fields.components || []).reduce(
        (total, component) => total + supportingImageSlotCount(component),
        0,
    );
}

function sorted(values) {
    return [...values].sort((left, right) => left.localeCompare(right));
}

function sameStringArray(left, right) {
    return (
        left.length === right.length &&
        left.every((value, index) => value === right[index])
    );
}

function validateStaticCuration(catalog) {
    assert(
        EXISTING_ASSET_FILENAMES.length === 25,
        `Expected 25 existing image assets, found ${EXISTING_ASSET_FILENAMES.length}.`,
    );
    assert(
        NEW_ASSET_FILENAMES.length === 47,
        `Expected 47 new image assets, found ${NEW_ASSET_FILENAMES.length}.`,
    );

    const requiredAssets = [
        ...EXISTING_ASSET_FILENAMES,
        ...NEW_ASSET_FILENAMES,
    ];
    assert(
        new Set(requiredAssets).size === requiredAssets.length,
        "The existing and new asset lists overlap or contain duplicates.",
    );
    assert(
        sameStringArray(
            sorted(requiredAssets),
            sorted(Object.keys(ASSET_ALT_TEXT)),
        ),
        "The bilingual alt-text catalog must contain exactly the 72 required photographic assets.",
    );

    for (const [filename, localizedAlt] of Object.entries(ASSET_ALT_TEXT)) {
        for (const locale of SUPPORTED_LOCALES) {
            assert(
                typeof localizedAlt[locale] === "string" &&
                    localizedAlt[locale].trim().length > 0,
                `${filename} is missing natural alt text for ${locale}.`,
            );
        }
    }

    const curatedAssets = new Set([
        ...Object.values(PAGE_IMAGE_ASSIGNMENTS).flat(),
        ...catalog.pages
            .map((page) => page.fields.en.hero?.image?.filename)
            .filter(Boolean),
    ]);
    const unusedRequiredAssets = requiredAssets.filter(
        (filename) => !curatedAssets.has(filename),
    );
    assert(
        unusedRequiredAssets.length === 0,
        `Required assets are not used by any page: ${unusedRequiredAssets.join(", ")}.`,
    );
}

function validateCatalogShape(catalog) {
    assert(Array.isArray(catalog.pages), "Catalog must contain a pages array.");

    const pageIds = catalog.pages.map((page) => page.id);
    assert(
        pageIds.length === new Set(pageIds).size,
        "Catalog page IDs must be unique.",
    );

    const curatedPageIds = Object.keys(PAGE_IMAGE_ASSIGNMENTS);
    const missingPageIds = curatedPageIds.filter(
        (pageId) => !pageIds.includes(pageId),
    );
    const unexpectedPageIds = pageIds.filter(
        (pageId) => !curatedPageIds.includes(pageId),
    );
    assert(
        missingPageIds.length === 0 && unexpectedPageIds.length === 0,
        `Expected exactly the 23 curated pages. Missing: ${missingPageIds.join(", ") || "none"}; unexpected: ${unexpectedPageIds.join(", ") || "none"}.`,
    );

    const heroUsage = new Map();
    const pageUsage = new Map();

    for (const page of catalog.pages) {
        const localeKeys = Object.keys(page.fields || {});
        assert(
            localeKeys.length === new Set(localeKeys).size,
            `${page.id} contains duplicate locale keys.`,
        );
        assert(
            sameStringArray(sorted(localeKeys), sorted(SUPPORTED_LOCALES)),
            `${page.id} must contain exactly the en and es-MX locales.`,
        );

        const componentIdsByLocale = {};
        const slotCountsByLocale = {};
        for (const locale of SUPPORTED_LOCALES) {
            const fields = page.fields[locale];
            const componentIds = (fields.components || []).map(
                (component) => component.id,
            );
            assert(
                componentIds.length === new Set(componentIds).size,
                `${page.id}/${locale} contains duplicate component IDs.`,
            );
            componentIdsByLocale[locale] = componentIds;
            slotCountsByLocale[locale] = pageSlotCount(fields);
        }

        assert(
            sameStringArray(
                componentIdsByLocale.en,
                componentIdsByLocale["es-MX"],
            ),
            `${page.id} component order must match between en and es-MX.`,
        );
        assert(
            slotCountsByLocale.en === slotCountsByLocale["es-MX"],
            `${page.id} image-bearing slot count differs between en and es-MX.`,
        );

        const assignment = PAGE_IMAGE_ASSIGNMENTS[page.id];
        assert(
            assignment.length === slotCountsByLocale.en,
            `${page.id} requires ${slotCountsByLocale.en} supporting images but its curation provides ${assignment.length}.`,
        );
        assert(
            assignment.length === new Set(assignment).size,
            `${page.id} repeats a supporting-image filename.`,
        );

        for (const locale of SUPPORTED_LOCALES) {
            const heroFilename = page.fields[locale].hero?.image?.filename;
            const heroAlt = page.fields[locale].hero?.image?.alt;
            assert(
                !heroFilename ||
                    (typeof heroAlt === "string" && heroAlt.trim().length > 0),
                `${page.id}/${locale} has a hero image without alt text.`,
            );
            assert(
                !heroFilename || !assignment.includes(heroFilename),
                `${page.id}/${locale} reuses hero asset ${heroFilename} in supportingImages.`,
            );
        }

        const englishHeroFilename = page.fields.en.hero?.image?.filename;
        if (englishHeroFilename) {
            const pageIds = heroUsage.get(englishHeroFilename) || [];
            pageIds.push(page.id);
            heroUsage.set(englishHeroFilename, pageIds);
        }

        for (const filename of new Set([englishHeroFilename, ...assignment])) {
            if (!filename) continue;
            const pageIds = pageUsage.get(filename) || [];
            pageIds.push(page.id);
            pageUsage.set(filename, pageIds);
        }
    }

    const repeatedHeroes = [...heroUsage.entries()].filter(
        ([, pageIds]) => pageIds.length > 1,
    );
    assert(
        repeatedHeroes.length === 0,
        `Hero images must be unique across English routes: ${repeatedHeroes
            .map(([filename, pageIds]) => `${filename} (${pageIds.join(", ")})`)
            .join("; ")}.`,
    );

    const overusedAssets = [...pageUsage.entries()].filter(
        ([, pageIds]) => pageIds.length > 3,
    );
    assert(
        overusedAssets.length === 0,
        `No photo may appear on more than three English pages: ${overusedAssets
            .map(([filename, pageIds]) => `${filename} (${pageIds.join(", ")})`)
            .join("; ")}.`,
    );
}

function applyCuration(catalog) {
    for (const page of catalog.pages) {
        const assignment = PAGE_IMAGE_ASSIGNMENTS[page.id];
        for (const locale of SUPPORTED_LOCALES) {
            page.fields[locale].supportingImages = assignment.map(
                (filename) => ({
                    filename,
                    alt: ASSET_ALT_TEXT[filename][locale],
                }),
            );
        }

        const englishFilenames = page.fields.en.supportingImages.map(
            (image) => image.filename,
        );
        const spanishFilenames = page.fields["es-MX"].supportingImages.map(
            (image) => image.filename,
        );
        assert(
            sameStringArray(englishFilenames, spanishFilenames),
            `${page.id} does not share the same supporting-image filenames across locales.`,
        );
    }
}

function validateAppliedCuration(catalog) {
    for (const page of catalog.pages) {
        const expectedFilenames = PAGE_IMAGE_ASSIGNMENTS[page.id];
        for (const locale of SUPPORTED_LOCALES) {
            const supportingImages = page.fields[locale].supportingImages || [];
            const actualFilenames = supportingImages.map(
                (image) => image.filename,
            );
            assert(
                sameStringArray(actualFilenames, expectedFilenames),
                `${page.id}/${locale} does not match the deterministic image curation.`,
            );
            supportingImages.forEach((image) => {
                assert(
                    image.alt === ASSET_ALT_TEXT[image.filename][locale],
                    `${page.id}/${locale} has stale alt text for ${image.filename}.`,
                );
            });
        }
    }
}

const commandArguments = process.argv.slice(2);
const checkOnly = commandArguments.includes("--check");
const unknownOptions = commandArguments.filter(
    (argument) => argument.startsWith("--") && argument !== "--check",
);
assert(
    unknownOptions.length === 0,
    `Unknown option(s): ${unknownOptions.join(", ")}.`,
);
const positionalArguments = commandArguments.filter(
    (argument) => !argument.startsWith("--"),
);
assert(
    positionalArguments.length <= 1,
    "Pass at most one catalog path after the options.",
);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = positionalArguments[0]
    ? path.resolve(positionalArguments[0])
    : path.resolve(scriptDirectory, "../src/content/slb-fallback-content.json");
const catalogSource = await readFile(catalogPath, "utf8");
const catalog = JSON.parse(catalogSource);

validateStaticCuration(catalog);
validateCatalogShape(catalog);

if (checkOnly) {
    validateAppliedCuration(catalog);
    console.log(
        `Validated deterministic bilingual image curation for ${catalog.pages.length} pages in ${catalogPath}`,
    );
} else {
    applyCuration(catalog);
    validateAppliedCuration(catalog);

    const serializedCatalog = `${JSON.stringify(catalog, null, 4)}\n`.replace(
        /\n/g,
        "\r\n",
    );
    if (serializedCatalog !== catalogSource) {
        await writeFile(catalogPath, serializedCatalog, "utf8");
        console.log(
            `Curated ${catalog.pages.length} bilingual pages in ${catalogPath}`,
        );
    } else {
        console.log(
            `Image curation is already current for ${catalog.pages.length} bilingual pages in ${catalogPath}`,
        );
    }
}
