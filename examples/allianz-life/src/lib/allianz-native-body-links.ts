import type { Field } from '@sitecore-content-sdk/nextjs';
import { safeNewsroomRichText } from 'components/legal-disclosures/newsroom-grey.links.props';
import { safeLink } from './allianz-fields';
import retained from './allianz-retained-native-body-assets.fixture.json';

export type NativeBodyLinkContext = {
  componentName: 'AllianzCardGrid' | 'AllianzAccordion';
  datasourceId: unknown;
  entryId: unknown;
};

function nativeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const id = value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;
  return /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i.test(id)
    ? id.replaceAll('-', '').toLowerCase() : undefined;
}

function ownerKey(context?: NativeBodyLinkContext): string | undefined {
  if (!context || !['AllianzCardGrid', 'AllianzAccordion'].includes(context.componentName)) return undefined;
  const datasourceId = nativeId(context.datasourceId), entryId = nativeId(context.entryId);
  return datasourceId && entryId ? `${context.componentName}:${datasourceId}:${entryId}` : undefined;
}

// These records preserve existing owned anchor bytes; they do not approve a
// delivery host, reconstruct content, or confer General Link media identity.
const assetHrefs = new Map(retained.assetOwners.map((owner) => [
  `${owner.componentName}:${owner.datasourceId}:${owner.entryId}`, new Set(owner.hrefs),
]));
const excludedOwners = new Set(retained.excludedBodyOwners.map((owner) =>
  `${owner.componentName}:${owner.datasourceId}:${owner.entryId}`));

export function isExcludedNativeBodyOwner(context?: NativeBodyLinkContext): boolean {
  const key = ownerKey(context);
  return key !== undefined && excludedOwners.has(key);
}

export function isRetainedNativeBodyAssetHref(rawHref: string, context?: NativeBodyLinkContext): boolean {
  const key = ownerKey(context);
  return key !== undefined && assetHrefs.get(key)?.has(rawHref) === true;
}

export function isUnavailableNativeBodyHref(decodedHref: string, rawHref: string, context?: NativeBodyLinkContext): boolean {
  if (isExcludedNativeBodyOwner(context) || /#(?:demo|service)-unavailable$/.test(decodedHref)
    || isRetainedNativeBodyAssetHref(rawHref, context)) return false;
  return safeLink({ value: { href: decodedHref } }).value.href === '#service-unavailable';
}

/** Editing and explicitly held owners retain the complete original SDK Field. */
export function safeNativeBodyRichText(field: Field<string> | undefined, isEditing: boolean,
  context?: NativeBodyLinkContext): Field<string> | undefined {
  if (!field || isEditing || !field.value || isExcludedNativeBodyOwner(context)) return field;
  return safeNewsroomRichText(field, false, (decodedHref, rawHref) =>
    isUnavailableNativeBodyHref(decodedHref, rawHref, context));
}
