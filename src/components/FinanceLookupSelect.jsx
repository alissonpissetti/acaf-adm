import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function defaultFinanceLookupFilter(options, query, getSearchText) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return options.slice(0, 12);

  return options
    .filter((option) => normalize(getSearchText(option)).includes(normalizedQuery))
    .slice(0, 12);
}

export function FinanceLookupSelect({
  value,
  onChange,
  options = [],
  loading = false,
  disabled = false,
  required = true,
  placeholder = 'Buscar…',
  loadingPlaceholder = 'Carregando…',
  emptyLabel = 'Nenhum resultado encontrado.',
  getOptionValue = (option) => option.id,
  getOptionTitle = (option) => option.name ?? '',
  getOptionMeta = () => '',
  filterOptions = defaultFinanceLookupFilter,
  listboxId = 'finance-lookup-listbox',
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(
    () => options.find((option) => getOptionValue(option) === value) ?? null,
    [options, value, getOptionValue],
  );

  useEffect(() => {
    if (selected) {
      setQuery(getOptionTitle(selected));
      return;
    }
    if (!value) setQuery('');
  }, [selected, value, getOptionTitle]);

  const matches = useMemo(
    () =>
      filterOptions(
        options,
        query,
        (option) => [getOptionTitle(option), getOptionMeta(option)].filter(Boolean).join(' '),
      ),
    [options, query, filterOptions, getOptionTitle, getOptionMeta],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const selectOption = (option) => {
    const nextValue = getOptionValue(option);
    setQuery(getOptionTitle(option));
    setOpen(false);
    onChange?.(nextValue);
  };

  const onInputChange = (nextQuery) => {
    setQuery(nextQuery);
    setOpen(true);
    if (!nextQuery.trim() && !required) {
      onChange?.('');
    }
  };

  const onBlur = () => {
    if (selected) {
      setQuery(getOptionTitle(selected));
      return;
    }
    if (!required) {
      if (!query.trim()) onChange?.('');
      return;
    }
    setQuery('');
  };

  const onKeyDown = (event) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || !matches.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = matches[highlightIndex];
      if (item) selectOption(item);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  if (disabled) {
    return (
      <div className="supplier-lookup supplier-lookup-readonly">
        <span>{selected ? getOptionTitle(selected) : '—'}</span>
        {selected && getOptionMeta(selected) ? (
          <small className="field-hint">{getOptionMeta(selected)}</small>
        ) : null}
      </div>
    );
  }

  return (
    <div className="supplier-lookup" ref={rootRef}>
      <div className={`supplier-lookup-control${open ? ' is-open' : ''}${value ? ' has-value' : ''}`}>
        <Search size={16} className="supplier-lookup-icon" aria-hidden="true" />
        <input
          className="input supplier-lookup-input"
          value={query}
          placeholder={loading ? loadingPlaceholder : placeholder}
          required={required && !value}
          disabled={loading}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        />
        {value ? <span className="supplier-lookup-badge">Selecionado</span> : null}
      </div>

      {open && !loading ? (
        <div id={listboxId} className="supplier-lookup-menu" role="listbox">
          {matches.length === 0 ? (
            <div className="supplier-lookup-empty">{emptyLabel}</div>
          ) : (
            matches.map((option, index) => {
              const optionValue = getOptionValue(option);
              const meta = getOptionMeta(option);
              return (
                <button
                  key={optionValue}
                  type="button"
                  role="option"
                  aria-selected={value === optionValue}
                  className={`supplier-lookup-option${highlightIndex === index ? ' is-active' : ''}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span className="supplier-lookup-option-title">{getOptionTitle(option)}</span>
                  {meta ? <span className="supplier-lookup-option-meta">{meta}</span> : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
