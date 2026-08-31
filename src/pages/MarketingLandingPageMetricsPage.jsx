import { useEffect, useState } from 'react';
import {
  clearMarketingLandingPageMetrics,
  getMarketingLandingPageMetrics,
} from '../api/marketing.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { confirmCrudDelete } from '../crud/crudUtils.js';
import {
  buildMetricsQuery,
  exportResponsesDocx,
  formatMetricDate,
  formatMetricDayLabel,
  formatMetricNumber,
  formatMetricPercent,
} from '../utils/marketingMetrics.js';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

function MetricsBarChart({ rows }) {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [Number(row.views ?? 0), Number(row.clicks ?? 0)]),
  );

  if (!rows.length) {
    return <p className="marketing-metrics-empty">Nenhum dado no período selecionado.</p>;
  }

  return (
    <div className="marketing-metrics-chart">
      <div className="marketing-metrics-chart-bars">
        {rows.map((row) => (
          <div key={row.date} className="marketing-metrics-chart-column">
            <div className="marketing-metrics-chart-bar-group">
              <span
                className="marketing-metrics-chart-bar is-views"
                style={{ height: `${(Number(row.views) / maxValue) * 100}%` }}
                title={`${row.views} visualizações`}
              />
              <span
                className="marketing-metrics-chart-bar is-clicks"
                style={{ height: `${(Number(row.clicks) / maxValue) * 100}%` }}
                title={`${row.clicks} cliques`}
              />
            </div>
            <span className="marketing-metrics-chart-label">{formatMetricDayLabel(row.date)}</span>
          </div>
        ))}
      </div>
      <div className="marketing-metrics-chart-legend">
        <span><i className="is-views" /> Visualizações</span>
        <span><i className="is-clicks" /> Cliques</span>
      </div>
    </div>
  );
}

function SourceBreakdown({ rows }) {
  if (!rows.length) {
    return <p className="marketing-metrics-empty">Nenhuma origem registrada no período.</p>;
  }

  const maxViews = Math.max(...rows.map((row) => row.views), 1);

  return (
    <div className="marketing-metrics-source-list">
      {rows.map((row) => (
        <article
          key={`${row.utmSource ?? ''}-${row.utmMedium ?? ''}-${row.label}`}
          className="marketing-metrics-source-row"
        >
          <div className="marketing-metrics-source-head">
            <span className="marketing-metrics-source-badge">{row.label}</span>
            <span className="marketing-metrics-source-meta">
              {row.utmSource ? `utm_source=${row.utmSource}` : 'utm_source=—'}
              {' · '}
              {row.utmMedium ? `utm_medium=${row.utmMedium}` : 'utm_medium=—'}
            </span>
          </div>
          <div className="marketing-metrics-source-track">
            <span style={{ width: `${(row.views / maxViews) * 100}%` }} />
          </div>
          <div className="marketing-metrics-source-stats">
            {formatMetricNumber(row.views)} visualizações · {formatMetricNumber(row.clicks)} cliques ·{' '}
            {formatMetricPercent(row.ctr)} CTR
          </div>
        </article>
      ))}
    </div>
  );
}

function LinkBreakdown({ rows }) {
  if (!rows.length) {
    return <p className="marketing-metrics-empty">Nenhum link rastreado no período.</p>;
  }

  return (
    <div className="marketing-metrics-link-list">
      {rows.map((row) => (
        <article key={row.creativeId ?? row.label} className="marketing-metrics-link-row">
          <strong>{row.label}</strong>
          <span>
            {formatMetricNumber(row.views)} visualizações · {formatMetricNumber(row.clicks)} cliques ·{' '}
            {formatMetricPercent(row.ctr)} CTR
          </span>
        </article>
      ))}
    </div>
  );
}

function DeviceBreakdown({ byDevice }) {
  const items = [
    { key: 'mobile', label: 'Mobile', icon: '📱' },
    { key: 'desktop', label: 'Desktop', icon: '🖥️' },
    { key: 'tablet', label: 'Tablet', icon: '📟' },
  ];

  return (
    <div className="marketing-metrics-device-grid">
      {items.map((item) => {
        const value = byDevice?.[item.key] ?? 0;
        const active = value > 0;
        return (
          <article
            key={item.key}
            className={`marketing-metrics-device-card${active ? ' is-active' : ''}`}
          >
            <span className="marketing-metrics-device-icon">{item.icon}</span>
            <strong>{formatMetricPercent(value)}</strong>
            <span>{item.label}</span>
          </article>
        );
      })}
    </div>
  );
}

