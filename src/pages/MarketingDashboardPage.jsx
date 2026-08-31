import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMarketingDashboard } from '../api/marketing.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { formatBRL } from '../utils/currency.js';
import { formatRelativeTime } from '../utils/relativeTime.js';
import '../styles/marketing.css';

function StatCard({ label, value }) {
  return (
    <div className="marketing-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function MarketingDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketingDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLoadingPanel label="Carregando painel de marketing…" />;

  const totals = data?.totals ?? {};

  return (
    <PermissionGate permission="marketing.painel">
      <div className="page-stack">
        <PageHeader
          title="Painel de marketing"
          subtitle="Métricas de campanhas, criativos e formulários de captação."
        />

        <CrudAlerts error={error} />

        <section className="panel">
          <div className="panel-header">
            <h2>Resumo geral</h2>
          </div>
          <div className="panel-body marketing-stats-grid">
            <StatCard label="Campanhas ativas" value={totals.campaigns ?? 0} />
            <StatCard label="Formulários ativos" value={totals.landingPages ?? 0} />
            <StatCard label="Leads captados" value={totals.submissions ?? 0} />
            <StatCard label="Impressões" value={totals.impressions ?? 0} />
            <StatCard label="Cliques" value={totals.clicks ?? 0} />
            <StatCard label="Investimento" value={formatBRL((totals.spendCents ?? 0) / 100)} />
            <StatCard label="CTR" value={`${totals.ctr ?? 0}%`} />
            <StatCard label="Conversão (clique → lead)" value={`${totals.conversionRate ?? 0}%`} />
          </div>
        </section>

        <div className="marketing-section-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Campanhas em destaque</h2>
            </div>
            <div className="panel-body">
              {(data?.topCampaigns ?? []).length ? (
                <ul className="simple-list">
                  {data.topCampaigns.map((campaign) => (
                    <li key={campaign.id}>
                      <strong>{campaign.name}</strong>
                      <div className="muted">
                        {campaign.submissions} envios · {campaign.conversions} conversões ·{' '}
                        {campaign.status}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhuma campanha cadastrada ainda.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Formulários com melhor desempenho</h2>
            </div>
            <div className="panel-body">
              {(data?.topLandingPages ?? []).length ? (
                <ul className="simple-list">
                  {data.topLandingPages.map((page) => (
                    <li key={page.id}>
                      <strong>{page.name}</strong>
                      <div className="muted">
                        {page.views} views · {page.submissions} envios · {page.conversionRate}%
                        conversão
                      </div>
                      <Link to={`/f/${page.slug}`} target="_blank" rel="noreferrer">
                        Abrir formulário
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Nenhum formulário publicado ainda.</p>
              )}
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Envios recentes</h2>
          </div>
          <div className="panel-body">
            {(data?.recentSubmissions ?? []).length ? (
              <ul className="simple-list">
                {data.recentSubmissions.map((submission) => (
                  <li key={submission.id}>
                    <strong>{submission.landingPageName}</strong>
                    {submission.campaignName ? ` · ${submission.campaignName}` : ''}
                    <div className="muted">
                      {formatRelativeTime(submission.createdAt)}
                      {submission.leadId ? (
                        <>
                          {' '}
                          ·{' '}
                          <Link to={`/m/comercial/leads?id=${submission.leadId}`}>
                            Ver lead
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Ainda não há envios registrados.</p>
            )}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}
