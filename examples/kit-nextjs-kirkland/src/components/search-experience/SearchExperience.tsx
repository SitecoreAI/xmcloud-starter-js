'use client';

import {
  FormEvent,
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { event } from '@sitecore-content-sdk/events';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getLocaleOption } from '@/i18n/locales';
import { useLocaleSearch } from '@/lib/search/use-locale-search';
import { cn } from '@/lib/utils';
import type {
  SearchConfiguration,
  SearchExperienceProps,
  SearchFieldsMapping,
  SearchResultDocument,
  SearchResultValue,
} from './search-experience.props';

const DEFAULT_PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 400;

type Copy = {
  eyebrow: string;
  heading: string;
  description: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  clear: string;
  results: (total: number, query: string) => string;
  noResultsHeading: string;
  noResultsBody: string;
  errorHeading: string;
  errorBody: string;
  retry: string;
  previous: string;
  next: string;
  pagination: string;
  page: (pageNumber: number) => string;
  readResult: string;
  loading: string;
};

const COPY: Record<'en' | 'es' | 'fr' | 'ja', Copy> = {
  en: {
    eyebrow: 'Kirkland & Ellis',
    heading: 'Search',
    description:
      'Find lawyers, practices, offices, and insights across the firm.',
    inputLabel: 'Search Kirkland & Ellis',
    placeholder: 'Search lawyers, practices, offices, and insights',
    submit: 'Search',
    clear: 'Clear search',
    results: (total, query) =>
      query ? `${total} results for “${query}”` : `${total} results`,
    noResultsHeading: 'No results found',
    noResultsBody:
      'Try a broader term, check the spelling, or clear your search.',
    errorHeading: 'Search is temporarily unavailable',
    errorBody:
      'Please try again. If the problem continues, return a little later.',
    retry: 'Try again',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Search results pagination',
    page: (pageNumber) => `Page ${pageNumber}`,
    readResult: 'View result',
    loading: 'Loading search results',
  },
  es: {
    eyebrow: 'Kirkland & Ellis',
    heading: 'Buscar',
    description:
      'Encuentre abogados, prácticas, oficinas y publicaciones de la firma.',
    inputLabel: 'Buscar en Kirkland & Ellis',
    placeholder: 'Buscar abogados, prácticas, oficinas y publicaciones',
    submit: 'Buscar',
    clear: 'Borrar búsqueda',
    results: (total, query) =>
      query ? `${total} resultados para “${query}”` : `${total} resultados`,
    noResultsHeading: 'No se encontraron resultados',
    noResultsBody:
      'Pruebe un término más amplio, revise la ortografía o borre la búsqueda.',
    errorHeading: 'La búsqueda no está disponible temporalmente',
    errorBody: 'Inténtelo de nuevo. Si el problema continúa, vuelva más tarde.',
    retry: 'Intentar de nuevo',
    previous: 'Anterior',
    next: 'Siguiente',
    pagination: 'Paginación de resultados',
    page: (pageNumber) => `Página ${pageNumber}`,
    readResult: 'Ver resultado',
    loading: 'Cargando resultados',
  },
  fr: {
    eyebrow: 'Kirkland & Ellis',
    heading: 'Rechercher',
    description:
      'Trouvez les avocats, les pratiques, les bureaux et les analyses du cabinet.',
    inputLabel: 'Rechercher sur Kirkland & Ellis',
    placeholder:
      'Rechercher des avocats, des pratiques, des bureaux et des analyses',
    submit: 'Rechercher',
    clear: 'Effacer la recherche',
    results: (total, query) =>
      query ? `${total} résultats pour « ${query} »` : `${total} résultats`,
    noResultsHeading: 'Aucun résultat',
    noResultsBody:
      'Essayez un terme plus général, vérifiez l’orthographe ou effacez la recherche.',
    errorHeading: 'La recherche est temporairement indisponible',
    errorBody:
      'Veuillez réessayer. Si le problème persiste, revenez plus tard.',
    retry: 'Réessayer',
    previous: 'Précédent',
    next: 'Suivant',
    pagination: 'Pagination des résultats',
    page: (pageNumber) => `Page ${pageNumber}`,
    readResult: 'Voir le résultat',
    loading: 'Chargement des résultats',
  },
  ja: {
    eyebrow: 'Kirkland & Ellis',
    heading: '検索',
    description: '弁護士、取扱分野、オフィス、およびインサイトを検索します。',
    inputLabel: 'Kirkland & Ellis を検索',
    placeholder: '弁護士、取扱分野、オフィス、インサイトを検索',
    submit: '検索',
    clear: '検索をクリア',
    results: (total, query) =>
      query ? `「${query}」の検索結果 ${total} 件` : `検索結果 ${total} 件`,
    noResultsHeading: '検索結果がありません',
    noResultsBody: 'より一般的な用語を試すか、スペルを確認してください。',
    errorHeading: '現在、検索を利用できません',
    errorBody:
      'もう一度お試しください。問題が続く場合は、後ほどご利用ください。',
    retry: '再試行',
    previous: '前へ',
    next: '次へ',
    pagination: '検索結果のページ',
    page: (pageNumber) => `${pageNumber} ページ`,
    readResult: '詳細を見る',
    loading: '検索結果を読み込み中',
  },
};

