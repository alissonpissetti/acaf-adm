import { useEffect, useMemo, useState } from 'react';
import { filterRows, paginateRows, sortRows } from './listUtils.js';
import { applyFieldFilters, hasFilterValue } from './filterUtils.js';
import { loadListPreferences, saveListPreferences } from '../utils/listPreferencesStorage.js';

function mergeFieldFilters(defaultFieldFilters, fieldFilters, suppressedDefaultIds) {
  const merged = [];

  for (const defaultFilter of defaultFieldFilters) {
    if (suppressedDefaultIds.has(defaultFilter.id)) continue;
    const userFilter = fieldFilters.find((item) => item.id === defaultFilter.id);
    merged.push(userFilter ?? defaultFilter);
  }

  for (const filter of fieldFilters) {
    if (defaultFieldFilters.some((item) => item.id === filter.id)) continue;
    merged.push(filter);
  }

  return merged;
}

export function useCrudList(items, options = {}) {
  const {
    searchKeys = ['name'],
    filterDefinitions = [],
    defaultFieldFilters = [],
    defaultSort = { key: 'name', direction: 'asc' },
    defaultPageSize = 10,
    storageKey = null,
    matchesSearch = null,
  } = options;

  const savedPreferences = useMemo(
    () => (storageKey ? loadListPreferences(storageKey) : null),
    [storageKey],
  );

  const [query, setQuery] = useState(() => savedPreferences?.query ?? '');
  const [fieldFilters, setFieldFilters] = useState(() => savedPreferences?.fieldFilters ?? []);
  const [suppressedDefaultFilterIds, setSuppressedDefaultFilterIds] = useState(
    () => new Set(savedPreferences?.suppressedDefaultFilterIds ?? []),
  );
  const [sortKey, setSortKey] = useState(() => savedPreferences?.sortKey ?? defaultSort.key);
  const [sortDirection, setSortDirection] = useState(
    () => savedPreferences?.sortDirection ?? defaultSort.direction,
  );
  const [page, setPage] = useState(() => savedPreferences?.page ?? 1);
  const [pageSize, setPageSize] = useState(
    () => savedPreferences?.pageSize ?? defaultPageSize,
  );

  useEffect(() => {
    if (!storageKey) return;

    saveListPreferences(storageKey, {
      query,
      sortKey,
      sortDirection,
      page,
      pageSize,
      fieldFilters,
      suppressedDefaultFilterIds: [...suppressedDefaultFilterIds],
    });
  }, [
    storageKey,
    query,
    sortKey,
    sortDirection,
    page,
    pageSize,
    fieldFilters,
    suppressedDefaultFilterIds,
  ]);

  const effectiveFieldFilters = useMemo(
    () => mergeFieldFilters(defaultFieldFilters, fieldFilters, suppressedDefaultFilterIds),
    [defaultFieldFilters, fieldFilters, suppressedDefaultFilterIds],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    let byQuery = items;

    if (trimmed) {
      if (typeof matchesSearch === 'function') {
        byQuery = items.filter((row) => matchesSearch(row, query));
      } else {
        byQuery = filterRows(items, query, searchKeys);
      }
    }

    return applyFieldFilters(byQuery, effectiveFieldFilters, filterDefinitions);
  }, [items, query, searchKeys, effectiveFieldFilters, filterDefinitions, matchesSearch]);

  const sorted = useMemo(
    () => sortRows(filtered, sortKey, sortDirection),
    [filtered, sortKey, sortDirection],
  );

  const pagination = useMemo(
    () => paginateRows(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  const setSort = (key, direction = 'asc') => {
    setSortKey(key);
    setSortDirection(direction);
    setPage(1);
  };

  const onQueryChange = (value) => {
    setQuery(value);
    setPage(1);
  };

  const onPageSizeChange = (value) => {
    setPageSize(Number(value) || defaultPageSize);
    setPage(1);
  };

  const applyFieldFilter = (filter) => {
    const definition = filterDefinitions.find((item) => item.id === filter.id);
    if (!definition || !hasFilterValue(filter, definition)) return;

    setSuppressedDefaultFilterIds((current) => {
      if (!current.has(filter.id)) return current;
      const next = new Set(current);
      next.delete(filter.id);
      return next;
    });

    setFieldFilters((current) => {
      const next = current.filter((item) => item.id !== filter.id);
      next.push(filter);
      return next;
    });
    setPage(1);
  };

  const removeFieldFilter = (filterId) => {
    const hasUserFilter = fieldFilters.some((item) => item.id === filterId);
    const hasDefaultFilter = defaultFieldFilters.some((item) => item.id === filterId);

    if (hasUserFilter) {
      setFieldFilters((current) => current.filter((item) => item.id !== filterId));
    } else if (hasDefaultFilter) {
      setSuppressedDefaultFilterIds((current) => new Set(current).add(filterId));
    }
    setPage(1);
  };

  const clearFieldFilters = () => {
    setFieldFilters([]);
    setSuppressedDefaultFilterIds(new Set());
    setPage(1);
  };

  return {
    query,
    onQueryChange,
    fieldFilters: effectiveFieldFilters,
    applyFieldFilter,
    removeFieldFilter,
    clearFieldFilters,
    sortKey,
    sortDirection,
    setSort,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    totalItems: pagination.total,
    setPage,
    onPageSizeChange,
    rows: pagination.rows,
    allRows: sorted,
    filteredCount: filtered.length,
  };
}
