import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromoImageDefault } from '@/components/promo-image/PromoImageDefault.dev';
import { nwnImageSources } from '@/lib/nwn-static-assets';
import {
  mockPromoImageProps,
  mockPromoImagePropsNoLink,
} from './promo-image.mock.props';

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
  it('replaces legacy vehicle copy with the NW Natural company story', () => {
    render(<PromoImageDefault {...mockPromoImageProps} />);

    expect(
      screen.getByText('Rooted in the communities we serve.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/For more than 160 years, NW Natural/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Save Lives with Advanced Emergency Vehicles'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('button')).toHaveTextContent(
      'Get to know NW Natural',
    );
    expect(screen.getByTestId('button')).toHaveAttribute(
      'data-href',
      '/about-us/company-overview',
    );
  });

  it('replaces a legacy vehicle image with the local community asset', () => {
    render(<PromoImageDefault {...mockPromoImageProps} />);

    const image = screen.getByTestId('image-wrapper');
    expect(image).toHaveAttribute('src', nwnImageSources.communityTreePlanting);
    expect(image).toHaveAttribute(
      'alt',
      'NW Natural volunteers planting trees with community members',
    );
  });

  it('provides the company-story CTA when a legacy promo link is empty', () => {
    render(<PromoImageDefault {...mockPromoImagePropsNoLink} />);

    expect(
      screen.getByText('Rooted in the communities we serve.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/For more than 160 years, NW Natural/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('button')).toHaveTextContent(
      'Get to know NW Natural',
    );
  });

  it('uses a relevant home-comfort image for an authored promo without one', () => {
    render(
      <PromoImageDefault
        {...mockPromoImageProps}
        fields={{
          image: { value: {} },
          heading: { value: 'Make home comfort work harder' },
          description: {
            value: '<p>Explore practical ways to care for your equipment.</p>',
          },
          link: {
            value: {
              href: '/ways-to-save/rebates-offers',
              text: 'Explore rebates and offers',
              linktype: 'internal',
            },
          },
        }}
      />,
    );

    expect(screen.getByTestId('image-wrapper')).toHaveAttribute(
      'src',
      nwnImageSources.rebatesFurnace,
    );
    expect(screen.getByTestId('image-wrapper')).toHaveAttribute(
      'alt',
      'High-efficiency natural gas furnace installed in a home',
    );
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
