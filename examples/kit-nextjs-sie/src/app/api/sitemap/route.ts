import type { NextRequest } from 'next/server';
import { buildSieSitemapXml, getRequestOrigin } from '@/lib/sie-routes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  return new Response(buildSieSitemapXml(getRequestOrigin(request)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
