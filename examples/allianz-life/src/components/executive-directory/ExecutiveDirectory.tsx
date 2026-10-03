'use client';

import { useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AutomaticPeople } from 'lib/people-automatic-data';
import type { ExecutiveDirectoryProps } from './executive-directory.props';
import { PeopleCards } from './people-cards.props';
import './PeopleDirectory.css';

export const Default = ({ fields, rendering, params }: ExecutiveDirectoryProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const automatic = useComponentProps<{ automaticPeople?: AutomaticPeople }>(rendering?.uid ?? '')?.automaticPeople;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Executive Directory" />;
  return <section id={params?.RenderingIdentifier} className="people-directory executive-directory l-container--full-width t-bg-transparent axlTileCollection">
    <div className="l-grid l-grid--max-width">
      <div className="u-margin-bottom-xl"><PeopleCards items={automatic?.complete ? automatic.items : []} editing={editing} /></div>
      {!automatic?.complete && <p role="status">The executive directory is temporarily unavailable.</p>}
      {editing && automatic?.complete && <p role="status">Names, roles, portraits and links come from the executive biography pages. Edit those pages to update this directory.</p>}
      {editing && Boolean(automatic?.missingOrder) && <p role="status">Some biographies have no directory order and appear after ordered entries.</p>}
    </div>
  </section>;
};
