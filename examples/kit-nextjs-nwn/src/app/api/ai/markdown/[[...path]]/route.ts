import { NextRequest, NextResponse } from 'next/server';
import client from 'lib/sitecore-client';
import { generateMarkdownFromRoute } from 'src/lib/ai-markdown';
import { NWN_SITE_NAME } from '@/lib/site-path';
import { isLegacyStarterRoute } from '@/lib/nwn-route-guard';
import { sanitizeLegacyStarterData } from '@/lib/nwn-content-sanitizer';
import { getLocaleOption, isSupportedLocale } from '@/i18n/locales';

export const dynamic = 'force-dynamic';

const CACHE_MAX_AGE = 300;
const DEFAULT_LOCALE = getLocaleOption(
  process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
).code;

function isAiMarkdownEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_AIMARKDOWN !== 'false';
}

function resolveSiteAndLocale(
  request: NextRequest,
):
  | { ok: true; site: typeof NWN_SITE_NAME; locale: string }
  | { ok: false; message: string } {
  const requestedSite = request.nextUrl.searchParams.get('site');
  const requestedLocale =
    request.nextUrl.searchParams.get('locale') || DEFAULT_LOCALE;

  if (requestedSite && requestedSite !== NWN_SITE_NAME) {
    return { ok: false, message: 'Unsupported site' };
  }

  if (!isSupportedLocale(requestedLocale)) {
    return { ok: false, message: 'Unsupported locale' };
  }

  return {
    ok: true,
    site: NWN_SITE_NAME,
    locale: getLocaleOption(requestedLocale).code,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  try {
    if (!isAiMarkdownEnabled()) {
      return new NextResponse('AI markdown is disabled', { status: 404 });
    }

    const scope = resolveSiteAndLocale(request);
    if (!scope.ok) {
      return new NextResponse(scope.message, { status: 400 });
    }

    const { path = [] } = await context.params;
    if (isLegacyStarterRoute(path)) {
      return new NextResponse('Page not found', { status: 404 });
    }

    const page = await client.getPage(path, {
      site: scope.site,
      locale: scope.locale,
    });
    if (!page || !page.layout?.sitecore?.route) {
      return new NextResponse('Page not found', { status: 404 });
    }

    const safePage = sanitizeLegacyStarterData(page);
    const markdown = generateMarkdownFromRoute(safePage.layout.sitecore.route);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=600`,
      },
    });
  } catch (error) {
    console.error('Error generating AI markdown:', error);
    return new NextResponse('Error generating markdown', { status: 500 });
  }
}
