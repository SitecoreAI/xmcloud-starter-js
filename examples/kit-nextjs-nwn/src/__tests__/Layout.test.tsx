import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Page } from '@sitecore-content-sdk/nextjs';
import Layout from '@/Layout';

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  AppPlaceholder: ({
    name,
    rendering,
  }: {
    name: string;
    rendering: { placeholders?: Record<string, unknown> };
  }) => (
    <div
      data-placeholder={name}
      data-placeholder-registered={String(
        Object.prototype.hasOwnProperty.call(
          rendering.placeholders ?? {},
          name,
        ),
      )}
    />
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
jest.mock('@/components/paperless-opt-in/PaperlessOptInButton', () => ({
  PaperlessOptInExperience: ({ locale }: { locale?: string }) => (
    <section data-paperless-opt-in={locale} />
  ),
}));

const createPage = (routeName: string, isEditing = false): Page =>
  ({
    layout: { sitecore: { route: { name: routeName, placeholders: {} } } },
    mode: { isEditing, isDesignLibrary: false },
  }) as unknown as Page;

describe('NWN Layout', () => {
  it('renders standard root placeholders without synthesizing an alert slot', () => {
    const markup = renderToStaticMarkup(<Layout page={createPage('Home')} />);

    expect(markup).not.toContain('data-placeholder="nwn-home-alert"');
    expect(markup).toContain('data-placeholder="headless-header"');
    expect(markup).toContain('data-placeholder="headless-main"');
    expect(markup).toContain('data-placeholder="headless-footer"');
  });

  it('renders the paperless experience inside main only when requested', () => {
    const ordinaryMarkup = renderToStaticMarkup(
      <Layout page={createPage('Account & Billing')} />,
    );
    const optInMarkup = renderToStaticMarkup(
      <Layout
        page={createPage('Account & Billing')}
        paperlessOptInLocale="es-MX"
      />,
    );
    const editingMarkup = renderToStaticMarkup(
      <Layout
        page={createPage('Account & Billing', true)}
        paperlessOptInLocale="en"
      />,
    );

    expect(ordinaryMarkup).not.toContain('data-paperless-opt-in');
    expect(editingMarkup).not.toContain('data-paperless-opt-in');
    expect(optInMarkup).toContain('data-paperless-opt-in="es-MX"');
    expect(optInMarkup.indexOf('data-paperless-opt-in')).toBeLessThan(
      optInMarkup.indexOf('data-placeholder="headless-main"'),
    );
  });
});
