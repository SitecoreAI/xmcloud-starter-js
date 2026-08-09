'use client';

import type { FormEvent } from 'react';
import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Search, X } from 'lucide-react';
import {
  getLocaleOption,
  getLocalizedPathname,
  type SupportedLocale,
} from '@/i18n/locales';
import { cn } from '@/lib/utils';
import { NWN_SEARCH_PAGES, type NwnSearchPage } from '@/lib/nwn-routes';
import type { SearchExperienceProps } from './search-experience.props';

const POPULAR_PAGE_PATHS = new Set([
  '/account-billing/pay-my-bill',
  '/account-billing/start-stop-transfer',
  '/ways-to-save/rebates-offers',
  '/services',
  '/safety',
  '/contact-us',
]);

type SearchPageCopy = Pick<NwnSearchPage, 'title' | 'description' | 'keywords'>;
type SearchPagePath = (typeof NWN_SEARCH_PAGES)[number]['path'];

const ES_MX_SEARCH_PAGE_COPY = {
  '/': {
    title: 'NW Natural',
    description:
      'Servicio de gas natural, recursos para su cuenta, oportunidades de ahorro e información de seguridad para clientes de NW Natural.',
    keywords: ['inicio', 'servicio al cliente', 'empresa de gas natural'],
  },
  '/account-billing': {
    title: 'Cuenta y facturación',
    description:
      'Administre su cuenta de NW Natural, facturación, pagos y cambios de servicio.',
    keywords: [
      'cuenta',
      'factura',
      'pago',
      'cuenta de cliente',
      'facturación electrónica',
      'dejar de recibir facturas impresas',
      'notificaciones de facturación',
    ],
  },
  '/account-billing/pay-my-bill': {
    title: 'Pagar mi factura',
    description:
      'Conozca maneras convenientes de pagar su factura de NW Natural y mantener su cuenta al día.',
    keywords: ['pagar', 'facturación', 'pago en línea', 'opciones de pago'],
  },
  '/account-billing/start-stop-transfer': {
    title: 'Iniciar, suspender o transferir el servicio',
    description:
      'Inicie, suspenda o transfiera su servicio de gas natural cuando se mude.',
    keywords: [
      'mudanza',
      'servicio nuevo',
      'desconexión',
      'transferir servicio',
    ],
  },
  '/account-billing/payment-assistance': {
    title: 'Asistencia para el pago',
    description:
      'Encuentre ayuda para pagar su factura, acuerdos de pago y otros recursos de apoyo.',
    keywords: [
      'asistencia financiera',
      'ayuda con la factura',
      'plan de pago',
      'apoyo',
    ],
  },
  '/ways-to-save/rebates-offers': {
    title: 'Reembolsos y ofertas',
    description:
      'Explore reembolsos, ofertas y oportunidades para ahorrar energía en su hogar.',
    keywords: ['reembolsos', 'ahorros', 'incentivos', 'eficiencia energética'],
  },
  '/services': {
    title: 'Servicios',
    description:
      'Conozca servicios que ayudan a mantener sus equipos de gas natural funcionando de forma segura y confiable.',
    keywords: [
      'servicios para el hogar',
      'equipos',
      'mantenimiento',
      'electrodomésticos',
    ],
  },
  '/services/inspections-tune-ups': {
    title: 'Inspecciones y mantenimiento',
    description:
      'Conozca las inspecciones profesionales y el mantenimiento de los equipos de gas natural.',
    keywords: [
      'inspección',
      'mantenimiento',
      'calefactor',
      'calentador de agua',
    ],
  },
  '/get-natural-gas': {
    title: 'Obtenga gas natural',
    description:
      'Descubra cómo llevar un servicio confiable de gas natural a su hogar o proyecto.',
    keywords: [
      'conectar servicio',
      'conversión',
      'construcción nueva',
      'línea de gas',
    ],
  },
  '/get-natural-gas/benefits': {
    title: 'Beneficios del gas natural',
    description:
      'Descubra cómo el gas natural brinda comodidad, confiabilidad y opciones de energía para su hogar.',
    keywords: [
      'beneficios',
      'comodidad',
      'energía confiable',
      'energía para el hogar',
    ],
  },
  '/get-natural-gas/cooking': {
    title: 'Cocinar con gas natural',
    description:
      'Explore el control preciso y las ventajas cotidianas de cocinar con gas natural.',
    keywords: ['cocinar', 'estufa de gas', 'cocina', 'electrodomésticos'],
  },
  '/safety': {
    title: 'Seguridad',
    description:
      'Encuentre información esencial sobre la seguridad del gas natural y los contactos de emergencia.',
    keywords: ['emergencia', 'seguridad del gas', 'olor', '811'],
  },
  '/safety/winter-service-advisory': {
    title: 'Aviso de servicio invernal',
    description:
      'Revise las protecciones de servicio durante clima severo, información regional de invierno, consejos de preparación y maneras de obtener ayuda con su cuenta.',
    keywords: [
      'aviso de invierno',
      'clima severo',
      'clima frío',
      'protección del servicio',
      'Oregón',
      'Washington',
      'asistencia para el pago',
    ],
  },
  '/safety/smell-natural-gas': {
    title: '¿Huele a gas natural?',
    description:
      'Sepa qué hacer si huele a gas natural y cuándo llamar a la línea de emergencia.',
    keywords: [
      'olor a gas',
      'huevo podrido',
      'fuga',
      'emergencia',
      '800-882-3377',
    ],
  },
  '/safety/call-before-you-dig': {
    title: 'Llame antes de excavar',
    description:
      'Llame al 811 antes de excavar para localizar las líneas subterráneas de servicios públicos sin costo.',
    keywords: ['811', 'excavar', 'localizar servicios', 'excavación'],
  },
  '/about-us': {
    title: 'Acerca de NW Natural',
    description:
      'Conozca a NW Natural, nuestras comunidades y nuestro enfoque para un futuro energético resiliente.',
    keywords: ['acerca de', 'empresa', 'comunidad', 'futuro energético'],
  },
  '/about-us/company-overview': {
    title: 'Descripción general de la empresa',
    description:
      'Conozca la historia, el territorio de servicio, los valores y el compromiso con los clientes de NW Natural.',
    keywords: [
      'historia',
      'territorio de servicio',
      'valores',
      'información de la empresa',
    ],
  },
  '/about-us/renewable-natural-gas': {
    title: 'Gas natural renovable',
    description:
      'Conozca cómo el gas natural renovable puede contribuir a un futuro energético con menos emisiones de carbono.',
    keywords: [
      'GNR',
      'energía renovable',
      'descarbonización',
      'sostenibilidad',
    ],
  },
  '/about-us/less-we-can': {
    title: 'Less We Can',
    description:
      'Explore maneras prácticas en que NW Natural y sus clientes pueden usar la energía de forma más eficiente.',
    keywords: [
      'eficiencia energética',
      'conservación',
      'menos emisiones',
      'sostenibilidad',
    ],
  },
  '/search': {
    title: 'Buscar',
    description:
      'Busque recursos para clientes, servicios, ahorros e información de seguridad de NW Natural.',
    keywords: ['encontrar', 'búsqueda del sitio', 'ayuda'],
  },
  '/contact-us': {
    title: 'Contáctenos',
    description:
      'Envíe un mensaje a NW Natural o encuentre los contactos correctos de servicio al cliente y emergencias.',
    keywords: [
      'contacto',
      'correo electrónico',
      'mensaje',
      'servicio al cliente',
      'apoyo',
    ],
  },
} as const satisfies Record<SearchPagePath, SearchPageCopy>;

