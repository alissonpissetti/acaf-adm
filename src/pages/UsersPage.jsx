import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUsers } from '../api/users.js';
import { UserCreateScreen } from './UserCreateScreen.jsx';
import { UserEditScreen } from './UserEditScreen.jsx';
import { UsersList } from './UsersList.jsx';

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const isCreating = searchParams.get('new') === '1';

  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [users, selectedId],
  );

  const load = () => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const goToList = () => {
    setSearchParams({});
    load();
  };

  const goToCreate = () => {
    setSearchParams({ new: '1' });
  };

  const goToEdit = (userId) => {
    setSearchParams({ id: userId });
  };

  const onUserCreated = (user) => {
    load();
    setSearchParams({ id: user.id });
  };

  if (isCreating) {
    return (
      <>
        <UserCreateScreen onBack={goToList} onCreated={onUserCreated} />
        {error ? <p className="error-text">{error}</p> : null}
      </>
    );
  }

  if (selectedId) {
    if (!selectedUser && !error) {
      return (
        <div className="panel">
          <div className="panel-body">Carregando usuário…</div>
        </div>
      );
    }

    if (!selectedUser) {
      return (
        <div className="page-stack">
          <p className="error-text">{error || 'Usuário não encontrado.'}</p>
          <button type="button" className="btn-ghost" onClick={goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    return (
      <>
        <UserEditScreen
          key={selectedUser.id}
          user={selectedUser}
          onBack={{ toList: goToList }}
          onUpdated={load}
          onDeleted={goToList}
        />
        {error ? <p className="error-text">{error}</p> : null}
      </>
    );
  }

  return (
    <>
      <UsersList users={users} onAdd={goToCreate} onEdit={goToEdit} />
      {error ? <p className="error-text">{error}</p> : null}
    </>
  );
}
