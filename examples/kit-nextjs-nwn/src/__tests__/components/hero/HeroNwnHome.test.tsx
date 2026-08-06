import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroNwnHome } from '@/components/hero/HeroNwnHome.dev';
import { mockHeroProps } from './hero.mock.props';

jest.mock('lucide-react', () => {
  const Icon = (props: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...props} />
  );
  return {
    ChevronLeft: Icon,
    ChevronRight: Icon,
    CreditCard: Icon,
    House: Icon,
    Pause: Icon,
    Play: Icon,
    ShieldCheck: Icon,
  };
});

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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
    asChild,
    variant: _variant,
    size: _size,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
    variant?: string;
    size?: string;
  }) => (asChild ? children : <button {...props}>{children}</button>),
}));

jest.mock('@/hooks/use-match-media', () => ({
  useMatchMedia: jest.fn(() => true),
}));

describe('HeroNwnHome', () => {
  it('uses authored first-slide fields and renders the signature account actions', () => {
    render(<HeroNwnHome {...mockHeroProps} />);

    expect(
      screen.getByRole('heading', { name: 'Welcome to Our Platform' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Hero Image')).toHaveAttribute(
      'src',
      '/hero-image.jpg',
    );
    expect(
      screen.getByRole('heading', { name: 'Come on in.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Make a payment')).toBeInTheDocument();
    expect(screen.getByText('Safety at home')).toBeInTheDocument();
    expect(screen.getByText('Start, stop or transfer')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Access your account' }),
    ).toHaveAttribute('href', '/account-billing/pay-my-bill');
  });

  it('advances to local fallback slides with accessible controls', () => {
    render(<HeroNwnHome {...mockHeroProps} />);

    expect(screen.getByRole('button', { name: 'Previous slide' })).toHaveClass(
      'hidden',
      'h-11',
      'w-11',
      'sm:inline-flex',
    );
    expect(screen.getByRole('button', { name: 'Next slide' })).toHaveClass(
      'hidden',
      'h-11',
      'w-11',
      'sm:inline-flex',
    );
    expect(
      screen.getByRole('button', {
        name: 'Show slide 1: Welcome to Our Platform',
      }),
    ).toHaveClass('h-11', 'w-11', 'shrink-0');

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));

    expect(
      screen.getByRole('heading', { name: 'Call 811 before you dig.' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Call 811 before you dig.')).toHaveAttribute(
      'src',
      '/assets/nwn-images/homepage-hero-call-811-before-you-dig-wide.png',
    );
    expect(
      screen.getByRole('link', { name: 'Plan a safe project' }),
    ).toHaveAttribute('href', '/safety/call-before-you-dig');
    expect(
      screen.queryByRole('button', { name: 'Pause slideshow' }),
    ).not.toBeInTheDocument();
  });

  it('replaces seeded automotive copy, image, and CTA as one safe fallback', () => {
    render(
      <HeroNwnHome
        {...mockHeroProps}
        fields={{
          ...mockHeroProps.fields,
          bannerText: {
            value: 'Introducing the all-new Alaris Nexa with DriveSense AI.',
          },
          title: { value: 'Get set for an electric future.' },
          description: { value: 'Say hello to an experienced car.' },
          image: {
            value: {
              src: '/alaris-nexa-vehicle.jpg',
              alt: 'Alaris Nexa vehicle',
            },
          },
          bannerCTA: {
            value: {
              href: '/Test-Drive',
              text: 'Schedule a Test Drive',
              linktype: 'internal',
            },
          },
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Comfort starts at home.' }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Comfort starts at home.')).toHaveAttribute(
      'src',
      '/assets/nwn-images/homepage-hero-family-comfort-pacific-northwest-wide.png',
    );
    expect(
      screen.getByRole('link', { name: 'Explore the benefits of natural gas' }),
    ).toHaveAttribute('href', '/get-natural-gas/benefits');
    expect(screen.queryByText(/Alaris Nexa/)).not.toBeInTheDocument();
  });
});