const searchCopy = {
  en: {
    loading: 'Loading search',
    title: 'Search our site',
    description:
      'Find account help, services, savings opportunities, and natural gas safety information.',
    label: 'What can we help you find?',
    placeholder: 'Try “pay my bill” or “rebates”',
    clear: 'Clear search',
    submit: 'Search',
    resultsHeading: 'Search results',
    popularHeading: 'Popular pages',
    popularSummary: 'Browse popular NW Natural pages.',
    result: 'result',
    results: 'results',
    forQuery: 'for',
    noMatch: 'We couldn’t find a match',
    noMatchDescription:
      'Check the spelling, try a shorter phrase, or search for a topic such as billing, rebates, service, or safety.',
    contact: 'Contact us for help',
    viewPage: 'View page',
  },
  'es-MX': {
    loading: 'Cargando la búsqueda',
    title: 'Buscar en nuestro sitio',
    description:
      'Encuentre ayuda con su cuenta, servicios, oportunidades de ahorro e información de seguridad sobre el gas natural.',
    label: '¿Qué podemos ayudarle a encontrar?',
    placeholder: 'Pruebe “pagar mi factura” o “reembolsos”',
    clear: 'Borrar búsqueda',
    submit: 'Buscar',
    resultsHeading: 'Resultados de búsqueda',
    popularHeading: 'Páginas populares',
    popularSummary: 'Explore las páginas populares de NW Natural.',
    result: 'resultado',
    results: 'resultados',
    forQuery: 'para',
    noMatch: 'No encontramos resultados',
    noMatchDescription:
      'Revise la ortografía, pruebe una frase más corta o busque un tema como facturación, reembolsos, servicio o seguridad.',
    contact: 'Contáctenos para obtener ayuda',
    viewPage: 'Ver página',
  },
} as const;

