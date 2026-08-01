import type { Page } from '@sitecore-content-sdk/nextjs';
import type {
  ChildPageListingPage,
  ChildPageListingProps,
} from '@/components/child-page-listing/child-page-listing.props';

const mockPage = (isEditing = false): Page =>
  ({
    mode: {
      isEditing,
      isPreview: false,
      isNormal: !isEditing,
      name: isEditing ? 'edit' : 'normal',
      designLibrary: { isVariantGeneration: false },
      isDesignLibrary: false,
    },
    layout: {
      sitecore: {
        context: {},
        route: null,
      },
    },
    locale: 'en-US',
  }) as Page;

export const makeListingPage = (
  overrides: Partial<ChildPageListingPage> = {},
): ChildPageListingPage => ({
  id: 'page-1',
  name: 'Default Page',
  url: { href: '/default-page' },
  pageHeaderTitle: { jsonValue: { value: 'Default title' } },
  pageSubtitle: { jsonValue: { value: 'Default subtitle' } },
  metadataDescription: {
    jsonValue: { value: 'Default metadata description.' },
  },
  pageDisplayDate: { jsonValue: { value: '2026-01-01' } },
  pageThumbnail: {
    jsonValue: {
      value: {
        src: '/default.jpg',
        alt: 'Default image',
        width: 800,
        height: 1000,
      },
    },
  },
  ...overrides,
});

export const makeListingProps = ({
  children = [],
  name = 'Lawyers',
  listingType,
  isEditing = false,
  styles,
}: {
  children?: ChildPageListingPage[];
  name?: string;
  listingType?: 'lawyers' | 'news' | 'locations';
  isEditing?: boolean;
  styles?: string;
} = {}): ChildPageListingProps => ({
  fields: {
    data: {
      datasource: {
        id: 'listing-page',
        name,
        displayName: name,
        url: { href: `/${name.toLowerCase().replace(/\s+/g, '-')}` },
        children: { results: children },
      },
    },
  },
  params: {
    ...(listingType ? { listingType } : {}),
    ...(styles ? { styles } : {}),
  },
  rendering: {
    componentName: 'ChildPageListing',
  },
  page: mockPage(isEditing),
});