const getCopy = (locale?: string): Copy => {
  const language = locale?.toLowerCase().split('-')[0];

  if (language === 'es' || language === 'fr' || language === 'ja') {
    return COPY[language];
  }

  return COPY.en;
};

const parsePositiveInteger = (
  value: string | number | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseSearchConfiguration = (
  value: string | null | undefined,
): SearchConfiguration => {
  if (!value?.trim()) {
    return { searchIndex: '', fieldsMapping: {} };
  }

  try {
    const parsed = JSON.parse(value) as Partial<SearchConfiguration>;

    return {
      searchIndex:
        typeof parsed.searchIndex === 'string' ? parsed.searchIndex : '',
      fieldsMapping:
        parsed.fieldsMapping && typeof parsed.fieldsMapping === 'object'
          ? parsed.fieldsMapping
          : {},
    };
  } catch {
    return { searchIndex: '', fieldsMapping: {} };
  }
};

const getNestedValue = (
  document: SearchResultDocument,
  path: string | undefined,
): SearchResultValue | undefined => {
  if (!path) return undefined;

  return path
    .split('.')
    .reduce<SearchResultValue | undefined>((current, segment) => {
      if (current && !Array.isArray(current) && typeof current === 'object') {
        return current[segment];
      }

      return undefined;
    }, document);
};

const getFirstValue = (
  document: SearchResultDocument,
  configuredPath: string | undefined,
  fallbacks: string[],
): SearchResultValue | undefined => {
  const paths = configuredPath ? [configuredPath, ...fallbacks] : fallbacks;

  for (const path of paths) {
    const value = getNestedValue(document, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
};

const parseJsonValue = (value: string): SearchResultValue | undefined => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;

  try {
    return JSON.parse(trimmed) as SearchResultValue;
  } catch {
    return undefined;
  }
};

const toText = (value: SearchResultValue | undefined): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    return parsed === undefined ? value : toText(parsed);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join(', ');
  }

  for (const key of ['text', 'value', 'name', 'title', 'displayName']) {
    const candidate = value[key];
    if (candidate !== undefined) return toText(candidate);
  }

  return '';
};

const toStringList = (value: SearchResultValue | undefined): string[] => {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    if (parsed !== undefined) return toStringList(parsed);

    return value
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap(toStringList).filter(Boolean);
  }

  const text = toText(value);
  return text ? [text] : [];
};

const toUrl = (value: SearchResultValue | undefined): string => {
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    return parsed === undefined ? value : toUrl(parsed);
  }

  if (value && !Array.isArray(value) && typeof value === 'object') {
    for (const key of ['href', 'url', 'path', 'value']) {
      const candidate = value[key];
      if (candidate !== undefined) return toUrl(candidate);
    }
  }

  return '';
};

const getTitleFromUrl = (value: string): string => {
  if (!value) return '';

  try {
    const pathname = new URL(value, 'https://kirkland.example').pathname;
    const segment = pathname.split('/').filter(Boolean).at(-1);

    if (!segment) return '';

    return decodeURIComponent(segment)
      .replace(/\.html?$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) =>
        word === word.toLowerCase()
          ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
          : word,
      )
      .join(' ');
  } catch {
    return '';
  }
};

const toImage = (
  value: SearchResultValue | undefined,
): { src: string; alt: string } | undefined => {
  if (typeof value === 'string') {
    const parsed = parseJsonValue(value);
    if (parsed !== undefined) return toImage(parsed);

    return value.trim() ? { src: value, alt: '' } : undefined;
  }

  if (Array.isArray(value)) return toImage(value[0]);

  if (value && typeof value === 'object') {
    const src = toUrl(value.src ?? value.url ?? value.href ?? value.value);
    const alt = toText(value.alt ?? value.altText ?? '');

    return src ? { src, alt } : undefined;
  }

  return undefined;
};

