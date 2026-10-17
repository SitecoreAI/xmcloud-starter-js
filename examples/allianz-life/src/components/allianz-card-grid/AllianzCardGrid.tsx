'use client';

import { Fragment } from 'react';
import { Image, Link, RichText, Text, useSitecore, type LinkField } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, safeLinkRenderProps, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import { allianzCardFields } from 'lib/allianz-card-fields';
import { restoreSourceDestinationLinkProps, restoreSourceDestinationRichText } from 'lib/allianz-source-destinations';
import { editorialBodyClass, editorialColumnClass, editorialHeadingTag, safeEditorialRichText } from 'lib/allianz-editorial';
import './AllianzEditorialCards.css';
import { EditorialFrame } from 'lib/allianz-editorial-frame';
import type { AllianzCardGridDefaultProps, AllianzCardGridProps } from './allianz-card-grid.props';
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
import './AllianzAboutCards.css';
import './AllianzIndexPartnerLogos.css';
import './AllianzCardIcons.css';
import './AllianzCardGridHeadingIcons.css';

type AllianzCardGridPresentation = {
  isRilaPromotion?: boolean;
  faqAppearance?: 'help' | 'professional';
  sourceAnchor?: 'impact';
  sourceRelatedIntroduction?: boolean;
  sourceFeaturesIntroduction?: boolean;
  sourceDestinations?: boolean;
  sourceIconAppearance?: boolean;
  sourceDownloadLinks?: boolean;
  headingIconAppearance?: 'gray' | 'brand';
};

type CardIconAppearance = 'white-on-black' | 'gray-on-transparent';

/** Finite authorable treatments for external monochrome Image fields. */
function cardIconAppearance(value: unknown): CardIconAppearance | undefined {
  return value === 'white-on-black' || value === 'gray-on-transparent' ? value : undefined;
}

function cardIconTheme(theme: unknown, appearance?: CardIconAppearance): string {
  if (appearance === 'white-on-black') return 't-bg-primary-black t-icon-primary-white';
  if (appearance === 'gray-on-transparent') return 't-bg-transparent t-icon-primary-black';
  return theme === 'primary-brand' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black';
}

function sourceDestinationId(ownerId: unknown): string | undefined {
  if (typeof ownerId !== 'string') return undefined;
  const id = ownerId.startsWith('{') && ownerId.endsWith('}') ? ownerId.slice(1, -1) : ownerId;
  return /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(id)
    ? id.replace(/-/g, '').toLowerCase() : undefined;
}

