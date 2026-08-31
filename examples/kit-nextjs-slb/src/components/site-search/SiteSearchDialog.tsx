'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { event } from '@sitecore-content-sdk/events';
import { useSearch } from '@sitecore-content-sdk/nextjs/search';
import { ArrowLeft, ArrowRight, LoaderCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  SlbFallbackSearchResponse,
  SlbSearchResult,
} from '@/lib/slb-search';

type SitecoreSearchPrimitive = string | number | boolean;
type SitecoreSearchDocument = {
  [key: string]:
    | SitecoreSearchPrimitive
    | SitecoreSearchPrimitive[]
    | SitecoreSearchDocument
    | SitecoreSearchDocument[];
};
type FallbackSearch =
  typeof import('@/lib/slb-search').searchSlbFallbackContent;

type SiteSearchDialogProps = {
  locale: string;
  pageName?: string;
  siteName?: string;
  trackingEnabled?: boolean;
  className?: string;
};

const PAGE_SIZE = 6;
const SEARCH_INDEX_ID =
  process.env.NEXT_PUBLIC_SITECORE_SEARCH_INDEX_ID?.trim() || '';

const copy = {
  en: {
    open: 'Open search menu',
    close: 'Close search',
    title: 'Search SLB',
    description:
      'Find technologies, services, insights, and stories from across SLB.',
    placeholder: 'What are you looking for?',
    submit: 'Search',
    popular: 'Popular searches',
    suggestions: [
      'emissions',
      'digital operations',
      'carbon capture',
      'data and AI',
      'geothermal',
    ],
    initial: 'Start typing to explore SLB.',
    hint: 'Enter at least 2 characters',
    loading: 'Searching SLB',
    results: 'results',
    result: 'result',
    for: 'for',
    noResults: 'No results found',
    noResultsBody:
      'Try a broader term or explore one of the popular searches above.',
    previous: 'Previous page',
    next: 'Next page',
    page: 'Page',
    of: 'of',
    readMore: 'View page',
    unavailable:
      'Live search is temporarily unavailable. Showing the closest site content instead.',
  },
  es: {
    open: 'Abrir búsqueda',
    close: 'Cerrar búsqueda',
    title: 'Buscar en SLB',
    description:
      'Encuentre tecnologías, servicios, análisis e historias de SLB.',
    placeholder: '¿Qué está buscando?',
    submit: 'Buscar',
    popular: 'Búsquedas populares',
    suggestions: [
      'emisiones',
      'operaciones digitales',
      'captura de carbono',
      'datos e IA',
      'geotermia',
    ],
    initial: 'Comience a escribir para explorar SLB.',
    hint: 'Ingrese al menos 2 caracteres',
    loading: 'Buscando en SLB',
    results: 'resultados',
    result: 'resultado',
    for: 'para',
    noResults: 'No se encontraron resultados',
    noResultsBody:
      'Pruebe un término más amplio o explore una búsqueda popular.',
    previous: 'Página anterior',
    next: 'Página siguiente',
    page: 'Página',
    of: 'de',
    readMore: 'Ver página',
    unavailable:
      'La búsqueda en vivo no está disponible temporalmente. Se muestra el contenido más cercano del sitio.',
  },
} as const;

const sectionLabels = {
  en: {
    home: 'SLB',
    solutions: 'Solutions',
    products: 'Products and services',
    sustainability: 'Sustainability',
    insights: 'News and insights',
    about: 'Who we are',
    contact: 'Contact us',
  },
  es: {
    home: 'SLB',
    solutions: 'Soluciones',
    products: 'Productos y servicios',
    sustainability: 'Sostenibilidad',
    insights: 'Noticias y análisis',
    about: 'Quiénes somos',
    contact: 'Contáctenos',
  },
} as const;

function readString(
  document: SitecoreSearchDocument,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = document[key];
    if (typeof value === 'string' && value.trim()) return value.trim();

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nestedKey of ['value', 'href', 'src', 'text']) {
        const nestedValue = value[nestedKey];
        if (typeof nestedValue === 'string' && nestedValue.trim()) {
          return nestedValue.trim();
        }
      }
    }
  }

  return undefined;
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;

  try {
    const parsed = new URL(value, 'https://slb.local');
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized.startsWith('/') ? normalized : undefined;
  } catch {
    return undefined;
  }
}

