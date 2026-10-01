'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, type AllianzProps } from 'lib/allianz-fields';

export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyCardGrid" />;
  const columns = ({ '1': 12, '2': 6, '3': 4, '4': 3 } as Record<string, number>)[params.columns] ?? 6;
  const breakpoint = params.breakpoint === 'md' ? 'md' : 'sm';
  const region = ['pre-content', 'content', 'post-content', 'disclosure'].includes(params.region) ? params.region : 'content';
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region}`}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
    <div className={`row mod-row ${params.noMarginBottom === '1' ? 'no-margin-bottom' : ''}`}>
      {(data.children?.results ?? []).map((card) => <div className={`col-${breakpoint}-${columns}`} key={card.id}><article className="mod">
        <div className={params.alignment === 'center' ? 'icon-with-text text-center' : undefined}>
          {shouldRenderImageField(card.image?.jsonValue, isEditing) && <Image editable={isEditing} field={card.image?.jsonValue} className="allianz-legacy-card-image" />}
          {shouldRenderImageField(card.icon?.jsonValue, isEditing) && <div className="icon-container"><div className="icon-background primary-01-bg" /><Image editable={isEditing} field={card.icon?.jsonValue} className="icon icon-story" /></div>}
          <Text editable={isEditing} tag={headingTag(card.headingLevel?.jsonValue?.value || params.headingLevel || 'h3')} field={card.heading?.jsonValue} />
          <RichText editable={isEditing} field={card.body?.jsonValue} />
          {shouldRenderLinkField(card.link?.jsonValue, isEditing) && <p className="link"><Link editable={isEditing} field={allianzLinkField(card.link?.jsonValue, isEditing)} /></p>}
        </div>
      </article></div>)}
    </div>
  </div></div>;
};
