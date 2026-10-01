'use client';

import { Image, useSitecore, type ImageField } from '@sitecore-content-sdk/nextjs';

// Follow the app-local, single-filename asset policy used for documents/video.
// These observed monochrome icons are SVGs. No connected media origin has been
// verified yet: Edge/media URLs remain a connected-mode gate, not an allowlist.
const localIconPattern = /^\/allianz-assets\/[a-z0-9][a-z0-9._-]*\.svg$/i;
export function localIconSource(source?: string): string {
  return typeof source === 'string' && localIconPattern.test(source) ? source : '';
}
export function iconFieldLabel(field?: ImageField, fallback?: string): string | undefined {
  const alt = field?.value?.alt;
  return typeof alt === 'string' && alt ? alt : fallback || undefined;
}

interface AllianzFieldIconProps {
  field?: ImageField;
  decorative?: boolean;
  label?: string;
}

/** Preserve the authored Image field; visitors use its alpha shape in source teal. */
export function AllianzFieldIcon({ field, decorative = false, label }: AllianzFieldIconProps) {
  const { page } = useSitecore();
  const isEditing = page?.mode?.isEditing ?? false;
  if (!field) return null;
  // A cleared native field must retain the SDK's original authoring metadata.
  if (isEditing) return <Image field={field} editable={true} />;
  const source = localIconSource(field.value?.src);
  if (!source) return null;
  // Validation excludes quotes, backslashes, percent escapes, whitespace,
  // query strings and fragments, so this quoted CSS URL cannot add syntax.
  const maskImage = `url("${source}")`;
  return <span className="allianz-field-icon" aria-hidden={decorative ? true : undefined}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : iconFieldLabel(field, label)}
    style={{ maskImage, WebkitMaskImage: maskImage }} />;
}
