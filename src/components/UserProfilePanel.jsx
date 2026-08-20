import { useState } from 'react';
import { updateMyProfile } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { UserAvatarField } from './UserAvatarField.jsx';
import { ModalCloseButton } from './ModalCloseButton.jsx';

export function UserProfilePanel({ onClose }) {
  const { user, refreshProfile } = useAuth();
  const [busyColor, setBusyColor] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const onAvatarChange = async () => {
    await refreshProfile();
  };

  const onColorChange = async (colorId) => {
    if (colorId === user.avatarColor) return;
    setBusyColor(colorId);
    setError('');
    try {
      await updateMyProfile({ avatarColor: colorId });
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyColor('');
    }
  };

  return (
    <div className="user-profile-panel">
      <header className="user-profile-panel-head">
        <div>
          <h2>Meu perfil</h2>
          <p>Gerencie sua foto e a cor do avatar.</p>
        </div>
        <ModalCloseButton onClick={onClose} />
      </header>

      <div className="user-profile-panel-body">
        {error ? <p className="field-hint field-hint-error">{error}</p> : null}

        <UserAvatarField
          name={user.name}
          avatarUrl={user.avatarUrl}
          avatarColor={user.avatarColor}
          onChange={onAvatarChange}
          onColorChange={onColorChange}
          busyColor={busyColor}
        />

        <dl className="user-profile-meta">
          <div>
            <dt>Nome</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
