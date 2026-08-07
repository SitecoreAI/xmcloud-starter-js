export type SieSearchPage = {
  title: string;
  path: `/${string}` | '/';
  description: string;
  keywords: readonly string[];
};

/**
 * The public SiEnergy page set and its lightweight, client-side search index.
 * Keeping the route and search metadata together prevents sitemap and search
 * coverage from drifting apart.
 */
export const SIE_SEARCH_PAGES = [
  {
    title: 'SiEnergy',
    path: '/',
    description:
      'Safe, reliable natural gas service and customer resources for Texas communities.',
    keywords: ['home', 'customer service', 'natural gas', 'Texas utility'],
  },
  {
    title: 'What We Do',
    path: '/what-we-do',
    description:
      'Learn how SiEnergy develops and operates natural gas distribution infrastructure for Texas communities.',
    keywords: [
      'natural gas distribution',
      'infrastructure',
      'developers',
      'communities',
    ],
  },
  {
    title: 'Customer Service',
    path: '/customer-service-portal',
    description:
      'Find billing, payment, service-change, safety, and account support from SiEnergy.',
    keywords: ['customer service', 'account', 'bill', 'support'],
  },
  {
    title: 'Contact Us',
    path: '/contact-us',
    description:
      'Contact SiEnergy customer service, builder services, or the 24-hour emergency line.',
    keywords: ['contact', 'phone', 'email', 'customer service', 'emergency'],
  },
  {
    title: 'Service Options',
    path: '/service-options',
    description:
      'Start, stop, transfer, or install natural gas service with SiEnergy.',
    keywords: [
      'start service',
      'stop service',
      'transfer service',
      'install meter',
      'moving',
    ],
  },
  {
    title: 'Payment Options & Locations',
    path: '/payment-options-locations',
    description:
      'Review convenient ways to pay your SiEnergy natural gas bill.',
    keywords: [
      'pay my bill',
      'online payment',
      'phone payment',
      'mail payment',
      'payment assistance',
    ],
  },
  {
    title: 'Understanding My Bill',
    path: '/understanding-my-bill',
    description:
      'Understand SiEnergy bill charges, payment dates, service reconnection, and how rates are set.',
    keywords: ['bill', 'charges', 'rates', 'payment due', 'reconnection'],
  },
  {
    title: 'Safety',
    path: '/safety',
    description:
      'Learn natural gas safety, leak response, meter safety, and why every digging project begins with 811.',
    keywords: ['natural gas safety', 'gas odor', 'leak', 'emergency', '811'],
  },
  {
    title: 'Regulatory & Important Links',
    path: '/regulatory-and-important-links',
    description:
      'Find SiEnergy regulatory information, current rates and tariffs, customer rights, and utility resources.',
    keywords: [
      'regulatory',
      'tariffs',
      'rates',
      'customer rights',
      'Railroad Commission of Texas',
    ],
  },
  {
    title: 'How to Read My Meter',
    path: '/how-to-read-my-meter',
    description:
      'Learn how to read a natural gas meter and understand monthly usage.',
    keywords: ['meter', 'meter reading', 'usage', 'natural gas bill'],
  },
  {
    title: 'Tips to Lower Gas Usage',
    path: '/tips-to-lower-gas-usage',
    description:
      'Explore practical ways to use less natural gas while keeping your home comfortable.',
    keywords: [
      'lower gas usage',
      'energy efficiency',
      'conservation',
      'home comfort',
    ],
  },
  {
    title: 'Company',
    path: '/company',
    description:
      'Read the story of SiEnergy and its partnerships with Texas communities.',
    keywords: [
      'company',
      'history',
      'Texas',
      'communities',
      'natural gas utility',
    ],
  },
  {
    title: 'Vision, Purpose & Values',
    path: '/vision-mission-goals',
    description:
      'Discover the purpose, vision, and values that guide SiEnergy.',
    keywords: ['vision', 'purpose', 'values', 'service', 'partnership'],
  },
  {
    title: 'Developers & Industrial Users',
    path: '/business-development',
    description:
      'See how SiEnergy works with developers, builders, and industrial users on natural gas infrastructure.',
    keywords: [
      'developers',
      'builders',
      'industrial',
      'infrastructure',
      'project planning',
    ],
  },
  {
    title: 'Report an Emergency',
    path: '/report-emergency',
    description:
      'Find immediate guidance and the 24-hour SiEnergy emergency phone number.',
    keywords: ['emergency', 'gas odor', 'gas leak', '888-468-7007', '911'],
  },
  {
    title: 'Search',
    path: '/search',
    description:
      'Search SiEnergy customer service, payment, safety, company, and developer information.',
    keywords: ['find', 'site search', 'help'],
  },
] as const satisfies readonly SieSearchPage[];

export const SIE_SITE_ROUTES = SIE_SEARCH_PAGES.map((page) => page.path);

const SIE_AI_ROUTES = [
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

export const buildSieSitemapXml = (
  origin: string,
  options: { includeAiRoutes?: boolean; lastModified?: string } = {},
): string => {
  const normalizedOrigin = origin.replace(/\/$/, '');
  const lastModified =
    options.lastModified ?? new Date().toISOString().slice(0, 10);
  const routes = options.includeAiRoutes
    ? [...SIE_SITE_ROUTES, ...SIE_AI_ROUTES]
    : SIE_SITE_ROUTES;

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
