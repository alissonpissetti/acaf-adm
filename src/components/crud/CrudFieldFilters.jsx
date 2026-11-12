import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { formatFilterValue, hasFilterValue } from '../../crud/filterUtils.js';

function emptyDraft(definition) {
  switch (definition?.type) {
    case 'text':
      return { value: '' };
    case 'select':
      return { value: definition.multiple ? [] : '' };
    case 'boolean':
      return { value: true };
    case 'date':
      return { value: { from: '', to: '' } };
    default:
      return { value: '' };
  }
}

function FilterEditor({ definition, draft, onDraftChange }) {
  if (!definition) return null;

  if (definition.type === 'text') {
    return (
      <label className="crud-filter-editor-field">
        <span>{definition.label}</span>
        <input
          className="crud-toolbar-input"
          value={draft.value ?? ''}
          placeholder={definition.placeholder ?? 'Contém…'}
          onChange={(ev) => onDraftChange({ value: ev.target.value })}
          autoFocus
        />
      </label>
    );
  }

  if (definition.type === 'select' && definition.multiple) {
    return (
      <div className="crud-filter-editor-field">
        <span>{definition.label}</span>
        <div className="crud-filter-options">
          {(definition.options ?? []).map((option) => {
            const checked = (draft.value ?? []).includes(String(option.value));
            return (
              <label key={String(option.value)} className="permission-checkbox">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(ev) => {
                    const current = new Set((draft.value ?? []).map(String));
                    const key = String(option.value);
                    if (ev.target.checked) current.add(key);
                    else current.delete(key);
                    onDraftChange({ value: [...current] });
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (definition.type === 'select') {
    return (
      <label className="crud-filter-editor-field">
        <span>{definition.label}</span>
        <select
          className="crud-toolbar-select"
          value={draft.value ?? ''}
          onChange={(ev) => onDraftChange({ value: ev.target.value })}
        >
          <option value="">Selecione…</option>
          {(definition.options ?? []).map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (definition.type === 'boolean') {
    return (
      <div className="crud-filter-editor-field">
        <span>{definition.label}</span>
        <div className="crud-filter-boolean">
          <button
            type="button"
            className={draft.value === true ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            onClick={() => onDraftChange({ value: true })}
          >
            {definition.trueLabel ?? 'Ativo'}
          </button>
          <button
            type="button"
            className={draft.value === false ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            onClick={() => onDraftChange({ value: false })}
          >
            {definition.falseLabel ?? 'Inativo'}
          </button>
        </div>
      </div>
    );
  }

  if (definition.type === 'date') {
    return (
      <div className="crud-filter-editor-field crud-filter-editor-dates">
        <label>
          <span>De</span>
          <input
            className="crud-toolbar-input"
            type="date"
            value={draft.value?.from ?? ''}
            onChange={(ev) =>
              onDraftChange({ value: { ...(draft.value ?? {}), from: ev.target.value } })
            }
          />
        </label>
        <label>
          <span>Até</span>
          <input
            className="crud-toolbar-input"
            type="date"
            value={draft.value?.to ?? ''}
            onChange={(ev) =>
              onDraftChange({ value: { ...(draft.value ?? {}), to: ev.target.value } })
            }
          />
        </label>
      </div>
    );
  }

  return null;
}

export function CrudFieldFilterMenu({
  definitions = [],
  activeFilters = [],
  onApplyFilter,
  compact = false,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('list');
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [draft, setDraft] = useState(null);

  const visibleDefinitions = useMemo(() => {
    const term = fieldSearch.trim().toLowerCase();
    if (!term) return definitions;
    return definitions.filter((item) => item.label.toLowerCase().includes(term));
  }, [definitions, fieldSearch]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setStep('list');
        setSelectedDefinition(null);
        setFieldSearch('');
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!definitions.length) return null;

  const activeCount = activeFilters.filter((filter) => {
    const definition = definitions.find((item) => item.id === filter.id);
    return definition && hasFilterValue(filter, definition);
  }).length;

  const openDefinition = (definition) => {
    const existing = activeFilters.find((item) => item.id === definition.id);
    setSelectedDefinition(definition);
    setDraft(existing ?? { id: definition.id, ...emptyDraft(definition) });
    setStep('edit');
  };

  const applyDraft = () => {
    if (!selectedDefinition || !draft) return;
    const payload = { id: selectedDefinition.id, ...draft };
    if (!hasFilterValue(payload, selectedDefinition)) return;
    onApplyFilter?.(payload);
    setOpen(false);
    setStep('list');
    setSelectedDefinition(null);
    setFieldSearch('');
  };

  return (
    <div className={`crud-field-filters${compact ? ' crud-field-filters--compact' : ''}`} ref={rootRef}>
      <div className="crud-filter-trigger-wrap">
        <button
          type="button"
          className={`crud-filter-trigger${compact ? ' crud-filter-trigger--compact' : ''}${open ? ' is-open' : ''}`}
          aria-expanded={open}
          onClick={() => {
            setOpen((current) => !current);
            setStep('list');
            setSelectedDefinition(null);
            setFieldSearch('');
          }}
        >
          <Filter size={14} aria-hidden />
          Filtrar
          {activeCount > 0 ? (
            <span className="crud-filter-trigger-count" aria-label={`${activeCount} filtro(s) ativo(s)`}>
              {activeCount}
            </span>
          ) : null}
        </button>

        {open ? (
          <div
            className={`crud-filter-panel${compact ? ' crud-filter-panel--compact' : ''}`}
            role="dialog"
            aria-label="Filtros da listagem"
          >
            {step === 'list' ? (
              <>
                <div className="crud-filter-panel-search">
                  <Search size={14} aria-hidden />
                  <input
                    type="search"
                    value={fieldSearch}
                    onChange={(ev) => setFieldSearch(ev.target.value)}
                    placeholder="Buscar campo…"
                  />
                </div>
                <div className="crud-filter-panel-list">
                  {visibleDefinitions.length ? (
                    visibleDefinitions.map((definition) => (
                      <button
                        key={definition.id}
                        type="button"
                        className="crud-filter-panel-item"
                        onClick={() => openDefinition(definition)}
                      >
                        {definition.label}
                      </button>
                    ))
                  ) : (
                    <p className="crud-filter-panel-empty">Nenhum campo encontrado.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="crud-filter-panel-edit">
                <button
                  type="button"
                  className="crud-filter-back"
                  onClick={() => {
                    setStep('list');
                    setSelectedDefinition(null);
                  }}
                >
                  ← Campos
                </button>
                <FilterEditor
                  definition={selectedDefinition}
                  draft={draft}
                  onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
                />
                <div className="crud-filter-panel-actions">
                  <button type="button" className="btn-primary btn-sm" onClick={applyDraft}>
                    Aplicar filtro
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setOpen(false);
                      setStep('list');
                      setSelectedDefinition(null);
                    }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CrudActiveFilterChips({
  definitions = [],
  activeFilters = [],
  onRemoveFilter,
  onClearFilters,
}) {
  if (!activeFilters.length) return null;

  return (
    <div className="crud-active-filters" aria-label="Filtros ativos">
      {activeFilters.map((filter) => {
        const definition = definitions.find((item) => item.id === filter.id);
        if (!definition) return null;
        return (
          <span key={filter.id} className="crud-filter-chip">
            <span className="crud-filter-chip-label">{definition.label}</span>
            <span className="crud-filter-chip-value">{formatFilterValue(definition, filter)}</span>
            <button
              type="button"
              className="crud-filter-chip-remove"
              aria-label={`Remover filtro ${definition.label}`}
              onClick={() => onRemoveFilter?.(filter.id)}
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        );
      })}
      {activeFilters.length > 1 ? (
        <button type="button" className="crud-filter-clear" onClick={() => onClearFilters?.()}>
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
