import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Maximize2, Minimize2 } from 'lucide-react';
import { appConfirm } from '../components/confirm/appConfirm.js';
import {
  addProjectTaskComment,
  createProjectTask,
  deleteProjectTask,
  fetchProjectTaskComments,
  fetchProjectTaskEvents,
  listProjectTasks,
  patchProjectTask,
} from '../api/projectTasks.js';
import { getUsers } from '../api/users.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { CronogramaGantt } from '../components/cronograma/CronogramaGantt.jsx';
import { CronogramaMobileList } from '../components/cronograma/CronogramaMobileList.jsx';
import { CronogramaTaskEditor } from '../components/cronograma/CronogramaTaskEditor.jsx';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import {
  PROJECT_PHASES,
  buildSummary,
  daysUntil,
  isLate,
  pilotDate,
  todayYmd,
  weightedProgressPercent,
} from '../lib/cronogramaMetrics.js';
import { buildOwnerUserDirectory } from '../lib/cronogramaOwners.js';
import { useCronogramaMobileLayout } from '../lib/useCronogramaMobileLayout.js';
import '../styles/cronograma.css';

const LW_KEY = 'movly-gantt-lw';
const COLLAPSE_KEY = 'movly-gantt-col';
const FULLSCREEN_KEY = 'movly-cronograma-fullscreen';

