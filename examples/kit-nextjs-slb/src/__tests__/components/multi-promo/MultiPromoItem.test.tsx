import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MultiPromoItemProps } from '@/components/multi-promo/multi-promo.props';
import { Default as MultiPromoItem } from '@/components/multi-promo/MultiPromoItem.dev';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    className,
  }: {
    field?: { value?: string };
    tag?: string;
    className?: string;
  }) => React.createElement(tag, { className }, field?.value || ''),
  RichText: ({
    field,
    className,
  }: {
    field?: { value?: string };
    className?: string;
  }) => (
    <div
      data-testid="item-description"
      className={className}
      dangerouslySetInnerHTML={{ __html: field?.value || '' }}
    />
  ),
  Link: ({
    field,
  }: {
    field?: { value?: { href?: string; text?: string } };
  }) => <a href={field?.value?.href}>{field?.value?.text}</a>,
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
    className,
    wrapperClass,
  }: {
    image?: { value?: { src?: string; alt?: string } };
    className?: string;
    wrapperClass?: string;
  }) => (
    <div data-testid="item-image-wrapper" className={wrapperClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image?.value?.src}
        alt={image?.value?.alt}
        className={className}
      />
    </div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="item-link" className={className}>
      {children}
    </div>
  ),
}));

const props: MultiPromoItemProps = {
  heading: { jsonValue: { value: 'Biodiversity' } },
  description: {
    jsonValue: {
      value:
        '<p>Protect and restore ecosystems through site-specific action.</p>',
    },
  },
  image: {
    jsonValue: {
      value: {
        src: '/images/biodiversity.jpg',
        alt: 'Native habitat near an energy operation',
        width: 1200,
        height: 900,
      },
    },
  },
  link: {
    jsonValue: {
      value: {
        href: '/sustainability/nature-and-responsible-operations',
        text: 'Explore biodiversity',
      },
    },
  },
};

describe('MultiPromoItem', () => {
  it('renders the queried child description as editable rich text', () => {
    render(<MultiPromoItem {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Biodiversity' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('item-description')).toHaveTextContent(
      'Protect and restore ecosystems through site-specific action.',
    );
  });

  it('uses a sharp editorial image treatment', () => {
    render(<MultiPromoItem {...props} />);

    expect(screen.getByTestId('item-image-wrapper')).toHaveClass(
      'overflow-hidden',
    );
    expect(screen.getByRole('img')).toHaveClass('rounded-none', 'object-cover');
    expect(screen.getByRole('img')).not.toHaveClass('rounded-3xl');
  });

  it('keeps an empty description field visible while editing', () => {
    render(
      <MultiPromoItem
        {...props}
        isPageEditing
        description={{ jsonValue: { value: '' } }}
      />,
    );

    expect(screen.getByTestId('item-description')).toBeInTheDocument();
  });

  it('hides intentional empty related-card image placeholders while editing', () => {
    render(
      <MultiPromoItem
        {...props}
        isPageEditing
        presentation="related"
        image={{ jsonValue: { value: {} } }}
      />,
    );

    expect(screen.queryByTestId('item-image-wrapper')).not.toBeInTheDocument();
  });

  it('keeps empty image placeholders available for other cards while editing', () => {
    render(
      <MultiPromoItem
        {...props}
        isPageEditing
        presentation="card-grid"
        image={{ jsonValue: { value: {} } }}
      />,
    );

    expect(screen.getByTestId('item-image-wrapper')).toBeInTheDocument();
  });

  it('keeps an empty optional link out of the editing canvas', () => {
    render(
      <MultiPromoItem
        {...props}
        isPageEditing
        link={{ jsonValue: { value: {} } }}
      />,
    );

    expect(screen.queryByTestId('item-link')).not.toBeInTheDocument();
  });
});
