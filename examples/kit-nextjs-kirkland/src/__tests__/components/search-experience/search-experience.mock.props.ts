import type { Page } from '@sitecore-content-sdk/nextjs';
import type {
  SearchExperienceProps,
  SearchResultDocument,
} from '@/components/search-experience/search-experience.props';

export const searchResult: SearchResultDocument = {
  sc_item_id: 'insight-1',
  result_title: 'UK National Security and Investment Act Update',
  result_description:
    '<p>Practical guidance for acquisitions involving sensitive UK sectors.</p>',
  result_url:
    '/News-and-Insights/UK-National-Security-and-Investment-Act-Update',
  result_type: 'Insight',
  result_image: JSON.stringify({
    src: '/assets/kirkland/uk-national-security.jpg',
    alt: 'London skyline at dusk',
  }),
  result_author: 'Mark Gardner',
  result_practice: 'Antitrust & Competition',
  result_office: 'London',
  result_date: '2026-07-24',
  result_tags: ['National Security', 'Mergers & Acquisitions'],
};

export const makeSearchPage = ({
  locale = 'en',
  isEditing = false,
  isPreview = false,
}: {
  locale?: string;
  isEditing?: boolean;
  isPreview?: boolean;
} = {}): Page =>
  ({
    siteName: 'kit-nextjs-kirkland',
    locale,
    mode: {
      isEditing,
      isPreview,
      isNormal: !isEditing && !isPreview,
      name: isEditing ? 'edit' : isPreview ? 'preview' : 'normal',
      designLibrary: { isVariantGeneration: false },
      isDesignLibrary: false,
    },
    layout: {
      sitecore: {
        context: {},
        route: {
          name: 'Site Search',
          itemLanguage: locale,
        },
      },
    },
  }) as Page;

export const makeSearchProps = ({
  locale = 'en',
  isEditing = false,
  isPreview = false,
  columns = '1',
}: {
  locale?: string;
  isEditing?: boolean;
  isPreview?: boolean;
  columns?: string;
} = {}): SearchExperienceProps => ({
  fields: {
    search: {
      value: JSON.stringify({
        searchIndex: 'kirkland-site-search',
        fieldsMapping: {
          title: 'result_title',
          description: 'result_description',
          link: 'result_url',
          images: 'result_image',
          type: 'result_type',
          tags: 'result_tags',
          author: 'result_author',
          practice: 'result_practice',
          office: 'result_office',
          date: 'result_date',
        },
      }),
    },
  },
  params: {
    columns,
    pageSize: '6',
    RenderingIdentifier: 'site-search-component',
  },
  rendering: {
    componentName: 'SearchExperience',
    uid: 'search-rendering-uid',
  },
  page: makeSearchPage({ locale, isEditing, isPreview }),
});
