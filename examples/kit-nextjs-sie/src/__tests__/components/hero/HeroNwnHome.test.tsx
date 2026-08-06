import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroNwnHome } from '@/components/hero/HeroNwnHome.dev';
import { mockHeroProps } from './hero.mock.props';

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

describe('HeroNwnHome', () => {
  it('renders only the authored hero fields', () => {
    render(<HeroNwnHome {...mockHeroProps} />);

    expect(
      screen.getByRole('heading', { name: 'Welcome to Our Platform' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Hero Image')).toHaveAttribute(
      'src',
      '/hero-image.jpg',
    );
    expect(screen.getByRole('link', { name: 'Learn More' })).toHaveAttribute(
      'href',
      '/offers',
    );
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute(
      'href',
      '/search-results',
    );
    expect(
      screen.queryByRole('button', { name: 'Next slide' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Come on in.')).not.toBeInTheDocument();
    expect(screen.queryByText('Make a payment')).not.toBeInTheDocument();
  });

  it('does not insert an image when the authored image field is empty', () => {
    const { container } = render(
      <HeroNwnHome
        {...mockHeroProps}
        fields={{
          ...mockHeroProps.fields,
          image: { value: {} },
        }}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Welcome to Our Platform' }),
    ).toBeInTheDocument();
  });

  it('preserves the empty authored image field in Page Builder', () => {
    const { container } = render(
      <HeroNwnHome
        {...mockHeroProps}
        isPageEditing
        fields={{
          ...mockHeroProps.fields,
          image: { value: {} },
        }}
      />,
    );

    expect(container.querySelector('img')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toHaveAttribute('src');
  });
});
