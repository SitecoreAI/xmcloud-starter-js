import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Page, PageMode } from '@sitecore-content-sdk/nextjs';
import Layout from '@/Layout';
import { resolveSlbFallbackPage } from '@/lib/slb-fallback-content';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({
    name,
    rendering,
  }: {
    name: string;
    rendering?: { placeholders?: Record<string, unknown> };
  }) => {
    const presentation = rendering?.placeholders?.[name];
    const componentNames = Array.isArray(presentation)
      ? presentation
          .map((component) =>
            component && typeof component === 'object'
              ? String(
                  (component as { componentName?: unknown }).componentName ||
                    '',
                )
              : '',
          )
          .filter(Boolean)
          .join(',')
      : '';

    return (
      <div
        data-components={componentNames}
        data-testid={`placeholder-${name}`}
      />
    );
  },
  DesignLibraryApp: () => <div data-testid="design-library" />,
}));

jest.mock('@/Scripts', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/content-sdk/SitecoreStyles', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/Providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/slb-fallback/SlbFallbackPage', () => ({
  __esModule: true,
  default: ({ page }: { page: { id: string } }) => (
    <div data-testid="slb-fallback">{page.id}</div>
  ),
}));

jest.mock('@/components/global-header/GlobalHeader', () => ({
  LocalSlbHeader: ({ page }: { page: { locale?: string } }) => (
    <div data-locale={page.locale} data-testid="slb-header-local-fallback" />
  ),
}));

jest.mock('@/components/global-footer/GlobalFooter', () => ({
  LocalSlbFooter: ({
    locale,
    trackingEnabled,
  }: {
    locale?: string;
    trackingEnabled?: boolean;
  }) => (
    <div
      data-locale={locale}
      data-tracking-enabled={String(trackingEnabled)}
      data-testid="slb-footer-local-fallback"
    />
  ),
}));

jest.mock('.sitecore/component-map', () => ({
  __esModule: true,
  default: new Map(),
}));

function createPage({
  isEditing = false,
  isDesignLibrary = false,
  header = [],
  main = [],
  footer = [],
  locale = 'en',
}: {
  isEditing?: boolean;
  isDesignLibrary?: boolean;
  header?: unknown[];
  main?: unknown[];
  footer?: unknown[];
  locale?: string;
} = {}): Page {
  return {
    mode: {
      isEditing,
      isPreview: !isEditing && !isDesignLibrary,
      isNormal: !isEditing && !isDesignLibrary,
      name: (isEditing ? 'edit' : 'normal') as PageMode['name'],
      designLibrary: { isVariantGeneration: false },
      isDesignLibrary,
    },
    layout: {
      sitecore: {
        context: {},
        route: {
          componentName: 'Route',
          placeholders: {
            'headless-header': header,
            'headless-main': main,
            'headless-footer': footer,
          },
        },
      },
    },
    locale,
  } as unknown as Page;
}

