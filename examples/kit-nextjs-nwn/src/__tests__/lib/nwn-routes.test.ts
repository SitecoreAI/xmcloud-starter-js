import {
  buildNwnSitemapXml,
  getRequestOrigin,
  NWN_SITE_ROUTES,
} from '@/lib/nwn-routes';

describe('NWN site routes', () => {
  it('defines exactly the 18 approved site pages', () => {
    expect(NWN_SITE_ROUTES).toHaveLength(18);
    expect(NWN_SITE_ROUTES).toContain('/safety/smell-natural-gas');
    expect(NWN_SITE_ROUTES).not.toContain('/Products/Aero');
    expect(NWN_SITE_ROUTES).not.toContain('/Test-Drive');
  });

  it('builds a stable NWN-only sitemap and optional AI entries', () => {
    const xml = buildNwnSitemapXml('https://www.nwnatural.com/', {
      includeAiRoutes: true,
      lastModified: '2026-08-05',
    });

    expect(xml.match(/<url>/g)).toHaveLength(21);
    expect(xml).toContain('https://www.nwnatural.com/account-billing');
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
