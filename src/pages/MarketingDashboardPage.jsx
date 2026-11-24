import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  FileText,
  Megaphone,
  MousePointerClick,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { getMarketingDashboard } from '../api/marketing.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { formatBRL } from '../utils/currency.js';
import { formatRelativeTime } from '../utils/relativeTime.js';
import '../styles/marketing.css';

const INT = new Intl.NumberFormat('pt-BR');

function formatCount(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1).replace('.', ',')} mil`;
  return INT.format(n);
}

function formatPct(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0%';
  return `${n % 1 === 0 ? n : n.toFixed(1).replace('.', ',')}%`;
}

const KPI_GROUPS = [
  {
    id: 'operation',
    title: 'Operação',
    subtitle: 'O que está ativo para captação e divulgação',
    items: [
      {
        id: 'campaigns',
        label: 'Campanhas ativas',
        hint: 'Campanhas veiculando ou alimentando criativos.',
        icon: Megaphone,
        tone: 'violet',
        getValue: (t) => formatCount(t.campaigns),
      },
      {
        id: 'landingPages',
        label: 'Formulários ativos',
        hint: 'Páginas publicadas aceitando envios.',
        icon: FileText,
        tone: 'blue',
        getValue: (t) => formatCount(t.landingPages),
      },
      {
        id: 'submissions',
        label: 'Leads captados',
        hint: 'Total de envios de formulário registrados.',
        icon: Users,
        tone: 'green',
        getValue: (t) => formatCount(t.submissions),
      },
    ],
  },
  {
    id: 'traffic',
    title: 'Tráfego pago',
    subtitle: 'Desempenho agregado dos criativos',
    items: [
      {
        id: 'impressions',
        label: 'Impressões',
        hint: 'Quantas vezes os anúncios foram exibidos.',
        icon: Eye,
        tone: 'slate',
        getValue: (t) => formatCount(t.impressions),
      },
      {
        id: 'clicks',
        label: 'Cliques',
        hint: 'Cliques nos links dos criativos.',
        icon: MousePointerClick,
        tone: 'slate',
        getValue: (t) => formatCount(t.clicks),
      },
      {
        id: 'spend',
        label: 'Investimento',
        hint: 'Gasto informado nos criativos das campanhas.',
        icon: Wallet,
        tone: 'amber',
        getValue: (t) => formatBRL((t.spendCents ?? 0) / 100),
      },
    ],
  },
  {
    id: 'efficiency',
    title: 'Eficiência',
    subtitle: 'Relação entre tráfego e captação',
    items: [
      {
        id: 'ctr',
        label: 'CTR',
        hint: 'Cliques ÷ impressões.',
        icon: Percent,
        tone: 'teal',
        getValue: (t) => formatPct(t.ctr),
      },
      {
        id: 'conversion',
        label: 'Conversão',
        hint: 'Envios ÷ cliques (funil até o lead).',
        icon: TrendingUp,
        tone: 'teal',
        getValue: (t) => formatPct(t.conversionRate),
      },
    ],
  },
];

function KpiCard({ item, totals }) {
  const Icon = item.icon;
  const value = item.getValue(totals);
  return (
    <article
      className={`mkt-kpi-card mkt-kpi-card--${item.tone}`}
      aria-label={`${item.label}: ${value}`}
    >
      <div className="mkt-kpi-card__icon" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="mkt-kpi-card__body">
        <span className="mkt-kpi-card__value">{value}</span>
        <span className="mkt-kpi-card__label">{item.label}</span>
        <p className="mkt-kpi-card__hint">{item.hint}</p>
      </div>
    </article>
  );
}

function MetricPill({ label, value }) {
  return (
    <span className="mkt-metric-pill">
      <span className="mkt-metric-pill__value">{value}</span>
      <span className="mkt-metric-pill__label">{label}</span>
    </span>
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

  const totals = data?.totals ?? {};
  const funnelHint = useMemo(() => {
    const clicks = Number(totals.clicks ?? 0);
    const leads = Number(totals.submissions ?? 0);
    if (!clicks && !leads) return 'Ainda sem dados de funil — publique formulários e vincule campanhas.';
    return `${formatCount(leads)} leads a partir de ${formatCount(clicks)} cliques rastreados.`;
  }, [totals.clicks, totals.submissions]);

  if (loading) return <AppLoadingPanel label="Carregando painel de marketing…" />;

  return (
    <PermissionGate permission="marketing.painel">
      <div className="page-stack marketing-dashboard-page">
        <PageHeader
          title="Painel de marketing"
          subtitle="Campanhas, formulários e criativos — visão rápida do que está convertendo."
        />

        <nav className="mkt-dash-shortcuts" aria-label="Atalhos do módulo">
          <Link to="/m/marketing/campanhas" className="mkt-dash-shortcut">
            Campanhas <ArrowRight size={16} aria-hidden />
          </Link>
          <Link to="/m/marketing/formularios" className="mkt-dash-shortcut">
            Formulários <ArrowRight size={16} aria-hidden />
          </Link>
          <Link to="/m/marketing/redes-sociais" className="mkt-dash-shortcut">
            Calendário social <ArrowRight size={16} aria-hidden />
          </Link>
        </nav>

        <CrudAlerts error={error} />

        {KPI_GROUPS.map((group) => (
          <section key={group.id} className="panel mkt-dash-kpi-group">
            <div className="panel-header mkt-dash-kpi-head">
              <div>
                <h2>{group.title}</h2>
                <p className="panel-subtitle">{group.subtitle}</p>
              </div>
            </div>
            <div className="panel-body mkt-kpi-grid">
              {group.items.map((item) => (
                <KpiCard key={item.id} item={item} totals={totals} />
              ))}
            </div>
          </section>
        ))}

        <p className="mkt-dash-funnel-note muted" role="note">
          {funnelHint}
        </p>

        <div className="marketing-section-grid mkt-dash-columns">
          <section className="panel">
            <div className="panel-header">
              <h2>Campanhas em destaque</h2>
              <p className="panel-subtitle">Maior volume de envios</p>
            </div>
            <div className="panel-body">
              {(data?.topCampaigns ?? []).length ? (
                <ul className="mkt-dash-list">
                  {data.topCampaigns.map((campaign, index) => (
                    <li key={campaign.id} className="mkt-dash-row">
                      <span className="mkt-dash-rank" aria-hidden>
                        {index + 1}
                      </span>
                      <div className="mkt-dash-row__main">
                        <strong>{campaign.name}</strong>
                        <p className="muted">{campaign.status}</p>
                      </div>
                      <div className="mkt-dash-row__metrics">
                        <MetricPill label="envios" value={formatCount(campaign.submissions)} />
                        <MetricPill label="conv." value={formatCount(campaign.conversions)} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted mkt-dash-empty">Nenhuma campanha cadastrada ainda.</p>
              )}
              <Link to="/m/marketing/campanhas" className="mkt-dash-panel-link">
                Ver todas as campanhas
              </Link>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Formulários com melhor desempenho</h2>
              <p className="panel-subtitle">Views, envios e conversão</p>
            </div>
            <div className="panel-body">
              {(data?.topLandingPages ?? []).length ? (
                <ul className="mkt-dash-list">
                  {data.topLandingPages.map((page, index) => (
                    <li key={page.id} className="mkt-dash-row">
                      <span className="mkt-dash-rank" aria-hidden>
                        {index + 1}
                      </span>
                      <div className="mkt-dash-row__main">
                        <strong>{page.name}</strong>
                      </div>
                      <div className="mkt-dash-row__metrics">
                        <MetricPill label="views" value={formatCount(page.views)} />
                        <MetricPill label="envios" value={formatCount(page.submissions)} />
                        <MetricPill label="conv." value={formatPct(page.conversionRate)} />
                      </div>
                      <Link
                        to={`/f/${page.slug}`}
                        className="btn btn-ghost btn-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted mkt-dash-empty">Nenhum formulário publicado ainda.</p>
              )}
              <Link to="/m/marketing/formularios" className="mkt-dash-panel-link">
                Gerenciar formulários
              </Link>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Envios recentes</h2>
            <p className="panel-subtitle">Últimas captações</p>
          </div>
          <div className="panel-body">
            {(data?.recentSubmissions ?? []).length ? (
              <ul className="mkt-dash-list mkt-dash-list--timeline">
                {data.recentSubmissions.map((submission) => (
                  <li key={submission.id} className="mkt-dash-timeline-item">
                    <span className="mkt-dash-timeline-dot" aria-hidden />
                    <div>
                      <strong>{submission.landingPageName}</strong>
                      {submission.campaignName ? (
                        <span className="muted"> · {submission.campaignName}</span>
                      ) : null}
                      <div className="muted">
                        {formatRelativeTime(submission.createdAt)}
                        {submission.leadId ? (
                          <>
                            {' '}
                            ·{' '}
                            <Link to={`/m/comercial/leads?id=${submission.leadId}`}>Ver lead</Link>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted mkt-dash-empty">Ainda não há envios registrados.</p>
            )}
          </div>
        </section>
      </div>
    </PermissionGate>
  );
}