/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-require-imports */

const {
  auditUniqueImageTargets,
  auditPageImages,
  canonicalizeImageSource,
  collectUniqueImageTargets,
  parseMainImages,
  parseSitemapLocations,
  printReport,
  readBaseUrlArgument,
  summarizeCrossPageUsage,
  validateSitemapRoutes,
} = require('../../../scripts/audit-production-images.cjs');

describe('production image audit', () => {
  const pageUrl = 'https://example.com/es-mx/sostenibilidad';

  test('parses only content images inside main and ignores the SLB logo', () => {
    const html = `
      <header><img src="/images/navigation.jpg" alt="Navigation art"></header>
      <main id="content">
        <img src="/images/water.jpg?v=1&amp;crop=wide" alt="Agua &amp; operaciones">
        <img src="/images/slb-logo.svg" alt="SLB">
      </main>
      <footer><img src="/images/footer.jpg" alt="Footer art"></footer>
    `;

    const result = parseMainImages(html, pageUrl);

    expect(result.hasMain).toBe(true);
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({
      src: '/images/water.jpg?v=1&crop=wide',
      alt: 'Agua & operaciones',
      hasSrc: true,
      hasAlt: true,
    });
  });

  test('detects duplicate underlying assets and missing alt text', () => {
    const source = encodeURIComponent(
      'https://dam.example.com/api/public/content/asset-1?v=one',
    );
    const sourceRevision = encodeURIComponent(
      'https://dam.example.com/api/public/content/asset-1?v=two',
    );
    const html = `
      <main>
        <img src="/_next/image?url=${source}&amp;w=640&amp;q=75" alt="Field team">
        <img src="/_next/image?url=${sourceRevision}&amp;w=1200&amp;q=80" alt="Field team">
        <img src="/images/circularity.jpg" alt="   ">
      </main>
    `;

    const result = auditPageImages(html, pageUrl);

    expect(result.images).toHaveLength(3);
    expect(result.duplicates).toEqual([
      {
        src: 'https://dam.example.com/api/public/content/asset-1',
        count: 2,
        alts: ['Field team'],
      },
    ]);
    expect(result.missingAlts).toHaveLength(1);
  });

  test('canonicalizes responsive Next.js renditions to their underlying asset', () => {
    const source = encodeURIComponent(
      '/images/biodiversity.jpg?campaign=nature',
    );
    expect(
      canonicalizeImageSource(`/_next/image?url=${source}&w=828&q=75`, pageUrl),
    ).toBe('https://example.com/images/biodiversity.jpg?campaign=nature');
  });

  test('parses entity-encoded sitemap locations', () => {
    const xml = `
      <urlset>
        <url><loc>https://example.com/?region=mx&amp;lang=es</loc></url>
        <url><loc>/solutions</loc></url>
      </urlset>
    `;

    expect(
      parseSitemapLocations(xml, 'https://example.com/sitemap.xml'),
    ).toEqual([
      'https://example.com/?region=mx&lang=es',
      'https://example.com/solutions',
    ]);
  });

  test('accepts a positional base URL or an explicit flag', () => {
    expect(readBaseUrlArgument(['https://preview.example.com'])).toBe(
      'https://preview.example.com',
    );
    expect(
      readBaseUrlArgument(['--base-url', 'https://local.example.com']),
    ).toBe('https://local.example.com');
  });

  test('requires exactly 46 unique sitemap routes and rejects duplicates', () => {
    const routes = Array.from(
      { length: 46 },
      (_, index) => `https://example.com/route-${index + 1}`,
    );

    expect(validateSitemapRoutes(routes)).toMatchObject({
      expectedCount: 46,
      entryCount: 46,
      uniqueCount: 46,
      duplicateRoutes: [],
      failed: false,
    });

    const invalid = validateSitemapRoutes([...routes.slice(0, 45), routes[0]]);
    expect(invalid).toMatchObject({
      entryCount: 46,
      uniqueCount: 45,
      duplicateRoutes: [{ pageUrl: routes[0], count: 2 }],
      failed: true,
    });
  });

  test('collects one fetch target per canonical asset while preserving a working Next URL', () => {
    const sourceOne = encodeURIComponent(
      'https://dam.example.com/api/public/content/asset-1?v=one',
    );
    const sourceTwo = encodeURIComponent(
      'https://dam.example.com/api/public/content/asset-1?v=two',
    );
    const firstPage = auditPageImages(
      `<main><img src="/_next/image?url=${sourceOne}&amp;w=640&amp;q=75" alt="Field team"></main>`,
      'https://example.com/solutions',
    );
    const secondPage = auditPageImages(
      `<main><img src="/_next/image?url=${sourceTwo}&amp;w=1200&amp;q=80" alt="Equipo de campo"></main>`,
      'https://example.com/es-mx/soluciones',
    );

    expect(collectUniqueImageTargets([firstPage, secondPage])).toEqual([
      {
        canonicalSource: 'https://dam.example.com/api/public/content/asset-1',
        fetchUrl: `https://example.com/_next/image?url=${sourceOne}&w=640&q=75`,
        pageUrls: [
          'https://example.com/solutions',
          'https://example.com/es-mx/soluciones',
        ],
      },
    ]);
  });

  test('fetches unique images concurrently and fails non-2xx or non-image responses', async () => {
    const targets = [
      {
        canonicalSource: 'https://cdn.example.com/good.jpg',
        fetchUrl: 'https://cdn.example.com/good.jpg',
        pageUrls: ['https://example.com/one'],
      },
      {
        canonicalSource: 'https://cdn.example.com/missing.jpg',
        fetchUrl: 'https://cdn.example.com/missing.jpg',
        pageUrls: ['https://example.com/two'],
      },
      {
        canonicalSource: 'https://cdn.example.com/not-an-image',
        fetchUrl: 'https://cdn.example.com/not-an-image',
        pageUrls: ['https://example.com/three'],
      },
    ];
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fetchImpl = jest.fn(async (url, options) => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeRequests -= 1;

      const missing = url.endsWith('/missing.jpg');
      const wrongMime = url.endsWith('/not-an-image');
      return {
        ok: !missing,
        status: missing ? 404 : 200,
        statusText: missing ? 'Not Found' : 'OK',
        headers: {
          get: (name) =>
            name === 'content-type'
              ? wrongMime
                ? 'text/html; charset=utf-8'
                : 'image/jpeg'
              : null,
        },
        body: null,
        requestOptions: options,
      };
    });

    const result = await auditUniqueImageTargets(targets, 2, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(maximumActiveRequests).toBe(2);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({ range: 'bytes=0-1023' }),
    });
    expect(result.results).toEqual([
      expect.objectContaining({
        canonicalSource: 'https://cdn.example.com/good.jpg',
        contentType: 'image/jpeg',
        status: 200,
      }),
    ]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalSource: 'https://cdn.example.com/missing.jpg',
          message: 'HTTP 404 Not Found',
        }),
        expect.objectContaining({
          canonicalSource: 'https://cdn.example.com/not-an-image',
          message: 'expected image MIME type, received text/html',
        }),
      ]),
    );
  });

  test('reports cross-page locale reuse without treating it as a page duplicate', () => {
    const englishPage = auditPageImages(
      '<main><img src="/images/water.jpg" alt="Water stewardship"></main>',
      'https://example.com/sustainability',
    );
    const spanishPage = auditPageImages(
      '<main><img src="/images/water.jpg" alt="Gestión del agua"></main>',
      'https://example.com/es-mx/sostenibilidad',
    );

    expect(englishPage.duplicates).toEqual([]);
    expect(spanishPage.duplicates).toEqual([]);
    expect(summarizeCrossPageUsage([englishPage, spanishPage])).toEqual([
      {
        canonicalSource: 'https://example.com/images/water.jpg',
        placements: 2,
        pageCount: 2,
        pageUrls: [
          'https://example.com/sustainability',
          'https://example.com/es-mx/sostenibilidad',
        ],
        alts: ['Water stewardship', 'Gestión del agua'],
      },
    ]);

    const pageUrls = [englishPage.pageUrl, spanishPage.pageUrl];
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const report = printReport(
        new URL('https://example.com'),
        pageUrls,
        [englishPage, spanishPage],
        [],
        {
          sitemapValidation: validateSitemapRoutes(pageUrls, 2),
          imageTargets: collectUniqueImageTargets([englishPage, spanishPage]),
          imageAudit: { results: [], errors: [] },
        },
      );

      expect(report.failed).toBe(false);
      expect(consoleSpy.mock.calls.flat().join('\n')).toContain(
        'expected English/es-MX reuse does not fail the audit',
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
