import catalogJson from '@/content/slb-fallback-content.json';
import { getSlbDamAssetUrl } from '@/lib/slb-dam-assets';

export type SlbSearchLocale = 'en' | 'es-MX';

export interface SlbSearchResult {
  id: string;
  locale: SlbSearchLocale;
  url: string;
  title: string;
  description: string;
  section: string;
  image?:
    | string
    | {
        src: string;
        alt: string;
      };
}

export interface SlbLocalSearchDocument extends SlbSearchResult {
  pageId: string;
  navigationTitle: string;
  heading: string;
  sectionLabel: string;
  template: string;
  image: {
    src: string;
    alt: string;
  };
  tags: string[];
  searchText: string;
}

export interface SlbFallbackSearchOptions {
  locale: SlbSearchLocale;
  query: string;
  page?: number;
  pageSize?: number;
}

export interface SlbFallbackSearchResponse {
  total: number;
  totalPages: number;
  results: SlbSearchResult[];
}

interface CatalogImage {
  filename: string;
  alt: string;
}

interface CatalogComponent {
  heading?: string;
  body?: string;
  items?: Array<{
    title: string;
    summary: string;
  }>;
  cta?: {
    label: string;
  };
}

interface CatalogFields {
  pageTitle: string;
  navigationTitle: string;
  seo: {
    title: string;
    description: string;
    openGraphImageFilename: string;
  };
  hero: {
    eyebrow?: string;
    heading: string;
    summary: string;
    image?: CatalogImage;
    filterLabels?: string[];
    primaryCta?: { label: string };
    secondaryCta?: { label: string };
  };
  components: CatalogComponent[];
  finalCta?: {
    heading: string;
    label: string;
  };
}

interface SearchCatalog {
  pages: Array<{
    id: string;
    section: string;
    template: string;
    routes: Record<SlbSearchLocale, string>;
    fields: Record<SlbSearchLocale, CatalogFields>;
  }>;
}

const catalog = catalogJson as SearchCatalog;
const locales: readonly SlbSearchLocale[] = ['en', 'es-MX'];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const sectionLabels: Readonly<Record<string, Record<SlbSearchLocale, string>>> =
  {
    home: { en: 'SLB', 'es-MX': 'SLB' },
    solutions: { en: 'Solutions', 'es-MX': 'Soluciones' },
    'products-and-services': {
      en: 'Products and services',
      'es-MX': 'Productos y servicios',
    },
    sustainability: { en: 'Sustainability', 'es-MX': 'Sostenibilidad' },
    'news-and-insights': {
      en: 'News and insights',
      'es-MX': 'Noticias y análisis',
    },
    'about-us': { en: 'Who we are', 'es-MX': 'Quiénes somos' },
    'contact-us': { en: 'Contact us', 'es-MX': 'Contáctenos' },
  };

const stopWords: Readonly<Record<SlbSearchLocale, ReadonlySet<string>>> = {
  en: new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'by',
    'can',
    'for',
    'from',
    'how',
    'in',
    'into',
    'is',
    'of',
    'on',
    'or',
    'our',
    'the',
    'to',
    'what',
    'with',
    'your',
  ]),
  'es-MX': new Set([
    'al',
    'como',
    'con',
    'de',
    'del',
    'e',
    'el',
    'en',
    'la',
    'las',
    'los',
    'o',
    'para',
    'por',
    'que',
    'su',
    'sus',
    'un',
    'una',
    'y',
  ]),
};

const tokenAliases: Readonly<
  Record<SlbSearchLocale, Readonly<Record<string, readonly string[]>>>
> = {
  en: {
    ai: ['artificial', 'intelligence'],
    artificial: ['ai'],
    capture: ['ccus', 'storage', 'sequestration'],
    ccus: ['carbon', 'capture', 'sequestration', 'storage'],
    decarbonization: ['emission', 'emissions'],
    emission: ['emissions', 'decarbonization'],
    emissions: ['emission', 'decarbonization'],
    intelligence: ['ai'],
    subsurface: ['well', 'wells'],
  },
  'es-MX': {
    almacenamiento: ['ccus', 'captura'],
    captura: ['ccus', 'almacenamiento'],
    ccus: ['captura', 'carbono', 'almacenamiento'],
    descarbonizacion: ['emision', 'emisiones'],
    emision: ['emisiones', 'descarbonizacion'],
    emisiones: ['emision', 'descarbonizacion'],
    ia: ['artificial', 'inteligencia'],
    inteligencia: ['ia'],
    subsuelo: ['pozo', 'pozos'],
  },
};

function cleanText(values: Array<string | undefined>): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' ');
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [
    ...new Set(values.map((value) => value?.trim()).filter(Boolean)),
  ] as string[];
}

