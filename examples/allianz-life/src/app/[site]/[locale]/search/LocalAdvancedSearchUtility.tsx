'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { SEARCH_QUERY_LIMIT } from '../../../../components/allianz-search/search-rules.props';
import {
  ADVANCED_SEARCH_PATH,
  advancedSearchHref,
  advancedSearchLimit,
  normalizeAdvancedSearch,
} from './advanced-search-model';
import type { LocalAdvancedSearchUtilityProps } from './LocalAdvancedSearchUtility.props';
import styles from './advanced-search.module.css';

/** This demo uses client navigation; CSP forbids native form submissions. */
export default function LocalAdvancedSearchUtility({ state, matches }: LocalAdvancedSearchUtilityProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(state);
  const [limit, setLimit] = useState(advancedSearchLimit(state.pageSize, matches.length));
  const [pending, startTransition] = useTransition();
  const id = useId().replace(/:/g, '');
  const visibleCount = Math.min(limit, matches.length);

  function clearSearch() {
    setDraft(normalizeAdvancedSearch({}));
    setLimit(12);
    startTransition(() => router.push(ADVANCED_SEARCH_PATH));
  }

  return <section className="allianz-local-search" aria-label="Local advanced search demo">
    <form role="search" aria-label="Search captured New York content" onSubmit={(event) => {
      event.preventDefault();
      const next = normalizeAdvancedSearch({ q: draft.query, within: draft.within, sort: draft.sort, size: draft.pageSize });
      setDraft(next);
      setLimit(advancedSearchLimit(next.pageSize, matches.length));
      startTransition(() => router.push(advancedSearchHref(next)));
    }}>
      <fieldset className={styles.controls} disabled={pending}>
        <legend>Search options</legend>
        <div className={styles.query}>
          <label htmlFor={`${id}-query`}>Search words</label>
          <input type="search" className="form-control" id={`${id}-query`} name="q" value={draft.query}
            onChange={(event) => setDraft({ ...draft, query: event.target.value.slice(0, SEARCH_QUERY_LIMIT) })}
            maxLength={SEARCH_QUERY_LIMIT} aria-describedby={`${id}-help`} />
          <p id={`${id}-help`} className="help-block">Use up to {SEARCH_QUERY_LIMIT} characters. Every search word must match.</p>
        </div>
        <div>
          <label htmlFor={`${id}-within`}>Search within</label>
          <select className="form-control" id={`${id}-within`} name="within" value={draft.within}
            onChange={(event) => setDraft({ ...draft, within: event.target.value === 'titles' ? 'titles' : 'all' })}>
            <option value="all">All captured page text</option>
            <option value="titles">Page titles</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-sort`}>Sort results</label>
          <select className="form-control" id={`${id}-sort`} name="sort" value={draft.sort}
            onChange={(event) => setDraft({ ...draft, sort: event.target.value === 'title' ? 'title' : 'best' })}>
            <option value="best">Best match</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-size`}>Results per page</label>
          <select className="form-control" id={`${id}-size`} name="size" value={draft.pageSize}
            onChange={(event) => setDraft({ ...draft, pageSize: normalizeAdvancedSearch({ size: event.target.value }).pageSize })}>
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="60">60</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">Search</button>
          <button type="button" className="btn btn-default" onClick={clearSearch}>Clear search</button>
        </div>
      </fieldset>
    </form>
    <div className="allianz-local-search-results" aria-busy={pending}>
      <div role="status" aria-live="polite" aria-atomic="true">
        {pending && <p>Searching…</p>}
        {state.query
          ? <p>{matches.length} {matches.length === 1 ? 'result' : 'results'} for <strong>{state.query}</strong>{matches.length > 0 && <>. Showing {visibleCount} of {matches.length}.</>}</p>
          : <p>Enter one or more words to search the captured New York pages.</p>}
      </div>
      {state.query && (matches.length ? <>
        <ol>{matches.slice(0, limit).map((entry) => <li key={entry.path}>
          <h2><NextLink href={entry.path}>{entry.title}</NextLink></h2>
          {entry.description && <p>{entry.description}</p>}
        </li>)}</ol>
        {matches.length > limit && <button type="button" className="btn btn-default" disabled={pending}
          onClick={() => setLimit((previous) => previous + advancedSearchLimit(state.pageSize, matches.length))}>Show more results</button>}
      </> : <p>No results found. Try different words or search all captured page text.</p>)}
    </div>
    <noscript><p>Local search navigation needs JavaScript. Form submissions are disabled in this demo.</p></noscript>
  </section>;
}
