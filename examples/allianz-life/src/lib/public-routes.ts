export interface PublicRouteRecord { aliases?: string[] }

export function canonicalPath(value: string): string | null {
  try {
    const url = new URL(value, 'https://www.allianzlife.com');
    if (url.origin !== 'https://www.allianzlife.com') return null;
    return (url.pathname.split('/').map((part) => {
      try { return decodeURIComponent(part); } catch { return part; }
    }).join('/').replace(/\/$/, '') || '/').toLowerCase();
  } catch { return null; }
}

/** Resolve only aliases recorded for actual public canonical source routes. */
export function publicRouteAliases(routes: Record<string, PublicRouteRecord>) {
  const result = new Map<string, string>();
  for (const [path, record] of Object.entries(routes)) {
    for (const alias of record.aliases || []) {
      const key = canonicalPath(alias);
      if (!key || key in routes || (result.has(key) && result.get(key) !== path)) continue;
      result.set(key, path);
    }
  }
  return result;
}
