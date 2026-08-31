import fs from 'node:fs';
import path from 'node:path';
import catalog from '@/content/slb-fallback-content.json';
import {
  getSlbLanguageRoutes,
  hasPlaceholderPresentation,
  mergeSlbFallbackRouteFields,
  resolveSlbFallbackPage,
  shouldRenderSlbFallback,
} from '@/lib/slb-fallback-content';
import {
  hasLegacySolterraRouteContent,
  hasLegacySolterraSignature,
} from '@/lib/slb-content-safety';
import { slbDamAssets, slbDamAssetUrls } from '@/lib/slb-dam-assets';

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
    expect(sharedRoutePage?.canonicalRoute).toBe(
      '/es-mx/soluciones/descarbonizacion-industrial',
    );
    expect(getSlbLanguageRoutes(sharedRoutePage!)).toEqual({
      en: '/solutions/industrial-decarbonization',
      'es-MX': '/es-mx/soluciones/descarbonizacion-industrial',
      'x-default': '/solutions/industrial-decarbonization',
    });
    expect(
      resolveSlbFallbackPage('es-MX', ['about-us', 'global-presence'])?.id,
    ).toBe('A04');

    const solutionsPage = resolveSlbFallbackPage('es-MX', ['solutions']);
    expect(solutionsPage?.route).toBe('/es-mx/solutions');
    expect(solutionsPage?.canonicalRoute).toBe('/es-mx/soluciones');
    expect(solutionsPage?.fields.hero.secondaryCta?.target).toBe(
      '/es-mx/contact-us',
    );
    expect(solutionsPage?.relatedPages[0]?.route).toMatch(
      /^\/es-mx\/(?!soluciones)/,
    );
  });

  it('keeps canonical Spanish links on the localized home page', () => {
    const homePage = resolveSlbFallbackPage('es-MX', []);

    expect(homePage?.canonicalRoute).toBe('/es-mx');
    expect(homePage?.fields.hero.primaryCta?.target).toBe('/es-mx/soluciones');
    expect(homePage?.fields.hero.secondaryCta?.target).toBe(
      '/es-mx/quienes-somos',
    );
    expect(homePage?.relatedPages[0]?.route).toBe(
      '/es-mx/productos-y-servicios/subsuelo-y-construccion-de-pozos',
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

  it('forces curated fallback content over inherited Solterra main presentation', () => {
    const fallbackPage = resolveSlbFallbackPage('en', ['solutions']);
    const inheritedRoute = {
      fields: {
        metadataTitle: { value: 'SOLTERRA | Sustainable living' },
      },
      placeholders: {
        'headless-main': [
          {
            componentName: 'Hero',
            fields: { heading: { value: 'Welcome to SoLtErRa & Co.' } },
          },
        ],
      },
    };

    expect(hasLegacySolterraSignature(inheritedRoute)).toBe(true);
    expect(hasLegacySolterraRouteContent(inheritedRoute)).toBe(true);
    expect(
      shouldRenderSlbFallback({
        route: inheritedRoute,
        fallbackPage,
        isDesignLibrary: false,
      }),
    ).toBe(true);
  });

  it('keeps genuinely SLB-authored main presentation Sitecore-first', () => {
    const fallbackPage = resolveSlbFallbackPage('en', ['solutions']);
    const authoredRoute = {
      fields: { metadataTitle: { value: 'SLB | Energy innovation' } },
      placeholders: {
        'headless-main': [
          {
            componentName: 'Hero',
            fields: { heading: { value: 'Solve with confidence' } },
          },
        ],
      },
    };

    expect(
      shouldRenderSlbFallback({
        route: authoredRoute,
        fallbackPage,
        isDesignLibrary: false,
      }),
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

  it('rejects inherited Solterra semantic fields and metadata case-insensitively', () => {
    const page = resolveSlbFallbackPage('en', ['solutions']);
    const merged = mergeSlbFallbackRouteFields(page, {
      pageTitle: { value: 'SoLtErRa solutions' },
      pageHeaderTitle: { value: 'Explore SOLTERRA' },
      metadataTitle: { value: 'Solterra | Solutions' },
      metadataDescription: {
        value: 'Discover the Essential Beauty portfolio.',
      },
    });

    expect(merged).toEqual(page);
    expect(merged?.fields.seo.title).not.toMatch(/solterra/i);
    expect(merged?.fields.seo.description).not.toMatch(/essential beauty/i);
  });

  it('references complete DAM descriptors, retains runtime local fallbacks, and contains no authoring-only copy', () => {
    const serialized = JSON.stringify(catalog);
    const assetManifest = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public', 'images', 'slb', 'manifest.json'),
        'utf8',
      ),
    ) as {
      assets: Array<{
        filename: string;
        dimensions: { width?: number; height?: number };
      }>;
    };
    expect(Object.keys(slbDamAssetUrls).sort()).toEqual(
      assetManifest.assets.map((asset) => asset.filename).sort(),
    );
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
          const assetFilename = filename as string;
          const descriptor = slbDamAssets[assetFilename];
          const manifestAsset = assetManifest.assets.find(
            (asset) => asset.filename === assetFilename,
          );
          expect(descriptor).toEqual(
            expect.objectContaining({
              publicUrl: expect.stringMatching(
                /^https:\/\/thlt-demo\.sitecoresandbox\.cloud\/api\/public\/content\//,
              ),
              damId: expect.any(Number),
              contentType: 'Image',
              width: manifestAsset?.dimensions.width,
              height: manifestAsset?.dimensions.height,
            }),
          );
          expect(Number.isSafeInteger(descriptor?.damId)).toBe(true);
          expect(slbDamAssetUrls[assetFilename]).toBe(descriptor?.publicUrl);
          expect(
            fs.existsSync(
              path.join(
                process.cwd(),
                'public',
                'images',
                'slb',
                assetFilename,
              ),
            ),
          ).toBe(true);
        }
      }
    }
  });
});
