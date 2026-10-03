'use client';

import { useId, useState } from 'react';
import { Link, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import { normalizeSectionNavigationId } from 'lib/section-navigation-data';
import {
  SECTION_NAVIGATION_OVERVIEW, sectionNavigationData, sectionNavigationLink,
  type SectionNavigationComponentData, type SectionNavigationProps,
} from './section-navigation.props';
import './SectionNavigation.css';

/** Source secondary navigation, supplied only by the bound server-only native discovery hook. */
export const Default = ({ rendering, params }: SectionNavigationProps) => {
  const { page } = useSitecore();
  const componentData = useComponentProps<SectionNavigationComponentData>(rendering?.uid);
  const editing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const data = sectionNavigationData(componentData?.automaticSectionNavigation, editing);
  if (data.issue || !data.root) return <nav className="m-navigation-secondary allianz-section-navigation"
    id={params?.RenderingIdentifier} aria-label="Section navigation">
    <p role="status">{editing
      ? 'Section navigation needs verified native bindings, complete section pages, navigation titles, and links.'
      : 'Section navigation is temporarily unavailable.'}</p>
  </nav>;
  return <nav className={`m-navigation-secondary allianz-section-navigation${open ? ' m-navigation-secondary-open' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Section navigation">
    <button type="button" className="nav-sec-list-title" aria-expanded={open} aria-controls={listId}
      onClick={() => setOpen((current) => !current)}>
      <Text field={data.root.navigationTitle?.jsonValue} editable={false} />
      <i className="c-icon c-icon--chevron-down" aria-hidden="true" />
    </button>
    <ul className="nav-sec-list" id={listId}>{[data.root, ...data.items].map((item, index) => {
      const current = normalizeSectionNavigationId(item.id) === normalizeSectionNavigationId(data.currentId);
      const caption = index === 0 ? SECTION_NAVIGATION_OVERVIEW : item.navigationTitle!.jsonValue!;
      return <li key={item.id}><Link field={sectionNavigationLink(item, caption.value)!} editable={false}
        className={current ? '-is-active' : ''} aria-current={current ? 'page' : undefined}
        aria-label={caption.value}>
        <Text field={caption} editable={false} />
      </Link></li>;
    })}</ul>
  </nav>;
};
