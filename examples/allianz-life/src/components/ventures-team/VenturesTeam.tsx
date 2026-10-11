'use client';

import { Image, Link, RichText, Text, useComponentProps, useSitecore, type LinkField } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { safeLinkRenderProps } from 'lib/allianz-fields';
import type { AutomaticVenturesTeam, VenturesTeamPerson } from 'lib/ventures-team-data';
import type { VenturesTeamProps } from './ventures-team.props';
import './VenturesTeam.css';

/** Fields belong to the selected biography pages and are read-only in this listing. */
function Profile({ person, index }: { person: VenturesTeamPerson; index: number }) {
  const name = person.name?.jsonValue;
  const role = person.role?.jsonValue;
  const portrait = person.portrait?.jsonValue;
  const summary = person.summary?.jsonValue;
  const focus = person.focus?.jsonValue;
  const bioLabel = person.bioLinkText?.jsonValue;
  const socialField = person.socialLink?.jsonValue;
  const hasPortrait = shouldRenderImageField(portrait, false);
  const hasBioLink = shouldRenderTextField(bioLabel, false);
  const hasSocialLink = shouldRenderLinkField(socialField, false) && Boolean(socialField?.value?.text);
  const socialProps = safeLinkRenderProps(socialField);
  const normalizedSocialField = socialProps.field as LinkField | undefined;
  const socialUnavailable = normalizedSocialField?.value?.href === '#service-unavailable';

  return <div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12">
    <article data-biography-page={person.pageId} className={`ventures-team__profile ${hasPortrait
      ? `m-axlTile match-height tile--6633 -is--split${index % 2 === 0 ? ' -is--flipped' : ''}`
      : 'm-axlIntroductionBlock -is--stacked -no--image'} t-bg-transparent`}>
      <div className="tileContent u-text-left">
        <div className="tileSubGrid__content">
          <header>
            <div className="tileHeading">{shouldRenderTextField(name, false) && <Text tag="h3" field={name} editable={false} />}</div>
            <div className="tileSubHeading">{shouldRenderTextField(role, false) && (person.roleFormat === 'rich-text'
              ? <RichText tag="div" className="h4 ventures-team__shared-role" role="heading" aria-level={4} field={role} editable={false} />
              : <Text tag="h4" field={role} editable={false} />)}</div>
          </header>
          {(shouldRenderTextField(summary, false) || shouldRenderTextField(focus, false)) && <div className="tileBody">
            {shouldRenderTextField(summary, false) && <RichText className="ventures-team__summary" field={summary} editable={false} />}
            {shouldRenderTextField(focus, false) && <RichText className="ventures-team__focus" field={focus} editable={false} />}
          </div>}
          {(hasBioLink || hasSocialLink) && <footer>
            {hasBioLink && <div className="tileLink"><a className="a-link" href={person.href} aria-label={bioLabel?.value}>
              <span className="a-link__text"><Text field={bioLabel} editable={false} /></span>
            </a></div>}
            {hasSocialLink && <div className="tileLink">{socialUnavailable
              ? <button type="button" className="a-link ventures-team__unavailable-link" disabled aria-disabled="true"
                title="This service is unavailable" aria-label={socialField?.value?.text}>
                <span className="a-link__text">{socialField?.value?.text}</span>
              </button>
              : <Link {...socialProps} editable={false} className="a-link" aria-label={socialField?.value?.text}>
                <span className="a-link__text">{socialField?.value?.text}</span>
              </Link>}</div>}
          </footer>}
        </div>
      </div>
      {hasPortrait && <div className="tileImage"><picture className="c-image c-teaser__image">
        <Image field={portrait} editable={false} alt={portrait?.value?.alt ?? ''}
          sizes="(min-width: 704px) 33vw, 100vw" className="c-image__img c-teaser__image-img" />
      </picture></div>}
    </article>
  </div></div>;
}

export const Default = ({ fields, rendering, params }: VenturesTeamProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const automatic = useComponentProps<{ automaticVenturesTeam?: AutomaticVenturesTeam }>(rendering?.uid ?? '')?.automaticVenturesTeam;
  if (!fields?.data?.datasource) return <NoDataFallback componentName="Ventures Team" />;
  return <section id={params?.RenderingIdentifier} className="component ventures-team l-container--full-width t-bg-transparent axlTileCollection">
    <div className="l-grid l-grid--max-width">
      {automatic?.complete
        ? automatic.items.map((person, index) => <Profile key={person.pageId} person={person} index={index} />)
        : <p role="status">The Ventures team is temporarily unavailable.</p>}
      {editing && <p role="status">Names and portraits come from the selected biography pages. Edit those pages and their Ventures team listing fields to update this listing.</p>}
    </div>
  </section>;
};
