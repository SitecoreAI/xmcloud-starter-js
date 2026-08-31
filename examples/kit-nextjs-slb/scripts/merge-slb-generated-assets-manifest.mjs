import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const imageDirectory = path.resolve(scriptDirectory, "../public/images/slb");
const destinationPath = path.join(imageDirectory, "manifest.json");
const generatedSourcePath = path.join(
    imageDirectory,
    "generated-assets-manifest.json",
);
const expectedOriginalAssetCount = 26;
const expectedGeneratedAssetCount = 47;
const expectedWidth = 1672;
const expectedHeight = 941;
const siteBaseUrl = "https://slb-sitecoreai-demo.vercel.app";
const generatedRightsNote =
    "Generated for the approved SLB implementation using OpenAI built-in image generation on 2026-08-30.";

const sourceRouteRules = [
    [
        "Nature and responsible operations",
        "/sustainability/nature-and-responsible-operations",
    ],
    ["Industrial decarbonization", "/solutions/industrial-decarbonization"],
    ["CCUS", "/products-and-services/ccus"],
    ["Our people and communities", "/sustainability/people-and-communities"],
    ["Newsroom", "/newsroom"],
    ["Insights", "/news-and-insights/insights"],
    [
        "AI starts with trusted context",
        "/news-and-insights/insights/ai-starts-with-trusted-context",
    ],
    ["Climate action", "/sustainability/climate-action"],
    ["Solutions", "/solutions"],
    [
        "Decarbonization insight",
        "/news-and-insights/insights/designing-decarbonization-for-execution",
    ],
    ["Global presence", "/about-us/global-presence"],
    ["Contact", "/contact-us"],
    ["Digital operations", "/solutions/digital-operations"],
    [
        "Subsurface and well delivery",
        "/products-and-services/subsurface-and-well-delivery",
    ],
    ["Data and AI", "/products-and-services/data-and-ai"],
    ["New energy systems", "/solutions/new-energy-systems"],
];

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

const getSourcePageUrl = (placement) => {
    const routeRule = sourceRouteRules.find(([prefix]) =>
        placement.startsWith(prefix),
    );

    assert(routeRule, `No source-page route configured for: ${placement}`);
    return new URL(routeRule[1], siteBaseUrl).toString();
};

const getJpegDimensions = (imageBuffer) => {
    assert(
        imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8,
        "Asset does not have a JPEG start-of-image marker",
    );

    const startOfFrameMarkers = new Set([
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
    ]);
    let offset = 2;

    while (offset + 8 < imageBuffer.length) {
        if (imageBuffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }

        while (imageBuffer[offset] === 0xff) {
            offset += 1;
        }

        const marker = imageBuffer[offset];
        offset += 1;

        if (marker === 0xd8 || marker === 0xd9) {
            continue;
        }

        const segmentLength = imageBuffer.readUInt16BE(offset);
        assert(segmentLength >= 2, "Invalid JPEG segment length");

        if (startOfFrameMarkers.has(marker)) {
            return {
                width: imageBuffer.readUInt16BE(offset + 5),
                height: imageBuffer.readUInt16BE(offset + 3),
            };
        }

        offset += segmentLength;
    }

    throw new Error("JPEG dimensions could not be read");
};

const destinationManifest = JSON.parse(await readFile(destinationPath, "utf8"));
const generatedSourceManifest = JSON.parse(
    await readFile(generatedSourcePath, "utf8"),
);

assert(
    generatedSourceManifest.assets.length === expectedGeneratedAssetCount,
    `Expected ${expectedGeneratedAssetCount} generated assets, found ${generatedSourceManifest.assets.length}`,
);
assert(
    generatedSourceManifest.asset_count ===
        generatedSourceManifest.assets.length,
    "Generated source manifest asset_count does not match its assets array",
);

const generatedFilenames = generatedSourceManifest.assets.map(
    ({ filename }) => filename,
);
assert(
    new Set(generatedFilenames).size === generatedFilenames.length,
    "Generated source manifest contains duplicate filenames",
);

const generatedFilenameSet = new Set(generatedFilenames);
const preservedAssets = destinationManifest.assets.filter(
    ({ filename }) => !generatedFilenameSet.has(filename),
);
assert(
    preservedAssets.length === expectedOriginalAssetCount,
    `Expected to preserve ${expectedOriginalAssetCount} original assets, found ${preservedAssets.length}`,
);

const generatedAssets = await Promise.all(
    generatedSourceManifest.assets.map(async (asset) => {
        const imagePath = path.join(imageDirectory, asset.filename);
        const imageBuffer = await readFile(imagePath);
        const dimensions = getJpegDimensions(imageBuffer);

        assert(
            dimensions.width === expectedWidth &&
                dimensions.height === expectedHeight,
            `${asset.filename} is ${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}`,
        );

        return {
            filename: asset.filename,
            title: `SLB - ${asset.placement}`,
            alt_en: asset.alt_en,
            alt_es_mx: asset.alt_es_mx,
            lifecycle: "evergreen",
            placement: asset.placement,
            source_page_url: getSourcePageUrl(asset.placement),
            source_asset_url: `generated://openai/${asset.source_png}`,
            rights_note: generatedRightsNote,
            dimensions,
            sha256: createHash("sha256").update(imageBuffer).digest("hex"),
            mime_type: "image/jpeg",
        };
    }),
);

const mergedAssets = [...preservedAssets, ...generatedAssets];
const mergedFilenames = mergedAssets.map(({ filename }) => filename);
assert(
    mergedAssets.length ===
        expectedOriginalAssetCount + expectedGeneratedAssetCount,
    `Expected 73 merged assets, found ${mergedAssets.length}`,
);
assert(
    new Set(mergedFilenames).size === mergedFilenames.length,
    "Merged manifest contains duplicate filenames",
);

const mergedManifest = {
    ...destinationManifest,
    asset_count: mergedAssets.length,
    assets: mergedAssets,
};

await writeFile(
    destinationPath,
    `${JSON.stringify(mergedManifest, null, 4)}\n`.replace(/\n/g, "\r\n"),
    "utf8",
);

console.log(
    `Merged ${generatedAssets.length} generated assets with ${preservedAssets.length} preserved assets into ${destinationPath}`,
);
