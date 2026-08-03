import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { event } from '@sitecore-content-sdk/events';
import { Default as SearchExperience } from '@/components/search-experience/SearchExperience';
import { makeSearchProps, searchResult } from './search-experience.mock.props';

const mockReplace = jest.fn();
const mockUseSearch = jest.fn();
const mockUseSearchParams = jest.fn();
let mockQuery = 'national security';

jest.mock('next/navigation', () => ({
  usePathname: () => '/site-search',
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock('@sitecore-content-sdk/nextjs/search', () => ({
  useSearch: (options: unknown) => mockUseSearch(options),
}));

jest.mock('@sitecore-content-sdk/events', () => ({
  event: jest.fn().mockResolvedValue(null),
}));

const successfulSearchState = {
  results: [searchResult],
  total: 1,
  totalPages: 1,
  status: 'success',
  isLoading: false,
  isSuccess: true,
  isError: false,
  isPreviousData: false,
  error: null,
};

describe('SearchExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockQuery = 'national security';
    mockUseSearchParams.mockImplementation(
      () => new URLSearchParams({ q: mockQuery }),
    );
    mockUseSearch.mockReturnValue(successfulSearchState);
  });

  it('renders a stable loading shell when URL state suspends during prerendering', () => {
    mockUseSearchParams.mockImplementation(() => {
      throw new Promise(() => undefined);
    });

    render(<SearchExperience {...makeSearchProps()} />);

    expect(screen.getByLabelText('Loading search results')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('uses the q URL parameter and renders mapped legal content as an accessible result', () => {
    render(<SearchExperience {...makeSearchProps()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('national security');
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        searchIndexId: 'kirkland-site-search',
        query: 'national security',
        page: 1,
        pageSize: 6,
        keepPreviousData: true,
      }),
    );
    expect(
      screen.getByRole('heading', {
        name: 'UK National Security and Investment Act Update',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Practical guidance for acquisitions involving sensitive UK sectors.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mark Gardner · Antitrust & Competition · London'),
    ).toBeInTheDocument();
    expect(screen.getByText('July 24, 2026')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      'London skyline at dusk',
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/News-and-Insights/UK-National-Security-and-Investment-Act-Update',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 results for “national security”',
    );
  });

  it('writes an encoded q parameter after the input debounce and submits immediately', () => {
    jest.useFakeTimers();
    render(<SearchExperience {...makeSearchProps()} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'private equity & funds' },
    });

    expect(mockReplace).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(400));
    expect(mockReplace).toHaveBeenCalledWith(
      '/site-search?q=private+equity+%26+funds',
      { scroll: false },
    );

    mockReplace.mockClear();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'restructuring' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(mockReplace).toHaveBeenCalledWith('/site-search?q=restructuring', {
      scroll: false,
    });
  });

  it('paginates results and exposes the active page to assistive technology', () => {
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      total: 32,
      totalPages: 6,
    });

    render(<SearchExperience {...makeSearchProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows a WYSIWYG skeleton in editing and preview without querying', () => {
    const { rerender } = render(
      <SearchExperience {...makeSearchProps({ isEditing: true })} />,
    );

    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getAllByTestId('search-result-skeleton')).toHaveLength(3);
    expect(screen.getByRole('searchbox')).toHaveAttribute('readonly');
    expect(
      screen.queryByText(/editor|placeholder|configure/i),
    ).not.toBeInTheDocument();

    rerender(<SearchExperience {...makeSearchProps({ isPreview: true })} />);
    expect(mockUseSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('shows a polished unavailable state for blank public configuration but keeps the authoring preview', () => {
    const publicProps = makeSearchProps();
    publicProps.fields = { search: { value: '' } };

    const { rerender } = render(<SearchExperience {...publicProps} />);

    expect(
      screen.getByRole('heading', {
        name: 'Search is temporarily unavailable',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('search-result-skeleton'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    const editingProps = makeSearchProps({ isEditing: true });
    editingProps.fields = { search: { value: '' } };
    rerender(<SearchExperience {...editingProps} />);

    expect(screen.getAllByTestId('search-result-skeleton')).toHaveLength(3);
    expect(
      screen.queryByRole('heading', {
        name: 'Search is temporarily unavailable',
      }),
    ).not.toBeInTheDocument();
  });

  it('renders useful empty and error states with recovery actions', () => {
    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      totalPages: 0,
    });
    const { rerender } = render(<SearchExperience {...makeSearchProps()} />);

    expect(
      screen.getByRole('heading', { name: 'No results found' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear search' })[1]);
    expect(mockReplace).toHaveBeenCalledWith('/site-search', {
      scroll: false,
    });

    mockUseSearch.mockReturnValue({
      ...successfulSearchState,
      results: [],
      total: 0,
      totalPages: 0,
      status: 'error',
      isSuccess: false,
      isError: true,
      error: new Error('Private endpoint details'),
    });
    rerender(<SearchExperience {...makeSearchProps()} />);

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

  it('localizes interface copy for the configured page language', () => {
    mockQuery = '';
    render(<SearchExperience {...makeSearchProps({ locale: 'fr-FR' })} />);

    expect(
      screen.getByRole('heading', { name: 'Rechercher' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rechercher' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Rechercher des avocats, des pratiques, des bureaux et des analyses',
    );
  });

  it('records viewed and clicked search interactions outside authoring', async () => {
    const originalNodeEnvironment = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      configurable: true,
      value: 'production',
    });

    try {
      render(<SearchExperience {...makeSearchProps()} />);

      await waitFor(() =>
        expect(event).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'search',
            core: expect.objectContaining({
              interactionType: 'viewed',
              keyword: 'national security',
              nullResults: false,
            }),
          }),
        ),
      );

      fireEvent.click(screen.getByRole('link'));
      expect(event).toHaveBeenLastCalledWith(
        expect.objectContaining({
          core: expect.objectContaining({ interactionType: 'clicked' }),
        }),
      );
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        configurable: true,
        value: originalNodeEnvironment,
      });
    }
  });
});
