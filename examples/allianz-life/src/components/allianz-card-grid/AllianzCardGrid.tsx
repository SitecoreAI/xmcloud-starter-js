'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, rowSpacing, sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzCardGridProps } from './allianz-card-grid.props';

export const Default = ({ fields, params }: AllianzCardGridProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCardGrid" />;
  const cards = data.children?.results ?? [];
  const column = ({ '1':12, '2':6, '3':4, '4':3 } as Record<string, number>)[params.columns] ?? 12;
  const isCards = params.layout === 'cards';
  const splitClass = params.splitRatio === '33:67' ? 'tile--3366' : params.splitRatio === '67:33' ? 'tile--6633' : 'tile--5050';
  if (params.layout === 'list') return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}><div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12"><div className="c-search-result-text-teaser">{cards.map((card) => <article className="c-search-result-text-teaser__item" key={card.id}><h5 className="c-search-result-text-teaser__headline"><Link editable={isEditing} field={allianzLinkField(card.link?.jsonValue, isEditing)} renderChildrenWhenEmpty={isEditing}><Text editable={isEditing} field={card.heading?.jsonValue} /></Link></h5><RichText editable={isEditing} field={card.body?.jsonValue} className="c-search-result-text-teaser__copytext" /></article>)}</div></div></div></div></section>;
  return <div className={`l-container--full-width ${sectionTheme(params.theme)} axlTileCollection`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <div className="l-grid__row u-margin-bottom-lg u-padding-top-lg"><div className="l-grid__column-medium-12"><article className="m-axlIntroductionBlock -is--stacked -no--image"><div className="tileContent u-text-center"><div className="tileHeading"><Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} /></div><RichText editable={isEditing} field={data.subheading?.jsonValue} className="tileSubHeading" /><RichText editable={isEditing} field={data.body?.jsonValue} className="tileBody" />{shouldRenderLinkField(data.primaryLink?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.primaryLink?.jsonValue, isEditing)} className="a-link" />}</div></article></div></div>}
      <div className={`l-grid__row ${isCards ? '' : 'match-height-row'} ${rowSpacing(params)}`}>
        {isCards ? <div className="l-grid__column-medium-12"><div className={`o-cards o-cards__col${params.columns || '3'}`}>
          {cards.map((card) => <Link editable={isEditing} key={card.id} field={allianzLinkField(card.link?.jsonValue, isEditing)} renderChildrenWhenEmpty={isEditing} className="m-card">
            {shouldRenderImageField(card.image?.jsonValue, isEditing) && <div className="m-card__image"><picture className="c-image"><Image editable={isEditing} field={card.image?.jsonValue} className="c-image__img c-teaser__image-img" /></picture></div>}
            <div className="m-card__header"><Text editable={isEditing} tag="h4" field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={card.body?.jsonValue} className="m-card__body" />
          </Link>)}
        </div></div> : cards.map((card) => <div key={card.id} className={`l-grid__column-medium-${column}`}>
          <article className={`m-axlTile match-height ${sectionTheme(card.theme?.jsonValue?.value)} ${params.layout === 'image-left' || params.layout === 'image-right' ? `${splitClass} -is--split ${params.layout === 'image-right' ? '-is--flipped' : ''}` : shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'stacked' ? '-is--flipped tile--stackedImage -is--stacked' : '-is--stacked'} ${params.layout === 'bordered' ? 'allianz-bordered' : ''}`}>
            <div className={`tileContent ${params.alignment === 'left' ? 'u-text-left' : 'u-text-center'}`}>
              {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="tileSubGrid__image"><div className={`tileIcon ${card.iconTheme?.jsonValue?.value === 'primary-brand' ? 't-bg-primary-brand t-icon-primary-white' : 't-bg-transparent t-icon-primary-black'}`}><Image editable={isEditing} field={card.icon?.jsonValue} /></div></div>}
              {shouldRenderTextField(card.alphanumeral?.jsonValue, isEditing) && <div className="tileSubGrid__image"><Text editable={isEditing} field={card.alphanumeral?.jsonValue} className="tileAlphanumeral" /></div>}
              {shouldRenderImageField(card.image?.jsonValue, isEditing) && params.layout === 'bordered' && <div className="tileSubGrid__image"><div className="tileImage"><Image editable={isEditing} field={card.image?.jsonValue} /></div></div>}
              <div className="tileSubGrid__content"><header><div className="tileHeading"><Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel)} field={card.heading?.jsonValue} /></div><RichText editable={isEditing} field={card.subheading?.jsonValue} className="tileSubHeading" /></header>
                <RichText editable={isEditing} field={card.body?.jsonValue} className={`tileBody ${params.headingLevel === 'h2' ? 'u-font-size-xl' : 'u-font-size-md'}`} />
                {!!(card.links?.targetItems?.some((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)) || shouldRenderLinkField(card.link?.jsonValue, isEditing)) && <footer><div className="tileLink">{(card.links?.targetItems?.length ? card.links.targetItems : [{id: `${card.id}-link`, link:card.link}]).filter((item) => shouldRenderLinkField(item.link?.jsonValue, isEditing)).map((item) => <Link editable={isEditing} key={item.id} field={allianzLinkField(item.link?.jsonValue, isEditing)} className="a-link"><span className="a-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" preserveAspectRatio="xMidYMid meet"><path fillRule="evenodd" d="M23.8863661,13.0726536 C24.037878,12.7066353 24.037878,12.2926146 23.8863661,11.9265963 C23.8098601,11.7420871 23.7003516,11.5755788 23.5608407,11.4375719 L17.561872,5.43877194 C16.9768263,4.85374269 16.0272521,4.85374269 15.4407063,5.43877194 C14.8541605,6.02530127 14.8541605,6.97484874 15.4407063,7.55987799 L18.880475,10.99955 L1.5001172,10.99955 C0.670552387,10.99955 0,11.6700835 0,12.499625 C0,13.3291665 0.670552387,13.9997 1.5001172,13.9997 L18.880475,13.9997 L15.4407063,17.439372 C14.8541605,18.0259013 14.8541605,18.9754488 15.4407063,19.560478 C15.7332292,19.8544927 16.1172592,20 16.5012892,20 C16.8853192,20 17.2693492,19.8544927 17.561872,19.560478 L23.5608407,13.5616781 C23.7003516,13.4236712 23.8098601,13.2571629 23.8863661,13.0726536"/></svg></span><span className="a-link__text">{item.link?.jsonValue?.value?.text}</span></Link>)}</div></footer>}
              </div>
            </div>
            {shouldRenderImageField(card.image?.jsonValue, isEditing) && ['stacked','image-left','image-right'].includes(params.layout) && <div className="tileImage"><picture className="c-image c-teaser__image"><Image editable={isEditing} field={card.image?.jsonValue} className="c-image__img c-teaser__image-img" /></picture></div>}
          </article>
        </div>)}
      </div>
    </div>
  </div>;
};
