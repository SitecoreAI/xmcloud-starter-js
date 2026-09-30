'use client';
import { RichText, Text } from '@sitecore-content-sdk/nextjs';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useId, useState } from 'react';
import indexJson from './search-index.json';
import { searchPublicRoutes } from './search-rules.props';
import type { AllianzSearchProps } from './allianz-search.props';

const SearchResults = ({ fields, params = {} }: AllianzSearchProps) => {
  const path = usePathname();
  const router = useRouter();
  const query = (useSearchParams().get('q') || '').slice(0, 50);
  const [input, setInput] = useState(query);
  const [limit, setLimit] = useState(10);
  const id = useId().replace(/:/g, '');
  const data = fields?.data?.datasource;
  const market = path.startsWith('/new-york') ? 'new-york' : params.market;
  const searchPath = market === 'new-york' ? '/new-york/search' : '/search';
  const matches = searchPublicRoutes(indexJson, query, market);
  return <section className="allianz-local-search" id={params.RenderingIdentifier}>
    {data?.heading?.jsonValue?.value && <Text tag="h2" field={data.heading.jsonValue} />}
    {data?.body?.jsonValue?.value && <RichText field={data.body.jsonValue} />}
    <form role="search" className="form-inline" onSubmit={(event) => {
      event.preventDefault();
      const nextQuery = input.trim().slice(0, 50);
      setLimit(10);
      router.push(nextQuery ? `${searchPath}?q=${encodeURIComponent(nextQuery)}` : searchPath);
    }}>
      <label htmlFor={`${id}-query`} className="sr-only">Search this website</label><div className="input-group">
        <input type="search" className="form-control" id={`${id}-query`} name="q" placeholder={data?.placeholder?.jsonValue?.value || 'e.g. Annuities'} value={input} onChange={(event) => setInput(event.target.value.slice(0, 50))} maxLength={50} />
        <span className="input-group-btn"><button type="submit" className="btn btn-primary">Search</button></span>
      </div>
    </form>
    {query.trim() ? <div className="allianz-local-search-results" aria-live="polite">
      <p>{matches.length} {data?.resultLabel?.jsonValue ? <Text field={data.resultLabel.jsonValue} /> : matches.length === 1 ? 'result' : 'results'} for <strong>{query}</strong></p>
      {matches.length ? <ol>{matches.slice(0, limit).map((entry) => <li key={entry.path}><h3><NextLink href={entry.path}>{entry.title}</NextLink></h3>{entry.description && <p>{entry.description}</p>}</li>)}</ol> : <p>{data?.noResultsMessage?.jsonValue ? <Text field={data.noResultsMessage.jsonValue} /> : 'No results found. Please try a different search.'}</p>}
      {matches.length > limit && <button className="btn btn-default" type="button" onClick={() => setLimit((previous) => previous + 10)}>Show more results</button>}
    </div> : <p className="help-block">Enter a word or phrase to search this website.</p>}
  </section>;
};

// Remount query-local drafts and pagination for navigation, including Back/Forward.
const Search = (props: AllianzSearchProps) => <SearchResults key={(useSearchParams().get('q') || '').slice(0, 50)} {...props} />;

export const Default = (props: AllianzSearchProps) => <Suspense fallback={<p>Loading search...</p>}><Search {...props} /></Suspense>;