function sectionFromUrl(url: string) {
  const segments = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
  const section =
    segments[0]?.toLowerCase() === 'es-mx' ? segments[1] : segments[0];

  const localizedSections: Record<string, string> = {
    soluciones: 'solutions',
    'productos-y-servicios': 'products',
    sostenibilidad: 'sustainability',
    'noticias-y-analisis': 'insights',
    'quienes-somos': 'about',
    contactenos: 'contact',
    'products-and-services': 'products',
    'news-and-insights': 'insights',
    'about-us': 'about',
    'contact-us': 'contact',
  };

  return section ? localizedSections[section] || section : 'home';
}

function normalizeRemoteResult(
  document: SitecoreSearchDocument,
  locale: 'en' | 'es-MX',
  index: number,
): SlbSearchResult | null {
  const url = normalizeUrl(
    readString(
      document,
      'link',
      'Link',
      'url',
      'Url',
      'canonical',
      'uri',
      'Uri',
      'document_uri',
      'documentUri',
      'sc_url',
      'source_url',
      'sourceUrl',
      'page_url',
      'pageUrl',
      '_url',
    ),
  );
  if (!url) return null;

  const title =
    readString(
      document,
      'title',
      'Title',
      'pageTitle',
      'navigationTitle',
      'name',
    ) ||
    url.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') ||
    'SLB';

  return {
    id:
      readString(document, 'sc_item_id', 'id', 'documentId') ||
      `${url}-${index}`,
    locale,
    title,
    description:
      readString(
        document,
        'description',
        'Description',
        'summary',
        'pageSummary',
        'content',
      ) || '',
    section:
      readString(document, 'section', 'type', 'Type', 'contentType') ||
      sectionFromUrl(url),
    url,
    image: readString(document, 'image', 'images', 'ogImage', 'openGraphImage'),
  };
}

function sectionLabel(section: string, isSpanish: boolean) {
  const dictionary = isSpanish ? sectionLabels.es : sectionLabels.en;
  const normalized = section.toLowerCase();

  for (const [key, label] of Object.entries(dictionary)) {
    if (normalized.includes(key)) return label;
  }

  return section;
}

