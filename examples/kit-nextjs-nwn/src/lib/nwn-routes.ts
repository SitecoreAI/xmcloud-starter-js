export type NwnSearchPage = {
  title: string;
  path: `/${string}` | '/';
  description: string;
  keywords: readonly string[];
};

/**
 * The public NW Natural page set and its lightweight, client-side search index.
 * Keeping the route and search metadata together prevents sitemap and search
 * coverage from drifting apart.
 */
export const NWN_SEARCH_PAGES = [
  {
    title: 'NW Natural',
    path: '/',
    description:
      'Natural gas service, account resources, savings opportunities, and safety information for NW Natural customers.',
    keywords: ['home', 'customer service', 'natural gas utility'],
  },
  {
    title: 'Account & Billing',
    path: '/account-billing',
    description:
      'Manage your NW Natural account, billing, payments, and service changes.',
    keywords: ['account', 'bill', 'payment', 'customer account'],
  },
  {
    title: 'Pay My Bill',
    path: '/account-billing/pay-my-bill',
    description:
      'Review convenient ways to pay your NW Natural bill and keep your account current.',
    keywords: ['pay', 'billing', 'online payment', 'payment options'],
  },
  {
    title: 'Start, Stop or Transfer Service',
    path: '/account-billing/start-stop-transfer',
    description:
      'Start natural gas service, stop service, or transfer service when you move.',
    keywords: ['moving', 'new service', 'disconnect', 'move service'],
  },
  {
    title: 'Payment Assistance',
    path: '/account-billing/payment-assistance',
    description:
      'Find bill assistance, payment arrangements, and support when you need help paying.',
    keywords: ['financial assistance', 'bill help', 'payment plan', 'support'],
  },
  {
    title: 'Rebates & Offers',
    path: '/ways-to-save/rebates-offers',
    description:
      'Explore rebates, offers, and energy-saving opportunities for your home.',
    keywords: ['rebates', 'savings', 'incentives', 'energy efficiency'],
  },
  {
    title: 'Services',
    path: '/services',
    description:
      'Discover services that help keep natural gas equipment operating safely and reliably.',
    keywords: ['home services', 'equipment', 'maintenance', 'appliances'],
  },
  {
    title: 'Inspections & Tune-Ups',
    path: '/services/inspections-tune-ups',
    description:
      'Learn about professional inspections and tune-ups for natural gas equipment.',
    keywords: [
      'inspection',
      'tune up',
      'maintenance',
      'furnace',
      'water heater',
    ],
  },
  {
    title: 'Get Natural Gas',
    path: '/get-natural-gas',
    description:
      'Learn how to bring dependable natural gas service to your home or project.',
    keywords: ['connect service', 'conversion', 'new construction', 'gas line'],
  },
  {
    title: 'Benefits of Natural Gas',
    path: '/get-natural-gas/benefits',
    description:
      'See how natural gas delivers comfort, reliability, and energy choice for your home.',
    keywords: ['benefits', 'comfort', 'reliable energy', 'home energy'],
  },
  {
    title: 'Cooking with Natural Gas',
    path: '/get-natural-gas/cooking',
    description:
      'Explore the responsive control and everyday advantages of cooking with natural gas.',
    keywords: ['cooking', 'gas range', 'kitchen', 'appliances'],
  },
  {
    title: 'Safety',
    path: '/safety',
    description:
      'Find essential natural gas safety guidance and emergency contact information.',
    keywords: ['emergency', 'gas safety', 'odor', '811'],
  },
  {
    title: 'Smell Natural Gas?',
    path: '/safety/smell-natural-gas',
    description:
      'Know what to do if you smell natural gas and when to call the emergency line.',
    keywords: ['gas odor', 'rotten eggs', 'leak', 'emergency', '800-882-3377'],
  },
  {
    title: 'Call Before You Dig',
    path: '/safety/call-before-you-dig',
    description:
      'Call 811 before digging to have underground utility lines located at no charge.',
    keywords: ['811', 'digging', 'utility locate', 'excavation'],
  },
  {
    title: 'About NW Natural',
    path: '/about-us',
    description:
      'Learn about NW Natural, our communities, and our approach to a resilient energy future.',
    keywords: ['about', 'company', 'community', 'energy future'],
  },
  {
    title: 'Company Overview',
    path: '/about-us/company-overview',
    description:
      'Read about NW Natural’s history, service territory, values, and commitment to customers.',
    keywords: ['history', 'service territory', 'values', 'company information'],
  },
  {
    title: 'Renewable Natural Gas',
    path: '/about-us/renewable-natural-gas',
    description:
      'Learn how renewable natural gas can support a lower-carbon energy future.',
    keywords: ['RNG', 'renewable energy', 'decarbonization', 'sustainability'],
  },
  {
    title: 'Less We Can',
    path: '/about-us/less-we-can',
    description:
      'Explore practical ways NW Natural and its customers can use energy more efficiently.',
    keywords: [
      'energy efficiency',
      'conservation',
      'lower emissions',
      'sustainability',
    ],
  },
  {
    title: 'Search',
    path: '/search',
    description:
      'Search NW Natural customer resources, services, savings, and safety information.',
    keywords: ['find', 'site search', 'help'],
  },
  {
    title: 'Contact Us',
    path: '/contact-us',
    description:
      'Send NW Natural a message or find the right customer service and emergency contacts.',
    keywords: ['contact', 'email', 'message', 'customer service', 'support'],
  },
] as const satisfies readonly NwnSearchPage[];

export const NWN_SITE_ROUTES = NWN_SEARCH_PAGES.map((page) => page.path);

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
    ? [...NWN_SITE_ROUTES, ...NWN_AI_ROUTES]
    : NWN_SITE_ROUTES;

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
