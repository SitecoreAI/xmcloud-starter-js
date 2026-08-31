import {
  containsAuthoringOnlyCopy,
  generateSlbFallbackMarkdown,
  getSlbFallbackSitemapEntries,
  hasSitemapEntries,
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
