'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { normalizeSearchQuery, SEARCH_QUERY_LIMIT, type SearchEntry } from '../../../../components/allianz-search/search-rules.props';

export interface LocalSearchUtilityProps { query: string; matches: SearchEntry[]; market?: 'new-york' }

/** Client navigation only: the site's CSP deliberately forbids form submission. */
export default function LocalSearchUtility({ query, matches, market }: LocalSearchUtilityProps) {
  const router = useRouter();
  const [input, setInput] = useState(query);
  const [limit, setLimit] = useState(10);
  const [pending, startTransition] = useTransition();
  const id = useId().replace(/:/g, '');
  const searchPath = market === 'new-york' ? '/new-york/search' : '/search';
  return <section className="allianz-local-search" aria-label="Local website search">
    <form role="search" aria-label="Search imported public content" className="form-inline" onSubmit={(event) => {
      event.preventDefault();
      const nextQuery = normalizeSearchQuery(input);
      setLimit(10);
      startTransition(() => router.push(nextQuery ? `${searchPath}?q=${encodeURIComponent(nextQuery)}` : searchPath));
    }}>
      <label htmlFor={`${id}-query`}>Search this website</label>
      <div className="input-group">
        <input type="search" className="form-control" id={`${id}-query`} name="q" placeholder="e.g. Annuities" value={input} onChange={(event) => setInput(event.target.value.slice(0, SEARCH_QUERY_LIMIT))} maxLength={SEARCH_QUERY_LIMIT} aria-describedby={`${id}-help`} />
        <span className="input-group-btn"><button type="submit" className="btn btn-primary" disabled={pending}>Search</button></span>
      </div>
      <p id={`${id}-help`} className="help-block">Search up to {SEARCH_QUERY_LIMIT} characters.</p>
    </form>
    <div className="allianz-local-search-results" role="status" aria-live="polite" aria-atomic="true" aria-busy={pending}>
      {pending && <p>Searching…</p>}
      {query ? <>
        <p>{matches.length} {matches.length === 1 ? 'result' : 'results'} for <strong>{query}</strong></p>
        {matches.length ? <ol>{matches.slice(0, limit).map((entry) => <li key={entry.path}><h2><NextLink href={entry.path}>{entry.title}</NextLink></h2>{entry.description && <p>{entry.description}</p>}</li>)}</ol> : <p>No results found. Please try a different search.</p>}
        {matches.length > limit && <button className="btn btn-default" type="button" onClick={() => setLimit((previous) => previous + 10)}>Show more results</button>}
      </> : <p>Enter a word or phrase to search this website.</p>}
    </div>
    <noscript><p>Local search navigation needs JavaScript. Form submissions are disabled in this demo.</p></noscript>
  </section>;
}
