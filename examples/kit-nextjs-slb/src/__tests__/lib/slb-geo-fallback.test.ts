import {
  containsAuthoringOnlyCopy,
  generateSlbFallbackMarkdown,
  getSlbFallbackSitemapEntries,
  hasSitemapEntries,
  rebaseSitemapOrigin,
  resolveSlbMarkdownPage,
  serializeSitemap,
} from '@/lib/slb-geo-fallback';

describe('SLB GEO fallbacks', () => {
  it('builds a bilingual sitemap from every governed page route', () => {
    const entries = getSlbFallbackSitemapEntries('https://www.slb.com');
    const xml = serializeSitemap(entries);

    expect(entries).toHaveLength(46);
    expect(entries.map((entry) => entry.loc)).toEqual(
      expect.arrayContaining([
        'https://www.slb.com/',
        'https://www.slb.com/solutions',
        'https://www.slb.com/es-mx',
        'https://www.slb.com/es-mx/soluciones',
      ]),
    );
    expect(hasSitemapEntries(xml)).toBe(true);
    expect(hasSitemapEntries('<urlset></urlset>')).toBe(false);
    expect(
      containsAuthoringOnlyCopy('## PartialDesignDynamicPlaceholder'),
    ).toBe(true);
  });

  it('rebases Sitecore sitemap loc and hreflang URLs to the public host', () => {
    const authoringHost =
      'https://xmc-sitecoresaae681-thltkirklan3127-kirklandaut0200.sitecorecloud.io';
    const xml = `<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml">
      <url>
        <loc>${authoringHost}/solutions/digital-operations</loc>
        <xhtml:link rel="alternate" hreflang="en" href="${authoringHost}/en/solutions/digital-operations" />
        <xhtml:link rel="alternate" hreflang="es-MX" href="${authoringHost}/es-MX/solutions/digital-operations" />
      </url>
    </urlset>`;

    const rebased = rebaseSitemapOrigin(
      xml,
      'https://slb-sitecoreai-demo.vercel.app/request-path',
    );

    expect(rebased).not.toContain('sitecorecloud.io');
    expect(rebased).toContain(
      '<loc>https://slb-sitecoreai-demo.vercel.app/solutions/digital-operations</loc>',
    );
    expect(rebased).toContain(
      'href="https://slb-sitecoreai-demo.vercel.app/es-MX/solutions/digital-operations"',
    );
  });

  it('generates public English and es-MX markdown without authoring copy', () => {
    const englishPage = resolveSlbMarkdownPage('en', [
      'news-and-insights',
      'insights',
      'ai-starts-with-trusted-context',
    ]);
    const spanishPage = resolveSlbMarkdownPage('es-MX', [
      'noticias-y-analisis',
      'analisis',
      'disenar-la-descarbonizacion-para-la-ejecucion',
    ]);

    expect(englishPage).toBeDefined();
    expect(spanishPage).toBeDefined();

    const markdown = [
      generateSlbFallbackMarkdown(englishPage!),
      generateSlbFallbackMarkdown(spanishPage!),
    ].join('\n');

    expect(markdown).toContain('AI in energy starts with trusted context');
    expect(markdown).toContain('Diseñar la descarbonización para la ejecución');
    expect(markdown).not.toMatch(
      /authoring|datasource|placeholder|click to edit|no reescriba/i,
    );
  });
});
