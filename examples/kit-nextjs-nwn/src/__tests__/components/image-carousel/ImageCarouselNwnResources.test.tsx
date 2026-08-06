import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';
import { ImageCarouselNwnResources } from '@/components/image-carousel/ImageCarouselNwnResources.dev';
import type { ImageCarouselProps } from '@/components/image-carousel/image-carousel.props';

jest.mock('lucide-react', () => {
  const Icon = (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props} />
  );
  return { ChevronLeft: Icon, ChevronRight: Icon };
});

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    ...props
  }: {
    field?: { value?: string };
    tag?: string;
  }) => React.createElement(tag, props, field?.value || ''),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
  }: {
    image: { value?: { src?: string; alt?: string } };
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image?.value?.src} alt={image?.value?.alt || ''} />
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  ButtonBase: ({
    buttonLink,
  }: {
    buttonLink: { value?: { href?: string; text?: string } };
  }) => <a href={buttonLink?.value?.href}>{buttonLink?.value?.text}</a>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/image-carousel/ImageCarouselEditMode.dev', () => ({
  ImageCarouselEditMode: () => <div data-testid="image-carousel-edit-mode" />,
}));

const page = {
  mode: {
    isEditing: false,
    isPreview: false,
    isNormal: true,
    name: 'normal',
    designLibrary: { isVariantGeneration: false },
    isDesignLibrary: false,
  },
  layout: { sitecore: { context: {}, route: null } },
  locale: 'en',
} as Page;

const props = {
  fields: {
    data: {
      datasource: {
        title: { jsonValue: { value: 'Explore our vehicles' } },
        imageItems: { results: [] },
      },
    },
  },
  params: {},
  rendering: { componentName: 'ImageCarousel' },
  page,
  isPageEditing: false,
} as ImageCarouselProps;

describe('ImageCarouselNwnResources', () => {
  it('replaces starter content with NW Natural customer resources', () => {
    render(<ImageCarouselNwnResources {...props} />);

    expect(
      screen.getByRole('heading', {
        name: 'Practical resources for every customer.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Call 811 before you dig' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Call 811 before you dig')).toHaveAttribute(
      'src',
      '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
    );
    expect(
      screen.getByRole('link', { name: 'Plan a safe project' }),
    ).toHaveAttribute('href', '/safety/call-before-you-dig');
  });

  it('navigates through the customer resource slides', () => {
    render(<ImageCarouselNwnResources {...props} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Next customer resource' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Payment assistance' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Explore assistance' }),
    ).toHaveAttribute('href', '/account-billing/payment-assistance');
  });
});