const stripMarkup = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (value: string, locale?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale || 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const getResultId = (document: SearchResultDocument, index: number): string =>
  toText(
    getFirstValue(document, undefined, [
      'sc_item_id',
      'id',
      '_id',
      'url',
      'title',
    ]),
  ) || `search-result-${index}`;

const getGridClass = (columnsValue: string | undefined): string => {
  const columns = Math.min(parsePositiveInteger(columnsValue, 1), 3);

  if (columns === 3) {
    return 'grid-cols-1 md:grid-cols-2 min-[1101px]:grid-cols-3';
  }
  if (columns === 2) return 'grid-cols-1 md:grid-cols-2';

  return 'grid-cols-1';
};

const useSearchUrl = (initialValue: string) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const replaceQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalizedValue = value.trim();

      if (normalizedValue) params.set('q', normalizedValue);
      else params.delete('q');

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const setQuery = useCallback(
    (value: string, debounced = true) => {
      if (timer.current) clearTimeout(timer.current);

      if (!debounced) {
        replaceQuery(value);
        return;
      }

      timer.current = setTimeout(() => replaceQuery(value), SEARCH_DEBOUNCE_MS);
    },
    [replaceQuery],
  );

  return { initialValue, setQuery };
};

type SearchInputProps = {
  copy: Copy;
  inputId: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
};

