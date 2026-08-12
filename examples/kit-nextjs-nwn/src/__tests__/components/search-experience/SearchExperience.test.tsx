import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

const idleSearchState = {
  results: [],
  total: 0,
  status: 'idle',
  isLoading: false,
  isSuccess: false,
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
    mockUseSearch.mockImplementation((options: { enabled?: boolean }) =>
      options.enabled ? successfulSearchState : idleSearchState,
    );
  });

  it('starts with accessible controls and popular links without querying Edge', () => {
    render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
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
    expect(mockUseSearch).toHaveBeenCalledWith(
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

    expect(mockUseSearch).toHaveBeenCalledWith({
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

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'payment assistance' },
    });
    fireEvent.submit(screen.getByRole('search'));

    expect(mockReplace).toHaveBeenCalledWith('/search?q=payment+assistance', {
      scroll: false,
    });
    expect(mockUseSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'payment assistance', enabled: true }),
    );

    mockReplace.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('combobox')).toHaveValue('');
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

    expect(mockUseSearch).toHaveBeenCalledWith(
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

    expect(mockUseSearch).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('readonly');
    expect(screen.getAllByTestId('search-result-skeleton')).toHaveLength(2);
  });

  it('shows debounced SitecoreAI result suggestions after two characters', () => {
    jest.useFakeTimers();
    render(<SearchExperience {...makeProps()} />);

    const input = screen.getByRole('combobox', {
      name: 'What can we help you find?',
    });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: 'p' } });

    act(() => jest.advanceTimersByTime(300));
    expect(mockUseSearch).not.toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 5, query: 'p', enabled: true }),
    );

    fireEvent.change(input, { target: { value: 'payment' } });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(275));

    expect(mockUseSearch).toHaveBeenCalledWith({
      searchIndexId: 'nwn-site-search',
      locale: 'en',
      query: 'payment',
      pageSize: 5,
      enabled: true,
    });
    expect(
      screen.getByRole('listbox', { name: 'Suggested pages' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Payment Assistance/ }),
    ).toHaveAttribute(
      'href',
      'https://nwn-sitecoreai-demo.vercel.app/account-billing/payment-assistance',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation and dismisses suggestions with Escape', () => {
    jest.useFakeTimers();
    render(<SearchExperience {...makeProps()} />);

    const input = screen.getByRole('combobox');
    act(() => input.focus());
    fireEvent.change(input, { target: { value: 'payment' } });
    act(() => jest.advanceTimersByTime(275));

    const option = screen.getByRole('option', { name: /Payment Assistance/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    expect(option).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('payment');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});
