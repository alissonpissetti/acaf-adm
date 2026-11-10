import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X, Search, RefreshCw, ImageIcon } from 'lucide-react';
import {
  fetchEvolutionInstances,
  fetchEvolutionOverview,
  fetchWhatsAppInboxThreads,
  fetchWhatsAppThreadMessages,
  markWhatsAppThreadRead,
  syncEvolutionInbox,
  syncEvolutionAvatars,
} from '../api/evolution.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { WhatsAppMessageMedia } from '../components/WhatsAppMessageMedia.jsx';
import { WhatsAppMessageBody } from '../components/WhatsAppMessageBody.jsx';
import { WhatsAppContactAvatar } from '../components/WhatsAppContactAvatar.jsx';
import { Avatar } from '../components/Avatar.jsx';
import {
  WhatsAppContactIdentity,
  whatsAppContactAvatarLabel,
} from '../components/WhatsAppContactIdentity.jsx';
import { isReactionPlaceholderBody, resolveWhatsAppContact } from '../utils/whatsappContactDisplay.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useEvolutionInboxSocket } from '../hooks/useEvolutionInboxSocket.js';
import '../styles/commercial-leads.css';
import '../styles/whatsapp-wa.css';

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

function isHumanLeadTitle(title, displayName) {
  const value = String(title ?? '').trim();
  if (!value || value === displayName) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 8 && value.replace(/[\d\s().\-]/g, '').length === 0) return false;
  return true;
}

function isMediaPlaceholderBody(body) {
  const text = String(body ?? '').trim();
  return ['[imagem]', '[vídeo]', '[áudio]', '[documento]', '[figurinha]', '(mensagem)'].includes(text);
}

function shouldRenderWhatsAppMedia(msg) {
  return Boolean(msg?.mediaKind && msg?.hasMedia && msg.mediaKind !== 'reaction');
}

function groupMessageReactions(reactions) {
  if (!Array.isArray(reactions) || !reactions.length) return [];
  const byEmoji = new Map();
  for (const row of reactions) {
    const emoji = String(row?.emoji ?? '').trim();
    if (!emoji) continue;
    const current = byEmoji.get(emoji) ?? { emoji, count: 0 };
    current.count += 1;
    byEmoji.set(emoji, current);
  }
  return [...byEmoji.values()];
}

function MessageReactions({ reactions }) {
  const chips = groupMessageReactions(reactions);
  if (!chips.length) return null;
  return (
    <div className="whatsapp-wa-reactions" aria-label="Reações">
      {chips.map((chip) => (
        <span key={chip.emoji} className="whatsapp-wa-reactions__chip" title={`Reação ${chip.emoji}`}>
          <span className="whatsapp-wa-reactions__emoji">{chip.emoji}</span>
          {chip.count > 1 ? <span className="whatsapp-wa-reactions__count">{chip.count}</span> : null}
        </span>
      ))}
    </div>
  );
}

const WHATSAPP_ROUTE = '/m/comercial/whatsapp';