const sectionLabels = {
  en: {
    overview: 'Overview',
    accountBilling: 'Account & Billing',
    waysToSave: 'Ways to Save',
    services: 'Services',
    getNaturalGas: 'Get Natural Gas',
    safety: 'Safety',
    aboutUs: 'About Us',
    customerSupport: 'Customer Support',
  },
  'es-MX': {
    overview: 'Descripción general',
    accountBilling: 'Cuenta y facturación',
    waysToSave: 'Formas de ahorrar',
    services: 'Servicios',
    getNaturalGas: 'Obtenga gas natural',
    safety: 'Seguridad',
    aboutUs: 'Acerca de nosotros',
    customerSupport: 'Atención al cliente',
  },
} as const;

const getSearchPages = (locale: SupportedLocale): readonly NwnSearchPage[] =>
  locale === 'es-MX'
    ? NWN_SEARCH_PAGES.map((page) => ({
        ...page,
        ...ES_MX_SEARCH_PAGE_COPY[page.path],
      }))
    : NWN_SEARCH_PAGES;

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const rankPage = (page: NwnSearchPage, normalizedQuery: string): number => {
  const title = normalizeSearchText(page.title);
  const description = normalizeSearchText(page.description);
  const keywords = normalizeSearchText(page.keywords.join(' '));
  const path = normalizeSearchText(page.path);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const allContent = `${title} ${description} ${keywords} ${path}`;

  if (!tokens.every((token) => allContent.includes(token))) return -1;

  let score = 0;

  if (title === normalizedQuery) score += 1_000;
  else if (title.startsWith(normalizedQuery)) score += 600;
  else if (title.includes(normalizedQuery)) score += 450;

  if (keywords.includes(normalizedQuery)) score += 250;
  if (description.includes(normalizedQuery)) score += 150;
  if (path.includes(normalizedQuery)) score += 75;

  for (const token of tokens) {
    if (title.split(' ').includes(token)) score += 90;
    else if (title.includes(token)) score += 60;
    if (keywords.includes(token)) score += 30;
    if (description.includes(token)) score += 15;
    if (path.includes(token)) score += 5;
  }

  return score;
};

export const searchNwnPages = (
  query: string,
  pages: readonly NwnSearchPage[] = NWN_SEARCH_PAGES,
): NwnSearchPage[] => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return [];

  return pages
    .filter((page) => page.path !== '/search')
    .map((page, index) => ({
      page,
      index,
      score: rankPage(page, normalizedQuery),
    }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ page }) => page);
};

const getSectionLabel = (path: string, locale: SupportedLocale): string => {
  const labels = sectionLabels[locale];

  if (path === '/') return labels.overview;
  if (path.startsWith('/account-billing')) return labels.accountBilling;
  if (path.startsWith('/ways-to-save')) return labels.waysToSave;
  if (path.startsWith('/services')) return labels.services;
  if (path.startsWith('/get-natural-gas')) return labels.getNaturalGas;
  if (path.startsWith('/safety')) return labels.safety;
  if (path.startsWith('/about-us')) return labels.aboutUs;
  return labels.customerSupport;
};

const SearchExperienceFallback = (props: SearchExperienceProps) => {
  const locale = getLocaleOption(props.page.locale).code;

  return (
    <section
      className={cn(
        'component search-experience bg-white py-12 sm:py-16',
        props.params?.GridParameters,
        props.params?.styles,
      )}
      aria-label={searchCopy[locale].loading}
      aria-busy="true"
    >
      <div className="nwn-content-shell animate-pulse overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
        <div className="h-72 bg-[#174f5b]" aria-hidden="true" />
        <div className="space-y-4 p-6 sm:p-8" aria-hidden="true">
          <div className="h-7 w-48 bg-slate-200" />
          <div className="h-24 bg-white" />
          <div className="h-24 bg-white" />
        </div>
      </div>
    </section>
  );
};

