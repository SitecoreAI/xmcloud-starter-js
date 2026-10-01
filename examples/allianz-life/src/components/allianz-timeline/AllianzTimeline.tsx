'use client';

import { Image, Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderImageField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import type { AllianzTimelineProps } from './allianz-timeline.props';

export const Default = ({ fields, params }: AllianzTimelineProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzTimeline" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-8 offset-medium-2 l-grid__column-small-12">
      {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
      <RichText editable={isEditing} field={data.body?.jsonValue} />
      <table className="allianz-timeline"><tbody>{(data.children?.results ?? []).map((item) => <tr key={item.id}><th scope="row"><Text editable={isEditing} field={item.date?.jsonValue} /></th><td>
        {shouldRenderTextField(item.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={item.heading?.jsonValue} tag="h3" />}
        <RichText editable={isEditing} field={item.body?.jsonValue} />
        {shouldRenderImageField(item.image?.jsonValue, isEditing) && <Image editable={isEditing} field={item.image?.jsonValue} />}
        {shouldRenderLinkField(item.link?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)} className="a-link" />}
      </td></tr>)}</tbody></table>
    </div></div></div>
  </section>;
};
