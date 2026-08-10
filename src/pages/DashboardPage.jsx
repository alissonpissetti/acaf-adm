import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOverview } from '../api/admin.js';
import { getHealth } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { API_URL } from '../config.js';

export function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([getHealth(), getAdminOverview()])
      .then(([healthData, overviewData]) => {
        if (!active) return;
        setHealth(healthData);
        setOverview(overviewData);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        subtitle="Visão consolidada da operação ACAF Connect."
      />

      <div className="stat-grid">
        <article className="panel stat-panel">
          <span className="stat-label">Redes parceiras</span>
          <strong className="stat-value">{overview?.networks?.length ?? '—'}</strong>
          <Link to="/networks" className="stat-link">
            Ver redes →
          </Link>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Unidades totais</span>
          <strong className="stat-value">{overview?.unitCount ?? '—'}</strong>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Planos Connect</span>
          <strong className="stat-value">{overview?.planCount ?? '—'}</strong>
          <Link to="/connect" className="stat-link">
            Gerenciar planos →
          </Link>
        </article>

        <article className="panel stat-panel">
          <span className="stat-label">Status da API</span>
          <strong className="stat-value stat-value-sm">{health?.service ?? 'acaf-api'}</strong>
          <span className={`badge ${health ? 'badge-success' : error ? 'badge-error' : 'badge-muted'}`}>
            {health ? health.status : error ? 'offline' : 'verificando...'}
          </span>
        </article>
      </div>

      {overview ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Taxas da plataforma</h2>
          </div>
          <div className="panel-body">
            <p className="muted">
              Connect: <strong>{overview.connectFeePercent}%</strong> · Diárias:{' '}
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
              Inicie a <code>acaf-api</code> com <code>npm run start:dev</code> em{' '}
              <code>{API_URL || 'http://127.0.0.1:8787'}</code>.
            </p>
            <p className="error-text">{error}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
