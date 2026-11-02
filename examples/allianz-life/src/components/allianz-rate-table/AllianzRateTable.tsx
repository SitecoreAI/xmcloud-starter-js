'use client';

import { RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { shouldRenderTextField } from 'lib/allianz-field-state';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeEditorialRichText } from 'lib/allianz-editorial';
import type { AllianzRateTableProps } from './allianz-rate-table.props';

/** A localized native editorial table; absence of captured public rates never creates numbers. */
export const Default = ({ fields, params }: AllianzRateTableProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzRateTable" />;
  return <section className="allianz-local-rates" id={params.RenderingIdentifier}>
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} tag="h2" field={data.heading?.jsonValue} />}
    {shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={safeEditorialRichText(data.body?.jsonValue, isEditing, true, () => true)} />}
    {shouldRenderTextField(data.captionText?.jsonValue, isEditing) && <Text editable={isEditing} tag="p" field={data.captionText?.jsonValue} />}
    {shouldRenderTextField(data.tableBody?.jsonValue, isEditing) ? <RichText editable={isEditing} className="table-responsive" field={safeEditorialRichText(data.tableBody?.jsonValue, isEditing, true, () => true)} /> : shouldRenderTextField(data.emptyState?.jsonValue, isEditing) ? <RichText editable={isEditing} field={safeEditorialRichText(data.emptyState?.jsonValue, isEditing, true, () => true)} /> : null}
  </section>;
};
