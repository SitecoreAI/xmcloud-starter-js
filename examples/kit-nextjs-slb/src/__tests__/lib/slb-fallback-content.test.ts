import fs from 'node:fs';
import path from 'node:path';
import catalog from '@/content/slb-fallback-content.json';
import {
  hasPlaceholderPresentation,
  mergeSlbFallbackRouteFields,
  resolveSlbFallbackPage,
  shouldRenderSlbFallback,
} from '@/lib/slb-fallback-content';

function routeToSegments(route: string, locale: string): string[] {
  const prefix = locale === 'es-MX' ? '/es-mx' : '';
  const contentPath = route.startsWith(prefix)
    ? route.slice(prefix.length)
    : route;
  return contentPath.split('/').filter(Boolean);
}

describe('SLB route-aware fallback content', () => {
  it('resolves every English and Spanish route in the approved catalog', () => {
    expect(catalog.pages).toHaveLength(23);

    for (const page of catalog.pages) {
      for (const locale of ['en', 'es-MX'] as const) {
        const resolved = resolveSlbFallbackPage(
          locale,
          routeToSegments(page.routes[locale], locale),
        );

        expect(resolved?.id).toBe(page.id);
        expect(resolved?.fields.hero.heading).toBeTruthy();
      }
    }
  });

  it('supports both Spanish contact route forms without an English fallback', () => {
    expect(resolveSlbFallbackPage('es-MX', ['contactenos'])?.id).toBe('C01');
    expect(resolveSlbFallbackPage('es-MX', ['contact-us'])?.id).toBe('C01');
    expect(resolveSlbFallbackPage('fr-FR', ['contact-us'])).toBeUndefined();
  });

  it('accepts shared English item paths for Spanish language versions', () => {
    const sharedRoutePage = resolveSlbFallbackPage('es-MX', [
      'solutions',
      'industrial-decarbonization',
    ]);

    expect(sharedRoutePage?.id).toBe('S03');
    expect(sharedRoutePage?.route).toBe(
      '/es-mx/solutions/industrial-decarbonization',
    );
    expect(
      resolveSlbFallbackPage('es-MX', ['about-us', 'global-presence'])?.id,
    ).toBe('A04');

    const solutionsPage = resolveSlbFallbackPage('es-MX', ['solutions']);
    expect(solutionsPage?.route).toBe('/es-mx/solutions');
    expect(solutionsPage?.fields.hero.secondaryCta?.target).toBe(
      '/es-mx/contact-us',
    );
    expect(solutionsPage?.relatedPages[0]?.route).toMatch(
      /^\/es-mx\/(?!soluciones)/,
    );
  });

  it('does not resolve unknown routes', () => {
    expect(resolveSlbFallbackPage('en', ['not-a-real-route'])).toBeUndefined();
  });

  it('treats any main rendering as Sitecore-owned presentation', () => {
    expect(
      hasPlaceholderPresentation(
        { placeholders: { 'headless-main': [{ componentName: 'Hero' }] } },
        'headless-main',
      ),
    ).toBe(true);
    expect(
      hasPlaceholderPresentation(
        { placeholders: { 'headless-main': [] } },
        'headless-main',
      ),
    ).toBe(false);
  });

  it('supports a noninteractive editing preview but never Design Library', () => {
    const fallbackPage = resolveSlbFallbackPage('en', ['solutions']);
    const route = { placeholders: { 'headless-main': [] } };

    expect(
      shouldRenderSlbFallback({
        route,
        fallbackPage,
        isDesignLibrary: false,
      }),
    ).toBe(true);
    expect(
      shouldRenderSlbFallback({ route, fallbackPage, isDesignLibrary: true }),
    ).toBe(false);
  });

  it('merges Sitecore semantic fields over the route model', () => {
    const page = resolveSlbFallbackPage('en', ['solutions']);
    const merged = mergeSlbFallbackRouteFields(page, {
      pageTitle: { value: 'Connected energy solutions' },
      pageHeaderTitle: { value: 'Solve with confidence' },
      pageSubtitle: { value: 'A route summary authored in Sitecore.' },
      navigationTitle: { value: 'Our solutions' },
    });

    expect(merged?.fields.pageTitle).toBe('Connected energy solutions');
    expect(merged?.fields.hero.heading).toBe('Solve with confidence');
    expect(merged?.fields.hero.summary).toBe(
      'A route summary authored in Sitecore.',
    );
    expect(merged?.fields.navigationTitle).toBe('Our solutions');
  });

  it('references local assets and contains no authoring-only copy', () => {
    const serialized = JSON.stringify(catalog);
    expect(serialized).not.toMatch(/\bdemo\b/i);
    expect(serialized).not.toMatch(
      /revalidate at implementation|dynamic rail|provide governed links|newsletter cta|media cta/i,
    );

    for (const page of catalog.pages) {
      for (const locale of ['en', 'es-MX'] as const) {
        const fields = page.fields[locale];
        const filenames = [
          fields.hero.image?.filename,
          ...fields.supportingImages.map((image) => image.filename),
          fields.seo.openGraphImageFilename,
        ].filter(Boolean);

        for (const filename of filenames) {
          expect(
            fs.existsSync(
              path.join(
                process.cwd(),
                'public',
                'images',
                'slb',
                filename as string,
              ),
            ),
          ).toBe(true);
        }
      }
    }
  });
});
