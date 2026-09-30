import type { ComponentProps } from 'lib/component-props';
import type { ImageValue, LinkValue, TextValue } from 'lib/allianz-fields';
export type AllianzVideoProps = ComponentProps & { fields?: { data?: { datasource?: {
  heading?: TextValue;
  body?: TextValue;
  poster?: ImageValue;
  localVideo?: { jsonValue?: { value?: { src?: string } } };
  mediaLink?: LinkValue;
  transcript?: TextValue;
  caption?: TextValue;
} } } };

/** Assets must be served by this application; external players, APIs, and trackers stay excluded. */
export function localVideoSource(src?: string): string {
  if (!src || !src.startsWith('/') || src.startsWith('//')) return '';
  const url = new URL(src, 'https://www.allianzlife.com');
  return /^\/allianz-assets\/[^/]+\.(?:mp4|webm|ogv)$/i.test(url.pathname) ? src : '';
}
