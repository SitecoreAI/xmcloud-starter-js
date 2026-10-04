'use client';

import NextLink from 'next/link';
import { Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { contextBreadcrumbLabel, contextBreadcrumbTrail, type AllianzContextBreadcrumbsProps } from './allianz-context-breadcrumbs.props';

/** Native page ancestry; this component deliberately has no datasource. */
export const Default = ({ fields, params }: AllianzContextBreadcrumbsProps) => {
  const { page } = useSitecore();
  const editable = page?.mode?.isEditing ?? false;
  const trail = contextBreadcrumbTrail(fields?.data?.contextItem);
  if (trail.issue) return <nav className="azl-breadcrumb l-container" aria-label="Breadcrumbs" id={params?.RenderingIdentifier}>
    <p role="status">{editable
      ? 'Breadcrumb trail needs complete native page titles, ancestors, and links.'
      : 'Breadcrumb navigation is temporarily unavailable.'}</p>
  </nav>;
  return <nav className="azl-breadcrumb l-container" aria-label="Breadcrumbs" id={params?.RenderingIdentifier}>
    <span className="u-aria-only">You are here:</span>
    <ol className="c-breadcrumb__list">{trail.items.map((item, index) => {
      const current = index === trail.items.length - 1;
      // Derived captions stay read-only; owning NavigationTitle/Title fields keep their metadata.
      const label = <Text field={contextBreadcrumbLabel(item)} editable={false} />;
      return <li key={item.id} className="c-breadcrumb__item">
        {index > 0 && <i className="c-icon" aria-hidden="true">/</i>}
        {current
          ? <span className="c-breadcrumb__link is-active" aria-current="page">{label}</span>
          : <NextLink className="c-breadcrumb__link" href={item.url?.path ?? ''}>{label}</NextLink>}
      </li>;
    })}</ol>
  </nav>;
};
