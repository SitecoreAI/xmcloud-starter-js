import type { LinkField } from '@sitecore-content-sdk/nextjs';

/** Public company links are ordinary HTTP(S) links, not a host-specific allowlist.
 * Return the original field, including intentional blanks and editing metadata. */
export function investmentWebsiteField(field?: LinkField): LinkField | undefined {
  if (!field) return undefined;
  const href = field.value?.href;
  if (href === '' || href === undefined) return field;
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href) || /[\u0000-\u0020\u007f]/.test(href)) return undefined;
  try {
    const url = new URL(href);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname && !url.username && !url.password ? field : undefined;
  } catch { return undefined; }
}
