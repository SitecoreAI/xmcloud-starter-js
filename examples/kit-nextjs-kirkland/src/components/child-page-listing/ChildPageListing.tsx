import type {
  Field,
  ImageField,
  LinkField,
} from '@sitecore-content-sdk/nextjs';
import { CompatibleLink } from '@/components/content-sdk/CompatibleLink';
import { cn } from '@/lib/utils';
import type {
  ChildPageListingDatasource,
  ChildPageListingField,
  ChildPageListingNestedItem,
  ChildPageListingPage,
  ChildPageListingProps,
} from './child-page-listing.props';

type ListingType = 'lawyers' | 'news' | 'locations' | 'general';

type ListingImage = {
  src: string;
  alt: string;
  width?: string | number;
  height?: string | number;
};

type ListingCard = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  teaser: string;
  date: string;
  image?: ListingImage;
  sourceIndex: number;
};

const readTextField = (
  field?: ChildPageListingField<Field<string>>,
): string => {
  const value = field?.jsonValue?.value;

  return typeof value === 'string' ? toPlainText(value) : '';
};

const toPlainText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const readImageField = (
  field?: ChildPageListingField<ImageField>,
): ListingImage | undefined => {
  const value = field?.jsonValue?.value;

  if (!value || typeof value.src !== 'string' || !value.src.trim()) {
    return undefined;
  }

  const width =
    typeof value.width === 'string' || typeof value.width === 'number'
      ? value.width
      : undefined;
  const height =
    typeof value.height === 'string' || typeof value.height === 'number'
      ? value.height
      : undefined;

  return {
    src: value.src,
    alt: typeof value.alt === 'string' ? value.alt : '',
    width,
    height,
  };
};

const findNestedImage = (
  items: ChildPageListingNestedItem[] = [],
): ListingImage | undefined => {
  for (const item of items) {
    const image = readImageField(item.imageRequired);
    if (image) return image;

    const nestedImage = findNestedImage(
      item.items?.results || item.children?.results,
    );
    if (nestedImage) return nestedImage;
  }

  return undefined;
};

const getHref = (page: ChildPageListingPage): string => {
  if (typeof page.url === 'string') return page.url;

  return page.url?.href || page.url?.path || '';
};

const getListingType = (
  datasource: ChildPageListingDatasource | undefined,
  configuredType: ChildPageListingProps['params']['listingType'],
): ListingType => {
  if (configuredType) return configuredType;

  const url =
    typeof datasource?.url === 'string'
      ? datasource.url
      : datasource?.url?.href || datasource?.url?.path || '';
  const identity =
    `${datasource?.name || ''} ${datasource?.displayName || ''} ${url}`
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ');

  if (identity.includes('lawyer')) return 'lawyers';
  if (identity.includes('news') || identity.includes('insight')) return 'news';
  if (identity.includes('location') || identity.includes('office'))
    return 'locations';

  return 'general';
};

const createCard = (
  page: ChildPageListingPage,
  sourceIndex: number,
): ListingCard | null => {
  const href = getHref(page);
  if (!href) return null;

  const title =
    readTextField(page.pageHeaderTitle) || page.displayName || page.name;
  const thumbnail = readImageField(page.pageThumbnail);
  const nestedImage = findNestedImage(
    page.contentFolders?.results || page.children?.results,
  );

  return {
    id: page.id,
    href,
    title,
    subtitle: readTextField(page.pageSubtitle),
    teaser:
      readTextField(page.metadataDescription) ||
      readTextField(page.pageSummary),
    date: readTextField(page.pageDisplayDate),
    image: thumbnail || nestedImage,
    sourceIndex,
  };
};

const getSortableDate = (value: string): number => {
  const parsedDate = Date.parse(value);
  return Number.isNaN(parsedDate) ? Number.NEGATIVE_INFINITY : parsedDate;
};

const getCards = (
  datasource: ChildPageListingDatasource | undefined,
  listingType: ListingType,
): ListingCard[] => {
  const cards = (datasource?.children?.results || [])
    .map(createCard)
    .filter((card): card is ListingCard => Boolean(card));

  if (listingType !== 'news') return cards;

  return cards.sort((first, second) => {
    const dateDifference =
      getSortableDate(second.date) - getSortableDate(first.date);

    return dateDifference || first.sourceIndex - second.sourceIndex;
  });
};

const toLinkField = (card: ListingCard): LinkField => ({
  value: {
    href: card.href,
    text: card.title,
  },
});

