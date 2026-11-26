import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOverview } from '../api/admin.js';
import { getHealth } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PayingLivesEvolutionChart } from '../components/PayingLivesEvolutionChart.jsx';
import { API_URL } from '../config.js';

const OVERVIEW_POLL_MS = 30_000;

function formatPtNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('pt-BR').format(Number(n));
}

function formatPtPercent(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatShortIso(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Aceita ISO ou YYYY-MM-DD. */
function formatPtDateOnly(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    const d = new Date(value);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

export function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [overviewError, setOverviewError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([getHealth(), getAdminOverview()])
      .then(([healthData, overviewData]) => {
        if (!active) return;
        setHealth(healthData);
        setOverview(overviewData);
        setOverviewError('');
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = () => {
      getAdminOverview()
        .then((overviewData) => {
          if (stopped) return;
          setOverview(overviewData);
          setOverviewError('');
        })
        .catch((err) => {
          if (!stopped) setOverviewError(err.message ?? String(err));
        });
    };
    const id = window.setInterval(tick, OVERVIEW_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        subtitle="Visão consolidada da operação."
      />

      <div className="stat-grid">
        <article className="panel stat-panel">
          <span className="stat-label">Parceiros com onboarding concluído</span>
          <strong className="stat-value">
            {overview?.partnerPortalAccess
              ? `${formatPtNumber(overview.partnerPortalAccess.withAccessCount)} / ${formatPtNumber(overview.partnerPortalAccess.totalNetworks)}`
              : overview?.networks?.length != null
                ? formatPtNumber(overview.networks.length)
                : '—'}
          </strong>
          <p className="muted stat-panel-hint">
            Redes com acesso ao portal (com acesso) · visíveis no app do aluno
          </p>
          <Link to="/m/operacao/redes" className="stat-link">
            Ver redes →
          </Link>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Unidades totais</span>
          <strong className="stat-value">{overview?.unitCount ?? '—'}</strong>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Planos</span>
          <strong className="stat-value">{overview?.planCount ?? '—'}</strong>
          <Link to="/m/operacao/planos" className="stat-link">
            Gerenciar planos →
          </Link>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Status da API</span>
          <strong className="stat-value stat-value-sm">{health?.service ?? 'connect-api'}</strong>
          <span className={`badge ${health ? 'badge-success' : error ? 'badge-error' : 'badge-muted'}`}>
            {health ? health.status : error ? 'offline' : 'verificando...'}
          </span>
        </article>
      </div>

      {overview?.acafPayingLivesCount != null ? (
        <section className="panel acaf-lives-panel">
          <div className="panel-header">
            <div className="acaf-lives-panel__intro">
              <h2>Vidas pagantes e repasse</h2>
              <p className="panel-subtitle muted">
                Vida pagante = titular único com check-in de plano no mês civil (Brasil). Atualização a cada{' '}
                {OVERVIEW_POLL_MS / 1000}s; histórico diário alimenta repasse — 90 dias para melhorar o %, 30 para
                reduzir.
              </p>
            </div>
            {overview.acafOverviewComputedAt ? (
              <span className="panel-meta muted acaf-lives-panel__computed">
                Calculado em {formatShortIso(overview.acafOverviewComputedAt)}
              </span>
            ) : null}
          </div>
          <div className="panel-body">
            <div
              className={`acaf-lives-kpi-grid${overview.acafRepasseTierMismatch ? ' acaf-lives-kpi-grid--three' : ''}`}
            >
              <article className="acaf-lives-kpi acaf-lives-kpi--primary">
                <span className="stat-label">Vidas pagantes (mês)</span>
                <strong className="acaf-lives-value">{formatPtNumber(overview.acafPayingLivesCount)}</strong>
                {overview.acafPayingLivesDiagnostics ? (
                  <div className="acaf-lives-kpi__chips">
                    <span className="acaf-lives-chip">
                      {formatPtNumber(overview.acafPayingLivesDiagnostics.checkInHoldersThisMonth)} titulares únicos (
                      {overview.acafPayingLivesDiagnostics.monthPrefix})
                    </span>
                    <span className="acaf-lives-chip">
                      {formatPtNumber(overview.acafPayingLivesDiagnostics.checkInEventsThisMonth)} check-ins no log
                    </span>
                    {overview.acafPayingLivesDiagnostics.pendingHoldersThisMonth > 0 ? (
                      <span className="acaf-lives-chip">
                        {formatPtNumber(overview.acafPayingLivesDiagnostics.pendingHoldersThisMonth)} pendentes na
                        recepção
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {overview.acafPayingLivesDiagnostics?.checkInLogTotal === 0 ? (
                  <p className="muted acaf-lives-hint" style={{ marginTop: '0.75rem' }}>
                    Nenhum check-in de plano no banco (<code>checkInLog</code> vazio e sem pendências). O KPI só sobe
                    com check-in de plano (código <code>CHK-…</code>) confirmado na recepção ou
                    pendente aguardando aprovação — diária e mensagem de sucesso só no app sem gravar na API não entram.
                  </p>
                ) : overview.acafPayingLivesDiagnostics?.count === 0 &&
                  overview.acafPayingLivesDiagnostics?.lastPlanCheckIn ? (
                  <p className="muted acaf-lives-hint" style={{ marginTop: '0.75rem' }}>
                    Há check-in de plano no histórico, mas fora do mês {overview.acafPayingLivesDiagnostics.monthPrefix}
                    . Último: {overview.acafPayingLivesDiagnostics.lastPlanCheckIn.holderName || '—'} em{' '}
                    {formatPtDateOnly(overview.acafPayingLivesDiagnostics.lastPlanCheckIn.validatedAt?.slice(0, 10)) ||
                      '—'}
                    .
                  </p>
                ) : null}
              </article>
              <article className="acaf-lives-kpi">
                <span className="stat-label">Repasse vigente</span>
                <strong className="acaf-repasse-value">{formatPtPercent(overview.acafRepassePercent)}</strong>
                <span className="muted acaf-lives-hint">
                  desde {formatPtDateOnly(overview.acafEffectiveRepasseSinceDate) || '—'}
                </span>
              </article>
              {overview.acafRepasseTierMismatch ? (
                <article className="acaf-lives-kpi acaf-lives-kpi--instant">
                  <span className="stat-label">Faixa instantânea (hoje)</span>
                  <strong className="acaf-repasse-value">
                    {formatPtPercent(overview.acafInstantaneousRepassePercent)}
                  </strong>
                  <span className="muted acaf-lives-hint">contrato muda após dias de permanência</span>
                </article>
              ) : null}
            </div>

            <PayingLivesEvolutionChart
              snapshots={overview.acafPayingLivesSnapshots}
              liveCount={overview.acafPayingLivesCount}
              tiers={overview.acafRepasseTiers}
            />

            {overview.acafRepassePersistence ? (
              <div className="acaf-repasse-persistence muted">
                <p>
                  <strong>Regras:</strong> para{' '}
                  <strong>aumentar</strong> o repasse, manter a faixa de destino por{' '}
                  {overview.acafRepassePersistence.daysRequiredToIncreaseRepasse ?? 90} dias corridos consecutivos
                  (histórico diário). Para <strong>reduzir</strong>, manter por{' '}
                  {overview.acafRepassePersistence.daysRequiredToDecreaseRepasse ?? 30} dias corridos. Em ambos os
                  casos, o churn líquido do <strong>mês civil anterior</strong> não pode ultrapassar{' '}
                  {formatPtPercent(overview.acafRepassePersistence.maxNetChurnPercentMonthly ?? 3)} (com base nos
                  snapshots do mês).
                </p>
                {overview.acafNetChurnRolling && !overview.acafNetChurnRolling.insufficientData ? (
                  <p>
                    <strong>Churn líquido (mês de referência {overview.acafNetChurnRolling.referenceMonthKey ?? '—'}):</strong>{' '}
                    {formatPtPercent(overview.acafNetChurnRolling.percent)} (teto{' '}
                    {formatPtPercent(overview.acafNetChurnRolling.maxNetChurnPercentAllowed)})
                    {overview.acafNetChurnRolling.startDate && overview.acafNetChurnRolling.endDate
                      ? ` · de ${formatPtDateOnly(overview.acafNetChurnRolling.startDate)} a ${formatPtDateOnly(overview.acafNetChurnRolling.endDate)}`
                      : ''}
                  </p>
                ) : overview.acafNetChurnRolling?.insufficientData ? (
                  <p>
                    <strong>Churn líquido:</strong> ainda sem histórico suficiente no mês civil anterior para exibir o
                    indicador (depende dos registros diários).
                  </p>
                ) : null}
                {overview.acafRepassePersistence.upgradeToBetterTier ? (
                  <p>
                    Rumo a repasse maior ({formatPtPercent(overview.acafRepassePersistence.upgradeToBetterTier.targetRepassePercent)}):{' '}
                    {overview.acafRepassePersistence.upgradeToBetterTier.consecutiveDays} de{' '}
                    {overview.acafRepassePersistence.upgradeToBetterTier.requiredConsecutiveDays} dias na faixa alvo
                    {overview.acafRepassePersistence.upgradeToBetterTier.daysRemaining > 0
                      ? ` — faltam ${overview.acafRepassePersistence.upgradeToBetterTier.daysRemaining}`
                      : ''}
                    .
                    {overview.acafRepassePersistence.upgradeToBetterTier.blockedByNetChurn ? (
                      <span className="acaf-churn-block">
                        {' '}
                        Bloqueado: churn líquido do mês anterior ({formatPtPercent(overview.acafRepassePersistence.upgradeToBetterTier.netChurnPercent)}) &gt;{' '}
                        {formatPtPercent(overview.acafRepassePersistence.maxNetChurnPercentMonthly ?? 3)}.
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {overview.acafRepassePersistence.downgradeToWorseTier ? (
                  <p>
                    Rumo a repasse menor ({formatPtPercent(overview.acafRepassePersistence.downgradeToWorseTier.targetRepassePercent)}):{' '}
                    {overview.acafRepassePersistence.downgradeToWorseTier.consecutiveDays} de{' '}
                    {overview.acafRepassePersistence.downgradeToWorseTier.requiredConsecutiveDays} dias na faixa alvo
                    {overview.acafRepassePersistence.downgradeToWorseTier.daysRemaining > 0
                      ? ` — faltam ${overview.acafRepassePersistence.downgradeToWorseTier.daysRemaining}`
                      : ''}
                    .
                    {overview.acafRepassePersistence.downgradeToWorseTier.blockedByNetChurn ? (
                      <span className="acaf-churn-block">
                        {' '}
                        Bloqueado: churn líquido do mês anterior ({formatPtPercent(overview.acafRepassePersistence.downgradeToWorseTier.netChurnPercent)}) &gt;{' '}
                        {formatPtPercent(overview.acafRepassePersistence.maxNetChurnPercentMonthly ?? 3)}.
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {overview.acafLastSnapshotDate ? (
                  <p className="acaf-snapshot-meta">
                    Último registro diário no histórico: {formatPtDateOnly(overview.acafLastSnapshotDate)}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {Array.isArray(overview.acafRepasseTiers) && overview.acafRepasseTiers.length > 0 ? (
              <div className="table-wrap acaf-tier-table-wrap">
                <table className="data-table data-table-compact acaf-tier-table">
                  <thead>
                    <tr>
                      <th scope="col">Faixa de vidas</th>
                      <th scope="col" className="data-table-cell-numeric">
                        % repasse
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.acafRepasseTiers.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.isEffectiveTier
                            ? 'acaf-tier-row--current'
                            : row.isInstantaneousTier && row.id !== overview.acafRepasseTierId
                              ? 'acaf-tier-row--instant'
                              : undefined
                        }
                      >
                        <td>{row.bandLabel}</td>
                        <td className="data-table-cell-numeric">{formatPtPercent(row.repassePercent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {overviewError ? <p className="error-text">{overviewError}</p> : null}
          </div>
        </section>
      ) : null}

      {overview ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Taxas da plataforma</h2>
          </div>
          <div className="panel-body">
            <p className="muted">
              Planos: <strong>{overview.connectFeePercent}%</strong> · Diárias:{' '}
              <strong>{overview.dailyFeePercent}%</strong>
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="panel panel-error">
          <div className="panel-header">
            <h2>API indisponível</h2>
          </div>
          <div className="panel-body">
            <p className="muted">
              Inicie a <code>connect-api</code> com <code>npm run start:dev</code> em{' '}
              <code>{API_URL || 'mesma origem (/api)'}</code>.
            </p>
            <p className="error-text">{error}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
