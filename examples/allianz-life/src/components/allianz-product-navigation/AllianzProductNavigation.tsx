'use client';

import { useId, useState } from 'react';
import { Link, Text, useSitecore } from '@sitecore-content-sdk/nextjs';
import NoDataFallback from 'components/content-sdk/NoDataFallback';
import { safeLinkRenderProps, type NavigationItem } from 'lib/allianz-fields';
import { restoreSourceDestinationLinkProps } from 'lib/allianz-source-destinations';
import type { AllianzProductNavigationProps } from './allianz-product-navigation.props';
import './AllianzProductNavigation.css';

const nativeId = (id: unknown): string | undefined => {
  if (typeof id !== 'string' || !/^(?:[a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}|\{[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\})$/i.test(id)) return undefined;
  return id.replace(/[{}-]/g, '').toLowerCase();
};

const SOURCE_RATES_OWNERS: Readonly<Record<string, string>> = {
  b95a8d6917354b278c57e7bc71106800: 'cacfb676be2046fe8afe37e15cee5269',
  '6976acdff6d1420da80513e46b79fe4d': 'ee094e0ae5614c498e8c2a5f8f16ac6a',
};

/** Ordered native navigation links: product title first, followed by its tabs. */
export const Default = ({ fields, params }: AllianzProductNavigationProps) => {
  const { page } = useSitecore();
  const editing = page?.mode?.isEditing ?? false;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const datasource = fields?.data?.datasource;
  const [product, ...tabs] = datasource?.primaryNav?.targetItems ?? [];
  const expanded = open;
  const currentId = nativeId(fields?.data?.contextItem?.id);
  if (!datasource || !product) return <NoDataFallback componentName="Product navigation" />;

  const itemLink = (item: NavigationItem, className: string, active = false) => {
    const original = item.link?.jsonValue;
    const props = safeLinkRenderProps(original);
    const ariaLabel = typeof original?.value?.ariaLabel === 'string' ? original.value.ariaLabel
      : typeof original?.value?.['aria-label'] === 'string' ? original.value['aria-label'] : undefined;
    if (!original?.value?.href) return null;
    return <Link {...props} className={className} editable={editing} aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}>
      {item.title?.jsonValue?.value ? <Text field={item.title?.jsonValue} editable={editing} /> : <></>}
    </Link>;
  };

  return <nav className={`m-navigation-secondary allianz-product-navigation${expanded ? ' m-navigation-secondary-open' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Product navigation">
    <div className="nav-sec-list-title">
      {itemLink(product, 'nav-sec-product-link')}
      <button type="button" className="nav-sec-toggle" aria-label="Toggle product navigation"
        aria-expanded={expanded} aria-controls={listId}
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
  const expanded = open;
  const currentId = nativeId(fields?.data?.contextItem?.id);
  if (!datasource || !product) return <NoDataFallback componentName="Product navigation" />;

  const itemLink = (item: NavigationItem, className: string, active = false, onClick?: React.MouseEventHandler<HTMLAnchorElement>) => {
    const original = item.link?.jsonValue;
    const datasourceId = nativeId('id' in datasource ? datasource.id : undefined);
    const expectedDatasourceId = SOURCE_RATES_OWNERS[nativeId(item.id) ?? ''];
    const ownerId = expectedDatasourceId && expectedDatasourceId === datasourceId ? item.id : undefined;
    const props = restoreSourceDestinationLinkProps(safeLinkRenderProps(original), original, page?.mode?.isEditing !== false, ownerId);
    const ariaLabel = typeof original?.value?.ariaLabel === 'string' ? original.value.ariaLabel
      : typeof original?.value?.['aria-label'] === 'string' ? original.value['aria-label'] : undefined;
    if (!original?.value?.href) return null;
    return <Link {...props} className={className} editable={editing} aria-label={ariaLabel} onClick={onClick}
      aria-current={active ? 'page' : undefined}>
      {item.title?.jsonValue?.value ? <Text field={item.title?.jsonValue} editable={editing} /> : <></>}
    </Link>;
  };

  return <nav className={`m-navigation-secondary allianz-product-navigation${expanded ? ' m-navigation-secondary-open' : ''}`}
    id={params?.RenderingIdentifier} aria-label="Product navigation">
    <div className="nav-sec-list-title">
      {itemLink(product, 'nav-sec-product-link', false, (event) => {
          event.preventDefault();
          setOpen((current) => !current);
        })}
      <button type="button" className="nav-sec-toggle" aria-label="Toggle product navigation"
        aria-expanded={expanded} aria-controls={listId}
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
