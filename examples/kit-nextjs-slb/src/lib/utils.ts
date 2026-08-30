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

function configuredBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ''
  ).replace(/\/$/, '');
}

function normalizedHost(host?: string | null): string {
  const firstForwardedHost = host?.split(',', 1)[0]?.trim() || '';

  // Host headers must not be allowed to inject a path or an arbitrary scheme
  // into canonical and Open Graph metadata.
  return /^[a-z0-9.\-:[\]]+(?::\d+)?$/i.test(firstForwardedHost)
    ? firstForwardedHost
    : '';
}

export function getBaseUrl(
  host?: string | null,
  forwardedProtocol?: string | null,
): string {
  const configured = configuredBaseUrl();
  if (configured) return configured;

  const safeHost = normalizedHost(host);
  if (safeHost) {
    const requestedProtocol = forwardedProtocol?.split(',', 1)[0]?.trim();
    const protocol =
      requestedProtocol === 'http' || requestedProtocol === 'https'
        ? requestedProtocol
        : process.env.NODE_ENV === 'development'
          ? 'http'
          : 'https';
    return `${protocol}://${safeHost}`;
  }

  return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
}

export function getFullUrl(path: string, host?: string | null): string {
  const baseUrl = getBaseUrl(host);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
