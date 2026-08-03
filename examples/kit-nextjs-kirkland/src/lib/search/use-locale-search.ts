'use client';

import { getClientId } from '@sitecore-content-sdk/analytics-core';
import { useSitecore } from '@sitecore-content-sdk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_EDGE_URL = 'https://edge-platform.sitecorecloud.io';

type SearchDocument = Record<string, unknown>;

type SortSetting<T extends SearchDocument> = {
  name: Extract<keyof T, string> | string;
  order: 'asc' | 'desc';
};

export type LocaleSearchOptions<T extends SearchDocument> = {
  searchIndexId: string;
  locale: string;
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: SortSetting<T> | SortSetting<T>[];
  enabled?: boolean;
  keepPreviousData?: boolean;
};

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

type LocaleSearchState<T extends SearchDocument> = {
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

type SearchApiResponse<T extends SearchDocument> = {
  content?: T[];
  total?: number;
  errors?: { message?: string; code?: number }[];
};

/**
 * Executes a SitecoreAI Search request in an explicit source locale.
 *
 * The Content SDK 2.x search hook does not currently expose the Edge Search
 * API's top-level locale parameter, so multilingual sites need this small
 * wrapper to keep server-side totals and pagination language-specific.
 */
export function useLocaleSearch<T extends SearchDocument = SearchDocument>({
  searchIndexId,
  locale,
  query = '',
  page = 1,
  pageSize = 10,
  sort,
  enabled = true,
  keepPreviousData = false,
}: LocaleSearchOptions<T>): LocaleSearchState<T> {
  const { api } = useSitecore();
  const contextId = api?.edge?.clientContextId;
  const edgeUrl = api?.edge?.edgeUrl || DEFAULT_EDGE_URL;
  const abortController = useRef<AbortController | null>(null);
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
  const requestScope = useRef({ locale, searchIndexId });

  const sortFields = useMemo(
    () => (sort ? (Array.isArray(sort) ? sort : [sort]) : []),
    [sort],
  );

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
        // Search works without an analytics client id.
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
          sort: { fields: sortFields },
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
    sortFields,
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
