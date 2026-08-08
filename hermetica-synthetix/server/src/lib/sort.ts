/**
 * Base44 SDK sort convention: comma-separated field list, "-field" for
 * descending (e.g. "-created_date,name"). Mirrors that here for Prisma orderBy.
 */
export function parseSort(sort?: string): Array<Record<string, 'asc' | 'desc'>> | undefined {
  if (!sort) return undefined;
  const parts = sort.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((part) => {
    if (part.startsWith('-')) return { [part.slice(1)]: 'desc' as const };
    return { [part]: 'asc' as const };
  });
}
