'use client';

import { useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLinkRenderProps } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { isCurrentParticipantLink, participantCurrentPath, type AllianzParticipantNavigationProps } from './allianz-participant-navigation.props';
import './AllianzParticipantNavigation.css';

/** Authored participant links, independent of automatic section/newsroom discovery. */
export const Default = ({ fields, params = {} }: AllianzParticipantNavigationProps) => {
  const { page } = useSitecore();
  const isEditing = page.mode?.isEditing ?? false;
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const listId = useId();
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzParticipantNavigation" />;
  const currentPath = participantCurrentPath(pathname, page.siteName, page.locale);
  return <nav id={params.RenderingIdentifier} aria-label="Participant navigation"
    className={`m-navigation-secondary allianz-participant-navigation${open ? ' m-navigation-secondary-open' : ''}`}>
    <button type="button" className="nav-sec-list-title" aria-expanded={open} aria-controls={listId}
      onClick={() => setOpen((current) => !current)}>
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={data.heading?.jsonValue} />}
      <i className="c-icon c-icon--chevron-down" aria-hidden="true" />
    </button>
    <ul id={listId} className="nav-sec-list">{(data.primaryNav?.targetItems ?? []).map((item) => {
      const current = isCurrentParticipantLink(item.link?.jsonValue, page.layout.sitecore.route?.itemId, currentPath);
      return <li key={item.id}>{shouldRenderLinkField(item.link?.jsonValue, isEditing) && <Link editable={isEditing} {...safeLinkRenderProps(item.link?.jsonValue)} field={allianzLinkField(item.link?.jsonValue, isEditing)}
        className={current ? '-is-active' : ''} aria-current={current ? 'page' : undefined}
        onClick={() => setOpen(false)}
        aria-label={item.title?.jsonValue?.value}>
        {shouldRenderTextField(item.title?.jsonValue, isEditing) ? <Text editable={isEditing} field={item.title?.jsonValue} /> : <></>}
      </Link>}</li>;
    })}</ul>
  </nav>;
};