describe('Layout route-aware fallback', () => {
  const fallbackPage = resolveSlbFallbackPage('en', ['solutions']);

  it('renders fallback only when the normal main placeholder is empty', () => {
    render(<Layout page={createPage()} fallbackPage={fallbackPage} />);

    expect(screen.getByTestId('slb-fallback')).toHaveTextContent('S01');
    expect(
      screen.queryByTestId('placeholder-headless-main'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('placeholder-headless-header'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('placeholder-headless-footer'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('slb-header-local-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('slb-footer-local-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('slb-footer-local-fallback')).toHaveAttribute(
      'data-tracking-enabled',
      'true',
    );
  });

  it('defers nonempty header and footer presentation to Sitecore', () => {
    render(
      <Layout
        page={createPage({
          header: [{ componentName: 'GlobalHeader' }],
          footer: [{ componentName: 'GlobalFooter' }],
        })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(
      screen.getByTestId('placeholder-headless-header'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('placeholder-headless-footer'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('slb-header-local-fallback'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('slb-footer-local-fallback'),
    ).not.toBeInTheDocument();
  });

  it('defers incompatible main presentation to Sitecore', () => {
    render(
      <Layout
        page={createPage({ main: [{ componentName: 'PageHeader' }] })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('placeholder-headless-main')).toBeInTheDocument();
  });

  it('renders compatible CTA Banner presentation before the curated fallback', () => {
    const { container } = render(
      <Layout
        page={createPage({
          main: [
            { componentName: 'CtaBanner' },
            { componentName: 'CtaBanner' },
          ],
        })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('placeholder-headless-main')).toBeInTheDocument();
    expect(screen.getByTestId('slb-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('placeholder-headless-main')).toHaveAttribute(
      'data-components',
      'CtaBanner,CtaBanner',
    );

    const contentChildren = Array.from(
      container.querySelector('#content')?.children || [],
    ).map((element) => element.getAttribute('data-testid'));
    expect(contentChildren).toEqual([
      'placeholder-headless-main',
      'slb-fallback',
    ]);
  });

  it('filters mixed legacy presentation in normal mode and exposes it for authoring', () => {
    const mixedMain = [
      {
        componentName: 'PageHeader',
        fields: { title: { value: 'Welcome to SOLTERRA' } },
      },
      {
        componentName: 'CtaBanner',
        fields: { titleRequired: { value: 'Smarter energy operations' } },
      },
      {
        componentName: 'PromoBlock',
        fields: { title: { value: 'The Ordinary Kit' } },
      },
    ];

    const { rerender } = render(
      <Layout
        page={createPage({ main: mixedMain })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('placeholder-headless-main')).toHaveAttribute(
      'data-components',
      'CtaBanner',
    );
    expect(screen.getByTestId('slb-fallback')).toBeInTheDocument();

    rerender(
      <Layout
        page={createPage({ isEditing: true, main: mixedMain })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('placeholder-headless-main')).toHaveAttribute(
      'data-components',
      'PageHeader,CtaBanner,PromoBlock',
    );
    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
  });

  it('keeps normal non-fallback routes entirely Sitecore-owned', () => {
    render(
      <Layout page={createPage({ main: [{ componentName: 'CtaBanner' }] })} />,
    );

    expect(screen.getByTestId('placeholder-headless-main')).toBeInTheDocument();
    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
  });

  it('keeps inherited Solterra presentation hidden publicly but exposes it in editing', () => {
    const inheritedMain = [
      {
        componentName: 'PageHeader',
        fields: { title: { value: 'Welcome to SOLTERRA' } },
      },
    ];
    const { rerender } = render(
      <Layout
        page={createPage({ main: inheritedMain })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('slb-fallback')).toBeInTheDocument();
    expect(
      screen.queryByTestId('placeholder-headless-main'),
    ).not.toBeInTheDocument();

    rerender(
      <Layout
        page={createPage({ isEditing: true, main: inheritedMain })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('placeholder-headless-main')).toHaveAttribute(
      'data-components',
      'PageHeader',
    );
    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
  });

  it('keeps the Sitecore placeholder and shows a noninteractive preview while editing', () => {
    render(
      <Layout
        page={createPage({ isEditing: true })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('slb-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('placeholder-headless-main')).toBeInTheDocument();
    expect(
      screen.getByTestId('placeholder-headless-header'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('placeholder-headless-footer'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('slb-header-local-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('slb-footer-local-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('slb-footer-local-fallback')).toHaveAttribute(
      'data-tracking-enabled',
      'false',
    );
  });

  it('passes the active Spanish locale to both local chrome components', () => {
    const spanishFallbackPage = resolveSlbFallbackPage('es-MX', ['soluciones']);

    render(
      <Layout
        page={createPage({ locale: 'es-MX' })}
        fallbackPage={spanishFallbackPage}
      />,
    );

    expect(screen.getByTestId('slb-header-local-fallback')).toHaveAttribute(
      'data-locale',
      'es-MX',
    );
    expect(screen.getByTestId('slb-footer-local-fallback')).toHaveAttribute(
      'data-locale',
      'es-MX',
    );
  });

  it('never injects fallback content in Design Library', () => {
    render(
      <Layout
        page={createPage({ isDesignLibrary: true })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.getByTestId('design-library')).toBeInTheDocument();
    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
  });
});
