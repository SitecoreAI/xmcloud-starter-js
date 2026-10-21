'use client';

import { useId, useState } from 'react';
import { Link, Text, useComponentProps } from '@sitecore-content-sdk/nextjs';
import {
  newsroomYearLink, newsroomYearNavigationData, type NewsroomYearNavigationProps,
  type NewsroomYearNavigationComponentData,
} from './newsroom-year-navigation.props';
import './NewsroomYearNavigation.css';

/** Fixed source navigation; native archive years are discovered by the server hook. */
export const Default = ({ rendering, params }: NewsroomYearNavigationProps) => {
  const componentData = useComponentProps<NewsroomYearNavigationComponentData>(rendering?.uid);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const data = newsroomYearNavigationData(componentData?.automaticYears);
  if (data.issue) return <nav className="m-navigation-secondary allianz-newsroom-year-navigation"
    id={params?.RenderingIdentifier} aria-label="Press archive navigation">
    <p role="status">Press archive navigation is temporarily unavailable.</p>
  </nav>;
  if (!data.active) return null;
  return <nav className={`m-navigation-secondary allianz-newsroom-year-navigation${open ? ' m-navigation-secondary-open' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Press archive navigation">
    <button type="button" className="nav-sec-list-title" aria-expanded={open} aria-controls={listId}
      onClick={() => setOpen((current) => !current)}>
      <Text field={data.active.navigationTitle?.jsonValue} editable={false} />
      <i className="c-icon c-icon--chevron-down" aria-hidden="true" />
    </button>
    <ul className="nav-sec-list" id={listId}>{data.items.map((item) => {
      const current = item === data.active;
      return <li key={item.id}><Link field={newsroomYearLink(item)!} editable={false}
        className={current ? '-is-active' : ''} aria-current={current ? 'page' : undefined}
        aria-label={item.navigationTitle?.jsonValue?.value}>
        <Text field={item.navigationTitle?.jsonValue} editable={false} />
      </Link></li>;
    })}</ul>
  </nav>;
};
