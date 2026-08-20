export function getRowField(row, field) {
  if (typeof field === 'function') return field(row);
  return row[field];
}

export function hasFilterValue(filter, definition) {
  if (!definition || !filter) return false;

  switch (definition.type) {
    case 'text':
      return String(filter.value ?? '').trim().length > 0;
    case 'select':
      if (definition.multiple) {
        return Array.isArray(filter.value) && filter.value.length > 0;
      }
      return filter.value !== '' && filter.value != null;
    case 'boolean':
      return typeof filter.value === 'boolean';
    case 'date': {
      const range = filter.value ?? {};
      return Boolean(range.from || range.to);
    }
    default:
      return false;
  }
}

export function rowMatchesFieldFilter(row, filter, definition) {
  const raw = getRowField(row, definition.field ?? definition.id);

  switch (definition.type) {
    case 'text': {
      const needle = String(filter.value ?? '').trim().toLowerCase();
      if (!needle) return true;
      return String(raw ?? '').toLowerCase().includes(needle);
    }
    case 'select': {
      if (definition.multiple) {
        const values = (filter.value ?? []).map(String);
        if (!values.length) return true;
        return values.includes(String(raw));
      }
      if (filter.value === '' || filter.value == null) return true;
      return String(raw) === String(filter.value);
    }
    case 'boolean':
      return Boolean(raw) === Boolean(filter.value);
    case 'date': {
      const { from, to } = filter.value ?? {};
      const rowDate = String(raw ?? '').slice(0, 10);
      if (!rowDate) return false;
      if (from && rowDate < from) return false;
      if (to && rowDate > to) return false;
      return true;
    }
    default:
      return true;
  }
}

export function applyFieldFilters(rows, activeFilters, definitions) {
  if (!activeFilters?.length || !definitions?.length) return rows;

  return rows.filter((row) =>
    activeFilters.every((filter) => {
      const definition = definitions.find((item) => item.id === filter.id);
      if (!definition) return true;
      return rowMatchesFieldFilter(row, filter, definition);
    }),
  );
}

export function formatFilterValue(definition, filter) {
  if (!definition || !filter) return '';

  switch (definition.type) {
    case 'text':
      return String(filter.value ?? '');
    case 'select': {
      const findLabel = (value) =>
        definition.options?.find((option) => String(option.value) === String(value))?.label ??
        String(value);

      if (definition.multiple && Array.isArray(filter.value)) {
        return filter.value.map(findLabel).join(', ');
      }
      return findLabel(filter.value);
    }
    case 'boolean':
      return filter.value ? definition.trueLabel ?? 'Ativo' : definition.falseLabel ?? 'Inativo';
    case 'date': {
      const { from, to } = filter.value ?? {};
      if (from && to) return `${formatDateLabel(from)} – ${formatDateLabel(to)}`;
      if (from) return `A partir de ${formatDateLabel(from)}`;
      if (to) return `Até ${formatDateLabel(to)}`;
      return '';
    }
    default:
      return '';
  }
}

function formatDateLabel(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

export function formatLocalDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateInput(days, base = new Date()) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return formatLocalDateInput(date);
}

export function buildDueDateHorizonFilter(days = 30) {
  return {
    id: 'dueDate',
    value: {
      from: '',
      to: addDaysToDateInput(days),
    },
  };
}

export function textFilter(id, label, field = id, placeholder) {
  return { id, label, type: 'text', field, placeholder };
}

export function selectFilter(id, label, field, options, multiple = false) {
  return { id, label, type: 'select', field, options, multiple };
}

export function booleanFilter(id, label, field = id, labels = {}) {
  return {
    id,
    label,
    type: 'boolean',
    field,
    trueLabel: labels.trueLabel ?? 'Ativo',
    falseLabel: labels.falseLabel ?? 'Inativo',
  };
}

export function dateFilter(id, label, field = id) {
  return { id, label, type: 'date', field };
}

export function activeStatusFilter(overrides = {}) {
  return booleanFilter('active', 'Status', 'active', {
    trueLabel: 'Ativo',
    falseLabel: 'Inativo',
    ...overrides,
  });
}
