// src/__tests__/components/article-header/ArticleHeader.dev.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Default as ArticleHeader } from '@/components/article-header/ArticleHeader';
import { Page } from '@sitecore-content-sdk/nextjs';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: ({
    field,
    tag = 'span',
  }: {
    field?: { value?: string };
    tag?: string;
  }) => React.createElement(tag, {}, field?.value),
  DateField: ({
    field,
    render,
    tag = 'span',
  }: {
    field?: { value?: string };
    render?: (date: Date | null) => React.ReactNode;
    tag?: string;
  }) =>
    React.createElement(
      tag,
      {},
      render
        ? render(field?.value ? new Date(field.value) : null)
        : field?.value,
    ),
}));

//  Component-Specific Mocks
jest.mock('@/components/image/ImageWrapper.dev', () => {
  const MockImageWrapper = React.forwardRef<
    HTMLImageElement,
    { image?: { value?: { src?: string; alt?: string } } }
  >(({ image }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      data-testid="image-wrapper"
      src={image?.value?.src}
      alt={image?.value?.alt}
    />
  ));

  MockImageWrapper.displayName = 'MockImageWrapper';

  return { Default: MockImageWrapper };
});

jest.mock('@/components/floating-dock/floating-dock.dev', () => {
  const FloatingDock = ({
    items,
  }: {
    items?: Array<{ title: string; onClick?: () => void }>;
  }) => (
    <div data-testid="floating-dock">
      {items?.map((item, index) => (
        <button
          key={index}
          data-testid={`share-${item.title}`}
          onClick={item.onClick}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
  FloatingDock.displayName = 'MockFloatingDock';
  return { FloatingDock };
});

jest.mock('@/components/button-component/ButtonComponent', () => {
  const ButtonBase = ({
    buttonLink,
    variant,
    className,
    icon,
    iconPosition,
  }: {
    buttonLink?: { value?: { href?: string; text?: string } };
    variant?: string;
    className?: string;
    icon?: { value?: string };
    iconPosition?: string;
  }) => (
    <a
      data-testid="button-base"
      href={buttonLink?.value?.href}
      className={className}
      data-variant={variant}
      data-icon={icon?.value}
      data-icon-position={iconPosition}
    >
      {buttonLink?.value?.text}
    </a>
  );
  ButtonBase.displayName = 'MockButtonBase';
  return { ButtonBase };
});

// Mock page object with all required Page properties
const mockPageBase = {
  mode: {
    isEditing: false,
    isPreview: false,
    isNormal: true,
    name: 'normal' as const,
    designLibrary: { isVariantGeneration: false },
    isDesignLibrary: false,
  },
  layout: {
    sitecore: {
      context: {},
      route: null,
    },
  },
  locale: 'en',
} as Page;

//  Define mock props safely
const mockProps = {
  fields: {
    data: {
      datasource: {
        imageRequired: {
          jsonValue: {
            value: {
              src: '/test-image.jpg',
              alt: 'Data center infrastructure at dusk',
            },
          },
        },
        eyebrowOptional: { jsonValue: { value: 'Deals' } },
      },
      externalFields: {
        pageHeaderTitle: { jsonValue: { value: 'Sample Article' } },
        pageReadTime: { jsonValue: { value: '5 min read' } },
        pageDisplayDate: {
          jsonValue: { value: '2025-10-13T00:00:00Z' },
        },
        pageAuthor: {
          jsonValue: {
            id: 'author-id',
            name: 'john-doe',
            fields: {
              personFirstName: { value: 'John' },
              personLastName: { value: 'Doe' },
              personJobTitle: { value: 'Partner' },
              personProfileImage: { value: { src: '/author.jpg' } },
            },
          },
        },
      },
    },
  },
  params: {},
  rendering: { componentName: 'ArticleHeader' },
  page: mockPageBase,
};

describe('ArticleHeader Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open for share functionality
    Object.defineProperty(window, 'open', {
      writable: true,
      value: jest.fn(),
    });
  });

  it('renders the header with image and details', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    expect(screen.getByText('Sample Article')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
    expect(screen.getAllByTestId('image-wrapper')).toHaveLength(1);
    expect(screen.getByTestId('image-wrapper')).toHaveAttribute(
      'src',
      '/test-image.jpg',
    );
    expect(screen.getByTestId('image-wrapper')).toHaveAttribute(
      'alt',
      'Data center infrastructure at dusk',
    );
    expect(screen.getByText('John').closest('p')).toHaveTextContent('John Doe');
    expect(screen.getByText('5 min read')).toBeInTheDocument();
    expect(screen.getByText('October 13, 2025')).toBeInTheDocument();
  });

  it('links back to the News and Insights landing page', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    const backButton = screen.getByTestId('button-base');
    expect(backButton).toHaveAttribute('href', '/News-and-Insights');
    expect(backButton).toHaveAttribute('data-variant', 'link');
    expect(backButton).toHaveAttribute('data-icon', 'arrow-left');
    expect(screen.getByText('Back to News and Insights')).toBeInTheDocument();
  });

  it('renders author section correctly', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-img')).toHaveAttribute(
      'src',
      '/author.jpg',
    );
    expect(screen.getByText('John').closest('p')).toHaveTextContent('John Doe');
    expect(screen.getByText('Partner')).toBeInTheDocument();
  });

  it('handles share button clicks correctly', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    fireEvent.click(screen.getByTestId('share-Share on Facebook'));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('facebook.com'),
      '_blank',
      'width=600,height=400',
    );
  });

  it('renders floating dock with share buttons', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    // The mock exposes each configured share action so the integration is easy to assert.
    expect(screen.getByTestId('floating-dock')).toBeInTheDocument();
    expect(screen.getByTestId('share-Share on Facebook')).toBeInTheDocument();
    expect(screen.getByTestId('share-Share on LinkedIn')).toBeInTheDocument();
    expect(screen.getByTestId('share-Copy Link')).toBeInTheDocument();
  });

  it('renders category badge when eyebrow is provided', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    expect(screen.getByTestId('badge')).toBeInTheDocument();
    expect(screen.getByText('Deals')).toBeInTheDocument();
  });

  it('renders toaster component', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('renders a datasource fallback when the component has no datasource', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        fields={{ data: {} }}
      />,
    );

    expect(screen.getByTestId('no-data-fallback')).toBeInTheDocument();
  });

  it('does not reserve an empty hero-image panel outside editing mode', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        fields={{
          ...mockProps.fields,
          data: {
            ...mockProps.fields.data,
            datasource: {
              ...mockProps.fields.data.datasource,
              imageRequired: { jsonValue: { value: {} } },
            },
          },
        }}
      />,
    );

    expect(screen.queryByTestId('image-wrapper')).not.toBeInTheDocument();
  });

  it('keeps the empty hero-image field visible in Page Builder', () => {
    const editingPage = {
      ...mockPageBase,
      mode: {
        ...mockPageBase.mode,
        isEditing: true,
        isNormal: false,
        name: 'edit' as const,
      },
    } as Page;

    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        page={editingPage}
        fields={{
          ...mockProps.fields,
          data: {
            ...mockProps.fields.data,
            datasource: {
              ...mockProps.fields.data.datasource,
              imageRequired: { jsonValue: { value: {} } },
            },
          },
        }}
      />,
    );

    expect(screen.getByTestId('image-wrapper')).toBeInTheDocument();
  });
});