const SearchInput = ({
  copy,
  inputId,
  value,
  disabled,
  onChange,
  onSubmit,
  onClear,
}: SearchInputProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      role="search"
      className="mt-8 flex flex-col gap-3 sm:flex-row"
      onSubmit={handleSubmit}
    >
      <div className="relative min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">
          {copy.inputLabel}
        </label>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#516473]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-5 w-5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
        </span>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={value}
          readOnly={disabled}
          aria-disabled={disabled}
          placeholder={copy.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="search-experience__input min-h-14 w-full bg-[#f8f5ee] py-4 pl-14 pr-14 text-base text-[#101820] outline-none placeholder:text-[#59636b] focus-visible:ring-2 focus-visible:ring-[#86bfe7] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d141c] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label={copy.clear}
            className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-[#344451] transition-colors hover:text-[#0d141c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2673a4]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              ×
            </span>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="min-h-14 shrink-0 bg-[#236b96] px-8 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#1b587d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86bfe7] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d141c] disabled:cursor-default disabled:opacity-70"
      >
        {copy.submit}
      </button>
    </form>
  );
};

type ResultCardProps = {
  document: SearchResultDocument;
  mapping: SearchFieldsMapping;
  locale?: string;
  copy: Copy;
  columns: number;
  onClick: () => void;
};

const ResultCard = ({
  document,
  mapping,
  locale,
  copy,
  columns,
  onClick,
}: ResultCardProps) => {
  const href = toUrl(
    getFirstValue(document, mapping.link, [
      'url',
      'Url',
      'link',
      'Link',
      'sc_url',
    ]),
  );
  const indexedTitle = stripMarkup(
    toText(
      getFirstValue(document, mapping.title, [
        'navigation_title',
        'navigationTitle',
        'title',
        'Title',
        'pageTitle',
        'PageTitle',
        'name',
      ]),
    ),
  );
  const title = indexedTitle || getTitleFromUrl(href);
  const description = stripMarkup(
    toText(
      getFirstValue(document, mapping.description, [
        'description',
        'Description',
        'summary',
        'Summary',
      ]),
    ),
  );
  const type = stripMarkup(
    toText(
      getFirstValue(document, mapping.type, [
        'type',
        'Type',
        'contentType',
        'ContentType',
      ]),
    ),
  );
  const author = stripMarkup(
    toText(getFirstValue(document, mapping.author, ['author', 'Author'])),
  );
  const practice = stripMarkup(
    toText(getFirstValue(document, mapping.practice, ['practice', 'Practice'])),
  );
  const office = stripMarkup(
    toText(getFirstValue(document, mapping.office, ['office', 'Office'])),
  );
  const dateValue = toText(
    getFirstValue(document, mapping.date, [
      'date',
      'Date',
      'displayDate',
      'DisplayDate',
    ]),
  );
  const tags = toStringList(
    getFirstValue(document, mapping.tags, ['tags', 'Tags']),
  ).slice(0, 4);
  const image = toImage(
    getFirstValue(document, mapping.images, [
      'image',
      'Image',
      'thumbnail',
      'Thumbnail',
    ]),
  );
  const formattedDate = formatDate(dateValue, locale);
  const meta = [author, practice, office].filter(Boolean);
  const isSingleColumn = columns === 1;

  const content = (
    <>
      {image && (
        <div
          className={cn(
            'relative overflow-hidden bg-[#172532]',
            isSingleColumn
              ? 'aspect-[16/10] min-[720px]:aspect-auto min-[720px]:min-h-64'
              : 'aspect-[16/10]',
          )}
        >
          {/* Search results are generated from indexed content and are intentionally non-editable. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            alt={image.alt || title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#236b96]">
          {type && <span>{type}</span>}
          {formattedDate && <time dateTime={dateValue}>{formattedDate}</time>}
        </div>
        <h2 className="mt-3 font-heading text-2xl font-normal leading-tight tracking-[-0.02em] text-[#101820] sm:text-[1.85rem]">
          {title || copy.readResult}
        </h2>
        {description && (
          <p className="mt-4 line-clamp-3 text-base leading-relaxed text-[#394650]">
            {description}
          </p>
        )}
        {meta.length > 0 && (
          <p className="mt-5 text-sm font-medium leading-relaxed text-[#485965]">
            {meta.join(' · ')}
          </p>
        )}
        {tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Topics">
            {tags.map((tag) => (
              <li
                key={tag}
                className="bg-[#e7edf0] px-3 py-1 text-xs font-medium text-[#2a4353]"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        <span className="mt-auto flex items-center gap-3 pt-7 text-sm font-semibold text-[#174f72]">
          {copy.readResult}
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </>
  );

  const frameClass = cn(
    'group flex min-w-0 flex-col overflow-hidden bg-[#f8f5ee] text-[#101820] transition-colors duration-300 hover:bg-white focus-within:bg-white',
    isSingleColumn &&
      image &&
      'min-[720px]:grid min-[720px]:grid-cols-[minmax(13rem,28%)_1fr]',
  );

  if (!href) return <article className={frameClass}>{content}</article>;

  return (
    <article className="h-full">
      <a
        href={href}
        onClick={onClick}
        className={cn(
          frameClass,
          'h-full text-current no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#2673a4] focus-visible:ring-inset',
        )}
        aria-label={`${title || copy.readResult}, ${copy.readResult.toLowerCase()}`}
      >
        {content}
      </a>
    </article>
  );
};

const SkeletonCard = ({ columns }: { columns: number }) => (
  <article
    data-testid="search-result-skeleton"
    aria-hidden="true"
    className={cn(
      'min-w-0 overflow-hidden bg-[#f8f5ee] p-6 sm:p-8',
      columns === 1 && 'min-h-52',
    )}
  >
    <div className="h-3 w-24 animate-pulse bg-[#b7c4cb]" />
    <div className="mt-5 h-8 w-3/4 animate-pulse bg-[#ced7da]" />
    <div className="mt-6 space-y-3">
      <div className="h-4 w-full animate-pulse bg-[#dce2e3]" />
      <div className="h-4 w-5/6 animate-pulse bg-[#dce2e3]" />
      <div className="h-4 w-2/3 animate-pulse bg-[#dce2e3]" />
    </div>
    <div className="mt-8 h-4 w-28 animate-pulse bg-[#b7c4cb]" />
  </article>
);

type StatePanelProps = {
  icon: ReactNode;
  heading: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

const StatePanel = ({
  icon,
  heading,
  body,
  actionLabel,
  onAction,
}: StatePanelProps) => (
  <div className="bg-[#f8f5ee] px-6 py-12 text-center text-[#101820] sm:px-10">
    <div className="mx-auto grid h-12 w-12 place-items-center text-[#236b96]">
      {icon}
    </div>
    <h2 className="mt-4 font-heading text-3xl font-normal">{heading}</h2>
    <p className="mx-auto mt-3 max-w-xl leading-relaxed text-[#485965]">
      {body}
    </p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-7 bg-[#236b96] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1b587d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2673a4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8f5ee]"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

type PaginationProps = {
  copy: Copy;
  currentPage: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
};

const Pagination = ({
  copy,
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const start = Math.max(
    1,
    Math.min(currentPage - 2, Math.max(1, totalPages - 4)),
  );
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) =>
    Number(start + index),
  );

  return (
    <nav
      aria-label={copy.pagination}
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="min-h-11 px-4 text-sm font-semibold text-[#f5f1e8] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86bfe7] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← {copy.previous}
      </button>
      {start > 1 && (
        <span aria-hidden="true" className="px-1 text-white/50">
          …
        </span>
      )}
      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          aria-label={copy.page(pageNumber)}
          aria-current={pageNumber === currentPage ? 'page' : undefined}
          onClick={() => onPageChange(pageNumber)}
          className={cn(
            'grid h-11 min-w-11 place-items-center px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86bfe7]',
            pageNumber === currentPage
              ? 'bg-[#f8f5ee] text-[#101820]'
              : 'text-[#f5f1e8] hover:bg-white/10',
          )}
        >
          {pageNumber}
        </button>
      ))}
      {end < totalPages && (
        <span aria-hidden="true" className="px-1 text-white/50">
          …
        </span>
      )}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="min-h-11 px-4 text-sm font-semibold text-[#f5f1e8] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86bfe7] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {copy.next} →
      </button>
    </nav>
  );
};

const SearchExperienceContent = (props: SearchExperienceProps) => {
  const { fields, page, params, rendering } = props;
  const copy = getCopy(page?.locale);
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const { searchIndex, fieldsMapping } = useMemo(
    () => parseSearchConfiguration(fields?.search?.value),
    [fields?.search?.value],
  );
  const pageSize = parsePositiveInteger(params?.pageSize, DEFAULT_PAGE_SIZE);
  const columns = Math.min(parsePositiveInteger(params?.columns, 1), 3);
  const configuredComponentId = (
    params?.RenderingIdentifier ||
    rendering?.uid ||
    'kirkland-site-search'
  ).replace(/[^a-zA-Z0-9_-]/g, '');
  const componentId = configuredComponentId || 'kirkland-site-search';
  const inputId = `${componentId}-input`;
  const headingId = `${componentId}-heading`;
  const isEditing = Boolean(page?.mode?.isEditing);
  const isPreview = Boolean(page?.mode?.isPreview);
  const isAuthoring = isEditing || isPreview;
  const activeLocale = getLocaleOption(page?.locale).code;
  const [inputValue, setInputValue] = useState(urlQuery);
  const [query, setSearchQuery] = useState(urlQuery);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const { setQuery } = useSearchUrl(urlQuery);

  useEffect(() => {
    setInputValue(urlQuery);
    setSearchQuery(urlQuery);
    setPageNumber(1);
  }, [activeLocale, urlQuery]);

  useEffect(() => {
    setSearchEnabled(Boolean(searchIndex) && !isAuthoring);
  }, [isAuthoring, searchIndex]);

  const { results, total, totalPages, isLoading, isSuccess, isError } =
    useLocaleSearch<SearchResultDocument>({
      searchIndexId: searchIndex,
      locale: activeLocale,
      query,
      page: pageNumber,
      pageSize,
      enabled: searchEnabled,
      keepPreviousData: true,
    });

  const sendAnalyticsEvent = useCallback(
    (interactionType: 'viewed' | 'clicked') => {
      if (
        process.env.NODE_ENV !== 'production' ||
        isAuthoring ||
        !searchIndex
      ) {
        return;
      }

      const route = page?.layout?.sitecore?.route;
      void event({
        type: 'search',
        siteId: page?.siteName,
        channel: 'web',
        name: route?.name,
        language: route?.itemLanguage || page?.locale,
        core: {
          componentId: rendering?.uid || '',
          interactionType,
          keyword: query,
          nullResults: total === 0,
        },
      }).catch(() => undefined);
    },
    [isAuthoring, page, query, rendering?.uid, searchIndex, total],
  );

  useEffect(() => {
    if (isSuccess) sendAnalyticsEvent('viewed');
  }, [isSuccess, sendAnalyticsEvent]);

  const updateQuery = useCallback(
    (value: string, debounced: boolean) => {
      setInputValue(value);
      if (!isAuthoring) setQuery(value, debounced);
    },
    [isAuthoring, setQuery],
  );

  const handlePageChange = (nextPage: number) => {
    setPageNumber(nextPage);
    document
      .getElementById(componentId)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const retrySearch = () => {
    setSearchEnabled(false);
    window.setTimeout(() => setSearchEnabled(Boolean(searchIndex)), 0);
  };

  const skeletonCount = Math.min(pageSize, 3);
  const hasSearchConfiguration = Boolean(searchIndex);
  const configurationUnavailable = !hasSearchConfiguration && !isAuthoring;
  const showSkeletons =
    isAuthoring ||
    (hasSearchConfiguration && (isLoading || (!isSuccess && !isError)));
  const resultLabel = copy.results(total, query);

  return (
    <section
      id={componentId}
      className={cn(
        'component search-experience bg-[#0d141c] py-12 text-[#f5f1e8] md:py-16',
        params?.GridParameters,
        params?.styles,
      )}
      aria-labelledby={headingId}
    >
      <div className="legal-content-shell">
        <header className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9fc9e6]">
            {copy.eyebrow}
          </p>
          <h1
            id={headingId}
            className="mt-3 font-heading text-5xl font-normal leading-none tracking-[-0.03em] text-[#f8f4ec] sm:text-6xl"
          >
            {copy.heading}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#dedbd5] sm:text-lg">
            {copy.description}
          </p>
        </header>

        <SearchInput
          copy={copy}
          inputId={inputId}
          value={inputValue}
          disabled={isAuthoring}
          onChange={(value) => updateQuery(value, true)}
          onSubmit={() => updateQuery(inputValue, false)}
          onClear={() => updateQuery('', false)}
        />

        <div
          className="mt-8 min-h-6 text-sm font-medium text-[#c5d1d8]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading
            ? copy.loading
            : !isAuthoring && isSuccess
              ? resultLabel
              : ''}
        </div>

        <div
          className="mt-6"
          aria-busy={isLoading}
          aria-label={isLoading ? copy.loading : undefined}
        >
          {(configurationUnavailable || isError) && !isAuthoring && (
            <StatePanel
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-11 w-11"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v6M12 17h.01" />
                </svg>
              }
              heading={copy.errorHeading}
              body={copy.errorBody}
              actionLabel={configurationUnavailable ? undefined : copy.retry}
              onAction={configurationUnavailable ? undefined : retrySearch}
            />
          )}

          {!isLoading &&
            hasSearchConfiguration &&
            isSuccess &&
            !isAuthoring &&
            total === 0 && (
              <StatePanel
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-11 w-11"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                }
                heading={copy.noResultsHeading}
                body={copy.noResultsBody}
                actionLabel={query ? copy.clear : undefined}
                onAction={query ? () => updateQuery('', false) : undefined}
              />
            )}

          {(showSkeletons ||
            (hasSearchConfiguration && !isError && results.length > 0)) && (
            <div className={cn('grid gap-5', getGridClass(params?.columns))}>
              {showSkeletons
                ? Array.from({ length: skeletonCount }, (_, index) => (
                    <SkeletonCard key={index} columns={columns} />
                  ))
                : results.map((document, index) => (
                    <ResultCard
                      key={getResultId(document, index)}
                      document={document}
                      mapping={fieldsMapping}
                      locale={page?.locale}
                      copy={copy}
                      columns={columns}
                      onClick={() => sendAnalyticsEvent('clicked')}
                    />
                  ))}
            </div>
          )}
        </div>

        {!isLoading && !isError && !isAuthoring && results.length > 0 && (
          <Pagination
            copy={copy}
            currentPage={pageNumber}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </section>
  );
};

const SearchExperienceFallback = (props: SearchExperienceProps) => {
  const copy = getCopy(props.page?.locale);

  return (
    <section
      className={cn(
        'component search-experience bg-[#0d141c] py-12 text-[#f5f1e8] md:py-16',
        props.params?.GridParameters,
        props.params?.styles,
      )}
      aria-label={copy.loading}
      aria-busy="true"
    >
      <div className="legal-content-shell animate-pulse">
        <div className="h-3 w-28 bg-white/20" aria-hidden="true" />
        <div className="mt-5 h-14 max-w-md bg-white/15" aria-hidden="true" />
        <div className="mt-5 h-5 max-w-2xl bg-white/10" aria-hidden="true" />
        <div className="mt-10 h-16 w-full bg-white/10" aria-hidden="true" />
      </div>
    </section>
  );
};

export const Default = (props: SearchExperienceProps) => (
  <Suspense fallback={<SearchExperienceFallback {...props} />}>
    <SearchExperienceContent {...props} />
  </Suspense>
);
