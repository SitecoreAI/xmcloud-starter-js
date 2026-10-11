'use client';

import { Fragment } from 'react';
import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, safeLinkRenderProps, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { allianzCardFields } from 'lib/allianz-card-fields';
import { editorialBodyClass, editorialColumnClass, editorialHeadingTag, safeEditorialRichText } from 'lib/allianz-editorial';
import './AllianzEditorialCards.css';
import { EditorialFrame } from 'lib/allianz-editorial-frame';
import type { AllianzCardGridProps } from './allianz-card-grid.props';
import './AllianzFaqCards.css';
import './AllianzFinancialRatings.css';
import { financialRatingsRichText } from 'lib/financial-ratings-rich-text';
import { safeNewsroomRichText as safeFaqRichText } from 'components/legal-disclosures/newsroom-grey.links.props';
import { strategyCardPresentation, type StrategyLayout } from 'lib/allianz-strategy-layout';
import './AllianzStrategyCards.css';
import { SourceIncomeBenefits, SourceIncomeCallout } from 'lib/allianz-income-cards';
import './AllianzLifeFaqCards.css';
import './AllianzLifeToolsCards.css';
import './AllianzLifeBenefitsGrid.css';

type AllianzCardGridPresentation = {
  isRilaPromotion?: boolean;
  faqAppearance?: 'help' | 'professional';
  sourceAnchor?: 'impact';
  sourceRelatedIntroduction?: boolean;
};

function AllianzCardGrid({ fields, params, isRilaPromotion = false, faqAppearance,
  sourceAnchor, sourceRelatedIntroduction = false,
}: AllianzCardGridProps & AllianzCardGridPresentation) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const nativeDataId = 'id' in data && typeof data.id === 'string' ? data.id.replace(/[{}-]/g, '').toLowerCase() : undefined;
  const isFinancialRatings = nativeDataId === '6a6d5c5594f94090a7f4dcec2ff47726';
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const column = ({ '1':12, '2':6, '3':4, '4':3 } as Record<string, number>)[params.columns] ?? 12;
  const isCards = params.layout === 'cards';
  const splitClass = params.splitRatio === '33:67' ? 'tile--3366' : params.splitRatio === '67:33' ? 'tile--6633' : 'tile--5050';
  if (params.layout === 'list') return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}><div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12"><div className="c-search-result-text-teaser">{cards.map((card) => <article className="c-search-result-text-teaser__item" key={card.id}><h5 className="c-search-result-text-teaser__headline"><Link editable={isEditing} field={allianzLinkField(card.link?.jsonValue, isEditing)} renderChildrenWhenEmpty={isEditing}><Text editable={isEditing} field={card.heading?.jsonValue} /></Link></h5><RichText editable={isEditing} field={card.body?.jsonValue} className="c-search-result-text-teaser__copytext" /></article>)}</div></div></div></div></section>;
  const sourceAnchorProps: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & { name?: 'impact' } = { name: sourceAnchor };
  return <div data-allianz-card-grid={isFinancialRatings ? nativeDataId : undefined} className={`l-container--full-width ${sectionTheme(params.theme)}${sourceRelatedIntroduction ? '' : ' axlTileCollection'}${faqAppearance ? ' allianz-faq-cards' : ''}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {sourceAnchor && <a {...sourceAnchorProps} />}
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        {sourceRelatedIntroduction ? <>
          <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><SustainabilityInformationIcon /></div>
          <header>
            <div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div>
            {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </> : <>
          <div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div><RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /><RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />{shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
        </>}
      </div></article></div></div>}
      <div className={`l-grid__row ${isCards ? '' : 'match-height-row'} ${rowSpacing(params)}`}>
        {isCards ? <div className="l-grid__column-medium-12"><div className={`o-cards o-cards__col${params.columns || '3'}`}>
          {cards.map((card) => {
            const field = allianzLinkField(card.link?.jsonValue, isEditing);
            const linkProps = sourceRelatedIntroduction && !isEditing ? safeLinkRenderProps(field) : { field };
            return <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card">
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} sizes={sourceRelatedIntroduction ? '100vw' : undefined} className="c-image__img c-teaser__image-img" /></picture></div>}
              <div className="m-card__header"><Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={sourceRelatedIntroduction ? safeEditorialRichText(card.body?.jsonValue, isEditing) : card.body?.jsonValue} className="m-card__body" />
            </Link>;
          })}
        </div></div> : cards.map((card) => {
          const links = card.links?.targetItems?.length ? card.links.targetItems : [{ id: `${card.id}-link`, link: card.link }];
          const hasLinks = Boolean(card.links?.targetItems?.some((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) || shouldRenderLinkField(card.link?.jsonValue, isEditing));
          return <div key={card.id} className={`l-grid__column-medium-${column}`}>
          <article data-allianz-card={isFinancialRatings ? card.id.replace(/[{}-]/g, '').toLowerCase() : undefined} className={`m-axlTile match-height ${sectionTheme(card.theme?.jsonValue?.value)} ${faqAppearance === 'help' ? '-is--flipped -is--stacked' : faqAppearance === 'professional' ? 'tile--stackedImage -is--stacked' : params.layout === 'image-left' || params.layout === 'image-right' ? `${splitClass} -is--split ${params.layout === 'image-right' ? '-is--flipped' : ''}` : shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'stacked' ? '-is--flipped tile--stackedImage -is--stacked' : '-is--stacked'} ${params.layout === 'bordered' ? 'allianz-bordered' : ''}`}>
            <div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
              {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className={`tileIcon ${card.iconTheme?.jsonValue?.value === 'primary-brand' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}><Image editable={isEditing} field={card.icon?.jsonValue} /></div></div>}
              {shouldRenderTextField(card.alphanumeral?.jsonValue, isEditing) && <div className="tileSubGrid__image"><Text editable={isEditing} tag={isFinancialRatings ? 'span' : undefined} field={card.alphanumeral?.jsonValue} className="tileAlphanumeral" /></div>}
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'bordered' && <div className="tileSubGrid__image"><div className="tileImage"><Image editable={isEditing} field={card.image?.jsonValue} /></div></div>}
              <div className="tileSubGrid__content"><header><div className="tileHeading"><Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /></header>
                <RichText editable={isEditing} field={faqAppearance ? safeFaqRichText(card.body?.jsonValue, isEditing) : isFinancialRatings ? financialRatingsRichText(card.body?.jsonValue, isEditing, card.id) : card.body?.jsonValue} className={`tileBody ${isRilaPromotion ? 'u-font-size-lg' : params.headingLevel === 'h2' ? 'u-font-size-xl' : 'u-font-size-md'}`} />
                {hasLinks && <footer><div className="tileLink">{links.filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)).map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
                  const linkKey = item.id ?? (field as typeof field & { metadata?: { itemId?: string } }).metadata?.itemId ?? linkIndex;
                  const linkProps = sourceAnchor && !isEditing ? safeLinkRenderProps(field) : { field };
                  return <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={sourceAnchor ? isEditing : undefined} key={linkKey} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}><><span className="a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg></span><span className="a-link__text">{item.link?.jsonValue?.value?.text}</span></></Link>;
                })}</div></footer>}
              </div>
            </div>
            {shouldRenderImageField(card.image?.jsonValue, isEditing) && ['stacked','image-left','image-right'].includes(params.layout) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} className="c-image__img c-teaser__image-img" /></picture></div>}
          </article>
        </div>;
        })}
      </div>
    </div>
  </div>;
}

