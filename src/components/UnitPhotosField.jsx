import { useRef, useState } from 'react';
import {
  removeUnitGalleryPhoto,
  removeUnitHeroPhoto,
  setUnitHeroFromGallery,
  uploadUnitGalleryPhotos,
  uploadUnitHeroPhoto,
} from '../api/admin.js';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_GALLERY = 8;

export function UnitPhotosField({ unitId, heroPhoto, galleryPhotos, onChange, disabled = false, embedded = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heroInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      onChange?.({
        heroPhotoDataUrl: updated.heroPhotoDataUrl ?? null,
        galleryPhotoDataUrls: updated.galleryPhotoDataUrls ?? [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onHeroSelected = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    void run(() => uploadUnitHeroPhoto(unitId, file));
  };

  const onGallerySelected = (ev) => {
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = '';
    if (!files.length) return;
    void run(() => uploadUnitGalleryPhotos(unitId, files));
  };

  const removeHero = () => {
    void run(() => removeUnitHeroPhoto(unitId));
  };

  const removeGallery = (index) => {
    void run(() => removeUnitGalleryPhoto(unitId, index));
  };

  const selectHeroFromGallery = (index) => {
    if (heroPhoto === galleryPhotos[index]) return;
    void run(() => setUnitHeroFromGallery(unitId, index));
  };

  const galleryCount = galleryPhotos?.length ?? 0;
  const canAddGallery = galleryCount < MAX_GALLERY;

  return (
    <div className={`unit-photos-field ${embedded ? 'unit-photos-field-embedded' : ''} field-span-full`}>
      {!embedded ? (
        <div className="unit-photos-header">
          <div>
            <span className="field-label">Fotos da unidade</span>
            <p className="muted unit-photos-help">
              Imagens exibidas no Guia ACAF. Capa principal e até {MAX_GALLERY} fotos na
              galeria — clique em uma foto da galeria para usá-la como capa.
            </p>
          </div>
        </div>
      ) : (
        <p className="muted unit-photos-help">
          Capa principal e até {MAX_GALLERY} fotos na galeria — clique em uma foto para usá-la como
          capa.
        </p>
      )}

      <div className="unit-photos-grid">
        <div className="unit-photo-slot">
          <span className="unit-photo-label">Capa</span>
          <div className="unit-photo-preview hero">
            {heroPhoto ? (
              <img src={heroPhoto} alt="Capa da unidade" />
            ) : (
              <span className="unit-photo-placeholder">Sem foto</span>
            )}
          </div>
          <div className="unit-photo-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => heroInputRef.current?.click()}
              disabled={disabled || busy}
            >
              {heroPhoto ? 'Enviar outra capa' : 'Enviar capa'}
            </button>
            {heroPhoto ? (
              <button
                type="button"
                className="btn-ghost btn-sm btn-danger"
                onClick={removeHero}
                disabled={disabled || busy}
              >
                Remover capa
              </button>
            ) : null}
          </div>
          <input
            ref={heroInputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={onHeroSelected}
            disabled={disabled || busy}
          />
        </div>

        <div className="unit-photo-slot wide">
          <span className="unit-photo-label">
            Galeria ({galleryCount}/{MAX_GALLERY})
          </span>
          <div className="unit-photo-gallery">
            {(galleryPhotos ?? []).map((src, index) => {
              const isCover = heroPhoto === src;
              return (
                <div
                  key={`${src}-${index}`}
                  className={`unit-photo-gallery-item ${isCover ? 'is-cover' : ''}`}
                >
                  <button
                    type="button"
                    className="unit-photo-gallery-select"
                    onClick={() => selectHeroFromGallery(index)}
                    disabled={disabled || busy}
                    aria-label={isCover ? 'Foto de capa atual' : 'Usar como capa'}
                    aria-pressed={isCover}
                  >
                    <img src={src} alt="" />
                    {isCover ? <span className="unit-photo-cover-badge">Capa</span> : null}
                  </button>
                  <button
                    type="button"
                    className="unit-photo-gallery-remove"
                    aria-label="Remover foto"
                    onClick={() => removeGallery(index)}
                    disabled={disabled || busy}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {canAddGallery ? (
              <button
                type="button"
                className="unit-photo-gallery-add"
                onClick={() => galleryInputRef.current?.click()}
                disabled={disabled || busy}
              >
                +
              </button>
            ) : null}
          </div>
          <div className="unit-photo-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled || busy || !canAddGallery}
            >
              Adicionar fotos
            </button>
            <small className="muted">PNG, JPG ou WEBP · até 5 MB cada</small>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={onGallerySelected}
            disabled={disabled || busy || !canAddGallery}
          />
        </div>
      </div>

      {busy ? <p className="muted unit-photos-status">Enviando fotos…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
