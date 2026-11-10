import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchEvolutionInstances,
  fetchWhatsAppInboxThreads,
  fetchWhatsAppThreadMessages,
} from '../api/evolution.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatMobilePhoneDisplay } from '../utils/person.js';
import '../styles/commercial-leads.css';

function formatThreadTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function displayContact(thread) {
  return (
    thread.contactName?.trim() ||
    formatMobilePhoneDisplay(thread.contactPhone) ||
    thread.contactPhone
  );
}

export function WhatsAppInboxPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('comercial.leads') || hasPermission('sistema.evolution');

  const [instances, setInstances] = useState([]);
  const [instanceFilter, setInstanceFilter] = useState('');
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    setError('');
    try {
      const rows = await fetchWhatsAppInboxThreads(instanceFilter || undefined);
      setThreads(rows ?? []);
    } catch (err) {
      setError(err.message);
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [instanceFilter]);

  const loadMessages = useCallback(async (thread) => {
    if (!thread) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    setError('');
    try {
      const rows = await fetchWhatsAppThreadMessages(thread.instanceId, thread.contactPhone);
      setMessages(rows ?? []);
    } catch (err) {
      setError(err.message);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvolutionInstances(true)
      .then((rows) => setInstances((rows ?? []).filter((row) => row.active !== false)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(() => void loadThreads(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selected && threads[0]) {
      setSelected(threads[0]);
    }
  }, [threads, selected]);

  useEffect(() => {
    if (selected) void loadMessages(selected);
    const timer = selected
      ? window.setInterval(() => void loadMessages(selected), 15_000)
      : null;
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [selected, loadMessages]);

  const selectedKey = selected?.threadKey ?? '';
  const instanceOptions = useMemo(
    () => [{ id: '', name: 'Todas as instâncias' }, ...instances],
    [instances],
  );

  if (!canView) {
    return (
      <div className="page-stack">
        <CrudAlerts error="Você não tem permissão para ver conversas WhatsApp." />
      </div>
    );
  }

  return (
      <div className="page-stack whatsapp-inbox-page">
        <PageHeader
          breadcrumbs={[{ label: 'Comercial' }, { label: 'Conversas WhatsApp' }]}
          title="Conversas WhatsApp"
          subtitle="Mensagens das instâncias conectadas. Todo número que envia mensagem vira lead no funil (pelo telefone)."
          actions={
            <Link className="btn-ghost btn-sm" to="/m/sistema/evolution">
              Instâncias
            </Link>
          }
        />

        <CrudAlerts error={error} />

        <div className="whatsapp-inbox-toolbar panel">
          <div className="panel-body whatsapp-inbox-toolbar__body">
            <label className="field-block whatsapp-inbox-filter">
              <span className="field-label">Instância</span>
              <select
                className="input"
                value={instanceFilter}
                onChange={(ev) => {
                  setInstanceFilter(ev.target.value);
                  setSelected(null);
                }}
              >
                {instanceOptions.map((row) => (
                  <option key={row.id || 'all'} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-ghost btn-sm" onClick={() => void loadThreads()}>
              Atualizar
            </button>
          </div>
        </div>

        <section className="whatsapp-inbox-shell panel">
          <div className="whatsapp-inbox-layout">
            <aside className="whatsapp-inbox-threads" aria-label="Conversas">
              {loadingThreads ? (
                <AppLoadingPanel label="Carregando conversas…" />
              ) : threads.length === 0 ? (
                <p className="whatsapp-inbox-empty muted">
                  Nenhuma mensagem ainda. Confira o webhook (`API_PUBLIC_URL`) e envie uma mensagem de
                  teste para o número conectado.
                </p>
              ) : (
                <ul className="whatsapp-inbox-thread-list">
                  {threads.map((thread) => {
                    const active = thread.threadKey === selectedKey;
                    return (
                      <li key={thread.threadKey}>
                        <button
                          type="button"
                          className={`whatsapp-inbox-thread${active ? ' is-active' : ''}`}
                          onClick={() => setSelected(thread)}
                        >
                          <span className="whatsapp-inbox-thread__title">{displayContact(thread)}</span>
                          <span className="whatsapp-inbox-thread__meta muted">
                            {thread.instanceName}
                            {thread.leadTitle ? ` · ${thread.leadTitle}` : ''}
                          </span>
                          <span className="whatsapp-inbox-thread__preview">{thread.lastMessagePreview}</span>
                          <time className="whatsapp-inbox-thread__time" dateTime={thread.lastMessageAt}>
                            {formatThreadTime(thread.lastMessageAt)}
                          </time>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </aside>

            <div className="whatsapp-inbox-chat" aria-live="polite">
              {!selected ? (
                <p className="whatsapp-inbox-empty muted">Selecione uma conversa.</p>
              ) : (
                <>
                  <header className="whatsapp-inbox-chat__head">
                    <div>
                      <h2>{displayContact(selected)}</h2>
                      <p className="muted">
                        {selected.instanceName} ·{' '}
                        {formatMobilePhoneDisplay(selected.contactPhone) || selected.contactPhone}
                      </p>
                    </div>
                    {selected.leadId ? (
                      <Link className="btn-ghost btn-sm" to="/m/comercial/leads">
                        Abrir funil
                      </Link>
                    ) : null}
                  </header>
                  <div className="whatsapp-inbox-messages">
                    {loadingMessages && messages.length === 0 ? (
                      <AppLoadingPanel label="Carregando mensagens…" />
                    ) : (
                      messages.map((msg) => (
                        <article
                          key={msg.id}
                          className={`commercial-lead-interaction-bubble commercial-lead-interaction-bubble--mobile-chat whatsapp-inbox-bubble${
                            msg.direction === 'out'
                              ? ' whatsapp-inbox-bubble--out'
                              : ' whatsapp-inbox-bubble--in'
                          }`}
                        >
                          <header className="commercial-lead-interaction-bubble-head">
                            <strong>{msg.direction === 'out' ? 'Você' : msg.contactName || 'Contato'}</strong>
                            <time dateTime={msg.messageAt}>{formatThreadTime(msg.messageAt)}</time>
                          </header>
                          <p>{msg.body}</p>
                        </article>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
  );
}
