import { NextResponse, type NextRequest } from 'next/server';
import { defineProxy, PreviewProxy, AppRouterMultisiteProxy, PersonalizeProxy, RedirectsProxy, LocaleProxy } from '@sitecore-content-sdk/nextjs/proxy';
import sites from '.sitecore/sites.json';
import scConfig from 'sitecore.config';
import { routing } from './i18n/routing';
import client from './lib/sitecore-client';
import { usesFixtureContent } from './lib/allianz-content-mode';

function connectedPipeline() {
  const preview = new PreviewProxy({ client, ...scConfig.api.edge });
  const locale = new LocaleProxy({ sites, locales: routing.locales.slice(), skip: () => false });
  const multisite = new AppRouterMultisiteProxy({ sites, ...scConfig.api.edge, ...scConfig.multisite, skip: () => false });
  const redirects = new RedirectsProxy({ sites, ...scConfig.api.edge, ...scConfig.api.local, ...scConfig.redirects, skip: () => false });
  const personalize = new PersonalizeProxy({
    sites, ...scConfig.api.edge, ...scConfig.personalize,
    skip: (req) => process.env.NEXT_PUBLIC_ALLIANZ_ANALYTICS_ENABLED !== 'true' || req.cookies.get('allianz_demo_consent')?.value !== 'granted',
  });
  return defineProxy(preview, locale, multisite, redirects, personalize);
}

export default function proxy(req: NextRequest) {
  if (usesFixtureContent()) {
    if (req.nextUrl.pathname.startsWith('/allianz-life/en')) return NextResponse.next();
    const target = req.nextUrl.clone();
    target.pathname = `/allianz-life/en${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}`;
    return NextResponse.rewrite(target);
  }
  return connectedPipeline().exec(req);
}

export const config = {
  matcher: ['/', '/((?!api/|\\.well-known/|sitemap|robots|llms|_next/|healthz|sitecore/api/|-/|allianz-assets/|allianz-legacy-assets/|fonts/|favicon.ico|sc_logo.svg|ai/).*)'],
};
