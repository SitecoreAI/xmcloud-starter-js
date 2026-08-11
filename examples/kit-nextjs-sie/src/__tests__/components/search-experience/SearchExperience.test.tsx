import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as SearchExperience,
  parseSearchConfiguration,
  searchSiePages,
} from '@/components/search-experience/SearchExperience';
import type { SearchExperienceProps } from '@/components/search-experience/search-experience.props';

const mockReplace = jest.fn();
const mockUseSearch = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  usePathname: () => '/search',
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/search/use-sitecore-search', () => ({
  useSitecoreSearch: (options: unknown) => mockUseSearch(options),
}));

const successfulSearchState = {
  results: [
    {
      sc_item_id: 'payment-options',
      title: null,
      description: 'Review convenient ways to pay your SiEnergy bill.',
      sc_url:
        'https://sienergy-sitecoreai-demo.vercel.app/payment-options-locations',
    },
  ],
  total: 1,
  totalPages: 1,
  status: 'success',
  isLoading: false,
  isSuccess: true,
  isError: false,
  isPreviousData: false,
  error: null,
};

const makeProps = (
  overrides: Partial<SearchExperienceProps> = {},
): SearchExperienceProps =>
  ({
    params: { pageSize: 8 },
    fields: {
      search: {
        value: JSON.stringify({
          searchIndex: 'sienergy-site-search',
          fieldsMapping: {
            title: 'title',
            description: 'description',
            link: 'sc_url',
          },
        }),
      },
    },
    rendering: { componentName: 'SearchExperience' },
    page: {
      locale: 'en',
      mode: { isEditing: false, isPreview: false },
    },
    ...overrides,
  }) as unknown as SearchExperienceProps;

describe('SearchExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUseSearch.mockReturnValue(successfulSearchState);
  });

  it('starts with accessible search controls and useful popular links without querying Edge', () => {
    render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', {
        name: 'What can we help you find?',
      }),
    ).toHaveValue('');
    expect(
      screen.getByRole('heading', { name: 'Popular pages' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Browse popular SiEnergy pages.',
    );
    expect(
      screen.getByRole('link', { name: 'Payment Options & Locations' }),
    ).toHaveAttribute('href', '/payment-options-locations');
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('uses the Search Configuration mapping and sends URL queries to SitecoreAI Edge Search', () => {
    mockSearchParams = new URLSearchParams({ q: 'pay bil' });

    render(<SearchExperience {...makeProps()} />);

    expect(mockUseSearch).toHaveBeenLastCalledWith({
      searchIndexId: 'sienergy-site-search',
      locale: 'en',
      query: 'pay bil',
      page: 1,
      pageSize: 8,
      enabled: true,
      keepPreviousData: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 result for “pay bil”',
    );
    expect(
      screen.getByRole('link', { name: 'Payment Options & Locations' }),
    ).toHaveAttribute(
      'href',
      'https://sienergy-sitecoreai-demo.vercel.app/payment-options-locations',
    );
    expect(
      screen.getByText('Review convenient ways to pay your SiEnergy bill.'),
    ).toBeInTheDocument();
  });

  it('submits and clears encoded q state accessibly', () => {
    render(<SearchExperience {...makeProps()} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'payment & service' },
    });
    fireEvent.submit(screen.getByRole('search'));

    expect(mockReplace).toHaveBeenCalledWith('/search?q=payment+%26+service', {
      scroll: false,
    });
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'payment & service', enabled: true }),
    );

    mockReplace.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/search', { scroll: false });
  });

  it('shows loading, no-results, and unavailable states without exposing errors', () => {
    mockSearchParams = new URLSearchParams({ q: 'solar panels' });
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      totalPages: 0,
      isSuccess: false,
      isLoading: true,
      status: 'loading',
    });
    const { rerender } = render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching for “solar panels”…',
    );

    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      totalPages: 0,
    });
    rerender(<SearchExperience {...makeProps()} />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t find a match' }),
    ).toBeInTheDocument();

    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      totalPages: 0,
      isSuccess: false,
      isError: true,
      status: 'error',
      error: new Error('Private Edge endpoint details'),
    });
    rerender(<SearchExperience {...makeProps()} />);
    expect(
      screen.getByRole('heading', {
        name: 'Search is temporarily unavailable',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Private Edge endpoint details'),
    ).not.toBeInTheDocument();
  });

  it('supports an authored configuration JSON or a direct source id', () => {
    expect(
      parseSearchConfiguration(
        '{"searchIndex":"source-123","fieldsMapping":{"title":"title"}}',
      ),
    ).toEqual({
      searchIndex: 'source-123',
      fieldsMapping: { title: 'title' },
    });
    expect(parseSearchConfiguration('source-456')).toEqual({
      searchIndex: 'source-456',
      fieldsMapping: {},
    });
    expect(parseSearchConfiguration(undefined, 'source-789')).toEqual({
      searchIndex: 'source-789',
      fieldsMapping: {},
    });
  });

  it('keeps the curated metadata helper isolated from the public Search page', () => {
    const results = searchSiePages('site search');

    expect(results.every((page) => page.path !== '/search')).toBe(true);
    expect(results.every((page) => page.path.startsWith('/'))).toBe(true);
  });
});
