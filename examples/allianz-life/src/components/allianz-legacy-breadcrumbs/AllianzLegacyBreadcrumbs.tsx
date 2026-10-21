'use client';

import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import type { AllianzProps } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';

export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  return <nav aria-label="Breadcrumb" id={params.RenderingIdentifier}><ol className="breadcrumb">
    {(fields?.data?.datasource?.primaryNav?.targetItems ?? []).map((item) => <li key={item.id}>{shouldRenderLinkField(item.link?.jsonValue, isEditing) && <Link editable={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)}>{shouldRenderTextField(item.title?.jsonValue, isEditing) ? <Text editable={isEditing} field={item.title?.jsonValue} /> : <></>}</Link>}</li>)}
  </ol></nav>;
};
