'use client';
import { Link, Text } from '@sitecore-content-sdk/nextjs';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { safeLink, type AllianzProps, type NavigationItem } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  const renderLinks = (items: NavigationItem[], depth: number) => <ul className={depth ? 'allianz-legacy-subnav' : 'dropdown-menu'}>
    {items.map((item) => {
      const href = safeLink(item.link?.jsonValue).value.href ?? '';
      return <li className={href.toLowerCase() === pathname.toLowerCase() ? 'active' : undefined} key={item.id}>
        <Link field={safeLink(item.link?.jsonValue)} aria-current={href.toLowerCase() === pathname.toLowerCase() ? 'page' : undefined}><Text field={item.title?.jsonValue} /></Link>
        {!!item.children?.results?.length && renderLinks(item.children.results, depth + 1)}
      </li>;
    })}
  </ul>;
  return <nav aria-label={data?.heading?.jsonValue?.value || 'Section navigation'} id={params.RenderingIdentifier}>
    <ul className="nav navbar-nav left-nav">
      {(data?.primaryNav?.targetItems ?? []).map((group) => <li key={group.id} className={`dropdown ${expanded.includes(group.id) ? 'open' : ''}`}>
        <Link className="link-dropdown" field={safeLink(group.link?.jsonValue)}><Text field={group.title?.jsonValue} /></Link>
        {!!group.children?.results?.length && <><button className="dropdown-toggle visible-xs allianz-legacy-section-toggle" type="button" aria-label={`Expand ${group.title?.jsonValue?.value || 'section'}`} aria-expanded={expanded.includes(group.id)} onClick={() => setExpanded((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}><span aria-hidden="true">{expanded.includes(group.id) ? '−' : '+'}</span></button>
          {renderLinks(group.children.results, 0)}</>}
      </li>)}
    </ul>
  </nav>;
};
