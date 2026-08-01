import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PageHeaderLawyerProfile } from '@/components/page-header/PageHeaderLawyerProfile.dev';
import {
  mockPageHeaderPropsWithoutImage,
  mockPageHeaderPropsWithoutLinks,
} from './page-header.mock.props';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  Text: jest.fn(({ field, tag = 'span', className }) => {
    const Tag = tag as keyof JSX.IntrinsicElements;
    return React.createElement(
      Tag,
      { className, 'data-testid': 'text-component' },
      field?.value,
    );
  }),
  RichText: jest.fn(({ field, className }) => (
    <div
      className={className}
      data-testid="richtext-component"
      dangerouslySetInnerHTML={{ __html: field?.value }}
    />
  )),
  Image: jest.fn(({ className }) => (
    <span className={className} data-testid="sitecore-image-field" />
  )),
}));

jest.mock('@/utils/NoDataFallback', () => ({
  NoDataFallback: jest.fn(({ componentName }) => (
    <div data-testid="no-data-fallback">No Data: {componentName}</div>
  )),
}));

jest.mock('@/components/animated-section/AnimatedSection.dev', () => ({
  Default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-section">{children}</div>
  ),
}));

jest.mock('@/components/button-component/ButtonComponent', () => ({
  EditableButton: ({
    buttonLink,
    variant,
  }: {
    buttonLink: { value: { text: string; href: string } };
    variant: string;
  }) => (
    <button data-testid={`button-${variant}`} data-href={buttonLink.value.href}>
      {buttonLink.value.text}
    </button>
  ),
}));

jest.mock('@/components/image/ImageWrapper.dev', () => ({
  Default: ({
    image,
    className,
    wrapperClass,
    emptyFieldEditingComponent: EmptyFieldEditingComponent,
  }: {
    image?: { value?: { src?: string; alt?: string } };
    className?: string;
    wrapperClass?: string;
    emptyFieldEditingComponent?: React.ComponentType<{ className?: string }>;
  }) => (
    <div data-testid="image-wrapper-container" className={wrapperClass}>
      {image?.value?.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="image-wrapper"
          className={className}
          src={image.value.src}
          alt={image.value.alt || ''}
        />
      ) : EmptyFieldEditingComponent ? (
        <EmptyFieldEditingComponent className={className} />
      ) : null}
    </div>
  ),
}));

const lawyerProps = {
  ...mockPageHeaderPropsWithoutLinks,
  fields: {
    ...mockPageHeaderPropsWithoutLinks.fields,
    data: {
      ...mockPageHeaderPropsWithoutLinks.fields.data,
      datasource: {
        ...mockPageHeaderPropsWithoutLinks.fields.data.datasource,
        imageRequired: {
          jsonValue: {
            value: {
              src: '/images/allan-kirk.jpg',
              alt: 'Portrait of Allan Kirk',
              width: '1122',
              height: '1402',
            },
          },
        },
      },
      externalFields: {
        ...mockPageHeaderPropsWithoutLinks.fields.data.externalFields,
        pageHeaderTitle: { jsonValue: { value: 'Allan Kirk' } },
        pageSubtitle: {
          jsonValue: { value: '<p>Mergers &amp; Acquisitions</p>' },
        },
        pageSummary: {
          jsonValue: {
            value:
              'Allan advises private equity sponsors, investors, and companies on complex transactions.',
          },
        },
      },
    },
  },
};

describe('PageHeaderLawyerProfile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('top-aligns the desktop columns and keeps image before overview on mobile', () => {
    const { container } = render(
      <PageHeaderLawyerProfile {...lawyerProps} isPageEditing={false} />,
    );

    const layout = container.querySelector(
      '[data-component-part="page-header-layout"]',
    );
    const identity = container.querySelector(
      '[data-component-part="lawyer-profile-identity"]',
    );
    const image = container.querySelector(
      '[data-component-part="page-header-image"]',
    );
    const mobileOverview = container.querySelector(
      '[data-component-part="lawyer-profile-overview-mobile"]',
    );
    const desktopOverview = container.querySelector(
      '[data-component-part="lawyer-profile-overview-desktop"]',
    );

    expect(layout).toHaveClass(
      '@3xl/headerwrapper:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]',
      '@3xl/headerwrapper:items-start',
    );
    expect(identity).toHaveClass('order-1', '@3xl/headerwrapper:row-start-1');
    expect(image).toHaveClass(
      'order-2',
      '@3xl/headerwrapper:row-start-1',
      '@3xl/headerwrapper:self-start',
    );
    expect(image).not.toHaveClass(
      '@3xl/headerwrapper:row-start-2',
      '@3xl/headerwrapper:self-end',
    );
    expect(mobileOverview).toHaveClass('order-3', '@3xl/headerwrapper:hidden');
    expect(desktopOverview).toHaveClass('hidden', '@3xl/headerwrapper:block');
    expect(layout?.children[0]).toBe(identity);
    expect(layout?.children[1]).toBe(image);
    expect(layout?.children[2]).toBe(mobileOverview);
    expect(screen.getByText('Allan Kirk')).toBeInTheDocument();
    expect(screen.getAllByText(/Allan advises private equity/)).toHaveLength(2);
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.getByTestId('image-wrapper')).toHaveClass(
      'aspect-[4/5]',
      'object-cover',
      'object-top',
    );
  });

  it('shows an editable portrait affordance when the image is empty', () => {
    render(
      <PageHeaderLawyerProfile
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={true}
      />,
    );

    expect(screen.getByText('Choose a lawyer portrait')).toBeInTheDocument();
    expect(screen.getByTestId('sitecore-image-field')).toBeInTheDocument();
  });

  it('does not render an empty portrait or empty actions in normal mode', () => {
    const { container } = render(
      <PageHeaderLawyerProfile
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={false}
      />,
    );

    expect(
      screen.queryByTestId('image-wrapper-container'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-actions"]'),
    ).not.toBeInTheDocument();
  });

  it('renders the standard fallback when fields are unavailable', () => {
    render(
      <PageHeaderLawyerProfile
        {...lawyerProps}
        fields={null as never}
        isPageEditing={false}
      />,
    );

    expect(screen.getByTestId('no-data-fallback')).toHaveTextContent(
      'No Data: PageHeader',
    );
  });
});
