import { createSitemapRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import type { NextRequest } from 'next/server';
import sites from '.sitecore/sites.json';
import client from '@/lib/sitecore-client';
import {
  getSlbFallbackSitemapEntries,
  getSlbRequestOrigin,
  hasSitemapEntries,
  serializeSitemap,
} from '@/lib/slb-geo-fallback';

export const dynamic = 'force-dynamic';

/**
 * API route for generating sitemap.xml
 *
 * This Next.js API route handler dynamically generates and serves the sitemap XML for your site.
 * The sitemap configuration can be managed within XM Cloud.
 */

const { GET: getSitecoreSitemap } = createSitemapRouteHandler({
  client,
  sites,
});

function fallbackSitemap(request: NextRequest): Response {
  const xml = serializeSitemap(
    getSlbFallbackSitemapEntries(getSlbRequestOrigin(request)),
  );

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}

/**
 * Prefer the Sitecore-managed sitemap. If the sitemap is missing or has no
 * entries, serve the governed bilingual SLB route catalog instead.
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const response = await getSitecoreSitemap(request);

    if (response.ok) {
      const xml = await response.clone().text();
      if (hasSitemapEntries(xml)) return response;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & { digest?: string }).digest ===
        'NEXT_PRERENDER_INTERRUPTED'
    ) {
      throw error;
    }
  }

  return fallbackSitemap(request);
}
