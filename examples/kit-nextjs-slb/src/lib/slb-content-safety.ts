const legacySolterraPatterns = [
  /\bsolterr?a\b(?:\s*(?:&|and)\s*co\.?\b)?/i,
  /\bthe ordinary kit\b/i,
  /\bessential beauty\b/i,
  /\binspired brands company\b/i,
];

/**
 * Detects known content signatures from the starter site that preceded SLB.
 * The recursive check covers route fields, component fields, media URLs, and
 * GraphQL wrappers without depending on a particular Content SDK shape.
 */
export function hasLegacySolterraSignature(value: unknown): boolean {
  const seen = new WeakSet<object>();

  const visit = (candidate: unknown): boolean => {
    if (typeof candidate === 'string') {
      return legacySolterraPatterns.some((pattern) => pattern.test(candidate));
    }

    if (!candidate || typeof candidate !== 'object') return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);

    if (Array.isArray(candidate)) return candidate.some(visit);
    return Object.values(candidate as Record<string, unknown>).some(visit);
  };

  return visit(value);
}

export function readSlbFieldText(field: unknown): string | undefined {
  if (typeof field === 'string') return field.trim() || undefined;
  if (!field || typeof field !== 'object') return undefined;

  const record = field as Record<string, unknown>;
  const raw = record.value ?? record.jsonValue;
  if (typeof raw === 'string') return raw.trim() || undefined;
  if (raw && typeof raw === 'object') return readSlbFieldText(raw);
  return undefined;
}

export function hasLegacySolterraRouteContent(route: unknown): boolean {
  if (!route || typeof route !== 'object') return false;

  const routeRecord = route as {
    fields?: unknown;
    placeholders?: Record<string, unknown>;
  };

  return (
    hasLegacySolterraSignature(routeRecord.fields) ||
    hasLegacySolterraSignature(routeRecord.placeholders?.['headless-main'])
  );
}

/**
 * Removes inherited starter-kit data before a fallback page is serialized to
 * client components. The copy is intentionally shallow at each Sitecore
 * boundary so the original page remains untouched for server-side decisions.
 */
export function sanitizeLegacySolterraPage<T>(page: T): T {
  if (!page || typeof page !== 'object') return page;

  const pageRecord = page as Record<string, unknown>;
  const layout = pageRecord.layout;
  if (!layout || typeof layout !== 'object') return page;

  const layoutRecord = layout as Record<string, unknown>;
  const sitecore = layoutRecord.sitecore;
  if (!sitecore || typeof sitecore !== 'object') return page;

  const sitecoreRecord = sitecore as Record<string, unknown>;
  const route = sitecoreRecord.route;
  if (!route || typeof route !== 'object') return page;

  const routeRecord = route as Record<string, unknown>;
  const isInheritedStarterRoute = hasLegacySolterraRouteContent(routeRecord);
  const fields = routeRecord.fields;
  const safeFields = isInheritedStarterRoute
    ? {}
    : fields && typeof fields === 'object' && !Array.isArray(fields)
      ? Object.fromEntries(
          Object.entries(fields as Record<string, unknown>).filter(
            ([, value]) => !hasLegacySolterraSignature(value),
          ),
        )
      : fields;

  const placeholders = routeRecord.placeholders;
  const safePlaceholders =
    placeholders &&
    typeof placeholders === 'object' &&
    !Array.isArray(placeholders)
      ? Object.fromEntries(
          Object.entries(placeholders as Record<string, unknown>).map(
            ([name, presentation]) => [
              name,
              isInheritedStarterRoute
                ? []
                : Array.isArray(presentation)
                  ? presentation.filter(
                      (rendering) => !hasLegacySolterraSignature(rendering),
                    )
                  : hasLegacySolterraSignature(presentation)
                    ? []
                    : presentation,
            ],
          ),
        )
      : placeholders;

  return {
    ...pageRecord,
    layout: {
      ...layoutRecord,
      sitecore: {
        ...sitecoreRecord,
        route: {
          ...routeRecord,
          fields: safeFields,
          placeholders: safePlaceholders,
        },
      },
    },
  } as T;
}
