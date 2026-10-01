'use client';

import { Image, useSitecore, type ImageField } from '@sitecore-content-sdk/nextjs';

const localIconPattern = /^\/allianz-assets\/[a-z0-9][a-z0-9._-]*\.svg$/i;
export function localIconSource(source?: string): string {
  return typeof source === 'string' && localIconPattern.test(source) ? source : '';
}

// Exact SDK Image sources observed in native Header/Footer editing. Signed
// query values stay in the runtime field; this contract stores no such values.
const nativeIconOrigin = 'https://xmc-sitecoresaaef4e-thltmnpdemof1fc-devdd6f.sitecorecloud.io';
const nativeIconRoot = '/-/media/Project/Allianz-Life/Images/';
const nativeIconNames = new Set([
  'public-0f406fb22be00338.svg', 'public-fb25410fd3ccc058.svg',
  'public-811053ddb60b15b0.svg', 'public-83bd0829d98bb7e1.svg',
  'public-36e8936157e0ae76.svg', 'public-d065087fbfdd8cf9.svg',
  'public-afbc80b2b0647397.svg',
]);
const nativeIconQueryKeys = new Set(['iar', 'ttc', 'tt', 'hash']);
// Public Original versions verified anonymously against the seven exact SVGs.
const contentHubIconSources = new Set([
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/fdf32cf308024d32a5d4f7897640a846?v=1c161fe0',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/0750606db65a4f0fb289d3c16fd69025?v=8aff33d0',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/feea3b26ab3e4c80b2630c011cac2cb4?v=8f3b5986',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/4b48030ff1ac4191af86fd0f8694b9bd?v=198c687c',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/90158d4eb83547e09df64e35cf12130f?v=1b4e0470',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/acfc44f53446417393639f6a0b6bbed1?v=65467624',
  'https://thlt-demo.sitecoresandbox.cloud/api/public/content/a63990dc2da8479786f7a566a1e47f6d?v=27653051',
]);

export function iconImageSource(source?: string): string {
  const local = localIconSource(source);
  if (local) return local;
  if (typeof source === 'string' && contentHubIconSources.has(source)) return source;
  if (typeof source !== 'string' || /[\u0000-\u0020\\]/.test(source)) return '';
  try {
    const url = new URL(source);
    if (url.origin !== nativeIconOrigin || url.username || url.password || url.hash ||
      !url.pathname.startsWith(nativeIconRoot) ||
      !nativeIconNames.has(url.pathname.slice(nativeIconRoot.length)) ||
      [...url.searchParams.keys()].some((name) => !nativeIconQueryKeys.has(name))) return '';
    return source;
  } catch {
    return '';
  }
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
  const source = iconImageSource(field.value?.src);
  if (!source) return null;
  const maskImage = `url(${JSON.stringify(source)})`;
  return <span className="allianz-field-icon" aria-hidden={decorative ? true : undefined}
    role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : iconFieldLabel(field, label)}
    style={{ maskImage, WebkitMaskImage: maskImage }} />;
}