function ResponseCards({ responses }) {
  if (!responses.length) {
    return <p className="marketing-metrics-empty">Nenhuma resposta no período selecionado.</p>;
  }

  return (
    <div className="marketing-metrics-responses-grid">
      {responses.map((response) => (
        <article key={response.id} className="marketing-metrics-response-card">
          <header>{formatMetricDate(response.createdAt)}</header>
          <div className="marketing-metrics-response-body">
            {Object.entries(response.data ?? {}).map(([label, value]) => (
              <div key={`${response.id}-${label}`} className="marketing-metrics-response-field">
                <span>{label}</span>
                <strong>{String(value ?? '—')}</strong>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export function MarketingLandingPageMetricsPage({
  pageId,
  pageName,
  onConfigure,
  onBack,
  canManage,
}) {
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [applied, setApplied] = useState({ period: 'all', from: '', to: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (filters = applied) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMarketingLandingPageMetrics(pageId, buildMetricsQuery(filters));
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pageId]);

  const applyFilters = async () => {
    const next = { period, from, to };
    setApplied(next);
    await load(next);
  };

  const clearMetrics = async () => {
    const confirmed = await confirmCrudDelete(
      'todas as métricas desta página',
      pageName ?? 'formulário',
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await clearMarketingLandingPageMetrics(pageId);
      await load(applied);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <AppLoadingPanel label="Carregando métricas…" />;

  return (
    <div className="page-stack marketing-metrics-page">
      <PageHeader
        breadcrumbs={[{ label: 'Formulários', onClick: onBack }, { label: pageName ?? 'Métricas' }]}
        title="Métricas"
        subtitle={data?.page?.name ?? pageName}
        actions={
          <div className="marketing-metrics-header-actions">
            <button type="button" className="btn-primary btn-sm" onClick={onConfigure}>
              Configuração
            </button>
            {canManage ? (
              <button type="button" className="btn-ghost btn-sm btn-danger" onClick={clearMetrics} disabled={busy}>
                Excluir todas as métricas da página
              </button>
            ) : null}
          </div>
        }
      />

      <CrudAlerts error={error} />

      <section className="marketing-metrics-filters panel">
        <div className="panel-body marketing-metrics-filters-grid">
          <label>
            <span>Período</span>
            <select value={period} onChange={(ev) => setPeriod(ev.target.value)}>
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Data inicial</span>
            <input
              type="date"
              value={from}
              onChange={(ev) => setFrom(ev.target.value)}
              disabled={period !== 'custom'}
            />
          </label>
          <label>
            <span>Data final</span>
            <input
              type="date"
              value={to}
              onChange={(ev) => setTo(ev.target.value)}
              disabled={period !== 'custom'}
            />
          </label>
          <div className="marketing-metrics-filter-action">
            <button type="button" className="btn-primary" onClick={applyFilters} disabled={loading || busy}>
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section className="marketing-metrics-kpis">
        {[
          { label: 'Visualizações', value: formatMetricNumber(data?.totals?.views) },
          { label: 'Cliques', value: formatMetricNumber(data?.totals?.clicks) },
          { label: 'CTR', value: formatMetricPercent(data?.totals?.ctr) },
          { label: 'Leads capturados', value: formatMetricNumber(data?.totals?.leads) },
          { label: 'Respostas', value: formatMetricNumber(data?.totals?.responses) },
        ].map((item) => (
          <article key={item.label} className="marketing-metrics-kpi">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="panel marketing-metrics-panel">
        <div className="panel-header">
          <h2>Visualizações por dia</h2>
        </div>
        <div className="panel-body">
          <MetricsBarChart rows={data?.viewsByDay ?? []} />
        </div>
      </section>

      <section className="panel marketing-metrics-panel">
        <div className="panel-header">
          <h2>Por origem</h2>
          <p>Cada linha corresponde a um canal de divulgação (utm_source + utm_medium).</p>
        </div>
        <div className="panel-body">
          <SourceBreakdown rows={data?.bySource ?? []} />
        </div>
      </section>

      <section className="panel marketing-metrics-panel">
        <div className="panel-header">
          <h2>Por link</h2>
        </div>
        <div className="panel-body">
          <LinkBreakdown rows={data?.byLink ?? []} />
        </div>
      </section>

      <section className="panel marketing-metrics-panel">
        <div className="panel-header">
          <h2>Por dispositivo</h2>
        </div>
        <div className="panel-body">
          <DeviceBreakdown byDevice={data?.byDevice} />
        </div>
      </section>

      <section className="panel marketing-metrics-panel">
        <div className="panel-header marketing-metrics-responses-head">
          <div>
            <h2>Respostas do formulário</h2>
            <p>
              Respostas enviadas na página em modo formulário. Use o filtro de período para restringir por data.
            </p>
          </div>
          <div className="marketing-metrics-responses-actions">
            <span>{formatMetricNumber(data?.totals?.responses)} respostas</span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => exportResponsesDocx(data?.page?.name ?? pageName, data?.responses ?? [])}
              disabled={!data?.responses?.length}
            >
              Exportar DOCX
            </button>
          </div>
        </div>
        <div className="panel-body">
          <ResponseCards responses={data?.responses ?? []} />
        </div>
      </section>
    </div>
  );
}
