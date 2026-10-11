'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { allianzCardFields } from 'lib/allianz-card-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { editorialHeadingTag, safeEditorialRichText } from 'lib/allianz-editorial';
import { safeLinkRenderProps, type ContentEntry } from 'lib/allianz-fields';
import type { AllianzCardGridProps } from 'components/allianz-card-grid/allianz-card-grid.props';

function IncomeCardContent({ card, isEditing, headingLevel, button = false }: {
  card: ContentEntry;
  isEditing: boolean;
  headingLevel: 'h2' | 'h3';
  button?: boolean;
}) {
  const link = allianzLinkField(card.link?.jsonValue, isEditing);
  const linkProps = isEditing ? { field: link } : safeLinkRenderProps(link);
  const ariaLabel = link.value?.ariaLabel || link.value?.['aria-label'];
  const hasButton = button && shouldRenderLinkField(card.link?.jsonValue, isEditing);
  const body = shouldRenderTextField(card.body?.jsonValue, isEditing)
    && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} />;
  return <>
    <header>
      <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={editorialHeadingTag(card.headingLevel?.jsonValue?.value || headingLevel)} field={card.heading?.jsonValue} />}</div>
      {shouldRenderTextField(card.subheading?.jsonValue, isEditing)
        ? <RichText editable={isEditing} field={safeEditorialRichText(card.subheading?.jsonValue, isEditing)} className="tileSubHeading" />
        : <div className="tileSubHeading" />}
    </header>
    {button ? (body || hasButton) && <div className="tileBody u-font-size-md">
      {body}
      {hasButton && <div className="tileLink"><Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-axlButton m-axlButton--primary" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{link.value?.text}</Link></div>}
    </div> : shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="tileBody u-font-size-md" />}
  </>;
}

/** One source collection owns a stacked introduction and three alternating
 * photo splits. Native children remain ordered and appear exactly once. */
export function SourceIncomeBenefits({ fields, params }: AllianzCardGridProps) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-blue-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-padding-bottom-xl"><div className="l-grid__column-medium-12">
      {cards.map((card, index) => {
        const stacked = index === 0;
        const flipped = index === 1 || index === 3;
        const margin = index === 1 || index === 2;
        return <article key={card.id} className={`allianz-editorial-cards m-axlTile match-height ${stacked ? '-is--stacked' : `tile--6633${flipped ? ' -is--flipped' : ''} -is--split`} t-bg-transparent${margin ? ' u-margin-bottom-xl' : ''}`}>
          <div className={`tileContent u-text-${stacked ? 'center' : 'left'}`}>
            {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Image editable={isEditing} field={card.icon?.jsonValue} alt={card.icon?.jsonValue?.value?.alt ?? ''} /></div></div>}
            <div className="tileSubGrid__content"><IncomeCardContent card={card} isEditing={isEditing} headingLevel={stacked ? 'h2' : 'h3'} /></div>
          </div>
          {!stacked && shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
        </article>;
      })}
    </div></div></div>
  </div>;
}

/** The source CTA owns a scalar General Link, independently of its cleared
 * Multilist. Mount both rich text and link SDK controls inside the body block. */
export function SourceIncomeCallout({ fields, params }: AllianzCardGridProps) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {cards.map((card) => <article key={card.id} className="allianz-editorial-cards m-axlTile match-height -is--stacked t-bg-transparent">
        <div className="tileContent u-text-center">
          {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className="tileIcon t-bg-primary-brand t-icon-primary-white"><Image editable={isEditing} field={card.icon?.jsonValue} alt={card.icon?.jsonValue?.value?.alt ?? ''} /></div></div>}
          <div className="tileSubGrid__content"><IncomeCardContent card={card} isEditing={isEditing} headingLevel="h2" button /></div>
        </div>
      </article>)}
    </div></div></div>
  </div>;
}
