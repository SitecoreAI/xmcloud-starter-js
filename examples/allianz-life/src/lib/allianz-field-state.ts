import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import { safeLink } from './allianz-fields';

/** Render source content consistently in Page Builder and normal mode.
 * Empty optional fields remain available through the content field panel.
 * Populated fields still pass unchanged to the native SDK field components.
 */
export function shouldRenderTextField(field: Field<string> | undefined, isEditing: boolean): boolean {
  void isEditing;
  return Boolean(field?.value);
}

export function shouldRenderImageField(field: ImageField | undefined, isEditing: boolean): boolean {
  void isEditing;
  return Boolean(field?.value?.src);
}

export function shouldRenderLinkField(field: LinkField | undefined, isEditing: boolean): boolean {
  void isEditing;
  return Boolean(field?.value?.href);
}

/** Never turn a cleared native link into a synthetic homepage link. */
export function allianzLinkField(field: LinkField | undefined, isEditing: boolean): LinkField {
  if (!field) return { value: { href: '' } };
  return isEditing || !field.value?.href ? field : safeLink(field);
}
