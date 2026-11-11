import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCommercialFunnelOptions,
  getCommercialLossReasonsReport,
} from '../api/commercial.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { formatRelativeTime } from '../utils/relativeTime.js';
import '../styles/commercial-leads.css';

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="commercial-loss-report-stat">
      <strong>{value}</strong>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function FunnelOutcomeBar({ snapshot }) {
  if (!snapshot?.total) {
    return <p className="field-hint">Sem leads no funil para o filtro atual.</p>;
  }
  const won = snapshot.won ?? 0;
  const lost = snapshot.lost ?? 0;
  const pipeline = snapshot.pipeline ?? 0;
  const total = snapshot.total;
  const wonW = (won / total) * 100;
  const lostW = (lost / total) * 100;
  const pipeW = (pipeline / total) * 100;

  return (
    <div className="commercial-loss-report-outcome">
      <div
        className="commercial-loss-report-outcome-track"
        role="img"
        aria-label={`Ganhos ${won}, perdidos ${lost}, em pipeline ${pipeline}`}
      >
        {won > 0 ? (
          <span
            className="commercial-loss-report-outcome-seg commercial-loss-report-outcome-seg--won"
            style={{ width: `${wonW}%` }}
            title={`Ganhos: ${won}`}
          />
        ) : null}
        {lost > 0 ? (
          <span
            className="commercial-loss-report-outcome-seg commercial-loss-report-outcome-seg--lost"
            style={{ width: `${lostW}%` }}
            title={`Perdidos: ${lost}`}
          />
        ) : null}
        {pipeline > 0 ? (
          <span
            className="commercial-loss-report-outcome-seg commercial-loss-report-outcome-seg--pipe"
            style={{ width: `${pipeW}%` }}
            title={`Em pipeline: ${pipeline}`}
          />
        ) : null}
      </div>
      <ul className="commercial-loss-report-outcome-legend">
        <li>
          <span className="commercial-loss-report-outcome-dot commercial-loss-report-outcome-dot--won" />
          Ganhos <strong>{won}</strong>
        </li>
        <li>
          <span className="commercial-loss-report-outcome-dot commercial-loss-report-outcome-dot--lost" />
          Perdidos <strong>{lost}</strong>
        </li>
        <li>
          <span className="commercial-loss-report-outcome-dot commercial-loss-report-outcome-dot--pipe" />
          Pipeline <strong>{pipeline}</strong>
        </li>
      </ul>
    </div>
  );
}

