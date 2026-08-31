import type { NextRequest } from 'next/server';
import catalogJson from '@/content/slb-fallback-content.json';
import {
  resolveSlbFallbackPage,
  type SlbFallbackPageModel,
  type SlbLocale,
} from '@/lib/slb-fallback-content';
import { getBaseUrl } from '@/lib/utils';

interface SlbFallbackCatalog {
  pages: Array<{
    routes: Record<SlbLocale, string>;
  }>;
}

export interface SlbSitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

const catalog = catalogJson as SlbFallbackCatalog;
const locales: SlbLocale[] = ['en', 'es-MX'];

const AUTHORING_ONLY_PATTERNS = [
  /\bauthoring\b/i,
  /\bdatasource\b/i,
  /placeholder/i,
  /\bimplementation note\b/i,
  /\bcontent editor\b/i,
  /click to edit/i,
  /requires a datasource/i,
  /revalidate at implementation/i,
  /dynamic rail/i,
  /provide governed links/i,
  /newsletter cta/i,
  /media cta/i,
  /do not rewrite/i,
  /no reescriba/i,
  /utilice este carrusel/i,
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function publicText(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text || AUTHORING_ONLY_PATTERNS.some((pattern) => pattern.test(text))) {
    return undefined;
  }

  return text;
}

export function containsAuthoringOnlyCopy(value: string): boolean {
  return AUTHORING_ONLY_PATTERNS.some((pattern) => pattern.test(value));
}

function appendText(lines: string[], value: string | undefined): void {
  const text = publicText(value);
  if (text) lines.push(text);
}

function appendHeading(
  lines: string[],
  level: 1 | 2 | 3,
  value: string | undefined,
): void {
  const text = publicText(value);
  if (text) lines.push(`${'#'.repeat(level)} ${text}`);
}

function absoluteUrl(origin: string, route: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${normalizedOrigin}${normalizedRoute}`;
}

export function getSlbRequestOrigin(request: NextRequest): string {
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto');

  return getBaseUrl(host, protocol) || new URL(request.url).origin;
}

export function getSlbFallbackSitemapEntries(
  origin: string,
): SlbSitemapEntry[] {
  const today = new Date().toISOString().split('T')[0];
  const seen = new Set<string>();

  return catalog.pages.flatMap((page) =>
    locales.flatMap((locale) => {
      const loc = absoluteUrl(origin, page.routes[locale]);
      if (seen.has(loc)) return [];

      seen.add(loc);
      const isHome =
        page.routes[locale] === '/' || page.routes[locale] === '/es-mx';
      return [
        {
          loc,
          lastmod: today,
          changefreq: 'weekly',
          priority: isHome ? '1.0' : '0.7',
        },
      ];
    }),
  );
}

export function serializeSitemap(entries: SlbSitemapEntry[]): string {
  const serializedEntries = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>` : ''}
    ${entry.priority ? `<priority>${escapeXml(entry.priority)}</priority>` : ''}
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${serializedEntries}
</urlset>`;
}

export function hasSitemapEntries(xml: string): boolean {
  return /<(?:url|sitemap)\b/i.test(xml);
}

/**
 * Sitecore builds sitemap URLs from the authoring host configured on the site.
 * Rebase only sitemap URL values so a public rendering host never advertises
 * authoring URLs while retaining Sitecore's paths, hreflang links, and dates.
 */
export function rebaseSitemapOrigin(xml: string, origin: string): string {
  let publicOrigin: string;

  try {
    publicOrigin = new URL(origin).origin;
  } catch {
    return xml;
  }

  return xml
    .replace(
      /(<loc\b[^>]*>\s*)https?:\/\/[^/<\s]+/gi,
      `$1${publicOrigin}`,
    )
    .replace(
      /(\bhref\s*=\s*["'])https?:\/\/[^/"'<\s]+/gi,
      `$1${publicOrigin}`,
    );
}

export function resolveSlbMarkdownPage(
  locale: string,
  path: readonly string[],
): SlbFallbackPageModel | undefined {
  return resolveSlbFallbackPage(locale, path);
}

export function generateSlbFallbackMarkdown(
  page: SlbFallbackPageModel,
): string {
  const lines: string[] = [];

  appendHeading(lines, 1, page.fields.pageTitle || page.fields.hero.heading);
  appendText(lines, page.fields.hero.summary);

  for (const component of page.fields.components) {
    appendHeading(lines, 2, component.heading);
    appendText(lines, component.body);

    for (const item of component.items || []) {
      appendHeading(lines, 3, item.title);
      appendText(lines, item.summary);
    }

    const ctaLabel = publicText(component.cta?.label);
    if (ctaLabel && component.cta?.target) {
      lines.push(`[${ctaLabel}](${component.cta.target})`);
    }
  }

  if (page.fields.finalCta) {
    appendHeading(lines, 2, page.fields.finalCta.heading);
    const label = publicText(page.fields.finalCta.label);
    if (label) {
      lines.push(`[${label}](${page.fields.finalCta.target})`);
    }
  }

  return lines.join('\n\n');
}
