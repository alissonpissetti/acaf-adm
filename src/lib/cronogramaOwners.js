function normalizeOwnerKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Quebra o campo texto em um ou mais responsáveis. */
export function parseOwnerField(owner) {
  const raw = String(owner ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/[,/]|(?:\s+e\s+)|(?:\s+&\s+)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Usuários elegíveis como responsáveis (console admin, não colaboradores/app). */
export function filterCronogramaAssigneeUsers(users) {
  return (users ?? []).filter((user) => {
    if (user.active === false) return false;
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.includes('admin')) return true;
    if (user.userGroupId) return true;
    const onlyAppRoles = roles.length > 0 && roles.every((r) => r === 'member' || r === 'corporate' || r === 'partner');
    return !onlyAppRoles;
  });
}

export function buildOwnerUserDirectory(users) {
  const byId = new Map();
  const byName = new Map();
  for (const user of users ?? []) {
    const name = String(user?.name ?? '').trim();
    if (!user?.id) continue;
    byId.set(user.id, user);
    if (!name) continue;
    const fullKey = normalizeOwnerKey(name);
    if (!byName.has(fullKey)) byName.set(fullKey, user);
    const first = name.split(/\s+/)[0];
    if (first) {
      const firstKey = normalizeOwnerKey(first);
      if (!byName.has(firstKey)) byName.set(firstKey, user);
    }
  }
  return { byId, byName };
}

export function resolveOwnerEntries(tokens, directory) {
  const byName = directory?.byName ?? new Map();
  return tokens.map((label) => {
    const user = byName.get(normalizeOwnerKey(label)) ?? null;
    return { label, user };
  });
}

export function ownersFromTask(task, directory) {
  const dir = directory ?? { byId: new Map(), byName: new Map() };
  const entries = [];
  const usedKeys = new Set();

  for (const id of task?.ownerUserIds ?? []) {
    const user = dir.byId.get(id);
    if (!user) continue;
    const key = normalizeOwnerKey(user.name);
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    entries.push({ label: user.name, user });
  }

  for (const token of parseOwnerField(task?.owner)) {
    const key = normalizeOwnerKey(token);
    if (usedKeys.has(key)) continue;
    const user = dir.byName.get(key) ?? null;
    if (user && (task?.ownerUserIds ?? []).includes(user.id)) continue;
    usedKeys.add(key);
    entries.push({ label: token, user });
  }

  return entries;
}

export function formatOwnerDisplay(ownerUserIds, ownerExtra, usersById) {
  const names = (ownerUserIds ?? [])
    .map((id) => usersById.get(id)?.name)
    .filter(Boolean);
  const extra = String(ownerExtra ?? '').trim();
  const parts = [...names];
  if (extra) parts.push(extra);
  const line = parts.join(', ').slice(0, 200);
  return line || null;
}

/** Preenche seleção a partir da tarefa (ids na API ou legado só texto). */
export function ownerFormStateFromTask(task, directory) {
  const dir = directory ?? { byId: new Map(), byName: new Map() };
  const ids = Array.isArray(task?.ownerUserIds) ? [...task.ownerUserIds] : [];
  const extraTokens = [];

  if (!ids.length) {
    for (const token of parseOwnerField(task?.owner)) {
      const user = dir.byName.get(normalizeOwnerKey(token));
      if (user && !ids.includes(user.id)) ids.push(user.id);
      else extraTokens.push(token);
    }
  } else {
    const selectedNames = new Set(
      ids.map((id) => dir.byId.get(id)?.name).filter(Boolean).map(normalizeOwnerKey),
    );
    for (const token of parseOwnerField(task?.owner)) {
      if (!selectedNames.has(normalizeOwnerKey(token))) extraTokens.push(token);
    }
  }

  return {
    ownerUserIds: ids,
    ownerExtra: extraTokens.join(', '),
  };
}