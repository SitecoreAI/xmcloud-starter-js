import {
  buildNwnSitemapXml,
  getRequestOrigin,
  NWN_DEMO_ROUTES,
} from '@/lib/nwn-routes';

describe('NWN demo routes', () => {
  it('defines exactly the 18 approved demo pages', () => {
    expect(NWN_DEMO_ROUTES).toHaveLength(18);
    expect(NWN_DEMO_ROUTES).toContain('/safety/smell-natural-gas');
    expect(NWN_DEMO_ROUTES).not.toContain('/Products/Aero');
    expect(NWN_DEMO_ROUTES).not.toContain('/Test-Drive');
  });

  it('builds a stable NWN-only sitemap and optional AI entries', () => {
    const xml = buildNwnSitemapXml('https://demo.example/', {
      includeAiRoutes: true,
      lastModified: '2026-08-05',
    });

    expect(xml.match(/<url>/g)).toHaveLength(21);
    expect(xml).toContain('https://demo.example/account-billing');
    expect(xml).toContain('https://demo.example/ai/faq.json');
    expect(xml).not.toMatch(/Alaris|Products|Test-Drive/i);
  });

  it('prefers forwarded deployment headers for the public origin', () => {
    const headerValues: Record<string, string> = {
      host: 'internal.example',
      'x-forwarded-host': 'nwn-demo.example.com',
      'x-forwarded-proto': 'https',
    };
    const request = {
      url: 'http://127.0.0.1:3000/sitemap.xml',
      headers: {
        get: (name: string) => headerValues[name] ?? null,
      },
    } as Request;

    expect(getRequestOrigin(request)).toBe('https://nwn-demo.example.com');
  });
});
