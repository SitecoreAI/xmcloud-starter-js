import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ImageField } from '@sitecore-content-sdk/nextjs';
import { FooterLogo } from '@/components/global-footer/footer-logo.util';
import { mockGlobalFooterProps } from './global-footer.mock.props';

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  __esModule: true,
  Default: ({
    image,
    alt,
    wrapperClass,
  }: {
    image?: ImageField;
    alt?: string;
    wrapperClass?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="footer-logo-image"
      src={image?.value?.src}
      alt={alt}
      className={wrapperClass}
    />
  ),
}));

describe('FooterLogo', () => {
  it('renders the configured footer logo', () => {
    const logo: ImageField = {
      value: {
        src: '/kirkland-footer-logo.svg',
        alt: 'Kirkland & Ellis',
      },
    };

    const { container } = render(
      <FooterLogo
        logo={logo}
        isPageEditing={false}
        page={mockGlobalFooterProps.page}
      />,
    );

    expect(
      container.querySelector('[data-component="footer-logo"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('footer-logo-image')).toHaveAttribute(
      'src',
      '/kirkland-footer-logo.svg',
    );
  });

  it('does not reserve empty logo space outside editing mode', () => {
    const { container } = render(
      <FooterLogo
        logo={{ value: {} }}
        isPageEditing={false}
        page={mockGlobalFooterProps.page}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('keeps the empty logo field available in Page Builder', () => {
    const { container } = render(
      <FooterLogo
        logo={{ value: {} }}
        isPageEditing={true}
        page={mockGlobalFooterProps.page}
      />,
    );

    expect(
      container.querySelector('[data-component="footer-logo"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('footer-logo-image')).toHaveClass(
      'border-dashed',
    );
  });
});