const getFormattedDate = (value: string, locale = 'en'): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const getListingLabel = (listingType: ListingType): string => {
  const labels: Record<ListingType, string> = {
    lawyers: 'Lawyers',
    news: 'News and insights',
    locations: 'Locations',
    general: 'Pages',
  };

  return labels[listingType];
};

const getCallToActionLabel = (listingType: ListingType): string => {
  const labels: Record<ListingType, string> = {
    lawyers: 'View profile',
    news: 'Read insight',
    locations: 'View office',
    general: 'View page',
  };

  return labels[listingType];
};

const EmptyEditingFrame = ({ className }: { className?: string }) => (
  <section
    className={cn('component child-page-listing bg-[#0d141c] py-10', className)}
    data-testid="child-page-listing-empty"
    aria-hidden="true"
  >
    <div className="legal-content-shell min-h-20 bg-white/[0.025]" />
  </section>
);

export const Default: React.FC<ChildPageListingProps> = (props) => {
  const { fields, page, params } = props;
  const datasource = fields?.data?.datasource;
  const isPageEditing = Boolean(page?.mode?.isEditing);
  const listingType = getListingType(datasource, params?.listingType);
  const cards = getCards(datasource, listingType);

  if (!cards.length) {
    return isPageEditing ? (
      <EmptyEditingFrame className={params?.styles} />
    ) : null;
  }

  const isLawyerListing = listingType === 'lawyers';
  const listingLabel = getListingLabel(listingType);
  const callToActionLabel = getCallToActionLabel(listingType);

  return (
    <section
      className={cn(
        'component child-page-listing bg-[#0d141c] py-12 text-[#f5f1e8] md:py-16',
        params?.styles,
      )}
      aria-label={`${listingLabel} listing`}
      data-listing-type={listingType}
    >
      <div className="legal-content-shell grid grid-cols-1 gap-6 md:grid-cols-2 min-[1101px]:grid-cols-3">
        {cards.map((card) => {
          const formattedDate = getFormattedDate(card.date, page?.locale);
          const imageAlt = card.image?.alt?.trim() || card.title;

          return (
            <article
              key={card.id}
              className="group min-w-0 bg-white/[0.055] transition-colors duration-300 hover:bg-white/[0.09] focus-within:bg-white/[0.09]"
            >
              <CompatibleLink
                field={toLinkField(card)}
                editable={false}
                prefetch={false}
                className={cn(
                  'flex h-full text-current no-underline outline-none focus-visible:ring-2 focus-visible:ring-[#86bfe7] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d141c]',
                  isLawyerListing ? 'flex-row items-start' : 'flex-col',
                )}
                aria-label={`${card.title}, ${callToActionLabel.toLowerCase()}`}
              >
                <div
                  className={cn(
                    'relative overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(70,151,205,0.28),transparent_48%),linear-gradient(145deg,#172532,#0a1118)]',
                    isLawyerListing
                      ? 'aspect-[4/5] w-24 shrink-0 min-[360px]:w-28 sm:w-32'
                      : 'aspect-[16/9] w-full',
                  )}
                >
                  {card.image?.src && (
                    // The queried field is copied into a plain img so Sitecore editing metadata
                    // cannot make a generated listing image independently editable.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image.src}
                      alt={imageAlt}
                      width={card.image.width}
                      height={card.image.height}
                      loading="lazy"
                      className={cn(
                        'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]',
                        isLawyerListing && 'object-top',
                      )}
                    />
                  )}
                </div>

                <div
                  className={cn(
                    'flex min-w-0 flex-1 flex-col',
                    isLawyerListing ? 'p-5 sm:p-6' : 'p-6 sm:p-7',
                  )}
                >
                  {formattedDate && (
                    <time
                      dateTime={card.date}
                      className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#9fc9e6]"
                    >
                      {formattedDate}
                    </time>
                  )}

                  <h2 className="font-heading text-2xl font-normal leading-tight tracking-[-0.02em] text-[#f8f4ec] sm:text-[1.75rem]">
                    {card.title}
                  </h2>

                  {card.subtitle && (
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-[#a9d2ec]">
                      {card.subtitle}
                    </p>
                  )}

                  {card.teaser && (
                    <p className="mt-4 text-base leading-relaxed text-[#dedbd5]">
                      {card.teaser}
                    </p>
                  )}

                  <span className="mt-auto flex items-center gap-3 pt-7 text-sm font-semibold text-white">
                    {callToActionLabel}
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </CompatibleLink>
            </article>
          );
        })}
      </div>
    </section>
  );
};
