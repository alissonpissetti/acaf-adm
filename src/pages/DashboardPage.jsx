import { useEffect, useState } from 'react';
import { getHealth } from '../api/client.js';
import { API_URL } from '../config.js';

export function DashboardPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getHealth()
      .then((data) => {
        if (active) setHealth(data);
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
      <section className="card">
        <h2>Visão geral</h2>
        <p className="muted">
          Painel interno para operação do ecossistema ACAF: redes parceiras,
          unidades, planos Connect e configurações da plataforma.
        </p>
      </section>

      <div className="stat-grid">
        <article className="card stat-card">
          <span className="stat-label">API</span>
          <strong className="stat-value">{health?.service ?? 'acaf-api'}</strong>
          <span className={`badge ${health ? 'badge-success' : error ? 'badge-error' : 'badge-muted'}`}>
            {health ? health.status : error ? 'offline' : 'verificando...'}
          </span>
        </article>

        <article className="card stat-card">
          <span className="stat-label">Endpoint</span>
          <strong className="stat-value stat-value-sm">{API_URL}</strong>
        </article>

        <article className="card stat-card">
          <span className="stat-label">Escopo</span>
          <strong className="stat-value stat-value-sm">Operação ACAF</strong>
        </article>
      </div>

      {error ? (
        <section className="card card-error">
          <h3>API indisponível</h3>
          <p className="muted">
            Não foi possível contactar a API em <code>{API_URL}</code>. Inicie o
            serviço com <code>npm run start:dev</code> em <code>acaf-api</code>.
          </p>
          <p className="error-text">{error}</p>
        </section>
      ) : null}
    </div>
  );
}
