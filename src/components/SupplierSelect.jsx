import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { createSupplier, fetchSupplierOptions } from '../api/finance.js';

const CREATE_OPTION_ID = '__create_supplier__';

function sortByName(rows) {
  return [...rows].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR', {
      sensitivity: 'base',
    }),
  );
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filterSuppliers(options, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return options.slice(0, 8);

  return options
    .filter((option) => {
      const haystack = [
        option.name,
        option.documentFormatted,
        option.primaryPixKey?.keyDisplay,
        option.primaryPixKey?.keyValue,
      ]
        .filter(Boolean)
        .map(normalize)
        .join(' ');
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 8);
}

export function SupplierSelect({
  value,
  counterpartName = '',
  onValueChange,
  required = true,
  disabled = false,
  placeholder = 'Buscar fornecedor…',
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(counterpartName || '');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSupplierOptions()
      .then((rows) => setOptions(sortByName(rows)))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (value) {
      const selected = options.find((option) => option.id === value);
      if (selected) setQuery(selected.name);
      return;
    }
    setQuery(counterpartName || '');
  }, [value, counterpartName, options]);

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const matches = useMemo(() => filterSuppliers(options, query), [options, query]);
  const trimmedQuery = query.trim();
  const exactMatch = useMemo(
    () => options.some((option) => normalize(option.name) === normalize(trimmedQuery)),
    [options, trimmedQuery],
  );
  const showCreateOption = trimmedQuery.length > 0 && !exactMatch;
  const menuItems = showCreateOption
    ? [...matches, { id: CREATE_OPTION_ID, isCreate: true, name: trimmedQuery }]
    : matches;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (ev) => {
      if (!rootRef.current?.contains(ev.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const emitChange = (next) => {
    onValueChange?.(next);
  };

  const mapSupplierOption = (supplier) => ({
    id: supplier.id,
    name: supplier.name,
    documentFormatted: supplier.documentFormatted ?? null,
    primaryPixKey: supplier.primaryPixKey ?? null,
  });

  const selectSupplier = (option) => {
    setQuery(option.name);
    setOpen(false);
    setError('');
    emitChange({
      supplierId: option.id,
      counterpartName: option.name,
      supplier: option,
    });
  };

  const selectCreateNew = async () => {
    if (!trimmedQuery || creating) return;

    setCreating(true);
    setError('');
    try {
      const created = await createSupplier({ name: trimmedQuery, active: true });
      const option = mapSupplierOption(created);
      setOptions((current) => sortByName([...current.filter((item) => item.id !== option.id), option]));
      selectSupplier(option);
    } catch (err) {
      setError(err.message);
      setOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const onInputChange = (nextQuery) => {
    setQuery(nextQuery);
    setOpen(true);
    emitChange({
      supplierId: '',
      counterpartName: nextQuery,
      supplier: null,
    });
  };

  const onKeyDown = (ev) => {
    if (!open && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (!open || !menuItems.length) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setHighlightIndex((index) => (index + 1) % menuItems.length);
      return;
    }

    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setHighlightIndex((index) => (index - 1 + menuItems.length) % menuItems.length);
      return;
    }

    if (ev.key === 'Enter') {
      ev.preventDefault();
      const item = menuItems[highlightIndex];
      if (!item) return;
      if (item.id === CREATE_OPTION_ID) {
        void selectCreateNew();
        return;
      }
      else selectSupplier(item);
      return;
    }

    if (ev.key === 'Escape') {
      setOpen(false);
    }
  };

  if (disabled) {
    return (
      <div className="supplier-lookup supplier-lookup-readonly">
        <span>{selected?.name || counterpartName || '—'}</span>
        {selected?.primaryPixKey ? (
          <small className="field-hint">
            PIX: {selected.primaryPixKey.keyDisplay ?? selected.primaryPixKey.keyValue}
          </small>
        ) : null}
      </div>
    );
  }

  return (
    <div className="supplier-lookup" ref={rootRef}>
      <div className={`supplier-lookup-control${open ? ' is-open' : ''}${value ? ' has-value' : ''}`}>
        <Search size={16} className="supplier-lookup-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          className="input supplier-lookup-input"
          value={query}
          placeholder={loading ? 'Carregando fornecedores…' : placeholder}
          required={required && !value && !trimmedQuery}
          disabled={loading || creating}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="supplier-lookup-listbox"
          aria-autocomplete="list"
          onChange={(ev) => onInputChange(ev.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value ? <span className="supplier-lookup-badge">Cadastrado</span> : null}
      </div>

      {open && !loading ? (
        <div id="supplier-lookup-listbox" className="supplier-lookup-menu" role="listbox">
          {creating ? (
            <div className="supplier-lookup-empty">Cadastrando fornecedor…</div>
          ) : null}

          {!creating && menuItems.length === 0 ? (
            <div className="supplier-lookup-empty">Nenhum fornecedor encontrado.</div>
          ) : null}

          {!creating
            ? matches.map((option) => {
            const itemIndex = menuItems.findIndex((item) => item.id === option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={value === option.id}
                className={`supplier-lookup-option${highlightIndex === itemIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setHighlightIndex(itemIndex)}
                onClick={() => selectSupplier(option)}
              >
                <span className="supplier-lookup-option-title">{option.name}</span>
                <span className="supplier-lookup-option-meta">
                  {option.documentFormatted ? `${option.documentFormatted} · ` : ''}
                  {option.primaryPixKey
                    ? `PIX ${option.primaryPixKey.keyDisplay ?? option.primaryPixKey.keyValue}`
                    : 'Sem PIX principal'}
                </span>
              </button>
            );
          })
            : null}

          {showCreateOption && !creating ? (
            <button
              type="button"
              role="option"
              className={`supplier-lookup-option supplier-lookup-option-create${
                highlightIndex === menuItems.length - 1 ? ' is-active' : ''
              }`}
              onMouseEnter={() => setHighlightIndex(menuItems.length - 1)}
              onClick={() => void selectCreateNew()}
            >
              <Plus size={16} aria-hidden="true" />
              <span>
                Cadastrar fornecedor
                <small>{trimmedQuery}</small>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {selected?.primaryPixKey ? (
        <p className="field-hint">
          PIX principal: {selected.primaryPixKey.keyDisplay ?? selected.primaryPixKey.keyValue}
        </p>
      ) : null}
    </div>
  );
}