export function SiteSearchDialog({
  locale,
  pageName,
  siteName = 'slb',
  trackingEnabled = true,
  className,
}: SiteSearchDialogProps) {
  const isSpanish = locale.toLowerCase() === 'es-mx';
  const language = isSpanish ? 'es' : 'en';
  const searchLocale = isSpanish ? 'es-MX' : 'en';
  const labels = copy[language];
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [fallbackSearch, setFallbackSearch] = useState<FallbackSearch | null>(
    null,
  );
  const [completedRequestKey, setCompletedRequestKey] = useState('');
  const requestedRequestKey = useRef('');
  const viewedQuery = useRef('');
  const hasSearchIndex = Boolean(SEARCH_INDEX_ID);
  const canSearch = open && query.length >= 2;
  const requestKey = `${query}\u0000${page}`;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextQuery = inputValue.trim();
      setQuery(nextQuery);
      setPage(1);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [inputValue]);

  useEffect(() => {
    if (!open || fallbackSearch) return;

    let active = true;
    void import('@/lib/slb-search').then((module) => {
      if (active) {
        setFallbackSearch(() => module.searchSlbFallbackContent);
      }
    });

    return () => {
      active = false;
    };
  }, [fallbackSearch, open]);

  const remote = useSearch<SitecoreSearchDocument>({
    searchIndexId: SEARCH_INDEX_ID || 'unconfigured',
    query,
    page,
    pageSize: PAGE_SIZE,
    locale: searchLocale,
    enabled: canSearch && hasSearchIndex,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (remote.isLoading) {
      requestedRequestKey.current = requestKey;
    }
  }, [remote.isLoading, requestKey]);

  useEffect(() => {
    if (
      remote.isSuccess &&
      requestedRequestKey.current === requestKey &&
      completedRequestKey !== requestKey
    ) {
      setCompletedRequestKey(requestKey);
    }
  }, [completedRequestKey, remote.isSuccess, requestKey]);

  const fallback = useMemo<SlbFallbackSearchResponse>(
    () =>
      fallbackSearch
        ? fallbackSearch({
            query,
            locale: searchLocale,
            page,
            pageSize: PAGE_SIZE,
          })
        : { total: 0, totalPages: 0, results: [] },
    [fallbackSearch, page, query, searchLocale],
  );

  const normalizedRemoteResults = useMemo(
    () =>
      remote.results
        .map((item, index) => normalizeRemoteResult(item, searchLocale, index))
        .filter((item): item is SlbSearchResult => item !== null),
    [remote.results, searchLocale],
  );
  const remoteResponseMatchesRequest =
    remote.isSuccess && completedRequestKey === requestKey;
  const remoteErrorMatchesRequest =
    remote.isError && requestedRequestKey.current === requestKey;
  const remoteSchemaMismatch =
    remoteResponseMatchesRequest &&
    remote.results.length > 0 &&
    normalizedRemoteResults.length !== remote.results.length;
  const useRemoteResults =
    hasSearchIndex && remoteResponseMatchesRequest && !remoteSchemaMismatch;
  const useFallbackResults =
    !hasSearchIndex || remoteErrorMatchesRequest || remoteSchemaMismatch;
  const results = useRemoteResults
    ? normalizedRemoteResults
    : useFallbackResults
      ? fallback.results
      : [];
  const total = useRemoteResults
    ? remote.total
    : useFallbackResults
      ? fallback.total
      : 0;
  const totalPages = useRemoteResults
    ? Math.max(remote.totalPages, 1)
    : useFallbackResults
      ? Math.max(fallback.totalPages, 1)
      : 1;
  const loading =
    canSearch &&
    ((hasSearchIndex &&
      !remoteResponseMatchesRequest &&
      !remoteErrorMatchesRequest) ||
      (useFallbackResults && !fallbackSearch));
  const showingFallback =
    canSearch &&
    hasSearchIndex &&
    (remoteErrorMatchesRequest || remoteSchemaMismatch) &&
    Boolean(fallbackSearch);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' ||
      !trackingEnabled ||
      !open ||
      query.length < 2 ||
      completedRequestKey !== requestKey ||
      viewedQuery.current === query
    ) {
      return;
    }

    viewedQuery.current = query;
    void event({
      type: 'search',
      siteId: siteName,
      channel: 'web',
      name: pageName || 'Global search',
      language: searchLocale,
      core: {
        componentId: 'slb-global-search',
        interactionType: 'viewed',
        keyword: query,
        nullResults: remote.total === 0,
      },
    });
  }, [
    open,
    pageName,
    query,
    completedRequestKey,
    requestKey,
    remote.total,
    searchLocale,
    siteName,
    trackingEnabled,
  ]);

  const runSearch = (value: string) => {
    const nextQuery = value.trim();
    setInputValue(nextQuery);
    setQuery(nextQuery);
    setPage(1);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(inputValue);
  };

  const onResultClick = () => {
    if (
      process.env.NODE_ENV === 'development' ||
      !trackingEnabled ||
      !useRemoteResults
    ) {
      return;
    }

    void event({
      type: 'search',
      siteId: siteName,
      channel: 'web',
      name: pageName || 'Global search',
      language: searchLocale,
      core: {
        componentId: 'slb-global-search',
        interactionType: 'clicked',
        keyword: query,
        nullResults: false,
      },
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex size-12 shrink-0 items-center justify-center text-[#001e5a] transition-colors hover:bg-[#edf8ff] hover:text-[#0066b3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0089d9]',
            className,
          )}
          aria-label={labels.open}
        >
          <Search
            aria-hidden="true"
            className="size-[25px]"
            strokeWidth={1.8}
          />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#001e5a]/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-[80] flex h-[92dvh] max-h-[58rem] min-h-0 flex-col overflow-hidden bg-white shadow-[0_28px_80px_rgba(0,30,90,0.28)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#00b8d9] via-[#0089d9] to-[#632ca6]" />
          <div className="mx-auto flex w-full max-w-[82rem] flex-1 flex-col overflow-hidden px-5 pb-6 pt-5 sm:px-8 lg:px-12 lg:pb-10 lg:pt-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <Dialog.Title className="font-heading text-[clamp(2rem,4vw,3.75rem)] font-light leading-none tracking-[-0.035em] text-[#001e5a]">
                  {labels.title}
                </Dialog.Title>
                <Dialog.Description className="mt-3 max-w-2xl text-sm leading-6 text-[#4a607d] sm:text-base">
                  {labels.description}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="-mr-2 -mt-1 inline-flex size-12 shrink-0 items-center justify-center text-[#001e5a] transition-colors hover:bg-[#edf8ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0089d9]"
                aria-label={labels.close}
              >
                <X aria-hidden="true" className="size-8" strokeWidth={1.4} />
              </Dialog.Close>
            </div>

            <form
              className="mt-7 flex w-full"
              role="search"
              onSubmit={onSubmit}
            >
              <label
                htmlFor={`slb-site-search-${language}`}
                className="sr-only"
              >
                {labels.placeholder}
              </label>
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-[#0066b3]"
                  strokeWidth={1.8}
                />
                <input
                  id={`slb-site-search-${language}`}
                  type="search"
                  autoComplete="off"
                  autoFocus
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder={labels.placeholder}
                  className="h-16 w-full rounded-none border border-r-0 border-[#8ca0b8] bg-white pl-14 pr-4 text-lg text-[#001e5a] outline-none transition-shadow placeholder:text-[#657892] focus:border-[#0089d9] focus:ring-2 focus:ring-[#0089d9]/25 sm:text-xl"
                />
              </div>
              <button
                type="submit"
                aria-label={labels.submit}
                className="inline-flex h-16 min-w-16 items-center justify-center gap-2 bg-[#0066b3] px-5 font-heading font-medium text-white transition-colors hover:bg-[#004f91] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0089d9] sm:min-w-36"
              >
                <span className="hidden sm:inline">{labels.submit}</span>
                <ArrowRight aria-hidden="true" className="size-5" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 font-semibold text-[#001e5a]">
                {labels.popular}
              </span>
              {labels.suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => runSearch(suggestion)}
                  className="border border-[#cad8e6] bg-[#f5f9fc] px-3 py-1.5 text-[#23405f] transition-colors hover:border-[#0089d9] hover:bg-[#edf8ff] hover:text-[#0066b3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0089d9]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div
              className="mt-6 min-h-0 flex-1 overflow-y-auto border-t border-[#d9e3ed] pt-5"
              aria-live="polite"
            >
              {!canSearch && (
                <div className="flex min-h-36 items-center justify-center text-center text-[#4a607d]">
                  <p>
                    {inputValue.trim().length === 1
                      ? labels.hint
                      : labels.initial}
                  </p>
                </div>
              )}

              {canSearch && loading && (
                <div className="flex min-h-36 items-center justify-center gap-3 text-[#23405f]">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-5 animate-spin"
                  />
                  <span>{labels.loading}</span>
                </div>
              )}

              {canSearch && !loading && (
                <>
                  {showingFallback && (
                    <p className="mb-4 border-l-2 border-[#00b8d9] bg-[#edf8ff] px-4 py-2 text-sm text-[#23405f]">
                      {labels.unavailable}
                    </p>
                  )}

                  <div className="mb-3 flex items-end justify-between gap-4">
                    <p className="text-sm text-[#4a607d]">
                      <strong className="font-semibold text-[#001e5a]">
                        {total}
                      </strong>{' '}
                      {total === 1 ? labels.result : labels.results}{' '}
                      {labels.for}{' '}
                      <strong className="font-semibold text-[#001e5a]">
                        “{query}”
                      </strong>
                    </p>
                  </div>

                  {results.length > 0 ? (
                    <ol className="divide-y divide-[#d9e3ed]">
                      {results.map((result) => (
                        <li key={result.id}>
                          <Link
                            href={result.url}
                            onClick={() => {
                              onResultClick();
                              setOpen(false);
                            }}
                            className="group grid gap-2 py-5 outline-none focus-visible:bg-[#edf8ff] sm:grid-cols-[10rem_1fr_auto] sm:gap-6 sm:px-2"
                          >
                            <span className="pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0066b3]">
                              {sectionLabel(result.section, isSpanish)}
                            </span>
                            <span>
                              <span className="font-heading block text-xl font-medium leading-tight text-[#001e5a] transition-colors group-hover:text-[#0066b3] sm:text-2xl">
                                {result.title}
                              </span>
                              {result.description && (
                                <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-[#4a607d] sm:text-base">
                                  {result.description}
                                </span>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-2 self-center text-sm font-semibold text-[#0066b3] sm:justify-self-end">
                              <span className="sm:sr-only">
                                {labels.readMore}
                              </span>
                              <ArrowRight
                                aria-hidden="true"
                                className="size-5 transition-transform group-hover:translate-x-1"
                              />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="flex min-h-36 flex-col items-center justify-center text-center">
                      <p className="font-heading text-xl font-medium text-[#001e5a]">
                        {labels.noResults}
                      </p>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-[#4a607d]">
                        {labels.noResultsBody}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {canSearch && results.length > 0 && totalPages > 1 && (
              <nav
                className="mt-4 flex items-center justify-between border-t border-[#d9e3ed] pt-4"
                aria-label={
                  isSpanish ? 'Paginación de búsqueda' : 'Search pagination'
                }
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066b3] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={labels.previous}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">{labels.previous}</span>
                </button>
                <span className="text-sm text-[#4a607d]">
                  {labels.page} {page} {labels.of} {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066b3] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={labels.next}
                >
                  <span className="hidden sm:inline">{labels.next}</span>
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </nav>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
