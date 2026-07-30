import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LayoutServicePageState } from '@sitecore-content-sdk/nextjs';
import { PageHeaderDefault } from '@/components/page-header/PageHeaderDefault.dev';
import {
  mockPageHeaderProps,
  mockPageHeaderPropsWithoutImage,
  mockPageHeaderPropsWithoutLinks,
} from './page-header.mock.props';

// Mock dependencies
jest.mock('@sitecore-content-sdk/nextjs', () => ({
  LayoutServicePageState: {
    Preview: 'preview',
  },
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
  }: {
    image?: { value?: { src?: string; alt?: string } };
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="image-wrapper"
      src={image?.value?.src || undefined}
      alt={image?.value?.alt || ''}
    />
  ),
}));

describe('PageHeaderDefault', () => {
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

  it('renders the assigned-image two-column header with title, subtitle and buttons', () => {
    const { container } = render(
      <PageHeaderDefault {...mockPageHeaderProps} isPageEditing={false} />,
    );

    expect(
      screen.getByText('Advanced Emergency Response Vehicles'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('richtext-component')).toBeInTheDocument();
    expect(screen.getByTestId('button-default')).toHaveTextContent(
      'Explore Our Fleet',
    );
    expect(screen.getByTestId('button-secondary')).toHaveTextContent(
      'Contact Sales',
    );
    expect(screen.getByTestId('image-wrapper')).toHaveAttribute(
      'src',
      '/images/alaris-ambulance-fleet.jpg',
    );
    expect(
      container.querySelector('[data-component-part="page-header-image"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-layout"]'),
    ).toHaveClass('@md/headerwrapper:grid-cols-2');
  });

  it('uses pageTitle when pageHeaderTitle is empty', () => {
    render(
      <PageHeaderDefault
        {...mockPageHeaderPropsWithoutLinks}
        isPageEditing={false}
      />,
    );

    expect(screen.getByText('Fire & Rescue Equipment')).toBeInTheDocument();
  });

  it('does not render an empty actions wrapper when links are empty in normal mode', () => {
    const { container } = render(
      <PageHeaderDefault
        {...mockPageHeaderPropsWithoutLinks}
        isPageEditing={false}
      />,
    );

    expect(screen.queryByTestId('button-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('button-secondary')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-actions"]'),
    ).not.toBeInTheDocument();
  });

  it('retains both editable link fields when their values are empty in editing mode', () => {
    const { container } = render(
      <PageHeaderDefault
        {...mockPageHeaderPropsWithoutLinks}
        isPageEditing={true}
      />,
    );

    expect(screen.getByTestId('button-default')).toBeInTheDocument();
    expect(screen.getByTestId('button-secondary')).toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-actions"]'),
    ).toBeInTheDocument();
  });

  it('collapses to a single full-width text region when no image is assigned in normal mode', () => {
    const { container } = render(
      <PageHeaderDefault
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={false}
      />,
    );

    const layout = container.querySelector(
      '[data-component-part="page-header-layout"]',
    );

    expect(
      screen.getByRole('heading', { name: 'Services' }),
    ).toBeInTheDocument();
    expect(layout).toBeInTheDocument();
    expect(layout?.children).toHaveLength(1);
    expect(layout).not.toHaveClass('@md/headerwrapper:grid-cols-2');
    expect(
      container.querySelector('[data-component-part="page-header-content"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-image"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-wrapper')).not.toBeInTheDocument();
  });

  it('retains the empty image field in editing mode', () => {
    const { container } = render(
      <PageHeaderDefault
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={true}
      />,
    );

    expect(
      container.querySelector('[data-component-part="page-header-image"]'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('image-wrapper')).toBeInTheDocument();
  });

  it('uses the image-free layout for an empty image in preview mode', () => {
    const previewProps = {
      ...mockPageHeaderPropsWithoutImage,
      page: {
        ...mockPageHeaderPropsWithoutImage.page,
        mode: {
          ...mockPageHeaderPropsWithoutImage.page.mode,
          isPreview: true,
          isNormal: false,
          name: LayoutServicePageState.Preview,
        },
      },
    };
    const { container } = render(
      <PageHeaderDefault {...previewProps} isPageEditing={false} />,
    );

    expect(
      container.querySelector('[data-component-part="page-header-image"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-wrapper')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-layout"]'),
    ).not.toHaveClass('@md/headerwrapper:grid-cols-2');
  });

  it('does not reserve action spacing for a URL-only link that EditableButton cannot render', () => {
    const urlOnlyProps = {
      ...mockPageHeaderPropsWithoutImage,
      fields: {
        ...mockPageHeaderPropsWithoutImage.fields,
        data: {
          ...mockPageHeaderPropsWithoutImage.fields.data,
          datasource: {
            ...mockPageHeaderPropsWithoutImage.fields.data.datasource,
            link1: {
              jsonValue: {
                value: {
                  href: '',
                  url: '/Services/Private-Equity',
                  text: 'Private Equity',
                  linktype: 'internal',
                  target: '',
                },
              },
            },
          },
        },
      },
    };
    const { container } = render(
      <PageHeaderDefault {...urlOnlyProps} isPageEditing={false} />,
    );

    expect(
      container.querySelector('[data-component-part="page-header-actions"]'),
    ).not.toBeInTheDocument();
  });
});