function ReasonBar({ label, count, sharePercent, tone }) {
  const width = Math.max(4, Math.min(100, sharePercent));
  return (
    <div className="commercial-loss-report-bar">
      <div className="commercial-loss-report-bar-head">
        <span className="commercial-loss-report-bar-label">{label}</span>
        <span className="commercial-loss-report-bar-meta">
          {count} · {sharePercent}%
        </span>
      </div>
      <div className="commercial-loss-report-bar-track" aria-hidden="true">
        <div
          className={`commercial-loss-report-bar-fill commercial-loss-report-bar-fill--${tone}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function CommercialLossReportPage() {
  const initialRange = useMemo(() => defaultRange(), []);
  const [funnelOptions, setFunnelOptions] = useState([]);
  const [funnelId, setFunnelId] = useState('');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCommercialLossReasonsReport({
        funnelId: funnelId || undefined,
        from,
        to,
        limit: 80,
      });
      setReport(data);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [funnelId, from, to]);

  useEffect(() => {
    getCommercialFunnelOptions()
      .then((rows) => setFunnelOptions(Array.isArray(rows) ? rows : []))
      .catch(() => setFunnelOptions([]));
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const summary = report?.summary;
  const snapshot = report?.funnelPerformance?.snapshot;
  const period = report?.funnelPerformance?.period;
  const maxReasonCount = Math.max(1, ...(report?.byReason ?? []).map((row) => row.count));

  return (
    <PermissionGate permission="comercial.leads">
      <div className="page-stack commercial-page commercial-loss-report-page">
        <PageHeader
          title="Análise comercial"
          subtitle="Conversão, ganhos, perdas, motivos e objeções para ajustar a rota e retrabalhar leads."
          actions={
            <Link className="btn-ghost" to="/m/comercial/leads">
              Abrir funil de vendas
            </Link>
          }
        />

        <section className="panel">
          <div className="panel-body commercial-loss-report-filters">
            <label className="field-block">
              <span>Funil</span>
              <select className="input" value={funnelId} onChange={(ev) => setFunnelId(ev.target.value)}>
                <option value="">Todos os funis</option>
                {funnelOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-block">
              <span>De</span>
              <input className="input" type="date" value={from} onChange={(ev) => setFrom(ev.target.value)} />
            </label>
            <label className="field-block">
              <span>Até</span>
              <input className="input" type="date" value={to} onChange={(ev) => setTo(ev.target.value)} />
            </label>
            <button type="button" className="btn-primary" onClick={() => void loadReport()} disabled={loading}>
              Atualizar
            </button>
          </div>
        </section>

        <CrudAlerts error={error} />

        {loading ? (
          <AppLoadingPanel label="Carregando análise comercial…" />
        ) : (
          <>
            <section className="commercial-loss-report-stats commercial-loss-report-stats--primary">
              <SummaryCard
                label="Taxa de conversão"
                value={formatPercent(period?.conversionRate ?? 0)}
                hint="Ganhos ÷ (ganhos + perdidos) no período"
              />
              <SummaryCard
                label="% de ganho"
                value={formatPercent(snapshot?.winPercent ?? 0)}
                hint="Entre leads ganhos ou perdidos (atual)"
              />
              <SummaryCard
                label="% de perda"
                value={formatPercent(snapshot?.lossPercent ?? 0)}
                hint="Entre encerrados no funil"
              />
              <SummaryCard
                label="Em pipeline"
                value={snapshot?.pipeline ?? 0}
                hint={formatPercent(snapshot?.pipelinePercent ?? 0)}
              />
              <SummaryCard label="Ganhos" value={snapshot?.won ?? 0} />
              <SummaryCard label="Perdidos (funil)" value={snapshot?.lost ?? 0} />
            </section>

            <section className="panel commercial-loss-report-dashboard-panel">
              <div className="panel-header">
                <h2>Resultado do funil</h2>
                <p className="field-hint">
                  Visão geral dos leads no filtro. O período (datas) afeta conversão e a lista de perdas abaixo.
                </p>
              </div>
              <div className="panel-body">
                <FunnelOutcomeBar snapshot={snapshot} />
              </div>
            </section>

            <section className="commercial-loss-report-stats">
              <SummaryCard
                label="Perdas no período"
                value={summary?.totalLost ?? 0}
                hint={
                  period?.closed
                    ? `${formatPercent(summary?.lossSharePercent ?? 0)} dos encerrados no período`
                    : undefined
                }
              />
              <SummaryCard label="Com motivo registrado" value={summary?.withReason ?? 0} />
              <SummaryCard
                label="Catálogo padrão"
                value={summary?.catalogReasonCount ?? 0}
                hint="Motivos pré-definidos"
              />
              <SummaryCard
                label="Objeções / custom"
                value={summary?.customReasonCount ?? 0}
                hint="Textos livres ao marcar perda"
              />
              <SummaryCard label="Sem motivo" value={summary?.withoutReason ?? 0} />
            </section>

            <div className="commercial-loss-report-grid">
              <section className="panel">
                <div className="panel-header">
                  <h2>Detalhamento das perdas</h2>
                  <p className="field-hint">Distribuição por motivo entre leads perdidos no período.</p>
                </div>
                <div className="panel-body commercial-loss-report-bars">
                  {(report?.byReason ?? []).length ? (
                    report.byReason.map((row) => (
                      <ReasonBar
                        key={row.reasonId ?? row.label}
                        label={row.label}
                        count={row.count}
                        sharePercent={row.sharePercent}
                        tone={row.catalog ? 'catalog' : row.objection ? 'objection' : 'custom'}
                      />
                    ))
                  ) : (
                    <p className="field-hint">Nenhum lead perdido no período.</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h2>Objeções e motivos livres</h2>
                </div>
                <div className="panel-body">
                  {(report?.customReasons ?? []).length ? (
                    <ul className="simple-list commercial-loss-report-objections">
                      {report.customReasons.map((row) => (
                        <li key={row.reasonId}>
                          <strong>{row.label}</strong>
                          <span className="muted">
                            {row.count} lead{row.count === 1 ? '' : 's'} (
                            {Math.round((row.count / maxReasonCount) * 100)}% do topo)
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="field-hint">
                      Objeções aparecem quando o time usa «Outro» ao marcar perda ou registra frases no histórico.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <section className="panel">
              <div className="panel-header">
                <h2>Leads para retrabalho</h2>
                <p className="field-hint">
                  Abra o lead, revise o histórico e mova para uma etapa ativa quando fizer sentido reabrir a conversa.
                </p>
              </div>
              <div className="panel-body commercial-loss-report-table-wrap">
                {(report?.recentLeads ?? []).length ? (
                  <table className="crud-table commercial-loss-report-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Funil</th>
                        <th>Motivo</th>
                        <th>Objeção / nota</th>
                        <th>Perdido</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {report.recentLeads.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="commercial-loss-report-lead-title">{row.title}</div>
                            {row.source ? (
                              <span className="commercial-loss-report-source">{row.source}</span>
                            ) : null}
                          </td>
                          <td>{row.funnelName}</td>
                          <td>{row.lossReasonLabel ?? '—'}</td>
                          <td className="commercial-loss-report-snippet">
                            {row.objectionSnippet ?? '—'}
                          </td>
                          <td>
                            {row.lostAt
                              ? formatRelativeTime(row.lostAt, { emptyLabel: '—' })
                              : '—'}
                          </td>
                          <td>
                            <Link
                              className="btn-ghost btn-sm"
                              to={`/m/comercial/leads?funnelId=${encodeURIComponent(row.funnelId)}&leadId=${encodeURIComponent(row.id)}`}
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="field-hint">Nenhum lead perdido para listar.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