export const Default = (props: AllianzCardGridProps) => <AllianzCardGrid {...props} />;

/** Preserve the source anchor before the first pillar introduction. */
export const SustainabilityPillars = (props: AllianzCardGridProps) => <AllianzCardGrid {...props}
  sourceAnchor="impact" params={{ ...props.params, theme: 'blue-soft',
    layout: 'stacked', columns: '3', alignment: 'left', headingLevel: 'h3', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' }} />;

/** Source related introduction owns its Information glyph, before the header. */
export const SustainabilityRelated = (props: AllianzCardGridProps) => <AllianzCardGrid {...props}
  sourceRelatedIntroduction params={{ ...props.params, theme: 'green-soft', layout: 'cards',
    columns: '3', alignment: 'center', headingLevel: 'h4', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' }} />;

const SustainabilityInformationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconInformation" aria-describedby="descIconInformation" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
  <title id="titleIconInformation">Information</title><desc id="descIconInformation">Information</desc>
  <path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" />
</svg>;

/** Source RILA promotion uses the native card fields and a fixed 67:33 split. */
export const RilaPromotion = (props: AllianzCardGridProps) => <AllianzCardGrid {...props}
  isRilaPromotion params={{ ...props.params, layout: 'image-right', splitRatio: '67:33',
    columns: '1', alignment: 'left', theme: 'transparent', spacing: 'none', headingLevel: 'h3',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'xl' }} />;

/** Ordered linked product images; introductions remain separate native renderings. */
export const ProductCards = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const spacing = rowSpacing({ marginBottom: params.marginBottom });

  return (
    <div className="l-container--full-width t-bg-blue-soft" id={params.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        <div className={`l-grid__row${spacing ? ` ${spacing}` : ''}`}>
          <div className="l-grid__column-medium-12">
            <div className="o-cards o-cards__col3">
              {cards.map((card) => {
                const field = allianzLinkField(card.link?.jsonValue, isEditing);
                const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                return (
                  <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card">
                    {shouldRenderImageField(card.image?.jsonValue, isEditing) && (
                      <div className="m-card__image">
                        <picture className="c-image">
                          <Image editable={isEditing} field={card.image?.jsonValue} className="c-image__img c-teaser__image-img" />
                        </picture>
                      </div>
                    )}
                    <div className="m-card__header">
                      {shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}
                    </div>
                    <div className="m-card__body" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


/** Source FAQ contract-help cards with external native icons sized like inline SVGs. */
export const FaqHelp = (props: AllianzCardGridProps) => <AllianzCardGrid {...props}
  faqAppearance="help" params={{ ...props.params, theme: 'transparent', layout: 'stacked',
    columns: '3', alignment: 'center', spacing: 'none', headingLevel: 'h3',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' }} />;

/** Source FAQ financial-professional prompt, with its one transparent stacked card. */
export const FaqProfessional = (props: AllianzCardGridProps) => <AllianzCardGrid {...props}
  faqAppearance="professional" params={{ ...props.params, theme: 'green-soft', layout: 'stacked',
    columns: '1', alignment: 'center', spacing: 'none', headingLevel: 'h3',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' }} />;

/** Existing AllianzCard children carry editorial content. New parameters select
 * only observed layout alternatives; no page-specific or arbitrary HTML classes. */
function EditorialCards({ fields, params, appearance, sourceArrows = false }: AllianzCardGridProps & { appearance: 'tiles' | 'intro' | 'callout'; sourceArrows?: boolean }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const intro = appearance === 'intro';
  const split = appearance === 'tiles';
  const wideStatistic = appearance === 'callout' && params.statisticStyle === 'wide';
  const imageSplit = split && ['image-left', 'image-right'].includes(params.layout);
  const ratio = params.splitRatio === '33:67' ? 'tile--3366' : params.splitRatio === '67:33' ? 'tile--6633' : imageSplit ? 'tile--5050' : '';
  const flipped = params.flipped === '1' || (imageSplit && params.layout === 'image-right');
  const bodySize = params.bodySize || (intro ? 'source-default' : 'medium');
  return <EditorialFrame params={params}>
      {cards.map((card) => {
        // Empty optional chrome belongs outside the split tile so it cannot
        // enlarge the text half and stretch the source cover image.
        const compactEditing = isEditing && imageSplit;
        const hasIcon = shouldRenderImageField(card.icon?.jsonValue, compactEditing ? false : isEditing);
        const hasNumber = shouldRenderTextField(card.alphanumeral?.jsonValue, compactEditing ? false : isEditing);
        const icon = (hasIcon || hasNumber) && <div className={`tileIcon${wideStatistic ? ' -is--wide' : ''} ${card.iconTheme?.jsonValue?.value === 'primary-brand' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}>
          {hasIcon && <Image editable={isEditing} field={card.icon?.jsonValue} />}
          {hasNumber && <Text editable={isEditing} field={card.alphanumeral?.jsonValue} tag={wideStatistic || (split && !imageSplit && shouldRenderTextField(card.alphanumeral?.jsonValue, false)) ? 'em' : 'span'} className="alphaType" />}
        </div>;
        // An explicitly cleared ordered collection stays cleared. The single-link
        // field is used only when that collection is absent from the query result.
        const links = (card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link, icon: undefined }])
          .filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing) ||
            (params.emptyLink === 'label' && !item.link?.jsonValue?.value?.href && Boolean(item.link?.jsonValue?.value?.text?.trim())));
        const renderedLinks = links.map((item) => {
          const field = allianzLinkField(item.link?.jsonValue, isEditing);
          const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
          const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
          const sourceDownload = intro && /\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '');
          const contents = <>
            {shouldRenderImageField(item.icon?.jsonValue, isEditing) && <span className="a-link__icon" aria-hidden={isEditing ? undefined : true}><Image editable={isEditing} field={item.icon?.jsonValue} /></span>}
            {sourceDownload && !item.icon?.jsonValue && <span className="a-link__icon" aria-hidden="true"><SustainabilityDownloadIcon /></span>}
            {sourceArrows && !shouldRenderImageField(item.icon?.jsonValue, false) && <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span>}
            <span className="a-link__text">{field.value?.text}</span>
          </>;
          // Preserve a source label with no destination as inert visitor text.
          // Editing still mounts the original General Link field and its chrome.
          const link = !isEditing && params.emptyLink === 'label' && !field.value?.href
            ? <span className="a-link">{contents}</span>
            : <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{contents}</Link>;
          return params.linkLayout === 'rows'
            ? <div key={item.id} className="tileLink">{link}</div>
            : <Fragment key={item.id}>{link}</Fragment>;
        });
        const hasLinkContent = links.map((item) => shouldRenderLinkField(item.link?.jsonValue, false) ||
          (params.emptyLink === 'label' && !item.link?.jsonValue?.value?.href && Boolean(item.link?.jsonValue?.value?.text?.trim())));
        const visibleLinks = renderedLinks.filter((_, index) => !compactEditing || hasLinkContent[index]);
        const additionalFields = [
          compactEditing && shouldRenderImageField(card.icon?.jsonValue, true) && !hasIcon
            ? <div key="icon" className="allianz-editorial-card-field" role="group" aria-label="Icon"><span>Icon</span><Image editable field={card.icon?.jsonValue} /></div> : null,
          compactEditing && shouldRenderTextField(card.alphanumeral?.jsonValue, true) && !hasNumber
            ? <div key="number" className="allianz-editorial-card-field" role="group" aria-label="Number"><span>Number</span><Text editable field={card.alphanumeral?.jsonValue} tag="span" className="alphaType" /></div> : null,
          compactEditing && shouldRenderTextField(card.subheading?.jsonValue, true) && !shouldRenderTextField(card.subheading?.jsonValue, false)
            ? <div key="subheading" className="allianz-editorial-card-field" role="group" aria-label="Subheading"><span>Subheading</span><RichText editable field={card.subheading?.jsonValue} /></div> : null,
          ...renderedLinks.map((link, index) => compactEditing && !hasLinkContent[index]
            ? <div key={`link-${links[index].id}`} className="allianz-editorial-card-field" role="group" aria-label="Link"><span>Link</span>{link}</div> : null),
        ];
        const content = <>
          <header>
            <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={editorialHeadingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} />}</div>
            {shouldRenderTextField(card.subheading?.jsonValue, compactEditing ? false : isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(card.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className={editorialBodyClass(bodySize)} />}
          {visibleLinks.length > 0 && <footer>{params.linkLayout === 'rows'
            ? visibleLinks : <div className="tileLink">{visibleLinks}</div>}</footer>}
        </>;
        const article = <article className={intro ? 'm-axlIntroductionBlock -is--stacked -no--image allianz-editorial-cards' : `allianz-editorial-cards m-axlTile match-height ${ratio}${flipped ? ' -is--flipped' : ''}${params.framed === '1' ? ' -is--framed' : ''}${(split && !imageSplit) || wideStatistic ? ' tile--alphaNumeric' : ''} ${split ? '-is--split' : '-is--stacked'} ${sectionTheme(card.theme?.jsonValue?.value)}${params.tileMarginBottom === 'xl' ? ' u-margin-bottom-xl' : ''}`}>
            <div className={`tileContent ${params.alignment === 'left' || (split && params.alignment !== 'center') ? 'u-text-left' : 'u-text-center'}`}>
              {intro ? <>{icon}{content}</> : <>{icon && <div className="tileSubGrid__image">{icon}</div>}<div className="tileSubGrid__content">{content}</div></>}
            </div>
            {imageSplit && shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} className="c-image__img c-teaser__image-img" /></picture></div>}
          </article>;
        const editableCard = additionalFields.some(Boolean) ? <div className="allianz-editorial-card-editor">
          {article}
          <details className="allianz-editorial-card-fields">
            <summary>Additional content fields</summary>
            <div className="allianz-editorial-card-fields__items">{additionalFields}</div>
          </details>
        </div> : article;
        return params.container === 'content' ? <Fragment key={card.id}>{editableCard}</Fragment> : <div key={card.id} className={editorialColumnClass(params)}>{editableCard}</div>;
      })}
  </EditorialFrame>;
}

export const EditorialTiles = (props: AllianzCardGridProps) => <EditorialCards {...props} appearance="tiles" />;
export const EditorialIntro = (props: AllianzCardGridProps) => <EditorialCards {...props} appearance="intro" />;
export const EditorialCallout = (props: AllianzCardGridProps) => <EditorialCards {...props} appearance="callout" />;

/** Early retirement keeps the root introduction before its first numbered tile. */
export const RetirementRiskSteps = ({ fields, params, ...props }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const stepParams: AllianzCardGridProps['params'] = { ...params, container: 'row',
    theme: 'transparent', layout: 'stacked', columns: '1', sourceWidth: 'centered-eight',
    alignment: 'left', headingLevel: 'h4', bodySize: 'medium', matchHeightRow: '0',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none', spacing: 'none' };
  delete stepParams.RenderingIdentifier;
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-left">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </div></article>
      </div></div>
      <EditorialCards {...props} fields={fields} params={stepParams} appearance="tiles" />
    </div>
  </div>;
};

/** Source split tile has a fixed frame, medium body and inline arrow. */
export const SustainabilityGlobal = (props: AllianzCardGridProps) => {
  const fixedParams: AllianzCardGridProps['params'] = { ...props.params, sectionSpacing: '0', introSpacer: '0',
    theme: 'transparent', layout: 'image-left', splitRatio: '67:33', columns: '1',
    alignment: 'left', headingLevel: 'h2', bodySize: 'medium', framed: '1',
    tileMarginBottom: 'xl', matchHeightRow: '1', flipped: '0', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' };
  for (const key of ['container', 'sectionWidth', 'sourceWidth', 'linkLayout', 'emptyLink']) delete fixedParams[key];
  return <EditorialCards {...props} appearance="tiles" sourceArrows params={fixedParams} />;
};

/** Native root introduction, ordered wide numerals, then the original PDF CTA. */
export const SustainabilityResults = ({ fields, params, ...props }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const footerField = allianzLinkField(data.primaryLink?.jsonValue, isEditing);
  const footerProps = isEditing ? { field: footerField } : safeLinkRenderProps(footerField);
  const footerLabel = footerField.value?.ariaLabel || footerField.value?.['aria-label'];
  const statisticParams: AllianzCardGridProps['params'] = { ...params, container: 'row', statisticStyle: 'wide',
    columns: '3', alignment: 'center', bodySize: 'medium', layout: 'stacked',
    theme: 'transparent', framed: '0', flipped: '0', matchHeightRow: '0',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'xl', spacing: 'none' };
  for (const key of ['RenderingIdentifier', 'sourceWidth', 'tileMarginBottom', 'linkLayout', 'emptyLink']) delete statisticParams[key];
  return <div className="l-container u-row-spacing t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width l-grid--no-gutters-outer">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </div></article>
      </div></div>
      <EditorialCards {...props} fields={fields} appearance="callout" params={statisticParams} />
      {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12 u-text-center">
        <footer><div className="tileLink u-margin-top-md u-margin-bottom-md">
          <Link {...footerProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof footerLabel === 'string' && footerLabel ? footerLabel : undefined}>
            <span className="a-link__icon" aria-hidden="true"><SustainabilityDownloadIcon /></span><span className="a-link__text">{footerField.value?.text}</span>
          </Link>
        </div></footer>
      </div></div>}
    </div>
  </div>;
};

const SustainabilityDownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconDownload" aria-describedby="descIconDownload" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
  <title id="titleIconDownload">Download</title><desc id="descIconDownload">Download</desc>
  <path fillRule="evenodd" d="M11.0088496,18.601 L5.41052947,13.1737857 C4.86315684,12.6431429 4.86315684,11.7854286 5.41052947,11.2547857 C5.9579021,10.7241429 6.84265787,10.7241429 7.3900305,11.2547857 L10.60007,14.3667143 L10.60007,1.35714286 C10.60007,0.606642857 11.2258387,0 12,0 C12.7741613,0 13.39993,0.606642857 13.39993,1.35714286 L13.39993,14.3667143 L16.6099695,11.2547857 C17.1573421,10.7241429 18.0420979,10.7241429 18.5894705,11.2547857 C19.1368432,11.7854286 19.1368432,12.6431429 18.5894705,13.1737857 L12.9911504,18.601 C12.8623569,18.7272143 12.7069647,18.8262857 12.5347733,18.8955 C12.3639818,18.9647143 12.1819909,19 12,19 C11.8180091,19 11.6360182,18.9647143 11.4652267,18.8955 C11.2930353,18.8262857 11.1376431,18.7272143 11.0088496,18.601 Z M22.9090909,18 C23.5104545,18 24,18.4669565 24,19.0434783 L24,22.9565217 C24,23.5317391 23.5104545,24 22.9090909,24 L1.09090909,24 C0.489545455,24 0,23.5317391 0,22.9565217 L0,19.0434783 C0,18.4669565 0.489545455,18 1.09090909,18 C1.69227273,18 2.18181818,18.4669565 2.18181818,19.0434783 L2.18181818,21.9130435 L21.8181818,21.9130435 L21.8181818,19.0434783 C21.8181818,18.4669565 22.3077273,18 22.9090909,18 Z" />
</svg>;

/** Source next-step presentation is intrinsic to this native variant, including
 * separate link rows; no additional CMS rendering parameter is required. */
export const ResourceNextSteps = (props: AllianzCardGridProps) => <EditorialCards {...props} appearance="callout" sourceArrows
  params={{ ...props.params, theme: 'green-soft', columns: '1', alignment: 'center',
    headingLevel: 'h2', bodySize: 'extra-large', linkLayout: 'rows' }} />;

export const IncomeBenefits = (props: AllianzCardGridProps) => <SourceIncomeBenefits {...props} />;
export const IncomeCallout = (props: AllianzCardGridProps) => <SourceIncomeCallout {...props} />;

/** Native no-media introduction rows with authored heading semantics. Each
 * placement owns its datasource; use container=row inside EditorialSection. */
export const EditorialLegal = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  // Only row spacing and the native identifier are configurable. The source
  // introduction uses a contained, transparent, full-column no-media layout.
  const frameParams = {
    container: params.container === 'row' ? 'row' : undefined,
    sectionWidth: 'contained', theme: 'transparent', spacing: 'none',
    paddingTop: params.paddingTop, paddingBottom: params.paddingBottom,
    marginBottom: params.marginBottom, RenderingIdentifier: params.RenderingIdentifier,
  };
  return <EditorialFrame params={frameParams}>
    {cards.map((card) => <div key={card.id} className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image">
        <div className="tileContent u-text-left">
          <header>
            <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} />}</div>
            {shouldRenderTextField(card.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(card.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="tileBody" />}
        </div>
      </article>
    </div>)}
  </EditorialFrame>;
};

/** Stacked source images and one native link/icon pair per footer row. */
export const EditorialStacked = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const column = params.columns === '2' ? 'l-grid__column-medium-6' : editorialColumnClass(params);
  return <EditorialFrame params={{ ...params, matchHeightRow: '1' }}>
    {cards.map((card) => {
      const links = (card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link, icon: undefined }])
        .filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
      const article = <article className={`allianz-editorial-cards m-axlTile match-height -is--flipped tile--stackedImage -is--stacked ${sectionTheme(card.theme?.jsonValue?.value)}${params.tileMarginBottom === 'xl' ? ' u-margin-bottom-xl' : ''}`}>
        <div className={`tileContent ${params.alignment === 'center' ? 'u-text-center' : 'u-text-left'}`}>
          <div className="tileSubGrid__content">
            <header>
              <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={editorialHeadingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} />}</div>
              {shouldRenderTextField(card.subheading?.jsonValue, isEditing)
                ? <RichText editable={isEditing} field={safeEditorialRichText(card.subheading?.jsonValue, isEditing)} className="tileSubHeading" />
                : <div className="tileSubHeading" />}
            </header>
            {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className={editorialBodyClass(params.bodySize || 'medium')} />}
            {links.length > 0 && <footer>{links.map((item) => {
              const field = allianzLinkField(item.link?.jsonValue, isEditing);
              const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
              const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
              return <div className="tileLink" key={item.id}>
                <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                  {shouldRenderImageField(item.icon?.jsonValue, isEditing) && <span className="a-link__icon" aria-hidden={isEditing ? undefined : true}><Image editable={isEditing} field={item.icon?.jsonValue} alt={item.icon?.jsonValue?.value?.alt ?? ''} /></span>}
                  {!item.icon?.jsonValue && <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span>}
                  <span className="a-link__text">{field.value?.text}</span>
                </Link>
              </div>;
            })}</footer>}
          </div>
        </div>
        {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
      </article>;
      return params.container === 'content' ? <Fragment key={card.id}>{article}</Fragment> : <div key={card.id} className={column}>{article}</div>;
    })}
  </EditorialFrame>;
};

/** Exact existing source arrow for a collection-level native General Link. */
const EditorialResourceArrow = () => <svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536" /></svg>;

/** Generic resource cards with optional native category fields and collection CTA. */
export const EditorialResourceCards = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const columns = params.columns === '4' ? '4' : '3';
  const centered = params.alignment === 'center';
  const footerField = allianzLinkField(data.primaryLink?.jsonValue, isEditing);
  const footerProps = isEditing ? { field: footerField } : safeLinkRenderProps(footerField);
  const footerLabel = footerField.value?.ariaLabel || footerField.value?.['aria-label'];
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} allianz-editorial-resource-cards`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
        <div className={`o-cards o-cards__col${columns}`}>
          {cards.map((card) => {
            const field = allianzLinkField(card.link?.jsonValue, isEditing);
            const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
            const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
            const hasCategory = shouldRenderTextField(card.subheading?.jsonValue, isEditing);
            const hasIcon = shouldRenderImageField(card.icon?.jsonValue, isEditing);
            const content = <>
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
              <div className={`m-card__header${centered ? ' u-text-center' : ''}`}>
                {shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}
              </div>
              {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="m-card__body" /> : <div className="m-card__body" />}
              {(hasCategory || hasIcon) && <div className="m-card__footer">
                {hasIcon && <Image editable={isEditing} field={card.icon?.jsonValue} alt={card.icon?.jsonValue?.value?.alt ?? ''} />}
                {hasCategory && <Text editable={isEditing} field={card.subheading?.jsonValue} tag="span" className="cardCategory" />}
              </div>}
            </>;
            return shouldRenderLinkField(card.link?.jsonValue, isEditing)
              ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{content}</Link>
              : <div key={card.id} className="m-card">{content}</div>;
          })}
        </div>
      </div></div>
      {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center"><footer><div className="tileLink u-margin-top-md u-margin-bottom-md">
        <Link {...footerProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof footerLabel === 'string' && footerLabel ? footerLabel : undefined}>
          <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span><span className="a-link__text">{footerField.value?.text}</span>
        </Link>
      </div></footer></div></div>}
    </div>
  </div>;
};

/** Source resource groups reuse the native CardGrid heading and ordered cards.
 * The product variant owns the finite named anchor inside the shared grid. */
function SourceResourceGroup({ fields, params, productAnchor = false }: AllianzCardGridProps & { productAnchor?: boolean }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  // React 19 omits the legacy name attribute; keep the source anchor on the DOM.
  const productAnchorProps: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & { name?: string } = { name: 'product' };
  return <div className="l-container--full-width t-bg-transparent" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {productAnchor && <a {...productAnchorProps} />}
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </div></article>
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col4">
        {cards.map((card) => {
          const field = allianzLinkField(card.link?.jsonValue, isEditing);
          const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
          const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
          const content = <>
            {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
            <div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>
            {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="m-card__body" /> : <div className="m-card__body" />}
          </>;
          return shouldRenderLinkField(card.link?.jsonValue, isEditing)
            ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{content}</Link>
            : <div key={card.id} className="m-card">{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
}

/** Introduction followed by the original four-column resource-card collection. */
export const ResourceGroup = (props: AllianzCardGridProps) => <SourceResourceGroup {...props} />;

/** Product materials preserve their named anchor before the introduction. */
export const ResourceProductGroup = (props: AllianzCardGridProps) => <SourceResourceGroup {...props} productAnchor />;

/** One native datasource can own an introduction and a following tile/card row.
 * These finite variants preserve that ownership instead of repeating the same
 * datasource in separate renderings or deriving roles from authored prose. */
function StrategyGrid({ fields, params, layout }: AllianzCardGridProps & { layout: StrategyLayout }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const hasRootText = [data.heading, data.subheading, data.body]
    .some((value) => shouldRenderTextField(value?.jsonValue, isEditing));
  const footerField = allianzLinkField(data.primaryLink?.jsonValue, isEditing);
  const footerProps = isEditing ? { field: footerField } : safeLinkRenderProps(footerField);
  const footerLabel = footerField.value?.ariaLabel || footerField.value?.['aria-label'];
  const entries = cards.map((card, index) => {
    const presentation = strategyCardPresentation(layout, index);
    const whiteIcon = card.iconTheme?.jsonValue?.value === 'primary-brand';
    const iconTheme = whiteIcon ? 't-bg-primary-brand t-icon-primary-white'
      : `t-bg-transparent ${presentation.brandIcon ? 't-icon-primary-brand' : 't-icon-primary-black'}`;
    const icon = shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className={`tileIcon ${iconTheme}`}>
      <Image editable={isEditing} field={card.icon?.jsonValue} alt={card.icon?.jsonValue?.value?.alt ?? ''} />
    </div>;
    // Strategy source cards own a scalar General Link. Their separate Multilist
    // is explicitly empty in the import and may project as targetItems: [].
    // That empty collection must not suppress the independently authored link.
    const links = (shouldRenderLinkField(card.link?.jsonValue, isEditing)
      ? [{ id: `${card.id}-link`, link: card.link, icon: undefined, sourceArrow: true }]
      : (card.links?.targetItems ?? []).map((item) => ({ ...item, sourceArrow: false })))
      .filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
    const content = <>
      <header>
        <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || (presentation.intro ? 'h2' : presentation.stacked ? 'h3' : 'h4'))} field={card.heading?.jsonValue} />}</div>
        {shouldRenderTextField(card.subheading?.jsonValue, isEditing)
          ? <RichText editable={isEditing} field={safeEditorialRichText(card.subheading?.jsonValue, isEditing)} className="tileSubHeading" />
          : <div className="tileSubHeading" />}
      </header>
      {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className={editorialBodyClass(presentation.bodySize)} />}
      {links.length > 0 && <footer>{links.map((item) => {
        const field = allianzLinkField(item.link?.jsonValue, isEditing);
        const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
        const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
        return <div className="tileLink" key={item.id}>
          <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
            {shouldRenderImageField(item.icon?.jsonValue, isEditing) && <span className="a-link__icon" aria-hidden={isEditing ? undefined : true}><Image editable={isEditing} field={item.icon?.jsonValue} alt={item.icon?.jsonValue?.value?.alt ?? ''} /></span>}
            {item.sourceArrow && <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span>}
            <span className="a-link__text">{field.value?.text}</span>
          </Link>
        </div>;
      })}</footer>}
    </>;
    if (presentation.resource) {
      const field = allianzLinkField(card.link?.jsonValue, isEditing);
      const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
      const ariaLabel = field.value?.ariaLabel ?? field.value?.['aria-label'];
      const resource = <>
        {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
        <div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>
        {shouldRenderTextField(card.body?.jsonValue, isEditing)
          ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="m-card__body" />
          : <div className="m-card__body" />}
      </>;
      return { intro: false, node: shouldRenderLinkField(card.link?.jsonValue, isEditing)
        ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card" aria-label={typeof ariaLabel === 'string' ? ariaLabel : undefined}>{resource}</Link>
        : <div key={card.id} className="m-card">{resource}</div> };
    }
    const articleClass = presentation.intro ? 'm-axlIntroductionBlock -is--stacked -no--image'
      : `m-axlTile match-height${presentation.flipped ? ' -is--flipped' : ''}${presentation.stacked ? ' tile--stackedImage' : presentation.split ? ' tile--alphaNumeric' : ''} ${presentation.split ? '-is--split' : '-is--stacked'} ${sectionTheme(card.theme?.jsonValue?.value)}`;
    const article = <article className={`allianz-editorial-cards allianz-strategy-cards ${articleClass}`}>
      <div className={`tileContent u-text-${presentation.alignment}`}>
        {presentation.intro ? <>{icon}{content}</> : <>
          {icon && <div className="tileSubGrid__image">{icon}</div>}
          <div className="tileSubGrid__content">{content}</div>
        </>}
      </div>
      {presentation.stacked && shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
    </article>;
    return { intro: presentation.intro, node: <div key={card.id} className={presentation.columnClass}>{article}</div> };
  });
  const rows = <>
    {hasRootText && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
      <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <header><div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div></header>}
        {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" />}
        {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
      </div></article>
    </div></div>}
    {params.introSpacer === '1' && layout === 'stacked-pair' && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12" /></div>}
    {entries.filter((entry) => entry.intro).map((entry, index) => <div key={`intro-${cards[index]?.id}`} className="l-grid__row u-margin-bottom-lg u-padding-top-lg">{entry.node}</div>)}
    {entries.some((entry) => !entry.intro) && <div className={`l-grid__row${layout === 'stacked-pair' || layout === 'intro-tiles' || layout === 'intro-flipped-tiles' ? ' match-height-row' : ''} ${rowSpacing(params)}`}>
      {layout === 'intro-resources' ? <div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">{entries.filter((entry) => !entry.intro).map((entry) => entry.node)}</div></div>
        : entries.filter((entry) => !entry.intro).map((entry) => entry.node)}
    </div>}
    {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center"><footer><div className="tileLink u-margin-top-md u-margin-bottom-md">
      <Link {...footerProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof footerLabel === 'string' && footerLabel ? footerLabel : undefined}>
        <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span><span className="a-link__text">{footerField.value?.text}</span>
      </Link>
    </div></footer></div></div>}
  </>;
  if (params.container === 'row') return rows;
  return <div className={`${params.sectionWidth === 'contained' ? 'l-container' : 'l-container--full-width'} ${params.sectionSpacing === '1' ? 'u-row-spacing ' : ''}${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className={`l-grid l-grid--max-width${params.sectionWidth === 'contained' ? ' l-grid--no-gutters-outer' : ''}`}>{rows}</div>
  </div>;
}

export const StrategyIntro = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="intro" />;
export const StrategyBrandIntro = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="brand-intro" />;
export const StrategyIntroSplit = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="intro-split" />;
export const StrategyIntroTiles = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="intro-tiles" />;
export const StrategyIntroFlippedTiles = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="intro-flipped-tiles" />;
export const StrategyIntroResources = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="intro-resources" />;
export const StrategyStackedPair = (props: AllianzCardGridProps) => <StrategyGrid {...props} layout="stacked-pair" />;

/** These source-owned glyphs are presentation, separate from native image fields. */
const LIFE_FAQ_NAVIGATION_ICONS = ['love', 'line-graph', 'pen'] as const;
const LIFE_FAQ_PROMPT_ICONS = ['family', 'deliver-value', 'money-out', 'list'] as const;
const LifeFaqIcon = ({ name }: { name: string }) => {
  // Keep the recovered decorative SVG bytes without image optimization or synthetic SDK fields.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={'/allianz-ui/life-faq/' + name + '.svg'} className="allianz-life-faq-glyph"
    alt="" aria-hidden="true" width={26} height={26} />;
};

const LifeFaqLink = ({ source, isEditing }: {
  source: Parameters<typeof allianzLinkField>[0]; isEditing: boolean;
}) => {
  const field = allianzLinkField(source, isEditing);
  const props = isEditing ? { field } : safeLinkRenderProps(field);
  const ariaLabel = source?.value?.ariaLabel || source?.value?.['aria-label'] ||
    (source?.value?.linktype === 'anchor' ? source.value.text : undefined);
  return <Link {...props} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link"
    aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
    <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span>
    <span className="a-link__text">{source?.value?.text}</span>
  </Link>;
};

function LifeFaqCards({ fields, params, appearance }: AllianzCardGridProps & {
  appearance: 'navigation' | 'prompt';
}) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const prompt = appearance === 'prompt';
  const icons = prompt ? LIFE_FAQ_PROMPT_ICONS : LIFE_FAQ_NAVIGATION_ICONS;
  const theme = prompt ? 't-bg-green-soft' : 't-bg-transparent';
  const wrapperClass = 'l-container--full-width ' + theme + ' axlTileCollection allianz-life-faq-cards';
  return <>
    <div className={wrapperClass} id={params.RenderingIdentifier}>
      <div className="l-grid l-grid--max-width">
        {prompt && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
          <div className="l-grid__column-medium-12">
            <article className="m-axlIntroductionBlock -is--stacked -no--image">
              <div className="tileContent u-text-center">
                <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><LifeFaqIcon name="question" /></div>
                <header>
                  <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) &&
                    <Text tag="h2" editable={isEditing} field={data.heading?.jsonValue} />}</div>
                  <div className="tileSubHeading" />
                </header>
                {shouldRenderTextField(data.body?.jsonValue, isEditing) &&
                  <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
              </div>
            </article>
          </div>
        </div>}
        <div className={'l-grid__row match-height-row' + (prompt ? '' : ' u-margin-bottom-xl')}>
          {cards.map((card, index) => <div key={card.id} className={prompt ? 'l-grid__column-medium-3' : 'l-grid__column-medium-4'}>
            <article className="m-axlTile match-height -is--flipped -is--stacked t-bg-transparent">
              <div className="tileContent u-text-center">
                {icons[index] && <div className="tileSubGrid__image">
                  <div className="tileIcon t-bg-transparent t-icon-primary-black"><LifeFaqIcon name={icons[index]} /></div>
                </div>}
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{!prompt && shouldRenderTextField(card.heading?.jsonValue, isEditing) &&
                      <Text tag="h4" editable={isEditing} field={card.heading?.jsonValue} />}</div>
                    <div className="tileSubHeading" />
                  </header>
                  {shouldRenderTextField(card.body?.jsonValue, isEditing) &&
                    <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" />}
                  {!prompt && shouldRenderLinkField(card.link?.jsonValue, isEditing) &&
                    <footer><div className="tileLink"><LifeFaqLink source={card.link?.jsonValue} isEditing={isEditing} /></div></footer>}
                </div>
              </div>
            </article>
          </div>)}
        </div>
      </div>
    </div>
    {prompt && shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) &&
      <div className={wrapperClass + ' allianz-life-faq-product-cta'}>
        <div className="l-grid l-grid--max-width">
          <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
            <div className="l-grid__column-medium-12">
              <article className="m-axlIntroductionBlock -is--stacked -no--image">
                <div className="tileContent u-text-center">
                  <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
                  <footer><div className="tileLink"><LifeFaqLink source={data.primaryLink?.jsonValue} isEditing={isEditing} /></div></footer>
                </div>
              </article>
            </div>
          </div>
          <div className="l-grid__row"><div className="l-grid__column-medium-12" /></div>
        </div>
      </div>}
  </>;
}

/** Three ordered life-FAQ category cards with native scalar anchor links. */
export const LifeFaqNavigation = (props: AllianzCardGridProps) => <LifeFaqCards {...props} appearance="navigation" />;

/** Source question introduction, four prompts and a separately owned product CTA row. */
export const LifeFaqPrompt = (props: AllianzCardGridProps) => <LifeFaqCards {...props} appearance="prompt" />;

/** Source-owned Tools glyphs are presentation, independent of native Image fields. */
const LifeToolsGlyph = ({ name }: { name: 'calculator' | 'puzzle' | 'user-settings' | 'question' | 'video' }) => {
  // Preserve the recovered SVG bytes and avoid synthetic fields or image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={'/allianz-ui/life-tools/' + name + '.svg'} className="allianz-life-tools-glyph"
    alt="" aria-hidden="true" width={26} height={26} />;
};

type LifeToolsGroupAppearance = 'needs' | 'strategy' | 'more';
const LIFE_TOOLS_GROUP_PRESENTATION = {
  needs: { columns: '2', theme: 't-bg-transparent', icon: 'calculator', body: true },
  strategy: { columns: '3', theme: 't-bg-blue-soft', icon: 'puzzle', body: true },
  more: { columns: '3', theme: 't-bg-transparent', icon: 'user-settings', body: false },
} as const;

/** The three observed tools sections retain their native root and scalar-card owners. */
function LifeToolsGroup({ fields, params, appearance }: AllianzCardGridProps & { appearance: LifeToolsGroupAppearance }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const presentation = LIFE_TOOLS_GROUP_PRESENTATION[appearance];
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className={'l-container--full-width ' + presentation.theme + ' allianz-life-tools-cards'} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-transparent t-icon-primary-black"><LifeToolsGlyph name={presentation.icon} /></div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) &&
              <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {presentation.body && shouldRenderTextField(data.body?.jsonValue, isEditing) &&
            <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </div></article>
      </div></div>
      <div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12">
        <div className={'o-cards o-cards__col' + presentation.columns}>
          {cards.map((card) => {
            const field = allianzLinkField(card.link?.jsonValue, isEditing);
            const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
            const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
            const content = <>
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image">
                <Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''}
                  sizes="100vw" className="c-image__img c-teaser__image-img" />
              </picture></div>}
              <div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) &&
                <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>
              {shouldRenderTextField(card.body?.jsonValue, isEditing)
                ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="m-card__body" />
                : <div className="m-card__body" />}
              {appearance === 'more' && shouldRenderTextField(card.subheading?.jsonValue, isEditing) &&
                <div className="m-card__footer"><LifeToolsGlyph name="video" />
                  <Text editable={isEditing} tag="span" className="cardCategory" field={card.subheading?.jsonValue} />
                </div>}
            </>;
            return shouldRenderLinkField(card.link?.jsonValue, isEditing)
              ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing}
                  className="m-card" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{content}</Link>
              : <div key={card.id} className="m-card">{content}</div>;
          })}
        </div>
      </div></div>
    </div>
  </div>;
}

export const LifeToolsNeeds = (props: AllianzCardGridProps) => <LifeToolsGroup {...props} appearance="needs" />;
export const LifeToolsStrategy = (props: AllianzCardGridProps) => <LifeToolsGroup {...props} appearance="strategy" />;
export const LifeToolsMore = (props: AllianzCardGridProps) => <LifeToolsGroup {...props} appearance="more" />;

/** Closing tools introduction owns only native heading, body and its General Link. */
export const LifeToolsHelp = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const field = allianzLinkField(data.primaryLink?.jsonValue, isEditing);
  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
  // The source CTA's accessible label equals its native visible General Link text.
  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection allianz-life-tools-cards" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12">
        <article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
          <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><LifeToolsGlyph name="question" /></div>
          <header>
            <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) &&
              <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
            <div className="tileSubHeading" />
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) &&
            <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
          {shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <footer><div className="tileLink">
            <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link"
              aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
              <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span>
              <span className="a-link__text">{field.value?.text}</span>
            </Link>
          </div></footer>}
        </div></article>
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12" /></div>
    </div>
  </div>;
};

/** Finite source variants project only their owned serialized fields. */
function lifeOverviewCardFields(card: Parameters<typeof allianzCardFields>[0], active: readonly string[]) {
  if (!Array.isArray(card.fieldCollection)) return card;
  return allianzCardFields({ id: card.id, fieldCollection: card.fieldCollection.filter((field) =>
    typeof field?.name === 'string' && active.includes(field.name.toLowerCase())) });
}

/** Four source benefits retain their native column-first child order. */
export const LifeBenefitsGrid = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map((card) => lifeOverviewCardFields(card, ['heading', 'body']));
  if (cards.length !== 4) return <NoDataFallback componentName="AllianzCardGrid" />;
  const icons = ['secure', 'savings', 'line-graph', 'shapes'] as const;
  const columns = [cards.slice(0, 2), cards.slice(2, 4)];
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-life-benefits-grid" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-margin-bottom-xl">
        {columns.map((column, columnIndex) => <div key={column[0].id} className="l-grid__column-medium-6">
          {column.map((card, rowIndex) => <article key={card.id} className="m-axlTile match-height -is--flipped -is--stacked t-bg-transparent">
            <div className="tileContent u-text-center">
              <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">
                {/* Exact source-fixed SVG is decorative; native Image fields remain unused. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="allianz-life-benefit-glyph" src={'/allianz-ui/life-overview/' + icons[columnIndex * 2 + rowIndex] + '.svg'} alt="" aria-hidden="true" width="24" height="24" />
              </div></div>
              <div className="tileSubGrid__content">
                <header>
                  <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) &&
                    <Text tag="h4" editable={isEditing} field={card.heading?.jsonValue} />}</div>
                  <div className="tileSubHeading" />
                </header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) &&
                  <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="tileBody u-font-size-md" />}
              </div>
            </div>
          </article>)}
        </div>)}
      </div>
    </div>
  </div>;
};

/** The six source image cards have no native introduction or footer fields. */
function LifeOverviewImageCards({ fields, params, appearance }: AllianzCardGridProps & { appearance: 'needs' | 'more' }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map((card) =>
    lifeOverviewCardFields(card, ['heading', 'body', 'image', 'link']));
  const needs = appearance === 'needs';
  if (cards.length !== (needs ? 4 : 2)) return <NoDataFallback componentName="AllianzCardGrid" />;
  return <div className={'l-container--full-width ' + (needs ? 't-bg-transparent' : 't-bg-green-soft') + ' allianz-life-overview-cards'} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={'l-grid__row' + (needs ? ' u-margin-bottom-xl' : '')}><div className="l-grid__column-medium-12">
        <div className={'o-cards o-cards__col' + (needs ? '4' : '2')}>
          {cards.map((card) => {
            const field = allianzLinkField(card.link?.jsonValue, isEditing);
            const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
            const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
            const content = <>
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image">
                <Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''}
                  sizes="100vw" className="c-image__img c-teaser__image-img" />
              </picture></div>}
              <div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) &&
                <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>
              {shouldRenderTextField(card.body?.jsonValue, isEditing)
                ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="m-card__body" />
                : <div className="m-card__body" />}
            </>;
            return shouldRenderLinkField(card.link?.jsonValue, isEditing)
              ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing}
                  className="m-card" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{content}</Link>
              : <div key={card.id} className="m-card">{content}</div>;
          })}
        </div>
      </div></div>
    </div>
  </div>;
}

export const LifeNeedsCards = (props: AllianzCardGridProps) => <LifeOverviewImageCards {...props} appearance="needs" />;
export const LifeMoreCards = (props: AllianzCardGridProps) => <LifeOverviewImageCards {...props} appearance="more" />;