function buildDocument(
  page: SearchCatalog['pages'][number],
  locale: SlbSearchLocale,
): SlbLocalSearchDocument {
  const fields = page.fields[locale];
  const sectionLabel = sectionLabels[page.section]?.[locale] ?? page.section;
  const componentHeadings = fields.components.map(
    (component) => component.heading,
  );
  const componentBodies = fields.components.map((component) => component.body);
  const componentItems = fields.components.flatMap(
    (component) => component.items ?? [],
  );
  const imageFilename = fields.seo.openGraphImageFilename;
  const imageAlt =
    fields.hero.image?.filename === imageFilename
      ? fields.hero.image.alt
      : fields.hero.image?.alt || fields.navigationTitle;

  return {
    id: `${page.id}:${locale}`,
    pageId: page.id,
    locale,
    url: page.routes[locale],
    title: fields.pageTitle,
    navigationTitle: fields.navigationTitle,
    heading: fields.hero.heading,
    description: fields.seo.description,
    section: page.section,
    sectionLabel,
    template: page.template,
    image: {
      src: getSlbDamAssetUrl(imageFilename),
      alt: imageAlt,
    },
    tags: uniqueStrings([
      sectionLabel,
      ...(fields.hero.filterLabels ?? []),
      ...componentItems.map((item) => item.title),
    ]),
    searchText: cleanText([
      fields.pageTitle,
      fields.navigationTitle,
      fields.seo.title,
      fields.seo.description,
      fields.hero.eyebrow,
      fields.hero.heading,
      fields.hero.summary,
      ...(fields.hero.filterLabels ?? []),
      fields.hero.primaryCta?.label,
      fields.hero.secondaryCta?.label,
      ...componentHeadings,
      ...componentBodies,
      ...componentItems.flatMap((item) => [item.title, item.summary]),
      ...fields.components.map((component) => component.cta?.label),
      fields.finalCta?.heading,
      fields.finalCta?.label,
    ]),
  };
}

/**
 * A deterministic, reduced view of the governed SLB content catalog. It is
 * safe to use when the remote SitecoreAI search source is not yet configured
 * or temporarily unavailable.
 */
export const slbLocalSearchIndex: readonly SlbLocalSearchDocument[] =
  catalog.pages.flatMap((page) =>
    locales.map((locale) => buildDocument(page, locale)),
  );

/** Normalizes case, punctuation, and accents for bilingual matching. */
export function normalizeSlbSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function queryTokens(
  normalizedQuery: string,
  locale: SlbSearchLocale,
): string[] {
  return [
    ...new Set(
      normalizedQuery
        .split(' ')
        .filter((token) => token.length > 1 && !stopWords[locale].has(token)),
    ),
  ];
}

function tokenMatches(
  words: ReadonlySet<string>,
  token: string,
  locale: SlbSearchLocale,
): { matched: boolean; exact: boolean } {
  const variants = [token, ...(tokenAliases[locale][token] ?? [])];

  for (const variant of variants) {
    if (words.has(variant)) return { matched: true, exact: variant === token };

    if (
      variant.length >= 4 &&
      [...words].some(
        (word) => word.startsWith(variant) || variant.startsWith(word),
      )
    ) {
      return { matched: true, exact: false };
    }
  }

  return { matched: false, exact: false };
}

function scoreDocument(
  document: SlbLocalSearchDocument,
  normalizedQuery: string,
  tokens: string[],
): number {
  const fields = [
    { value: document.title, weight: 28 },
    { value: document.navigationTitle, weight: 24 },
    { value: document.heading, weight: 22 },
    { value: document.sectionLabel, weight: 14 },
    { value: document.description, weight: 9 },
    { value: document.searchText, weight: 2 },
  ];
  const matchedTokens = new Set<string>();
  let score = 0;

  for (const field of fields) {
    const normalizedField = normalizeSlbSearchText(field.value);
    const words = new Set(normalizedField.split(' ').filter(Boolean));

    if (normalizedField === normalizedQuery) score += field.weight * 7;
    else if (normalizedField.startsWith(normalizedQuery))
      score += field.weight * 4;
    else if (normalizedField.includes(normalizedQuery))
      score += field.weight * 3;

    for (const token of tokens) {
      const match = tokenMatches(words, token, document.locale);
      if (!match.matched) continue;

      matchedTokens.add(token);
      score += field.weight * (match.exact ? 2 : 1);
    }
  }

  if (matchedTokens.size === tokens.length) score += 40;
  return score;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value ?? fallback));
}

/**
 * Searches the static SLB catalog with locale isolation, deterministic
 * relevance ranking and page-based pagination.
 */
export function searchSlbFallbackContent(
  options: SlbFallbackSearchOptions,
): SlbFallbackSearchResponse {
  const query = options.query.trim();
  const normalizedQuery = normalizeSlbSearchText(query);
  const tokens = queryTokens(normalizedQuery, options.locale);
  const page = positiveInteger(options.page, 1);
  const pageSize = Math.min(
    positiveInteger(options.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  if (!normalizedQuery || tokens.length === 0) {
    return {
      total: 0,
      totalPages: 0,
      results: [],
    };
  }

  const ranked = slbLocalSearchIndex
    .filter((document) => document.locale === options.locale)
    .map((document) => ({
      document,
      score: scoreDocument(document, normalizedQuery, tokens),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.document.title.localeCompare(
          right.document.title,
          options.locale,
        ) ||
        left.document.id.localeCompare(right.document.id),
    );
  const total = ranked.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  return {
    total,
    totalPages,
    results: ranked.slice(offset, offset + pageSize).map(({ document }) => ({
      id: document.id,
      locale: document.locale,
      url: document.url,
      title: document.title,
      description: document.description,
      section: document.section,
      image: document.image,
    })),
  };
}
