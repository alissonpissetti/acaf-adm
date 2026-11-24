import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { appConfirm } from '../confirm/appConfirm.js';
import {
  deleteProjectTaskAttachment,
  fetchProjectTaskAttachments,
  uploadProjectTaskAttachments,
} from '../../api/projectTasks.js';

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,application/pdf,image/*';
const MAX_FILES = 20;
const MAX_SIZE_MB = 15;

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mimeType, fileName) {
  return mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName ?? '');
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLSelectElement) return !target.disabled;
  return false;
}

function clipboardImageFiles(clipboardData) {
  const items = Array.from(clipboardData?.items ?? []);
  const imageItems = items.filter((item) => item.type.startsWith('image/'));
  if (!imageItems.length) return [];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return imageItems
    .map((item, index) => {
      const blob = item.getAsFile();
      if (!blob) return null;
      const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      const suffix = imageItems.length > 1 ? `-${index + 1}` : '';
      return new File([blob], `captura-${stamp}${suffix}.${extension}`, {
        type: blob.type || 'image/png',
      });
    })
    .filter(Boolean);
}

function validateFiles(files, currentCount) {
  const list = Array.from(files ?? []);
  if (!list.length) return { ok: false, error: '' };
  if (currentCount + list.length > MAX_FILES) {
    return { ok: false, error: `Limite de ${MAX_FILES} anexos por tarefa.` };
  }
  for (const file of list) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return { ok: false, error: `“${file.name}” excede ${MAX_SIZE_MB} MB.` };
    }
  }
  return { ok: true, files: list, error: '' };
}

export function CronogramaTaskAttachments({ taskId, canManage, onError, onCountChange, onActivityRefresh }) {
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    if (!taskId) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchProjectTaskAttachments(taskId);
      setAttachments(Array.isArray(rows) ? rows : []);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Não foi possível carregar anexos.');
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onCountChange?.(attachments.length);
  }, [attachments.length, onCountChange]);

  const uploadFiles = useCallback(
    async (fileList) => {
      if (!taskId || !canManage || uploading) return;
      const check = validateFiles(fileList, attachments.length);
      if (!check.ok) {
        if (check.error) onError?.(check.error);
        return;
      }
      setUploading(true);
      try {
        const created = await uploadProjectTaskAttachments(taskId, check.files);
        setAttachments((rows) => [...rows, ...(Array.isArray(created) ? created : [])]);
        await onActivityRefresh?.();
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Falha ao enviar anexo.');
      } finally {
        setUploading(false);
      }
    },
    [taskId, canManage, uploading, attachments.length, onError, onActivityRefresh],
  );

  const onRemove = async (attachment) => {
    if (!taskId || !canManage || uploading) return;
    const ok = await appConfirm({
      title: 'Remover anexo',
      message: `Remover “${attachment.originalName}”?`,
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });
    if (!ok) return;
    setUploading(true);
    try {
      await deleteProjectTaskAttachment(taskId, attachment.id);
      setAttachments((rows) => rows.filter((item) => item.id !== attachment.id));
      await onActivityRefresh?.();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Não foi possível remover o anexo.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!canManage || !taskId) return undefined;

    const onPaste = (event) => {
      if (isEditableTarget(event.target)) return;
      const fromClipboard = [
        ...Array.from(event.clipboardData?.files ?? []),
        ...clipboardImageFiles(event.clipboardData),
      ];
      if (!fromClipboard.length) return;
      event.preventDefault();
      void uploadFiles(fromClipboard);
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [canManage, taskId, uploadFiles]);

  const canUpload = Boolean(taskId && canManage && !uploading && attachments.length < MAX_FILES);
  const count = attachments.length;

  return (
    <section className="cronograma-task-attachments" ref={rootRef} aria-labelledby="cronograma-task-attachments-title">
      <header className="cronograma-task-attachments-head">
        <h3 id="cronograma-task-attachments-title">Anexos</h3>
        <span className="cronograma-task-attachments-count" aria-label={`${count} anexos`}>
          {count}
        </span>
      </header>

      {!taskId ? (
        <p className="muted cronograma-task-attachments-hint">
          Salve a tarefa para anexar arquivos.
        </p>
      ) : null}

      {taskId ? (
        <>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            multiple
            accept={ACCEPT}
            disabled={!canUpload}
            onChange={(e) => {
              void uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {canManage ? (
            <div
              className={`cronograma-task-attachments-dropzone${dragging ? ' is-dragging' : ''}${!canUpload ? ' is-disabled' : ''}`}
              role="button"
              tabIndex={canUpload ? 0 : -1}
              aria-disabled={!canUpload}
              onClick={() => canUpload && inputRef.current?.click()}
              onKeyDown={(ev) => {
                if ((ev.key === 'Enter' || ev.key === ' ') && canUpload) {
                  ev.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(ev) => {
                ev.preventDefault();
                if (canUpload) setDragging(true);
              }}
              onDragOver={(ev) => {
                ev.preventDefault();
                if (canUpload) setDragging(true);
              }}
              onDragLeave={(ev) => {
                ev.preventDefault();
                if (ev.currentTarget === ev.target) setDragging(false);
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                setDragging(false);
                if (canUpload) void uploadFiles(ev.dataTransfer.files);
              }}
            >
              {uploading ? (
                <Loader2 size={28} className="cronograma-task-attachments-spin" aria-hidden="true" />
              ) : (
                <CloudUpload size={28} aria-hidden="true" />
              )}
              <p>
                {dragging
                  ? 'Solte os arquivos aqui'
                  : uploading
                    ? 'Enviando arquivo(s)…'
                    : 'Clique ou arraste arquivos aqui para fazer upload'}
              </p>
            </div>
          ) : null}

          {loading ? (
            <p className="muted cronograma-task-attachments-hint">Carregando arquivos…</p>
          ) : null}

          {!loading && count === 0 ? (
            <p className="muted cronograma-task-attachments-hint">
              Nenhum arquivo anexado.{canManage ? ' (Use Ctrl+V para colar arquivos)' : ''}
            </p>
          ) : null}

          {!loading && count > 0 ? (
            <ul className="cronograma-task-attachments-list">
              {attachments.map((file) => (
                <li key={file.id} className="cronograma-task-attachments-item">
                  {isImageMime(file.mimeType, file.originalName) ? (
                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cronograma-task-attachments-thumb-link"
                    >
                      <img src={file.publicUrl} alt="" className="cronograma-task-attachments-thumb" loading="lazy" />
                    </a>
                  ) : (
                    <span className="cronograma-task-attachments-icon" aria-hidden="true">
                      <Paperclip size={18} />
                    </span>
                  )}
                  <div className="cronograma-task-attachments-meta">
                    <a href={file.publicUrl} target="_blank" rel="noreferrer">
                      {file.originalName}
                    </a>
                    <small>
                      {formatFileSize(file.size)}
                      {file.userName ? ` · ${file.userName}` : ''}
                    </small>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="cronograma-task-attachments-remove"
                      aria-label={`Remover ${file.originalName}`}
                      disabled={uploading}
                      onClick={() => void onRemove(file)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}