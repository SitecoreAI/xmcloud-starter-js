'use client';

import { Link, RichText, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { sectionTheme } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzCTAProps } from './allianz-cta.props';

/** Testable native component. Assignment remains Sitecore's responsibility. */
export const Default = ({ fields, params }: AllianzCTAProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzCTA" />;
  return <section className={`l-container--full-width ${sectionTheme(params.theme)}`}><div className="l-grid l-grid--max-width"><div className="l-grid__row"><div className="l-grid__column-medium-12 u-text-center">
    {shouldRenderTextField(data.heading?.jsonValue, isEditing) && <Text editable={isEditing} field={data.heading?.jsonValue} tag="h2" />}{shouldRenderTextField(data.body?.jsonValue, isEditing) && <RichText editable={isEditing} field={data.body?.jsonValue} />}
    {shouldRenderLinkField(data.link?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(data.link?.jsonValue, isEditing)} className="a-link" />}
  </div></div></div></section>;
};
