import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchPayerOptions } from '../api/finance.js';

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

function filterPayers(options, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return options.slice(0, 10);

  return options
    .filter((option) => {
      const haystack = [option.name, option.kindLabel, option.subtitle, option.document]
        .filter(Boolean)
        .map(normalize)
        .join(' ');
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 10);
}

export function PayerSelect({
  payerKind = '',
  payerRefId = '',
  counterpartName = '',
  onValueChange,
  required = true,
  disabled = false,
  placeholder = 'Buscar pagador…',
}) {
  const rootRef = useRef(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(counterpartName || '');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const payerKey = payerKind && payerRefId ? `${payerKind}:${payerRefId}` : '';

  useEffect(() => {
    fetchPayerOptions()
      .then((rows) => setOptions(sortByName(rows)))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (payerKey) {
      const selected = options.find((option) => option.key === payerKey);
      if (selected) setQuery(selected.name);
      return;
    }
    setQuery(counterpartName || '');
  }, [payerKey, counterpartName, options]);

  const selected = useMemo(
    () => options.find((option) => option.key === payerKey) ?? null,
    [options, payerKey],
  );

  const matches = useMemo(() => filterPayers(options, query), [options, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (ev) => {
      if (!rootRef.current?.contains(ev.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const emitChange = (next) => {
    onValueChange?.(next);
  };

  const selectPayer = (option) => {
    setQuery(option.name);
    setOpen(false);
    emitChange({
      payerKind: option.kind,
      payerRefId: option.refId,
      counterpartName: option.name,
      payer: option,
    });
  };

  const onInputChange = (nextQuery) => {
    setQuery(nextQuery);
    setOpen(true);
    emitChange({
      payerKind: '',
      payerRefId: '',
      counterpartName: nextQuery,
      payer: null,
    });
  };

  const onKeyDown = (ev) => {
    if (!open && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || !matches.length) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setHighlightIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setHighlightIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      const item = matches[highlightIndex];
      if (item) selectPayer(item);
      return;
    }
    if (ev.key === 'Escape') setOpen(false);
  };

  if (disabled) {
    return (
      <div className="supplier-lookup supplier-lookup-readonly">
        <span>{selected?.name || counterpartName || '—'}</span>
        {selected?.kindLabel ? <small className="field-hint">{selected.kindLabel}</small> : null}
      </div>
    );
  }

  return (
    <div className="supplier-lookup" ref={rootRef}>
      <div className={`supplier-lookup-control${open ? ' is-open' : ''}${payerKey ? ' has-value' : ''}`}>
        <Search size={16} className="supplier-lookup-icon" aria-hidden="true" />
        <input
          className="input supplier-lookup-input"
          value={query}
          placeholder={loading ? 'Carregando pagadores…' : placeholder}
          required={required && !payerKey && !query.trim()}
          disabled={loading}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="payer-lookup-listbox"
          aria-autocomplete="list"
          onChange={(ev) => onInputChange(ev.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {payerKey ? (
          <span className="supplier-lookup-badge">{selected?.kindLabel ?? 'Cadastrado'}</span>
        ) : null}
      </div>

      {open && !loading ? (
        <div id="payer-lookup-listbox" className="supplier-lookup-menu" role="listbox">
          {matches.length === 0 ? (
            <div className="supplier-lookup-empty">
              Nenhum pagador encontrado. Selecione cliente, empresa ou parceiro cadastrado.
            </div>
          ) : (
            matches.map((option, index) => (
              <button
                key={option.key}
                type="button"
                role="option"
                aria-selected={payerKey === option.key}
                className={`supplier-lookup-option${highlightIndex === index ? ' is-active' : ''}`}
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectPayer(option)}
              >
                <span className="supplier-lookup-option-title">{option.name}</span>
                <span className="supplier-lookup-option-meta">
                  {option.kindLabel}
                  {option.document ? ` · ${option.document}` : ''}
                  {option.subtitle && !option.document ? ` · ${option.subtitle}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {selected ? (
        <p className="field-hint">
          Origem: {selected.kindLabel}
          {selected.document ? ` · ${selected.document}` : ''}
        </p>
      ) : null}
    </div>
  );
}
