export function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true });
}

export function sortRows(rows, sortKey, direction = 'asc', getSortValue = null) {
  if (!sortKey) return rows;
  const factor = direction === 'desc' ? -1 : 1;
  const valueOf =
    typeof getSortValue === 'function'
      ? (row) => getSortValue(row, sortKey)
      : (row) => row[sortKey];
  return [...rows].sort(
    (left, right) => factor * compareValues(valueOf(left), valueOf(right)),
  );
}

export function filterRows(rows, query, keys) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return rows;
  return rows.filter((row) =>
    keys.some((key) => String(row[key] ?? '').toLowerCase().includes(trimmed)),
  );
}

export function paginateRows(rows, page, pageSize) {
  const safePageSize = Math.max(1, pageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;
  return {
    rows: rows.slice(start, start + safePageSize),
    total,
    totalPages,
    page: safePage,
    pageSize: safePageSize,
  };
}
