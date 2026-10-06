'use client';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { safeLink, type AllianzProps, type NavigationItem } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const pathname = usePathname();
  const { page } = useSitecore();
  // Page context has the public route during server rewrites and native editing.
  const currentPath = (page?.layout?.sitecore?.context?.itemPath || pathname).toLowerCase();
  const [expanded, setExpanded] = useState<string[]>([]);
  const data = fields?.data?.datasource;
  const renderLinks = (items: NavigationItem[], depth: number) => <ul className={depth ? undefined : 'dropdown-menu'}>
    {items.map((item) => {
      const link = safeLink(item.link?.jsonValue);
      const href = (link.value.href ?? '').toLowerCase();
      const current = !!href && href === currentPath;
      // Source emphasizes a leaf ancestor only when its deeper pages are not listed.
      const ancestor = href.startsWith('/') && !item.children?.results?.length && currentPath.startsWith(`${href}/`);
      return <li className={current || ancestor ? 'active' : undefined} key={item.id}>
        <Link field={link} className={current ? [link.value.class, 'current'].filter(Boolean).join(' ') : link.value.class} aria-current={current ? 'page' : undefined}><Text field={item.title?.jsonValue} /></Link>
        {!!item.children?.results?.length && renderLinks(item.children.results, depth + 1)}
      </li>;
    })}
  </ul>;
  return <nav aria-label={data?.heading?.jsonValue?.value || 'Section navigation'} id={params.RenderingIdentifier}>
    <ul className="nav navbar-nav left-nav">
      {(data?.primaryNav?.targetItems ?? []).map((group) => <li key={group.id} className={`dropdown ${expanded.includes(group.id) ? 'open' : ''}`}>
        <Link className="link-dropdown" field={safeLink(group.link?.jsonValue)}><Text field={group.title?.jsonValue} /></Link>
        <button className="dropdown-toggle visible-xs allianz-legacy-section-toggle" type="button" aria-label={`Expand ${group.title?.jsonValue?.value || 'section'}`} aria-expanded={expanded.includes(group.id)} onClick={() => setExpanded((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}><span aria-hidden="true">{expanded.includes(group.id) ? '−' : '+'}</span></button>
        {renderLinks(group.children?.results ?? [], 0)}
      </li>)}
    </ul>
  </nav>;
};
