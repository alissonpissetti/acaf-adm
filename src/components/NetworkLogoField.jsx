import { useEffect, useRef, useState } from 'react';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function NetworkLogoField({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value ?? null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    setPreview(value ?? null);
    if (!value) setFileName('');
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
  };

  return (
    <div className="file-upload-field">
      <span className="file-upload-label">Logo da rede</span>
      <div className="logo-field">
        <div className="logo-field-preview">
          {preview ? (
            <img src={preview} alt="Logo da rede" />
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
