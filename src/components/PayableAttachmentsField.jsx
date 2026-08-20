import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, Receipt, Upload, X } from 'lucide-react';
import { appChoose } from './confirm/appConfirm.js';
import {
  formatDateTime,
  toDateTimeLocalValue,
} from '../utils/finance.js';

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

function isImageFileName(name) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(String(name ?? ''));
}

function isImageMime(mimeType, fileName) {
  return mimeType?.startsWith('image/') || isImageFileName(fileName);
}

function isImageFile(file) {
  return file?.type?.startsWith('image/') || isImageFileName(file?.name);
}

function normalizeAttachmentKind(kind) {
  return kind === 'payment_receipt' ? 'payment_receipt' : 'general';
}

function AttachmentPreview({ href, src, alt, fallbackLabel }) {
  if (!src) {
    return (
      <span className="payable-attachments-icon" aria-hidden="true">
        <Paperclip size={18} />
      </span>
    );
  }

  return (
    <a
      href={href ?? src}
      target="_blank"
      rel="noreferrer"
      className="payable-attachments-thumb-link"
      aria-label={fallbackLabel ? `Abrir ${fallbackLabel}` : 'Abrir imagem'}
    >
      <img src={src} alt="" className="payable-attachments-thumb" loading="lazy" />
    </a>
  );
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLSelectElement) {
    return !target.disabled;
  }
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

function AttachmentListItem({
  attachment,
  readOnly,
  disabled,
  busy,
  onRemove,
  paymentMomentLabel = 'pagamento',
}) {
  return (
    <li className="payable-attachments-item">
      <AttachmentPreview
        href={attachment.publicUrl}
        src={
          isImageMime(attachment.mimeType, attachment.originalName)
            ? attachment.publicUrl
            : null
        }
        fallbackLabel={attachment.originalName}
      />
      <div className="payable-attachments-item-meta">
        <a href={attachment.publicUrl} target="_blank" rel="noreferrer">
          {attachment.originalName}
        </a>
        <small>
          {formatFileSize(attachment.size)}
          {attachment.kind === 'payment_receipt' && attachment.recordedSettledAt
            ? ` · ${paymentMomentLabel} em ${formatDateTime(attachment.recordedSettledAt)}`
            : ''}
        </small>
        {attachment.kind === 'payment_receipt' ? (
          <span className="payable-attachments-kind-badge">Comprovante</span>
        ) : null}
      </div>
      {!readOnly ? (
        <button
          type="button"
          className="payable-attachments-remove"
          aria-label={`Remover ${attachment.originalName}`}
          disabled={disabled || busy}
          onClick={() => onRemove(attachment.id)}
        >
          <X size={16} />
        </button>
      ) : null}
    </li>
  );
}

