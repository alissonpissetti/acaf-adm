import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, X, Search, RefreshCw, Smartphone } from 'lucide-react';
import {
  fetchWhatsAppInboxInstances,
  fetchWhatsAppInboxThreads,
  fetchWhatsAppThreadMessages,
  markWhatsAppThreadRead,
  setWhatsAppThreadArchived,
} from '../api/evolution.js';
import { WhatsAppThreadListSkeleton } from '../components/WhatsAppThreadListSkeleton.jsx';
import { WhatsAppMessagesSkeleton } from '../components/WhatsAppMessagesSkeleton.jsx';
import { WhatsAppMessageMedia } from '../components/WhatsAppMessageMedia.jsx';
import { WhatsAppMessageBody } from '../components/WhatsAppMessageBody.jsx';
import { WhatsAppMessageQuote } from '../components/WhatsAppMessageQuote.jsx';
import { WhatsAppMessageAck } from '../components/WhatsAppMessageAck.jsx';
import { WhatsAppContactAvatar } from '../components/WhatsAppContactAvatar.jsx';
import { Avatar } from '../components/Avatar.jsx';
import {
  WhatsAppContactIdentity,
  whatsAppContactAvatarLabel,
} from '../components/WhatsAppContactIdentity.jsx';
import { isReactionPlaceholderBody, resolveWhatsAppContact } from '../utils/whatsappContactDisplay.js';
import {
  WHATSAPP_THREADS_PAGE_SIZE,
  mergeWhatsAppThreadPages,
  normalizeWhatsAppThreadsResponse,
  readWhatsAppThreadsCache,
  whatsAppThreadsCacheKey,
  writeWhatsAppThreadsCache,
} from '../utils/whatsappInboxThreadsCache.js';
import {
  readWhatsAppMessagesCache,
  writeWhatsAppMessagesCache,
} from '../utils/whatsappInboxMessagesCache.js';
import { prefetchWhatsAppAvatars } from '../utils/whatsappAvatarCache.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useEvolutionInboxSocket } from '../hooks/useEvolutionInboxSocket.js';
import '../styles/commercial-leads.css';
import '../styles/whatsapp-wa.css';
import { formatBrazilThreadTime, parseApiDateTime } from '../utils/brazilDateTime.js';

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

function isRenderableInboxMessage(msg) {
  if (!msg?.id) return false;
  if (msg.mediaKind === 'reaction' || isReactionPlaceholderBody(msg.body)) return false;
  const text = String(msg.body ?? '').trim();
  if (text && !isMediaPlaceholderBody(text)) return true;
  if (msg.quote) return true;
  if (msg.mediaKind && msg.hasMedia) return true;
  return Boolean(text);
}

