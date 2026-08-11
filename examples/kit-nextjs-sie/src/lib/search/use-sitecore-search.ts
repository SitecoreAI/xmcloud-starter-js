'use client';

import { getClientId } from '@sitecore-content-sdk/analytics-core';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_EDGE_URL = 'https://edge-platform.sitecorecloud.io';

export type SitecoreSearchDocument = Record<string, unknown>;

export type SitecoreSearchOptions<T extends SitecoreSearchDocument> = {
  searchIndexId: string;
  locale: string;
  query: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  keepPreviousData?: boolean;
};

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

export type SitecoreSearchState<T extends SitecoreSearchDocument> = {
  results: T[];
  total: number;
  totalPages: number;
  error: Error | null;
  status: SearchStatus;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isPreviousData: boolean;
};

type SearchApiResponse<T extends SitecoreSearchDocument> = {
  content?: T[];
  total?: number;
  errors?: { message?: string; code?: number }[];
};

/** Executes an indexed SitecoreAI Edge Search using the current visitor context. */
export function useSitecoreSearch<
  T extends SitecoreSearchDocument = SitecoreSearchDocument,
>({
  searchIndexId,
  locale,
  query,
  page = 1,
  pageSize = 10,
  enabled = true,
  keepPreviousData = false,
}: SitecoreSearchOptions<T>): SitecoreSearchState<T> {
  const { api } = useSitecore();
  const contextId = api?.edge?.clientContextId;
  const edgeUrl = api?.edge?.edgeUrl || DEFAULT_EDGE_URL;
  const abortController = useRef<AbortController | null>(null);
  const requestScope = useRef({ locale, searchIndexId });
  const [state, setState] = useState<{
    results: T[];
    total: number;
    totalPages: number;
    error: Error | null;
    status: SearchStatus;
    previousDataRetained: boolean;
  }>({
    results: [],
    total: 0,
    totalPages: 0,
    error: null,
    status: 'idle',
    previousDataRetained: false,
  });

  const search = useCallback(async () => {
    if (!searchIndexId || !contextId) {
      setState({
        results: [],
        total: 0,
        totalPages: 0,
        error: new Error('SitecoreAI Search configuration is incomplete.'),
        status: 'error',
        previousDataRetained: false,
      });
      return;
    }

    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    const canKeepPreviousData =
      keepPreviousData &&
      requestScope.current.locale === locale &&
      requestScope.current.searchIndexId === searchIndexId;
    requestScope.current = { locale, searchIndexId };

    setState((previous) => ({
      results: canKeepPreviousData ? previous.results : [],
      total: canKeepPreviousData ? previous.total : 0,
      totalPages: canKeepPreviousData ? previous.totalPages : 0,
      error: null,
      status: 'loading',
      previousDataRetained:
        canKeepPreviousData && previous.status === 'success',
    }));

    try {
      let sessionId = '';
      try {
        sessionId = getClientId();
      } catch {
        // Search remains available when analytics has not assigned a client id.
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
          offset: page === 1 ? 0 : pageSize * (page - 1),
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

      const results = Array.isArray(data.content) ? data.content : [];
      const total = typeof data.total === 'number' ? data.total : 0;

      setState({
        results,
        total,
        totalPages: Math.ceil(total / pageSize),
        error: null,
        status: 'success',
        previousDataRetained: false,
      });
    } catch (error) {
      if (signal.aborted) return;

      setState({
        results: [],
        total: 0,
        totalPages: 0,
        error:
          error instanceof Error
            ? error
            : new Error('SitecoreAI Search request failed.'),
        status: 'error',
        previousDataRetained: false,
      });
    }
  }, [
    contextId,
    edgeUrl,
    keepPreviousData,
    locale,
    page,
    pageSize,
    query,
    searchIndexId,
  ]);

  useEffect(() => {
    if (enabled) void search();

    return () => abortController.current?.abort();
  }, [enabled, search]);

  return useMemo(
    () => ({
      error: state.error,
      results: state.results,
      total: state.total,
      totalPages: state.totalPages,
      status: state.status,
      isLoading: state.status === 'loading',
      isSuccess: state.status === 'success',
      isError: state.status === 'error',
      isPreviousData: state.previousDataRetained && state.status === 'loading',
    }),
    [state],
  );
}