function DropZone({
  inputRef,
  icon: Icon,
  title,
  subtitle,
  countLabel,
  tone = 'default',
  dragging,
  canAdd,
  onDragState,
  onFiles,
  onPaste,
}) {
  return (
    <div
      className={`payable-attachments-dropzone payable-attachments-dropzone--${tone}${dragging ? ' is-dragging' : ''}${!canAdd ? ' is-disabled' : ''}`}
      onDragEnter={(ev) => {
        ev.preventDefault();
        if (canAdd) onDragState(true);
      }}
      onDragOver={(ev) => {
        ev.preventDefault();
        if (canAdd) onDragState(true);
      }}
      onDragLeave={(ev) => {
        ev.preventDefault();
        if (ev.currentTarget === ev.target) onDragState(false);
      }}
      onDrop={(ev) => {
        ev.preventDefault();
        onDragState(false);
        if (canAdd) void onFiles(ev.dataTransfer.files);
      }}
      onPaste={(ev) => void onPaste(ev)}
      onClick={() => {
        if (canAdd) inputRef.current?.click();
      }}
      onKeyDown={(ev) => {
        if ((ev.key === 'Enter' || ev.key === ' ') && canAdd) {
          ev.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={canAdd ? 0 : -1}
      aria-disabled={!canAdd}
    >
      <Icon size={22} aria-hidden="true" />
      <strong>{dragging ? 'Solte os arquivos aqui' : title}</strong>
      <span>{subtitle}</span>
      {countLabel ? <span>{countLabel}</span> : null}
    </div>
  );
}

export function PayableAttachmentsField({
  payableId,
  attachments = [],
  pendingFiles = [],
  onAttachmentsChange,
  onPendingFilesChange,
  onUpload,
  onDelete,
  ensurePayable,
  onUploadBusyChange,
  onPayableUpdated,
  readOnly = false,
  disabled = false,
  allowPaymentReceiptWhenReadOnly = false,
  flowDirection = 'outflow',
}) {
  const generalInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const [draggingGeneral, setDraggingGeneral] = useState(false);
  const [draggingReceipt, setDraggingReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [error, setError] = useState('');
  const [pasteHint, setPasteHint] = useState('');
  const [pendingPreviewUrls, setPendingPreviewUrls] = useState({});

  const isInflow = flowDirection === 'inflow';
  const receiptTitle = isInflow ? 'Comprovante de recebimento' : 'Comprovante de pagamento';
  const receiptHelp = isInflow
    ? 'Ao anexar um comprovante, a baixa do recebível é registrada automaticamente com a data e hora atuais. Você poderá ajustar essa informação depois.'
    : 'Ao anexar um comprovante, a baixa do pagável é registrada automaticamente com a data e hora atuais. Você poderá ajustar essa informação depois.';
  const receiptActionLabel = isInflow ? 'Anexar comprovante de recebimento' : 'Anexar comprovante de pagamento';
  const receiptPasteSuccess = isInflow
    ? 'Comprovante enviado e baixa de recebimento registrada com a data/hora atual.'
    : 'Comprovante enviado e baixa registrada com a data/hora atual.';
  const paymentMomentLabel = isInflow ? 'recebimento' : 'pagamento';

  const generalAttachments = useMemo(
    () => attachments.filter((item) => normalizeAttachmentKind(item.kind) === 'general'),
    [attachments],
  );
  const receiptAttachments = useMemo(
    () => attachments.filter((item) => normalizeAttachmentKind(item.kind) === 'payment_receipt'),
    [attachments],
  );
  const pendingGeneral = useMemo(
    () => pendingFiles.filter((item) => normalizeAttachmentKind(item.kind) === 'general'),
    [pendingFiles],
  );
  const pendingReceipts = useMemo(
    () => pendingFiles.filter((item) => normalizeAttachmentKind(item.kind) === 'payment_receipt'),
    [pendingFiles],
  );

  const totalCount = attachments.length + pendingFiles.length + uploadingFiles.length;
  const canEditGeneral = !readOnly && !disabled && !busy;
  const canEditReceipt =
    (!readOnly || allowPaymentReceiptWhenReadOnly) && !disabled && !busy;
  const canAddGeneral = canEditGeneral && totalCount < MAX_FILES;
  const canAddReceipt = canEditReceipt && totalCount < MAX_FILES;

  const setUploadBusy = useCallback(
    (value) => {
      setBusy(value);
      onUploadBusyChange?.(value);
    },
    [onUploadBusyChange],
  );

  const applyPayableUpdate = useCallback(
    (updated) => {
      onAttachmentsChange?.(updated.attachments ?? []);
      onPayableUpdated?.(updated);
    },
    [onAttachmentsChange, onPayableUpdated],
  );

  const addPendingFiles = useCallback(
    (files, kind) => {
      if (!onPendingFilesChange) return false;
      if ((kind === 'payment_receipt' ? !canEditReceipt : !canEditGeneral) || busy) return false;

      const normalizedKind = normalizeAttachmentKind(kind);
      let added = false;
      onPendingFilesChange((current) => {
        const next = [...current];
        for (const file of files) {
          if (attachments.length + next.length >= MAX_FILES) break;
          if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`"${file.name}" excede ${MAX_SIZE_MB} MB.`);
            continue;
          }
          if (
            next.some(
              (item) => item.file.name === file.name && item.file.size === file.size && item.kind === normalizedKind,
            )
          ) {
            continue;
          }
          next.push({
            file,
            kind: normalizedKind,
            settledAt:
              normalizedKind === 'payment_receipt' ? new Date().toISOString() : null,
          });
          added = true;
        }
        return next;
      });

      if (added) setError('');
      return added;
    },
    [attachments.length, busy, canEditGeneral, canEditReceipt, onPendingFilesChange],
  );

  const uploadNow = useCallback(
    async (files, { kind = 'general', settledAt, requireImmediate = false } = {}) => {
      if (!onUpload || !files.length) return false;
      const normalizedKind = normalizeAttachmentKind(kind);
      if (normalizedKind === 'payment_receipt' ? !canEditReceipt : !canEditGeneral) return false;

      setUploadBusy(true);
      const previewUrls = files.map((file) =>
        isImageFile(file) ? URL.createObjectURL(file) : null,
      );
      setUploadingFiles(
        files.map((file, index) => ({
          name: file.name,
          size: file.size,
          previewUrl: previewUrls[index],
          kind: normalizedKind,
        })),
      );
      setError('');

      try {
        let targetId = payableId;
        if (!targetId) {
          if (!ensurePayable) {
            if (requireImmediate) {
              setError('Salve os dados obrigatórios do lançamento antes de colar anexos.');
              return false;
            }
            return addPendingFiles(files, normalizedKind);
          }
          targetId = await ensurePayable();
        }

        if (!targetId) {
          setError('Não foi possível preparar o lançamento para envio do anexo.');
          return false;
        }

        const paymentSettledAt =
          normalizedKind === 'payment_receipt'
            ? settledAt ?? new Date().toISOString()
            : undefined;

        const updated = await onUpload(targetId, files, {
          kind: normalizedKind,
          settledAt: paymentSettledAt,
        });
        applyPayableUpdate(updated);
        onPendingFilesChange?.((current) =>
          current.filter((item) => normalizeAttachmentKind(item.kind) !== normalizedKind),
        );
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setUploadBusy(false);
        setUploadingFiles((current) => {
          current.forEach((file) => {
            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
          });
          return [];
        });
      }
    },
    [
      addPendingFiles,
      applyPayableUpdate,
      canEditGeneral,
      canEditReceipt,
      ensurePayable,
      onPendingFilesChange,
      onUpload,
      payableId,
      setUploadBusy,
    ],
  );

  const handleFiles = useCallback(
    async (fileList, kind) => {
      const files = Array.from(fileList ?? []);
      if (!files.length) return false;

      if (payableId) {
        return uploadNow(files, { kind });
      }

      return addPendingFiles(files, kind);
    },
    [addPendingFiles, payableId, uploadNow],
  );

  const askPasteKind = useCallback(async () => {
    return appChoose({
      title: 'Tipo de anexo',
      message: 'Como deseja classificar a imagem colada?',
      choices: [
        { id: 'general', label: 'Anexo normal' },
        { id: 'payment_receipt', label: 'Comprovante de pagamento', primary: true },
      ],
    });
  }, []);

  const handlePaste = useCallback(
    async (ev) => {
      if (busy || isEditableTarget(ev.target)) return;
      if (readOnly && !allowPaymentReceiptWhenReadOnly) return;

      const files = clipboardImageFiles(ev.clipboardData);
      if (!files.length) return;

      ev.preventDefault();
      const kind = await askPasteKind();
      if (!kind) return;

      const ok = await uploadNow(files, {
        kind,
        requireImmediate: true,
        settledAt: kind === 'payment_receipt' ? new Date().toISOString() : undefined,
      });
      if (ok) {
        setPasteHint(
          kind === 'payment_receipt'
            ? receiptPasteSuccess
            : files.length > 1
              ? `${files.length} imagens enviadas.`
              : 'Imagem enviada.',
        );
      }
    },
    [allowPaymentReceiptWhenReadOnly, askPasteKind, busy, readOnly, uploadNow],
  );

  useEffect(() => {
    if (readOnly && !allowPaymentReceiptWhenReadOnly) return undefined;

    const onPaste = (ev) => {
      void handlePaste(ev);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [allowPaymentReceiptWhenReadOnly, handlePaste, readOnly]);

  useEffect(() => {
    if (!pasteHint) return undefined;
    const timer = window.setTimeout(() => setPasteHint(''), 4000);
    return () => window.clearTimeout(timer);
  }, [pasteHint]);

  useEffect(() => {
    const urls = {};
    pendingFiles.forEach((item, index) => {
      if (isImageFile(item.file)) {
        urls[index] = URL.createObjectURL(item.file);
      }
    });
    setPendingPreviewUrls(urls);
    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingFiles]);

  const removePending = (index) => {
    onPendingFilesChange?.(pendingFiles.filter((_, idx) => idx !== index));
  };

  const removeAttachment = async (attachmentId) => {
    if (!payableId || !onDelete) return;
    setUploadBusy(true);
    setError('');
    try {
      const updated = await onDelete(payableId, attachmentId);
      applyPayableUpdate(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadBusy(false);
    }
  };

  const renderPendingItems = (items, startIndex = 0) =>
    items.map((item, index) => {
      const globalIndex = pendingFiles.indexOf(item);
      const previewIndex = globalIndex >= 0 ? globalIndex : startIndex + index;
      return (
        <li
          key={`pending-${item.file.name}-${item.file.size}-${previewIndex}`}
          className="payable-attachments-item is-pending"
        >
          <AttachmentPreview
            src={pendingPreviewUrls[previewIndex] ?? null}
            fallbackLabel={item.file.name}
          />
          <div className="payable-attachments-item-meta">
            <span>{item.file.name}</span>
            <small>
              {formatFileSize(item.file.size)} · aguardando salvamento
              {item.kind === 'payment_receipt' && item.settledAt
                ? ` · baixa em ${formatDateTime(item.settledAt)}`
                : ''}
            </small>
            {item.kind === 'payment_receipt' ? (
              <span className="payable-attachments-kind-badge">Comprovante</span>
            ) : null}
          </div>
          {item.kind === 'payment_receipt' ? (
            !readOnly || allowPaymentReceiptWhenReadOnly ? (
              <button
                type="button"
                className="payable-attachments-remove"
                aria-label={`Remover ${item.file.name}`}
                disabled={disabled || busy}
                onClick={() => removePending(globalIndex)}
              >
                <X size={16} />
              </button>
            ) : null
          ) : !readOnly ? (
            <button
              type="button"
              className="payable-attachments-remove"
              aria-label={`Remover ${item.file.name}`}
              disabled={disabled || busy}
              onClick={() => removePending(globalIndex)}
            >
              <X size={16} />
            </button>
          ) : null}
        </li>
      );
    });

  return (
    <div className="payable-attachments field-span-full">
      <div className="payable-attachments-section">
        <span className="field-label">Anexos</span>
        <p className="muted payable-attachments-help">
          Documentos de suporte ao lançamento. Arraste, clique ou use <kbd>Ctrl</kbd> + <kbd>V</kbd>{' '}
          para colar imagens.
        </p>

        {!readOnly ? (
          <>
            <DropZone
              inputRef={generalInputRef}
              icon={Upload}
              title="Arraste, clique ou Ctrl+V para anexar"
              subtitle={`PDF, imagens, Word, Excel, CSV, TXT ou ZIP · até ${MAX_SIZE_MB} MB`}
              countLabel={`${generalAttachments.length + pendingGeneral.length}/${MAX_FILES} arquivo(s)`}
              dragging={draggingGeneral}
              canAdd={canAddGeneral}
              onDragState={setDraggingGeneral}
              onFiles={(files) => void handleFiles(files, 'general')}
              onPaste={handlePaste}
            />
            <input
              ref={generalInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              hidden
              disabled={!canAddGeneral}
              onChange={(ev) => {
                void handleFiles(ev.target.files, 'general');
                ev.target.value = '';
              }}
            />
          </>
        ) : null}

        {generalAttachments.length > 0 || pendingGeneral.length > 0 ? (
          <ul className="payable-attachments-list">
            {generalAttachments.map((attachment) => (
              <AttachmentListItem
                key={attachment.id}
                attachment={attachment}
                readOnly={readOnly}
                disabled={disabled}
                busy={busy}
                paymentMomentLabel={paymentMomentLabel}
                onRemove={(attachmentId) => void removeAttachment(attachmentId)}
              />
            ))}
            {renderPendingItems(pendingGeneral)}
          </ul>
        ) : readOnly ? (
          <p className="muted">Nenhum anexo.</p>
        ) : null}
      </div>

      <div className="payable-attachments-section payable-attachments-section--receipt">
        <span className="field-label">{receiptTitle}</span>
        <p className="muted payable-attachments-help">{receiptHelp}</p>

        {canEditReceipt ? (
          <>
            <DropZone
              inputRef={receiptInputRef}
              icon={Receipt}
              tone="receipt"
              title={receiptActionLabel}
              subtitle="Registra a baixa neste momento"
              countLabel={`${receiptAttachments.length + pendingReceipts.length} comprovante(s)`}
              dragging={draggingReceipt}
              canAdd={canAddReceipt}
              onDragState={setDraggingReceipt}
              onFiles={(files) => void handleFiles(files, 'payment_receipt')}
              onPaste={handlePaste}
            />
            <input
              ref={receiptInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              hidden
              disabled={!canAddReceipt}
              onChange={(ev) => {
                void handleFiles(ev.target.files, 'payment_receipt');
                ev.target.value = '';
              }}
            />
          </>
        ) : null}

        {receiptAttachments.length > 0 || pendingReceipts.length > 0 ? (
          <ul className="payable-attachments-list">
            {receiptAttachments.map((attachment) => (
              <AttachmentListItem
                key={attachment.id}
                attachment={attachment}
                readOnly={readOnly && !allowPaymentReceiptWhenReadOnly}
                disabled={disabled}
                busy={busy}
                paymentMomentLabel={paymentMomentLabel}
                onRemove={(attachmentId) => void removeAttachment(attachmentId)}
              />
            ))}
            {renderPendingItems(pendingReceipts)}
          </ul>
        ) : readOnly && !allowPaymentReceiptWhenReadOnly ? (
          <p className="muted">Nenhum comprovante anexado.</p>
        ) : null}
      </div>

      {uploadingFiles.length > 0 ? (
        <ul className="payable-attachments-list">
          {uploadingFiles.map((file, index) => (
            <li
              key={`uploading-${file.name}-${index}`}
              className="payable-attachments-item is-uploading"
            >
              <AttachmentPreview src={file.previewUrl ?? null} fallbackLabel={file.name} />
              <div className="payable-attachments-item-meta">
                <span>{file.name}</span>
                <small>
                  {formatFileSize(file.size)} · enviando…
                  {file.kind === 'payment_receipt' ? ' · registrando baixa' : ''}
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {busy ? <p className="muted payable-attachments-status">Enviando anexos…</p> : null}
      {pasteHint ? (
        <p className="payable-attachments-status payable-attachments-status-success">{pasteHint}</p>
      ) : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
