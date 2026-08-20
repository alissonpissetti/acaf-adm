import { useEffect, useMemo, useState } from 'react';
import { deleteUsers, getUsers } from '../api/users.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { UserCreateScreen } from './UserCreateScreen.jsx';
import { UserEditScreen } from './UserEditScreen.jsx';
import { UsersList } from './UsersList.jsx';

export function UsersPage() {
  const router = useCrudRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedUser = useMemo(
    () => users.find((user) => user.id === router.id) ?? null,
    [users, router.id],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await getUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onUserCreated = (user) => {
    load();
    router.goToView(user.id);
  };

  if (router.isCreating) {
    return <UserCreateScreen onBack={router.goToList} onCreated={onUserCreated} />;
  }

  if (router.isViewing || router.isEditing) {
    if (!selectedUser && loading) {
      return <AppLoadingPanel label="Carregando usuário…" />;
    }

    if (!selectedUser) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Usuário não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <UserEditScreen
        key={selectedUser.id}
        user={selectedUser}
        readOnly={router.isViewing}
        onBack={router.goToList}
        onEdit={() => router.goToEdit(selectedUser.id)}
        onUpdated={async () => {
          await load();
          if (router.isEditing) router.goToView(selectedUser.id);
        }}
        onDeleted={router.goToList}
      />
    );
  }

  return (
    <UsersList
      users={users}
      loading={loading}
      error={error}
      message={message}
      currentUserId={currentUser?.id}
      onAdd={router.goToCreate}
      onView={router.goToView}
      onEdit={router.goToEdit}
      onBulkRemove={async (ids) => {
        setError('');
        setMessage('');
        try {
          const result = await deleteUsers(ids);
          await load();
          if (result.skipped?.length) {
            const firstReason = result.skipped[0]?.reason ?? 'Erro desconhecido';
            setError(
              result.removed > 0
                ? `${result.removed} usuário(s) removido(s). ${result.skipped.length} não puderam ser removidos (ex.: ${firstReason}).`
                : `Nenhum usuário removido. ${result.skipped.length} falha(s) (ex.: ${firstReason}).`,
            );
            if (result.removed > 0) {
              setMessage(`${result.removed} usuário(s) removido(s).`);
            }
          } else {
            setMessage(`${result.removed} usuário(s) removido(s).`);
          }
        } catch (err) {
          setError(err.message);
        }
      }}
    />
  );
}
