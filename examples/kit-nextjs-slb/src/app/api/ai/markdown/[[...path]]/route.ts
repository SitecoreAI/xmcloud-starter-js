import { NextRequest, NextResponse } from 'next/server';
import client from '@/lib/sitecore-client';
import { generateMarkdownFromRoute } from '@/lib/ai-markdown';
import {
  containsAuthoringOnlyCopy,
  generateSlbFallbackMarkdown,
  resolveSlbMarkdownPage,
} from '@/lib/slb-geo-fallback';
import { getPageWithFallbackAlias } from '@/lib/slb-page-resolution';

export const dynamic = 'force-dynamic';

const CACHE_MAX_AGE = 300;

function isAiMarkdownEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_AIMARKDOWN !== 'false';
}

function ensureSiteAndLocale(
  request: NextRequest,
  pathSegments: readonly string[],
): { site: string; locale: string; path: string[] } {
  const site =
    request.nextUrl.searchParams.get('site') ||
    process.env.NEXT_PUBLIC_DEFAULT_SITE_NAME ||
    'slb';
  const requestedLocale =
    request.nextUrl.searchParams.get('locale') ||
    process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ||
    'en';
  const path = [...pathSegments];
  const hasSpanishPrefix = path[0]?.toLowerCase() === 'es-mx';
  const locale = hasSpanishPrefix ? 'es-MX' : requestedLocale;

  if (hasSpanishPrefix) path.shift();

  return { site, locale, path };
}

function markdownResponse(markdown: string): NextResponse {
  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=600`,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  try {
    if (!isAiMarkdownEnabled()) {
      return new NextResponse('AI markdown is disabled', { status: 404 });
    }

    const { path: pathSegments } = await params;
    const { site, locale, path } = ensureSiteAndLocale(
      request,
      pathSegments ?? [],
    );
    const fallbackPage = resolveSlbMarkdownPage(locale, path);

    try {
      const page = await getPageWithFallbackAlias({
        getPage: (pagePath, options) => client.getPage(pagePath, options),
        path,
        site,
        locale,
        fallbackPage,
      });

      if (page?.layout?.sitecore?.route) {
        const route = page.layout.sitecore.route;
        const markdown = generateMarkdownFromRoute(route);
        if (
          !markdown.includes('No content available for AI Markdown') &&
          !containsAuthoringOnlyCopy(markdown)
        ) {
          return markdownResponse(markdown);
        }
      }
    } catch {
      // Experience Edge can be temporarily unavailable during authoring or
      // editing-host deployments. The public fallback below remains usable.
    }

    if (!fallbackPage) {
      return new NextResponse('Page not found', { status: 404 });
    }

    return markdownResponse(generateSlbFallbackMarkdown(fallbackPage));
  } catch (error) {
    console.error('Error generating AI markdown:', error);
    return new NextResponse('Error generating markdown', { status: 500 });
  }
}
