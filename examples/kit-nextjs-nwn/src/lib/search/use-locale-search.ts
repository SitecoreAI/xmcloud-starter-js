'use client';

import { getClientId } from '@sitecore-content-sdk/analytics-core';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_EDGE_URL = 'https://edge-platform.sitecorecloud.io';

type SearchDocument = Record<string, unknown>;

export type LocaleSearchOptions<T extends SearchDocument> = {
  searchIndexId: string;
  locale: string;
  query?: string;
  pageSize?: number;
  enabled?: boolean;
};

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

type SearchApiResponse<T extends SearchDocument> = {
  content?: T[];
  total?: number;
  errors?: { message?: string; code?: number }[];
};

type LocaleSearchState<T extends SearchDocument> = {
  results: T[];
  total: number;
  error: Error | null;
  status: SearchStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
};

/**
 * Runs a SitecoreAI Edge Search request in the page's explicit source locale.
 */
export function useLocaleSearch<T extends SearchDocument = SearchDocument>({
  searchIndexId,
  locale,
  query = '',
  pageSize = 20,
  enabled = true,
}: LocaleSearchOptions<T>): LocaleSearchState<T> {
  const { api } = useSitecore();
  const contextId = api?.edge?.clientContextId;
  const edgeUrl = api?.edge?.edgeUrl || DEFAULT_EDGE_URL;
  const abortController = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    results: T[];
    total: number;
    error: Error | null;
    status: SearchStatus;
  }>({
    results: [],
    total: 0,
    error: null,
    status: 'idle',
  });

  const search = useCallback(async () => {
    if (!searchIndexId || !contextId) {
      setState({
        results: [],
        total: 0,
        error: new Error('SitecoreAI Search configuration is incomplete.'),
        status: 'error',
      });
      return;
    }

    abortController.current?.abort();
    abortController.current = new AbortController();
    const signal = abortController.current.signal;

    setState({ results: [], total: 0, error: null, status: 'loading' });

    try {
      let sessionId = '';
      try {
        sessionId = getClientId();
      } catch {
        // Search does not require an analytics client id.
      }

      const response = await fetch(new URL('/v1/search', edgeUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sitecore-contextid': contextId,
        },
        body: JSON.stringify({
          config: { id: searchIndexId },
          locale,
          limit: pageSize,
          offset: 0,
          query: { keyphrase: query },
          sessionId,
          sort: { fields: [] },
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`SitecoreAI Search returned ${response.status}.`);
      }

      const data = (await response.json()) as SearchApiResponse<T>;
      if (data.errors?.length) {
        throw new Error('SitecoreAI Search rejected the request.');
      }
      if (signal.aborted) return;

      setState({
        results: Array.isArray(data.content) ? data.content : [],
        total: typeof data.total === 'number' ? data.total : 0,
        error: null,
        status: 'success',
      });
    } catch (error) {
      if (signal.aborted) return;

      setState({
        results: [],
        total: 0,
        error:
          error instanceof Error
            ? error
            : new Error('SitecoreAI Search request failed.'),
        status: 'error',
      });
    }
  }, [contextId, edgeUrl, locale, pageSize, query, searchIndexId]);

  useEffect(() => {
    if (enabled) void search();

    return () => abortController.current?.abort();
  }, [enabled, search]);

  return useMemo(
    () => ({
      ...state,
      isLoading: state.status === 'loading',
      isSuccess: state.status === 'success',
      isError: state.status === 'error',
    }),
    [state],
  );
}
