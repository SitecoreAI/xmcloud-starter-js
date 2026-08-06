import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ImageField } from '@sitecore-content-sdk/nextjs';
import ClientImage from '@/components/image/ImageWrapper.client';

jest.mock('framer-motion', () => ({
  useInView: () => false,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    placeholder,
    blurDataURL,
  }: {
    src?: string;
    placeholder?: string;
    blurDataURL?: string;
  }) => (
    <div
      data-testid="next-image"
      data-src={src}
      data-placeholder={placeholder}
      data-blur-data-url={blurDataURL}
    />
  ),
}));

function imageField(src: string, blurDataURL?: string): ImageField {
  return {
    value: {
      src,
      alt: '',
      width: 1200,
      height: 800,
      ...(blurDataURL ? { blurDataURL } : {}),
    },
  } as ImageField;
}

describe('ImageWrapper.client blur placeholder', () => {
  it.each([
    '/assets/nwn-home-hero.jpg',
    'https://images.example.com/nwn-home-hero.jpg',
  ])('does not reuse the full image URL as blur data for %s', (src) => {
    render(<ClientImage image={imageField(src)} />);

    const image = screen.getByTestId('next-image');
    expect(image).not.toHaveAttribute('data-placeholder');
    expect(image).not.toHaveAttribute('data-blur-data-url');
  });

  it('ignores an unsafe full URL supplied as blur data', () => {
    render(
      <ClientImage
        image={imageField('/assets/nwn-home-hero.jpg')}
        placeholder="blur"
        blurDataURL="https://images.example.com/nwn-home-hero.jpg"
      />,
    );

    const image = screen.getByTestId('next-image');
    expect(image).not.toHaveAttribute('data-placeholder');
    expect(image).not.toHaveAttribute('data-blur-data-url');
  });

  it('preserves a tiny inline raster data URL as the blur placeholder', () => {
    const tinyBlurDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

    render(
      <ClientImage
        image={imageField('/assets/nwn-home-hero.jpg', tinyBlurDataUrl)}
      />,
    );

    const image = screen.getByTestId('next-image');
    expect(image).toHaveAttribute('data-placeholder', 'blur');
    expect(image).toHaveAttribute('data-blur-data-url', tinyBlurDataUrl);
  });

  it('rejects image data URLs that are too large to be placeholders', () => {
    const oversizedDataUrl = `data:image/png;base64,${'A'.repeat(4096)}`;

    render(
      <ClientImage
        image={imageField('/assets/nwn-home-hero.jpg', oversizedDataUrl)}
      />,
    );

    const image = screen.getByTestId('next-image');
    expect(image).not.toHaveAttribute('data-placeholder');
    expect(image).not.toHaveAttribute('data-blur-data-url');
  });
});
