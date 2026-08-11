import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Default as SearchExperience } from '@/components/search-experience/SearchExperience';
import type { SearchExperienceProps } from '@/components/search-experience/search-experience.props';

const mockReplace = jest.fn();
const mockUseSearch = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockPathname = '/search';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/lib/search/use-locale-search', () => ({
  useLocaleSearch: (options: unknown) => mockUseSearch(options),
}));

const successfulSearchState = {
  results: [
    {
      sc_item_id: 'payment-assistance',
      title: 'Payment Assistance | NW Natural',
      description:
        '<p>Find help paying your bill and flexible payment options.</p>',
      sc_url:
        'https://nwn-sitecoreai-demo.vercel.app/account-billing/payment-assistance',
    },
  ],
  total: 1,
  status: 'success',
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
};

const makeProps = (
  locale = 'en',
  {
    configured = true,
    isEditing = false,
    isPreview = false,
  }: {
    configured?: boolean;
    isEditing?: boolean;
    isPreview?: boolean;
  } = {},
): SearchExperienceProps =>
  ({
    fields: {
      search: {
        value: configured
          ? JSON.stringify({
              searchIndex: 'nwn-site-search',
              fieldsMapping: {
                title: 'title',
                description: 'description',
                link: 'sc_url',
              },
            })
          : '',
      },
    },
    params: { pageSize: '20' },
    rendering: { componentName: 'SearchExperience' },
    page: { locale, mode: { isEditing, isPreview } },
  }) as unknown as SearchExperienceProps;

describe('SearchExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockSearchParams = new URLSearchParams();
    mockPathname = '/search';
    mockUseSearch.mockReturnValue(successfulSearchState);
  });

  it('starts with accessible controls and popular links without querying Edge', () => {
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
      'Browse popular NW Natural pages.',
    );
    expect(screen.getByRole('link', { name: 'Pay My Bill' })).toHaveAttribute(
      'href',
      '/account-billing/pay-my-bill',
    );
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchIndexId: 'nwn-site-search',
        locale: 'en',
        query: '',
        enabled: false,
      }),
    );
  });

  it('queries SitecoreAI Edge with the Search Configuration and renders mapped results', () => {
    mockSearchParams = new URLSearchParams({ q: 'payment help' });

    render(<SearchExperience {...makeProps()} />);

    expect(mockUseSearch).toHaveBeenLastCalledWith({
      searchIndexId: 'nwn-site-search',
      locale: 'en',
      query: 'payment help',
      pageSize: 20,
      enabled: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 result for “payment help”',
    );
    expect(
      screen.getByRole('link', { name: 'Payment Assistance | NW Natural' }),
    ).toHaveAttribute(
      'href',
      'https://nwn-sitecoreai-demo.vercel.app/account-billing/payment-assistance',
    );
    expect(
      screen.getByText(
        'Find help paying your bill and flexible payment options.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('View page').closest('a')).toHaveAttribute(
      'href',
      'https://nwn-sitecoreai-demo.vercel.app/account-billing/payment-assistance',
    );
  });

  it('submits and clears queries while keeping URL state accessible', () => {
    render(<SearchExperience {...makeProps()} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'payment assistance' },
    });
    fireEvent.submit(screen.getByRole('search'));

    expect(mockReplace).toHaveBeenCalledWith('/search?q=payment+assistance', {
      scroll: false,
    });
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'payment assistance', enabled: true }),
    );

    mockReplace.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/search', { scroll: false });
  });

  it('shows a useful zero-results state from SitecoreAI without local fallback results', () => {
    mockSearchParams = new URLSearchParams({ q: 'solar panel installation' });
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
    });

    render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '0 results for “solar panel installation”',
    );
    expect(
      screen.getByRole('heading', { name: 'We couldn’t find a match' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Pay My Bill' }),
    ).not.toBeInTheDocument();
  });

  it('makes missing or failed configuration visible instead of silently using local search', () => {
    const { rerender } = render(
      <SearchExperience {...makeProps('en', { configured: false })} />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Search is temporarily unavailable',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Popular pages')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();

    mockSearchParams = new URLSearchParams({ q: 'rebates' });
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      status: 'error',
      isSuccess: false,
      isError: true,
      error: new Error('Private endpoint details'),
    });
    rerender(<SearchExperience {...makeProps()} />);

    expect(
      screen.getByRole('heading', {
        name: 'Search is temporarily unavailable',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Private endpoint details'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });

  it('uses the Spanish source locale and preserves indexed Spanish URLs', () => {
    mockPathname = '/es-MX/search';
    mockSearchParams = new URLSearchParams({ q: 'ayuda de pago' });
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [
        {
          sc_item_id: 'asistencia',
          title: 'Asistencia para el pago',
          description: 'Encuentre ayuda para pagar su factura.',
          sc_url:
            'https://nwn-sitecoreai-demo.vercel.app/es-MX/account-billing/payment-assistance',
        },
      ],
    });

    render(<SearchExperience {...makeProps('es-MX')} />);

    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: 'es-MX', query: 'ayuda de pago' }),
    );
    expect(
      screen.getByRole('link', { name: 'Asistencia para el pago' }),
    ).toHaveAttribute(
      'href',
      'https://nwn-sitecoreai-demo.vercel.app/es-MX/account-billing/payment-assistance',
    );
  });

  it('shows a stable authoring preview without calling the public search endpoint', () => {
    mockSearchParams = new URLSearchParams({ q: 'rebates' });

    render(<SearchExperience {...makeProps('en', { isEditing: true })} />);

    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute('readonly');
    expect(screen.getAllByTestId('search-result-skeleton')).toHaveLength(2);
  });
});
