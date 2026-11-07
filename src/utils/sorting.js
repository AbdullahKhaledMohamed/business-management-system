/**
 * Resolves a requested sort field/order against an explicit allowlist.
 * NEVER interpolate a client-supplied column name directly into SQL —
 * always map it through this allowlist first, whether used in a Prisma
 * `orderBy` or built into a raw SQL fragment.
 */
export function resolveSort(query, allowedFields, defaultField, defaultOrder = 'desc') {
  const field = allowedFields[query.sortBy] ? query.sortBy : defaultField;
  const order = query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : defaultOrder;
  return { field, column: allowedFields[field], order };
}
