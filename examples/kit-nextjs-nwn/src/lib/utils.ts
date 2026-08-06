import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getYouTubeThumbnail(
  videoId: string,
  width: number,
  height?: number,
): string {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('Invalid YouTube video ID');
  }

  // YouTube thumbnail sizes from largest to smallest
  const thumbnailSizes = [
    { type: 'maxresdefault', width: 1280, height: 720 },
    { type: 'sddefault', width: 640, height: 480 },
    { type: 'hqdefault', width: 480, height: 360 },
    { type: 'mqdefault', width: 320, height: 180 },
    { type: 'default', width: 120, height: 90 },
  ];

  // Find the smallest thumbnail that is larger than the requested size
  // or the largest available if requested size is larger than all options
  let selectedSize = thumbnailSizes[0].type;

  for (const size of thumbnailSizes) {
    if (width <= size.width && (!height || height <= size.height)) {
      selectedSize = size.type;
    } else {
      break;
    }
  }

  return `https://img.youtube.com/vi/${videoId}/${selectedSize}.jpg`;
}

type HeaderReader = Pick<Headers, 'get'>;

const firstHeaderValue = (value: string | null): string | undefined =>
  value?.split(',')[0]?.trim() || undefined;

const normalizeOrigin = (value: string | undefined): string | undefined => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
};

const configuredBaseUrl = (): string | undefined =>
  normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL,
  );

const originFromHost = (
  host: string | null | undefined,
  protocol?: string | null,
): string | undefined => {
  const normalizedHost = firstHeaderValue(host ?? null);
  if (!normalizedHost || /[\s/@\\]/.test(normalizedHost)) return undefined;

  const normalizedProtocol = firstHeaderValue(protocol ?? null)?.toLowerCase();
  const safeProtocol =
    normalizedProtocol === 'http' || normalizedProtocol === 'https'
      ? normalizedProtocol
      : process.env.NODE_ENV === 'development'
        ? 'http'
        : 'https';

  return normalizeOrigin(`${safeProtocol}://${normalizedHost}`);
};

const missingProductionOrigin = (): never => {
  throw new Error(
    'Unable to determine the public site origin. Set NEXT_PUBLIC_SITE_URL or ensure trusted Host/X-Forwarded-* headers are available.',
  );
};

/**
 * Gets the application origin from explicit configuration or a supplied host.
 * Production callers must provide one of those sources; localhost is only a
 * development fallback.
 */
export function getBaseUrl(
  host?: string | null,
  protocol?: string | null,
): string {
  const configuredOrigin = configuredBaseUrl();
  if (configuredOrigin) return configuredOrigin;

  const requestOrigin = originFromHost(host, protocol);
  if (requestOrigin) return requestOrigin;

  return process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : missingProductionOrigin();
}

/** Resolves the public origin from the request headers exposed by Next.js. */
export function getBaseUrlFromHeaders(headers: HeaderReader): string {
  return getBaseUrl(
    firstHeaderValue(headers.get('x-forwarded-host')) || headers.get('host'),
    firstHeaderValue(headers.get('x-forwarded-proto')),
  );
}

/**
 * Get full URL by combining base URL with path
 */
export function getFullUrl(
  path: string,
  host?: string | null,
  protocol?: string | null,
): string {
  const baseUrl = getBaseUrl(host, protocol);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