function AllianzCardGrid({ fields, params, isRilaPromotion = false, faqAppearance,
  sourceAnchor, sourceRelatedIntroduction = false, sourceFeaturesIntroduction = false, sourceDestinations = false, sourceIconAppearance = false, sourceDownloadLinks = false, headingIconAppearance,
}: AllianzCardGridProps & AllianzCardGridPresentation) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const nativeDataId = 'id' in data && typeof data.id === 'string' ? data.id.replace(/[{}-]/g, '').toLowerCase() : undefined;
  const isFinancialRatings = nativeDataId === '6a6d5c5594f94090a7f4dcec2ff47726';
  const routeId = page?.layout?.sitecore?.route?.itemId;
  const isIndexPartnerLogos = typeof routeId === 'string'
    && routeId.replace(/[{}-]/g, '').toLowerCase() === 'e8e1893aff9b4b4a81bca809693ccf88'
    && nativeDataId === '6e198e6d86944bea88a9702c6c07c5ea'
    && params.layout === 'stacked' && params.columns === '4';
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const iconAppearance = sourceIconAppearance ? cardIconAppearance(params.iconAppearance) : undefined;
  const sourceDataId = sourceDestinations ? sourceDestinationId('id' in data ? data.id : undefined) : undefined;
  const sourceDestinationEditing = page?.mode?.isEditing !== false;
  const cardBodyField = (card: (typeof cards)[number]) =>
    sourceDataId === '68f5eea4e83f46e2aadfb4d244aa8230' && sourceDestinationId(card.id) === 'c4f12d3c2db14cc98dbc1b6683ecf133'
      ? restoreSourceDestinationRichText(card.body?.jsonValue, sourceDestinationEditing, card.id) : card.body?.jsonValue;
  const scalarLinkProps = (card: (typeof cards)[number], props: Parameters<typeof restoreSourceDestinationLinkProps>[0]) => {
    if (sourceDataId !== '0b2c3b00952345b189e732b1b9bbd34a' || ![
      '5b186c8836a64df8b9100187d1bd7101', '143dd9d8760c4ac589591c534360e51c', '5d51bc887cc84f159ed72598ee011858',
    ].includes(sourceDestinationId(card.id) ?? '')) return props;
    return restoreSourceDestinationLinkProps(props, card.link?.jsonValue, sourceDestinationEditing, card.id);
  };
  const column = ({ '1':12, '2':6, '3':4, '4':3 } as Record<string, number>)[params.columns] ?? 12;
  const isCards = params.layout === 'cards';
  const splitClass = params.splitRatio === '33:67' ? 'tile--3366' : params.splitRatio === '67:33' ? 'tile--6633' : 'tile--5050';
  if (params.layout === 'list') return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}><div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12"><div className="c-search-result-text-teaser">{cards.map((card) => <article className="c-search-result-text-teaser__item" key={card.id}><h5 className="c-search-result-text-teaser__headline"><Link editable={isEditing} {...scalarLinkProps(card, { field: allianzLinkField(card.link?.jsonValue, isEditing) })} renderChildrenWhenEmpty={isEditing}><Text editable={isEditing} field={card.heading?.jsonValue} /></Link></h5><RichText editable={isEditing} field={cardBodyField(card)} className="c-search-result-text-teaser__copytext" /></article>)}</div></div></div></div></section>;
  const headingIcon = headingIconAppearance ? data.icon?.jsonValue : undefined;
  const showHeadingIcon = !!headingIconAppearance && shouldRenderImageField(headingIcon, isEditing);
  const introductionHeading = <>
    <div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div><RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" />
  </>;
  const sourceAnchorProps: import('react').AnchorHTMLAttributes<HTMLAnchorElement> & { name?: 'impact' } = { name: sourceAnchor };
  return <div data-allianz-index-partner-logos={isIndexPartnerLogos ? "" : undefined} data-allianz-card-grid={isFinancialRatings ? nativeDataId : undefined} className={`l-container--full-width ${sectionTheme(params.theme)}${sourceRelatedIntroduction ? '' : ' axlTileCollection'}${faqAppearance ? ' allianz-faq-cards' : ''}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {sourceAnchor && <a {...sourceAnchorProps} />}
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        {showHeadingIcon && <div className={`tileIcon ${headingIconAppearance === 'brand' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`} data-allianz-card-grid-heading-icon={headingIconAppearance}>
          <Image editable={isEditing} field={headingIcon} className="allianz-card-grid-heading-glyph" />
        </div>}
        {sourceRelatedIntroduction ? <>
          <div className="tileIcon t-bg-primary-brand t-icon-primary-white"><SustainabilityInformationIcon /></div>
          <header>
            <div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div>
            {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} className="tileSubHeading" /> : <div className="tileSubHeading" />}
          </header>
          {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="tileBody" />}
        </> : sourceFeaturesIntroduction ? <header>
          <div className="tileHeading"><h2><Text editable={isEditing} field={data.heading?.jsonValue} /><br /></h2></div>
          {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
        </header> : <>
          {showHeadingIcon ? <header>{introductionHeading}</header> : introductionHeading}<RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />{shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
        </>}
        {sourceFeaturesIntroduction && shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
        {sourceFeaturesIntroduction && shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}
      </div></article></div></div>}
      <div className={`l-grid__row ${isCards ? '' : 'match-height-row'} ${rowSpacing(params)}`}>
        {isCards ? <div className="l-grid__column-medium-12"><div className={`o-cards o-cards__col${params.columns || '3'}`}>
          {cards.map((card) => {
            const field = allianzLinkField(card.link?.jsonValue, isEditing);
            const linkProps = scalarLinkProps(card, sourceRelatedIntroduction && !isEditing ? safeLinkRenderProps(field) : { field });
            return <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card">
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} sizes={sourceRelatedIntroduction ? '100vw' : undefined} className="c-image__img c-teaser__image-img" /></picture></div>}
              <div className="m-card__header"><Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={sourceRelatedIntroduction ? safeEditorialRichText(card.body?.jsonValue, isEditing) : cardBodyField(card)} className="m-card__body" />
            </Link>;
          })}
        </div></div> : cards.map((card) => {
          const links = card.links?.targetItems?.length ? card.links.targetItems : [{ id: `${card.id}-link`, link: card.link }];
          const hasLinks = Boolean(card.links?.targetItems?.some((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) || shouldRenderLinkField(card.link?.jsonValue, isEditing));
          const isPartnerLogo = isIndexPartnerLogos && Boolean(card.image?.jsonValue)
            && ![card.heading, card.subheading, card.body, card.alphanumeral].some((field) => shouldRenderTextField(field?.jsonValue, false))
            && !shouldRenderImageField(card.icon?.jsonValue, false)
            && !shouldRenderLinkField(card.link?.jsonValue, false)
            && !card.links?.targetItems?.some((item) => shouldRenderLinkField(item.link?.jsonValue, false));
          return <div key={card.id} className={`l-grid__column-medium-${column}`}>
          <article data-allianz-index-partner-logo={isPartnerLogo ? "" : undefined} data-allianz-card={isFinancialRatings ? card.id.replace(/[{}-]/g, '').toLowerCase() : undefined} className={`m-axlTile match-height ${sectionTheme(card.theme?.jsonValue?.value)} ${faqAppearance === 'help' ? '-is--flipped -is--stacked' : faqAppearance === 'professional' ? 'tile--stackedImage -is--stacked' : params.layout === 'image-left' || params.layout === 'image-right' ? `${splitClass} -is--split ${params.layout === 'image-right' ? '-is--flipped' : ''}` : shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'stacked' ? '-is--flipped tile--stackedImage -is--stacked' : '-is--stacked'} ${params.layout === 'bordered' ? 'allianz-bordered' : ''}`}>
            <div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
              {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className={`tileIcon ${cardIconTheme(card.iconTheme?.jsonValue?.value, iconAppearance)}`} data-allianz-card-icon-appearance={iconAppearance}><Image editable={isEditing} field={card.icon?.jsonValue} {...(iconAppearance ? { className: 'allianz-card-icon-glyph' } : {})} /></div></div>}
              {shouldRenderTextField(card.alphanumeral?.jsonValue, isEditing) && <div className="tileSubGrid__image"><Text editable={isEditing} tag={isFinancialRatings ? 'span' : undefined} field={card.alphanumeral?.jsonValue} className="tileAlphanumeral" /></div>}
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'bordered' && <div className="tileSubGrid__image"><div className="tileImage"><Image editable={isEditing} field={card.image?.jsonValue} /></div></div>}
              <div className="tileSubGrid__content"><header><div className="tileHeading"><Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /></header>
                <RichText editable={isEditing} field={faqAppearance ? safeFaqRichText(card.body?.jsonValue, isEditing) : isFinancialRatings ? financialRatingsRichText(card.body?.jsonValue, isEditing, card.id) : cardBodyField(card)} className={`tileBody ${isRilaPromotion ? 'u-font-size-lg' : params.headingLevel === 'h2' ? 'u-font-size-xl' : 'u-font-size-md'}`} />
                {hasLinks && <footer><div className="tileLink">{links.filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)).map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
                  const linkKey = item.id ?? (field as typeof field & { metadata?: { itemId?: string } }).metadata?.itemId ?? linkIndex;
                  const originalLinkProps = sourceAnchor && !isEditing ? safeLinkRenderProps(field) : { field };
                  const linkProps = card.links?.targetItems?.length ? originalLinkProps : scalarLinkProps(card, originalLinkProps);
                  return <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={sourceAnchor ? isEditing : undefined} key={linkKey} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}><><span className="a-link__icon" aria-hidden="true">{sourceDownloadLinks ? <SourceDownloadLinkIcon /> : sourceFeaturesIntroduction && /\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg>}</span><span className="a-link__text">{item.link?.jsonValue?.value?.text}</span></></Link>;
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

export const Default = (props: AllianzCardGridDefaultProps) => <AllianzCardGrid {...props} sourceDestinations sourceIconAppearance />;

/** Exact source Download geometry, decorative inside the authored link icon span. */
const SourceDownloadLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24">
  <path fillRule="evenodd" d="M11.0088496,18.601 L5.41052947,13.1737857 C4.86315684,12.6431429 4.86315684,11.7854286 5.41052947,11.2547857 C5.9579021,10.7241429 6.84265787,10.7241429 7.3900305,11.2547857 L10.60007,14.3667143 L10.60007,1.35714286 C10.60007,0.606642857 11.2258387,0 12,0 C12.7741613,0 13.39993,0.606642857 13.39993,1.35714286 L13.39993,14.3667143 L16.6099695,11.2547857 C17.1573421,10.7241429 18.0420979,10.7241429 18.5894705,11.2547857 C19.1368432,11.7854286 19.1368432,12.6431429 18.5894705,13.1737857 L12.9911504,18.601 C12.8623569,18.7272143 12.7069647,18.8262857 12.5347733,18.8955 C12.3639818,18.9647143 12.1819909,19 12,19 C11.8180091,19 11.6360182,18.9647143 11.4652267,18.8955 C11.2930353,18.8262857 11.1376431,18.7272143 11.0088496,18.601 Z M22.9090909,18 C23.5104545,18 24,18.4669565 24,19.0434783 L24,22.9565217 C24,23.5317391 23.5104545,24 22.9090909,24 L1.09090909,24 C0.489545455,24 0,23.5317391 0,22.9565217 L0,19.0434783 C0,18.4669565 0.489545455,18 1.09090909,18 C1.69227273,18 2.18181818,18.4669565 2.18181818,19.0434783 L2.18181818,21.9130435 L21.8181818,21.9130435 L21.8181818,19.0434783 C21.8181818,18.4669565 22.3077273,18 22.9090909,18 Z" />
</svg>;

/** Complete Default surface with the source Download footer presentation. */
export const SourceDownloadLinks = (props: AllianzCardGridProps) => <Default {...props} sourceDownloadLinks />;

/** One authorable root glyph above the complete existing card group. */
export const HeadingIcon = (props: AllianzCardGridProps) => <Default {...props} headingIconAppearance="gray" />;

/** The same complete group with a white root glyph on the source brand circle. */
export const BrandHeadingIcon = (props: AllianzCardGridProps) => <Default {...props} headingIconAppearance="brand" />;

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
  // The SDK projects a source-empty external URL as http://. Inspect the
  // original field before the visitor safety adapter replaces that placeholder.
  const isEmptyLabelLink = (field?: LinkField) => params.emptyLink === 'label' &&
    (!field?.value?.href || (field.value.href === 'http://' &&
      field.value.linktype === 'external' && field.value.url === ''));
  const hasEditorialLinkContent = (field?: LinkField) => isEmptyLabelLink(field)
    ? Boolean(field?.value?.text?.trim()) : shouldRenderLinkField(field, false);
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
          .filter((item) => isEditing ? shouldRenderLinkField(item.link?.jsonValue, true)
            : hasEditorialLinkContent(item.link?.jsonValue));
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
          const link = !isEditing && isEmptyLabelLink(item.link?.jsonValue)
            ? <span className="a-link">{contents}</span>
            : <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{contents}</Link>;
          return params.linkLayout === 'rows'
            ? <div key={item.id} className="tileLink">{link}</div>
            : <Fragment key={item.id}>{link}</Fragment>;
        });
        const hasLinkContent = links.map((item) => hasEditorialLinkContent(item.link?.jsonValue));
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
export const EditorialStacked = ({ fields, params, linkTextAriaLabel = false }: AllianzCardGridProps & { linkTextAriaLabel?: boolean }) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const column = params.columns === '2' ? 'l-grid__column-medium-6' : editorialColumnClass(params);
  const iconAppearance = cardIconAppearance(params.iconAppearance);
  return <EditorialFrame params={{ ...params, matchHeightRow: '1' }}>
    {cards.map((card) => {
      const links = (card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link, icon: undefined }])
        .filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
      const article = <article className={`allianz-editorial-cards m-axlTile match-height -is--flipped tile--stackedImage -is--stacked ${sectionTheme(card.theme?.jsonValue?.value)}${params.tileMarginBottom === 'xl' ? ' u-margin-bottom-xl' : ''}`}>
        <div className={`tileContent ${params.alignment === 'center' ? 'u-text-center' : 'u-text-left'}`}>
          {iconAppearance && shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className={`tileIcon ${cardIconTheme(card.iconTheme?.jsonValue?.value, iconAppearance)}`} data-allianz-card-icon-appearance={iconAppearance}><Image editable={isEditing} field={card.icon?.jsonValue} className="allianz-card-icon-glyph" /></div></div>}
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
              const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || (linkTextAriaLabel ? field.value?.text : undefined);
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

/** Source About parent portrait tile: native body and image, without extra fields. */
export const AboutParentCompany = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-about-parent-company" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row match-height-row"><div className="l-grid__column-medium-12">
      {cards.map((card) => <article key={card.id} className="m-axlTile match-height tile--6633 -is--split t-bg-transparent u-margin-bottom-xl">
        <div className="tileContent u-text-left"><div className="tileSubGrid__content">
          <header><div className="tileHeading" /><div className="tileSubHeading" /></header>
          {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" />}
        </div></div>
        {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image">
          <Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" />
        </picture></div>}
      </article>)}
    </div></div></div>
  </div>;
};

/** Source About whole-card teasers: scalar native GeneralLinks and original fields. */
export const AboutTeaserCards = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft allianz-about-teaser-cards" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row u-margin-bottom-xl"><div className="l-grid__column-medium-12">
      <div className="o-cards o-cards__col3">{cards.map((card) => {
        const field = allianzLinkField(card.link?.jsonValue, isEditing);
        const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
        const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
        const content = <>
          {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image">
            <Image editable={isEditing} field={card.image?.jsonValue} alt={card.image?.jsonValue?.value?.alt ?? ''} sizes="100vw" className="c-image__img c-teaser__image-img" />
          </picture></div>}
          <div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>
          {shouldRenderTextField(card.body?.jsonValue, isEditing)
            ? <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" /> : <div className="m-card__body" />}
        </>;
        return shouldRenderLinkField(card.link?.jsonValue, isEditing)
          ? <Link key={card.id} {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="m-card"
              aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>{content}</Link>
          : <div key={card.id} className="m-card">{content}</div>;
      })}</div>
    </div></div></div>
  </div>;
};

/** Finite offer surfaces retain original SDK fields and hide source-unused chrome. */
function offerCardGridFields(props: AllianzCardGridProps, questionPrompt: boolean): AllianzCardGridProps {
  const data = props.fields?.data?.datasource;
  if (!data) return props;
  const cards = (data.children?.results ?? []).map((entry) => {
    const card = allianzCardFields(entry);
    return {
      ...card,
      // Reused renderers project again; the clone must not restore inactive fields.
      fieldCollection: [],
      subheading: undefined,
      alphanumeral: undefined,
      headingLevel: undefined,
      body: questionPrompt ? undefined : card.body,
      image: questionPrompt ? undefined : card.image,
      icon: questionPrompt ? card.icon : undefined,
      link: undefined,
      links: { targetItems: questionPrompt ? [] : (card.links?.targetItems ?? []).map((item) => ({
        id: item.id,
        link: item.link,
      })) },
    };
  });
  return { ...props, fields: { ...props.fields, data: { ...props.fields?.data, datasource: {
    ...data,
    heading: undefined,
    subheading: undefined,
    body: undefined,
    primaryLink: undefined,
    children: { ...data.children, results: cards },
  } } } };
}

/** SDK parameter values are strings; an absent rendering ID remains absent. */
function offerCardGridParams(props: AllianzCardGridProps, questionPrompt: boolean): AllianzCardGridProps['params'] {
  const params: AllianzCardGridProps['params'] = {
    DynamicPlaceholderId: props.params.DynamicPlaceholderId,
    FieldNames: props.params.FieldNames,
    theme: questionPrompt ? 'green-soft' : 'transparent',
    layout: 'stacked',
    columns: questionPrompt ? '1' : '2',
    alignment: questionPrompt ? 'center' : 'left',
    spacing: 'none',
    headingLevel: 'h2',
    paddingTop: questionPrompt ? 'lg' : 'xl',
    paddingBottom: 'none',
    marginBottom: questionPrompt ? 'lg' : 'none',
    bodySize: questionPrompt ? 'source-default' : 'medium',
  };
  if (!questionPrompt) params.tileMarginBottom = 'xl';
  if (props.params.RenderingIdentifier !== undefined) {
    params.RenderingIdentifier = props.params.RenderingIdentifier;
  }
  return params;
}

/** Two native grey photo tiles and their ordered Navigation General Link fields. */
export const OfferCards = (props: AllianzCardGridProps) => <EditorialStacked {...offerCardGridFields(props, false)}
  linkTextAriaLabel params={offerCardGridParams(props, false)} />;

/** Source Question prompt owns only its native heading and native DAM icon. */
export const OfferQuestionPrompt = (props: AllianzCardGridProps) => <EditorialIntro {...offerCardGridFields(props, true)}
  params={offerCardGridParams(props, true)} />;


/** Source design glyphs belong to this finite three-card resource presentation;
 * every heading and link remains an original native field. */
export const FixedProductResources = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const sourceIcons = [FixedResourceStocksIcon, FixedResourceCalculatorIcon, FixedResourceSearchDocumentIcon];
  const spacing = rowSpacing(params);
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row match-height-row${spacing ? ` ${spacing}` : ''}`}>
        {cards.map((card, cardIndex) => {
          const Icon = sourceIcons[cardIndex];
          const links = (card.links?.targetItems ?? [])
            .filter(item => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {Icon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Icon /></div></div>}
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div>
                    <div className="tileSubHeading" />
                  </header>
                  <div className="tileBody u-font-size-md" />
                  {links.length > 0 && <footer>{links.map(item => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    const download = /\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '');
                    return <div className="tileLink" key={item.id}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{download ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span>
                        <span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

const FixedResourceStocksIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconStockGraphUp" aria-describedby="descIconStockGraphUp" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconStockGraphUp">Stocks</title><desc id="descIconStockGraphUp">Stocks</desc>  <path d="M5.5,10 L0.5,10 C0.2,10 0,10.2 0,10.5 L0,21.5 C0,21.8 0.2,22 0.5,22 L5.5,22 C5.8,22 6,21.8 6,21.5 L6,10.5 C6,10.2 5.8,10 5.5,10 Z M5,21 L1,21 L1,11 L5,11 L5,21 Z M14.5,3 L9.5,3 C9.2,3 9,3.2 9,3.5 L9,21.5 C9,21.8 9.2,22 9.5,22 L14.5,22 C14.8,22 15,21.8 15,21.5 L15,3.5 C15,3.2 14.8,3 14.5,3 Z M14,21 L10,21 L10,4 L14,4 L14,21 Z M23.5,12 L18.5,12 C18.2,12 18,12.2 18,12.5 L18,21.5 C18,21.8 18.2,22 18.5,22 L23.5,22 C23.8,22 24,21.8 24,21.5 L24,12.5 C24,12.2 23.8,12 23.5,12 Z M23,21 L19,21 L19,13 L23,13 L23,21 Z"/></svg>;

const FixedResourceCalculatorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconCalculator" aria-describedby="descIconCalculator" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconCalculator">Calculator</title><desc id="descIconCalculator">Calculator</desc>  <path d="M18.1875,17.7818182 L15.7125,17.7818182 C15.375,17.7818182 15.15,18 15.15,18.3272727 L15.15,20.7272727 C15.15,21.0545455 15.375,21.2727273 15.7125,21.2727273 L18.1875,21.2727273 C18.525,21.2727273 18.75,21.0545455 18.75,20.7272727 L18.75,18.3272727 C18.75,18 18.525,17.7818182 18.1875,17.7818182 Z M17.625,20.1818182 L16.275,20.1818182 L16.275,18.8727273 L17.625,18.8727273 L17.625,20.1818182 Z M13.2375,8.72727273 L10.7625,8.72727273 C10.425,8.72727273 10.2,8.94545455 10.2,9.27272727 L10.2,11.6727273 C10.2,12 10.425,12.2181818 10.7625,12.2181818 L13.2375,12.2181818 C13.575,12.2181818 13.8,12 13.8,11.6727273 L13.8,9.27272727 C13.8,8.94545455 13.575,8.72727273 13.2375,8.72727273 Z M12.675,11.1272727 L11.325,11.1272727 L11.325,9.81818182 L12.675,9.81818182 L12.675,11.1272727 Z M13.2375,17.7818182 L10.7625,17.7818182 C10.425,17.7818182 10.2,18 10.2,18.3272727 L10.2,20.7272727 C10.2,21.0545455 10.425,21.2727273 10.7625,21.2727273 L13.2375,21.2727273 C13.575,21.2727273 13.8,21.0545455 13.8,20.7272727 L13.8,18.3272727 C13.8,18 13.575,17.7818182 13.2375,17.7818182 Z M12.675,20.1818182 L11.325,20.1818182 L11.325,18.8727273 L12.675,18.8727273 L12.675,20.1818182 Z M8.2875,8.72727273 L5.8125,8.72727273 C5.475,8.72727273 5.25,8.94545455 5.25,9.27272727 L5.25,11.6727273 C5.25,12 5.475,12.2181818 5.8125,12.2181818 L8.2875,12.2181818 C8.625,12.2181818 8.85,12 8.85,11.6727273 L8.85,9.27272727 C8.85,8.94545455 8.625,8.72727273 8.2875,8.72727273 Z M7.725,11.1272727 L6.375,11.1272727 L6.375,9.81818182 L7.725,9.81818182 L7.725,11.1272727 Z M8.2875,17.7818182 L5.8125,17.7818182 C5.475,17.7818182 5.25,18 5.25,18.3272727 L5.25,20.7272727 C5.25,21.0545455 5.475,21.2727273 5.8125,21.2727273 L8.2875,21.2727273 C8.625,21.2727273 8.85,21.0545455 8.85,20.7272727 L8.85,18.3272727 C8.85,18 8.625,17.7818182 8.2875,17.7818182 Z M7.725,20.1818182 L6.375,20.1818182 L6.375,18.8727273 L7.725,18.8727273 L7.725,20.1818182 Z M5.8125,7.63636364 L18.1875,7.63636364 C18.525,7.63636364 18.75,7.41818182 18.75,7.09090909 L18.75,2.72727273 C18.75,2.4 18.525,2.18181818 18.1875,2.18181818 L5.8125,2.18181818 C5.475,2.18181818 5.25,2.4 5.25,2.72727273 L5.25,7.09090909 C5.25,7.41818182 5.475,7.63636364 5.8125,7.63636364 Z M6.375,3.27272727 L17.625,3.27272727 L17.625,6.54545455 L6.375,6.54545455 L6.375,3.27272727 Z M8.2875,13.3090909 L5.8125,13.3090909 C5.475,13.3090909 5.25,13.5272727 5.25,13.8545455 L5.25,16.2545455 C5.25,16.5818182 5.475,16.8 5.8125,16.8 L8.2875,16.8 C8.625,16.8 8.85,16.5818182 8.85,16.2545455 L8.85,13.8545455 C8.85,13.5272727 8.625,13.3090909 8.2875,13.3090909 Z M7.725,15.7090909 L6.375,15.7090909 L6.375,14.4 L7.725,14.4 L7.725,15.7090909 Z M18.1875,8.72727273 L15.7125,8.72727273 C15.375,8.72727273 15.15,8.94545455 15.15,9.27272727 L15.15,11.6727273 C15.15,12 15.375,12.2181818 15.7125,12.2181818 L18.1875,12.2181818 C18.525,12.2181818 18.75,12 18.75,11.6727273 L18.75,9.27272727 C18.75,8.94545455 18.525,8.72727273 18.1875,8.72727273 Z M17.625,11.1272727 L16.275,11.1272727 L16.275,9.81818182 L17.625,9.81818182 L17.625,11.1272727 Z M18.3,0 L5.7,0 C4.8,0 3,0.436363636 3,2.29090909 L3,21.7090909 C3,22.3636364 3.45,24 5.7,24 L18.3,24 C19.2,24 21,23.5636364 21,21.7090909 L21,2.29090909 C21,1.63636364 20.55,0 18.3,0 Z M19.875,21.7090909 C19.875,22.9090909 18.525,22.9090909 18.3,22.9090909 L5.7,22.9090909 C4.2375,22.9090909 4.125,21.9272727 4.125,21.7090909 L4.125,2.29090909 C4.125,1.09090909 5.475,1.09090909 5.7,1.09090909 L18.3,1.09090909 C19.7625,1.09090909 19.875,2.07272727 19.875,2.29090909 L19.875,21.7090909 Z M18.1875,13.3090909 L15.7125,13.3090909 C15.375,13.3090909 15.15,13.5272727 15.15,13.8545455 L15.15,16.2545455 C15.15,16.5818182 15.375,16.8 15.7125,16.8 L18.1875,16.8 C18.525,16.8 18.75,16.5818182 18.75,16.2545455 L18.75,13.8545455 C18.75,13.5272727 18.525,13.3090909 18.1875,13.3090909 Z M17.625,15.7090909 L16.275,15.7090909 L16.275,14.4 L17.625,14.4 L17.625,15.7090909 Z M13.2375,13.3090909 L10.7625,13.3090909 C10.425,13.3090909 10.2,13.5272727 10.2,13.8545455 L10.2,16.2545455 C10.2,16.5818182 10.425,16.8 10.7625,16.8 L13.2375,16.8 C13.575,16.8 13.8,16.5818182 13.8,16.2545455 L13.8,13.8545455 C13.8,13.5272727 13.575,13.3090909 13.2375,13.3090909 Z M12.675,15.7090909 L11.325,15.7090909 L11.325,14.4 L12.675,14.4 L12.675,15.7090909 Z"/></svg>;

const FixedResourceSearchDocumentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconSearchDocument" aria-describedby="descIconSearchDocument" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconSearchDocument">Search Document</title><desc id="descIconSearchDocument">Search Document</desc>  <path fillRule="evenodd" d="M21.4,22.3636364 L21.4,1.63636364 C21.4,1.33527273 21.13,1.09090909 20.8,1.09090909 L2.8,1.09090909 C2.47,1.09090909 2.2,1.33527273 2.2,1.63636364 L2.2,22.3636364 C2.2,22.6647273 2.47,22.9090909 2.8,22.9090909 L20.8,22.9090909 C21.13,22.9090909 21.4,22.6647273 21.4,22.3636364 Z M20.8,0 C21.7924,0 22.6,0.734181818 22.6,1.63636364 L22.6,22.3636364 C22.6,23.2658182 21.7924,24 20.8,24 L2.8,24 C1.8076,24 1,23.2658182 1,22.3636364 L1,1.63636364 C1,0.734181818 1.8076,0 2.8,0 L20.8,0 Z M18.4,3.27272727 C18.7312,3.27272727 19,3.51709091 19,3.81818182 C19,4.11927273 18.7312,4.36363636 18.4,4.36363636 L5.2,4.36363636 C4.8688,4.36363636 4.6,4.11927273 4.6,3.81818182 C4.6,3.51709091 4.8688,3.27272727 5.2,3.27272727 L18.4,3.27272727 Z M18.4,6.54545455 C18.7312,6.54545455 19,6.78981818 19,7.09090909 C19,7.392 18.7312,7.63636364 18.4,7.63636364 L5.2,7.63636364 C4.8688,7.63636364 4.6,7.392 4.6,7.09090909 C4.6,6.78981818 4.8688,6.54545455 5.2,6.54545455 L18.4,6.54545455 Z M7,14.7392727 C7,16.8556364 8.8936,18.5781818 11.2228,18.5781818 C13.5496,18.5781818 15.4432,16.8556364 15.4432,14.7392727 C15.4432,12.6229091 13.5496,10.9014545 11.2228,10.9014545 C8.8936,10.9014545 7,12.6229091 7,14.7392727 Z M15.4288,17.8090909 L17.6248,19.8043636 C17.8588,20.0170909 17.8588,20.3629091 17.6248,20.5756364 C17.5072,20.6825455 17.3536,20.736 17.2,20.736 C17.0464,20.736 16.8928,20.6825455 16.7752,20.5756364 L14.5792,18.5792727 C13.6528,19.2501818 12.496,19.6690909 11.2228,19.6690909 C8.2324,19.6690909 5.8,17.4578182 5.8,14.7392727 C5.8,12.0218182 8.2324,9.81054545 11.2228,9.81054545 C14.212,9.81054545 16.6432,12.0218182 16.6432,14.7392727 C16.6432,15.9054545 16.1764,16.9647273 15.4288,17.8090909 Z"/></svg>;

const FixedResourceArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleIconArrowRight" aria-describedby="descIconArrowRight" focusable="true" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id="titleIconArrowRight">Right</title><desc id="descIconArrowRight">Right</desc><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg>;

/** AA5 source resources keep their native headings at H2. */
export const FixedProductResourcesH2 = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const sourceIcons = [FixedResourceStocksIcon, FixedResourceCalculatorIcon, FixedResourceSearchDocumentIcon];
  const spacing = rowSpacing(params);
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row match-height-row${spacing ? ` ${spacing}` : ''}`}>
        {cards.map((card, cardIndex) => {
          const Icon = sourceIcons[cardIndex];
          const links = (card.links?.targetItems ?? [])
            .filter(item => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {Icon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Icon /></div></div>}
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={card.heading?.jsonValue} />}</div>
                    <div className="tileSubHeading" />
                  </header>
                  <div className="tileBody u-font-size-md" />
                  {links.length > 0 && <footer>{links.map(item => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    const download = /\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '');
                    return <div className="tileLink" key={item.id}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{download ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span>
                        <span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Fixed product Features retain the source introduction header and its native heading. */
export const FixedProductFeatures = (props: AllianzCardGridProps) => <AllianzCardGrid {...props} sourceFeaturesIntroduction />;


type RilaCardRole = 'benefits' | 'accumulation' | 'income' | 'support';

/** The current RILA source has four finite tile rows. These named variants
 * retain native fields and ordered children; decorative source glyphs are
 * presentation only, with no invented Icon fields or authoring metadata. */
function SourceRilaCards({ fields, params, role }: AllianzCardGridProps & { role: RilaCardRole }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const isProduct = role === 'accumulation' || role === 'income';
  const theme = role === 'benefits' ? 'transparent' : role === 'support' ? 'green-soft' : 'blue-soft';
  const column = role === 'accumulation' || role === 'support' ? '6' : '4';
  const row = role === 'benefits' || role === 'income' ? ' match-height-row' : role === 'support' ? ' u-padding-top-xl' : '';
  return <div className={`l-container--full-width t-bg-${theme} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row${row}`}>
        {cards.map((card, index) => {
          const glyph = role === 'benefits' ? (['Shield', 'GraphVariableUp', 'Shapes'] as const)[index]
            : role === 'support' ? (['QuestionMark', 'Information'] as const)[index] : undefined;
          const margin = role === 'income' || (role === 'accumulation' && index === 0) || (role === 'support' && index === 1) ? ' u-margin-bottom-xl' : '';
          const links = card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link }];
          const activeLinks = links.filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className={`l-grid__column-medium-${column}`}>
            <article className={`m-axlTile match-height${isProduct ? ' -is--flipped tile--stackedImage' : ''} -is--stacked ${role === 'benefits' ? 't-bg-transparent' : 't-bg-primary-white'}${margin}`}>
              <div className={`tileContent ${isProduct ? 'u-text-left' : 'u-text-center'}`}>
                {glyph && <div className="tileSubGrid__image"><div className={`tileIcon ${role === 'support' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}><RilaSourceGlyph glyph={glyph} /></div></div>}
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div>
                    {shouldRenderTextField(card.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
                  </header>
                  {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                  {activeLinks.length > 0 && <footer>{activeLinks.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    return <div className="tileLink" key={item.id ?? linkIndex}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span><span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
              {isProduct && shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} sizes="100vw" className="c-image__img c-teaser__image-img" /></picture></div>}
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

export const RilaBenefits = (props: AllianzCardGridProps) => <SourceRilaCards {...props} role="benefits" />;
export const RilaAccumulationProducts = (props: AllianzCardGridProps) => <SourceRilaCards {...props} role="accumulation" />;
export const RilaIncomeProducts = (props: AllianzCardGridProps) => <SourceRilaCards {...props} role="income" />;
export const RilaSupport = (props: AllianzCardGridProps) => <SourceRilaCards {...props} role="support" />;

/** Source paths are exact; adjacent labels convey their meaning accessibly. */
const RilaSourceGlyph = ({ glyph }: { glyph: 'Shield' | 'GraphVariableUp' | 'Shapes' | 'QuestionMark' | 'Information' }) => {
  switch (glyph) {
    case 'Shield': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M20.5,4 C15.9,4 12.4,0.2 12.4,0.2 C12.3,0.1 12.1,0 12,0 C11.9,0 11.7,0.1 11.6,0.2 C11.6,0.2 8,4 3.5,4 C3.2,4 3,4.2 3,4.5 L3,11.5 C3,18.1 11.4,23.7 11.7,24 C11.8,24 11.9,24 12,24 C12.1,24 12.2,24 12.3,23.9 C12.7,23.7 21,18 21,11.4 L21,4.4 C21,4.2 20.8,4 20.5,4 Z M20,11.5 C20,16.9 13.4,21.9 12,22.9 C10.6,21.9 4,16.9 4,11.5 L4,5 C7.9,4.8 11,2.2 12,1.2 C13,2.2 16.1,4.8 20,5 L20,11.5 Z" /></svg>;
    case 'GraphVariableUp': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M0.545454545,22 C0.244363636,22 0,21.7511111 0,21.4444444 L0,2.55555556 C0,2.24888889 0.244363636,2 0.545454545,2 C0.846545455,2 1.09090909,2.24888889 1.09090909,2.55555556 L1.09090909,20.8888889 L23.4545455,20.8888889 C23.7556364,20.8888889 24,21.1377778 24,21.4444444 C24,21.7511111 23.7556364,22 23.4545455,22 L0.545454545,22 Z M18.705,8.82916667 C18.9177273,8.6125 19.2635455,8.6125 19.4762727,8.82916667 C19.689,9.04583333 19.689,9.39805556 19.4762727,9.61472222 L14.0217273,15.1702778 C13.8286364,15.3669444 13.5242727,15.3880556 13.3093636,15.2213889 L9.32318182,12.1780556 L5.29445455,16.2813889 C5.18754545,16.3902778 5.04790909,16.4447222 4.90936364,16.4447222 C4.76972727,16.4447222 4.63009091,16.3902778 4.52318182,16.2813889 C4.31045455,16.0647222 4.31045455,15.7125 4.52318182,15.4958333 L8.88681818,11.0513889 C9.07772727,10.8547222 9.38209091,10.8336111 9.59918182,11.0002778 L13.5853636,14.0436111 L18.705,8.82916667 Z" /></svg>;
    case 'Shapes': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12.0002739,10.8571429 C14.4067644,10.8571429 16.3638106,8.89228571 16.3638106,6.47619048 C16.3638106,4.06009524 14.4067644,2.0952381 12.0002739,2.0952381 C9.59378332,2.0952381 7.63673708,4.06009524 7.63673708,6.47619048 C7.63673708,8.89228571 9.59378332,10.8571429 12.0002739,10.8571429 Z M17.4546948,6.47619048 C17.4546948,9.4957619 15.0078416,11.952381 12.0002739,11.952381 C8.99270613,11.952381 6.54585288,9.4957619 6.54585288,6.47619048 C6.54585288,3.45661905 8.99270613,1 12.0002739,1 C15.0078416,1 17.4546948,3.45661905 17.4546948,6.47619048 Z M15.2729264,22.9047619 L22.9091158,22.9047619 L22.9091158,15.2380952 L15.2729264,15.2380952 L15.2729264,22.9047619 Z M23.4545579,14.1428571 C23.7556419,14.1428571 24,14.3881905 24,14.6904762 L24,23.452381 C24,23.7546667 23.7556419,24 23.4545579,24 L14.7274843,24 C14.4264003,24 14.1820422,23.7546667 14.1820422,23.452381 L14.1820422,14.6904762 C14.1820422,14.3881905 14.4264003,14.1428571 14.7274843,14.1428571 L23.4545579,14.1428571 Z M1.49505906,22.9047619 L9.96032041,22.9047619 L5.72768974,15.6203333 L1.49505906,22.9047619 Z M11.3817425,23.7250952 C11.2857447,23.8948571 11.1046579,24 10.9093897,24 L0.545989812,24 C0.350721541,24 0.169634765,23.8948571 0.0725460717,23.7250952 C-0.0245426217,23.5553333 -0.0245426217,23.3461429 0.0747278401,23.176381 L5.25642777,14.2578571 C5.45060515,13.9205238 6.00477432,13.9205238 6.19895171,14.2578571 L11.3806516,23.176381 C11.4788312,23.3461429 11.4788312,23.5553333 11.3817425,23.7250952 Z" /></svg>;
    case 'QuestionMark': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fillRule="evenodd" d="M10.7502702,18 C12.4602702,18 13.7502702,19.29 13.7502702,21.001 C13.7502702,22.711 12.4602702,24 10.7502702,24 C9.04027025,24 7.75027025,22.711 7.75027025,21.001 C7.75027025,19.29 9.04027025,18 10.7502702,18 Z M11.6092702,0 C16.3612702,0 19.5542702,2.779 19.5542702,6.913 C19.5542702,10.393 17.3422702,11.91 15.5642702,13.129 C14.1932702,14.069 13.1102702,14.812 13.1102702,16.162 L13.1102702,16.5 C13.1102702,16.777 12.8872702,17 12.6102702,17 L9.03827025,17 C8.76227025,17 8.53827025,16.777 8.53827025,16.5 L8.53827025,16.162 C8.53827025,12.975 10.6632702,11.447 12.3702702,10.219 C13.6992702,9.263 14.8482702,8.437 14.8482702,7.082 C14.8482702,5.54 13.4452702,4.544 11.2742702,4.544 C9.61627025,4.544 8.06227025,5.1 6.89527025,6.11 C6.76927025,6.22 6.59627025,6.255 6.43627025,6.214 C6.27427025,6.169 6.14527025,6.047 6.09427025,5.888 L5.02527025,2.648 C4.96027025,2.451 5.02327025,2.236 5.18427025,2.105 C6.84527025,0.747 9.12627025,0 11.6092702,0 Z" /></svg>;
    case 'Information': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M14,8 C14.3,8 14.5,8.2 14.5,8.5 L14.5,23.5 C14.5,23.8 14.3,24 14,24 L10,24 C9.7,24 9.5,23.8 9.5,23.5 L9.5,8.5 C9.5,8.2 9.7,8 10,8 L14,8 Z M12,6 C10.3,6 9,4.7 9,3 C9,1.3 10.3,0 12,0 C13.7,0 15,1.3 15,3 C15,4.7 13.7,6 12,6 Z" /></svg>;
  }
};


/** Source FIA teaser keeps its sixth native DAM image and the existing helper. */
export const RilaFiaPromotion = (props: AllianzCardGridProps) => {
  const fixedParams: AllianzCardGridProps['params'] = { ...props.params, sectionSpacing: '0', introSpacer: '0',
    theme: 'green-soft', layout: 'image-right', splitRatio: '67:33', columns: '1',
    alignment: 'left', headingLevel: 'h3', bodySize: 'large', framed: '1',
    tileMarginBottom: 'xl', matchHeightRow: '1', flipped: '1', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'none', marginBottom: 'none' };
  for (const key of ['container', 'sectionWidth', 'sourceWidth', 'linkLayout', 'emptyLink']) delete fixedParams[key];
  return <EditorialCards {...props} appearance="tiles" sourceArrows params={fixedParams} />;
};


import { IapSourceGlyph } from './iap-source-glyphs.props';

/** Two finite Index Advantage+ tile rows retain their ordered native fields.
 * Source-only icons are decorative; Login keeps its received disabled link. */
function SourceIapCards({ fields, params, support = false, headingLevel = 'h4' }:
  AllianzCardGridProps & { support?: boolean; headingLevel?: 'h2' | 'h3' | 'h4' }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className={`l-container--full-width t-bg-${support ? 'green-soft' : 'grey-soft'} axlTileCollection ${support ? 'allianz-iap-support' : 'allianz-iap-contract-tools'}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className={`l-grid__row match-height-row${support ? ' u-padding-bottom-xl' : ''}`}>
        {cards.map((card, index) => {
          const glyph = support ? (['Phone', 'User', 'QuestionMark'] as const)[index]
            : (['Laptop', 'LightBulb', 'Calculator'] as const)[index];
          const links = card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link }];
          const activeLinks = links.filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {glyph && <div className="tileSubGrid__image"><div className={`tileIcon ${support ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}><IapSourceGlyph glyph={glyph} /></div></div>}
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingLevel} field={card.heading?.jsonValue} />}</div>
                    {shouldRenderTextField(card.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
                  </header>
                  {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                  {activeLinks.length > 0 && <footer>{activeLinks.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    return <div className="tileLink" key={item.id ?? linkIndex}><Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true"><EditorialResourceArrow /></span><span className="a-link__text">{field.value?.text}</span>
                    </Link></div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

export const IapContractTools = (props: AllianzCardGridProps) => <SourceIapCards {...props} />;
export const IapSupport = (props: AllianzCardGridProps) => <SourceIapCards {...props} support />;

/** NF keeps the same native cards and link policies with its source heading levels. */
export const NfContractTools = (props: AllianzCardGridProps) => <SourceIapCards {...props} headingLevel="h2" />;
export const NfSupport = (props: AllianzCardGridProps) => <SourceIapCards {...props} support headingLevel="h3" />;


import { useId as useClassicGlyphId } from 'react';

/** Classic resources reuse the accepted native H2 cards and ordered SDK links.
 * Their source row has bottom padding only; no native spacing parameters exist. */
export const ClassicProductResources = (props: AllianzCardGridProps) => {
  const fixedParams: AllianzCardGridProps['params'] = { theme: 'grey-soft', spacing: 'none',
    paddingTop: 'none', paddingBottom: 'xl', marginBottom: 'none' };
  if (props.params?.RenderingIdentifier !== undefined) fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  return <FixedProductResourcesH2 {...props} params={fixedParams} />;
};

/** Classic Features owns its finite List introduction and three source tiles.
 * Complete native headings, bodies and General Link fields remain received. */
export const ClassicProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection allianz-classic-product-features" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg">
        <div className="l-grid__column-medium-12">
          <article className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center">
              <div className="tileIcon t-bg-transparent t-icon-primary-black"><ClassicSourceListGlyph /></div>
              <header>
                <div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div>
                {shouldRenderTextField(data.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
              </header>
              {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />}
            </div>
          </article>
        </div>
      </div>
      <div className="l-grid__row match-height-row u-margin-bottom-xl">
        {cards.map((card) => {
          const links = card.links?.targetItems ?? [{ id: `${card.id}-link`, link: card.link }];
          const activeLinks = links.filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left">
                <div className="tileSubGrid__content">
                  <header>
                    <div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div>
                    {shouldRenderTextField(card.subheading?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /> : <div className="tileSubHeading" />}
                  </header>
                  {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                  {activeLinks.length > 0 && <footer>{activeLinks.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    const download = /\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '');
                    return <div className="tileLink" key={item.id ?? linkIndex}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{download ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Source glyph paths and captions are decorative, with no invented Image field. */
const ClassicSourceListGlyph = () => {
  const instanceId = useClassicGlyphId();
  return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><title id={`${instanceId}-classic-list-title`}>List</title><desc id={`${instanceId}-classic-list-description`}>List</desc><path d="M20.0714286,0 L3.64285714,0 C2.76666667,0 2,0.763636364 2,1.63636364 L2,22.3636364 C2,23.2363636 2.76666667,24 3.64285714,24 L20.0714286,24 C20.947619,24 21.7142857,23.2363636 21.7142857,22.3636364 L21.7142857,1.63636364 C21.7142857,0.763636364 20.947619,0 20.0714286,0 Z M20.8571429,22.5857143 C20.8571429,22.92 20.6321429,23.1428571 20.2946429,23.1428571 L3.41964286,23.1428571 C3.08214286,23.1428571 2.85714286,22.92 2.85714286,22.5857143 L2.85714286,1.41428571 C2.85714286,1.08 3.08214286,0.857142857 3.41964286,0.857142857 L20.2946429,0.857142857 C20.6321429,0.857142857 20.8571429,1.08 20.8571429,1.41428571 L20.8571429,22.5857143 Z M7.14285714,4.28571429 C6.22857143,4.28571429 5.42857143,5.08571429 5.42857143,6 C5.42857143,6.91428571 6.22857143,7.71428571 7.14285714,7.71428571 C8.05714286,7.71428571 8.85714286,6.91428571 8.85714286,6 C8.85714286,5.08571429 8.05714286,4.28571429 7.14285714,4.28571429 Z M7.14285714,6.85714286 C6.62857143,6.85714286 6.28571429,6.51428571 6.28571429,6 C6.28571429,5.48571429 6.62857143,5.14285714 7.14285714,5.14285714 C7.65714286,5.14285714 8,5.48571429 8,6 C8,6.51428571 7.65714286,6.85714286 7.14285714,6.85714286 Z M7.14285714,9.42857143 C6.22857143,9.42857143 5.42857143,10.2285714 5.42857143,11.1428571 C5.42857143,12.0571429 6.22857143,12.8571429 7.14285714,12.8571429 C8.05714286,12.8571429 8.85714286,12.0571429 8.85714286,11.1428571 C8.85714286,10.2285714 8.05714286,9.42857143 7.14285714,9.42857143 Z M7.14285714,12 C6.62857143,12 6.28571429,11.6571429 6.28571429,11.1428571 C6.28571429,10.6285714 6.62857143,10.2857143 7.14285714,10.2857143 C7.65714286,10.2857143 8,10.6285714 8,11.1428571 C8,11.6571429 7.65714286,12 7.14285714,12 Z M7.14285714,15.4285714 C6.22857143,15.4285714 5.42857143,16.2285714 5.42857143,17.1428571 C5.42857143,18.0571429 6.22857143,18.8571429 7.14285714,18.8571429 C8.05714286,18.8571429 8.85714286,18.0571429 8.85714286,17.1428571 C8.85714286,16.2285714 8.05714286,15.4285714 7.14285714,15.4285714 Z M7.14285714,18 C6.62857143,18 6.28571429,17.6571429 6.28571429,17.1428571 C6.28571429,16.6285714 6.62857143,16.2857143 7.14285714,16.2857143 C7.65714286,16.2857143 8,16.6285714 8,17.1428571 C8,17.6571429 7.65714286,18 7.14285714,18 Z M18.5918367,5.14285714 C18.922449,5.14285714 19.1428571,5.31428571 19.1428571,5.57142857 C19.1428571,5.82857143 18.922449,6 18.5918367,6 L11.9795918,6 C11.6489796,6 11.4285714,5.82857143 11.4285714,5.57142857 C11.4285714,5.31428571 11.6489796,5.14285714 11.9795918,5.14285714 L18.5918367,5.14285714 Z M18.5918367,12 C18.922449,12 19.1428571,12.1714286 19.1428571,12.4285714 C19.1428571,12.6857143 18.922449,12.8571429 18.5918367,12.8571429 L11.9795918,12.8571429 C11.6489796,12.8571429 11.4285714,12.6857143 11.4285714,12.4285714 C11.4285714,12.1714286 11.6489796,12 11.9795918,12 L18.5918367,12 Z M18.5918367,17.1428571 C18.922449,17.1428571 19.1428571,17.3142857 19.1428571,17.5714286 C19.1428571,17.8285714 18.922449,18 18.5918367,18 L11.9795918,18 C11.6489796,18 11.4285714,17.8285714 11.4285714,17.5714286 C11.4285714,17.3142857 11.6489796,17.1428571 11.9795918,17.1428571 L18.5918367,17.1428571 Z" /></svg>;
};

/** Classic question cards retain the native unavailable Login field and other
 * current destinations; their green card row has no additional source spacing. */
export const ClassicQuestions = (props: AllianzCardGridProps) => {
  const fixedParams: AllianzCardGridProps['params'] = { theme: 'green-soft', layout: 'cards', columns: '3',
    alignment: 'center', headingLevel: 'h4', spacing: 'none', paddingTop: 'none',
    paddingBottom: 'none', marginBottom: 'none' };
  if (props.params?.RenderingIdentifier !== undefined) fixedParams.RenderingIdentifier = props.params.RenderingIdentifier;
  return <Default {...props} params={fixedParams} />;
};

/** AA5 Features owns only its source heading, card copy and ordered actions.
 * Normalize native field collections without exposing inherited empty slots. */
export const AA5Features = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const spacing = rowSpacing({ spacing: 'none', paddingTop: 'none', paddingBottom: 'xl', marginBottom: 'none' });
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <header><div className="tileHeading"><h2><Text editable={isEditing} field={data.heading?.jsonValue} /><br /></h2></div><div className="tileSubHeading" /></header>
      </div></article></div></div>}
      <div className={`l-grid__row match-height-row ${spacing}`}>
        {cards.map((card) => {
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height t-bg-grey-soft -is--stacked ">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer><div className="tileLink">{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'];
                  const linkKey = item.id ?? (field as typeof field & { metadata?: { itemId?: string } }).metadata?.itemId ?? linkIndex;
                  return <Link editable={isEditing} field={field} key={linkKey} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                    <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg>}</span><span className="a-link__text">{item.link?.jsonValue?.value?.text}</span>
                  </Link>;
                })}</div></footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** AA5 questions retain independently editable copy when their link is cleared.
 * The introduction and inherited optional media belong to other contracts. */
export const AA5Questions = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row  "><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {cards.map((card) => {
          const nativeLink = card.link?.jsonValue;
          const content = <><div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>{shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />}</>;
          if (nativeLink?.value?.href) return <Link key={card.id} editable={isEditing} field={allianzLinkField(nativeLink, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>;
          return <div key={card.id} className="m-card">{isEditing && nativeLink && <Link editable={isEditing} field={nativeLink} />}{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
};

/** AAPlus resources own three H3 headings and four ordered native actions.
 * Empty copy and glyph wrappers are source presentation, with no SDK slots. */
export const AAPlusProductResources = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const sourceIcons = [FixedResourceStocksIcon, FixedResourceCalculatorIcon, FixedResourceSearchDocumentIcon];
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-padding-bottom-xl">
        {cards.map((card, cardIndex) => {
          const Icon = sourceIcons[cardIndex];
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {Icon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Icon /></div></div>}
                <div className="tileSubGrid__content">
                  <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                  <div className="tileBody u-font-size-md" />
                  {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    return <div className="tileLink" key={item.id ?? linkIndex}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** The two AAPlus feature sections have explicit finite selectors. The first
 * keeps its heading editable when cleared; the continuation owns no heading. */
function AAPlusFeatureRow({ fields, params, continuation }: AllianzCardGridProps & { continuation: boolean }) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-primary-white axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {!continuation && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black"><ClassicSourceListGlyph /></div>
        <header><div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <h2><Text editable={isEditing} field={data.heading?.jsonValue} />{'\u00a0'}</h2>}</div><div className="tileSubHeading" /></header>
      </div></article></div></div>}
      <div className={`l-grid__row match-height-row${continuation ? ' u-margin-bottom-xl' : ''}`}>
        {cards.map((card) => {
          const links = continuation ? (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) : [];
          return <div key={card.id} className="l-grid__column-medium-6">
            <article className={`m-axlTile match-height -is--stacked t-bg-grey-soft${continuation ? '' : ' u-margin-bottom-xl'}`}>
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
}

export const AAPlusProductFeatures = (props: AllianzCardGridProps) => <AAPlusFeatureRow {...props} continuation={false} />;
export const AAPlusProductFeaturesContinuation = (props: AllianzCardGridProps) => <AAPlusFeatureRow {...props} continuation />;

/** Same finite green H4 question design; native AAPlus copy and links are received. */
export const AAPlusQuestions = (props: AllianzCardGridProps) => <AA5Questions {...props} />;

/** The Benefit Control+ source uses the same finite H3 resource design. */
export const BenefitControlPlusProductResources = (props: AllianzCardGridProps) => <AAPlusProductResources {...props} />;

/** Benefit Control+ owns a single three-card feature row and List introduction.
 * Its spacing and empty wrappers are presentation, not optional SDK fields. */
export const BenefitControlPlusProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black"><ClassicSourceListGlyph /></div>
        <header><div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
      </div></article></div></div>
      <div className="l-grid__row match-height-row">
        {cards.map((card) => {
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Whole-card questions keep their own copy editable when a native link clears.
 * The source introduction is a separate rendering; this row matches card height. */
export const BenefitControlPlusQuestions = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {cards.map((card) => {
          const nativeLink = card.link?.jsonValue;
          const content = <><div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>{shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />}</>;
          if (nativeLink?.value?.href) return <Link key={card.id} editable={isEditing} field={allianzLinkField(nativeLink, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>;
          return <div key={card.id} className="m-card">{isEditing && nativeLink && <Link editable={isEditing} field={nativeLink} />}{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
};


/** Essential Income 7 resources own only three H3 headings and their ordered links.
 * The captured glyphs and empty wrappers are presentation, without SDK slots. */
export const EssentialIncome7ProductResources = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const sourceIcons = [FixedResourceStocksIcon, FixedResourceCalculatorIcon, FixedResourceSearchDocumentIcon];
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-padding-bottom-xl">
        {cards.map((card, cardIndex) => {
          const Icon = sourceIcons[cardIndex];
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {Icon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Icon /></div></div>}
                <div className="tileSubGrid__content">
                  <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                  <div className="tileBody u-font-size-md" />
                  {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    return <div className="tileLink" key={item.id ?? linkIndex}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Essential Income 7 keeps its List introduction and complete two-card feature row.
 * Only the second card owns the ordered MVA action; source-absent fields stay excluded. */
export const EssentialIncome7ProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-primary-white axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center">
        <div className="tileIcon t-bg-transparent t-icon-primary-black"><ClassicSourceListGlyph /></div>
        <header><div className="tileHeading">{shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
      </div></article></div></div>
      <div className="l-grid__row match-height-row u-margin-bottom-xl">
        {cards.map((card, cardIndex) => {
          const links = cardIndex === 1 ? (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) : [];
          return <div key={card.id} className="l-grid__column-medium-6">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Essential Income 7 source questions have a plain green row with H4 whole-card links.
 * Clearing a native link keeps its independently authored heading and body visible. */
export const EssentialIncome7Questions = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {cards.map((card) => {
          const nativeLink = card.link?.jsonValue;
          const content = <><div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>{shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />}</>;
          if (nativeLink?.value?.href) return <Link key={card.id} editable={isEditing} field={allianzLinkField(nativeLink, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>;
          return <div key={card.id} className="m-card">{isEditing && nativeLink && <Link editable={isEditing} field={nativeLink} />}{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
};


/** RFA resources share the proven source H3, glyph and ordered-link grammar. */
export const RetirementFoundationAdvProductResources = (props: AllianzCardGridProps) => <EssentialIncome7ProductResources {...props} />;

/** Only the original four children own feature copy; the heading belongs to a
 * separate native introduction. The final tile alone owns the source action. */
export const RetirementFoundationAdvProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width u-row-spacing t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-margin-bottom-xl">
        {cards.map((card, cardIndex) => {
          const links = cardIndex === 3 ? (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) : [];
          return <div key={card.id} className="l-grid__column-medium-3">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true"><FixedResourceArrowIcon /></span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Source questions use a plain row with XL padding and complete native owners. */
export const RetirementFoundationAdvQuestions = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-padding-bottom-xl"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {cards.map((card) => {
          const nativeLink = card.link?.jsonValue;
          const content = <><div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>{shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />}</>;
          if (nativeLink?.value?.href) return <Link key={card.id} editable={isEditing} field={allianzLinkField(nativeLink, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>;
          return <div key={card.id} className="m-card">{isEditing && nativeLink && <Link editable={isEditing} field={nativeLink} />}{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
};


/** Core resources keep three native H3/link owners and both source bottom spacings. */
export const CoreIncome7ProductResources = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  const sourceIcons = [FixedResourceStocksIcon, FixedResourceCalculatorIcon, FixedResourceSearchDocumentIcon];
  return <div className="l-container--full-width t-bg-grey-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-margin-bottom-xl u-padding-bottom-xl">
        {cards.map((card, cardIndex) => {
          const Icon = sourceIcons[cardIndex];
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-primary-white">
              <div className="tileContent u-text-center">
                {Icon && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><Icon /></div></div>}
                <div className="tileSubGrid__content">
                  <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                  <div className="tileBody u-font-size-md" />
                  {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                    const field = allianzLinkField(item.link?.jsonValue, isEditing);
                    const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                    const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                    return <div className="tileLink" key={item.id ?? linkIndex}>
                      <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                        <span className="a-link__icon" aria-hidden="true">{/\.pdf(?:[?#]|$)/i.test(field.value?.href ?? '') ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                      </Link>
                    </div>;
                  })}</footer>}
                </div>
              </div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** Three native Core feature tiles retain all ordered links and source arrow glyphs. */
export const CoreIncome7ProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-padding-bottom-xl">
        {cards.map((card) => {
          const links = (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing));
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true"><FixedResourceArrowIcon /></span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

export const CoreIncome7Questions = (props: AllianzCardGridProps) => <EssentialIncome7Questions {...props} />;


/** 222+ feature copy belongs to four original children; the separate native
 * introduction owns its H2/List glyph. Only the source second/fourth tiles
 * own actions, and inherited group/media fields stay outside this role. */
export const Plus222ProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-margin-bottom-xl">
        {cards.map((card, cardIndex) => {
          const links = cardIndex === 1 || cardIndex === 3
            ? (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) : [];
          return <div key={card.id} className="l-grid__column-medium-3">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true">{cardIndex === 3 ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};


/** Three native 360 feature children own the H3/body fields. The separate
 * introduction owns its H2/List glyph; only the second/third children own
 * actions, whose Download/Right glyphs follow their source roles. */
export const Allianz360ProductFeatures = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row match-height-row u-padding-bottom-xl">
        {cards.map((card, cardIndex) => {
          const links = cardIndex === 1 || cardIndex === 2
            ? (card.links?.targetItems ?? []).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) : [];
          return <div key={card.id} className="l-grid__column-medium-4">
            <article className="m-axlTile match-height -is--stacked t-bg-grey-soft">
              <div className="tileContent u-text-left"><div className="tileSubGrid__content">
                <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
                {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
                {links.length > 0 && <footer>{links.map((item, linkIndex) => {
                  const field = allianzLinkField(item.link?.jsonValue, isEditing);
                  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
                  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
                  return <div className="tileLink" key={item.id ?? linkIndex}>
                    <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing} className="a-link" aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
                      <span className="a-link__icon" aria-hidden="true">{cardIndex === 1 ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span><span className="a-link__text">{field.value?.text}</span>
                    </Link>
                  </div>;
                })}</footer>}
              </div></div>
            </article>
          </div>;
        })}
      </div>
    </div>
  </div>;
};

/** 360 questions retain native H4 whole-card links and their source XL row
 * padding. Clearing a link preserves its independently authored copy. */
export const Allianz360Questions = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row u-padding-bottom-xl"><div className="l-grid__column-medium-12"><div className="o-cards o-cards__col3">
        {cards.map((card) => {
          const nativeLink = card.link?.jsonValue;
          const content = <><div className="m-card__header">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} />}</div>{shouldRenderTextField(card.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />}</>;
          if (nativeLink?.value?.href) return <Link key={card.id} editable={isEditing} field={allianzLinkField(nativeLink, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">{content}</Link>;
          return <div key={card.id} className="m-card">{isEditing && nativeLink && <Link editable={isEditing} field={nativeLink} />}{content}</div>;
        })}
      </div></div></div>
    </div>
  </div>;
};


/** Lifetime glyphs are finite decorative Source vectors. They do not populate
 * or replace the independently held native icon Image fields. */
const LifetimeIncomeSourceGlyph = ({ glyph }: { glyph: 'Presentation' | 'Collaborate' | 'Handshake' }) => {
  switch (glyph) {
    case 'Presentation': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g transform="translate(1 2)"><path d="M3.36283186 4.89L6.63716814 4.89C6.73105834 4.89268557 6.8220443 4.85309751 6.89009499 4.77995131 6.95814569 4.70680511 6.99768207 4.60609759 7 4.5 6.99768207 4.39390241 6.95814569 4.29319489 6.89009499 4.22004869 6.8220443 4.14690249 6.73105834 4.10731443 6.63716814 4.11L3.36283186 4.11C3.26894166 4.10731443 3.1779557 4.14690249 3.10990501 4.22004869 3.04185431 4.29319489 3.00231793 4.39390241 3 4.5 3.00231793 4.60609759 3.04185431 4.70680511 3.10990501 4.77995131 3.1779557 4.85309751 3.26894166 4.89268557 3.36283186 4.89L3.36283186 4.89zM9 6.5C8.99083648 6.28140961 8.83592341 6.10973947 8.64806867 6.11L3.35193133 6.11C3.26086186 6.10731443 3.17260939 6.14690249 3.10660314 6.22004869 3.04059689 6.29319489 3.0022483 6.39390241 3 6.5 3.0022483 6.60609759 3.04059689 6.70680511 3.10660314 6.77995131 3.17260939 6.85309751 3.26086186 6.89268557 3.35193133 6.89L8.64806867 6.89C8.73913814 6.89268557 8.82739061 6.85309751 8.89339686 6.77995131 8.95940311 6.70680511 8.9977517 6.60609759 9 6.5L9 6.5z" /><path d="M22,1.36861826 L11.3700851,1.36861826 L11.3700851,0.318861925 C11.3416845,0.135336037 11.1846075,0 11,0 C10.8153925,0 10.6583155,0.135336037 10.6299149,0.318861925 L10.6299149,1.36861826 L0,1.36861826 L0,16.0921237 L10.1126875,16.0921237 L5.65383056,20.3988164 C5.58677084,20.4631582 5.54882438,20.5523227 5.54882438,20.645554 C5.54882438,20.7387853 5.58677084,20.8279497 5.65383056,20.8922916 C5.72185715,20.9621286 5.815261,21.001015 5.91244426,20.9999799 C6.00923838,20.9990411 6.10192054,20.9604553 6.17105797,20.8922916 L10.6745034,16.5855989 L10.6745034,19.9502026 C10.7029041,20.1337284 10.859981,20.2690645 11.0445886,20.2690645 C11.2291961,20.2690645 11.386273,20.1337284 11.4146737,19.9502026 L11.4146737,16.5855989 L15.8735306,20.8922916 C15.942668,20.9604553 16.0353502,20.9990411 16.1321443,20.9999799 C16.2293276,21.001015 16.3227314,20.9621286 16.390758,20.8922916 C16.4578177,20.8279497 16.4957642,20.7387853 16.4957642,20.645554 C16.4957642,20.5523227 16.4578177,20.4631582 16.390758,20.3988164 L11.8873125,16.0921237 L22,16.0921237 L22,1.36861826 Z M21.2687475,15.3922862 L0.758005675,15.3922862 L0.758005675,2.07742809 L21.2687475,2.07742809 L21.2687475,15.3922862 Z" /><path d="M15.0454472,7.6748955 L16.7285289,7.6748955 L12.3149158,11.8855235 L9.26209221,8.97947042 C9.1156678,8.83426555 8.88031547,8.83426555 8.73389105,8.97947042 L4.10541652,13.4060281 C4.03809475,13.4705477 4,13.5599585 4,13.6534474 C4,13.7469364 4.03809475,13.8363472 4.10541652,13.9008668 C4.17572381,13.9667491 4.26894286,14.0022839 4.36504082,13.9998346 C4.46389229,14.0027392 4.5600646,13.9673008 4.63361768,13.9008668 L9.00246791,9.71723002 L12.0552915,12.6322802 C12.1246991,12.7006322 12.2177435,12.7393247 12.3149158,12.740245 C12.4151853,12.7416888 12.5118746,12.7028209 12.5834927,12.6322802 L17.2477775,8.17873133 L17.2477775,9.78920657 C17.2762891,9.97323957 17.4339799,10.1089496 17.6193088,10.1089496 C17.8046377,10.1089496 17.9623285,9.97323957 17.9908401,9.78920657 L17.9908401,7.32400984 C18.0030533,7.27986171 18.0030533,7.23320195 17.9908401,7.18905381 C17.9517191,7.10302702 17.881211,7.03538926 17.7938838,7.00011538 L17.6595953,7.00011538 L15.0454472,7.00011538 C14.9504642,6.99769915 14.8584192,7.0333168 14.7895764,7.09912694 C14.7207337,7.16493707 14.6807371,7.25554432 14.6783922,7.35100104 C14.6807371,7.44645777 14.7207337,7.53706502 14.7895764,7.60287515 C14.8584192,7.66868528 14.9504642,7.70430294 15.0454472,7.70188671 L15.0454472,7.6748955 Z" /></g></svg>;
    case 'Collaborate': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M4.38217793,5.5 C5.9159402,5.5 7.12103914,4.29 7.12103914,2.75 C7.12103914,1.21 5.9159402,0 4.38217793,0 C2.84841565,0 1.64331672,1.21 1.64331672,2.75 C1.64331672,4.29 2.84841565,5.5 4.38217793,5.5 Z M4.38217793,1.1 C5.25861352,1.1 6.02549465,1.87 6.02549465,2.75 C6.02549465,3.63 5.25861352,4.4 4.38217793,4.4 C3.50574234,4.4 2.73886121,3.63 2.73886121,2.75 C2.73886121,1.87 3.50574234,1.1 4.38217793,1.1 Z M7.66881138,11.66 L7.66881138,8.91 C7.66881138,8.25 7.12103914,7.7 6.354158,7.7 L2.30064341,7.7 C1.64331672,7.7 1.09554448,8.25 1.09554448,8.91 L1.09554448,11.66 C1.09554448,11.99 0.876435586,12.21 0.547772241,12.21 C0.219108896,12.21 0,11.99 0,11.66 L0,8.91 C0,7.7 1.09554448,6.6 2.30064341,6.6 L6.46371245,6.6 C7.66881138,6.6 8.76435586,7.7 8.76435586,8.91 L8.76435586,11.66 C8.76435586,11.99 8.54524696,12.21 8.21658362,12.21 C7.88792027,12.21 7.66881138,11.99 7.66881138,11.66 Z M19.7198007,5.5 C21.253563,5.5 22.4586619,4.29 22.4586619,2.75 C22.4586619,1.21 21.253563,0 19.7198007,0 C18.1860384,0 16.9809395,1.21 16.9809395,2.75 C16.9809395,4.29 18.1860384,5.5 19.7198007,5.5 Z M19.7198007,1.1 C20.5962363,1.1 21.3631174,1.87 21.3631174,2.75 C21.3631174,3.63 20.5962363,4.4 19.7198007,4.4 C18.8433651,4.4 18.076484,3.63 18.076484,2.75 C18.076484,1.87 18.8433651,1.1 19.7198007,1.1 Z M21.8013352,6.6 C23.0064341,6.6 24.1019786,7.7 23.9924242,8.91 L23.9924242,11.66 C23.9924242,11.99 23.7733153,12.21 23.4446519,12.21 C23.1159886,12.21 22.8968797,11.99 22.8968797,11.66 L22.8968797,8.91 C22.8968797,8.25 22.3491074,7.7 21.6917808,7.7 L17.6382662,7.7 C16.9809395,7.7 16.4331672,8.25 16.4331672,8.91 L16.4331672,11.66 C16.4331672,11.99 16.2140583,12.21 15.885395,12.21 C15.5567316,12.21 15.3376228,11.99 15.3376228,11.66 L15.3376228,8.91 C15.3376228,7.7 16.4331672,6.6 17.7478206,6.6 L21.8013352,6.6 Z M9.3121281,13.75 C9.3121281,15.29 10.517227,16.5 12.0509893,16.5 C13.5847516,16.5 14.7898505,15.29 14.7898505,13.75 C14.7898505,12.21 13.5847516,11 12.0509893,11 C10.517227,11 9.3121281,12.21 9.3121281,13.75 Z M13.694306,13.75 C13.694306,14.63 12.9274249,15.4 12.0509893,15.4 C11.1745537,15.4 10.4076726,14.63 10.4076726,13.75 C10.4076726,12.87 11.1745537,12.1 12.0509893,12.1 C12.9274249,12.1 13.694306,12.87 13.694306,13.75 Z M14.1325238,17.6 C15.3376228,17.6 16.4331672,18.7 16.3236128,19.91 L16.3236128,22.66 C16.3236128,22.99 16.1045039,23.21 15.7758405,23.21 C15.4471772,23.21 15.2280683,22.99 15.2280683,22.66 L15.2280683,19.91 C15.2280683,19.25 14.6802961,18.7 14.0229694,18.7 L9.96945479,18.7 C9.3121281,18.7 8.76435586,19.25 8.76435586,19.91 L8.76435586,22.66 C8.76435586,22.99 8.54524696,23.21 8.21658362,23.21 C7.88792027,23.21 7.66881138,22.99 7.66881138,22.66 L7.66881138,19.91 C7.66881138,18.7 8.76435586,17.6 10.0790092,17.6 L14.1325238,17.6 Z M9.3121281,3.3 C8.98346476,3.3 8.76435586,3.08 8.76435586,2.75 C8.76435586,2.42 8.98346476,2.2 9.3121281,2.2 L14.7898505,2.2 C15.1185139,2.2 15.3376228,2.42 15.3376228,2.75 C15.3376228,3.08 15.1185139,3.3 14.7898505,3.3 L9.3121281,3.3 Z M22.0204441,14.41 C22.239553,14.3 22.6777708,14.19 22.8968797,14.41 C23.1159886,14.63 23.1159886,14.96 22.8968797,15.18 L19.6102462,18.48 C19.5006918,18.59 19.3911373,18.59 19.1720284,18.59 C18.9529195,18.59 18.8433651,18.59 18.7338106,18.48 C18.5147018,18.26 18.5147018,17.93 18.7338106,17.71 L22.0204441,14.41 Z M2.08153452,14.41 L5.36816796,17.82 C5.58727686,18.04 5.58727686,18.37 5.36816796,18.59 C5.25861352,18.7 5.03950462,18.7 4.92995017,18.7 C4.82039572,18.7 4.60128683,18.7 4.60128683,18.48 L1.31465338,15.18 C1.09554448,14.96 1.09554448,14.63 1.31465338,14.41 C1.53376228,14.19 1.86242562,14.19 2.08153452,14.41 Z" /></svg>;
    case 'Handshake': return <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path d="M23.8006231,9.34979973 L17.8193146,3.15487316 C17.6199377,2.94837561 17.3208723,2.94837561 17.1214953,3.15487316 L14.1308411,6.25233645 C13.9314642,6.458834 13.9314642,6.76858033 14.1308411,6.97507788 L14.2305296,7.18157543 L11.6386293,8.31731197 L9.54517134,7.28482421 L9.74454829,7.07832666 C9.94392523,6.87182911 9.94392523,6.56208278 9.74454829,6.35558522 L6.75389408,3.25812194 C6.65420561,3.05162439 6.25545171,3.05162439 6.05607477,3.15487316 L0.0747663551,9.34979973 C-0.0249221184,9.55629729 -0.0249221184,9.96929239 0.0747663551,10.1757899 L3.06542056,13.2732532 C3.16510903,13.376502 3.36448598,13.376502 3.46417445,13.376502 C3.56386293,13.376502 3.76323988,13.376502 3.86292835,13.2732532 L4.26168224,12.8602581 L5.75700935,15.1317312 C5.5576324,15.3382287 5.45794393,15.6479751 5.45794393,15.9577214 C5.45794393,16.3707165 5.5576324,16.7837116 5.85669782,16.9902092 C6.05607477,17.1967067 6.45482866,17.4032043 6.75389408,17.4032043 C6.75389408,17.7129506 6.85358255,18.0226969 7.15264798,18.3324433 C7.35202492,18.5389408 7.75077882,18.7454384 8.04984424,18.7454384 C8.04984424,19.0551847 8.14953271,19.364931 8.44859813,19.6746773 C8.64797508,19.9844237 9.04672897,20.0876725 9.34579439,20.0876725 C9.34579439,20.3974188 9.44548287,20.7071651 9.74454829,21.0169114 C10.0436137,21.3266578 10.3426791,21.4299065 10.741433,21.4299065 C10.741433,21.4299065 10.741433,21.4299065 10.741433,21.4299065 C10.94081,21.4299065 11.1401869,21.3266578 11.3395639,21.223409 L12.2367601,21.6364041 C12.3364486,21.6364041 12.3364486,21.6364041 12.4361371,21.6364041 C13.3333333,21.6364041 13.7320872,21.1201602 13.8317757,20.5006676 C14.1308411,20.3974188 14.3302181,20.29417 14.529595,20.0876725 C14.8286604,19.7779261 14.9283489,19.4681798 15.0280374,19.0551847 C15.4267913,19.0551847 15.7258567,18.8486871 16.0249221,18.6421896 C16.3239875,18.3324433 16.423676,18.0226969 16.5233645,17.6097018 C16.9221184,17.6097018 17.2211838,17.4032043 17.5202492,17.1967067 C17.7196262,16.9902092 17.9190031,16.6804628 18.0186916,16.2674677 C18.0186916,15.9577214 18.0186916,15.6479751 17.9190031,15.3382287 L19.8130841,12.7570093 L20.211838,13.1700045 C20.3115265,13.2732532 20.411215,13.2732532 20.6105919,13.2732532 C20.8099688,13.2732532 20.9096573,13.2732532 21.0093458,13.1700045 L24,10.0725412 C23.9003115,9.96929239 23.9003115,9.55629729 23.8006231,9.34979973 Z M1.17133956,9.76279484 L6.45482866,4.2906097 L8.74766355,6.66533155 L3.46417445,12.1375167 L1.17133956,9.76279484 Z M6.45482866,15.9577214 C6.45482866,15.8544726 6.55451713,15.6479751 6.65420561,15.5447263 C6.65420561,15.5447263 6.65420561,15.5447263 6.65420561,15.5447263 L7.15264798,15.0284824 C7.25233645,14.9252336 7.35202492,14.8219849 7.55140187,14.8219849 C7.55140187,14.8219849 7.55140187,14.8219849 7.55140187,14.8219849 C7.65109034,14.8219849 7.75077882,14.8219849 7.85046729,14.9252336 C7.95015576,15.0284824 7.95015576,15.1317312 7.95015576,15.23498 C7.95015576,15.3382287 7.85046729,15.5447263 7.75077882,15.5447263 L7.25233645,16.0609702 C7.15264798,16.164219 7.0529595,16.2674677 6.85358255,16.2674677 C6.75389408,16.2674677 6.65420561,16.2674677 6.55451713,16.164219 C6.45482866,16.164219 6.45482866,16.0609702 6.45482866,15.9577214 Z M7.75077882,17.2999555 C7.75077882,17.1967067 7.85046729,16.9902092 7.95015576,16.8869604 L8.44859813,16.3707165 C8.5482866,16.2674677 8.64797508,16.164219 8.84735202,16.164219 C8.84735202,16.164219 8.84735202,16.164219 8.84735202,16.164219 C8.9470405,16.164219 9.04672897,16.164219 9.14641745,16.2674677 C9.24610592,16.3707165 9.24610592,16.4739653 9.24610592,16.5772141 C9.24610592,16.6804628 9.14641745,16.8869604 9.04672897,16.9902092 L8.44859813,17.506453 C8.34890966,17.6097018 8.24922118,17.7129506 8.04984424,17.7129506 C7.95015576,17.7129506 7.85046729,17.7129506 7.75077882,17.6097018 C7.75077882,17.506453 7.75077882,17.4032043 7.75077882,17.2999555 Z M8.9470405,18.6421896 C8.9470405,18.5389408 9.04672897,18.3324433 9.14641745,18.2291945 C9.14641745,18.2291945 9.14641745,18.2291945 9.14641745,18.2291945 L9.64485981,17.7129506 C9.74454829,17.6097018 9.94392523,17.506453 10.0436137,17.506453 C10.0436137,17.506453 10.0436137,17.506453 10.0436137,17.506453 C10.1433022,17.506453 10.2429907,17.506453 10.3426791,17.6097018 C10.4423676,17.7129506 10.4423676,17.8161994 10.4423676,17.9194482 C10.4423676,18.0226969 10.3426791,18.2291945 10.2429907,18.2291945 L9.74454829,18.7454384 C9.64485981,18.8486871 9.54517134,18.9519359 9.34579439,18.9519359 C9.24610592,18.9519359 9.14641745,18.9519359 9.04672897,18.8486871 C9.04672897,18.7454384 8.9470405,18.6421896 8.9470405,18.6421896 Z M10.6417445,20.29417 C10.5420561,20.29417 10.4423676,20.29417 10.3426791,20.1909212 C10.2429907,20.0876725 10.2429907,19.9844237 10.2429907,19.8811749 C10.2429907,19.7779261 10.3426791,19.5714286 10.4423676,19.4681798 L10.94081,18.9519359 C11.0404984,18.8486871 11.1401869,18.7454384 11.3395639,18.7454384 C11.3395639,18.7454384 11.3395639,18.7454384 11.3395639,18.7454384 C11.4392523,18.7454384 11.5389408,18.7454384 11.6386293,18.8486871 C11.7383178,18.9519359 11.7383178,19.0551847 11.7383178,19.1584335 C11.7383178,19.2616822 11.6386293,19.4681798 11.5389408,19.5714286 L10.94081,20.1909212 C10.8411215,20.29417 10.741433,20.29417 10.6417445,20.29417 Z M16.7227414,16.4739653 C16.623053,16.5772141 16.5233645,16.5772141 16.3239875,16.6804628 L15.9252336,16.6804628 C15.6261682,16.6804628 15.4267913,16.8869604 15.4267913,17.1967067 L15.4267913,17.6097018 C15.4267913,17.7129506 15.3271028,17.9194482 15.2274143,18.0226969 C15.1277259,18.1259457 15.0280374,18.2291945 14.8286604,18.2291945 L14.4299065,18.2291945 C14.1308411,18.2291945 13.9314642,18.435692 13.9314642,18.7454384 L13.9314642,19.1584335 C13.9314642,19.2616822 13.8317757,19.4681798 13.7320872,19.5714286 C13.6323988,19.6746773 13.4330218,19.7779261 13.3333333,19.7779261 C13.0342679,19.7779261 12.834891,19.9844237 12.834891,20.29417 C12.834891,20.5006676 12.7352025,20.8104139 12.4361371,20.8104139 L12.0373832,20.6039163 L12.0373832,20.6039163 C12.3364486,20.29417 12.4361371,19.9844237 12.5358255,19.5714286 C12.5358255,19.1584335 12.4361371,18.7454384 12.1370717,18.5389408 C11.9376947,18.2291945 11.5389408,18.1259457 11.2398754,18.1259457 C11.2398754,17.8161994 11.1401869,17.506453 10.8411215,17.1967067 C10.6417445,16.9902092 10.2429907,16.7837116 9.94392523,16.7837116 C9.94392523,16.4739653 9.84423676,16.164219 9.54517134,15.8544726 C9.34579439,15.5447263 9.04672897,15.4414775 8.64797508,15.4414775 C8.64797508,15.1317312 8.5482866,14.8219849 8.24922118,14.5122385 C7.95015576,14.2024922 7.65109034,14.0992434 7.25233645,14.0992434 C6.85358255,14.0992434 6.55451713,14.305741 6.25545171,14.5122385 L4.95950156,12.0342679 L8.84735202,8.00756564 L10.741433,8.93680463 L9.24610592,10.3822875 C8.64797508,11.0017802 8.64797508,11.9310191 9.24610592,12.5505118 C9.54517134,12.8602581 9.84423676,12.9635069 10.2429907,13.0667557 C10.6417445,13.0667557 11.0404984,12.9635069 11.3395639,12.6537606 C11.6386293,12.3440142 11.9376947,12.0342679 12.0373832,11.9310191 C12.2367601,11.8277704 12.635514,11.7245216 12.834891,11.7245216 C12.9345794,11.7245216 13.2336449,11.9310191 13.8317757,12.447263 C14.6292835,13.1700045 16.8224299,15.6479751 16.8224299,15.6479751 C16.8224299,15.6479751 16.9221184,15.7512239 16.9221184,15.7512239 L17.0218069,15.8544726 C17.1214953,15.9577214 17.1214953,16.0609702 17.1214953,16.164219 C16.9221184,16.2674677 16.8224299,16.3707165 16.7227414,16.4739653 Z M17.1214953,14.5122385 C16.423676,13.7894971 15.0280374,12.1375167 14.3302181,11.518024 C13.8317757,11.1050289 13.3333333,10.6920338 12.9345794,10.588785 C12.4361371,10.4855363 11.8380062,10.7952826 11.5389408,10.8985314 C11.2398754,11.1050289 10.741433,11.518024 10.5420561,11.7245216 C10.4423676,11.8277704 10.3426791,11.8277704 10.2429907,11.8277704 C10.1433022,11.8277704 10.0436137,11.7245216 9.94392523,11.7245216 C9.74454829,11.518024 9.74454829,11.2082777 9.94392523,11.0017802 L11.6386293,9.34979973 L11.9376947,9.14330218 L15.1277259,7.80106809 L19.0155763,11.8277704 L17.1214953,14.5122385 Z M20.411215,12.1375167 L15.1277259,6.66533155 L17.4205607,4.2906097 L22.7040498,9.76279484 L20.411215,12.1375167 Z M3.46417445,9.24655096 C3.76323988,9.24655096 3.96261682,9.45304851 3.96261682,9.76279484 C3.96261682,10.0725412 3.76323988,10.2790387 3.46417445,10.2790387 C3.16510903,10.2790387 2.96573209,10.0725412 2.96573209,9.76279484 C2.96573209,9.45304851 3.16510903,9.24655096 3.46417445,9.24655096 Z" /></svg>;
  }
};

/** Each action retains its complete native General Link envelope in editing.
 * Source roles select Download/Right presentation without filename guessing. */
const LifetimeIncomeAction = ({ field: receivedField, isEditing, primary = false, download = false }: {
  field: import('@sitecore-content-sdk/nextjs').LinkField;
  isEditing: boolean;
  primary?: boolean;
  download?: boolean;
}) => {
  const field = allianzLinkField(receivedField, isEditing);
  const linkProps = isEditing ? { field } : safeLinkRenderProps(field);
  const ariaLabel = field.value?.ariaLabel || field.value?.['aria-label'] || field.value?.text;
  return <Link {...linkProps} editable={isEditing} renderChildrenWhenEmpty={isEditing}
    className={primary ? 'm-axlButton m-axlButton--primary' : 'a-link'}
    aria-label={typeof ariaLabel === 'string' && ariaLabel ? ariaLabel : undefined}>
    {!primary && <span className="a-link__icon" aria-hidden="true">{download ? <SustainabilityDownloadIcon /> : <FixedResourceArrowIcon />}</span>}
    {primary ? field.value?.text : <span className="a-link__text">{field.value?.text}</span>}
  </Link>;
};

/** The one native introduction owns an H3 and its ordered two-link Multilist:
 * the first action is primary; the second occupies the separate Source row. */
export const LifetimeExploreSolution = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      <div className="l-grid__row"><div className="l-grid__column-medium-12">
        {cards.map((card) => {
          const primary = card.links?.targetItems?.[0]?.link?.jsonValue;
          return <article key={card.id} className="m-axlIntroductionBlock -is--stacked -no--image">
            <div className="tileContent u-text-center">
              <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
              {primary && shouldRenderLinkField(primary, isEditing) && <footer><div className="tileLink"><LifetimeIncomeAction field={primary} isEditing={isEditing} primary /></div></footer>}
            </div>
          </article>;
        })}
      </div></div>
      <div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center">
        {cards.map((card) => {
          const contact = card.links?.targetItems?.[1]?.link?.jsonValue;
          return contact && shouldRenderLinkField(contact, isEditing) ? <footer key={card.id}><div className="tileLink u-margin-top-md u-margin-bottom-md"><LifetimeIncomeAction field={contact} isEditing={isEditing} /></div></footer> : null;
        })}
      </div></div>
    </div>
  </div>;
};

/** Three ordered native support children share the Source centered-eight
 * column and split icon/copy grammar; only their original action slot renders. */
export const LifetimeIncomeSupport = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12">
      {cards.map((card, index) => {
        const action = card.links?.targetItems?.[0]?.link?.jsonValue;
        return <article key={card.id} className="m-axlTile match-height tile--alphaNumeric -is--split t-bg-transparent">
          <div className="tileContent u-text-left">
            {index < 3 && <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black">{index === 1 ? <IapSourceGlyph glyph="LightBulb" /> : <LifetimeIncomeSourceGlyph glyph={index === 0 ? 'Presentation' : 'Collaborate'} />}</div></div>}
            <div className="tileSubGrid__content">
              <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h3" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
              {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
              {action && shouldRenderLinkField(action, isEditing) && <footer><div className="tileLink"><LifetimeIncomeAction field={action} isEditing={isEditing} download={index === 0} /></div></footer>}
            </div>
          </div>
        </article>;
      })}
    </div></div></div>
  </div>;
};

/** The strength child owns its H2, entire MD rich text and media action.
 * Download is the Source slot's presentation even for extension-free URLs. */
export const LifetimeIncomeStrength = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-transparent axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {cards.map((card) => {
        const action = card.links?.targetItems?.[0]?.link?.jsonValue;
        return <article key={card.id} className="m-axlTile match-height -is--stacked t-bg-transparent">
          <div className="tileContent u-text-center"><div className="tileSubGrid__content">
            <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
            {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={card.body?.jsonValue} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
            {action && shouldRenderLinkField(action, isEditing) && <footer><div className="tileLink"><LifetimeIncomeAction field={action} isEditing={isEditing} download /></div></footer>}
          </div></div>
        </article>;
      })}
    </div></div></div>
  </div>;
};

/** The native callout owns its complete body, including the guarded CTA.
 * Its decorative Handshake never creates a scalar Link or duplicate button. */
export const LifetimeIncomeCallout = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = (data.children?.results ?? []).map(allianzCardFields);
  return <div className="l-container--full-width t-bg-green-soft axlTileCollection" id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12">
      {cards.map((card) => <article key={card.id} className="m-axlTile match-height -is--stacked t-bg-transparent">
        <div className="tileContent u-text-center">
          <div className="tileSubGrid__image"><div className="tileIcon t-bg-transparent t-icon-primary-black"><LifetimeIncomeSourceGlyph glyph="Handshake" /></div></div>
          <div className="tileSubGrid__content">
            <header><div className="tileHeading">{shouldRenderTextField(card.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={card.heading?.jsonValue} />}</div><div className="tileSubHeading" /></header>
            {shouldRenderTextField(card.body?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(card.body?.jsonValue, isEditing)} className="tileBody u-font-size-md" /> : <div className="tileBody u-font-size-md" />}
          </div>
        </div>
      </article>)}
    </div></div></div>
  </div>;
};
