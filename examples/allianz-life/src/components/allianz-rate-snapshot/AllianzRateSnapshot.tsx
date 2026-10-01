'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { rowSpacing, sectionTheme } from 'lib/allianz-fields';
import type { AllianzRateSnapshotProps } from './allianz-rate-snapshot.props';

export const Default = ({ fields, params }: AllianzRateSnapshotProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRateSnapshot" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`} id={params.RenderingIdentifier}>
    <div className="l-grid l-grid--max-width"><div className={`l-grid__row ${rowSpacing(params)}`}><div className="l-grid__column-medium-12">
      <div className="well seven-yr-slot"><h2><Text editable={isEditing} tag="small" className="blue" field={data.heading?.jsonValue} />: <Text editable={isEditing} field={data.rate?.jsonValue} /> <small>as of <Text editable={isEditing} field={data.asOf?.jsonValue} /></small></h2><RichText editable={isEditing} field={data.body?.jsonValue} />
        {shouldRenderLinkField(data.link?.jsonValue, isEditing) && <p><Link editable={isEditing} field={allianzLinkField(data.link?.jsonValue, isEditing)} /></p>}
      </div>
    </div></div></div>
  </section>;
};
