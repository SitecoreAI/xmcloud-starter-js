import fs from 'node:fs';
import path from 'node:path';
import {
  buildSieSitemapXml,
  getRequestOrigin,
  SIE_SEARCH_PAGES,
  SIE_SEARCH_ROUTE,
  SIE_SITE_ROUTES,
} from '@/lib/sie-routes';

describe('SiEnergy site routes', () => {
  it('defines the complete approved page set from one metadata source', () => {
    expect(SIE_SITE_ROUTES).toHaveLength(16);
    expect(SIE_SEARCH_PAGES).toHaveLength(16);
    expect(SIE_SITE_ROUTES).toEqual(SIE_SEARCH_PAGES.map((page) => page.path));
    expect(SIE_SITE_ROUTES).toContain('/safety');
    expect(SIE_SITE_ROUTES).toContain('/business-development');
    expect(SIE_SITE_ROUTES).toContain('/search');
    expect(SIE_SITE_ROUTES).toContain('/contact-us');
    expect(SIE_SITE_ROUTES).not.toContain('/Products/Aero');
    expect(SIE_SITE_ROUTES).not.toContain('/Test-Drive');
  });

  it('gives every page usable search metadata', () => {
    for (const page of SIE_SEARCH_PAGES) {
      expect(page.title).not.toHaveLength(0);
      expect(page.description.length).toBeGreaterThan(20);
      expect(page.keywords.length).toBeGreaterThan(0);
    }
  });

  it('builds a stable SiEnergy-only sitemap and optional AI entries', () => {
    const xml = buildSieSitemapXml('https://www.sienergy.com/', {
      includeAiRoutes: true,
      lastModified: '2026-08-05',
    });

    expect(xml.match(/<url>/g)).toHaveLength(19);
    expect(xml).toContain('https://www.sienergy.com/customer-service-portal');
    expect(xml).toContain('https://www.sienergy.com/search');
    expect(xml).toContain('https://www.sienergy.com/contact-us');
    expect(xml).toContain('https://www.sienergy.com/ai/faq.json');
    expect(xml).not.toMatch(/Alaris|Products|Test-Drive/i);
  });

  it('prefers forwarded deployment headers for the public origin', () => {
    const headerValues: Record<string, string> = {
      host: 'internal.example',
      'x-forwarded-host': 'www.sienergy.com',
      'x-forwarded-proto': 'https',
    };
    const request = {
      url: 'http://127.0.0.1:3000/sitemap.xml',
      headers: {
        get: (name: string) => headerValues[name] ?? null,
      },
    } as Request;

    expect(getRequestOrigin(request)).toBe('https://www.sienergy.com');
  });

  it('points both responsive header searches at the live Search page', () => {
    const headerSource = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/global-header/GlobalHeaderNwn.dev.tsx',
      ),
      'utf8',
    );

    expect(SIE_SEARCH_ROUTE).toBe('/search');
    expect(headerSource.match(/action=\{SIE_SEARCH_ROUTE\}/g)).toHaveLength(2);
    expect(headerSource).not.toContain('/search-results');
  });
});
