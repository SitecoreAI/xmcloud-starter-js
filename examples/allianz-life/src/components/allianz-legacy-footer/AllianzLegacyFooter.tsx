'use client';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import { useId, useState } from 'react';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { type AllianzProps } from 'lib/allianz-fields';
import { allianzLinkField, shouldRenderLinkField } from 'lib/allianz-field-state';

// These classes are recovered from legacy footer markup and mobile selectors.
const groupClasses: Record<string, string> = {
  products: 'products', about: 'about', annuities: 'annuities',
  'life insurance': 'life-insurance', retirement: 'retirement',
  'retirement planning': 'retirement-planning',
  'retirement & planning tools': 'retirement-&-planning-tools',
  'customer service': 'customer-service', 'related sites': 'related-sites',
};

export const Default = ({ fields, params }: AllianzProps) => {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  const [expanded, setExpanded] = useState(false);
  const listId = `allianz-legacy-footer-${useId()}`;
  const data = fields?.data?.datasource;
  if (!data) return <NoDataFallback componentName="AllianzLegacyFooter" />;
  return <footer className="allianz-legacy-footer" id={params.RenderingIdentifier} data-allianz-editing={isEditing ? true : undefined}>
    <nav className="footer-nav container-fluid azl-contents" aria-label="Footer navigation"><div className="row"><ul className="nav navbar-nav footer-nav"><li className={`dropdown ${isEditing || expanded ? 'open' : ''}`}>
      <button className="dropdown-toggle visible-xs allianz-legacy-footer-toggle" type="button" aria-expanded={isEditing || expanded} aria-controls={listId} onClick={() => setExpanded((previous) => !previous)}>More... <span className="caret" aria-hidden="true" /></button>
      <ul id={listId} className="dropdown-menu">{(data.primaryNav?.targetItems ?? []).map((group) => <li className={`col-sm-2 ${groupClasses[group.title?.jsonValue?.value?.trim().toLowerCase() ?? ''] ?? ''}`.trim()} key={group.id}>
        <h3>{shouldRenderLinkField(group.link?.jsonValue, isEditing) ? <Link editable={isEditing} renderChildrenWhenEmpty={isEditing} field={allianzLinkField(group.link?.jsonValue, isEditing)}><Text editable={isEditing} field={group.title?.jsonValue} /></Link> : <Text editable={isEditing} field={group.title?.jsonValue} />}</h3>
        <ul>{(group.children?.results ?? []).map((item) => <li key={item.id}><Link editable={isEditing} renderChildrenWhenEmpty={isEditing} field={allianzLinkField(item.link?.jsonValue, isEditing)}><Text editable={isEditing} field={item.title?.jsonValue} /></Link></li>)}</ul>
      </li>)}</ul>
    </li></ul></div></nav>
    <div className="container-fluid azl-contents copyright"><div className="row"><Text editable={isEditing} tag="span" field={data.copyright?.jsonValue} /></div></div>
  </footer>;
};