const SearchExperienceContent = (props: SearchExperienceProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = getLocaleOption(props.page.locale).code;
  const copy = searchCopy[locale];
  const searchPages = useMemo(() => getSearchPages(locale), [locale]);
  const urlQuery = searchParams.get('q')?.trim() ?? '';
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => setQuery(urlQuery), [urlQuery]);

  const normalizedQuery = query.trim();
  const results = useMemo(
    () => searchNwnPages(normalizedQuery, searchPages),
    [normalizedQuery, searchPages],
  );
  const popularPages = useMemo(
    () => searchPages.filter((page) => POPULAR_PAGE_PATHS.has(page.path)),
    [searchPages],
  );
  const displayedPages = normalizedQuery ? results : popularPages;

  const updateUrl = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const nextQuery = value.trim();

    if (nextQuery) nextParams.set('q', nextQuery);
    else nextParams.delete('q');

    const nextQueryString = nextParams.toString();
    const localizedPathname = getLocalizedPathname(
      pathname || '/search',
      locale,
    );
    router.replace(
      nextQueryString
        ? `${localizedPathname}?${nextQueryString}`
        : localizedPathname,
      { scroll: false },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUrl(query);
  };

  const handleClear = () => {
    setQuery('');
    updateUrl('');
    inputRef.current?.focus();
  };

  const resultSummary = normalizedQuery
    ? `${results.length} ${results.length === 1 ? copy.result : copy.results} ${copy.forQuery} “${normalizedQuery}”`
    : copy.popularSummary;

  return (
    <section
      data-component="SearchExperience"
      className={cn(
        'component search-experience bg-white py-12 sm:py-16',
        props.params?.GridParameters,
        props.params?.styles,
      )}
    >
      <div className="nwn-content-shell overflow-hidden border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
        <div className="border-t-8 border-cyan-500 bg-[#174f5b] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">
            NW Natural
          </p>
          <h1 className="mt-3 max-w-2xl font-heading text-4xl font-medium leading-tight text-white sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-cyan-50 sm:text-lg">
            {copy.description}
          </p>

          <form
            role="search"
            className="mt-8 max-w-4xl"
            onSubmit={handleSubmit}
          >
            <label
              htmlFor={inputId}
              className="mb-2 block text-base font-semibold text-white"
            >
              {copy.label}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id={inputId}
                  name="q"
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.placeholder}
                  className="min-h-14 w-full border-2 border-transparent bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-4 focus-visible:ring-cyan-300/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label={copy.clear}
                    className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-slate-500 transition-colors hover:text-[#005b73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="min-h-14 bg-cyan-500 px-8 text-base font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                {copy.submit}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[#f4f7f8] px-6 py-9 sm:px-10 sm:py-10 lg:px-14">
          <div className="flex flex-col gap-2 border-b border-slate-300 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-heading text-2xl font-semibold text-slate-900 sm:text-3xl">
              {normalizedQuery ? copy.resultsHeading : copy.popularHeading}
            </h2>
            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium text-slate-600"
            >
              {resultSummary}
            </p>
          </div>

          {normalizedQuery && results.length === 0 ? (
            <div className="my-8 border-l-4 border-cyan-500 bg-white p-6 sm:p-8">
              <h3 className="font-heading text-2xl font-semibold text-slate-900">
                {copy.noMatch}
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                {copy.noMatchDescription}
              </p>
              <Link
                href={getLocalizedPathname('/contact-us', locale)}
                prefetch={false}
                className="mt-5 inline-flex items-center gap-2 font-semibold text-[#006f8c] underline decoration-cyan-500 decoration-2 underline-offset-4 hover:text-[#004b60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-4"
              >
                {copy.contact}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {displayedPages.map((page) => (
                <li key={page.path}>
                  <article className="group flex h-full flex-col border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md focus-within:border-cyan-500 focus-within:shadow-md">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#007b98]">
                      {getSectionLabel(page.path, locale)}
                    </p>
                    <h3 className="mt-2 font-heading text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                      <Link
                        href={getLocalizedPathname(page.path, locale)}
                        prefetch={false}
                        className="outline-none after:absolute focus-visible:underline focus-visible:decoration-cyan-500 focus-visible:decoration-2 focus-visible:underline-offset-4"
                      >
                        {page.title}
                      </Link>
                    </h3>
                    <p className="mt-3 flex-1 text-base leading-7 text-slate-600">
                      {page.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#006f8c] transition-colors group-hover:text-[#004b60]">
                      {copy.viewPage}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
};

export const Default = (props: SearchExperienceProps) => (
  <Suspense fallback={<SearchExperienceFallback {...props} />}>
    <SearchExperienceContent {...props} />
  </Suspense>
);
