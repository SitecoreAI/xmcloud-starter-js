import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Default as SearchExperience,
  searchNwnPages,
} from '@/components/search-experience/SearchExperience';
import type { SearchExperienceProps } from '@/components/search-experience/search-experience.props';

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  usePathname: () => '/search',
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

const makeProps = (): SearchExperienceProps =>
  ({
    params: {},
    rendering: { componentName: 'SearchExperience' },
    page: { mode: { isEditing: false, isPreview: false } },
  }) as unknown as SearchExperienceProps;

describe('SearchExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('starts with accessible search controls and useful popular links', () => {
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
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute(
      'href',
      '/contact-us',
    );
    expect(
      screen.queryByRole('link', { name: /^Search$/ }),
    ).not.toBeInTheDocument();
  });

  it('loads a q parameter, filters the NW Natural page index, and links to the result', () => {
    mockSearchParams = new URLSearchParams({ q: 'rebates' });

    render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('rebates');
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 result for “rebates”',
    );
    expect(
      screen.getByRole('link', { name: 'Rebates & Offers' }),
    ).toHaveAttribute('href', '/ways-to-save/rebates-offers');
    expect(
      screen.queryByRole('link', { name: 'Pay My Bill' }),
    ).not.toBeInTheDocument();
  });

  it('ranks title matches ahead of description and keyword matches', () => {
    mockSearchParams = new URLSearchParams({ q: 'natural gas' });

    render(<SearchExperience {...makeProps()} />);

    const resultHeadings = screen.getAllByRole('heading', { level: 3 });
    expect(resultHeadings[0]).toHaveTextContent('Get Natural Gas');
    expect(resultHeadings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: 'Benefits of Natural Gas' }),
      ]),
    );
  });

  it('writes submitted terms to q state and clears the URL accessibly', () => {
    render(<SearchExperience {...makeProps()} />);

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'payment assistance' },
    });
    fireEvent.submit(screen.getByRole('search'));

    expect(mockReplace).toHaveBeenCalledWith('/search?q=payment+assistance', {
      scroll: false,
    });
    expect(
      screen.getByRole('link', { name: 'Payment Assistance' }),
    ).toHaveAttribute('href', '/account-billing/payment-assistance');

    mockReplace.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(mockReplace).toHaveBeenCalledWith('/search', { scroll: false });
  });

  it('shows a helpful no-results state without inventing a matching page', () => {
    mockSearchParams = new URLSearchParams({ q: 'solar panel installation' });

    render(<SearchExperience {...makeProps()} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '0 results for “solar panel installation”',
    );
    expect(
      screen.getByRole('heading', { name: 'We couldn’t find a match' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Contact us for help' }),
    ).toHaveAttribute('href', '/contact-us');
  });

  it('searches only the curated page index and never returns the search page itself', () => {
    const results = searchNwnPages('site search');

    expect(results.every((page) => page.path !== '/search')).toBe(true);
    expect(results.every((page) => page.path.startsWith('/'))).toBe(true);
  });

  it('finds the prepared winter, assistance, and paperless experiences', () => {
    expect(searchNwnPages('winter service advisory')[0]?.path).toBe(
      '/safety/winter-service-advisory',
    );
    expect(searchNwnPages('financial assistance')[0]?.path).toBe(
      '/account-billing/payment-assistance',
    );
    expect(searchNwnPages('paperless billing')[0]?.path).toBe(
      '/account-billing',
    );
  });
});