function mergeMessagesById(prev, incoming) {
  if (!incoming?.id) return prev;
  const idx = prev.findIndex((row) => row.id === incoming.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = { ...next[idx], ...incoming };
    return next;
  }
  const at = incoming.messageAt ? parseApiDateTime(incoming.messageAt)?.getTime() ?? 0 : 0;
  let insertAt = prev.length;
  for (let i = 0; i < prev.length; i += 1) {
    const rowAt = prev[i]?.messageAt ? parseApiDateTime(prev[i].messageAt)?.getTime() ?? 0 : 0;
    if (at < rowAt) {
      insertAt = i;
      break;
    }
  }
  const next = [...prev];
  next.splice(insertAt, 0, incoming);
  return next;
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
const THREADS_SOCKET_DEBOUNCE_MS = 600;
const THREADS_MIN_INTERVAL_MS = 5_000;
const MESSAGES_BACKGROUND_MIN_MS = 45_000;
const MESSAGES_OPEN_CHAT_MIN_MS = 2_500;
const MESSAGES_REALTIME_URGENT_MIN_MS = 400;
const OPEN_CHAT_POLL_MS = 5_000;
const OPEN_CHAT_POLL_NO_SOCKET_MS = 12_000;

function contactKeysFromActivity(payload) {
  return new Set(
    [payload?.contactPhone, ...(payload?.contactPhones ?? [])]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  );
}

function digitsOnly(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? digits : '';
}

function groupKeyDigits(value) {
  const text = String(value ?? '').trim();
  if (!text.startsWith('group:')) return '';
  return text.slice(6).replace(/\D/g, '');
}

function contactKeysEquivalent(a, b) {
  const left = String(a ?? '').trim();
  const right = String(b ?? '').trim();
  if (!left || !right) return false;
  if (left === right) return true;

  const groupLeft = groupKeyDigits(left);
  const groupRight = groupKeyDigits(right);
  if (groupLeft && groupRight) {
    if (groupLeft === groupRight) return true;
    const minLen = Math.min(groupLeft.length, groupRight.length);
    if (minLen >= 6) {
      return groupLeft.endsWith(groupRight) || groupRight.endsWith(groupLeft);
    }
  }

  const dLeft = digitsOnly(left);
  const dRight = digitsOnly(right);
  return Boolean(dLeft && dRight && dLeft === dRight);
}

function threadRowMatchesContactKeys(thread, instanceId, keys) {
  if (!thread || thread.instanceId !== instanceId) return false;
  const contact = String(thread.contactPhone ?? '').trim();
  if (keys.has(contact)) return true;
  for (const key of keys) {
    if (contactKeysEquivalent(contact, key)) return true;
  }
  return false;
}

export function WhatsAppInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const canView = hasPermission('comercial.leads') || hasPermission('sistema.evolution');
  const canOpenEvolutionAdmin = hasPermission('sistema.evolution');
  const [instances, setInstances] = useState([]);
  const [instanceFilter, setInstanceFilter] = useState('');
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [threadsHasMore, setThreadsHasMore] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [error, setError] = useState('');
  const [syncHint, setSyncHint] = useState('');
  const [threadQuery, setThreadQuery] = useState('');
  const [threadKind, setThreadKind] = useState('all');

  const instancesFetchInFlightRef = useRef(false);

  const loadInboxInstances = useCallback(async () => {
    if (instancesFetchInFlightRef.current) return;
    instancesFetchInFlightRef.current = true;
    try {
      const rows = await fetchWhatsAppInboxInstances();
      setInstances(rows ?? []);
    } catch {
      /* mantém lista anterior */
    } finally {
      instancesFetchInFlightRef.current = false;
    }
  }, []);

  const inboxListView = threadKind === 'archived' ? 'archived' : 'active';

  const threadsFetchInFlightRef = useRef(false);
  const messagesFetchInFlightRef = useRef(false);
  const threadsLastFetchAtRef = useRef(0);
  const threadsPendingAfterFlightRef = useRef(false);
  const chatListRef = useRef(null);

  const loadThreads = useCallback(
    async ({
      background = false,
      light = false,
      urgent = false,
      append = false,
      replace = false,
      offset = 0,
      force = false,
    } = {}) => {
      const silent = Boolean(background);
      const useLight = force ? Boolean(light) : silent || light || !append;
      const now = Date.now();
      if (silent && !urgent && !append && now - threadsLastFetchAtRef.current < THREADS_MIN_INTERVAL_MS) {
        threadsPendingAfterFlightRef.current = true;
        return;
      }
      if (threadsFetchInFlightRef.current) {
        threadsPendingAfterFlightRef.current = true;
        return;
      }
      threadsFetchInFlightRef.current = true;
      if (append) {
        setLoadingMoreThreads(true);
      } else if (!silent) {
        setLoadingThreads(true);
      }
      if (!silent && !append) setError('');
      const cacheKey = whatsAppThreadsCacheKey(instanceFilter, inboxListView);
      try {
        const response = await fetchWhatsAppInboxThreads(instanceFilter || undefined, {
          view: inboxListView,
          light: useLight,
          limit: WHATSAPP_THREADS_PAGE_SIZE,
          offset,
        });
        const page = normalizeWhatsAppThreadsResponse(response);
        const rows = page.threads ?? [];
        setThreadsHasMore(Boolean(page.hasMore));
        setThreads((prev) => {
          const next =
            append && !replace ? mergeWhatsAppThreadPages(prev, rows) : mergeWhatsAppThreadPages([], rows);
          writeWhatsAppThreadsCache(cacheKey, {
            threads: next,
            hasMore: Boolean(page.hasMore),
          });
          return next;
        });
        threadsLastFetchAtRef.current = Date.now();
      } catch (err) {
        if (!silent && !append) {
          setError(err.message);
          setThreads([]);
          setThreadsHasMore(false);
        }
      } finally {
        threadsFetchInFlightRef.current = false;
        if (append) {
          setLoadingMoreThreads(false);
        } else if (!silent) {
          setLoadingThreads(false);
        }
        if (threadsPendingAfterFlightRef.current) {
          threadsPendingAfterFlightRef.current = false;
          window.setTimeout(
            () => void loadThreads({ background: true, light: true, urgent: true, replace: true, offset: 0 }),
            400,
          );
        }
      }
    },
    [instanceFilter, inboxListView],
  );

  const loadMoreThreads = useCallback(() => {
    if (!threadsHasMore || loadingMoreThreads || threadsFetchInFlightRef.current) return;
    void loadThreads({
      background: true,
      light: true,
      append: true,
      offset: threadsCountRef.current,
    });
  }, [loadThreads, loadingMoreThreads, threadsHasMore]);

  const onChatListScroll = useCallback(() => {
    const el = chatListRef.current;
    if (!el || !threadsHasMore || loadingMoreThreads || threadsFetchInFlightRef.current) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 140) return;
    loadMoreThreads();
  }, [loadMoreThreads, loadingMoreThreads, threadsHasMore]);

  const loadMessagesRequestRef = useRef(0);
  const messagesLastBackgroundAtRef = useRef(0);
  const messagesPendingAfterFlightRef = useRef(null);

  const applyThreadMessages = useCallback((threadKey, rows) => {
    setMessages(rows ?? []);
    writeWhatsAppMessagesCache(threadKey, rows ?? []);
    setThreads((prev) => prev.map((t) => (t.threadKey === threadKey ? { ...t, unreadCount: 0 } : t)));
  }, []);

  const loadMessagesRef = useRef(async () => {});

  const loadMessages = useCallback(
    async (thread, { background = false, force = false, realtime = false, urgent = false } = {}) => {
      if (!thread?.instanceId || !String(thread.contactPhone ?? '').trim()) {
        setMessages([]);
        setSyncingMessages(false);
        return;
      }
      if (messagesFetchInFlightRef.current) {
        messagesPendingAfterFlightRef.current = {
          thread,
          background,
          force,
          realtime,
          urgent: urgent || realtime,
        };
        if (force) {
          loadMessagesRequestRef.current += 1;
        }
        return;
      }
      if (background) {
        const minGap = urgent
          ? MESSAGES_REALTIME_URGENT_MIN_MS
          : realtime
            ? MESSAGES_OPEN_CHAT_MIN_MS
            : MESSAGES_BACKGROUND_MIN_MS;
        const since = Date.now() - messagesLastBackgroundAtRef.current;
        if (since < minGap) return;
      }
      messagesFetchInFlightRef.current = true;
      const threadKey = thread.threadKey;
      const requestId = ++loadMessagesRequestRef.current;
      const silent = Boolean(background);

      if (!silent) {
        const cached = readWhatsAppMessagesCache(threadKey);
        if (cached?.length) {
          setMessages(cached);
          setLoadingMessages(false);
        } else {
          setLoadingMessages(true);
        }
        setError('');
      }
      const watchThread = Boolean(background && (realtime || urgent));
      const useBlockingRemote = Boolean(force);
      try {
        const localRows = await fetchWhatsAppThreadMessages(thread.instanceId, thread.contactPhone, {
          syncRemote: watchThread ? 'auto' : false,
          watch: watchThread,
        });
        if (requestId !== loadMessagesRequestRef.current) return;
        if (activeThreadRef.current?.threadKey !== threadKey) return;
        applyThreadMessages(threadKey, localRows);
        messagesLastBackgroundAtRef.current = Date.now();
        if (background && !useBlockingRemote) {
          setLoadingMessages(false);
          setSyncingMessages(false);
          return;
        }

        setLoadingMessages(false);
      } catch (err) {
        if (requestId !== loadMessagesRequestRef.current) return;
        if (activeThreadRef.current?.threadKey !== threadKey) return;
        setError(err.message);
        if (!silent) {
          setMessages([]);
        }
        setSyncingMessages(false);
      } finally {
        if (requestId === loadMessagesRequestRef.current) {
          messagesFetchInFlightRef.current = false;
          if (!silent) {
            setLoadingMessages(false);
          }
          const pending = messagesPendingAfterFlightRef.current;
          if (pending) {
            messagesPendingAfterFlightRef.current = null;
            window.setTimeout(() => void loadMessagesRef.current(pending.thread, pending), 80);
          }
        }
      }

      if ((silent && !useBlockingRemote) || requestId !== loadMessagesRequestRef.current) return;
      if (activeThreadRef.current?.threadKey !== threadKey) return;

      setSyncingMessages(true);
      const remoteRequestId = requestId;
      try {
        const remoteRows = await fetchWhatsAppThreadMessages(thread.instanceId, thread.contactPhone, {
          syncRemote: true,
          watch: watchThread,
        });
        if (remoteRequestId !== loadMessagesRequestRef.current) return;
        if (activeThreadRef.current?.threadKey !== threadKey) return;
        applyThreadMessages(threadKey, remoteRows);
      } catch {
        /* mantém histórico local já exibido */
      } finally {
        if (remoteRequestId === loadMessagesRequestRef.current) {
          setSyncingMessages(false);
        }
      }
    },
    [applyThreadMessages],
  );

  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

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
    void loadInboxInstances();
  }, [loadInboxInstances]);

  useEffect(() => {
    if (!instanceFilter) return;
    if (!instances.some((row) => row.id === instanceFilter)) {
      setInstanceFilter('');
      setSelected(null);
    }
  }, [instances, instanceFilter]);

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
      void loadThreads({ background: true, light: true, urgent: true });
    }, THREADS_SOCKET_DEBOUNCE_MS);
  }, [loadThreads]);

  const patchThreadFromActivity = useCallback((payload) => {
    const incoming = payload?.message;
    if (!incoming?.id || !payload?.instanceId) return false;
    const keys = contactKeysFromActivity(payload);
    const preview =
      incoming.body?.trim() ||
      (incoming.mediaKind ? `[${incoming.mediaKind}]` : '');
    const instanceId = payload.instanceId;
    const at = incoming.messageAt ?? new Date().toISOString();
    let touched = false;

    setThreads((prev) => {
      const next = prev.map((t) => {
        if (!threadRowMatchesContactKeys(t, instanceId, keys)) return t;
        touched = true;
        const open = activeThreadRef.current;
        const isOpen = open && threadRowMatchesContactKeys(open, instanceId, keys);
        return {
          ...t,
          lastMessagePreview: preview || t.lastMessagePreview,
          lastMessageAt: at || t.lastMessageAt,
          lastDirection: incoming.direction ?? t.lastDirection,
          unreadCount: isOpen ? 0 : Math.max(1, Number(t.unreadCount ?? 0)),
        };
      });
      if (!touched) return prev;
      return [...next].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
    });
    return touched;
  }, []);

  const threadMatchesActivity = useCallback((thread, payload) => {
    if (!thread || !payload?.instanceId) return false;
    return threadRowMatchesContactKeys(thread, payload.instanceId, contactKeysFromActivity(payload));
  }, []);

  const onThreadsUpdated = useCallback(
    (payload) => {
      if (instanceFilter && payload?.instanceId && payload.instanceId !== instanceFilter) {
        return;
      }
      scheduleLoadThreads();
      const open = activeThreadRef.current;
      if (open && payload?.instanceId && open.instanceId === payload.instanceId) {
        void loadMessages(open, { background: true, realtime: true, urgent: true });
      }
    },
    [instanceFilter, loadMessages, scheduleLoadThreads],
  );

  const onThreadActivity = useCallback(
    (payload) => {
      if (!payload?.instanceId) return;
      if (instanceFilter && payload.instanceId !== instanceFilter) return;

      const open = activeThreadRef.current;
      const incoming = payload.message;
      const matchesOpen = open && threadMatchesActivity(open, payload);
      const previewText =
        incoming?.body?.trim() ||
        (incoming?.quote?.body ? `↩ ${incoming.quote.body}` : '') ||
        (incoming?.mediaKind ? `[${incoming.mediaKind}]` : '');

      if (matchesOpen && isRenderableInboxMessage(incoming)) {
        setMessages((prev) => {
          const merged = mergeMessagesById(prev, incoming);
          writeWhatsAppMessagesCache(open.threadKey, merged);
          return merged;
        });
        setThreads((prev) =>
          prev.map((t) =>
            t.threadKey === open.threadKey
              ? {
                  ...t,
                  unreadCount: 0,
                  lastMessagePreview: previewText || t.lastMessagePreview,
                  lastMessageAt: incoming.messageAt ?? t.lastMessageAt,
                  lastDirection: incoming.direction ?? t.lastDirection,
                }
              : t,
          ),
        );
        void markWhatsAppThreadRead(open.instanceId, open.contactPhone).catch(() => {});
        requestAnimationFrame(() => scrollMessagesToBottom());
        if (incoming.quote || isMediaPlaceholderBody(incoming.body)) {
          void loadMessages(open, { background: true, realtime: true, urgent: true });
        }
        return;
      }

      if (matchesOpen && (payload.messageId || payload.ingested)) {
        void loadMessages(open, { background: true, realtime: true, urgent: true });
        patchThreadFromActivity(payload);
        return;
      }

      if (matchesOpen) {
        void loadMessages(open, { background: true, realtime: true, urgent: true });
        patchThreadFromActivity(payload);
        return;
      }

      if (patchThreadFromActivity(payload)) return;

      scheduleLoadThreads();
    },
    [
      instanceFilter,
      loadMessages,
      patchThreadFromActivity,
      scheduleLoadThreads,
      threadMatchesActivity,
      scrollMessagesToBottom,
    ],
  );

  const renderMessageReactions = (msg) => <MessageReactions reactions={msg.reactions} />;

  const { connected: inboxSocketConnected } = useEvolutionInboxSocket({
    enabled: canView,
    instanceFilter,
    activeThread,
    onThreadsUpdated,
    onThreadActivity,
  });

  useEffect(() => {
    const cacheKey = whatsAppThreadsCacheKey(instanceFilter, inboxListView);
    const cached = readWhatsAppThreadsCache(cacheKey);
    if (cached?.threads?.length) {
      setThreads(cached.threads);
      setThreadsHasMore(Boolean(cached.hasMore));
      setLoadingThreads(false);
    } else {
      setThreads([]);
      setThreadsHasMore(false);
      setLoadingThreads(true);
    }
    void loadThreads({
      background: Boolean(cached?.threads?.length),
      light: true,
      replace: true,
      offset: 0,
    });
  }, [instanceFilter, inboxListView, loadThreads]);

  useEffect(() => {
    if (!threads.length) return;
    prefetchWhatsAppAvatars(threads);
  }, [threads]);

  const threadsPollCountRef = useRef(0);

  useEffect(() => {
    const intervalMs = inboxSocketConnected ? 120_000 : 25_000;
    const timer = window.setInterval(() => {
      threadsPollCountRef.current += 1;
      const fullListSync = threadsPollCountRef.current % 4 === 0;
      void loadThreads({ background: true, light: !fullListSync, urgent: fullListSync });
    }, intervalMs);
    const instancesTimer = window.setInterval(() => void loadInboxInstances(), 180_000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(instancesTimer);
    };
  }, [loadThreads, loadInboxInstances, inboxSocketConnected]);

  const selectThread = useCallback(
    (thread) => {
      if (!thread?.threadKey) return;
      if (thread.threadKey === selectedKey) return;
      loadMessagesRequestRef.current += 1;
      setSyncingMessages(false);
      const cached = readWhatsAppMessagesCache(thread.threadKey);
      if (cached?.length) {
        setMessages(cached);
        setLoadingMessages(false);
      } else {
        setMessages([]);
        setLoadingMessages(true);
      }
      setThreads((prev) =>
        prev.map((t) => (t.threadKey === thread.threadKey ? { ...t, unreadCount: 0 } : t)),
      );
      setSelected(thread);
      void markWhatsAppThreadRead(thread.instanceId, thread.contactPhone).catch(() => {});
    },
    [selectedKey],
  );

  useEffect(() => {
    if (!activeThread?.threadKey) {
      setMessages([]);
      setLoadingMessages(false);
      messagesPendingAfterFlightRef.current = null;
      return undefined;
    }

    void loadMessages(activeThread, { force: true });

    return () => {
      loadMessagesRequestRef.current += 1;
      messagesPendingAfterFlightRef.current = null;
    };
  }, [activeThread?.threadKey, loadMessages]);

  useEffect(() => {
    if (!activeThread?.threadKey) return undefined;

    const threadKey = activeThread.threadKey;
    const pollMs = inboxSocketConnected ? OPEN_CHAT_POLL_MS : OPEN_CHAT_POLL_NO_SOCKET_MS;
    const timer = window.setInterval(() => {
      const open = activeThreadRef.current;
      if (open?.threadKey !== threadKey) return;
      void loadMessages(open, { background: true, realtime: true });
    }, pollMs);

    return () => window.clearInterval(timer);
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
      if (threadKind === 'archived') return true;
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

  const inboxListEmptyMessage = useMemo(() => {
    if (!instances.length) {
      if (canOpenEvolutionAdmin) {
        return 'Nenhum WhatsApp conectado. Use Instâncias, no rodapé desta tela, para vincular seu número.';
      }
      return 'Nenhum WhatsApp conectado ainda. Peça a um administrador para vincular uma instância.';
    }
    return 'Nenhuma conversa ainda. Quando chegar mensagem no WhatsApp conectado, ela aparece aqui.';
  }, [canOpenEvolutionAdmin, instances.length]);

  async function handleToggleArchive() {
    if (!activeThread?.instanceId || !activeThread?.contactPhone) return;
    const archive = !Boolean(activeThread.isArchived);
    setError('');
    try {
      const result = await setWhatsAppThreadArchived(
        activeThread.instanceId,
        activeThread.contactPhone,
        archive,
      );
      if (result?.warning) {
        setSyncHint(result.warning);
      } else {
        setSyncHint('');
      }
      if (archive) {
        setSelected(null);
        setMessages([]);
      }
      await loadThreads({ background: true, light: true, replace: true, offset: 0 });
    } catch (err) {
      setError(err.message);
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
              {!inboxSocketConnected ? (
                <span className="whatsapp-wa-realtime-hint" title="Atualização automática a cada poucos segundos">
                  sincronizando…
                </span>
              ) : null}
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
                onClick={() => {
                  void loadThreads({ background: false, light: false, replace: true, offset: 0, force: true });
                  const open = activeThreadRef.current;
                  if (open?.instanceId && String(open.contactPhone ?? '').trim()) {
                    void loadMessages(open, { force: true, urgent: true });
                  }
                }}
              >
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="whatsapp-wa-sidebar__filters">
            <div className="whatsapp-wa-search" role="search">
              <span className="whatsapp-wa-search__icon-wrap" aria-hidden="true">
                <Search size={17} strokeWidth={2.25} />
              </span>
              <input
                className="whatsapp-wa-search__input"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                aria-label="Buscar conversa"
                placeholder="Pesquisar conversa"
                value={threadQuery}
                onChange={(ev) => setThreadQuery(ev.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {threadQuery.trim() ? (
                <button
                  type="button"
                  className="whatsapp-wa-search__clear"
                  aria-label="Limpar busca"
                  onClick={() => setThreadQuery('')}
                >
                  <X size={18} strokeWidth={2.25} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="whatsapp-wa-kind-tabs" role="tablist" aria-label="Tipo de conversa">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'direct', label: 'Diretas' },
                { id: 'groups', label: 'Grupos' },
                { id: 'archived', label: 'Arquivadas' },
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

          <div className="whatsapp-wa-chat-list" ref={chatListRef} onScroll={onChatListScroll}>
            {loadingThreads && threads.length === 0 ? (
              <WhatsAppThreadListSkeleton />
            ) : threads.length === 0 ? (
              <div className="whatsapp-inbox-empty muted">
                <p>{inboxListEmptyMessage}</p>
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="whatsapp-inbox-empty muted">
                <p>Nenhuma conversa combina com &quot;{threadQuery.trim()}&quot;.</p>
              </div>
            ) : (
              <>
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
                          lazy
                          rootRef={chatListRef}
                        />
                        <span className="whatsapp-wa-chat-item__body">
                          <span className="whatsapp-wa-chat-item__name">{contact.title}</span>
                          {contact.phoneLine &&
                          contact.phoneLine !== contact.title &&
                          !/^whatsapp\s*···/i.test(contact.title) ? (
                            <span className="whatsapp-wa-chat-item__meta">{contact.phoneLine}</span>
                          ) : contact.nameLine && contact.nameLine !== contact.title ? (
                            <span className="whatsapp-wa-chat-item__meta">{contact.nameLine}</span>
                          ) : /^whatsapp\s*···/i.test(thread.contactDisplayName ?? '') && contact.subtitle ? (
                            <span className="whatsapp-wa-chat-item__meta" title="Sem nome no WhatsApp">
                              {contact.subtitle.replace(/\s*·\s*[^·]+$/, '').trim() || 'Número não sincronizado'}
                            </span>
                          ) : null}
                          <time className="whatsapp-wa-chat-item__time" dateTime={thread.lastMessageAt}>
                            {formatBrazilThreadTime(thread.lastMessageAt)}
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
                {loadingMoreThreads ? (
                  <p className="whatsapp-wa-chat-list__more muted">Carregando mais conversas…</p>
                ) : null}
              </>
            )}
          </div>

          {canOpenEvolutionAdmin ? (
            <footer className="whatsapp-wa-sidebar__foot">
              <Link
                className="whatsapp-wa-foot-btn whatsapp-wa-foot-btn--primary"
                to="/m/sistema/evolution"
                state={{ returnTo: WHATSAPP_ROUTE }}
                title="Adicionar, conectar ou remover instâncias WhatsApp"
              >
                <Smartphone size={16} aria-hidden="true" />
                Instâncias
              </Link>
            </footer>
          ) : null}

        </aside>

        <main className="whatsapp-wa-main" aria-live="polite">
          {!activeThread ? (
            <div className="whatsapp-wa-welcome">
              <div className="whatsapp-wa-welcome__icon" aria-hidden="true" />
              <h2>Conversas WhatsApp</h2>
              <p className="muted">
                Selecione um chat à esquerda para ver o histórico das suas conversas.
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
                  lazy={false}
                />
                <div className="whatsapp-wa-chat-head__info">
                  <WhatsAppContactIdentity
                    thread={activeThread}
                    variant="header"
                    showBadge={false}
                    showInstance={false}
                  />
                  {syncingMessages ? (
                    <p className="whatsapp-wa-chat-head__meta muted" role="status">
                      Sincronizando mensagens…
                    </p>
                  ) : null}
                </div>
                <div className="whatsapp-wa-chat-head__actions">
                  <button
                    type="button"
                    className="whatsapp-wa-head-link whatsapp-wa-head-link--btn"
                    title={activeThread.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
                    onClick={() => void handleToggleArchive()}
                  >
                    {activeThread.isArchived ? (
                      <>
                        <ArchiveRestore size={16} aria-hidden="true" />
                        <span>Desarquivar</span>
                      </>
                    ) : (
                      <>
                        <Archive size={16} aria-hidden="true" />
                        <span>Arquivar</span>
                      </>
                    )}
                  </button>
                  {activeThread.leadId ? (
                    <Link className="whatsapp-wa-head-link" to="/m/comercial/leads">
                      Lead
                    </Link>
                  ) : null}
                </div>
              </header>

              <div className="whatsapp-wa-messages" ref={messagesScrollRef}>
                {loadingMessages && messages.length === 0 ? (
                  <WhatsAppMessagesSkeleton />
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

                    const quoteBlock = msg.quote ? (
                      <WhatsAppMessageQuote quote={msg.quote} isOutgoing={isOut} />
                    ) : null;

                    const bodyBlock =
                      msg.body?.trim() &&
                      !isReactionPlaceholderBody(msg.body) &&
                      !(shouldRenderWhatsAppMedia(msg) && isMediaPlaceholderBody(msg.body)) ? (
                        <WhatsAppMessageBody body={msg.body} />
                      ) : null;

                    const timeEl = (
                      <>
                        <time className="whatsapp-wa-bubble__time" dateTime={msg.messageAt}>
                          {formatBrazilThreadTime(msg.messageAt)}
                        </time>
                        {isOut ? <WhatsAppMessageAck status={msg.deliveryStatus} /> : null}
                      </>
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
                            {quoteBlock}
                            {mediaBlock}
                            {bodyBlock}
                            <footer className="whatsapp-wa-bubble__foot">{timeEl}</footer>
                            {renderMessageReactions(msg)}
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article key={msg.id} className={bubbleClass}>
                        {quoteBlock}
                        {mediaBlock}
                        {bodyBlock}
                        <footer className="whatsapp-wa-bubble__foot">{timeEl}</footer>
                        {renderMessageReactions(msg)}
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
