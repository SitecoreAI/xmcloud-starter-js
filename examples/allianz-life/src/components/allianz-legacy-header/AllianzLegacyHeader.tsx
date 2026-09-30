'use client';
import { Image, Link, Text } from '@sitecore-content-sdk/nextjs';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink, type AllianzProps } from 'lib/allianz-fields';

/** Native legacy chrome; search uses the local demo search route. */
export const Default = ({ fields, params = {} }: AllianzProps) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const id = useId().replace(/:/g, '');
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyHeader" />;
  const homeLink = safeLink(data.link?.jsonValue || { value: { href: '/', text: 'Allianz Life home' } });
  return <header id={params.RenderingIdentifier}><nav className="navbar navbar-default print-never" aria-label="Main navigation">
    <div className="container-fluid"><div className="navbar-header">
      <button className="navbar-toggle" type="button" aria-expanded={expanded} aria-controls={`${id}-navigation`} onClick={() => setExpanded(!expanded)}><span className="sr-only">Toggle navigation</span><span className="icon-bar" /><span className="icon-bar" /><span className="icon-bar" /></button>
      <Link className="navbar-brand" field={homeLink} aria-label="Allianz Life home">{data.logo?.jsonValue?.value?.src ? <Image field={data.logo.jsonValue} /> : 'Allianz'}</Link>
    </div><div className={`collapse navbar-collapse mast-head ${expanded ? 'in' : ''}`} id={`${id}-navigation`}>
      <div className="mast-title hidden-xs"><Text className="byline" field={data.heading?.jsonValue} /></div>
      <form role="search" className="form-inline navbar-form navbar-right search" onSubmit={(event) => {
        event.preventDefault();
        const searchPath = params.market === 'new-york' ? '/new-york/search' : '/search';
        const nextQuery = query.trim().slice(0, 50);
        router.push(nextQuery ? `${searchPath}?q=${encodeURIComponent(nextQuery)}` : searchPath);
        setQuery('');
        setExpanded(false);
      }}>
        <div className="input-group" id={`${id}-header-search`}><label htmlFor={`${id}-search`} className="sr-only">Search this website</label>
          <input id={`${id}-search`} name="q" type="search" className="form-control input-sm" placeholder="e.g. Annuities" maxLength={50} value={query} onChange={(event) => setQuery(event.target.value.slice(0, 50))} />
          <span className="input-group-btn"><button className="btn btn-default input-sm" type="submit" aria-label="Search"><svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m15 15 6 6" stroke="currentColor" strokeWidth="2" /></svg></button></span>
        </div>
      </form>
      <div className="nav-utility"><ul className="nav navbar-nav navbar-right">{(data.utilityNav?.targetItems ?? []).map((item) => <li key={item.id}><Link field={safeLink(item.link?.jsonValue)}><Text field={item.title?.jsonValue} /></Link></li>)}</ul></div>
      {!!data.primaryNav?.targetItems?.length && <nav className="nav-main" aria-label="Primary navigation"><ul className="nav navbar-nav">{data.primaryNav.targetItems.map((item) => <li key={item.id}><Link field={safeLink(item.link?.jsonValue)}><Text field={item.title?.jsonValue} /></Link></li>)}</ul></nav>}
    </div></div>
  </nav></header>;
};
