import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalCloseButton } from '../ModalCloseButton.jsx';
import { fetchApi } from '../../api/client.js';
import { useFlashMessage } from '../flash/FlashMessageProvider.jsx';
import '../../styles/support.css';

const EMPTY_FORM = {
  subject: '',
  category: 'technical',
  priority: 'normal',
  queue: 'suporte',
  description: '',
};

function suggestQueue(category, queues = []) {
  const match = queues.find(
    (item) => Array.isArray(item.routeCategories) && item.routeCategories.includes(category),
  );
  if (match) return match.value;
  const fallback = queues.find((item) => item.isDefault) ?? queues[0];
  return fallback?.value ?? 'atendimento';
}

export function SupportTicketModal({
  open,
  onClose,
  context,
  apiPrefix = '/api/admin/support',
  ticketsPath = '/m/atendimento/chamados',
}) {
  const navigate = useNavigate();
  const flash = useFlashMessage();
  const [catalog, setCatalog] = useState({ categories: [], priorities: [], queues: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    fetchApi(`${apiPrefix}/catalog`)
      .then((data) => {
        setCatalog(data);
        const queues = data?.queues ?? [];
        setForm((prev) => ({
          ...prev,
          queue: suggestQueue(prev.category, queues),
        }));
      })
      .catch(() => setCatalog({ categories: [], priorities: [], queues: [] }));
  }, [open, apiPrefix]);

  if (!open) return null;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitting(true);
    try {
      const created = await fetchApi(`${apiPrefix}/tickets`, {
        method: 'POST',
        body: JSON.stringify({
          subject: form.subject.trim(),
          category: form.category,
          queue: form.queue,
          priority: form.priority,
          description: form.description.trim(),
          contextUrl: context?.contextUrl ?? null,
          contextLabel: context?.contextLabel ?? null,
          contextMetadata: context?.metadata ?? null,
          companyId: context?.companyId ?? null,
          unitId: context?.unitId ?? null,
        }),
      });

      flash.success(`Chamado ${created.code} aberto com sucesso.`);
      onClose();
      const queueQuery = created.queue ? `&queue=${created.queue}` : '';
      navigate(`${ticketsPath}?id=${created.id}${queueQuery}`);
    } catch (err) {
      flash.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="support-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="support-modal-head">
          <div>
            <h2 id="support-modal-title">Abrir chamado</h2>
            <p className="support-modal-subtitle">
              Descreva sua solicitação. Nossa equipe acompanhará pelo módulo de atendimento.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <form className="support-modal-body" onSubmit={onSubmit}>
          {context?.contextLabel ? (
            <div className="support-context-chip">
              <span className="support-context-label">Contexto</span>
              <strong>{context.contextLabel}</strong>
              {context.contextUrl ? <small>{context.contextUrl}</small> : null}
            </div>
          ) : null}

          <label className="field-block">
            <span className="field-label">Assunto</span>
            <input
              className="input"
              value={form.subject}
              onChange={(ev) => setForm((prev) => ({ ...prev, subject: ev.target.value }))}
              placeholder="Resumo do problema ou solicitação"
              required
              maxLength={200}
            />
          </label>

          <div className="support-form-grid">
            <label className="field-block">
              <span className="field-label">Categoria</span>
              <select
                value={form.category}
                onChange={(ev) => {
                  const category = ev.target.value;
                  setForm((prev) => ({
                    ...prev,
                    category,
                    queue: suggestQueue(category, catalog.queues),
                  }));
                }}
              >
                {(catalog.categories ?? []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">Fila</span>
              <select
                value={form.queue}
                onChange={(ev) => setForm((prev) => ({ ...prev, queue: ev.target.value }))}
              >
                {(catalog.queues ?? []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-block">
              <span className="field-label">Prioridade</span>
              <select
                value={form.priority}
                onChange={(ev) => setForm((prev) => ({ ...prev, priority: ev.target.value }))}
              >
                {(catalog.priorities ?? []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field-block">
            <span className="field-label">Descrição</span>
            <textarea
              className="input"
              rows={5}
              value={form.description}
              onChange={(ev) => setForm((prev) => ({ ...prev, description: ev.target.value }))}
              placeholder="Explique o que aconteceu, o que esperava e passos para reproduzir."
              required
            />
          </label>

          <footer className="support-modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Abrir chamado'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
