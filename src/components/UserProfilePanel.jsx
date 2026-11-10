import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { updateMyProfile } from '../api/auth.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { UserAvatarField } from './UserAvatarField.jsx';
import { ModalCloseButton } from './ModalCloseButton.jsx';

const MY_ACCOUNT_EDIT_PATH = '/m/operacao/usuarios';

export function UserProfilePanel({ onClose }) {
  const navigate = useNavigate();
  const { user, refreshProfile, bumpAvatarImage } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? null);
  const [busyColor, setBusyColor] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? null);
    setAvatarColor(user?.avatarColor ?? null);
  }, [user?.avatarUrl, user?.avatarColor]);

  if (!user) return null;

  const onAvatarChange = async (nextUrl, nextColor) => {
    setAvatarUrl(nextUrl ?? null);
    if (nextColor) setAvatarColor(nextColor);
    bumpAvatarImage();
    setError('');
    try {
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    }
  };

  const goToAccountEdit = () => {
    onClose?.();
    navigate(`${MY_ACCOUNT_EDIT_PATH}?id=${encodeURIComponent(user.id)}`);
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
          <p>Foto, cor do avatar e dados cadastrais da sua conta.</p>
        </div>
        <ModalCloseButton onClick={onClose} />
      </header>

      <div className="user-profile-panel-body">
        {error ? <p className="field-hint field-hint-error">{error}</p> : null}

        <UserAvatarField
          name={user.name}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor ?? user.avatarColor}
          onChange={onAvatarChange}
          onColorChange={onColorChange}
          busyColor={busyColor}
        />

        <div className="user-profile-meta-section">
          <div className="user-profile-meta-head">
            <span className="field-label">Dados cadastrais</span>
            <button
              type="button"
              className="btn-ghost btn-sm user-profile-edit-data"
              onClick={goToAccountEdit}
            >
              <Pencil size={14} aria-hidden="true" />
              Editar dados
            </button>
          </div>
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
    </div>
  );
}
