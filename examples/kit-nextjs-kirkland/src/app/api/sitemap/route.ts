import { createSitemapRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import type { NextRequest } from 'next/server';
import sites from '.sitecore/sites.json';
import client from 'lib/sitecore-client';
import { getRequestOrigin, rewriteSitemapOrigins } from '@/lib/sitemap-url';

export const dynamic = 'force-dynamic';

/**
 * API route for serving sitemap.xml
 */

const sitecoreSitemapHandler = createSitemapRouteHandler({
  client,
  sites,
});

export async function GET(request: NextRequest): Promise<Response> {
  const response = await sitecoreSitemapHandler.GET(request);

  if (!response.ok) return response;

  const xml = await response.text();
  const publicXml = rewriteSitemapOrigins(xml, getRequestOrigin(request));
  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(publicXml, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
