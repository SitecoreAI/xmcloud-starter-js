import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MultiPromoNwnCards } from '@/components/multi-promo/MultiPromoNwnCards.dev';
import { mockMultiPromoProps } from './multi-promo.mock.props';

type TextMockProps = {
  field?: { value?: string };
  tag?: React.ElementType;
  className?: string;
};

type EditableButtonMockProps = {
  buttonLink?: { value?: { href?: string; text?: string } };
  className?: string;
};

type ImageWrapperMockProps = {
  image?: { value?: { src?: string; alt?: string } };
  className?: string;
  wrapperClass?: string;
};

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({ field, tag = 'span', className }: TextMockProps) =>
    React.createElement(tag, { className }, field?.value ?? ''),
  RichText: ({ field, className }: TextMockProps) => (
    <div className={className}>{field?.value ?? ''}</div>
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({ buttonLink, className }: EditableButtonMockProps) => (
    <a href={buttonLink?.value?.href} className={className}>
      {buttonLink?.value?.text}
    </a>
  ),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({ image, className, wrapperClass }: ImageWrapperMockProps) => (
    <div className={wrapperClass} data-testid="image-wrapper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image?.value?.src}
        alt={image?.value?.alt ?? ''}
        className={className}
      />
    </div>
  ),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: { componentName: string }) => (
    <div>{componentName}</div>
  ),
}));

describe('MultiPromoNwnCards', () => {
  it('centers inset images and aligns them with the card text gutter', () => {
    render(<MultiPromoNwnCards {...mockMultiPromoProps} />);

    const firstImageWrapper = screen.getAllByTestId('image-wrapper')[0];
    const firstImage = screen.getAllByRole('img')[0];
    const firstHeading = screen.getByRole('heading', {
      name: 'Premium Product',
    });
    const firstCard = firstHeading.closest('article');
    const cardRow = firstCard?.parentElement;

    expect(firstImageWrapper).toHaveClass(
      'mx-6',
      'mt-6',
      'aspect-[7/4]',
      'rounded-sm',
    );
    expect(firstImageWrapper).not.toHaveClass('w-full');
    expect(firstImage).toHaveClass('object-cover', 'object-center');
    expect(firstHeading.parentElement).toHaveClass('p-6');
    expect(cardRow).toHaveClass(
      'mx-auto',
      'flex',
      'flex-wrap',
      'justify-center',
    );
    expect(firstCard).toHaveClass(
      'w-full',
      'max-w-[24rem]',
      'text-left',
      'md:w-[calc(50%_-_0.75rem)]',
      'lg:w-[calc(33.333%_-_1rem)]',
    );
  });
});
