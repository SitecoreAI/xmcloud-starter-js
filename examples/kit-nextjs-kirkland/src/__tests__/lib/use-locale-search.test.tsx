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
        content: [
          {
            sc_item_id: 'fr-result',
            sc_locale: 'fr-FR',
            sc_url: 'https://example.test/fr-FR/About',
            title: 'À propos de Kirkland',
          },
        ],
        total: 28,
      }),
    } as Response);
  });

  it('sends the active locale and preserves server-side pagination', async () => {
    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'source-123',
        locale: 'fr-FR',
        query: 'Kirkland',
        page: 2,
        pageSize: 9,
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
      config: { id: 'source-123' },
      locale: 'fr-FR',
      limit: 9,
      offset: 9,
      query: { keyphrase: 'Kirkland' },
      sessionId: 'visitor-123',
      sort: { fields: [] },
    });
    expect(result.current.results).toHaveLength(1);
    expect(result.current.total).toBe(28);
    expect(result.current.totalPages).toBe(4);
  });

  it('reruns the request when the page language changes', async () => {
    let resolveJapaneseRequest: ((response: Response) => void) | undefined;
    mockFetch.mockImplementationOnce(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ sc_locale: 'en', title: 'English result' }],
        total: 1,
      }),
    }));
    mockFetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveJapaneseRequest = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ locale }) =>
        useLocaleSearch({
          searchIndexId: 'source-123',
          locale,
          pageSize: 9,
          keepPreviousData: true,
        }),
      { initialProps: { locale: 'en' } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.results).toHaveLength(1);
    rerender({ locale: 'ja-JP' });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.results).toEqual([]);
    expect(result.current.isPreviousData).toBe(false);

    const secondRequest = mockFetch.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(secondRequest.body)).locale).toBe('ja-JP');

    resolveJapaneseRequest?.({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ sc_locale: 'ja-JP', title: 'Japanese result' }],
        total: 1,
      }),
    } as Response);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('treats an empty successful locale index as zero results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'source-123',
        locale: 'fr-FR',
      }),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.totalPages).toBe(0);
  });

  it('reports a recoverable error when the Edge request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 } as Response);

    const { result } = renderHook(() =>
      useLocaleSearch({
        searchIndexId: 'source-123',
        locale: 'fr-FR',
      }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.total).toBe(0);
  });
});
