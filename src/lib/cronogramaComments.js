/** Comentário já persistido (não otimista). */
function persistedComments(comments) {
  return (comments ?? []).filter(
    (c) => c?.id && !c._optimistic && !String(c.id).startsWith('optimistic-comment-'),
  );
}

function byCreatedAt(a, b) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * ID do único comentário que o usuário logado pode remover:
 * o último dele na tarefa, desde que seja também o último do fio (sem resposta depois).
 */
export function getRemovableCommentId(comments, currentUserId) {
  if (!currentUserId) return null;
  const all = [...persistedComments(comments)].sort(byCreatedAt);
  if (!all.length) return null;

  const mine = all.filter((c) => c.userId === currentUserId);
  const myLatest = mine[mine.length - 1];
  if (!myLatest) return null;

  const lastOverall = all[all.length - 1];
  if (lastOverall.id !== myLatest.id) return null;
  return myLatest.id;
}