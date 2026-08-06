import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromoImageDefault } from '@/components/promo-image/PromoImageDefault.dev';
import { mockPromoImageProps } from './promo-image.mock.props';

// Mock dependencies
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: jest.fn(({ field, tag = 'span', className }) => {
    const Tag = tag as keyof JSX.IntrinsicElements;
    return React.createElement(
      Tag,
      { className, 'data-testid': 'text-component' },
      field?.value,
    );
  }),
  RichText: jest.fn(({ field, className }) => (
    <div
      className={className}
      data-testid="richtext-component"
      dangerouslySetInnerHTML={{ __html: field?.value }}
    />
  )),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: jest.fn(({ componentName }) => (
    <div data-testid="no-data-fallback">No Data: {componentName}</div>
  )),
}));

jest.mock('@/components/animated-section/AnimatedSection.dev', () => ({
  Default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  ButtonBase: ({
    buttonLink,
  }: {
    buttonLink: { value: { text: string; href: string } };
  }) => (
    <button data-testid="button" data-href={buttonLink.value.href}>
      {buttonLink.value.text}
    </button>
  ),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({ image }: { image: { value: { src: string; alt: string } } }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="image-wrapper"
      src={image.value.src}
      alt={image.value.alt}
    />
  ),
}));

jest.mock('@/hooks/use-match-media', () => ({
  useMatchMedia: jest.fn(() => false),
}));

describe('PromoImageDefault', () => {
  const authoredFields = {
    image: {
      value: {
        src: 'https://dam.example/home-comfort.jpg',
        alt: 'NW Natural technician servicing home equipment',
      },
    },
    heading: { value: 'Make home comfort work harder' },
    description: {
      value: '<p>Explore practical ways to care for your equipment.</p>',
    },
    link: {
      value: {
        href: '/ways-to-save/rebates-offers',
        text: 'Explore rebates and offers',
        linktype: 'internal' as const,
      },
    },
  };

  it('renders authored content, image, and CTA verbatim', () => {
    render(
      <PromoImageDefault {...mockPromoImageProps} fields={authoredFields} />,
    );

    expect(
      screen.getByText('Make home comfort work harder'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Explore practical ways to care for your equipment.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('button')).toHaveTextContent('Explore rebates');
    expect(screen.getByTestId('button')).toHaveAttribute(
      'data-href',
      '/ways-to-save/rebates-offers',
    );
    const image = screen.getByTestId('image-wrapper');
    expect(image).toHaveAttribute(
      'src',
      'https://dam.example/home-comfort.jpg',
    );
    expect(image).toHaveAttribute(
      'alt',
      'NW Natural technician servicing home equipment',
    );
  });

  it('does not insert an image for visitors when the image field is empty', () => {
    render(
      <PromoImageDefault
        {...mockPromoImageProps}
        fields={{ ...authoredFields, image: { value: {} } }}
      />,
    );

    expect(screen.queryByTestId('image-wrapper')).not.toBeInTheDocument();
    expect(
      screen.getByText('Make home comfort work harder'),
    ).toBeInTheDocument();
  });

  it('preserves the empty image field for Page Builder', () => {
    render(
      <PromoImageDefault
        {...mockPromoImageProps}
        isPageEditing
        fields={{ ...authoredFields, image: { value: {} } }}
      />,
    );

    expect(screen.getByTestId('image-wrapper')).not.toHaveAttribute('src');
  });

  it('does not render a completely empty assigned datasource to visitors', () => {
    const { container } = render(
      <PromoImageDefault
        {...mockPromoImageProps}
        fields={{
          image: { value: {} },
          heading: { value: '' },
          description: { value: '' },
          link: { value: { href: '', text: '' } },
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('does not expose a missing-datasource warning to visitors', () => {
    const { container } = render(
      <PromoImageDefault
        {...mockPromoImageProps}
        fields={undefined as never}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the missing-datasource hint to Page Builder editors', () => {
    render(
      <PromoImageDefault
        {...mockPromoImageProps}
        fields={undefined as never}
        isPageEditing
      />,
    );

    expect(screen.getByTestId('no-data-fallback')).toHaveTextContent(
      'No Data: Promo Image',
    );
  });
});
