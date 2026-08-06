import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Page } from '@sitecore-content-sdk/nextjs';

import { ImageCarouselNwnResources } from '@/components/image-carousel/ImageCarouselNwnResources.dev';
import type {
  ImageCarouselProps,
  imageCarouselItem,
} from '@/components/image-carousel/image-carousel.props';

type CarouselListener = () => void;
let carouselListeners: Record<string, CarouselListener> = {};

const mockCarouselApi = {
  off: jest.fn((event: string, listener: CarouselListener) => {
    if (carouselListeners[event] === listener) {
      delete carouselListeners[event];
    }
  }),
  on: jest.fn((event: string, listener: CarouselListener) => {
    carouselListeners[event] = listener;
  }),
  scrollNext: jest.fn(),
  scrollPrev: jest.fn(),
  scrollTo: jest.fn(),
  selectedScrollSnap: jest.fn(() => 0),
};

const mockCarousel = jest.fn(
  ({
    children,
    setApi,
    opts,
    ...attributes
  }: {
    children: React.ReactNode;
    setApi?: (api: typeof mockCarouselApi) => void;
    opts?: { watchDrag?: boolean };
  } & React.HTMLAttributes<HTMLDivElement>) => {
    React.useEffect(() => {
      setApi?.(mockCarouselApi);
    }, [setApi]);

    return (
      <div
        data-testid="carousel"
        data-watch-drag={String(opts?.watchDrag)}
        {...attributes}
      >
        {children}
      </div>
    );
  },
);

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
    ...attributes
  }: {
    field?: { value?: string; metadata?: unknown };
    tag?: React.ElementType;
  }) =>
    React.createElement(
      tag,
      {
        ...attributes,
        'data-field-metadata': String(Boolean(field?.metadata)),
      },
      field?.value || '',
    ),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
  }: {
    image: {
      value?: { src?: string; alt?: string };
      metadata?: unknown;
    };
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="carousel-image-field"
      data-field-metadata={String(Boolean(image?.metadata))}
      src={image?.value?.src || undefined}
      alt={image?.value?.alt || ''}
    />
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  ButtonBase: ({
    buttonLink,
    isPageEditing,
  }: {
    buttonLink: {
      value?: { href?: string; text?: string };
      metadata?: unknown;
    };
    isPageEditing?: boolean;
  }) => (
    <a
      data-testid="carousel-link-field"
      data-field-metadata={String(Boolean(buttonLink?.metadata))}
      data-page-editing={String(Boolean(isPageEditing))}
      href={buttonLink?.value?.href}
    >
      {buttonLink?.value?.text}
    </a>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...attributes
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...attributes}>{children}</button>,
}));

