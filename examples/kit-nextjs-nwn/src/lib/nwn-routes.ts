export const NWN_DEMO_ROUTES = [
  '/',
  '/account-billing',
  '/account-billing/pay-my-bill',
  '/account-billing/start-stop-transfer',
  '/account-billing/payment-assistance',
  '/ways-to-save/rebates-offers',
  '/services',
  '/services/inspections-tune-ups',
  '/get-natural-gas',
  '/get-natural-gas/benefits',
  '/get-natural-gas/cooking',
  '/safety',
  '/safety/smell-natural-gas',
  '/safety/call-before-you-dig',
  '/about-us',
  '/about-us/company-overview',
  '/about-us/renewable-natural-gas',
  '/about-us/less-we-can',
] as const;

const NWN_AI_ROUTES = [
  '/ai/faq.json',
  '/ai/summary.json',
  '/ai/service.json',
] as const;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const buildNwnSitemapXml = (
  origin: string,
  options: { includeAiRoutes?: boolean; lastModified?: string } = {},
): string => {
  const normalizedOrigin = origin.replace(/\/$/, '');
  const lastModified =
    options.lastModified ?? new Date().toISOString().slice(0, 10);
  const routes = options.includeAiRoutes
    ? [...NWN_DEMO_ROUTES, ...NWN_AI_ROUTES]
    : NWN_DEMO_ROUTES;

  const entries = routes
    .map((route) => {
      const isHome = route === '/';
      const isAiRoute = route.startsWith('/ai/');
      return `  <url>
    <loc>${escapeXml(`${normalizedOrigin}${route}`)}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${isAiRoute ? 'weekly' : isHome ? 'daily' : 'monthly'}</changefreq>
    <priority>${isHome ? '1.0' : isAiRoute ? '0.8' : '0.7'}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
};

export const getRequestOrigin = (request: Request): string => {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0];
  const host = forwardedHost || request.headers.get('host');
  const forwardedProtocol = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0];
  const protocol =
    forwardedProtocol || new URL(request.url).protocol.slice(0, -1);
  return host ? `${protocol}://${host}` : new URL(request.url).origin;
};
