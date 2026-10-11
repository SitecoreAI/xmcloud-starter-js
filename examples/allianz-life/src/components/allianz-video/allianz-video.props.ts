import type { ComponentProps } from 'lib/component-props';
import type { LinkField } from '@sitecore-content-sdk/nextjs';
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

const BRIGHTCOVE_PLAYER = 'https://players.brightcove.net/1537381467001/WioKPWt4t_default/index.html';

/** Captured Allianz account/player; the iframe/videoId format is documented by Brightcove.
 * https://player.support.brightcove.com/publish/available-options-standard-iframe-embed-code.html
 * Rebuild the URL so author-supplied autoplay, redirects and other player options never run. */
export function brightcoveEmbedSource(field?: LinkField): string {
  const href = field?.value?.href;
  if (typeof href !== 'string' || !href.trim()) return '';
  try {
    const url = new URL(href);
    if (url.origin !== 'https://players.brightcove.net' || url.username || url.password
      || url.pathname !== '/1537381467001/WioKPWt4t_default/index.html' || url.hash) return '';
    const querystring = field?.value?.querystring;
    if (typeof querystring === 'string') {
      new URLSearchParams(querystring.replace(/^\?/, '')).forEach((value, name) => url.searchParams.append(name, value));
    }
    const ids = url.searchParams.getAll('videoId');
    // Edge can include the native querystring in href as well as its own property.
    if (!ids.length || new Set(ids).size !== 1 || !/^[1-9]\d{0,19}$/.test(ids[0])) return '';
    return `${BRIGHTCOVE_PLAYER}?videoId=${ids[0]}&preload=none`;
  } catch {
    return '';
  }
}

/** Assets must be served by this application; external players, APIs, and trackers stay excluded. */
export function localVideoSource(src?: string): string {
  if (!src || !src.startsWith('/') || src.startsWith('//')) return '';
  const url = new URL(src, 'https://www.allianzlife.com');
  return /^\/allianz-assets\/[^/]+\.(?:mp4|webm|ogv)$/i.test(url.pathname) ? src : '';
}
