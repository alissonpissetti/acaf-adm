import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  ALL_LUCIDE_ICON_NAMES,
  ICON_CATEGORIES,
  ModuleIcon,
  filterIconNames,
} from '../utils/icons.jsx';
import '../styles/icon-picker.css';

export function IconPicker({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('recommended');

  const icons = useMemo(() => filterIconNames(query, categoryId), [categoryId, query]);
  const isSearching = query.trim().length > 0;

  return (
    <div className="icon-picker-shell">
      <div className="icon-picker-selected">
        <span className="icon-picker-selected-preview" aria-hidden="true">
          <ModuleIcon name={value} size={26} />
        </span>
        <div className="icon-picker-selected-copy">
          <strong>{value || 'LayoutGrid'}</strong>
          <span>Ícone exibido na sidebar e no menu do módulo</span>
        </div>
      </div>

      <label className="icon-picker-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder={`Buscar entre ${ALL_LUCIDE_ICON_NAMES.length} ícones…`}
          onChange={(ev) => setQuery(ev.target.value)}
        />
      </label>

      {!isSearching ? (
        <div className="icon-picker-categories" role="tablist" aria-label="Categorias de ícones">
          {ICON_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={categoryId === category.id}
              className={`icon-picker-category${categoryId === category.id ? ' icon-picker-category--active' : ''}`}
              onClick={() => setCategoryId(category.id)}
            >
              {category.label}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={categoryId === 'all'}
            className={`icon-picker-category${categoryId === 'all' ? ' icon-picker-category--active' : ''}`}
            onClick={() => setCategoryId('all')}
          >
            Todos
          </button>
        </div>
      ) : null}

      <div className="icon-picker-meta">
        {isSearching
          ? `${icons.length} resultado(s) para "${query.trim()}"`
          : `${icons.length} ícone(s) nesta categoria`}
      </div>

      {icons.length === 0 ? (
        <div className="icon-picker-empty">Nenhum ícone encontrado. Tente outro termo.</div>
      ) : (
        <div className="icon-picker-grid" role="listbox" aria-label="Ícones disponíveis">
          {icons.map((icon) => {
            const active = value === icon;
            return (
              <button
                key={icon}
                type="button"
                role="option"
                aria-selected={active}
                className={`icon-picker-btn${active ? ' active' : ''}`}
                onClick={() => onChange(icon)}
                title={icon}
              >
                <ModuleIcon name={icon} size={20} />
                <span>{icon}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
