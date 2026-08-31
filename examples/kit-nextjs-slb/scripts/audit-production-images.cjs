#!/usr/bin/env node

"use strict";

const DEFAULT_BASE_URL = "https://slb-sitecoreai-demo.vercel.app";
const EXPECTED_ROUTE_COUNT = 46;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_CONCURRENCY = 8;
const TOP_REUSED_ASSET_COUNT = 12;

const KNOWN_CHROME_IMAGE_PATTERNS = [
    /(?:^|\/)favicon(?:[-_.\/]|$)/i,
    /(?:^|\/)(?:slb[-_])?(?:logo|wordmark)(?:[-_.\/]|$)/i,
    /\/search\/assets\/slb\.svg(?:[?#]|$)/i,
];

function decodeHtml(value) {
    return String(value)
        .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) =>
            String.fromCodePoint(Number.parseInt(codePoint, 16)),
        )
        .replace(/&#([0-9]+);/g, (_, codePoint) =>
            String.fromCodePoint(Number.parseInt(codePoint, 10)),
        )
        .replace(/&quot;/gi, '"')
        .replace(/&apos;|&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&");
}

function getHtmlAttribute(tag, name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const attributePattern = new RegExp(
        `(?:^|\\s)${escapedName}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+)))?`,
        "i",
    );
    const match = attributePattern.exec(tag);

    if (!match) {
        return { present: false, value: "" };
    }

    return {
        present: true,
        value: decodeHtml(match[1] ?? match[2] ?? match[3] ?? ""),
    };
}

function extractMainHtml(html) {
    const match = /<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(html);
    return match ? match[1] : null;
}

function canonicalizeImageSource(source, pageUrl) {
    const decodedSource = decodeHtml(source).trim();

    if (!decodedSource) {
        return "";
    }

    if (/^data:/i.test(decodedSource)) {
        return decodedSource;
    }

    try {
        const parsed = new URL(decodedSource, pageUrl);
        parsed.hash = "";

        // Responsive Next.js renditions can differ only by requested width/quality.
        // Audit their underlying asset so the renditions do not evade deduplication.
        if (
            parsed.pathname === "/_next/image" &&
            parsed.searchParams.has("url")
        ) {
            return canonicalizeImageSource(
                parsed.searchParams.get("url"),
                pageUrl,
            );
        }

        // Content Hub's `v` parameter identifies a rendition revision, not a distinct asset.
        if (/\/api\/public\/content\//i.test(parsed.pathname)) {
            parsed.searchParams.delete("v");
        }

        parsed.searchParams.sort();
        return parsed.href;
    } catch {
        return decodedSource;
    }
}

function resolveImageFetchUrl(source, pageUrl) {
    const decodedSource = decodeHtml(source).trim();

    if (!decodedSource) {
        return "";
    }

    try {
        return new URL(decodedSource, pageUrl).href;
    } catch {
        return decodedSource;
    }
}

function isKnownChromeImage(image, pageUrl) {
    const ignoreAttribute = getHtmlAttribute(
        image.tag,
        "data-image-audit-ignore",
    );
    if (
        ignoreAttribute.present &&
        ignoreAttribute.value.toLowerCase() !== "false"
    ) {
        return true;
    }

    const canonicalSource = canonicalizeImageSource(image.src, pageUrl);
    const label = image.alt.trim().toLowerCase();

    return (
        KNOWN_CHROME_IMAGE_PATTERNS.some((pattern) =>
            pattern.test(canonicalSource),
        ) ||
        (label === "slb" && /\.svg(?:[?#]|$)/i.test(canonicalSource))
    );
}

function parseMainImages(html, pageUrl) {
    const mainHtml = extractMainHtml(html);
    if (mainHtml === null) {
        return { hasMain: false, images: [] };
    }

    const imageTags = mainHtml.match(/<img\b[^>]*>/gi) ?? [];
    const images = imageTags.map((tag) => {
        const sourceAttribute = getHtmlAttribute(tag, "src");
        const altAttribute = getHtmlAttribute(tag, "alt");

        return {
            tag,
            src: sourceAttribute.value,
            hasSrc:
                sourceAttribute.present &&
                sourceAttribute.value.trim().length > 0,
            alt: altAttribute.value,
            hasAlt:
                altAttribute.present && altAttribute.value.trim().length > 0,
        };
    });

    return {
        hasMain: true,
        images: images.filter((image) => !isKnownChromeImage(image, pageUrl)),
    };
}

function auditPageImages(html, pageUrl) {
    const parsed = parseMainImages(html, pageUrl);
    const missingSources = parsed.images.filter((image) => !image.hasSrc);
    const missingAlts = parsed.images.filter((image) => !image.hasAlt);
    const sourceGroups = new Map();

    for (const image of parsed.images) {
        if (!image.hasSrc) continue;

        const canonicalSource = canonicalizeImageSource(image.src, pageUrl);
        const existing = sourceGroups.get(canonicalSource) ?? [];
        existing.push(image);
        sourceGroups.set(canonicalSource, existing);
    }

    const duplicates = [...sourceGroups.entries()]
        .filter(([, images]) => images.length > 1)
        .map(([src, images]) => ({
            src,
            count: images.length,
            alts: [
                ...new Set(
                    images.map((image) => image.alt.trim()).filter(Boolean),
                ),
            ],
        }));

    return {
        pageUrl,
        hasMain: parsed.hasMain,
        images: parsed.images,
        missingSources,
        missingAlts,
        duplicates,
        uniqueSources: new Set(sourceGroups.keys()),
    };
}

function parseSitemapLocations(xml, sitemapUrl) {
    return [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)]
        .map((match) => decodeHtml(match[1]).trim())
        .filter(Boolean)
        .map((location) => new URL(location, sitemapUrl).href);
}

function normalizeBaseUrl(input) {
    const parsed = new URL(input || DEFAULT_BASE_URL);
    if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error(`Base URL must use http or https: ${input}`);
    }

    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed;
}

function rebaseLocation(location, baseUrl) {
    const source = new URL(location);
    return new URL(`${source.pathname}${source.search}`, baseUrl.origin).href;
}

async function fetchText(url) {
    let response;
    try {
        response = await fetch(url, {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "user-agent": "slb-production-image-audit/1.0",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        throw new Error(`request failed: ${error.message}`);
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return response.text();
}

async function readSitemapPageUrls(baseUrl) {
    const initialSitemapUrl = new URL(
        "sitemap.xml",
        `${baseUrl.href.replace(/\/+$/, "")}/`,
    ).href;
    const pendingSitemaps = [initialSitemapUrl];
    const visitedSitemaps = new Set();
    const pageUrls = [];

    while (pendingSitemaps.length > 0) {
        const sitemapUrl = pendingSitemaps.shift();
        if (visitedSitemaps.has(sitemapUrl)) continue;
        visitedSitemaps.add(sitemapUrl);

        const xml = await fetchText(sitemapUrl);
        const locations = parseSitemapLocations(xml, sitemapUrl);

        if (/<sitemapindex\b/i.test(xml)) {
            pendingSitemaps.push(
                ...locations.map((location) =>
                    rebaseLocation(location, baseUrl),
                ),
            );
        } else {
            pageUrls.push(
                ...locations.map((location) =>
                    rebaseLocation(location, baseUrl),
                ),
            );
        }
    }

    return pageUrls;
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(
                items[currentIndex],
                currentIndex,
            );
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () =>
            worker(),
        ),
    );
    return results;
}

function validateSitemapRoutes(pageUrls, expectedCount = EXPECTED_ROUTE_COUNT) {
    const routeCounts = new Map();

    for (const pageUrl of pageUrls) {
        routeCounts.set(pageUrl, (routeCounts.get(pageUrl) ?? 0) + 1);
    }

    const uniquePageUrls = [...routeCounts.keys()];
    const duplicateRoutes = [...routeCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([pageUrl, count]) => ({ pageUrl, count }));

    return {
        expectedCount,
        entryCount: pageUrls.length,
        uniqueCount: uniquePageUrls.length,
        uniquePageUrls,
        duplicateRoutes,
        failed:
            uniquePageUrls.length !== expectedCount ||
            duplicateRoutes.length > 0,
    };
}

function collectUniqueImageTargets(pageAudits) {
    const targetsBySource = new Map();

    for (const page of pageAudits.filter(Boolean)) {
        for (const image of page.images) {
            if (!image.hasSrc) continue;

            const canonicalSource = canonicalizeImageSource(
                image.src,
                page.pageUrl,
            );
            const fetchUrl = resolveImageFetchUrl(image.src, page.pageUrl);
            if (!canonicalSource || !fetchUrl) continue;

            const existing = targetsBySource.get(canonicalSource);
            if (existing) {
                existing.pageUrls.add(page.pageUrl);
                continue;
            }

            targetsBySource.set(canonicalSource, {
                canonicalSource,
                fetchUrl,
                pageUrls: new Set([page.pageUrl]),
            });
        }
    }

    return [...targetsBySource.values()].map((target) => ({
        ...target,
        pageUrls: [...target.pageUrls],
    }));
}

async function cancelResponseBody(response) {
    if (!response.body || typeof response.body.cancel !== "function") return;

    try {
        await response.body.cancel();
    } catch {
        // Headers are sufficient for this audit. A closed/consumed body is harmless.
    }
}

async function fetchImageMetadata(target, fetchImpl = globalThis.fetch) {
    let response;
    try {
        response = await fetchImpl(target.fetchUrl, {
            method: "GET",
            headers: {
                accept: "image/*,*/*;q=0.1",
                range: "bytes=0-1023",
                "user-agent": "slb-production-image-audit/1.0",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        throw new Error(`request failed: ${error.message}`);
    }

    const contentType = (response.headers.get("content-type") ?? "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
    await cancelResponseBody(response);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    if (!contentType.startsWith("image/")) {
        throw new Error(
            `expected image MIME type, received ${contentType || "none"}`,
        );
    }

    return {
        canonicalSource: target.canonicalSource,
        fetchUrl: target.fetchUrl,
        contentType,
        status: response.status,
    };
}

async function auditUniqueImageTargets(
    targets,
    concurrency = MAX_CONCURRENCY,
    fetchImpl = globalThis.fetch,
) {
    const errors = [];
    const results = await mapWithConcurrency(
        targets,
        concurrency,
        async (target) => {
            try {
                return await fetchImageMetadata(target, fetchImpl);
            } catch (error) {
                errors.push({
                    ...target,
                    message: error.message,
                });
                return null;
            }
        },
    );

    return {
        errors,
        results: results.filter(Boolean),
    };
}

function summarizeCrossPageUsage(pageAudits) {
    const usageBySource = new Map();

    for (const page of pageAudits.filter(Boolean)) {
        for (const image of page.images) {
            if (!image.hasSrc) continue;

            const canonicalSource = canonicalizeImageSource(
                image.src,
                page.pageUrl,
            );
            if (!canonicalSource) continue;

            const existing = usageBySource.get(canonicalSource) ?? {
                canonicalSource,
                placements: 0,
                pageUrls: new Set(),
                alts: new Set(),
            };
            existing.placements += 1;
            existing.pageUrls.add(page.pageUrl);
            if (image.alt.trim()) existing.alts.add(image.alt.trim());
            usageBySource.set(canonicalSource, existing);
        }
    }

    return [...usageBySource.values()]
        .filter((usage) => usage.pageUrls.size > 1)
        .map((usage) => ({
            canonicalSource: usage.canonicalSource,
            placements: usage.placements,
            pageCount: usage.pageUrls.size,
            pageUrls: [...usage.pageUrls],
            alts: [...usage.alts],
        }))
        .sort(
            (left, right) =>
                right.pageCount - left.pageCount ||
                right.placements - left.placements ||
                left.canonicalSource.localeCompare(right.canonicalSource),
        );
}

function compactSourceLabel(source) {
    try {
        const parsed = new URL(source);
        const pathSegments = parsed.pathname.split("/").filter(Boolean);
        const tail = pathSegments.slice(-2).join("/");
        return `${parsed.hostname}/${tail || ""}`.replace(/\/$/, "");
    } catch {
        return source.length > 72 ? `${source.slice(0, 69)}...` : source;
    }
}

function relativePageLabel(pageUrl, baseUrl) {
    const parsed = new URL(pageUrl);
    if (parsed.origin !== baseUrl.origin) return parsed.href;
    return `${parsed.pathname}${parsed.search}` || "/";
}

function printReport(
    baseUrl,
    pageUrls,
    pageAudits,
    fetchErrors,
    {
        sitemapValidation = validateSitemapRoutes(pageUrls),
        imageTargets = [],
        imageAudit = { results: [], errors: [] },
    } = {},
) {
    const successfulAudits = pageAudits.filter(Boolean);
    const placements = successfulAudits.reduce(
        (sum, page) => sum + page.images.length,
        0,
    );
    const uniqueSources = new Set(
        successfulAudits.flatMap((page) => [...page.uniqueSources]),
    );
    const pagesWithDuplicates = successfulAudits.filter(
        (page) => page.duplicates.length > 0,
    );
    const pagesMissingMain = successfulAudits.filter((page) => !page.hasMain);
    const missingAltCount = successfulAudits.reduce(
        (sum, page) => sum + page.missingAlts.length,
        0,
    );
    const missingSourceCount = successfulAudits.reduce(
        (sum, page) => sum + page.missingSources.length,
        0,
    );
    const crossPageUsage = summarizeCrossPageUsage(successfulAudits);

    console.log("SLB production image audit");
    console.log(`Base URL: ${baseUrl.href.replace(/\/$/, "")}`);
    console.log(
        `Sitemap routes: ${sitemapValidation.uniqueCount} unique / ${sitemapValidation.entryCount} entries (expected ${sitemapValidation.expectedCount})`,
    );
    console.log(`Content image placements: ${placements}`);
    console.log(`Unique image URLs: ${uniqueSources.size}`);
    console.log(`Unique image URLs fetched: ${imageTargets.length}`);
    console.log(`Image fetch/MIME errors: ${imageAudit.errors.length}`);
    console.log(`Assets reused across routes: ${crossPageUsage.length}`);
    console.log(`Pages with duplicates: ${pagesWithDuplicates.length}`);
    console.log(`Images with missing/blank alt: ${missingAltCount}`);
    console.log(`Images with missing/blank src: ${missingSourceCount}`);
    console.log(
        `Page fetch/markup errors: ${fetchErrors.length + pagesMissingMain.length}`,
    );

    if (sitemapValidation.failed) {
        console.log("\nSitemap route errors:");
        if (sitemapValidation.uniqueCount !== sitemapValidation.expectedCount) {
            console.log(
                `- expected ${sitemapValidation.expectedCount} unique routes; found ${sitemapValidation.uniqueCount}`,
            );
        }
        for (const duplicate of sitemapValidation.duplicateRoutes) {
            console.log(
                `- ${relativePageLabel(duplicate.pageUrl, baseUrl)} appears ${duplicate.count} times`,
            );
        }
    }

    if (pagesWithDuplicates.length > 0) {
        console.log("\nPer-page duplicate content images:");
        for (const page of pagesWithDuplicates) {
            const details = page.duplicates
                .map((duplicate) => {
                    const label = duplicate.alts[0]
                        ? `"${duplicate.alts[0]}"`
                        : compactSourceLabel(duplicate.src);
                    return `${duplicate.count}x ${label}`;
                })
                .join("; ");
            console.log(
                `- ${relativePageLabel(page.pageUrl, baseUrl)}: ${details}`,
            );
        }
    }

    const pagesWithMissingAlt = successfulAudits.filter(
        (page) => page.missingAlts.length > 0,
    );
    if (pagesWithMissingAlt.length > 0) {
        console.log("\nMissing/blank alt text:");
        for (const page of pagesWithMissingAlt) {
            const sources = page.missingAlts
                .map((image) =>
                    compactSourceLabel(
                        canonicalizeImageSource(image.src, page.pageUrl),
                    ),
                )
                .join(", ");
            console.log(
                `- ${relativePageLabel(page.pageUrl, baseUrl)}: ${sources}`,
            );
        }
    }

    if (missingSourceCount > 0) {
        console.log("\nMissing/blank image sources:");
        for (const page of successfulAudits.filter(
            (item) => item.missingSources.length > 0,
        )) {
            console.log(
                `- ${relativePageLabel(page.pageUrl, baseUrl)}: ${page.missingSources.length} image(s)`,
            );
        }
    }

    if (pagesMissingMain.length > 0 || fetchErrors.length > 0) {
        console.log("\nPage fetch/markup errors:");
        for (const page of pagesMissingMain) {
            console.log(
                `- ${relativePageLabel(page.pageUrl, baseUrl)}: missing <main>`,
            );
        }
        for (const error of fetchErrors) {
            console.log(
                `- ${relativePageLabel(error.pageUrl, baseUrl)}: ${error.message}`,
            );
        }
    }

    if (imageAudit.errors.length > 0) {
        console.log("\nImage fetch/MIME errors:");
        for (const error of imageAudit.errors) {
            const routes = error.pageUrls
                .map((pageUrl) => relativePageLabel(pageUrl, baseUrl))
                .join(", ");
            console.log(
                `- ${compactSourceLabel(error.canonicalSource)} (${routes}): ${error.message}`,
            );
        }
    }

    if (crossPageUsage.length > 0) {
        console.log(
            `\nTop ${Math.min(TOP_REUSED_ASSET_COUNT, crossPageUsage.length)} cross-page image usages (informational):`,
        );
        for (const usage of crossPageUsage.slice(0, TOP_REUSED_ASSET_COUNT)) {
            const label = usage.alts[0]
                ? `"${usage.alts[0]}"`
                : compactSourceLabel(usage.canonicalSource);
            console.log(
                `- ${usage.pageCount} routes / ${usage.placements} placements: ${label} (${compactSourceLabel(usage.canonicalSource)})`,
            );
        }
        console.log(
            "Cross-page reuse is reported only; expected English/es-MX reuse does not fail the audit.",
        );
    }

    const failed =
        sitemapValidation.failed ||
        pagesWithDuplicates.length > 0 ||
        missingAltCount > 0 ||
        missingSourceCount > 0 ||
        pagesMissingMain.length > 0 ||
        fetchErrors.length > 0 ||
        imageAudit.errors.length > 0;

    console.log(
        `\n${failed ? "FAIL" : "PASS"}: content image audit ${failed ? "found violations" : "is clean"}.`,
    );
    return { failed };
}

function readBaseUrlArgument(argv) {
    const explicitFlagIndex = argv.indexOf("--base-url");
    if (explicitFlagIndex >= 0) {
        if (!argv[explicitFlagIndex + 1]) {
            throw new Error("--base-url requires a URL value");
        }
        return argv[explicitFlagIndex + 1];
    }

    const positional = argv.find((argument) => !argument.startsWith("-"));
    return (
        positional || process.env.SLB_IMAGE_AUDIT_BASE_URL || DEFAULT_BASE_URL
    );
}

async function main(argv = process.argv.slice(2)) {
    const baseUrl = normalizeBaseUrl(readBaseUrlArgument(argv));
    const discoveredPageUrls = await readSitemapPageUrls(baseUrl);

    if (discoveredPageUrls.length === 0) {
        throw new Error(
            `No page URLs found in ${new URL("sitemap.xml", baseUrl).href}`,
        );
    }

    const sitemapValidation = validateSitemapRoutes(discoveredPageUrls);
    const pageUrls = sitemapValidation.uniquePageUrls;

    const fetchErrors = [];
    const pageAudits = await mapWithConcurrency(
        pageUrls,
        MAX_CONCURRENCY,
        async (pageUrl) => {
            try {
                const html = await fetchText(pageUrl);
                return auditPageImages(html, pageUrl);
            } catch (error) {
                fetchErrors.push({ pageUrl, message: error.message });
                return null;
            }
        },
    );

    const imageTargets = collectUniqueImageTargets(pageAudits);
    const imageAudit = await auditUniqueImageTargets(imageTargets);
    const report = printReport(baseUrl, pageUrls, pageAudits, fetchErrors, {
        sitemapValidation,
        imageTargets,
        imageAudit,
    });
    process.exitCode = report.failed ? 1 : 0;
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Image audit failed to run: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    DEFAULT_BASE_URL,
    EXPECTED_ROUTE_COUNT,
    auditUniqueImageTargets,
    auditPageImages,
    canonicalizeImageSource,
    collectUniqueImageTargets,
    extractMainHtml,
    fetchImageMetadata,
    getHtmlAttribute,
    isKnownChromeImage,
    parseMainImages,
    parseSitemapLocations,
    printReport,
    readBaseUrlArgument,
    resolveImageFetchUrl,
    summarizeCrossPageUsage,
    validateSitemapRoutes,
};
