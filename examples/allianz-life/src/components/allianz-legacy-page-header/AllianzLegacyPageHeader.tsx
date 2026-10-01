'use client';

import { RichText, useSitecore } from '@sitecore-content-sdk/nextjs';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import type { AllianzProps } from 'lib/allianz-fields';

/** The legacy title is separate from its editorial content and hero. */
export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyPageHeader" />;
  return <header className="page-header" id={params.RenderingIdentifier}>
    <RichText editable={isEditing} tag="h1" field={data.heading?.jsonValue} />
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
  </header>;
};
