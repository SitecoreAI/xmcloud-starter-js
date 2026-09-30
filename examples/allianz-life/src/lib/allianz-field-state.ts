import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { safeLink } from './allianz-fields';

/** Keep real empty fields mounted so the SDK can render their authoring chrome. */
export function shouldRenderTextField(field: Field<string> | undefined, isEditing: boolean): boolean {
  return Boolean(field && (isEditing || field.value));
}

export function shouldRenderImageField(field: ImageField | undefined, isEditing: boolean): boolean {
  return Boolean(field && (isEditing || field.value?.src));
}

export function shouldRenderLinkField(field: LinkField | undefined, isEditing: boolean): boolean {
  return Boolean(field && (isEditing || field.value?.href));
}

/** Never turn a cleared native link into a synthetic homepage link. */
export function allianzLinkField(field: LinkField | undefined, isEditing: boolean): LinkField {
  if (!field) return { value: { href: '' } };
  return isEditing || !field.value?.href ? field : safeLink(field);
}
