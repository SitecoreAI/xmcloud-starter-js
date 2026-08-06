import {
  buildNwnSitemapXml,
  getRequestOrigin,
  NWN_SEARCH_PAGES,
  NWN_SITE_ROUTES,
} from '@/lib/nwn-routes';

describe('NWN site routes', () => {
  it('defines the complete approved page set from one metadata source', () => {
    expect(NWN_SITE_ROUTES).toHaveLength(20);
    expect(NWN_SEARCH_PAGES).toHaveLength(20);
    expect(NWN_SITE_ROUTES).toEqual(NWN_SEARCH_PAGES.map((page) => page.path));
    expect(NWN_SITE_ROUTES).toContain('/safety/smell-natural-gas');
    expect(NWN_SITE_ROUTES).toContain('/search');
    expect(NWN_SITE_ROUTES).toContain('/contact-us');
    expect(NWN_SITE_ROUTES).not.toContain('/Products/Aero');
    expect(NWN_SITE_ROUTES).not.toContain('/Test-Drive');
  });

  it('gives every page usable search metadata', () => {
    for (const page of NWN_SEARCH_PAGES) {
      expect(page.title).not.toHaveLength(0);
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.keywords.length).toBeGreaterThan(0);
    }
  });

  it('builds a stable NWN-only sitemap and optional AI entries', () => {
    const xml = buildNwnSitemapXml('https://www.nwnatural.com/', {
      includeAiRoutes: true,
      lastModified: '2026-08-05',
    });

    expect(xml.match(/<url>/g)).toHaveLength(23);
    expect(xml).toContain('https://www.nwnatural.com/account-billing');
    expect(xml).toContain('https://www.nwnatural.com/search');
    expect(xml).toContain('https://www.nwnatural.com/contact-us');
    expect(xml).toContain('https://www.nwnatural.com/ai/faq.json');
    expect(xml).not.toMatch(/Alaris|Products|Test-Drive/i);
  });

  it('prefers forwarded deployment headers for the public origin', () => {
    const headerValues: Record<string, string> = {
      host: 'internal.example',
      'x-forwarded-host': 'www.nwnatural.com',
      'x-forwarded-proto': 'https',
    };
    const request = {
      url: 'http://127.0.0.1:3000/sitemap.xml',
      headers: {
        get: (name: string) => headerValues[name] ?? null,
      },
    } as Request;

    expect(getRequestOrigin(request)).toBe('https://www.nwnatural.com');
  });
});
