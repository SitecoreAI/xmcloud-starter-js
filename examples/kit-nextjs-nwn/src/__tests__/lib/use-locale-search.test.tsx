import { renderHook, waitFor } from '@testing-library/react';
import { getClientId } from '@sitecore-content-sdk/analytics-core';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useLocaleSearch } from '@/lib/search/use-locale-search';

jest.mock('@sitecore-content-sdk/analytics-core', () => ({
  getClientId: jest.fn(),
}));

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: jest.fn(),
}));

const mockFetch = jest.fn();

describe('useLocaleSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    jest.mocked(getClientId).mockReturnValue('visitor-123');
    jest.mocked(useSitecore).mockReturnValue({
      api: {
        edge: {
          clientContextId: 'context-123',
          edgeUrl: 'https://edge.example.test',
        },
      },
    } as ReturnType<typeof useSitecore>);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ title: 'Payment Assistance', url: '/payment-assistance' }],
        total: 1,
      }),
    } as Response);
  });

  it('sends the active source configuration, locale, query, and session to Edge Search', async () => {
    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'nwn-site-search',
        locale: 'es-MX',
        query: 'ayuda de pago',
        pageSize: 20,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [requestUrl, requestOptions] = mockFetch.mock.calls[0] as [
      URL,
      RequestInit,
    ];
    expect(requestUrl.toString()).toBe('https://edge.example.test/v1/search');
    expect(requestOptions.headers).toEqual({
      'Content-Type': 'application/json',
      'x-sitecore-contextid': 'context-123',
    });
    expect(JSON.parse(String(requestOptions.body))).toEqual({
      config: { id: 'nwn-site-search' },
      locale: 'es-MX',
      limit: 20,
      offset: 0,
      query: { keyphrase: 'ayuda de pago' },
      sessionId: 'visitor-123',
      sort: { fields: [] },
    });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('does not make a request while disabled', () => {
    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'nwn-site-search',
        locale: 'en',
        enabled: false,
      }),
    );

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('reports an error when Edge rejects the request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 } as Response);

    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'nwn-site-search',
        locale: 'en',
        query: 'rebates',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('reports incomplete runtime configuration without making a request', async () => {
    jest
      .mocked(useSitecore)
      .mockReturnValue({ api: {} } as ReturnType<typeof useSitecore>);

    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'nwn-site-search',
        locale: 'en',
        query: 'rebates',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
