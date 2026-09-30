'use client';
import { Link, Text } from '@sitecore-content-sdk/nextjs';
import { useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLink, type AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const [expanded, setExpanded] = useState(false);
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyFooter" />;
  return <footer className="allianz-legacy-footer" id={params.RenderingIdentifier}>
    <nav className="footer-nav container-fluid azl-contents" aria-label="Footer navigation"><div className="row"><ul className="nav navbar-nav footer-nav"><li className={`dropdown ${expanded ? 'open' : ''}`}>
      <button className="dropdown-toggle visible-xs allianz-legacy-footer-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>More... <span className="caret" aria-hidden="true" /></button>
      <ul className="dropdown-menu">{(data.primaryNav?.targetItems ?? []).map((group) => <li className="col-sm-2" key={group.id}>
        <h3>{group.link?.jsonValue?.value?.href ? <Link field={safeLink(group.link.jsonValue)}><Text field={group.title?.jsonValue} /></Link> : <Text field={group.title?.jsonValue} />}</h3>
        <ul>{(group.children?.results ?? []).map((item) => <li key={item.id}><Link field={safeLink(item.link?.jsonValue)}><Text field={item.title?.jsonValue} /></Link></li>)}</ul>
      </li>)}</ul>
    </li></ul></div></nav>
    <div className="container-fluid azl-contents copyright"><div className="row"><Text tag="span" field={data.copyright?.jsonValue} /></div></div>
  </footer>;
};
