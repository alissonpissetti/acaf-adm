import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { fetchChangelog } from '../api/changelog.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import '../styles/changelog.css';

const PAGE_SIZE = 30;

function formatDayLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Data desconhecida';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Hoje';
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(entries) {
  const map = new Map();
  for (const row of entries) {
    const key = String(row.committedAt ?? '').slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function categoryPillClass(category) {
  return `changelog-pill changelog-pill--${category ?? 'maintenance'}`;
}

export function ChangelogPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [areas, setAreas] = useState([]);
  const [categories, setCategories] = useState([]);

  const [area, setArea] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  const hasMore = items.length < total;

  const load = useCallback(
    async ({ append = false, offset = 0 } = {}) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      try {
        const data = await fetchChangelog({
          limit: PAGE_SIZE,
          offset,
          area,
          category,
          q: query,
        });
        const rows = Array.isArray(data.entries) ? data.entries : [];
        setTotal(typeof data.total === 'number' ? data.total : rows.length);
        setAreas(
          Array.isArray(data.environments) && data.environments.length
            ? data.environments
            : Array.isArray(data.areas)
              ? data.areas
              : [],
        );
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setItems((prev) => (append ? [...prev, ...rows] : rows));
      } catch (err) {
        setError(err.message);
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [area, category, query],
  );

  useEffect(() => {
    void load({ append: false, offset: 0 });
  }, [load]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  return (
    <PermissionGate
      permission="sistema.changelog"
      fallback={<p className="muted">Sem permissão para ver o histórico de atualizações.</p>}
    >
      <div className="changelog-page">
        <PageHeader
          title="Atualizações"
          description="Novidades e correções do projeto — alimentado pelos commits e pelo hook Git."
          icon={<Sparkles size={22} aria-hidden="true" />}
        />

        <p className="changelog-hint">
          Para registrar automaticamente a cada commit, rode{' '}
          <code>./scripts/install-git-hooks.sh</code> na raiz do repositório. Use a seção{' '}
          <strong>Changelog:</strong> para bullets amigáveis. Os <strong>ambientes</strong> (admin, API,
          parceiro, app, corporativo, site) vêm das pastas alteradas, do escopo do commit{' '}
          <code>feat(adm):</code> ou da linha <code>Ambientes: adm, api</code>. Commits com{' '}
          <code>[skip changelog]</code> são ignorados.
        </p>

        <div className="changelog-toolbar" role="search">
          <input
            type="search"
            placeholder="Buscar no histórico…"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            aria-label="Buscar atualizações"
          />
          <select value={area} onChange={(ev) => setArea(ev.target.value)} aria-label="Filtrar por ambiente">
            <option value="">Todos os ambientes</option>
            {areas.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(ev) => setCategory(ev.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos os tipos</option>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-ghost" onClick={() => void load()} title="Atualizar lista">
            <RefreshCw size={18} aria-hidden="true" />
            <span className="sr-only">Atualizar</span>
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {loading && items.length === 0 ? (
          <AppLoadingPanel label="Carregando atualizações…" />
        ) : items.length === 0 ? (
          <p className="muted">Nenhuma entrada ainda. Faça um commit com o hook ativo ou edite changelog/changelog.json.</p>
        ) : (
          <>
            {grouped.map(([dayKey, dayItems]) => (
              <section key={dayKey} className="changelog-day" aria-labelledby={`changelog-day-${dayKey}`}>
                <h2 id={`changelog-day-${dayKey}`} className="changelog-day__title">
                  {formatDayLabel(dayItems[0]?.committedAt)}
                </h2>
                <ul className="changelog-list">
                  {dayItems.map((entry) => (
                    <li key={entry.id}>
                      <article className="changelog-card">
                        <header className="changelog-card__head">
                          <h3 className="changelog-card__title">{entry.title}</h3>
                          <div className="changelog-card__meta">
                            <span className={categoryPillClass(entry.category)}>{entry.categoryLabel}</span>
                            <time dateTime={entry.committedAt}>{formatTime(entry.committedAt)}</time>
                          </div>
                        </header>
                        {entry.summary ? <p className="changelog-card__summary">{entry.summary}</p> : null}
                        {entry.highlights?.length ? (
                          <ul className="changelog-card__highlights">
                            {entry.highlights.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        ) : null}
                        {entry.areas?.length ? (
                          <div className="changelog-areas" aria-label="Ambientes afetados">
                            {entry.areas.map((areaRow) => (
                              <span key={areaRow.id} className="changelog-area-tag">
                                {areaRow.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <footer className="changelog-card__foot">
                          {entry.author ? <span>{entry.author}</span> : null}
                          {entry.commitSha ? (
                            <span title={entry.commitSha}>
                              Commit {entry.commitSha.slice(0, 7)}
                            </span>
                          ) : null}
                        </footer>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {hasMore ? (
              <div className="changelog-more">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loadingMore}
                  onClick={() => void load({ append: true, offset: items.length })}
                >
                  {loadingMore ? 'Carregando…' : 'Carregar mais'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PermissionGate>
  );
}
