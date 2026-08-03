import {
  getRequestOrigin,
  rewriteAbsoluteUrlOrigin,
  rewriteSitemapOrigins,
} from '@/lib/sitemap-url';

const makeRequest = (
  url: string,
  headers: Record<string, string> = {},
): Pick<Request, 'headers' | 'url'> => ({
  url,
  headers: {
    get: (name: string) => headers[name.toLowerCase()] || null,
  } as Headers,
});

describe('sitemap URL helpers', () => {
  it('uses the forwarded public host and protocol', () => {
    const request = makeRequest('http://localhost:3000/sitemap.xml', {
      'x-forwarded-host': 'kirkland-sitecoreai-demo.vercel.app',
      'x-forwarded-proto': 'https',
    });

    expect(getRequestOrigin(request)).toBe(
      'https://kirkland-sitecoreai-demo.vercel.app',
    );
  });

  it('preserves paths, encoding, and XML-escaped queries when replacing an origin', () => {
    expect(
      rewriteAbsoluteUrlOrigin(
        'https://internal.sitecorecloud.io/News//and/../Insights/%2FDeal%7E?topic=m%26a&amp;page=2#details',
        'https://kirkland-sitecoreai-demo.vercel.app',
      ),
    ).toBe(
      'https://kirkland-sitecoreai-demo.vercel.app/News//and/../Insights/%2FDeal%7E?topic=m%26a&amp;page=2#details',
    );
  });

  it('rewrites only sitemap locations and alternate-language link origins', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc data-source="sitecore">https://INTERNAL.sitecorecloud.io/Lawyers//Allan-%2FKirk?view=full&amp;lang=en</loc>
    <lastmod>2026-08-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href = 'http://internal.sitecorecloud.io/fr-FR/Lawyers/Allan-Kirk#profile' />
  </url>
</urlset>`;

    expect(
      rewriteSitemapOrigins(
        xml,
        'https://kirkland-sitecoreai-demo.vercel.app/',
      ),
    ).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc data-source="sitecore">https://kirkland-sitecoreai-demo.vercel.app/Lawyers//Allan-%2FKirk?view=full&amp;lang=en</loc>
    <lastmod>2026-08-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="fr-FR" href = 'https://kirkland-sitecoreai-demo.vercel.app/fr-FR/Lawyers/Allan-Kirk#profile' />
  </url>
</urlset>`);
  });

  it('leaves relative and malformed values unchanged', () => {
    expect(
      rewriteAbsoluteUrlOrigin(
        '/Lawyers',
        'https://kirkland-sitecoreai-demo.vercel.app',
      ),
    ).toBe('/Lawyers');
    expect(
      rewriteAbsoluteUrlOrigin(
        'not a URL',
        'https://kirkland-sitecoreai-demo.vercel.app',
      ),
    ).toBe('not a URL');
  });
});
