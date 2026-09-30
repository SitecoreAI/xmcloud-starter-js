/** Fail closed when native pagination/depth would omit authored child content. */
export function collectionsComplete(value: unknown, requireMetadata = false): boolean {
  if (!value || typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.every((entry) => collectionsComplete(entry, requireMetadata));
  const record = value as Record<string, unknown>;
  if (record.children && typeof record.children === 'object') {
    const connection = record.children as { results?: unknown[]; total?: number; pageInfo?: { hasNext?: boolean } };
    if (requireMetadata && (typeof connection.total !== 'number' || typeof connection.pageInfo?.hasNext !== 'boolean')) return false;
    if (connection.pageInfo?.hasNext) return false;
    if (typeof connection.total === 'number' && (!Number.isInteger(connection.total) || connection.total < 0 || connection.total !== (connection.results?.length || 0))) return false;
  }
  return Object.values(record).every((entry) => collectionsComplete(entry, requireMetadata));
}