jest.mock('@/components/ui/carousel', () => ({
  Carousel: (props: {
    children: React.ReactNode;
    setApi?: (api: typeof mockCarouselApi) => void;
    opts?: { watchDrag?: boolean };
  }) => mockCarousel(props),
  CarouselContent: ({
    children,
    ...attributes
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="carousel-content" {...attributes}>
      {children}
    </div>
  ),
  CarouselItem: ({
    children,
    ...attributes
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="carousel-item" {...attributes}>
      {children}
    </div>
  ),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: ({ componentName }: { componentName: string }) => (
    <div data-testid="no-data-fallback">{componentName}</div>
  ),
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

const createItem = (
  id: string,
  title: string,
  copy: string,
  href: string,
  linkText: string,
  image = '',
): imageCarouselItem => ({
  id,
  backgroundText: { jsonValue: { value: title } },
  copy: { jsonValue: { value: copy } },
  image: {
    jsonValue: {
      value: {
        src: image,
        alt: title,
      },
    },
  },
  link: {
    jsonValue: {
      value: {
        href,
        text: linkText,
        linktype: 'internal',
      },
    },
  },
});

const blankManagedItem = {
  id: 'slide-blank',
  backgroundText: {
    jsonValue: {
      value: '',
      metadata: { fieldName: 'backgroundText' },
    },
  },
  copy: {
    jsonValue: {
      value: '',
      metadata: { fieldName: 'copy' },
    },
  },
  image: {
    jsonValue: {
      value: {},
      metadata: { fieldName: 'image' },
    },
  },
  link: {
    jsonValue: {
      value: {},
      metadata: { fieldName: 'link' },
    },
  },
} as unknown as imageCarouselItem;

const defaultItems = [
  createItem(
    'slide-811',
    'Call 811 before you dig',
    'Call 811 before any digging project so buried utilities can be marked before work begins.',
    '/safety/call-before-you-dig',
    'Plan a safe project',
  ),
  createItem(
    'slide-assistance',
    'Payment assistance',
    'Explore options and resources that may help when paying your natural gas bill is difficult.',
    '/account-billing/payment-assistance',
    'Explore assistance',
  ),
  createItem(
    'slide-account',
    'Manage service on your schedule',
    'Start, stop, or transfer natural gas service with clear steps for your move.',
    '/account-billing',
    'Open account and billing',
  ),
];

const createProps = (
  items: imageCarouselItem[] = defaultItems,
  isPageEditing = false,
): ImageCarouselProps =>
  ({
    fields: {
      data: {
        datasource: {
          title: {
            jsonValue: {
              value: 'Practical resources for every customer.',
            },
          },
          imageItems: { results: items },
        },
      },
    },
    params: {},
    rendering: { componentName: 'ImageCarousel' },
    page,
    isPageEditing,
  }) as ImageCarouselProps;

describe('ImageCarouselNwnResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    carouselListeners = {};
    mockCarouselApi.selectedScrollSnap.mockReturnValue(0);
  });

  it('renders the real authored carousel in Page Builder with drag disabled', () => {
    render(<ImageCarouselNwnResources {...createProps(defaultItems, true)} />);

    expect(screen.getByTestId('carousel')).toHaveAttribute(
      'data-watch-drag',
      'false',
    );
    expect(screen.getAllByTestId('carousel-item')).toHaveLength(3);
    expect(
      screen.queryByTestId('image-carousel-edit-mode'),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getAllByTestId('carousel-item')
        .map((item) => item.getAttribute('data-carousel-item-id')),
    ).toEqual(['slide-811', 'slide-assistance', 'slide-account']);
  });

  it('renders managed title and copy as separate editable fields in Page Builder', () => {
    const item = createItem(
      'slide-811-structured',
      'Call 811 before you dig',
      'A free utility locate helps protect you and your neighbors.',
      '/safety/call-before-you-dig',
      'Plan a safe project',
    );
    item.backgroundText.jsonValue.metadata = {
      fieldName: 'backgroundText',
    };
    item.copy!.jsonValue.metadata = { fieldName: 'copy' };

    render(<ImageCarouselNwnResources {...createProps([item], true)} />);

    const editableTitle = screen.getByRole('heading', {
      name: 'Call 811 before you dig',
    });
    const editableCopy = screen.getByText(
      'A free utility locate helps protect you and your neighbors.',
    );

    expect(editableTitle.tagName).toBe('H3');
    expect(editableTitle).toHaveAttribute('data-field-metadata', 'true');
    expect(editableCopy.tagName).toBe('P');
    expect(editableCopy).toHaveAttribute('data-field-metadata', 'true');
    expect(screen.queryByText(/\|\|/)).not.toBeInTheDocument();
  });

  it('keeps swipe and drag enabled outside Page Builder', () => {
    render(<ImageCarouselNwnResources {...createProps()} />);

    expect(screen.getByTestId('carousel')).toHaveAttribute(
      'data-watch-drag',
      'true',
    );
  });

  it('uses the authored item count and order without fabricating slides', () => {
    const reorderedItems = [
      createItem(
        'slide-rebates',
        'Rebates and offers',
        'Find savings opportunities for qualifying natural gas upgrades.',
        '/ways-to-save/rebates-offers',
        'Find available rebates',
      ),
      defaultItems[0],
    ];

    render(<ImageCarouselNwnResources {...createProps(reorderedItems)} />);

    const slides = screen.getAllByTestId('carousel-item');
    expect(slides).toHaveLength(2);
    expect(
      slides.map((item) => item.getAttribute('data-carousel-item-id')),
    ).toEqual(['slide-rebates', 'slide-811']);
    expect(slides[0]).toHaveTextContent('Rebates and offers');
    expect(slides[1]).toHaveTextContent('Call 811 before you dig');
    expect(screen.queryAllByTestId('carousel-image-field')).toHaveLength(0);
    expect(
      screen.queryByText(/quick call helps underground utilities/i),
    ).not.toBeInTheDocument();
  });

  it('uses the Embla API for arrows and item selectors', () => {
    render(<ImageCarouselNwnResources {...createProps()} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Next customer resource' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Previous customer resource' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show customer resource: Payment assistance',
      }),
    );

    expect(mockCarouselApi.scrollNext).toHaveBeenCalledTimes(1);
    expect(mockCarouselApi.scrollPrev).toHaveBeenCalledTimes(1);
    expect(mockCarouselApi.scrollTo).toHaveBeenCalledWith(1);
  });

  it('resynchronizes and cleans up after Manage items changes', () => {
    const { unmount } = render(
      <ImageCarouselNwnResources {...createProps(defaultItems, true)} />,
    );

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

  it('updates the active item when the carousel selection changes', () => {
    render(<ImageCarouselNwnResources {...createProps()} />);

    mockCarouselApi.selectedScrollSnap.mockReturnValue(1);
    act(() => {
      carouselListeners.select?.();
    });

    expect(
      screen.getByRole('button', {
        name: 'Show customer resource: Payment assistance',
      }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByText(/Showing customer resource 2 of 3: Payment assistance/),
    ).toBeInTheDocument();
  });

  it('renders nothing when authors remove every managed item', () => {
    const { container } = render(
      <ImageCarouselNwnResources {...createProps([])} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a Manage items empty state instead of fake slides in Page Builder', () => {
    render(<ImageCarouselNwnResources {...createProps([], true)} />);

    expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
    expect(screen.getByText('No carousel items yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Use Manage items in Page Builder/),
    ).toBeInTheDocument();
  });

  it('preserves blank managed fields for inline editing and DAM assignment', () => {
    const editingProps = createProps([blankManagedItem], true);
    const titleField = editingProps.fields.data.datasource.title.jsonValue as {
      value: string;
      metadata?: unknown;
    };
    titleField.value = '';
    titleField.metadata = { fieldName: 'title' };

    const { container } = render(
      <ImageCarouselNwnResources {...editingProps} />,
    );

    expect(
      container.querySelector('h2[data-field-metadata="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('h3[data-field-metadata="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('p[data-field-metadata="true"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('carousel-image-field')).toHaveAttribute(
      'data-field-metadata',
      'true',
    );
    expect(screen.getByTestId('carousel-link-field')).toHaveAttribute(
      'data-field-metadata',
      'true',
    );
    expect(screen.getByTestId('carousel-link-field')).toHaveAttribute(
      'data-page-editing',
      'true',
    );
  });

  it('makes inactive slides inert and exposes only one carousel landmark', () => {
    const { container } = render(
      <ImageCarouselNwnResources {...createProps()} />,
    );
    const slides = screen.getAllByTestId('carousel-item');

    expect(slides[0]).not.toHaveAttribute('inert');
    expect(slides[1]).toHaveAttribute('inert');
    expect(container.querySelector('section')).not.toHaveAttribute(
      'aria-roledescription',
    );
    expect(screen.getByTestId('carousel')).toHaveAttribute('aria-labelledby');

    mockCarouselApi.selectedScrollSnap.mockReturnValue(1);
    act(() => {
      carouselListeners.select?.();
    });

    expect(slides[0]).toHaveAttribute('inert');
    expect(slides[1]).not.toHaveAttribute('inert');
  });

  it('disables arrow controls when there is only one authored item', () => {
    render(<ImageCarouselNwnResources {...createProps([defaultItems[0]])} />);

    expect(
      screen.getByRole('button', { name: 'Previous customer resource' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Next customer resource' }),
    ).toBeDisabled();
  });
});
