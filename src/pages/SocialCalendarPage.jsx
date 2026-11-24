import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  getSocialCalendar,
  patchSocialPost,
  patchSocialPostAprovacao,
  patchSocialPostFluxo,
  patchSocialPostManualCanal,
  removeSocialPostArte,
  socialBufferDraft,
  socialBufferPublishNow,
  socialBufferRemove,
  socialBufferSchedule,
  socialBufferSync,
  socialBufferSyncAll,
  uploadSocialPostArte,
} from '../api/socialPosts.js';
import { getUsers } from '../api/users.js';
import { SocialPostCard } from '../components/social-calendar/SocialPostCard.jsx';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { FILTER_CHIPS } from '../lib/socialPostRules.js';
import { groupPostsByWeek } from '../lib/socialPostWeeks.js';
import '../styles/marketing.css';
import '../styles/social-calendar.css';

export function SocialCalendarPage() {
  const { hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusPostId = searchParams.get('post');
  const canManage = hasPermission('marketing.redes-sociais.manage');
  const canApprove = hasPermission('marketing.redes-sociais.aprovar');
  const canPublish = hasPermission('marketing.redes-sociais.publicar');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [hidePublished, setHidePublished] = useState(false);
  const [summary, setSummary] = useState(null);
  const [posts, setPosts] = useState([]);
  const [busySync, setBusySync] = useState(false);
  const [assigneeUsers, setAssigneeUsers] = useState([]);
  const narrowLayout = useNarrowCalendarLayout();

  useEffect(() => {
    void getUsers()
      .then((rows) => setAssigneeUsers(rows ?? []))
      .catch(() => setAssigneeUsers([]));
  }, []);

  const load = useCallback(async () => {
    const firstPaint = !hasLoadedRef.current;
    if (firstPaint) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await getSocialCalendar({ filter, hidePublished });
      setSummary(data.summary);
      setPosts(data.posts ?? []);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar calendário.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, hidePublished]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusPostId || loading || !posts.length) return;
    requestAnimationFrame(() => {
      document.getElementById(`social-post-${focusPostId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [focusPostId, loading, posts]);

  const clearFocusPostParam = useCallback(() => {
    if (!searchParams.get('post')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('post');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const replacePost = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePatch = async (id, body) => {
    const updated = await patchSocialPost(id, body);
    replacePost(updated);
  };

  const handleAprovacao = async (id, aprovacao) => {
    const updated = await patchSocialPostAprovacao(id, aprovacao);
    replacePost(updated);
    await load();
  };

  const handleFluxoPatch = async (id, body) => {
    const updated = await patchSocialPostFluxo(id, body);
    replacePost(updated);
  };

  const handleManualCanal = async (id, rede, body) => {
    const result = await patchSocialPostManualCanal(id, rede, body);
    if (result?.post) replacePost(result.post);
    if (result?.errors?.length) setError(result.errors.join(' · '));
  };

  const handleBuffer = async (id, action, opts = {}) => {
    const map = {
      draft: socialBufferDraft,
      schedule: socialBufferSchedule,
      publishNow: socialBufferPublishNow,
      sync: socialBufferSync,
      remove: socialBufferRemove,
    };
    const result = await map[action](id, opts?.rede || opts?.redes?.length ? opts : undefined);
    if (result?.post) replacePost(result.post);
    if (result?.errors?.length) setError(result.errors.join(' · '));
    await load();
  };

  const weeks = groupPostsByWeek(posts);
  const progress = useMemo(() => {
    if (!summary?.totalFeed) return 0;
    return Math.round((summary.publishedFeed / summary.totalFeed) * 100);
  }, [summary]);

  const syncButton = canPublish ? (
    <button
      type="button"
      className="btn btn-primary"
      disabled={busySync}
      onClick={async () => {
        setBusySync(true);
        try {
          await socialBufferSyncAll();
          await load();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Falha ao sincronizar.');
        } finally {
          setBusySync(false);
        }
      }}
    >
      <RefreshCw size={16} className={busySync ? 'sc-spin' : undefined} aria-hidden="true" />
      Sincronizar Buffer
    </button>
  ) : null;

  return (
    <PermissionGate permission="marketing.redes-sociais" fallback={<AppLoadingPanel />}>
      <div className="page-stack social-calendar-page">
        <PageHeader
          title="Calendário Social"
          subtitle="Planejamento, aprovação e publicação das postagens Movly nas redes sociais."
          breadcrumbs={[{ label: 'Marketing' }, { label: 'Calendário Social' }]}
          actions={
            <div className="sc-page-actions">
              {refreshing ? <span className="muted sc-refresh-hint">Atualizando…</span> : null}
              {syncButton}
            </div>
          }
        />

        <CrudAlerts error={error} onDismissError={() => setError(null)} />

        <section className="panel sc-dashboard-panel">
          <div className="panel-header sc-dashboard-header">
            <div>
              <h2>Visão geral</h2>
              <p className="panel-subtitle">
                {summary?.totalFeed ?? 0} posts no feed · {progress}% já publicado
              </p>
            </div>
            <div className="sc-progress-wrap" aria-hidden>
              <span className="sc-progress-label">{progress}%</span>
              <div className="sc-progress">
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="panel-body sc-dashboard-body">
            <div className="marketing-stats-grid sc-stats-row">
              <SummaryKpi
                label={narrowLayout ? 'Feed publ.' : 'Feed publicados'}
                value={`${summary?.publishedFeed ?? 0}/${summary?.totalFeed ?? 0}`}
              />
              <SummaryKpi label="Programados" value={summary?.scheduled ?? 0} />
              <SummaryKpi label="Aprovados" value={summary?.approved ?? 0} />
              <SummaryKpi label="Aguardando" value={summary?.pending ?? 0} />
              <SummaryKpi label="Ajustar" value={summary?.adjust ?? 0} />
            </div>
            <div className="sc-filter-bar">
              {narrowLayout ? (
                <label className="sc-filter-select-field">
                  <span className="sc-filter-hint">Filtrar posts</span>
                  <select
                    className="sc-filter-select"
                    value={filter}
                    onChange={(ev) => setFilter(ev.target.value)}
                    aria-label="Filtrar posts"
                  >
                    {FILTER_CHIPS.map((chip) => (
                      <option key={chip.id} value={chip.id}>
                        {chip.labelCompact ?? chip.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="list-toolbar-filters sc-filter-chips" role="group" aria-label="Filtrar posts">
                  {FILTER_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`filter-chip${filter === chip.id ? ' active' : ''}`}
                      onClick={() => setFilter(chip.id)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              <label className="sc-hide-published">
                <input
                  type="checkbox"
                  checked={hidePublished}
                  onChange={(ev) => setHidePublished(ev.target.checked)}
                />
                Ocultar publicados
              </label>
            </div>
          </div>
        </section>

        {loading ? (
          <AppLoadingPanel label="Carregando calendário…" />
        ) : weeks.length === 0 ? (
          <section className="panel panel-muted">
            <div className="panel-body sc-empty-week">
              <p className="muted">Nenhum post neste filtro. Tente outro chip ou inclua publicados.</p>
            </div>
          </section>
        ) : (
          <div className="sc-timeline">
            {weeks.map((week) => (
              <section key={week.key} className="sc-week">
                <header className="sc-week-head">
                  <h2 className="sc-week-title">{week.label}</h2>
                  <span className="sc-week-count">
                    {week.posts.length} {week.posts.length === 1 ? 'post' : 'posts'}
                  </span>
                </header>
                <ul className="sc-week-list">
                  {week.posts.map((post) => (
                    <li key={post.id} id={`social-post-${post.id}`} className="sc-week-item">
                      <SocialPostCard
                        post={post}
                        focusPostId={focusPostId}
                        onClearFocusParam={clearFocusPostParam}
                        assigneeUsers={assigneeUsers}
                        canManage={canManage}
                        canApprove={canApprove}
                        canPublish={canPublish}
                        onPatch={(body) => handlePatch(post.id, body)}
                        onAprovacao={(aprovacao) => handleAprovacao(post.id, aprovacao)}
                        onArteUpload={async (file) => {
                          const updated = await uploadSocialPostArte(post.id, file);
                          replacePost(updated);
                        }}
                        onArteRemove={async (arteId) => {
                          const updated = await removeSocialPostArte(post.id, arteId);
                          replacePost(updated);
                        }}
                        onFluxoPatch={(body) => handleFluxoPatch(post.id, body)}
                        onManualCanal={(rede, body) => handleManualCanal(post.id, rede, body)}
                        onBufferAction={(action, opts) => handleBuffer(post.id, action, opts)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}

function SummaryKpi({ label, value }) {
  return (
    <div className="marketing-stat-card sc-stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const NARROW_CALENDAR_MQ = '(max-width: 900px)';

function useNarrowCalendarLayout() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(NARROW_CALENDAR_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(NARROW_CALENDAR_MQ);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return narrow;
}