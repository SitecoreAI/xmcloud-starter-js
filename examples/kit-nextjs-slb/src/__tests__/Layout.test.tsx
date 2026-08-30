import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Page, PageMode } from '@sitecore-content-sdk/nextjs';
import Layout from '@/Layout';
import { resolveSlbFallbackPage } from '@/lib/slb-fallback-content';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({ name }: { name: string }) => (
    <div data-testid={`placeholder-${name}`} />
  ),
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

jest.mock('.sitecore/component-map', () => ({
  __esModule: true,
  default: new Map(),
}));

function createPage({
  isEditing = false,
  isDesignLibrary = false,
  main = [],
}: {
  isEditing?: boolean;
  isDesignLibrary?: boolean;
  main?: unknown[];
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
            'headless-header': [],
            'headless-main': main,
            'headless-footer': [],
          },
        },
      },
    },
    locale: 'en',
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
      screen.getByTestId('placeholder-headless-header'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('placeholder-headless-footer'),
    ).toBeInTheDocument();
  });

  it('defers to Sitecore as soon as the main placeholder has a rendering', () => {
    render(
      <Layout
        page={createPage({ main: [{ componentName: 'PageHeader' }] })}
        fallbackPage={fallbackPage}
      />,
    );

    expect(screen.queryByTestId('slb-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('placeholder-headless-main')).toBeInTheDocument();
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
