// src/__tests__/components/article-header/ArticleHeader.dev.test.tsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
        pageSummary: {
          jsonValue: {
            value:
              'A concise summary of the matter and its significance for clients.',
          },
        },
        pageReadTime: { jsonValue: { value: '5 min read' } },
        pageDisplayDate: {
          jsonValue: { value: '2025-10-13T00:00:00Z' },
        },
        pageAuthor: {
          jsonValue: {
            id: 'author-id',
            name: 'john-doe',
            url: '/Lawyers/John-Doe',
            fields: {
              pageHeaderTitle: { value: 'John Doe' },
              pageSubtitle: { value: 'Private Equity' },
              pageThumbnail: {
                value: { src: '/author.jpg', alt: 'Portrait of John Doe' },
              },
            },
          },
        },
        contentType: {
          jsonValue: {
            id: 'content-type-id',
            name: 'Deal Announcement',
            displayName: 'Deal Announcement',
          },
        },
        topics: {
          jsonValue: [
            {
              id: 'topic-id',
              name: 'Digital Infrastructure',
              displayName: 'Digital Infrastructure',
            },
          ],
        },
        relatedPractice: {
          jsonValue: {
            id: 'practice-id',
            name: 'Private Equity',
            displayName: 'Private Equity',
            url: '/Services/Private-Equity',
            fields: {
              pageHeaderTitle: { value: 'Private Equity' },
            },
          },
        },
        relatedOffice: {
          jsonValue: {
            id: 'office-id',
            name: 'New York',
            displayName: 'New York',
            url: '/Locations/New-York',
            fields: {
              pageHeaderTitle: { value: 'New York' },
            },
          },
        },
        sourceItem: {
          jsonValue: {
            id: 'source-id',
            name: 'Transaction announcement',
            fields: {
              titleRequired: { value: 'Meta transaction announcement' },
              descriptionOptional: {
                value: 'The approved transaction announcement.',
              },
              linkOptional: {
                value: {
                  href: 'https://example.com/announcement',
                  text: 'Read the announcement',
                  target: '_blank',
                },
              },
            },
          },
        },
        relatedInsights: {
          jsonValue: [
            {
              id: 'related-id',
              name: 'Related Article',
              url: '/News-and-Insights/Related-Article',
              fields: {
                pageHeaderTitle: { value: 'Related Article' },
              },
            },
          ],
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
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('5 min read')).toBeInTheDocument();
    expect(screen.getByText('October 13, 2025')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A concise summary of the matter and its significance for clients.',
      ),
    ).toBeInTheDocument();
  });

  it('renders configured public relationships and source material', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Private Equity' }),
    ).toHaveAttribute('href', '/Services/Private-Equity');
    expect(screen.getByRole('link', { name: 'New York' })).toHaveAttribute(
      'href',
      '/Locations/New-York',
    );
    expect(screen.getByText('Content type')).toBeInTheDocument();
    expect(screen.getByText('Deal Announcement')).toBeInTheDocument();
    expect(screen.getByText('Topic')).toBeInTheDocument();
    expect(screen.getByText('Digital Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(
      screen.getByText('Meta transaction announcement'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The approved transaction announcement.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Read the announcement' }),
    ).toHaveAttribute('href', 'https://example.com/announcement');
    expect(
      screen.getByRole('link', { name: 'Related Article' }),
    ).toHaveAttribute('href', '/News-and-Insights/Related-Article');
  });

  it('uses version-aware route fields instead of latest queried page fields', () => {
    const versionedPage = {
      ...mockPageBase,
      layout: {
        sitecore: {
          context: {},
          route: {
            name: 'sample-article',
            placeholders: {},
            fields: {
              pageHeaderTitle: { value: 'Prior approved headline' },
              pageSummary: { value: 'Prior approved summary.' },
              pageReadTime: { value: '4 min read' },
              pageDisplayDate: { value: '2025-10-12T00:00:00Z' },
            },
          },
        },
      },
    } as unknown as Page;

    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        page={versionedPage}
      />,
    );

    expect(screen.getByText('Prior approved headline')).toBeInTheDocument();
    expect(screen.getByText('Prior approved summary.')).toBeInTheDocument();
    expect(screen.queryByText('Sample Article')).not.toBeInTheDocument();
  });

  it('uses the configured source item name instead of a generic title', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        fields={{
          ...mockProps.fields,
          data: {
            ...mockProps.fields.data,
            externalFields: {
              ...mockProps.fields.data.externalFields,
              sourceItem: {
                jsonValue: {
                  ...mockProps.fields.data.externalFields.sourceItem.jsonValue,
                  displayName: 'Meta and BlackRock transaction announcement',
                  fields: {
                    ...mockProps.fields.data.externalFields.sourceItem.jsonValue
                      .fields,
                    titleRequired: { value: 'Source material' },
                  },
                },
              },
            },
          },
        }}
      />,
    );

    expect(
      screen.getByText('Meta and BlackRock transaction announcement'),
    ).toBeInTheDocument();
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
    expect(screen.getByTestId('avatar-img')).toHaveAttribute(
      'alt',
      'Portrait of John Doe',
    );
    const authorLink = screen.getByRole('link', { name: /John Doe/ });
    expect(authorLink).toHaveAttribute('href', '/Lawyers/John-Doe');
    expect(within(authorLink).getByText('Private Equity')).toBeInTheDocument();
  });

  it('prefers the canonical page author over the legacy taxonomy author', () => {
    const pageWithBothAuthorFields = {
      ...mockPageBase,
      layout: {
        sitecore: {
          context: {},
          route: {
            name: 'sample-article',
            placeholders: {},
            fields: {
              author: {
                id: 'canonical-author-id',
                name: 'jane-smith',
                url: '/Lawyers/Jane-Smith',
                fields: {
                  pageHeaderTitle: { value: 'Jane Smith' },
                  pageSubtitle: { value: 'Mergers and Acquisitions' },
                  pageThumbnail: {
                    value: {
                      src: '/jane-smith.jpg',
                      alt: 'Portrait of Jane Smith',
                    },
                  },
                },
              },
              taxAuthor: {
                id: 'legacy-author-id',
                name: 'legacy-lawyer',
                url: '/Lawyers/Legacy-Lawyer',
                fields: {
                  pageHeaderTitle: { value: 'Legacy Lawyer' },
                  pageSubtitle: { value: 'Legacy Practice' },
                  pageThumbnail: {
                    value: {
                      src: '/legacy-lawyer.jpg',
                      alt: 'Portrait of Legacy Lawyer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as Page;

    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        page={pageWithBothAuthorFields}
      />,
    );

    const authorLink = screen.getByRole('link', { name: /Jane Smith/ });
    expect(authorLink).toHaveAttribute('href', '/Lawyers/Jane-Smith');
    expect(
      within(authorLink).getByText('Mergers and Acquisitions'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('avatar-img')).toHaveAttribute(
      'src',
      '/jane-smith.jpg',
    );
    expect(screen.queryByText('Legacy Lawyer')).not.toBeInTheDocument();
  });

  it('falls back to the legacy taxonomy author when no page author is selected', () => {
    const pageWithLegacyAuthor = {
      ...mockPageBase,
      layout: {
        sitecore: {
          context: {},
          route: {
            name: 'legacy-article',
            placeholders: {},
            fields: {
              author: null,
              taxAuthor: {
                id: 'legacy-author-id',
                name: 'legacy-lawyer',
                url: '/Lawyers/Legacy-Lawyer',
                fields: {
                  pageHeaderTitle: { value: 'Legacy Lawyer' },
                  pageSubtitle: { value: 'Restructuring' },
                  pageThumbnail: {
                    value: {
                      src: '/legacy-lawyer.jpg',
                      alt: 'Portrait of Legacy Lawyer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as Page;

    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        page={pageWithLegacyAuthor}
      />,
    );

    const authorLink = screen.getByRole('link', { name: /Legacy Lawyer/ });
    expect(authorLink).toHaveAttribute('href', '/Lawyers/Legacy-Lawyer');
    expect(within(authorLink).getByText('Restructuring')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-img')).toHaveAttribute(
      'src',
      '/legacy-lawyer.jpg',
    );
  });

  it('falls back to the queried legacy author when route fields are unavailable', () => {
    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        fields={{
          ...mockProps.fields,
          data: {
            ...mockProps.fields.data,
            externalFields: {
              ...mockProps.fields.data.externalFields,
              pageAuthor: { jsonValue: null },
              legacyPageAuthor: {
                jsonValue: {
                  id: 'queried-legacy-author-id',
                  name: 'queried-legacy-lawyer',
                  url: '/Lawyers/Queried-Legacy-Lawyer',
                  fields: {
                    pageHeaderTitle: { value: 'Queried Legacy Lawyer' },
                    pageSubtitle: { value: 'Capital Markets' },
                    pageThumbnail: {
                      value: {
                        src: '/queried-legacy-lawyer.jpg',
                        alt: 'Portrait of Queried Legacy Lawyer',
                      },
                    },
                  },
                },
              },
            },
          },
        }}
      />,
    );

    const authorLink = screen.getByRole('link', {
      name: /Queried Legacy Lawyer/,
    });
    expect(authorLink).toHaveAttribute(
      'href',
      '/Lawyers/Queried-Legacy-Lawyer',
    );
    expect(within(authorLink).getByText('Capital Markets')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-img')).toHaveAttribute(
      'src',
      '/queried-legacy-lawyer.jpg',
    );
  });

  it('keeps the lawyer card non-navigable while editing', () => {
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
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /John Doe/ }),
    ).not.toBeInTheDocument();
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

  it('keeps empty article relationships understandable in Page Builder', () => {
    const editingPage = {
      ...mockPageBase,
      mode: {
        ...mockPageBase.mode,
        isEditing: true,
        isNormal: false,
        name: 'edit' as const,
      },
      layout: {
        sitecore: {
          context: {},
          route: {
            name: 'new-article',
            placeholders: {},
            fields: {
              pageHeaderTitle: { value: '' },
              pageSummary: { value: '' },
              author: null,
              taxAuthor: null,
              taxContentType: null,
              taxTopic: [],
              relatedPractice: null,
              relatedOffice: null,
              sourceItem: null,
              relatedInsights: [],
            },
          },
        },
      },
    } as unknown as Page;

    render(
      <ArticleHeader
        {...(mockProps as React.ComponentProps<typeof ArticleHeader>)}
        page={editingPage}
      />,
    );

    expect(screen.getByText('Select a practice')).toBeInTheDocument();
    expect(screen.getByText('Select an office')).toBeInTheDocument();
    expect(screen.getByText('Select a content type')).toBeInTheDocument();
    expect(screen.getByText('Select a topic')).toBeInTheDocument();
    expect(screen.getByText('Select an author')).toBeInTheDocument();
    expect(
      screen.getByText('Select source material in the Content panel.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Select related insights in the Content panel.'),
    ).toBeInTheDocument();
  });
});
