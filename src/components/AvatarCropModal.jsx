import { useEffect, useMemo, useRef, useState } from 'react';
import { ModalCloseButton } from './ModalCloseButton.jsx';
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  clampOffset,
  cropImageToFile,
  getBaseScale,
} from '../utils/avatarCrop.js';

const VIEWPORT_SIZE = 280;

export function AvatarCropModal({ file, onCancel, onConfirm }) {
  const dragRef = useRef(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setLoading(true);
    setError('');
    setZoom(1);
    setOffset({ offsetX: 0, offsetY: 0 });
    setImage(null);

    objectUrl = URL.createObjectURL(file);
    const loaded = new Image();
    loaded.onload = () => {
      if (!active) return;
      setImage(loaded);
      setLoading(false);
    };
    loaded.onerror = () => {
      if (!active) return;
      setError('Não foi possível carregar a imagem.');
      setLoading(false);
    };
    loaded.src = objectUrl;

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const scale = useMemo(() => {
    if (!image) return 1;
    return getBaseScale(image, VIEWPORT_SIZE) * zoom;
  }, [image, zoom]);

  const imageStyle = useMemo(() => {
    if (!image) return {};
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    return {
      width: `${drawWidth}px`,
      height: `${drawHeight}px`,
      transform: `translate(calc(-50% + ${offset.offsetX}px), calc(-50% + ${offset.offsetY}px))`,
    };
  }, [image, scale, offset.offsetX, offset.offsetY]);

  const updateOffset = (nextOffsetX, nextOffsetY) => {
    if (!image) return;
    setOffset(clampOffset(image, VIEWPORT_SIZE, scale, nextOffsetX, nextOffsetY));
  };

  const onPointerDown = (ev) => {
    if (!image || loading || busy) return;
    dragRef.current = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: offset.offsetX,
      originY: offset.offsetY,
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    updateOffset(
      drag.originX + (ev.clientX - drag.startX),
      drag.originY + (ev.clientY - drag.startY),
    );
  };

  const onPointerUp = (ev) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== ev.pointerId) return;
    dragRef.current = null;
    ev.currentTarget.releasePointerCapture(ev.pointerId);
  };

  const onZoomChange = (ev) => {
    const nextZoom = Number(ev.target.value);
    if (!image) {
      setZoom(nextZoom);
      return;
    }
    const nextScale = getBaseScale(image, VIEWPORT_SIZE) * nextZoom;
    setZoom(nextZoom);
    setOffset((current) => clampOffset(image, VIEWPORT_SIZE, nextScale, current.offsetX, current.offsetY));
  };

  const handleConfirm = async () => {
    if (!image) return;
    setBusy(true);
    setError('');
    try {
      const cropped = await cropImageToFile(
        image,
        {
          viewportSize: VIEWPORT_SIZE,
          zoom,
          offsetX: offset.offsetX,
          offsetY: offset.offsetY,
        },
        file.name,
      );
      await onConfirm?.(cropped);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="avatar-crop-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="avatar-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <ModalCloseButton onClick={onCancel} className="avatar-crop-close" />

        <header className="avatar-crop-head">
          <h2 id="avatar-crop-title">Ajustar foto</h2>
          <p>Arraste para posicionar e use o zoom para enquadrar o rosto no círculo.</p>
        </header>

        <div className="avatar-crop-body">
          <div
            className={`avatar-crop-stage${loading ? ' avatar-crop-stage--loading' : ''}`}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {image ? (
              <img
                src={image.src}
                alt=""
                className="avatar-crop-image"
                style={imageStyle}
                draggable={false}
              />
            ) : null}
            <div className="avatar-crop-mask" aria-hidden="true" />
          </div>

          <label className="avatar-crop-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={AVATAR_MIN_ZOOM}
              max={AVATAR_MAX_ZOOM}
              step="0.01"
              value={zoom}
              onChange={onZoomChange}
              disabled={loading || busy || !image}
            />
          </label>

          {loading ? <p className="field-hint">Carregando imagem…</p> : null}
          {error ? <p className="field-hint field-hint-error">{error}</p> : null}
        </div>

        <div className="avatar-crop-actions">
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirm}
            disabled={loading || busy || !image}
          >
            {busy ? 'Enviando…' : 'Salvar foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
