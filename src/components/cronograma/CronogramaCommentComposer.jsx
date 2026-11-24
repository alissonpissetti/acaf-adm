import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Avatar } from '../Avatar.jsx';
import { filterCronogramaAssigneeUsers } from '../../lib/cronogramaOwners.js';
import { findActiveMention, formatMentionToken } from '../../lib/cronogramaCommentMentions.js';

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
    });
  };

  const onKeyDown = (e) => {
    if (!mentionOpen || !candidates.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => (i + 1) % candidates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => (i - 1 + candidates.length) % candidates.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyMention(candidates[mentionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const onSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !canManage || !taskId) return;
    const ok = await onSubmit(text);
    if (ok) {
      setDraft('');
      setMentionOpen(false);
    }
  };

  return (
    <form className="cronograma-task-comment-form" onSubmit={onSend}>
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
          onClick={(e) => syncMentionState(draft, e.target.selectionStart ?? draft.length)}
          disabled={!canManage || !taskId || submitting}
        />
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
          type="submit"
          className="btn btn-primary btn-sm cronograma-task-comment-send"
          disabled={!canManage || !taskId || submitting || !draft.trim()}
        >
          <Send size={16} aria-hidden="true" />
          {submitting ? 'Enviando…' : 'Enviar'}
        </button>
      </footer>
    </form>
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