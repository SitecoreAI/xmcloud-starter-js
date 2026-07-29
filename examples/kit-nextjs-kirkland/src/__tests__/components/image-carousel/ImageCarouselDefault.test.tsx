import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ImageCarouselDefault } from '@/components/image-carousel/ImageCarouselDefault.dev';
import type { ImageCarouselProps } from '@/components/image-carousel/image-carousel.props';

const mockCarouselApi = {
  off: jest.fn(),
  on: jest.fn(),
  scrollNext: jest.fn(),
  scrollPrev: jest.fn(),
  selectedScrollSnap: jest.fn(() => 0),
};

const mockCarousel = jest.fn(
  ({
    children,
    setApi,
    opts,
  }: {
    children: React.ReactNode;
    setApi?: (api: typeof mockCarouselApi) => void;
    opts?: Record<string, unknown>;
  }) => {
    React.useEffect(() => {
      setApi?.(mockCarouselApi);
    }, [setApi]);

    return (
      <div data-testid="carousel" data-watch-drag={String(opts?.watchDrag)}>
        {children}
      </div>
    );
  },
);

const mockButtonBase = jest.fn(
  ({
    buttonLink,
  }: {
    buttonLink: { value?: { href?: string; text?: string } };
  }) => (
    <a href={buttonLink.value?.href} data-testid="carousel-link">
      {buttonLink.value?.text}
    </a>
  ),
);

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
    ...attributes
  }: {
    field?: { value?: string };
    tag?: React.ElementType;
  }) => React.createElement(tag, attributes, field?.value || ''),
}));

jest.mock('@/components/animated-section/AnimatedSection.dev', () => ({
  Default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  ButtonBase: (props: {
    buttonLink: { value?: { href?: string; text?: string } };
  }) => mockButtonBase(props),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({ image }: { image?: { value?: { src?: string } } }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image?.value?.src} alt="" data-testid="carousel-image" />
  ),
}));

jest.mock('@/components/ui/carousel', () => ({
  Carousel: (props: {
    children: React.ReactNode;
    setApi?: (api: typeof mockCarouselApi) => void;
    opts?: Record<string, unknown>;
  }) => mockCarousel(props),
  CarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-content">{children}</div>
  ),
  CarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-item">{children}</div>
  ),
}));

jest.mock('@/hooks/use-match-media', () => ({
  useMatchMedia: jest.fn(() => false),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: { componentName: string }) => (
    <div data-testid="no-data-fallback">{componentName}</div>
  ),
}));

const createProps = (
  isPageEditing: boolean,
  firstLink = { href: '', text: '' },
): ImageCarouselProps =>
  ({
    fields: {
      data: {
        datasource: {
          title: {
            jsonValue: { value: 'Focused on what matters most to clients.' },
          },
          imageItems: {
            results: [
              {
                id: 'slide-1',
                backgroundText: { jsonValue: { value: 'Transactional' } },
                image: {
                  jsonValue: {
                    value: { src: '/transactional.jpg', alt: '' },
                  },
                },
                link: { jsonValue: { value: firstLink } },
              },
              {
                id: 'slide-2',
                backgroundText: { jsonValue: { value: 'Litigation' } },
                image: {
                  jsonValue: {
                    value: { src: '/litigation.jpg', alt: '' },
                  },
                },
                link: { jsonValue: { value: { href: '', text: '' } } },
              },
              {
                id: 'slide-3',
                backgroundText: { jsonValue: { value: 'Restructuring' } },
                image: {
                  jsonValue: {
                    value: { src: '/restructuring.jpg', alt: '' },
                  },
                },
                link: { jsonValue: { value: { href: '', text: '' } } },
              },
            ],
          },
        },
      },
    },
    params: { styles: '' },
    isPageEditing,
  }) as unknown as ImageCarouselProps;

describe('ImageCarouselDefault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCarouselApi.selectedScrollSnap.mockReturnValue(0);
  });

  it('renders the real carousel in Page Builder without editor-only notes', () => {
    render(<ImageCarouselDefault {...createProps(true)} />);

    expect(screen.getByTestId('carousel')).toHaveAttribute(
      'data-watch-drag',
      'false',
    );
    expect(screen.getAllByTestId('carousel-item')).toHaveLength(3);
    expect(screen.getByText('Transactional')).toBeInTheDocument();
    expect(screen.queryByText(/Carousel Items/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Background Text:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Editor Note/i)).not.toBeInTheDocument();
  });

  it('keeps drag enabled outside Page Builder', () => {
    render(<ImageCarouselDefault {...createProps(false)} />);

    expect(screen.getByTestId('carousel')).toHaveAttribute(
      'data-watch-drag',
      'true',
    );
  });

  it('resynchronizes and cleans up after Manage items changes', () => {
    const { unmount } = render(<ImageCarouselDefault {...createProps(true)} />);

    expect(mockCarouselApi.on).toHaveBeenCalledWith(
      'select',
      expect.any(Function),
    );
    expect(mockCarouselApi.on).toHaveBeenCalledWith(
      'reInit',
      expect.any(Function),
    );

    unmount();

    expect(mockCarouselApi.off).toHaveBeenCalledWith(
      'select',
      expect.any(Function),
    );
    expect(mockCarouselApi.off).toHaveBeenCalledWith(
      'reInit',
      expect.any(Function),
    );
  });

  it('does not render empty link editing chrome', () => {
    render(<ImageCarouselDefault {...createProps(true)} />);

    expect(screen.queryByTestId('carousel-link')).not.toBeInTheDocument();
    expect(mockButtonBase).not.toHaveBeenCalled();
  });

  it('renders a configured link for the active slide', () => {
    render(
      <ImageCarouselDefault
        {...createProps(true, {
          href: '/services/transactional',
          text: 'Explore transactional',
        })}
      />,
    );

    expect(screen.getByTestId('carousel-link')).toHaveAttribute(
      'href',
      '/services/transactional',
    );
  });
});
