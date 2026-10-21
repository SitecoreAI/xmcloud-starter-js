'use client';

import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { allianzLinkField, shouldRenderLinkField, shouldRenderTextField } from 'lib/allianz-field-state';
import type { AllianzBreadcrumbsProps } from './allianz-breadcrumbs.props';

export const Default = ({ fields }: AllianzBreadcrumbsProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const items = fields?.data?.datasource?.primaryNav?.targetItems ?? [];
  return <nav className="azl-breadcrumb l-container" aria-label="Breadcrumbs"><span className="u-aria-only">You are here:</span><ol className="c-breadcrumb__list">{items.map((item,index) => {
    const field = allianzLinkField(item.link?.jsonValue, isEditing);
    const ariaLabel = typeof field.value?.ariaLabel === 'string' ? field.value.ariaLabel
      : typeof field.value?.['aria-label'] === 'string' ? field.value['aria-label'] : undefined;
    return <li key={item.id} className="c-breadcrumb__item">{index > 0 && <i className="c-icon" aria-hidden="true">/</i>}{shouldRenderLinkField(item.link?.jsonValue, isEditing) && <Link editable={isEditing} className={`c-breadcrumb__link ${index === items.length - 1 ? 'is-active' : ''}`} field={field} aria-label={ariaLabel} aria-current={index === items.length - 1 ? 'page' : undefined}>{shouldRenderTextField(item.title?.jsonValue, isEditing) ? <Text editable={isEditing} field={item.title?.jsonValue} /> : <></>}</Link>}</li>;
  })}</ol></nav>;
};
