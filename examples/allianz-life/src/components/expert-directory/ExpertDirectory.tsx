'use client';

import { RichText, Text, useComponentProps, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import type { AutomaticPeople } from 'lib/people-automatic-data';
import { PeopleCards } from '../executive-directory/people-cards.props';
import type { ExpertDirectoryProps } from './expert-directory.props';
import '../executive-directory/PeopleDirectory.css';

export const Default = ({ fields, rendering, params }: ExpertDirectoryProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const automatic = useComponentProps<{ automaticPeople?: AutomaticPeople }>(rendering?.uid ?? '')?.automaticPeople;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="Expert Directory" />;
  const groups = automatic?.complete ? automatic.groups : [];
  return <div id={params?.RenderingIdentifier} className="people-directory expert-directory">
    {groups.filter((group) => editing || group.items.length).map((group, index) => <section key={group.id} className={`l-container--full-width axlTileCollection ${index % 2 === 0 ? 't-bg-grey-soft' : 't-bg-transparent'}`}>
      <div className="l-grid l-grid--max-width">
        <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
            {shouldRenderTextField(group.heading?.jsonValue, editing) && <div className="tileHeading"><Text tag="h2" field={group.heading?.jsonValue} editable={editing} /></div>}
            {shouldRenderTextField(group.introduction?.jsonValue, editing) && <RichText tag="div" className="tileBody" field={group.introduction?.jsonValue} editable={editing} />}
          </div></article>
        </div></div>
        <div className={index % 2 === 0 ? 'u-margin-bottom-lg' : 'u-margin-bottom-xl'}><PeopleCards items={group.items} editing={editing} /></div>
      </div>
    </section>)}
    {!automatic?.complete && <p role="status">The expert directory is temporarily unavailable.</p>}
    {editing && automatic?.complete && <p role="status">Edit each expert biography to update its profile, category, directory order and summary.</p>}
    {editing && Boolean(automatic?.unassigned.length) && <p role="status">Some expert biographies need a directory category before they can appear in the directory.</p>}
    {editing && Boolean(automatic?.missingOrder) && <p role="status">Some biographies have no directory order and appear after ordered entries.</p>}
  </div>;
};
