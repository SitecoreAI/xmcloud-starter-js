import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PageHeaderOfficeBanner } from '@/components/page-header/PageHeaderOfficeBanner.dev';
import {
  mockPageHeaderProps,
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
    <div className={className} data-testid="richtext-component">
      {field?.value}
    </div>
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

describe('PageHeaderOfficeBanner', () => {
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

  it('renders an image-backed office banner with page content and valid actions', () => {
    const { container } = render(
      <PageHeaderOfficeBanner {...mockPageHeaderProps} isPageEditing={false} />,
    );

    expect(
      screen.getByText('Advanced Emergency Response Vehicles'),
    ).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByTestId('richtext-component')).toBeInTheDocument();
    expect(screen.getByTestId('image-wrapper')).toHaveClass(
      'object-cover',
      'object-center',
    );
    expect(screen.getByTestId('image-wrapper-container')).toHaveClass(
      'absolute',
      'inset-0',
    );
    expect(screen.getByTestId('button-default')).toHaveTextContent(
      'Explore Our Fleet',
    );
    expect(screen.getByTestId('button-secondary')).toHaveTextContent(
      'Contact Sales',
    );
    expect(
      container.querySelector('[data-page-header-variant="office-banner"]'),
    ).toBeInTheDocument();
  });

  it('does not show empty link placeholders in editing mode', () => {
    const { container } = render(
      <PageHeaderOfficeBanner
        {...mockPageHeaderPropsWithoutLinks}
        isPageEditing={true}
      />,
    );

    expect(screen.queryByTestId('button-default')).not.toBeInTheDocument();
    expect(screen.queryByTestId('button-secondary')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-component-part="page-header-actions"]'),
    ).not.toBeInTheDocument();
  });

  it('shows a purposeful empty image field in editing mode', () => {
    render(
      <PageHeaderOfficeBanner
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={true}
      />,
    );

    expect(
      screen.getByText('Choose an office banner image'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('image-wrapper-container')).toBeInTheDocument();
    expect(screen.getByTestId('sitecore-image-field')).toBeInTheDocument();
  });

  it('does not render an empty image wrapper in normal mode', () => {
    render(
      <PageHeaderOfficeBanner
        {...mockPageHeaderPropsWithoutImage}
        isPageEditing={false}
      />,
    );

    expect(
      screen.queryByTestId('image-wrapper-container'),
    ).not.toBeInTheDocument();
  });

  it('renders the standard fallback when fields are unavailable', () => {
    render(
      <PageHeaderOfficeBanner
        {...mockPageHeaderProps}
        fields={null as never}
        isPageEditing={false}
      />,
    );

    expect(screen.getByTestId('no-data-fallback')).toHaveTextContent(
      'No Data: PageHeader',
    );
  });
});
