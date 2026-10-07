'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { headingTag, type AllianzProps } from 'lib/allianz-fields';
import { safeEditorialRichText } from 'lib/allianz-editorial';

const REGIONS = ['pre-content', 'content', 'post-content', 'disclosure'];

/** One editorial island. Safe semantic tables are authored in the Rich Text field. */
export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyRichText" />;
  const region = REGIONS.includes(params.region) ? params.region : 'content';
  const tableTheme = params.tableTheme === 'striped' ? 'allianz-legacy-table-striped' : '';
  return <div className="row" id={params.RenderingIdentifier}><div className={`col-md-12 content-body ${region} ${tableTheme}`}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag={headingTag(params.headingLevel)} field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.subheading?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.subheading?.jsonValue, isEditing)} />}
    <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing)} className="allianz-legacy-editorial" />
  </div></div>;
};
