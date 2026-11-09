import { useEffect, useRef, useState } from 'react';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function NetworkLogoField({ value, onChange, onRemoveLogo, disabled = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value ?? null);
  const [fileName, setFileName] = useState('');
  /** URL remota que falhou ao carregar (ex.: arquivo apagado no servidor). */
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false);

  useEffect(() => {
    setPreview(value ?? null);
    if (!value) setFileName('');
    setRemoteLoadFailed(false);
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const onFileChange = (ev) => {
    const file = ev.target.files?.[0] ?? null;
    ev.target.value = '';
    onChange(file);

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setRemoteLoadFailed(false);

    if (file) {
      setPreview(URL.createObjectURL(file));
      setFileName(file.name);
      return;
    }

    setPreview(value ?? null);
    setFileName('');
  };

  const clearSelection = () => {
    onChange(null);
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(value ?? null);
    setFileName('');
    setRemoteLoadFailed(false);
  };

  const showImage =
    Boolean(preview) && (!remoteLoadFailed || (preview?.startsWith('blob:') ?? false));
  const canRemoveSaved =
    typeof onRemoveLogo === 'function' &&
    Boolean(value) &&
    !(value ?? '').startsWith('blob:') &&
    !fileName;

  return (
    <div className="file-upload-field">
      <span className="file-upload-label">Logo da rede</span>
      <div className="logo-field">
        <div className="logo-field-preview">
          {showImage ? (
            <img
              src={preview}
              alt="Logo da rede"
              onError={() => {
                if (preview && !preview.startsWith('blob:')) setRemoteLoadFailed(true);
              }}
            />
          ) : remoteLoadFailed && value ? (
            <span className="logo-field-placeholder logo-field-placeholder--broken">
              Imagem indisponível
            </span>
          ) : (
            <span className="logo-field-placeholder">Sem logo</span>
          )}
        </div>
        <div className="logo-field-actions">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            {preview ? 'Trocar logo' : 'Enviar logo'}
          </button>
          {canRemoveSaved ? (
            <button
              type="button"
              className="btn-ghost btn-sm logo-field-remove"
              onClick={() => {
                onRemoveLogo();
                if (preview?.startsWith('blob:')) {
                  URL.revokeObjectURL(preview);
                }
                setPreview(null);
                setRemoteLoadFailed(false);
                setFileName('');
              }}
              disabled={disabled}
            >
              Remover logo
            </button>
          ) : null}
          {fileName ? (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={clearSelection}
              disabled={disabled}
            >
              Desfazer seleção
            </button>
          ) : null}
          <p className="field-hint">PNG, JPG, WEBP ou SVG · até 2 MB</p>
          {fileName ? <p className="field-hint">{fileName}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={onFileChange}
        disabled={disabled}
      />
    </div>
  );
}
