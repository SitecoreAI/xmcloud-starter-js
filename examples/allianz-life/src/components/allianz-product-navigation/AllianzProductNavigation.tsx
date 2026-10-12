'use client';

import { useId, useState } from 'react';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLinkRenderProps, type NavigationItem } from 'lib/allianz-fields';
import type { AllianzProductNavigationProps } from './allianz-product-navigation.props';
import './AllianzProductNavigation.css';

const nativeId = (id: unknown): string | undefined => {
  if (typeof id !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}|\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\})$/i.test(id)) return undefined;
  return id.replace(/[{}-]/g, '').toLowerCase();
};

/** Ordered native navigation links: product title first, followed by its tabs. */
export const Default = ({ fields, params }: AllianzProductNavigationProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const datasource = fields?.data?.datasource;
  const [product, ...tabs] = datasource?.primaryNav?.targetItems ?? [];
  const expanded = editing || open;
  const currentId = nativeId(fields?.data?.contextItem?.id);
  if (!datasource || !product) return <NoDataFallback componentName="Product navigation" />;

  const itemLink = (item: NavigationItem, className: string, active = false) => {
    const original = item.link?.jsonValue;
    const props = safeLinkRenderProps(original);
    const ariaLabel = typeof original?.value?.ariaLabel === 'string' ? original.value.ariaLabel
      : typeof original?.value?.['aria-label'] === 'string' ? original.value['aria-label'] : undefined;
    // The SDK's empty-link editor omits children; keep its separately owned title editable.
    if (editing && !original?.value?.href) return <span className={className}>
      <Link {...props} editable={editing} aria-label={ariaLabel} />
      <Text field={item.title?.jsonValue} editable={editing} />
    </span>;
    return <Link {...props} className={className} editable={editing} aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}>
      <Text field={item.title?.jsonValue} editable={editing} />
    </Link>;
  };

  return <nav className={`m-navigation-secondary allianz-product-navigation${expanded ? ' m-navigation-secondary-open' : ''}${editing ? ' allianz-product-navigation-editing' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Product navigation">
    <div className="nav-sec-list-title">
      {itemLink(product, 'nav-sec-product-link')}
      <button type="button" className="nav-sec-toggle" aria-label="Toggle product navigation"
        aria-expanded={expanded} aria-controls={listId} disabled={editing}
        onClick={() => setOpen((current) => !current)}>
        <i className="c-icon c-icon--chevron-down" aria-hidden="true" />
      </button>
    </div>
    <ul className="nav-sec-list" id={listId}>{tabs.map((item) => {
      const destinationId = nativeId(item.link?.jsonValue?.value?.id);
      const active = Boolean(currentId && destinationId === currentId);
      return <li key={item.id}>{itemLink(item, active ? '-is-active' : '', active)}</li>;
    })}</ul>
  </nav>;
};

/** Fixed product title clicks toggle the same mobile state as the separate button. */
export const FixedTabs = ({ fields, params }: AllianzProductNavigationProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const datasource = fields?.data?.datasource;
  const [product, ...tabs] = datasource?.primaryNav?.targetItems ?? [];
  const expanded = editing || open;
  const currentId = nativeId(fields?.data?.contextItem?.id);
  if (!datasource || !product) return <NoDataFallback componentName="Product navigation" />;

  const itemLink = (item: NavigationItem, className: string, active = false, onClick?: React.MouseEventHandler<HTMLAnchorElement>) => {
    const original = item.link?.jsonValue;
    const props = safeLinkRenderProps(original);
    const ariaLabel = typeof original?.value?.ariaLabel === 'string' ? original.value.ariaLabel
      : typeof original?.value?.['aria-label'] === 'string' ? original.value['aria-label'] : undefined;
    // The SDK's empty-link editor omits children; keep its separately owned title editable.
    if (editing && !original?.value?.href) return <span className={className}>
      <Link {...props} editable={editing} aria-label={ariaLabel} />
      <Text field={item.title?.jsonValue} editable={editing} />
    </span>;
    return <Link {...props} className={className} editable={editing} aria-label={ariaLabel} onClick={onClick}
      aria-current={active ? 'page' : undefined}>
      <Text field={item.title?.jsonValue} editable={editing} />
    </Link>;
  };

  return <nav className={`m-navigation-secondary allianz-product-navigation${expanded ? ' m-navigation-secondary-open' : ''}${editing ? ' allianz-product-navigation-editing' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Product navigation">
    <div className="nav-sec-list-title">
      {itemLink(product, 'nav-sec-product-link', false, editing ? undefined : (event) => {
          event.preventDefault();
          setOpen((current) => !current);
        })}
      <button type="button" className="nav-sec-toggle" aria-label="Toggle product navigation"
        aria-expanded={expanded} aria-controls={listId} disabled={editing}
        onClick={() => setOpen((current) => !current)}>
        <i className="c-icon c-icon--chevron-down" aria-hidden="true" />
      </button>
    </div>
    <ul className="nav-sec-list" id={listId}>{tabs.map((item) => {
      const destinationId = nativeId(item.link?.jsonValue?.value?.id);
      const active = Boolean(currentId && destinationId === currentId);
      return <li key={item.id}>{itemLink(item, active ? '-is-active' : '', active)}</li>;
    })}</ul>
  </nav>;
};
