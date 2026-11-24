import { useMemo, useState } from 'react';
import { Avatar } from '../Avatar.jsx';
import { buildTaskActivityMessage } from '../../lib/cronogramaTaskLabels.js';
import { parseCommentBodySegments } from '../../lib/cronogramaCommentMentions.js';
import { CronogramaCommentComposer } from './CronogramaCommentComposer.jsx';

function formatCompactDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAbsolute(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CronogramaTaskActivityPanel({
  taskId,
  canManage,
  events,
  loadingEvents,
  comments,
  loadingComments,
  onSubmitComment,
  submittingComment,
  adminUsers = [],
}) {
  const [hideActivity, setHideActivity] = useState(false);

  const userById = useMemo(
    () => new Map((adminUsers ?? []).filter((u) => u?.id).map((u) => [u.id, u])),
    [adminUsers],
  );

  const timeline = useMemo(() => {
    const activity = (events ?? []).map((ev) => ({
      kind: 'event',
      id: ev.id,
      at: ev.createdAt,
      userName: ev.userName,
      field: ev.field,
      oldValue: ev.oldValue,
      newValue: ev.newValue,
    }));
    const msgs = (comments ?? []).map((c) => ({
      kind: 'comment',
      id: c.id,
      at: c.createdAt,
      userId: c.userId,
      userName: c.userName,
      body: c.body,
    }));
    return [...activity, ...msgs].sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [events, comments]);

  const visibleTimeline = useMemo(
    () => timeline.filter((entry) => !(hideActivity && entry.kind === 'event')),
    [timeline, hideActivity],
  );

  const loading = loadingEvents || loadingComments;

  return (
    <aside className="cronograma-task-sidebar" aria-label="Atividade e comentários">
      <TimelineFeed loading={loading} empty={!visibleTimeline.length} items={visibleTimeline} userById={userById} />

      <CronogramaCommentComposer
        taskId={taskId}
        canManage={canManage}
        adminUsers={adminUsers}
        submitting={submittingComment}
        onSubmit={onSubmitComment}
        hideActivity={hideActivity}
        onHideActivityChange={setHideActivity}
      />
    </aside>
  );
}

function TimelineFeed({ loading, empty, items, userById }) {
  if (loading) {
    return <p className="field-hint cronograma-task-sidebar-hint">Carregando atividade…</p>;
  }
  if (empty) {
    return <p className="field-hint cronograma-task-sidebar-hint">Nenhuma atividade ainda.</p>;
  }
  return (
    <ol className="cronograma-task-feed">
      {items.map((entry) =>
        entry.kind === 'comment' ? (
          <CommentCard key={`c-${entry.id}`} entry={entry} userById={userById} />
        ) : (
          <ActivityLog key={`e-${entry.id}`} entry={entry} userById={userById} />
        ),
      )}
    </ol>
  );
}

function ActivityLog({ entry, userById }) {
  const text = buildTaskActivityMessage(entry, userById);
  return (
    <li className="cronograma-task-activity-log">
      <span className="cronograma-task-activity-log-dot" aria-hidden="true" />
      <p className="cronograma-task-activity-log-text">{text}</p>
      <time dateTime={entry.at} title={formatAbsolute(entry.at)} className="cronograma-task-activity-log-time">
        {formatCompactDateTime(entry.at)}
      </time>
    </li>
  );
}

function CommentCard({ entry, userById }) {
  const user = entry.userId ? userById.get(entry.userId) : null;
  const displayName = entry.userName ?? user?.name ?? 'Usuário';
  const segments = useMemo(() => parseCommentBodySegments(entry.body), [entry.body]);

  return (
    <li className="cronograma-task-comment-card">
      <Avatar
        name={displayName}
        src={user?.avatarUrl}
        color={user?.avatarColor}
        size="sm"
        title={displayName}
      />
      <div className="cronograma-task-comment-card-body">
        <header className="cronograma-task-comment-card-head">
          <strong>{displayName}</strong>
          <span className="cronograma-task-comment-card-sep" aria-hidden="true">
            ·
          </span>
          <time dateTime={entry.at} title={formatAbsolute(entry.at)}>
            {formatCompactDateTime(entry.at)}
          </time>
        </header>
        <p className="cronograma-task-comment-card-text">
          {segments.map((seg, index) =>
            seg.type === 'mention' ? (
              <span key={`${entry.id}-m-${index}`} className="cronograma-comment-mention" title={seg.label}>
                @{seg.label.split(/\s+/)[0]}
              </span>
            ) : (
              <span key={`${entry.id}-t-${index}`}>{seg.value}</span>
            ),
          )}
        </p>
      </div>
    </li>
  );
}