export function WhatsAppInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const canView = hasPermission('comercial.leads') || hasPermission('sistema.evolution');
  const canSync =
    hasPermission('sistema.evolution.manage') || hasPermission('comercial.leads');

  const [instances, setInstances] = useState([]);
  const [instanceFilter, setInstanceFilter] = useState('');
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncingAvatars, setSyncingAvatars] = useState(false);
  const [syncHint, setSyncHint] = useState('');
  const [threadQuery, setThreadQuery] = useState('');
  const [threadKind, setThreadKind] = useState('all');

  const loadThreads = useCallback(async ({ background = false } = {}) => {
    const silent = Boolean(background);
    if (!silent) {
      setLoadingThreads(true);
    }
    setError('');
    try {
      const rows = await fetchWhatsAppInboxThreads(instanceFilter || undefined);
      setThreads(rows ?? []);
    } catch (err) {
      setError(err.message);
      if (!silent) {
        setThreads([]);
      }
    } finally {
      if (!silent) {
        setLoadingThreads(false);
      }
    }
  }, [instanceFilter]);

  const loadMessagesRequestRef = useRef(0);

  const loadMessages = useCallback(async (thread, { background = false } = {}) => {
    if (!thread?.instanceId || !String(thread.contactPhone ?? '').trim()) {
      setMessages([]);
      return;
    }
    const threadKey = thread.threadKey;
    const requestId = ++loadMessagesRequestRef.current;
    const silent = Boolean(background);

    if (!silent) {
      setLoadingMessages(true);
    }
    setError('');
    try {
      const rows = await fetchWhatsAppThreadMessages(thread.instanceId, thread.contactPhone);
      if (requestId !== loadMessagesRequestRef.current) return;
      if (activeThreadRef.current?.threadKey !== threadKey) return;
      setMessages(rows ?? []);
      setThreads((prev) =>
        prev.map((t) => (t.threadKey === threadKey ? { ...t, unreadCount: 0 } : t)),
      );
    } catch (err) {
      if (requestId !== loadMessagesRequestRef.current) return;
      if (activeThreadRef.current?.threadKey !== threadKey) return;
      setError(err.message);
      if (!silent) {
        setMessages([]);
      }
    } finally {
      if (requestId === loadMessagesRequestRef.current && !silent) {
        setLoadingMessages(false);
      }
    }
  }, []);

  const returnTo =
    typeof location.state?.returnTo === 'string' && location.state.returnTo !== WHATSAPP_ROUTE
      ? location.state.returnTo
      : '/m/operacao/dashboard';

  const closeFullscreen = useCallback(() => {
    navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  useEffect(() => {
    document.body.classList.add('whatsapp-fullscreen-open');
    return () => document.body.classList.remove('whatsapp-fullscreen-open');
  }, []);

  useEffect(() => {
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeFullscreen]);

  useEffect(() => {
    void fetchEvolutionInstances(true)
      .then((rows) => setInstances((rows ?? []).filter((row) => row.active !== false)))
      .catch(() => {});
    void fetchEvolutionOverview()
      .then((data) => setWebhookUrl(data?.webhookUrl?.trim() ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const background = threadsCountRef.current > 0;
    void loadThreads({ background });
    const timer = window.setInterval(() => void loadThreads({ background: true }), 30_000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    const pickable = (thread) =>
      thread?.instanceId && String(thread.contactPhone ?? '').trim();
    if (selected && !pickable(selected)) {
      setSelected(null);
      return;
    }
    if (!selected) {
      const first = threads.find(pickable);
      if (first) setSelected(first);
    }
  }, [threads, selected]);

  const selectedKey = selected?.threadKey ?? '';
  const activeThread = useMemo(() => {
    if (!selectedKey) return null;
    const fromList = threads.find((thread) => thread.threadKey === selectedKey);
    if (fromList) return fromList;
    return selected?.threadKey === selectedKey ? selected : null;
  }, [threads, selectedKey, selected]);

  const isGroupChat =
    Boolean(activeThread?.isGroupThread) ||
    String(activeThread?.contactPhone ?? '').startsWith('group:');

  const messagesScrollRef = useRef(null);
  const activeThreadRef = useRef(null);
  const threadsRefreshTimerRef = useRef(null);
  const threadsCountRef = useRef(0);
  threadsCountRef.current = threads.length;
  activeThreadRef.current = activeThread;

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  const scheduleLoadThreads = useCallback(() => {
    if (threadsRefreshTimerRef.current) {
      window.clearTimeout(threadsRefreshTimerRef.current);
    }
    threadsRefreshTimerRef.current = window.setTimeout(() => {
      threadsRefreshTimerRef.current = null;
      void loadThreads({ background: true });
    }, 250);
  }, [loadThreads]);

  const threadMatchesActivity = useCallback((thread, payload) => {
    if (!thread || !payload?.instanceId) return false;
    if (payload.instanceId !== thread.instanceId) return false;
    const keys = new Set(
      [payload.contactPhone, ...(payload.contactPhones ?? [])]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean),
    );
    if (keys.has(String(thread.contactPhone ?? '').trim())) return true;
    return payload.contactPhone === thread.contactPhone;
  }, []);

  const onThreadsUpdated = useCallback(
    (payload) => {
      if (instanceFilter && payload?.instanceId && payload.instanceId !== instanceFilter) {
        return;
      }
      scheduleLoadThreads();
    },
    [instanceFilter, scheduleLoadThreads],
  );

  const onThreadActivity = useCallback(
    (payload) => {
      if (!payload?.instanceId) return;

      scheduleLoadThreads();

      const open = activeThreadRef.current;
      if (!open || !threadMatchesActivity(open, payload)) return;

      const incoming = payload.message;
      if (incoming?.id) {
        if (incoming.mediaKind === 'reaction' || isReactionPlaceholderBody(incoming.body)) {
          void loadMessages(open, { background: true });
          return;
        }
        setMessages((prev) => {
          if (prev.some((row) => row.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
        setThreads((prev) =>
          prev.map((t) =>
            t.threadKey === open.threadKey
              ? {
                  ...t,
                  unreadCount: 0,
                  lastMessagePreview:
                    incoming.body?.trim() ||
                    (incoming.mediaKind ? `[${incoming.mediaKind}]` : t.lastMessagePreview),
                  lastMessageAt: incoming.messageAt ?? t.lastMessageAt,
                  lastDirection: incoming.direction ?? t.lastDirection,
                }
              : t,
          ),
        );
        void markWhatsAppThreadRead(open.instanceId, open.contactPhone).catch(() => {});
        requestAnimationFrame(() => scrollMessagesToBottom());
        return;
      }

      void loadMessages(open, { background: true });
    },
    [loadMessages, scheduleLoadThreads, threadMatchesActivity, scrollMessagesToBottom],
  );

  const renderMessageReactions = (msg) => <MessageReactions reactions={msg.reactions} />;

  const { connected: inboxSocketConnected } = useEvolutionInboxSocket({
    enabled: canView,
    instanceFilter,
    activeThread,
    onThreadsUpdated,
    onThreadActivity,
  });

  const selectThread = useCallback(
    (thread) => {
      if (!thread?.threadKey) return;
      if (thread.threadKey === selectedKey) return;
      loadMessagesRequestRef.current += 1;
      setMessages([]);
      setLoadingMessages(true);
      setSelected(thread);
    },
    [selectedKey],
  );

  useEffect(() => {
    if (!activeThread?.threadKey) {
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }

    const threadKey = activeThread.threadKey;
    void loadMessages(activeThread);

    const pollMs = inboxSocketConnected ? 120_000 : 12_000;
    const timer = window.setInterval(() => {
      const open = activeThreadRef.current;
      if (open?.threadKey !== threadKey) return;
      void loadMessages(open, { background: true });
    }, pollMs);

    return () => {
      window.clearInterval(timer);
      loadMessagesRequestRef.current += 1;
    };
  }, [activeThread?.threadKey, loadMessages, inboxSocketConnected]);

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages, loadingMessages, activeThread?.threadKey, scrollMessagesToBottom]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return undefined;

    const keepAtBottom = () => scrollMessagesToBottom();
    const observer = new ResizeObserver(keepAtBottom);
    observer.observe(el);

    return () => observer.disconnect();
  }, [activeThread?.threadKey, scrollMessagesToBottom]);
  const instanceOptions = useMemo(
    () => [{ id: '', name: 'Todas as instâncias' }, ...instances],
    [instances],
  );

  const visibleThreads = useMemo(() => {
    const byKind = threads.filter((thread) => {
      const isGroup = Boolean(thread.isGroupThread) || String(thread.contactPhone).startsWith('group:');
      if (threadKind === 'groups') return isGroup;
      if (threadKind === 'direct') return !isGroup;
      return true;
    });

    const raw = threadQuery.trim();
    if (!raw) return byKind;
    const q = raw.toLowerCase();
    const qDigits = raw.replace(/\D/g, '');
    return byKind.filter((thread) => {
      const haystack = resolveWhatsAppContact(thread).searchText;
      if (haystack.includes(q)) return true;
      if (qDigits.length >= 3 && haystack.replace(/\D/g, '').includes(qDigits)) return true;
      return false;
    });
  }, [threads, threadQuery, threadKind]);

  const totalUnread = useMemo(
    () => visibleThreads.reduce((sum, thread) => sum + Number(thread.unreadCount ?? 0), 0),
    [visibleThreads],
  );

  const webhookHint = useMemo(() => {
    if (!webhookUrl) {
      return 'Configure em Sistema → Configurações a URL pública (ou API_PUBLIC_URL no servidor) e reinicie a API. Depois, em Instâncias, use “Atualizar status” para reaplicar o webhook.';
    }
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(webhookUrl)) {
      return `A URL do webhook (${webhookUrl}) não é acessível pela Evolution na internet. Use um domínio ou túnel público (HTTPS).`;
    }
    return `Webhook registrado: ${webhookUrl} — a Evolution precisa alcançar esse endereço. Se EVOLUTION_WEBHOOK_SECRET estiver no .env, o mesmo valor precisa estar no webhook da instância (Atualizar status).`;
  }, [webhookUrl]);

  async function handleSyncAvatars() {
    const targetId = instanceFilter || instances[0]?.id;
    if (!targetId) {
      setError('Selecione uma instância para verificar as fotos.');
      return;
    }
    setSyncingAvatars(true);
    setError('');
    setSyncHint('');
    try {
      const result = await syncEvolutionAvatars(targetId);
      if (result?.message) {
        setSyncHint(result.message);
      }
      await loadThreads({ background: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncingAvatars(false);
    }
  }

  async function handleSyncInbox() {
    const targetId = instanceFilter || instances[0]?.id;
    if (!targetId) {
      setError('Selecione uma instância para sincronizar.');
      return;
    }
    setSyncing(true);
    setError('');
    setSyncHint('');
    try {
      const result = await syncEvolutionInbox(targetId);
      if (!result?.ok && result?.message) {
        setError(result.message);
      } else if (result?.message) {
        setSyncHint(result.message);
      }
      await loadThreads({ background: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (!canView) {
    return (
      <div className="whatsapp-fullscreen-page">
        <header className="whatsapp-fullscreen-topbar">
          <button type="button" className="whatsapp-fullscreen-close" onClick={closeFullscreen}>
            <X size={20} aria-hidden="true" />
            <span>Fechar</span>
          </button>
        </header>
        <div className="whatsapp-fullscreen-body">
          <CrudAlerts error="Você não tem permissão para ver conversas WhatsApp." />
        </div>
      </div>
    );
  }

  return (
    <div className="whatsapp-fullscreen-page whatsapp-wa">
      <div className="whatsapp-wa-alerts">
        <CrudAlerts error={error} message={syncHint} />
      </div>

      <div className="whatsapp-wa-layout">
        <aside className="whatsapp-wa-sidebar" aria-label="Conversas">
          <header className="whatsapp-wa-sidebar__head">
            <div className="whatsapp-wa-sidebar__brand">
              <button
                type="button"
                className="whatsapp-wa-icon-btn"
                aria-label="Fechar conversas e voltar ao sistema"
                onClick={closeFullscreen}
              >
                <X size={20} aria-hidden="true" />
              </button>
              <span className="whatsapp-wa-sidebar__title">WhatsApp</span>
              {totalUnread > 0 ? (
                <span className="whatsapp-wa-sidebar__unread-pill">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              ) : null}
            </div>
            <div className="whatsapp-wa-sidebar__tools">
              <select
                className="whatsapp-wa-select"
                aria-label="Filtrar por instância"
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
              <button
                type="button"
                className="whatsapp-wa-icon-btn"
                aria-label="Atualizar lista"
                title="Atualizar"
                onClick={() => void loadThreads({ background: true })}
              >
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="whatsapp-wa-sidebar__filters">
            <div className="whatsapp-wa-search">
              <Search size={18} className="whatsapp-wa-search__icon" aria-hidden="true" />
              <input
                className="whatsapp-wa-search__input"
                type="search"
                aria-label="Buscar conversa"
                placeholder="Pesquisar ou selecionar conversa"
                value={threadQuery}
                onChange={(ev) => setThreadQuery(ev.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="whatsapp-wa-kind-tabs" role="tablist" aria-label="Tipo de conversa">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'direct', label: 'Diretas' },
                { id: 'groups', label: 'Grupos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={threadKind === tab.id}
                  className={`whatsapp-wa-kind-tab${threadKind === tab.id ? ' is-active' : ''}`}
                  onClick={() => setThreadKind(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="whatsapp-wa-chat-list">
            {loadingThreads && threads.length === 0 ? (
              <AppLoadingPanel label="Carregando conversas…" />
            ) : threads.length === 0 ? (
              <div className="whatsapp-inbox-empty muted">
                <p>Nenhuma mensagem salva ainda.</p>
                <p>{webhookHint}</p>
                <p>
                  Envie uma mensagem de teste ou use &quot;Sincronizar&quot; na barra inferior para importar o
                  histórico.
                </p>
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="whatsapp-inbox-empty muted">
                <p>Nenhuma conversa combina com &quot;{threadQuery.trim()}&quot;.</p>
              </div>
            ) : (
              <ul className="whatsapp-wa-chats">
                {visibleThreads.map((thread) => {
                  const active = thread.threadKey === selectedKey;
                  const contact = resolveWhatsAppContact(thread);
                  const unreadCount = Number(thread.unreadCount ?? 0);
                  const isUnread = unreadCount > 0;
                  return (
                    <li key={thread.threadKey}>
                      <button
                        type="button"
                        className={`whatsapp-wa-chat-item${active ? ' is-active' : ''}${
                          isUnread ? ' is-unread' : ''
                        }`}
                        onClick={() => selectThread(thread)}
                      >
                        <WhatsAppContactAvatar
                          className="whatsapp-wa-chat-item__avatar"
                          name={whatsAppContactAvatarLabel(thread)}
                          instanceId={thread.instanceId}
                          contactPhone={thread.contactPhone}
                          avatarUrl={thread.avatarUrl}
                          size="md"
                        />
                        <span className="whatsapp-wa-chat-item__body">
                          <span className="whatsapp-wa-chat-item__name">{contact.title}</span>
                          <time className="whatsapp-wa-chat-item__time" dateTime={thread.lastMessageAt}>
                            {formatThreadTime(thread.lastMessageAt)}
                          </time>
                          <span className="whatsapp-wa-chat-item__preview">
                            {thread.lastDirection === 'out' ? 'Você: ' : ''}
                            {thread.lastMessagePreview}
                          </span>
                          {isUnread ? (
                            <span className="whatsapp-wa-chat-item__badge" aria-label={`${unreadCount} não lidas`}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          ) : (
                            <span className="whatsapp-wa-chat-item__badge-spacer" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {canSync ? (
            <footer className="whatsapp-wa-sidebar__foot">
              <button
                type="button"
                className="whatsapp-wa-foot-btn"
                disabled={syncingAvatars || syncing}
                onClick={() => void handleSyncAvatars()}
              >
                <ImageIcon size={16} aria-hidden="true" />
                {syncingAvatars ? 'Fotos…' : 'Atualizar fotos'}
              </button>
              <button
                type="button"
                className="whatsapp-wa-foot-btn whatsapp-wa-foot-btn--primary"
                disabled={syncing || syncingAvatars}
                onClick={() => void handleSyncInbox()}
              >
                {syncing ? 'Sincronizando…' : 'Sincronizar conversas'}
              </button>
              <button
                type="button"
                className="whatsapp-wa-foot-btn whatsapp-wa-foot-btn--link"
                onClick={() => navigate('/m/sistema/evolution')}
              >
                Instâncias
              </button>
            </footer>
          ) : null}
        </aside>

        <main className="whatsapp-wa-main" aria-live="polite">
          {!activeThread ? (
            <div className="whatsapp-wa-welcome">
              <div className="whatsapp-wa-welcome__icon" aria-hidden="true" />
              <h2>Conversas WhatsApp</h2>
              <p className="muted">
                Selecione um chat à esquerda para ver o histórico sincronizado da Evolution.
              </p>
            </div>
          ) : (
            <>
              <header className="whatsapp-wa-chat-head">
                <WhatsAppContactAvatar
                  className="whatsapp-wa-chat-head__avatar"
                  name={whatsAppContactAvatarLabel(activeThread)}
                  instanceId={activeThread.instanceId}
                  contactPhone={activeThread.contactPhone}
                  avatarUrl={activeThread.avatarUrl}
                  size="lg"
                />
                <div className="whatsapp-wa-chat-head__info">
                  <WhatsAppContactIdentity
                    thread={activeThread}
                    variant="header"
                    showBadge={false}
                    showInstance={false}
                  />
                </div>
                <div className="whatsapp-wa-chat-head__actions">
                  {activeThread.leadId ? (
                    <Link className="whatsapp-wa-head-link" to="/m/comercial/leads">
                      Lead
                    </Link>
                  ) : null}
                </div>
              </header>

              <div className="whatsapp-wa-messages" ref={messagesScrollRef}>
                {loadingMessages && messages.length === 0 ? (
                  <AppLoadingPanel label="Carregando mensagens…" />
                ) : (
                  messages.map((msg) => {
                    if (msg.mediaKind === 'reaction' || isReactionPlaceholderBody(msg.body)) return null;
                    const showGroupSender =
                      isGroupChat && msg.direction === 'in' && Boolean(msg.senderName?.trim());
                    const isOut = msg.direction === 'out';
                    const bubbleTone = isOut
                      ? 'commercial-lead-interaction-bubble--mobile-chat'
                      : 'commercial-lead-interaction-bubble--manual';
                    const bubbleClass = `commercial-lead-interaction-bubble ${bubbleTone} whatsapp-wa-bubble${
                      isOut ? ' whatsapp-wa-bubble--out' : ' whatsapp-wa-bubble--in'
                    }${showGroupSender ? ' whatsapp-wa-bubble--group' : ''}`;

                    const mediaBlock = shouldRenderWhatsAppMedia(msg) ? (
                      <WhatsAppMessageMedia
                        key={`${msg.id}:${msg.mediaKind}`}
                        messageId={msg.id}
                        mediaKind={msg.mediaKind}
                        alt={msg.direction === 'out' ? 'Mídia enviada' : 'Mídia recebida'}
                      />
                    ) : msg.mediaKind && !msg.hasMedia ? (
                      <p className="whatsapp-inbox-media-error muted">
                        Mídia pendente — sincronize para copiar ao Nextcloud.
                      </p>
                    ) : null;

                        const bodyBlock =
                          msg.body?.trim() &&
                          !isReactionPlaceholderBody(msg.body) &&
                          !(shouldRenderWhatsAppMedia(msg) && isMediaPlaceholderBody(msg.body)) ? (
                            <WhatsAppMessageBody body={msg.body} />
                          ) : null;

                    const timeEl = (
                      <time className="whatsapp-wa-bubble__time" dateTime={msg.messageAt}>
                        {formatThreadTime(msg.messageAt)}
                      </time>
                    );

                    if (showGroupSender) {
                      return (
                        <article key={msg.id} className="whatsapp-wa-group-row">
                          <Avatar
                            name={msg.senderName}
                            size="sm"
                            className="whatsapp-wa-group-row__avatar"
                          />
                          <div className={bubbleClass}>
                            <span className="whatsapp-wa-bubble__sender">{msg.senderName}</span>
                            {mediaBlock}
                            {bodyBlock}
                            {renderMessageReactions(msg)}
                            <footer className="whatsapp-wa-bubble__foot">{timeEl}</footer>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article key={msg.id} className={bubbleClass}>
                        {mediaBlock}
                        {bodyBlock}
                        {renderMessageReactions(msg)}
                        <footer className="whatsapp-wa-bubble__foot">{timeEl}</footer>
                      </article>
                    );
                  })
                )}
              </div>

              <footer className="whatsapp-wa-composer" aria-hidden="true">
                <p className="muted">Leitura pelo painel — resposta pelo celular conectado à instância.</p>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
