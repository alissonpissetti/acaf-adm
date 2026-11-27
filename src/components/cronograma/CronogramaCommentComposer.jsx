import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Avatar } from '../Avatar.jsx';
import { filterCronogramaAssigneeUsers } from '../../lib/cronogramaOwners.js';
import {
  commentBodyPreviewText,
  findActiveMention,
  formatMentionToken,
} from '../../lib/cronogramaCommentMentions.js';

export function CronogramaCommentComposer({
  taskId,
  canManage,
  adminUsers,
  submitting,
  onSubmit,
  hideActivity,
  onHideActivityChange,
}) {
  const [draft, setDraft] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);

  const previewText = useMemo(() => {
    const t = draft.trim();
    if (!t) return '';
    return commentBodyPreviewText(t);
  }, [draft]);

  const candidates = useMemo(() => {
    if (!mentionOpen) return [];
    const pool = filterCronogramaAssigneeUsers(adminUsers);
    const q = mentionQuery.trim().toLowerCase();
    return pool
      .filter((user) => {
        if (!q) return true;
        const hay = `${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [adminUsers, mentionOpen, mentionQuery]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery, candidates.length]);

  const syncMentionState = useCallback((value, cursor) => {
    const active = findActiveMention(value, cursor);
    if (active) {
      setMentionStart(active.start);
      setMentionQuery(active.query);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
      setMentionStart(-1);
      setMentionQuery('');
    }
  }, []);

  const onChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setDraft(value);
    syncMentionState(value, cursor);
  };

  const applyMention = (user) => {
    const token = formatMentionToken(user);
    const cursor = textareaRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, mentionStart);
    const after = draft.slice(cursor);
    const spacer = after.startsWith(' ') ? '' : ' ';
    const next = `${before}${token}${spacer}${after}`;
    setDraft(next);
    setMentionOpen(false);
    setMentionStart(-1);
    setMentionQuery('');
    const nextCursor = before.length + token.length + spacer.length;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
      syncMentionState(next, nextCursor);
    });
  };

  const onKeyDown = (e) => {
    e.stopPropagation();

    if (mentionOpen && candidates.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(candidates[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void sendComment();
    }
  };

  const sendComment = async () => {
    const text = draft.trim();
    if (!text || !canManage || !taskId || submitting) return;
    const ok = await onSubmit(text);
    if (ok) {
      setDraft('');
      setMentionOpen(false);
    }
  };

  return (
    <div
      className="cronograma-task-comment-form"
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <motionHead hideActivity={hideActivity} onHideActivityChange={onHideActivityChange} />
      <label className="sr-only" htmlFor="cronograma-task-comment">
        Comentário
      </label>
      <div className="cronograma-comment-composer">
        <textarea
          ref={textareaRef}
          id="cronograma-task-comment"
          rows={3}
          className="input"
          placeholder="Digite um comentário… (use @ para mencionar)"
          value={draft}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onClick={(e) => {
            e.stopPropagation();
            syncMentionState(draft, e.target.selectionStart ?? draft.length);
          }}
          disabled={!canManage || !taskId || submitting}
        />
        {previewText && previewText !== draft.trim() ? (
          <p className="cronograma-comment-draft-preview muted" aria-live="polite">
            Será publicado como: {previewText}
          </p>
        ) : null}
        {mentionOpen && canManage ? (
          <div className="cronograma-mention-menu" role="listbox" aria-label="Mencionar usuário">
            {!candidates.length ? (
              <p className="cronograma-mention-empty">Nenhum usuário para “{mentionQuery || '@'}”</p>
            ) : (
              candidates.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={index === mentionIndex}
                  className={`cronograma-mention-item${index === mentionIndex ? ' is-active' : ''}`}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    applyMention(user);
                  }}
                >
                  <Avatar
                    name={user.name}
                    src={user.avatarUrl}
                    color={user.avatarColor}
                    size="xs"
                  />
                  <span>
                    <strong>{user.name}</strong>
                    {user.email ? <small className="muted">{user.email}</small> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <footer className="cronograma-task-comment-foot cronograma-task-comment-foot--end">
        <button
          type="button"
          className="btn btn-primary btn-sm cronograma-task-comment-send"
          disabled={!canManage || !taskId || submitting || !draft.trim()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void sendComment();
          }}
        >
          <Send size={16} aria-hidden="true" />
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
      </footer>
    </div>
  );
}

function motionHead({ hideActivity, onHideActivityChange }) {
  return (
    <div className="cronograma-task-compose-head">
      <span className="cronograma-task-compose-title">Comentário</span>
      <label className="cronograma-task-hide-activity">
        <input
          type="checkbox"
          checked={hideActivity}
          onChange={(e) => onHideActivityChange(e.target.checked)}
        />
        Ocultar atividades
      </label>
    </div>
  );
}