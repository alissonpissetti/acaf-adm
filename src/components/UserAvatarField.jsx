import { useRef, useState } from 'react';
import { removeMyAvatar, uploadMyAvatar } from '../api/auth.js';
import {
  AVATAR_MAX_SOURCE_BYTES,
  AVATAR_MAX_SOURCE_LABEL,
  isRasterImageFile,
  isSvgFile,
} from '../utils/avatarCrop.js';
import { AVATAR_COLORS, getAvatarColorStyle } from '../utils/avatarColors.js';
import { AvatarCropModal } from './AvatarCropModal.jsx';
import { Avatar } from './Avatar.jsx';

function normalizeUploadError(message) {
  if (/file too large/i.test(message)) {
    return `A imagem deve ter no máximo ${AVATAR_MAX_SOURCE_LABEL}.`;
  }
  return message;
}

export function UserAvatarField({
  name,
  avatarUrl,
  avatarColor,
  onChange,
  onColorChange,
  busyColor = '',
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState(null);

  const pickFile = () => {
    if (!disabled && !busy) inputRef.current?.click();
  };

  const uploadFile = async (file) => {
    setBusy(true);
    setError('');
    try {
      const profile = await uploadMyAvatar(file);
      onChange?.(profile.avatarUrl ?? null, profile.avatarColor ?? avatarColor);
    } catch (err) {
      setError(normalizeUploadError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;

    if (file.size > AVATAR_MAX_SOURCE_BYTES) {
      setError(`A imagem deve ter no máximo ${AVATAR_MAX_SOURCE_LABEL}.`);
      return;
    }

    if (isSvgFile(file)) {
      void uploadFile(file);
      return;
    }

    if (!isRasterImageFile(file)) {
      setError('Envie PNG, JPG, WEBP ou SVG.');
      return;
    }

    setError('');
    setCropFile(file);
  };

  const onCropConfirm = async (file) => {
    await uploadFile(file);
    setCropFile(null);
  };

  const onRemove = async () => {
    setBusy(true);
    setError('');
    try {
      const profile = await removeMyAvatar();
      onChange?.(profile.avatarUrl ?? null, profile.avatarColor ?? avatarColor);
    } catch (err) {
      setError(normalizeUploadError(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {cropFile ? (
        <AvatarCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={onCropConfirm}
        />
      ) : null}

      <div className="user-avatar-field">
        <button
          type="button"
          className="user-avatar-trigger"
          onClick={pickFile}
          disabled={disabled || busy}
          aria-label="Alterar foto de perfil"
        >
          <Avatar name={name} src={avatarUrl} color={avatarColor} size="lg" />
        </button>

        <div className="user-avatar-copy">
          <strong>Foto de perfil</strong>
          <p className="field-hint">
            PNG, JPG, WEBP ou SVG até {AVATAR_MAX_SOURCE_LABEL}. Antes de enviar, você ajusta o
            recorte circular da foto.
          </p>
          <div className="user-avatar-actions">
            <button type="button" className="btn-ghost btn-sm" onClick={pickFile} disabled={disabled || busy}>
              {busy ? 'Enviando…' : 'Enviar foto'}
            </button>
            {avatarUrl ? (
              <button type="button" className="btn-ghost btn-sm" onClick={onRemove} disabled={disabled || busy}>
                Remover foto
              </button>
            ) : null}
          </div>

          <div className="user-avatar-color-section">
            <span className="field-label">Cor do avatar</span>
            <p className="field-hint">Usada quando não há foto. Escolha uma das 12 cores abaixo.</p>
            <div className="user-avatar-color-grid" role="listbox" aria-label="Cor do avatar">
              {AVATAR_COLORS.map((color) => {
                const selected = avatarColor === color.id;
                const isBusy = busyColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`user-avatar-color-option${selected ? ' user-avatar-color-option--active' : ''}`}
                    style={getAvatarColorStyle(color.id)}
                    title={color.label}
                    disabled={disabled || busy || Boolean(busyColor)}
                    onClick={() => onColorChange?.(color.id)}
                  >
                    <span aria-hidden="true">{isBusy ? '…' : color.label.slice(0, 1)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="field-hint field-hint-error">{error}</p> : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          hidden
          onChange={onFileChange}
        />
      </div>
    </>
  );
}