function readFullscreenPreference() {
  try {
    return localStorage.getItem(FULLSCREEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFullscreenPreference(on) {
  try {
    localStorage.setItem(FULLSCREEN_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const FILTER_CHIPS = [
  { id: 'all', label: 'Todas', dot: null },
  { id: 'in_progress', label: 'Em andamento', dot: 'var(--movly-periwinkle)' },
  { id: 'todo', label: 'A fazer', dot: 'var(--cronograma-todo)' },
  { id: 'late', label: 'Atrasadas', dot: 'var(--danger)' },
  { id: 'blocked', label: 'Bloqueadas', dot: 'var(--movly-orange, #d9771f)' },
  { id: 'postponed', label: 'Adiadas', dot: 'var(--cronograma-postponed, #64748b)' },
  { id: 'cancelled', label: 'Canceladas', dot: 'var(--cronograma-cancelled, #9ca3af)' },
  { id: 'done', label: 'Concluídas', dot: 'var(--movly-purple)' },
];

function loadCollapsed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function loadColumnWidth() {
  try {
    const v = Number(localStorage.getItem(LW_KEY));
    if (v >= 200 && v <= 620) return v;
  } catch {
    /* ignore */
  }
  return typeof window !== 'undefined' && window.innerWidth <= 600 ? 200 : 360;
}

export function CronogramaPage() {
  const { hasPermission, user: authUser } = useAuth();
  const canManage = hasPermission('operacao.cronograma.manage');
  const [searchParams, setSearchParams] = useSearchParams();
  const openedTaskFromUrl = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [columnWidth, setColumnWidthState] = useState(loadColumnWidth);
  const [collapsedPhases, setCollapsedPhases] = useState(loadCollapsed);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [fullscreen, setFullscreen] = useState(readFullscreenPreference);
  const [ownerUsers, setOwnerUsers] = useState([]);
  const mobileLayout = useCronogramaMobileLayout();

  useEffect(() => {
    if (mobileLayout && fullscreen) {
      setFullscreen(false);
      writeFullscreenPreference(false);
    }
  }, [mobileLayout, fullscreen]);

  const setColumnWidth = useCallback((w, persist) => {
    const next = Math.max(200, Math.min(620, Math.round(w)));
    setColumnWidthState(next);
    if (persist) {
      try {
        localStorage.setItem(LW_KEY, String(next));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listProjectTasks();
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o cronograma.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getUsers();
        if (!cancelled) setOwnerUsers(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setOwnerUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ownerUserDirectory = useMemo(() => buildOwnerUserDirectory(ownerUsers), [ownerUsers]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((current) => {
      const next = !current;
      writeFullscreenPreference(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (ev) => {
      if (ev.key !== 'Escape') return;
      setFullscreen(false);
      writeFullscreenPreference(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    document.body.classList.add('cronograma-fullscreen-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('cronograma-fullscreen-open');
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const today = todayYmd();
  const counts = useMemo(() => {
    const c = {
      all: tasks.length,
      in_progress: 0,
      todo: 0,
      blocked: 0,
      postponed: 0,
      cancelled: 0,
      done: 0,
      late: 0,
    };
    tasks.forEach((t) => {
      c[t.status] = (c[t.status] || 0) + 1;
      if (isLate(t, today)) c.late += 1;
    });
    return c;
  }, [tasks, today]);

  const phases = useMemo(() => {
    const extra = [...new Set(tasks.map((t) => t.phase))].filter((f) => !PROJECT_PHASES.includes(f));
    return [...PROJECT_PHASES, ...extra];
  }, [tasks]);

  const reloadTaskSidePanel = useCallback(async (taskId) => {
    if (!taskId) {
      setEvents([]);
      setComments([]);
      return;
    }
    setLoadingEvents(true);
    setLoadingComments(true);
    try {
      const [evRows, commentRows] = await Promise.all([
        fetchProjectTaskEvents(taskId),
        fetchProjectTaskComments(taskId),
      ]);
      setEvents(Array.isArray(evRows) ? evRows : []);
      setComments(Array.isArray(commentRows) ? commentRows : []);
    } catch {
      setEvents([]);
      setComments([]);
    } finally {
      setLoadingEvents(false);
      setLoadingComments(false);
    }
  }, []);

  const openEditor = async (task) => {
    setEditingTask(task);
    setEditorOpen(true);
    setEvents([]);
    setComments([]);
    if (task?.id) {
      await reloadTaskSidePanel(task.id);
    }
  };

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId || loading || openedTaskFromUrl.current) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    openedTaskFromUrl.current = true;
    void openEditor(task);
  }, [loading, tasks, searchParams]);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingTask(null);
    setEvents([]);
    setComments([]);
    if (searchParams.get('task')) {
      const next = new URLSearchParams(searchParams);
      next.delete('task');
      setSearchParams(next, { replace: true });
    }
  };

  const onTogglePhase = (phase) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const onJumpPhase = (phase) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.delete(phase);
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
    setFilter('all');
    const idx = phases.indexOf(phase);
    if (idx < 0) return;
    const el =
      document.getElementById(`cronograma-ph-${idx}`) ?? document.getElementById(`cronograma-mob-ph-${idx}`);
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const optimisticPatch = async (id, body, rollbackTasks) => {
    const snapshot = tasks;
    setTasks((rows) =>
      rows.map((t) => (t.id === id ? { ...t, ...body, updatedAt: new Date().toISOString() } : t)),
    );
    try {
      const saved = await patchProjectTask(id, body);
      setTasks((rows) => rows.map((t) => (t.id === id ? saved : t)));
      setEditingTask(saved);
      setToast('Salvo');
      await reloadTaskSidePanel(id);
    } catch (e) {
      setTasks(snapshot.length ? snapshot : rollbackTasks);
      setToast(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  };

  const onSubmitComment = async (text) => {
    if (!editingTask?.id || !canManage) return false;
    setSubmittingComment(true);
    try {
      const created = await addProjectTaskComment(editingTask.id, text);
      setComments((rows) => [...rows, created]);
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Não foi possível enviar o comentário.');
      return false;
    } finally {
      setSubmittingComment(false);
    }
  };

  const onSave = async (body) => {
    if (!canManage) return;
    if (editingTask) {
      await optimisticPatch(editingTask.id, body, tasks);
      return;
    }
    const snapshot = tasks;
    const tempId = `temp-${Date.now()}`;
    setTasks((rows) => [...rows, { ...body, id: tempId, code: null, sortOrder: 0, updatedAt: new Date().toISOString() }]);
    try {
      const created = await createProjectTask(body);
      setTasks((rows) => rows.map((t) => (t.id === tempId ? created : t)));
      setEditingTask(created);
      setToast('Tarefa criada');
      await reloadTaskSidePanel(created.id);
    } catch (e) {
      setTasks(snapshot);
      setToast(e instanceof Error ? e.message : 'Não foi possível criar.');
    }
  };

  const deleteTask = async (task) => {
    if (!canManage || !task?.id || String(task.id).startsWith('temp-')) return;
    const ok = await appConfirm({
      title: 'Excluir tarefa',
      message: `Remover “${task.name}” do cronograma? Não dá para desfazer.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;

    const snapshot = tasks;
    setTasks((rows) => rows.filter((t) => t.id !== task.id));
    if (editingTask?.id === task.id) closeEditor();
    try {
      await deleteProjectTask(task.id);
      setToast('Tarefa excluída');
    } catch (e) {
      setTasks(snapshot);
      setToast(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  const onDeleteFromEditor = () => {
    if (editingTask) void deleteTask(editingTask);
  };

  const work = tasks.filter((t) => !t.isMilestone);
  const doneCount = work.filter((t) => t.status === 'done').length;
  const pilot = pilotDate(tasks);
  const daysPilot = daysUntil(pilot, today);

  const fullscreenToggleBtn = mobileLayout ? null : (
    <button
      type="button"
      className={`btn btn-ghost cronograma-fullscreen-btn${fullscreen ? ' cronograma-fullscreen-btn--on' : ''}`}
      onClick={toggleFullscreen}
      aria-pressed={fullscreen}
      title={fullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia — oculta o menu lateral'}
    >
      {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
      <span className="cronograma-toolbar-btn-text">
        {fullscreen ? 'Sair' : 'Tela cheia'}
      </span>
    </button>
  );

  const content = loading ? (
    <AppLoadingPanel label="Carregando cronograma…" />
  ) : (
  <div className="cronograma-main">
      {fullscreen ? (
        <header className="cronograma-fs-bar" aria-label="Cronograma em tela cheia">
          <div className="cronograma-fs-bar__title">
            <strong>Cronograma</strong>
            <span className="muted">
              {weightedProgressPercent(tasks)}% · {doneCount}/{work.length} tarefas · piloto em{' '}
              {Math.max(0, daysPilot)} dias
            </span>
          </div>
          {fullscreenToggleBtn}
        </header>
      ) : null}
      {!fullscreen ? (
      <section className="cronograma-hero band">
        <div className="cronograma-hero-grid">
          <div>
            <h1 className="cronograma-title">Movly rumo ao piloto</h1>
            <p className="cronograma-lead">
              Do primeiro encontro dos sócios ao piloto com acesso controlado em janeiro de 2027: empresa, jurídico,
              marca, produto, marketing e rede num só quadro.
            </p>
          </div>
          <div className="cronograma-kpis">
            <div className="cronograma-kpi">
              <strong>{weightedProgressPercent(tasks)}%</strong>
              <span>concluído no geral</span>
            </div>
            <div className="cronograma-kpi">
              <strong>{Math.max(0, daysPilot)}</strong>
              <span>
                dias até o piloto,{' '}
                {new Date(`${pilot}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
            <div className="cronograma-kpi">
              <strong>
                {doneCount}/{work.length}
              </strong>
              <span>tarefas concluídas</span>
            </div>
            <div className="cronograma-kpi">
              <strong>{tasks.filter((t) => !t.isMilestone && isLate(t, today)).length}</strong>
              <span>tarefas atrasadas</span>
            </div>
          </div>
        </div>
        <div className="cronograma-phase-kpis">
          {phases.map((phase) => {
            const list = tasks.filter((t) => t.phase === phase);
            if (!list.length) return null;
            const pct = weightedProgressPercent(list);
            return (
              <button key={phase} type="button" className="cronograma-phase-kpi" onClick={() => onJumpPhase(phase)}>
                {phase}
                <em>{pct}%</em>
                <div className="cronograma-phase-kpi-bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
      ) : null}

      <div className="cronograma-toolbar" role="toolbar" aria-label="Filtros do cronograma">
        <div className="cronograma-toolbar-filters">
          <div className="cronograma-chip-row" role="group" aria-label="Filtrar por status">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`cronograma-chip ${filter === chip.id ? 'cronograma-chip--on' : ''}`}
                aria-pressed={filter === chip.id}
                onClick={() => setFilter(chip.id)}
              >
                {chip.dot ? <i className="cronograma-chip-dot" style={{ background: chip.dot }} /> : null}
                <span className="cronograma-chip-label">{chip.label}</span>
                <span className="cronograma-chip-count">{counts[chip.id] ?? 0}</span>
              </button>
            ))}
          </div>
          <input
            type="search"
            className="cronograma-search"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar tarefa ou responsável"
          />
          <label className="cronograma-lw-control muted">
            <span className="cronograma-lw-control__text">Col. nomes</span>
            <input
              type="range"
              min={200}
              max={620}
              step={20}
              value={columnWidth}
              onChange={(e) => setColumnWidth(Number(e.target.value), true)}
              aria-label="Largura da coluna de nomes"
            />
          </label>
        </div>
        <div className="cronograma-toolbar-actions">
          {!fullscreen ? fullscreenToggleBtn : null}
          <button
            type="button"
            className="btn btn-ghost cronograma-toolbar-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(buildSummary(tasks));
                setToast('Resumo copiado');
              } catch {
                setToast('Não foi possível copiar');
              }
            }}
            title="Copiar resumo do cronograma"
          >
            <Copy size={16} aria-hidden="true" />
            <span className="cronograma-toolbar-btn-text">Copiar</span>
          </button>
          {canManage ? (
            <button type="button" className="btn btn-primary" onClick={() => openEditor(null)}>
              Nova tarefa
            </button>
          ) : null}
        </div>
      </div>

      {!fullscreen ? (
        <p className="muted cronograma-note">
          {canManage
            ? 'Atualizações ficam salvas no banco e aparecem para quem tiver acesso ao cronograma.'
            : 'Modo somente leitura — você não pode editar tarefas.'}
        </p>
      ) : null}

      {mobileLayout ? (
        <CronogramaMobileList
          tasks={tasks}
          filter={filter}
          query={query}
          collapsedPhases={collapsedPhases}
          onTogglePhase={onTogglePhase}
          onOpenTask={openEditor}
          ownerUserDirectory={ownerUserDirectory}
        />
      ) : (
        <div className="cronograma-gantt-shell">
          <CronogramaGantt
            tasks={tasks}
            filter={filter}
            query={query}
            collapsedPhases={collapsedPhases}
            onTogglePhase={onTogglePhase}
            onOpenTask={openEditor}
            onDeleteTask={deleteTask}
            canManage={canManage}
            columnWidth={columnWidth}
            onColumnWidthChange={setColumnWidth}
            ownerUserDirectory={ownerUserDirectory}
          />
        </div>
      )}

      <CronogramaTaskEditor
        open={editorOpen}
        task={editingTask}
        canManage={canManage}
        phases={phases}
        events={events}
        loadingEvents={loadingEvents}
        comments={comments}
        loadingComments={loadingComments}
        submittingComment={submittingComment}
        onSubmitComment={onSubmitComment}
        adminUsers={ownerUsers}
        currentUserId={authUser?.id}
        onClose={closeEditor}
        onSave={onSave}
        onDelete={onDeleteFromEditor}
        onAttachmentError={(message) => setToast(message)}
        onActivityRefresh={() =>
          editingTask?.id ? reloadTaskSidePanel(editingTask.id) : Promise.resolve()
        }
      />

      {toast ? (
        <div className="cronograma-toast on" role="status">
          {toast}
        </div>
      ) : null}
  </div>
  );

  return (
    <PermissionGate permission="operacao.cronograma" fallback={<AppLoadingPanel />}>
      <div
        className={`page-stack cronograma-page${fullscreen ? ' cronograma-page--fullscreen' : ''}${
          mobileLayout ? ' cronograma-page--mobile' : ''
        }`}
      >
        {!fullscreen ? (
          <PageHeader
            title="Cronograma"
            subtitle="Planejamento até o piloto"
            breadcrumbs={[
              { label: 'Operação', to: '/m/operacao/dashboard' },
              { label: 'Cronograma' },
            ]}
            actions={fullscreenToggleBtn}
          />
        ) : null}
        <CrudAlerts error={error} onDismissError={() => setError('')} />
        {error ? (
          <p className="page-error">
            {error}{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
              Tentar de novo
            </button>
          </p>
        ) : null}
        {!error ? content : null}
      </div>
    </PermissionGate>
  );
}