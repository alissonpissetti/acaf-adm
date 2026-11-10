import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { fetchChangelog, syncChangelogFromGit } from '../api/changelog.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
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

function formatScheduleStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { time: '—', dateShort: '—', dateLong: 'Data inválida', title: '' };
  }
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateShort = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const dateLong = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return {
    time,
    dateShort,
    dateLong,
    title: `${dateLong} às ${time}`,
  };
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
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

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

  const syncFromGit = useCallback(async () => {
    setSyncing(true);
    setSyncNotice('');
    try {
      const result = await syncChangelogFromGit();
      const added = Number(result?.added ?? 0);
      setSyncNotice(
        added > 0
          ? `${added} entrada(s) importada(s) do Git.`
          : 'Nenhuma entrada nova para importar.',
      );
      await load({ append: false, offset: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }, [load]);

  return (
    <PermissionGate
      permission="sistema.changelog"
      fallback={<p className="muted">Sem permissão para ver o histórico de atualizações.</p>}
    >
      <div className="page-stack changelog-page">
        <PageHeader
          title="Atualizações"
          subtitle="Cronograma de novidades e correções, com data e hora de cada registro."
        />

        <CrudAlerts error={error} message={syncNotice} />

        <section className="panel changelog-panel" aria-label="Histórico de atualizações">
          <div className="panel-header panel-header--meta-only">
            <span className="panel-meta">
              {loading && items.length === 0 ? 'Carregando…' : `${total} registro(s)`}
            </span>
          </div>

          <div className="panel-body changelog-panel__body">
            <div className="changelog-toolbar" role="search">
              <label className="changelog-search">
                <Search size={16} aria-hidden="true" />
                <input
                  className="changelog-search__input"
                  type="search"
                  placeholder="Buscar…"
                  value={query}
                  onChange={(ev) => setQuery(ev.target.value)}
                  aria-label="Buscar atualizações"
                />
              </label>

              <select
                className="changelog-filter"
                value={area}
                onChange={(ev) => setArea(ev.target.value)}
                aria-label="Ambiente"
              >
                <option value="">Ambiente</option>
                {areas.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>

              <select
                className="changelog-filter"
                value={category}
                onChange={(ev) => setCategory(ev.target.value)}
                aria-label="Tipo"
              >
                <option value="">Tipo</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>

              <div className="changelog-toolbar__actions">
                <button
                  type="button"
                  className="btn-ghost btn-sm changelog-toolbar__btn"
                  onClick={() => void load()}
                  disabled={loading}
                  title="Atualizar lista"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  <span>Atualizar</span>
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm changelog-toolbar__btn"
                  disabled={syncing}
                  onClick={() => void syncFromGit()}
                  title="Gravar entradas faltantes a partir do Git"
                >
                  <Download size={16} aria-hidden="true" />
                  <span>{syncing ? 'Importando…' : 'Importar do Git'}</span>
                </button>
              </div>
            </div>

            {loading && items.length === 0 ? (
              <AppLoadingPanel label="Carregando atualizações…" />
            ) : items.length === 0 ? (
              <p className="changelog-empty muted">Nenhuma atualização encontrada.</p>
            ) : (
              <div className="changelog-feed changelog-cronograma">
                {grouped.map(([dayKey, dayItems]) => (
                  <section key={dayKey} className="changelog-day" aria-labelledby={`changelog-day-${dayKey}`}>
                    <h2 id={`changelog-day-${dayKey}`} className="changelog-day__title">
                      {formatDayLabel(dayItems[0]?.committedAt)}
                    </h2>
                    <ol className="changelog-timeline">
                      {dayItems.map((entry) => {
                        const stamp = formatScheduleStamp(entry.committedAt);
                        return (
                          <li key={entry.id} className="changelog-timeline__row">
                            <div
                              className="changelog-timeline__stamp"
                              aria-label={stamp.title}
                              title={stamp.title}
                            >
                              <time dateTime={entry.committedAt}>
                                <span className="changelog-timeline__time">{stamp.time}</span>
                                <span className="changelog-timeline__date">{stamp.dateShort}</span>
                              </time>
                            </div>
                            <div className="changelog-timeline__rail" aria-hidden="true">
                              <span className="changelog-timeline__dot" />
                            </div>
                            <article className="changelog-card">
                              <header className="changelog-card__head">
                                <div className="changelog-card__head-main">
                                  <time
                                    className="changelog-card__when"
                                    dateTime={entry.committedAt}
                                    title={stamp.title}
                                  >
                                    <span className="changelog-card__when-date">{stamp.dateLong}</span>
                                    <span className="changelog-card__when-sep" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="changelog-card__when-time">{stamp.time}</span>
                                  </time>
                                  <h3 className="changelog-card__title">{entry.title}</h3>
                                </div>
                                <span className={categoryPillClass(entry.category)}>{entry.categoryLabel}</span>
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
                              {entry.repository ? <span>{entry.repository}</span> : null}
                              {entry.source === 'git' ? (
                                <span className="changelog-card__git" title="Ainda não gravado no JSON">
                                  Git
                                </span>
                              ) : null}
                              {entry.commitSha ? (
                                <span title={entry.commitSha}>{entry.commitSha.slice(0, 7)}</span>
                              ) : null}
                            </footer>
                            </article>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
                {hasMore ? (
                  <div className="changelog-more">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={loadingMore}
                      onClick={() => void load({ append: true, offset: items.length })}
                    >
                      {loadingMore ? 'Carregando…' : 'Carregar mais'}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}
