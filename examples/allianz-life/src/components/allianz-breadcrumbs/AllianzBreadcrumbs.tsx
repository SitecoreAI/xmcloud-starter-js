import { Link, Text } from '@sitecore-content-sdk/nextjs';
import { safeLink } from 'lib/allianz-fields';
import type { AllianzBreadcrumbsProps } from './allianz-breadcrumbs.props';

export const Default = ({ fields }: AllianzBreadcrumbsProps) => {
  const items = fields?.data?.datasource?.primaryNav?.targetItems ?? [];
  return <nav className="azl-breadcrumb l-container" aria-label="Breadcrumbs"><span className="u-aria-only">You are here:</span><ol className="c-breadcrumb__list">{items.map((item,index) => {
    const field = safeLink(item.link?.jsonValue);
    const ariaLabel = typeof field.value?.ariaLabel === 'string' ? field.value.ariaLabel
      : typeof field.value?.['aria-label'] === 'string' ? field.value['aria-label'] : undefined;
    return <li key={item.id} className="c-breadcrumb__item">{index > 0 && <i className="c-icon" aria-hidden="true">/</i>}<Link className={`c-breadcrumb__link ${index === items.length - 1 ? 'is-active' : ''}`} field={field} aria-label={ariaLabel} aria-current={index === items.length - 1 ? 'page' : undefined}><Text field={item.title?.jsonValue} /></Link></li>;
  })}</ol></nav>;
};
