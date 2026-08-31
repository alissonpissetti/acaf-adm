import { useEffect, useState } from 'react';
import { updateMyProfile } from '../api/auth.js';
import { fetchJobPositions, fetchUserGroups } from '../api/access-control.js';
import { deleteUser, updateUser } from '../api/users.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { UserAvatarField } from '../components/UserAvatarField.jsx';
import { Avatar } from '../components/Avatar.jsx';
import { appConfirm } from '../components/confirm/appConfirm.js';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from '../components/crud/CrudFormActions.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import {
  formatCpfInput,
  formatMobilePhoneInput,
  normalizeCpf,
  normalizeMobilePhone,
} from '../utils/person.js';

function personFieldsFromUser(user) {
  return {
    name: user.name,
    cpf: user.cpf ? formatCpfInput(user.cpf) : '',
    mobilePhone: user.mobilePhone ? formatMobilePhoneInput(user.mobilePhone) : '',
    active: user.active,
    password: '',
    userGroupId: user.userGroupId ?? '',
    jobPositionId: user.jobPositionId ?? '',
  };
}

export function UserEditScreen({ user, readOnly = false, onBack, onEdit, onUpdated, onDeleted }) {
  const { user: currentUser, refreshProfile } = useAuth();
  const [form, setForm] = useState(() => personFieldsFromUser(user));
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? null);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor ?? null);
  const [groups, setGroups] = useState([]);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isSelf = currentUser?.id === user.id;
  const goBack = typeof onBack === 'function' ? onBack : onBack?.toList;

  useEffect(() => {
    setForm(personFieldsFromUser(user));
    setAvatarUrl(user.avatarUrl ?? null);
    setAvatarColor(user.avatarColor ?? null);
    setError('');
    setMessage('');
  }, [user]);

  useEffect(() => {
    Promise.all([fetchUserGroups(), fetchJobPositions()])
      .then(([groupRows, positionRows]) => {
        setGroups(groupRows);
        setPositions(positionRows);
      })
      .catch(() => {
        setGroups([]);
        setPositions([]);
      });
  }, []);

  const saveUser = async (ev) => {
    ev.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const patch = {
        name: form.name,
        cpf: normalizeCpf(form.cpf),
        mobilePhone: normalizeMobilePhone(form.mobilePhone),
        active: form.active,
        userGroupId: form.userGroupId || null,
        jobPositionId: form.jobPositionId || null,
      };
      if (form.password.trim()) {
        patch.password = form.password;
      }
      await updateUser(user.id, patch);
      setForm((current) => ({ ...current, password: '' }));
      setMessage('Usuário atualizado.');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async () => {
    const confirmed = await appConfirm({
      title: 'Remover usuário',
      message: `Remover o usuário "${user.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await deleteUser(user.id);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[{ label: 'Usuários', onClick: goBack }, { label: user.name }]}
        title={readOnly ? user.name : 'Editar usuário'}
        subtitle={user.email}
      />

      <CrudAlerts error={error} message={message} />

      <section className="panel">
        <div className="panel-header">
          <h2>Dados do usuário</h2>
        </div>
        <div className="panel-body">
          {isSelf ? (
            readOnly ? (
              <div className="user-avatar-field user-avatar-field-readonly">
                <Avatar name={user.name} src={avatarUrl} color={avatarColor} size="lg" />
                <div className="user-avatar-copy">
                  <strong>Foto de perfil</strong>
                </div>
              </div>
            ) : (
              <UserAvatarField
                name={form.name || user.name}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                onChange={async (nextUrl, nextColor) => {
                  setAvatarUrl(nextUrl);
                  if (nextColor) setAvatarColor(nextColor);
                  await refreshProfile();
                }}
                onColorChange={async (nextColor) => {
                  await updateMyProfile({ avatarColor: nextColor });
                  setAvatarColor(nextColor);
                  await refreshProfile();
                }}
              />
            )
          ) : null}
          <form className="form-grid" onSubmit={saveUser}>
            <label>
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={readOnly}
              />
            </label>

            <label>
              <span>CPF</span>
              <input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCpfInput(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                disabled={readOnly}
              />
            </label>

            <label>
              <span>Celular</span>
              <input
                value={form.mobilePhone}
                onChange={(e) =>
                  setForm({ ...form, mobilePhone: formatMobilePhoneInput(e.target.value) })
                }
                placeholder="(00) 00000-0000"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                disabled={readOnly}
              />
            </label>

            <label className="field-span-2">
              <span>E-mail</span>
              <input type="email" value={user.email} disabled />
            </label>

            <label>
              <span>Status</span>
              {readOnly ? (
                <span className={form.active ? 'badge badge-success' : 'badge badge-muted'}>
                  {form.active ? 'Ativo' : 'Inativo'}
                </span>
              ) : (
                <>
                  <div className="toggle-row">
                    <button
                      type="button"
                      className={form.active ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                      onClick={() => setForm({ ...form, active: true })}
                      disabled={busy || isSelf}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      className={!form.active ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
                      onClick={() => setForm({ ...form, active: false })}
                      disabled={busy || isSelf}
                    >
                      Inativo
                    </button>
                  </div>
                  {isSelf ? (
                    <small className="muted">Você não pode inativar seu próprio usuário.</small>
                  ) : null}
                </>
              )}
            </label>

            <label>
              <span>Grupo de acesso</span>
              <select
                value={form.userGroupId}
                onChange={(e) => setForm({ ...form, userGroupId: e.target.value })}
                disabled={readOnly}
              >
                <option value="">Sem grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Cargo</span>
              <select
                value={form.jobPositionId}
                onChange={(e) => setForm({ ...form, jobPositionId: e.target.value })}
                disabled={readOnly}
              >
                <option value="">Sem cargo</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                    {position.departmentName ? ` — ${position.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </label>

            {!readOnly ? (
              <label>
                <span>Nova senha</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Deixe em branco para manter a atual"
                  minLength={6}
                />
              </label>
            ) : null}

            <div className="field-span-full form-actions">
              {readOnly ? (
                <CrudViewActions onBack={goBack} onEdit={onEdit} />
              ) : (
                <CrudFormActions
                  busy={busy}
                  onCancel={goBack}
                  submitLabel="Salvar alterações"
                  onDelete={!isSelf ? removeUser : undefined}
                  showDelete={!isSelf}
                  deleteLabel="Remover usuário"
                />
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
