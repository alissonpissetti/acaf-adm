import { useEffect, useRef, useState } from 'react';

const KIND_CONFIG = {
  logo: {
    label: 'Logo',
    placeholder: 'Sem imagem',
    uploadLabel: 'Enviar',
    replaceLabel: 'Trocar',
    removeLabel: 'Remover',
    accept: 'image/png,image/webp,image/jpeg,image/svg+xml',
    hint: 'PNG ou WebP transparente · até 2 MB',
    thumbClass: 'marketing-media-thumb--logo',
    imgFit: 'contain',
  },
  cover: {
    label: 'Foto de capa',
    placeholder: 'Sem imagem',
    uploadLabel: 'Enviar',
    replaceLabel: 'Trocar',
    removeLabel: 'Remover',
    accept: 'image/png,image/jpeg,image/webp',
    hint: 'Banner 16:3 no topo · até 5 MB',
    thumbClass: 'marketing-media-thumb--cover',
    imgFit: 'cover',
  },
};

const MAX_BYTES = {
  logo: 2 * 1024 * 1024,
  cover: 5 * 1024 * 1024,
};

export function MarketingLandingMediaField({
  kind,
  value = '',
  onChange,
  onRemoveSaved,
  onUrlChange,
  disabled = false,
}) {
  const config = KIND_CONFIG[kind];
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value?.trim() || '');
  const [fileName, setFileName] = useState('');
  const [remoteLoadFailed, setRemoteLoadFailed] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  useEffect(() => {
    if (!fileName) {
      setPreview(value?.trim() || '');
    }
    if (!value) setFileName('');
    setRemoteLoadFailed(false);
  }, [value, fileName]);

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
    setLocalError('');
    setShowUrl(false);

    if (file && file.size > MAX_BYTES[kind]) {
      const limitMb = MAX_BYTES[kind] / (1024 * 1024);
      setLocalError(`Arquivo muito grande. O limite é ${limitMb} MB.`);
      return;
    }

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

    setPreview(value?.trim() || '');
    setFileName('');
  };

  const clearSelection = () => {
    onChange(null);
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(value?.trim() || '');
    setFileName('');
    setLocalError('');
    setRemoteLoadFailed(false);
  };

  const showImage =
    Boolean(preview) && (!remoteLoadFailed || (preview?.startsWith('blob:') ?? false));
  const savedUrl = (value ?? '').trim();
  const canRemoveSaved =
    typeof onRemoveSaved === 'function' &&
    Boolean(savedUrl) &&
    !savedUrl.startsWith('blob:') &&
    !fileName;
  const hasMedia = showImage || Boolean(fileName);

  return (
    <article className="marketing-media-card">
      <header className="marketing-media-card-head">
        <h4 className="marketing-media-card-title">{config.label}</h4>
        <p className="field-hint">{config.hint}</p>
      </header>

      <div className="marketing-media-card-body">
        <div className={`marketing-media-thumb ${config.thumbClass}`}>
          {showImage ? (
            <img
              src={preview}
              alt=""
              style={{ objectFit: config.imgFit }}
              onError={() => {
                if (preview && !preview.startsWith('blob:')) setRemoteLoadFailed(true);
              }}
            />
          ) : remoteLoadFailed && savedUrl ? (
            <span className="marketing-media-thumb-placeholder marketing-media-thumb-placeholder--broken">
              Indisponível
            </span>
          ) : (
            <span className="marketing-media-thumb-placeholder">{config.placeholder}</span>
          )}
        </div>

        <div className="marketing-media-card-main">
          <div className="marketing-media-card-actions">
            {!disabled ? (
              <button
                type="button"
                className={hasMedia ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                onClick={() => inputRef.current?.click()}
              >
                {hasMedia ? config.replaceLabel : config.uploadLabel}
              </button>
            ) : null}
            {canRemoveSaved ? (
              <button
                type="button"
                className="btn-ghost btn-sm logo-field-remove"
                onClick={() => {
                  onRemoveSaved();
                  if (preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(preview);
                  }
                  setPreview('');
                  setRemoteLoadFailed(false);
                  setFileName('');
                  setShowUrl(false);
                }}
                disabled={disabled}
              >
                {config.removeLabel}
              </button>
            ) : null}
            {fileName ? (
              <button type="button" className="btn-ghost btn-sm" onClick={clearSelection} disabled={disabled}>
                Desfazer
              </button>
            ) : null}
          </div>

          {fileName ? <p className="field-hint marketing-media-file-name">{fileName}</p> : null}
          {localError ? <p className="error-text">{localError}</p> : null}

          {!disabled && typeof onUrlChange === 'function' ? (
            <div className="marketing-media-url-block">
              <button
                type="button"
                className="crud-link-btn marketing-media-url-toggle"
                onClick={() => setShowUrl((current) => !current)}
                aria-expanded={showUrl}
              >
                {showUrl ? 'Ocultar URL externa' : 'Usar URL externa'}
              </button>
              {showUrl ? (
                <label className="marketing-media-url-input">
                  <span className="sr-only">URL da imagem</span>
                  <input
                    type="url"
                    value={value ?? ''}
                    onChange={(ev) => onUrlChange(ev.target.value)}
                    disabled={disabled || Boolean(fileName)}
                    placeholder="https://…"
                  />
                  <p className="field-hint">Cole o link se a imagem já estiver hospedada fora da plataforma.</p>
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        hidden
        onChange={onFileChange}
        disabled={disabled}
      />
    </article>
  );
}
