import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Default as ChildPageListing } from '@/components/child-page-listing/ChildPageListing';
import {
  makeListingPage,
  makeListingProps,
} from './child-page-listing.mock.props';

jest.mock('@/components/content-sdk/CompatibleLink', () => ({
  CompatibleLink: ({
    children,
    field,
    editable,
    className,
    prefetch,
    ...props
  }: React.PropsWithChildren<{
    field: { value: { href?: string } };
    editable?: boolean;
    className?: string;
    prefetch?: boolean;
  }> &
    React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={field.value.href}
      className={className}
      data-editable={String(editable)}
      data-prefetch={String(prefetch)}
      {...props}
    >
      {children}
    </a>
  ),
}));

describe('ChildPageListing', () => {
  it('renders direct children with generated links in tree order', () => {
    const first = makeListingPage({
      id: 'allan',
      name: 'Allan Kirk',
      url: { href: '/lawyers/allan-kirk' },
      pageHeaderTitle: { jsonValue: { value: 'Allan Kirk' } },
    });
    const second = makeListingPage({
      id: 'donna',
      name: 'Donna Welch',
      url: { path: '/lawyers/donna-welch' },
      pageHeaderTitle: { jsonValue: { value: 'Donna M. Welch' } },
    });

    render(
      <ChildPageListing {...makeListingProps({ children: [first, second] })} />,
    );

    expect(
      screen.getAllByRole('heading').map((item) => item.textContent),
    ).toEqual(['Allan Kirk', 'Donna M. Welch']);
    expect(screen.getByRole('link', { name: /Allan Kirk/i })).toHaveAttribute(
      'href',
      '/lawyers/allan-kirk',
    );
    expect(
      screen.getByRole('link', { name: /Donna M. Welch/i }),
    ).toHaveAttribute('href', '/lawyers/donna-welch');
  });

  it('sorts news and insights by display date descending', () => {
    const older = makeListingPage({
      id: 'older',
      name: 'Older insight',
      pageHeaderTitle: { jsonValue: { value: 'Older insight' } },
      pageDisplayDate: { jsonValue: { value: '2025-11-15' } },
    });
    const undated = makeListingPage({
      id: 'undated',
      name: 'Undated insight',
      pageHeaderTitle: { jsonValue: { value: 'Undated insight' } },
      pageDisplayDate: { jsonValue: { value: '' } },
    });
    const newest = makeListingPage({
      id: 'newest',
      name: 'Newest insight',
      pageHeaderTitle: { jsonValue: { value: 'Newest insight' } },
      pageDisplayDate: { jsonValue: { value: '2026-07-24' } },
    });

    render(
      <ChildPageListing
        {...makeListingProps({
          children: [older, undated, newest],
          name: 'News and Insights',
        })}
      />,
    );

    expect(
      screen.getAllByRole('heading').map((item) => item.textContent),
    ).toEqual(['Newest insight', 'Older insight', 'Undated insight']);
    expect(screen.getByText('July 24, 2026')).toBeInTheDocument();
  });

  it('uses metadata description before page summary and renders plain text', () => {
    const page = makeListingPage({
      metadataDescription: {
        jsonValue: { value: 'A concise &amp; useful listing description.' },
      },
      pageSummary: {
        jsonValue: { value: '<p>This longer summary is not selected.</p>' },
      },
    });

    render(<ChildPageListing {...makeListingProps({ children: [page] })} />);

    expect(
      screen.getByText('A concise & useful listing description.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('This longer summary is not selected.'),
    ).not.toBeInTheDocument();
  });

  it('falls back to page summary, display name, and a nested header image', () => {
    const page = makeListingPage({
      name: 'fallback-name',
      displayName: 'London Office',
      pageHeaderTitle: { jsonValue: { value: '' } },
      metadataDescription: { jsonValue: { value: '' } },
      pageSummary: {
        jsonValue: { value: '<p>Serving clients across Europe.</p>' },
      },
      pageThumbnail: undefined,
      contentFolders: {
        results: [
          {
            id: 'data-folder',
            items: {
              results: [
                {
                  id: 'header-datasource',
                  imageRequired: {
                    jsonValue: {
                      value: { src: '/london.jpg', alt: '' },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });

    render(
      <ChildPageListing
        {...makeListingProps({
          children: [page],
          name: 'Locations',
        })}
      />,
    );

    expect(screen.getByRole('heading')).toHaveTextContent('London Office');
    expect(
      screen.getByText('Serving clients across Europe.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/london.jpg');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'London Office');
  });

  it('prefers a page thumbnail to a nested header image', () => {
    const page = makeListingPage({
      pageThumbnail: {
        jsonValue: {
          value: { src: '/thumbnail.jpg', alt: 'Purpose-built thumbnail' },
        },
      },
      children: {
        results: [
          {
            id: 'header',
            imageRequired: {
              jsonValue: { value: { src: '/header.jpg', alt: 'Header' } },
            },
          },
        ],
      },
    });

    render(<ChildPageListing {...makeListingProps({ children: [page] })} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/thumbnail.jpg');
    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      'Purpose-built thumbnail',
    );
  });

  it('uses a compact horizontal, top-aligned portrait for lawyer cards', () => {
    const page = makeListingPage();

    render(<ChildPageListing {...makeListingProps({ children: [page] })} />);

    const link = screen.getByRole('link');
    const image = screen.getByRole('img');
    const media = image.parentElement;

    expect(link).toHaveClass('flex-row', 'items-start');
    expect(media).toHaveClass(
      'aspect-[4/5]',
      'w-24',
      'min-[360px]:w-28',
      'sm:w-32',
    );
    expect(image).toHaveClass('object-top');
  });

  it('keeps generated fields and links non-editable', () => {
    const page = makeListingPage();

    const { container } = render(
      <ChildPageListing {...makeListingProps({ children: [page] })} />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('data-editable', 'false');
    expect(
      container.querySelector('[contenteditable="true"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-sc-field-name]'),
    ).not.toBeInTheDocument();
  });

  it('returns nothing for an empty public listing', () => {
    const { container } = render(
      <ChildPageListing {...makeListingProps({ children: [] })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a selectable frame without editor-note copy for an empty editing listing', () => {
    render(
      <ChildPageListing
        {...makeListingProps({
          children: [],
          isEditing: true,
          styles: 'authored-style',
        })}
      />,
    );

    const frame = screen.getByTestId('child-page-listing-empty');
    expect(frame).toHaveClass('authored-style');
    expect(frame).toHaveTextContent('');
  });
});
