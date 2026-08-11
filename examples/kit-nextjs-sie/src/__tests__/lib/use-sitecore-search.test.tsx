import { renderHook, waitFor } from '@testing-library/react';
import { getClientId } from '@sitecore-content-sdk/analytics-core';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useSitecoreSearch } from '@/lib/search/use-sitecore-search';

jest.mock('@sitecore-content-sdk/analytics-core', () => ({
  getClientId: jest.fn(),
}));

jest.mock('@sitecore-content-sdk/nextjs', () => ({
  useSitecore: jest.fn(),
}));

const mockFetch = jest.fn();

describe('useSitecoreSearch', () => {
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
        content: [
          {
            id: 'payment-options',
            title: 'Payment Options & Locations',
            url: '/payment-options-locations',
          },
        ],
        total: 16,
      }),
    } as Response);
  });

  it('posts the active source, locale, fuzzy query, and paging to SitecoreAI Edge', async () => {
    const { result } = renderHook(() =>
      useSitecoreSearch({
        searchIndexId: 'sienergy-source-123',
        locale: 'en',
        query: 'pay bil',
        page: 2,
        pageSize: 10,
        keepPreviousData: true,
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledTimes(1);
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
      config: { id: 'sienergy-source-123' },
      locale: 'en',
      limit: 10,
      offset: 10,
      query: { keyphrase: 'pay bil' },
      sessionId: 'visitor-123',
      sort: { fields: [] },
    });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.total).toBe(16);
    expect(result.current.totalPages).toBe(2);
  });

  it('reports an error without making a request when Edge context is missing', async () => {
    jest
      .mocked(useSitecore)
      .mockReturnValue({ api: {} } as ReturnType<typeof useSitecore>);

    const { result } = renderHook(() =>
      useSitecoreSearch({
        searchIndexId: 'sienergy-source-123',
        locale: 'en',
        query: 'safety',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports a recoverable error when the Edge request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 } as Response);

    const { result } = renderHook(() =>
      useSitecoreSearch({
        searchIndexId: 'sienergy-source-123',
        locale: 'en',
        query: 'safety',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
