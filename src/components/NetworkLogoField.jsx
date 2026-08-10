import { useEffect, useState } from 'react';

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

export function NetworkLogoField({ value, onChange, disabled = false }) {
  const [preview, setPreview] = useState(value ?? null);

  useEffect(() => {
    setPreview(value ?? null);
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
    onChange(file);

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setPreview(file ? URL.createObjectURL(file) : value ?? null);
  };

  return (
    <div className="logo-field">
      <div className="logo-field-preview">
        {preview ? (
          <img src={preview} alt="Logo da rede" />
        ) : (
          <span className="logo-field-placeholder">Sem logo</span>
        )}
      </div>
      <label className="logo-field-upload">
        <span>Logo da rede</span>
        <input
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          disabled={disabled}
        />
        <small className="muted">PNG, JPG, WEBP ou SVG · até 2 MB</small>
      </label>
    </div>
  );
}
