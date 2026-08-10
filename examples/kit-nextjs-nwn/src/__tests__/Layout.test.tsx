import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Page } from '@sitecore-content-sdk/nextjs';
import Layout from '@/Layout';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({ name }: { name: string }) => (
    <div data-placeholder={name} />
  ),
  DesignLibraryApp: () => <div data-design-library />,
}));

jest.mock('../../.sitecore/component-map', () => ({
  __esModule: true,
  default: new Map(),
}));

jest.mock('@/Scripts', () => () => null);
jest.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));
jest.mock('@/components/content-sdk/SitecoreStyles', () => () => null);
jest.mock('@/components/structured-data/StructuredData', () => ({
  StructuredData: () => null,
}));
jest.mock('@/lib/structured-data/schema', () => ({
  generateWebSiteSchema: () => ({}),
  generateOrganizationSchema: () => ({}),
}));
jest.mock('@/lib/utils', () => ({ getBaseUrl: () => 'https://example.com' }));
jest.mock('@/Providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createPage = (routeName: string): Page =>
  ({
    layout: { sitecore: { route: { name: routeName, placeholders: {} } } },
    mode: { isEditing: false, isDesignLibrary: false },
  }) as unknown as Page;

describe('NWN Layout', () => {
  it('exposes the governed alert placeholder before main content on Home', () => {
    const markup = renderToStaticMarkup(<Layout page={createPage('Home')} />);

    expect(markup).toContain('data-placeholder="nwn-home-alert"');
    expect(markup.indexOf('data-placeholder="nwn-home-alert"')).toBeLessThan(
      markup.indexOf('data-placeholder="headless-main"'),
    );
  });

  it('does not expose the homepage alert placeholder on other routes', () => {
    const markup = renderToStaticMarkup(
      <Layout page={createPage('payment-assistance')} />,
    );

    expect(markup).not.toContain('data-placeholder="nwn-home-alert"');
    expect(markup).toContain('data-placeholder="headless-main"');
  });
});
