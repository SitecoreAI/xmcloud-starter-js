/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server';

const mockExec = jest.fn();

jest.mock('@/lib/sitecore-client', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'es-MX'] },
}));

jest.mock('sitecore.config', () => ({
  __esModule: true,
  default: {
    api: { edge: {}, local: {} },
    multisite: {},
    redirects: {},
    personalize: {},
  },
}));

jest.mock('@sitecore-content-sdk/nextjs/proxy', () => ({
  defineProxy: jest.fn(() => ({ exec: mockExec })),
  PreviewProxy: jest.fn(),
  AppRouterMultisiteProxy: jest.fn(),
  PersonalizeProxy: jest.fn(),
  RedirectsProxy: jest.fn(),
  LocaleProxy: jest.fn(),
}));

import proxy, { normalizePublicLocalePathname } from '@/proxy';

describe('public locale proxy normalization', () => {
  beforeEach(() => {
    mockExec.mockReset();
    mockExec.mockImplementation(async (request: NextRequest) => {
      const response = NextResponse.next();
      response.headers.set(
        'x-sc-locale',
        request.nextUrl.pathname.startsWith('/es-MX') ? 'es-MX' : 'en',
      );
      return response;
    });
  });

  it('normalizes only a leading lowercase Spanish locale segment', () => {
    expect(normalizePublicLocalePathname('/es-mx/soluciones')).toBe(
      '/es-MX/soluciones',
    );
    expect(normalizePublicLocalePathname('/es-mx')).toBe('/es-MX');
    expect(normalizePublicLocalePathname('/about/es-mx')).toBe('/about/es-mx');
    expect(normalizePublicLocalePathname('/es-mx-extra/soluciones')).toBe(
      '/es-mx-extra/soluciones',
    );
  });

  it('uses es-MX internally without replacing Sitecore editing request headers', async () => {
    const editingParams = JSON.stringify({ language: 'es-MX', mode: 'edit' });
    const request = new NextRequest(
      'https://www.example.com/es-mx/soluciones',
      { headers: { 'x-sitecore-editing-params': editingParams } },
    );

    const response = await proxy(request);
    const proxiedRequest = mockExec.mock.calls[0][0] as NextRequest;

    expect(request.nextUrl.pathname).toBe('/es-mx/soluciones');
    expect(proxiedRequest.nextUrl.pathname).toBe('/es-MX/soluciones');
    expect(proxiedRequest.headers.get('x-sitecore-editing-params')).toBe(
      editingParams,
    );
    expect(response.headers.get('x-sc-locale')).toBe('es-MX');
    expect(response.headers.get('x-middleware-override-headers')).toBeNull();
  });
});
