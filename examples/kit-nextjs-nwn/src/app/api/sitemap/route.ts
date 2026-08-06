import type { NextRequest } from 'next/server';
import { buildNwnSitemapXml, getRequestOrigin } from '@/lib/nwn-routes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  return new Response(buildNwnSitemapXml(getRequestOrigin(request)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}
