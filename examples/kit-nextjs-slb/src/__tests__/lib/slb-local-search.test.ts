import {
  normalizeSlbSearchText,
  searchSlbFallbackContent,
  slbLocalSearchIndex,
  type SlbSearchLocale,
} from '@/lib/slb-search';

function resultIds(locale: SlbSearchLocale, query: string): string[] {
  return searchSlbFallbackContent({ locale, query, pageSize: 10 }).results.map(
    (result) => result.id.split(':', 1)[0],
  );
}

describe('SLB local search fallback', () => {
  it('builds one complete, localized document for every governed page', () => {
    expect(slbLocalSearchIndex).toHaveLength(46);
    expect(
      new Set(slbLocalSearchIndex.map((document) => document.id)).size,
    ).toBe(46);

    for (const locale of ['en', 'es-MX'] as const) {
      const documents = slbLocalSearchIndex.filter(
        (document) => document.locale === locale,
      );

      expect(documents).toHaveLength(23);
      expect(documents.every((document) => document.title)).toBe(true);
      expect(documents.every((document) => document.description)).toBe(true);
      expect(documents.every((document) => document.searchText)).toBe(true);
      expect(
        documents.every((document) =>
          document.image.src.startsWith(
            'https://thlt-demo.sitecoresandbox.cloud/api/public/content/',
          ),
        ),
      ).toBe(true);
      expect(
        documents.every((document) =>
          locale === 'es-MX'
            ? document.url.startsWith('/es-mx')
            : !document.url.startsWith('/es-mx'),
        ),
      ).toBe(true);
    }
  });

  it('returns no results for blank or stop-word-only queries', () => {
    expect(
      searchSlbFallbackContent({ locale: 'en', query: '   ' }),
    ).toMatchObject({
      total: 0,
      totalPages: 0,
      results: [],
    });
    expect(
      searchSlbFallbackContent({ locale: 'es-MX', query: 'de la y' }),
    ).toMatchObject({ total: 0, results: [] });
  });

  it('ranks the audited English discovery queries credibly', () => {
    const emissions = resultIds('en', 'emissions data').slice(0, 3);
    expect(emissions).toEqual(expect.arrayContaining(['S03', 'P03']));
    expect(resultIds('en', 'carbon capture')[0]).toBe('P04');
    expect(resultIds('en', 'digital operations')[0]).toBe('S02');
    expect(resultIds('en', 'Mexico')[0]).toBe('A04');
    expect(resultIds('en', 'sustainability')[0]).toBe('U01');
  });

  it('ranks the audited Spanish discovery queries credibly', () => {
    const decarbonization = resultIds('es-MX', 'descarbonizacion').slice(0, 3);
    expect(decarbonization).toEqual(expect.arrayContaining(['S03', 'N04']));
    expect(resultIds('es-MX', 'captura de carbono')[0]).toBe('P04');
    expect(resultIds('es-MX', 'tecnologia e innovacion')[0]).toBe('A02');
    expect(resultIds('es-MX', 'comunidades')[0]).toBe('U03');
  });

  it('matches Spanish queries with or without accents', () => {
    expect(normalizeSlbSearchText('Tecnología e innovación')).toBe(
      'tecnologia e innovacion',
    );
    expect(resultIds('es-MX', 'descarbonización')).toEqual(
      resultIds('es-MX', 'descarbonizacion'),
    );
  });

  it('never mixes locales in a result set', () => {
    for (const locale of ['en', 'es-MX'] as const) {
      const response = searchSlbFallbackContent({
        locale,
        query: locale === 'en' ? 'energy' : 'energía',
        pageSize: 50,
      });

      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.every((result) => result.locale === locale)).toBe(
        true,
      );
    }
  });

  it('paginates after ranking without duplicating documents', () => {
    const firstPage = searchSlbFallbackContent({
      locale: 'en',
      query: 'energy',
      page: 1,
      pageSize: 3,
    });
    const secondPage = searchSlbFallbackContent({
      locale: 'en',
      query: 'energy',
      page: 2,
      pageSize: 3,
    });

    expect(firstPage.total).toBeGreaterThan(3);
    expect(firstPage.total).toBe(secondPage.total);
    expect(firstPage.totalPages).toBe(Math.ceil(firstPage.total / 3));
    expect(firstPage.results).toHaveLength(3);
    expect(secondPage.results).toHaveLength(3);
    expect(
      firstPage.results.some((first) =>
        secondPage.results.some((second) => second.id === first.id),
      ),
    ).toBe(false);
  });
});
