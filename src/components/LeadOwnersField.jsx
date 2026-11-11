import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Avatar } from './Avatar.jsx';

function resolveOwnerProfiles(ownerUserIds, adminUsers, owners) {
  if (Array.isArray(ownerUserIds)) {
    return ownerUserIds
      .map((userId) => {
        const fromAdmin = adminUsers.find((user) => user.id === userId);
        if (fromAdmin) {
          return {
            userId: fromAdmin.id,
            name: fromAdmin.name,
            avatarUrl: fromAdmin.avatarUrl ?? null,
            avatarColor: fromAdmin.avatarColor ?? null,
          };
        }
        const fromLead = owners?.find((owner) => owner.userId === userId);
        if (fromLead) return fromLead;
        return null;
      })
      .filter(Boolean);
  }

  const fromForm = (ownerUserIds ?? [])
    .map((userId) => {
      const fromAdmin = adminUsers.find((user) => user.id === userId);
      if (fromAdmin) {
        return {
          userId: fromAdmin.id,
          name: fromAdmin.name,
          avatarUrl: fromAdmin.avatarUrl ?? null,
          avatarColor: fromAdmin.avatarColor ?? null,
        };
      }
      const fromLead = owners?.find((owner) => owner.userId === userId);
      if (fromLead) return fromLead;
      return null;
    })
    .filter(Boolean);

  if (fromForm.length) return fromForm;
  return owners ?? [];
}

export function LeadOwnersField({
  adminUsers,
  ownerUserIds = [],
  owners,
  disabled = false,
  onChange,
  label = 'Responsáveis',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedProfiles = useMemo(
    () => resolveOwnerProfiles(ownerUserIds, adminUsers, owners),
    [ownerUserIds, adminUsers, owners],
  );

  const availableUsers = useMemo(
    () => adminUsers.filter((user) => !ownerUserIds.includes(user.id)),
    [adminUsers, ownerUserIds],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const addUser = (userId) => {
    if (disabled || ownerUserIds.includes(userId)) return;
    onChange?.([...ownerUserIds, userId]);
    setOpen(false);
  };

  const removeUser = (userId) => {
    if (disabled) return;
    const next = ownerUserIds.filter((id) => id !== userId);
    if (!next.length) return;
    onChange?.(next);
  };

  return (
    <div className="commercial-lead-owners" ref={rootRef}>
      <span className="commercial-lead-owners-label">{label}</span>
      <div className="commercial-lead-owners-row">
        <div
          className="commercial-lead-owners-stack commercial-lead-owners-stack--editable"
          aria-label={label}
        >
          {selectedProfiles.map((owner) => (
            <div key={owner.userId} className="commercial-lead-owners-item">
              <Avatar
                name={owner.name}
                src={owner.avatarUrl}
                color={owner.avatarColor}
                size="sm"
                title={owner.name ?? 'Responsável'}
              />
              {!disabled ? (
                <button
                  type="button"
                  className="commercial-lead-owners-remove"
                  aria-label={`Remover ${owner.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeUser(owner.userId);
                  }}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {!disabled ? (
          <div className="commercial-lead-owners-add-wrap">
            <button
              type="button"
              className="commercial-lead-owners-add"
              aria-label="Adicionar responsável"
              aria-expanded={open}
              disabled={!availableUsers.length}
              onClick={() => setOpen((value) => !value)}
            >
              <Plus size={16} aria-hidden="true" />
            </button>

            {open && availableUsers.length ? (
              <div className="commercial-lead-owners-menu" role="listbox" aria-label="Selecionar responsável">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    className="commercial-lead-owners-menu-item"
                    onClick={() => addUser(user.id)}
                  >
                    <Avatar
                      name={user.name}
                      src={user.avatarUrl}
                      color={user.avatarColor}
                      size="xs"
                      title={user.name}
                    />
                    <span>{user.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LeadOwnersStack({ owners = [], size = 'xs', max = 3, className = '' }) {
  if (!owners.length) return null;
  const visible = owners.slice(0, max);
  const extra = owners.length - visible.length;

  return (
    <div className={`commercial-lead-owners-stack commercial-lead-owners-stack--compact ${className}`.trim()}>
      {visible.map((owner) => (
        <Avatar
          key={owner.userId}
          name={owner.name}
          src={owner.avatarUrl}
          color={owner.avatarColor}
          size={size}
          title={owner.name ?? 'Responsável'}
        />
      ))}
      {extra > 0 ? <span className="commercial-lead-owners-more">+{extra}</span> : null}
    </div>
  );
}
