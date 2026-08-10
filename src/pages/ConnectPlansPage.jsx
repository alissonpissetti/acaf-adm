import { useEffect, useState } from 'react';
import { getConnectDomain, updateConnectDomain } from '../api/admin.js';
import { CurrencyBrlInput } from '../components/CurrencyBrlInput.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { formatBRL } from '../utils/currency.js';

function slugifyPlanId(name, existingIds) {
  let base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  if (!base) base = 'novo';

  let id = `connect-${base}`;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `connect-${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function suggestNextPlan(existing) {
  const sorted = [...existing].sort(
    (a, b) => Number(a.pricePerMonth) - Number(b.pricePerMonth),
  );
  const last = sorted[sorted.length - 1];
  const lastPrice = Number(last?.pricePerMonth) || 99.9;
  const nextPrice = Math.round((lastPrice + 100) * 100) / 100;
  const name = `ACAF Tier ${existing.length + 1}`;
  const ids = new Set(existing.map((plan) => plan.id));

  return {
    id: slugifyPlanId(name, ids),
    name,
    pricePerMonth: nextPrice,
    tierIndex: existing.length,
    description: '',
  };
}

export function ConnectPlansPage() {
  const [domain, setDomain] = useState(null);
  const [connectFee, setConnectFee] = useState(20);
  const [dailyFee, setDailyFee] = useState(20);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    getConnectDomain()
      .then((data) => {
        setDomain(data);
        setConnectFee(data.acafConnectFeePercent ?? 20);
        setDailyFee(data.acafDailyFeePercent ?? 20);
        setPlans(data.connectPlans ?? []);
        setError('');
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const updatePlan = (id, field, value) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.id === id ? { ...plan, [field]: value } : plan)),
    );
    setMessage('');
  };

  const addPlan = () => {
    const next = suggestNextPlan(plans);
    setPlans((prev) => [...prev, next]);
    setMessage('Novo plano adicionado. Ajuste nome e preço e clique em Salvar alterações.');
    setError('');
  };

  const removePlan = (id) => {
    if (plans.length <= 1) return;
    const plan = plans.find((row) => row.id === id);
    if (!window.confirm(`Remover o plano "${plan?.name ?? id}"?`)) return;
    setPlans((prev) => prev.filter((row) => row.id !== id));
    setMessage('Plano removido da lista. Salve para publicar a alteração.');
    setError('');
  };

  const movePlan = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= plans.length) return;
    setPlans((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMessage('Ordem alterada. Salve para publicar.');
  };

  const onSave = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        acafConnectFeePercent: Number(connectFee),
        acafDailyFeePercent: Number(dailyFee),
        connectPlans: plans.map((plan, index) => ({
          ...plan,
          pricePerMonth: Number(plan.pricePerMonth),
          tierIndex: index,
        })),
      };
      const updated = await updateConnectDomain(payload);
      setDomain(updated);
      setPlans(updated.connectPlans ?? []);
      setMessage('Planos e taxas salvos. Novos tiers ficam disponíveis no portal parceiro e no app.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!domain) {
    return (
      <div className="panel">
        <div className="panel-body">Carregando planos…</div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Planos Connect"
        subtitle="Assinaturas da plataforma, do tier de entrada até planos premium. Tiers mais altos = preços maiores."
        actions={
          <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={addPlan}>
            + Adicionar plano
          </button>
        }
      />

      <form className="page-stack" onSubmit={onSave}>
        <section className="panel">
          <div className="panel-header">
            <h2>Taxas da plataforma</h2>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <label>
                <span>Taxa Connect (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={connectFee}
                  onChange={(e) => setConnectFee(e.target.value)}
                />
              </label>
              <label>
                <span>Taxa diárias (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dailyFee}
                  onChange={(e) => setDailyFee(e.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header connect-plans-panel-head">
            <div>
              <h2>Planos de assinatura</h2>
              <span className="panel-meta">
                {plans.length} plano(s) · ordem = tier (1 = entrada, {plans.length} = mais premium)
              </span>
            </div>
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={addPlan}>
              + Adicionar plano
            </button>
          </div>
          <div className="panel-body">
            <div className="connect-plans-grid">
              {plans.map((plan, index) => (
                <article key={plan.id} className="connect-plan-card">
                  <header className="connect-plan-card-head">
                    <div>
                      <span className="connect-plan-tier">Tier {index + 1}</span>
                      <div className="connect-plan-card-toolbar">
                        <button
                          type="button"
                          className="connect-plan-icon-btn"
                          disabled={busy || index === 0}
                          onClick={() => movePlan(index, -1)}
                          title="Subir tier"
                          aria-label="Subir tier"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="connect-plan-icon-btn"
                          disabled={busy || index === plans.length - 1}
                          onClick={() => movePlan(index, 1)}
                          title="Descer tier"
                          aria-label="Descer tier"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="connect-plan-icon-btn connect-plan-icon-btn-danger"
                          disabled={busy || plans.length <= 1}
                          onClick={() => removePlan(plan.id)}
                          title="Remover plano"
                          aria-label="Remover plano"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="connect-plan-price-display">
                      {formatBRL(Number(plan.pricePerMonth) || 0)}
                      <small>/mês</small>
                    </div>
                  </header>

                  <div className="connect-plan-card-body">
                    <label>
                      <span>Nome do plano</span>
                      <input
                        value={plan.name}
                        onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                      />
                    </label>

                    <CurrencyBrlInput
                      id={`plan-price-${plan.id}`}
                      label="Preço mensal (colaborador)"
                      value={Number(plan.pricePerMonth) || 0}
                      min={0}
                      max={99_999.99}
                      onChange={(value) => updatePlan(plan.id, 'pricePerMonth', value)}
                    />

                    <label className="connect-plan-desc-field">
                      <span>Descrição</span>
                      <textarea
                        rows={3}
                        value={plan.description ?? ''}
                        onChange={(e) => updatePlan(plan.id, 'description', e.target.value)}
                      />
                    </label>

                    <code className="connect-plan-id">{plan.id}</code>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="panel-actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
