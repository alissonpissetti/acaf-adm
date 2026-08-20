import { useEffect, useMemo, useState } from 'react';
import { AppLoadingPanel } from './crud/AppLoading.jsx';
import { CrudAlerts } from './crud/CrudAlerts.jsx';
import { CrudFormActions, CrudViewActions } from './crud/CrudFormActions.jsx';
import { CrudListShell } from './crud/CrudListShell.jsx';
import { PageHeader } from './PageHeader.jsx';
import { PermissionGate } from './PermissionGate.jsx';
import { CostCenterSelect } from './CostCenterSelect.jsx';
import { AccountPlanSelect } from './AccountPlanSelect.jsx';
import { CurrencyBrlInput } from './CurrencyBrlInput.jsx';
import { PayableAttachmentsField } from './PayableAttachmentsField.jsx';
import { PayerSelect } from './PayerSelect.jsx';
import { SupplierSelect } from './SupplierSelect.jsx';
import { confirmCrudDelete, confirmEntryCancel } from '../crud/crudUtils.js';
import { dateFilter, selectFilter, buildDueDateHorizonFilter } from '../crud/filterUtils.js';
import { useCrudList } from '../crud/useCrudList.js';
import { useCrudRouter } from '../crud/useCrudRouter.js';
import { formatDate, formatDateTime, formatMoney, fromDateTimeLocalValue, statusClass, statusLabel, toDateTimeLocalValue } from '../utils/finance.js';
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../utils/formDraftStorage.js';

const EMPTY_FORM = {
  description: '',
  amount: 0,
  dueDate: '',
  expectedSettledAt: '',
  costCenterId: '',
  supplierId: '',
  payerKind: '',
  payerRefId: '',
  counterpartName: '',
  accountPlanId: '',
  category: '',
  notes: '',
  generateReimbursement: false,
  reimbursementSupplierId: '',
  reimbursementCounterpartName: '',
  enableRecurrence: false,
  recurrenceMonths: '12',
};

function normalizeFormAmount(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function buildPayablePayload(form) {
  return {
    description: form.description,
    amount: normalizeFormAmount(form.amount),
    dueDate: form.dueDate,
    expectedSettledAt: form.expectedSettledAt || null,
    costCenterId: form.costCenterId,
    supplierId: form.supplierId || null,
    counterpartName: form.counterpartName,
    accountPlanId: form.accountPlanId,
    category: form.category,
    notes: form.notes,
    generateReimbursement: Boolean(form.generateReimbursement),
    reimbursementSupplierId: form.reimbursementSupplierId || null,
    reimbursementCounterpartName: form.reimbursementCounterpartName,
    ...(form.enableRecurrence && Number(form.recurrenceMonths) >= 2
      ? { recurrenceMonths: Number(form.recurrenceMonths) }
      : {}),
    ...(form.settledAtLocal ? { settledAt: fromDateTimeLocalValue(form.settledAtLocal) } : {}),
  };
}

function buildReceivablePayload(form) {
  return {
    description: form.description,
    amount: normalizeFormAmount(form.amount),
    dueDate: form.dueDate,
    expectedSettledAt: form.expectedSettledAt || null,
    costCenterId: form.costCenterId,
    payerKind: form.payerKind || null,
    payerRefId: form.payerRefId || null,
    counterpartName: form.counterpartName,
    accountPlanId: form.accountPlanId,
    category: form.category,
    notes: form.notes,
    ...(form.enableRecurrence && Number(form.recurrenceMonths) >= 2
      ? { recurrenceMonths: Number(form.recurrenceMonths) }
      : {}),
    ...(form.settledAtLocal ? { settledAt: fromDateTimeLocalValue(form.settledAtLocal) } : {}),
  };
}

async function uploadPendingPayableAttachments(uploadAttachments, payableId, pendingFiles) {
  if (!uploadAttachments || !pendingFiles?.length) return null;
  let lastUpdated = null;
  for (const item of pendingFiles) {
    lastUpdated = await uploadAttachments(payableId, [item.file], {
      kind: item.kind ?? 'general',
      settledAt: item.settledAt ?? undefined,
    });
  }
  return lastUpdated;
}

function syncPayableFormState(current, payable) {
  return {
    ...current,
    status: payable.status ?? current.status,
    settledAt: payable.settledAt ?? current.settledAt,
    settledAtLocal: toDateTimeLocalValue(payable.settledAt) || current.settledAtLocal,
  };
}

function validateReimbursement(form, enableReimbursement) {
  if (!enableReimbursement || !form.generateReimbursement) return;
  if (!form.reimbursementSupplierId && !form.reimbursementCounterpartName?.trim()) {
    throw new Error('Informe quem deve receber o reembolso.');
  }
}

function validateRecurrence(form, enableRecurrence) {
  if (!enableRecurrence || !form.enableRecurrence) return;
  const months = Number(form.recurrenceMonths);
  if (!Number.isInteger(months) || months < 2 || months > 60) {
    throw new Error('Informe entre 2 e 60 meses na série mensal.');
  }
}

function validateAmount(form) {
  if (normalizeFormAmount(form.amount) <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }
}

function entryToForm(entry) {
  return {
    description: entry.description ?? '',
    amount: normalizeFormAmount(entry.amount),
    dueDate: entry.dueDate?.slice(0, 10) ?? '',
    expectedSettledAt: entry.expectedSettledAt?.slice(0, 10) ?? '',
    costCenterId: entry.costCenterId ?? entry.costCenter?.id ?? '',
    supplierId: entry.supplierId ?? entry.supplier?.id ?? '',
    payerKind: entry.payerKind ?? entry.payer?.kind ?? '',
    payerRefId: entry.payerRefId ?? entry.payer?.refId ?? '',
    counterpartName: entry.counterpartName ?? entry.supplier?.name ?? entry.payer?.name ?? '',
    accountPlanId: entry.accountPlanId ?? entry.accountPlan?.id ?? '',
    category: entry.category ?? '',
    notes: entry.notes ?? '',
    settledAtLocal: toDateTimeLocalValue(entry.settledAt),
    status: entry.status ?? '',
  };
}

function buildDuplicateSeed(entry) {
  const form = entryToForm(entry);
  const baseDescription = form.description.trim();
  return {
    ...form,
    description: baseDescription ? `${baseDescription} (cópia)` : '',
    settledAtLocal: '',
    status: '',
    generateReimbursement: false,
    reimbursementSupplierId: '',
    reimbursementCounterpartName: '',
    enableRecurrence: false,
    recurrenceMonths: '12',
    submitLabel: 'Salvar lançamento duplicado',
  };
}

function accountPlanLabel(entry) {
  if (entry.accountPlan) {
    return `${entry.accountPlan.code} — ${entry.accountPlan.name}`;
  }
  return entry.category ?? '';
}

function costCenterDisplayName(row) {
  if (row.costCenter?.name) return row.costCenter.name;
  if (row.costCenterName) {
    const parts = row.costCenterName.split(' — ');
    return parts.length > 1 ? parts.slice(1).join(' — ').trim() : row.costCenterName.trim();
  }
  return '';
}

function accountPlanDisplayName(row) {
  if (row.accountPlan?.name) return row.accountPlan.name;
  if (row.accountPlanName) {
    const parts = row.accountPlanName.split(' — ');
    return parts.length > 1 ? parts.slice(1).join(' — ').trim() : row.accountPlanName.trim();
  }
  return row.category ?? '';
}

function cashEntryMetaLine(row) {
  const parts = [];
  if (row.counterpartName) parts.push(row.counterpartName);
  const costCenterName = costCenterDisplayName(row);
  if (costCenterName) parts.push(costCenterName);
  const accountPlanName = accountPlanDisplayName(row);
  if (accountPlanName) parts.push(accountPlanName);
  return parts.join(' · ');
}

function CashEntryDatesCell({ row }) {
  const isSettled = row.status === 'settled';

  return (
    <div className="cash-entry-dates">
      <div className="cash-entry-date-row">
        <span className="cash-entry-date-label">Vencimento</span>
        <span>{formatDate(row.dueDate)}</span>
      </div>
      {isSettled && row.settledAt ? (
        <div className="cash-entry-date-row">
          <span className="cash-entry-date-label">Baixa</span>
          <span>{formatDateTime(row.settledAt)}</span>
        </div>
      ) : row.expectedSettledAt ? (
        <div className="cash-entry-date-row cash-entry-date-expected">
          <span className="cash-entry-date-label">Previsão baixa</span>
          <span>{formatDate(row.expectedSettledAt)}</span>
        </div>
      ) : null}
    </div>
  );
}

function CashEntryListTitle({ row, enableReimbursement, enableAttachments }) {
  const meta = cashEntryMetaLine(row);

  return (
    <div className="cash-entry-list-main">
      <div className="cash-entry-title">{row.description}</div>
      {meta ? <div className="cash-entry-meta">{meta}</div> : null}
      {enableReimbursement && row.reimbursementSourcePayableId ? (
        <span className="cash-entry-tag">Reembolso</span>
      ) : null}
      {enableReimbursement && row.reimbursementPayable ? (
        <span className="cash-entry-tag">Com reembolso pendente</span>
      ) : null}
      {row.recurrenceTotal > 1 ? (
        <span className="cash-entry-tag">
          Série {row.recurrenceIndex}/{row.recurrenceTotal}
        </span>
      ) : null}
      {enableAttachments && row.hasPaymentReceipt ? (
        <span className="cash-entry-tag">Com comprovante</span>
      ) : null}
    </div>
  );
}

function mergeCreateInitial(initial, draftStorageKey, skipDraft = false) {
  if (skipDraft || !draftStorageKey || initial.id || initial.readOnly) return initial;
  const draft = loadFormDraft(draftStorageKey);
  if (!draft) return initial;
  return {
    ...initial,
    ...draft,
    amount: normalizeFormAmount(draft.amount),
  };
}

function CashEntryForm({
  title,
  subtitle,
  breadcrumbs,
  counterpartLabel,
  initial,
  draftStorageKey,
  permissionManage,
  accountPlanKind,
  enableAttachments = false,
  enableSupplierSelect = false,
  enablePayerSelect = false,
  enableReimbursement = false,
  enableRecurrence = false,
  attachmentFlow = 'outflow',
  buildPayload = buildPayablePayload,
  onViewLinkedEntry,
  createEntry,
  uploadAttachments,
  deleteAttachment,
  onSubmit,
  onCancel,
  onDelete,
  onDuplicate,
  onSettle,
  extraActions,
}) {
  const [form, setForm] = useState(() => mergeCreateInitial(initial, draftStorageKey, initial.skipDraft));
  const [attachments, setAttachments] = useState(initial.attachments ?? []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [attachmentUploadBusy, setAttachmentUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftRestored, setDraftRestored] = useState(
    () => Boolean(draftStorageKey && !initial.id && !initial.readOnly && loadFormDraft(draftStorageKey)),
  );

  useEffect(() => {
    const nextForm = mergeCreateInitial(initial, draftStorageKey, initial.skipDraft);
    setForm(nextForm);
    setDraftRestored(
      Boolean(
        draftStorageKey &&
          !initial.id &&
          !initial.readOnly &&
          !initial.skipDraft &&
          loadFormDraft(draftStorageKey),
      ),
    );
    setAttachments(initial.attachments ?? []);
    setPendingFiles([]);
    setError('');
  }, [initial, draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || initial.readOnly || form.id) return;
    saveFormDraft(draftStorageKey, form);
  }, [form, draftStorageKey, initial.readOnly, form.id]);

  const ensurePayableForAttachments = async () => {
    if (form.id) return form.id;
    if (!createEntry) {
      throw new Error('Salve o lançamento antes de anexar arquivos.');
    }
    if (!form.description?.trim()) {
      throw new Error('Informe a descrição antes de colar anexos.');
    }
    if (!form.amount || normalizeFormAmount(form.amount) <= 0) {
      throw new Error('Informe o valor antes de colar anexos.');
    }
    if (!form.dueDate) {
      throw new Error('Informe o vencimento antes de colar anexos.');
    }
    if (!form.costCenterId) {
      throw new Error('Selecione o centro de custo antes de colar anexos.');
    }
    if (accountPlanKind && !form.accountPlanId) {
      throw new Error('Selecione o plano de conta antes de colar anexos.');
    }
    if (enablePayerSelect) {
      if (!form.payerKind && !form.payerRefId && !form.counterpartName?.trim()) {
        throw new Error('Informe o pagador antes de colar anexos.');
      }
    } else if (!form.supplierId && !form.counterpartName?.trim()) {
      throw new Error('Informe o fornecedor antes de colar anexos.');
    }

    const created = await createEntry({
      ...buildPayload(form),
    });

    setForm((current) => ({ ...current, id: created.id }));
    setAttachments(created.attachments ?? []);
    if (draftStorageKey) clearFormDraft(draftStorageKey);
    return created.id;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      validateAmount(form);
      validateReimbursement(form, enableReimbursement);
      validateRecurrence(form, enableRecurrence);
      if (enablePayerSelect && !form.payerKind && !form.counterpartName?.trim()) {
        throw new Error('Informe o pagador.');
      }
      await onSubmit(form, { pendingFiles, attachments, setAttachments });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const readOnly = Boolean(form.readOnly);
  const isCreating = !form.id;
  const recurrenceActive = enableRecurrence && isCreating && Boolean(form.enableRecurrence);
  const canGenerateReimbursement =
    enableReimbursement &&
    !readOnly &&
    !form.reimbursementPayableId &&
    !form.reimbursementSourcePayableId &&
    !recurrenceActive;

  return (
    <div className="page-stack">
      <PageHeader breadcrumbs={breadcrumbs} title={title} subtitle={subtitle} />
      <CrudAlerts error={error} />
      {draftRestored ? (
        <p className="muted" style={{ margin: 0 }}>
          Rascunho restaurado automaticamente. Os dados são salvos localmente enquanto você preenche.
        </p>
      ) : null}
      <section className="panel">
        <div className="panel-header">
          <h2>Dados do lançamento</h2>
        </div>
        <div className="panel-body">
          {readOnly && form.status ? (
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <div>
                <span className="muted">Status</span>
                <div>
                  <span className={statusClass(form.status)}>{statusLabel(form.status)}</span>
                </div>
              </div>
              {form.settledAt ? (
                <div>
                  <span className="muted">Baixa em</span>
                  <div>{formatDateTime(form.settledAt)}</div>
                </div>
              ) : form.expectedSettledAt ? (
                <div>
                  <span className="muted">Previsão de baixa</span>
                  <div>{formatDate(form.expectedSettledAt)}</div>
                </div>
              ) : null}
              {form.recurrenceTotal > 1 ? (
                <div>
                  <span className="muted">Série mensal</span>
                  <div>
                    Parcela {form.recurrenceIndex} de {form.recurrenceTotal}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {readOnly && enableReimbursement && form.reimbursementPayable ? (
            <div className="payable-reimbursement-info">
              <span className="muted">Reembolso gerado</span>
              <div className="payable-reimbursement-info-body">
                <div>
                  <strong>{form.reimbursementPayable.description}</strong>
                  <div className="table-sub">
                    {form.reimbursementPayable.counterpartName} · {formatMoney(form.reimbursementPayable.amount)} ·{' '}
                    <span className={statusClass(form.reimbursementPayable.status)}>
                      {statusLabel(form.reimbursementPayable.status)}
                    </span>
                  </div>
                </div>
                {onViewLinkedEntry ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onViewLinkedEntry(form.reimbursementPayable.id)}
                  >
                    Ver reembolso
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {readOnly && enableReimbursement && form.reimbursementSourcePayable ? (
            <div className="payable-reimbursement-info">
              <span className="muted">Reembolso vinculado ao lançamento</span>
              <div className="payable-reimbursement-info-body">
                <div>
                  <strong>{form.reimbursementSourcePayable.description}</strong>
                  <div className="table-sub">
                    {formatMoney(form.reimbursementSourcePayable.amount)} ·{' '}
                    <span className={statusClass(form.reimbursementSourcePayable.status)}>
                      {statusLabel(form.reimbursementSourcePayable.status)}
                    </span>
                  </div>
                </div>
                {onViewLinkedEntry ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onViewLinkedEntry(form.reimbursementSourcePayable.id)}
                  >
                    Ver lançamento original
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <form className="form-grid" onSubmit={submit}>
            <label className="field-span-2">
              <span>Descrição</span>
              <input
                className="input"
                value={form.description}
                onChange={(ev) => setForm({ ...form, description: ev.target.value })}
                required
                disabled={readOnly}
              />
            </label>
            <CurrencyBrlInput
              id="cash-entry-amount"
              label="Valor (R$)"
              value={normalizeFormAmount(form.amount)}
              min={0}
              max={99_999_999.99}
              disabled={readOnly}
              onChange={(value) => setForm({ ...form, amount: value })}
            />
            <label>
              <span>Vencimento</span>
              <input
                className="input"
                type="date"
                value={form.dueDate}
                onChange={(ev) => setForm({ ...form, dueDate: ev.target.value })}
                required
                disabled={readOnly}
              />
            </label>
            {form.status !== 'settled' ? (
              <label>
                <span>Previsão de baixa</span>
                <input
                  className="input"
                  type="date"
                  value={form.expectedSettledAt}
                  onChange={(ev) => setForm({ ...form, expectedSettledAt: ev.target.value })}
                  disabled={readOnly}
                />
              </label>
            ) : null}
            <label>
              <span>Centro de custo</span>
              <CostCenterSelect
                value={form.costCenterId}
                onChange={(value) => setForm({ ...form, costCenterId: value })}
                disabled={readOnly}
              />
            </label>
            <label>
              <span>{counterpartLabel}</span>
              {enableSupplierSelect ? (
                <SupplierSelect
                  value={form.supplierId}
                  counterpartName={form.counterpartName}
                  onValueChange={({ supplierId, counterpartName }) =>
                    setForm((current) => ({
                      ...current,
                      supplierId: supplierId ?? '',
                      counterpartName: counterpartName ?? '',
                    }))
                  }
                  disabled={readOnly}
                />
              ) : enablePayerSelect ? (
                <PayerSelect
                  payerKind={form.payerKind}
                  payerRefId={form.payerRefId}
                  counterpartName={form.counterpartName}
                  onValueChange={({ payerKind, payerRefId, counterpartName }) =>
                    setForm((current) => ({
                      ...current,
                      payerKind: payerKind ?? '',
                      payerRefId: payerRefId ?? '',
                      counterpartName: counterpartName ?? '',
                    }))
                  }
                  disabled={readOnly}
                />
              ) : (
                <input
                  className="input"
                  value={form.counterpartName}
                  onChange={(ev) => setForm({ ...form, counterpartName: ev.target.value })}
                  required
                  disabled={readOnly}
                />
              )}
            </label>
            <label>
              <span>{accountPlanKind ? 'Plano de conta' : 'Categoria'}</span>
              {accountPlanKind ? (
                <AccountPlanSelect
                  value={form.accountPlanId}
                  onChange={(value) => setForm({ ...form, accountPlanId: value })}
                  kind={accountPlanKind}
                  disabled={readOnly}
                />
              ) : (
                <input
                  className="input"
                  value={form.category}
                  onChange={(ev) => setForm({ ...form, category: ev.target.value })}
                  disabled={readOnly}
                />
              )}
            </label>
            <label className="field-span-2">
              <span>Observações</span>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
                disabled={readOnly}
              />
            </label>
            {enableAttachments && !readOnly && (form.settledAtLocal || form.status === 'settled') ? (
              <label>
                <span>Data/hora da baixa</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.settledAtLocal}
                  onChange={(ev) => setForm({ ...form, settledAtLocal: ev.target.value })}
                />
              </label>
            ) : null}
            {enableAttachments && !recurrenceActive ? (
              <PayableAttachmentsField
                payableId={form.id}
                attachments={attachments}
                pendingFiles={pendingFiles}
                onAttachmentsChange={setAttachments}
                onPendingFilesChange={setPendingFiles}
                onUpload={uploadAttachments}
                onDelete={deleteAttachment}
                ensurePayable={createEntry ? ensurePayableForAttachments : undefined}
                onUploadBusyChange={setAttachmentUploadBusy}
                onPayableUpdated={(payable) => {
                  setForm((current) => syncPayableFormState(current, payable));
                }}
                allowPaymentReceiptWhenReadOnly={readOnly && Boolean(form.id)}
                readOnly={readOnly}
                disabled={busy}
                flowDirection={attachmentFlow}
              />
            ) : null}
            {recurrenceActive ? (
              <p className="field-hint field-span-full">
                Anexos ficam disponíveis após criar a série, em cada lançamento individualmente.
              </p>
            ) : null}
            {enableRecurrence && isCreating && !readOnly ? (
              <div className="field-span-full payable-recurrence-panel">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(form.enableRecurrence)}
                    onChange={(ev) =>
                      setForm((current) => ({
                        ...current,
                        enableRecurrence: ev.target.checked,
                        ...(ev.target.checked
                          ? { generateReimbursement: false, reimbursementSupplierId: '', reimbursementCounterpartName: '' }
                          : {}),
                      }))
                    }
                  />
                  Gerar série mensal
                </label>
                <p className="field-hint">
                  Cria vários lançamentos com o mesmo valor, incrementando vencimento e previsão de baixa mês a mês.
                </p>
                {form.enableRecurrence ? (
                  <label>
                    <span>Quantidade de meses</span>
                    <input
                      className="input"
                      type="number"
                      min="2"
                      max="60"
                      step="1"
                      value={form.recurrenceMonths}
                      onChange={(ev) => setForm({ ...form, recurrenceMonths: ev.target.value })}
                      required
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
            {canGenerateReimbursement ? (
              <div className="field-span-full payable-reimbursement-panel">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={Boolean(form.generateReimbursement)}
                    onChange={(ev) =>
                      setForm((current) => ({
                        ...current,
                        generateReimbursement: ev.target.checked,
                        ...(ev.target.checked
                          ? {}
                          : {
                              reimbursementSupplierId: '',
                              reimbursementCounterpartName: '',
                            }),
                      }))
                    }
                  />
                  Gerar reembolso
                </label>
                <p className="field-hint">
                  Cria um pagável pendente para reembolsar quem pagou pessoalmente por este custo do negócio.
                </p>
                {form.generateReimbursement ? (
                  <label>
                    <span>Reembolsar para</span>
                    <SupplierSelect
                      value={form.reimbursementSupplierId}
                      counterpartName={form.reimbursementCounterpartName}
                      onValueChange={({ supplierId, counterpartName }) =>
                        setForm((current) => ({
                          ...current,
                          reimbursementSupplierId: supplierId ?? '',
                          reimbursementCounterpartName: counterpartName ?? '',
                        }))
                      }
                      placeholder="Buscar beneficiário do reembolso…"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
            <div className="field-span-full form-actions">
              {readOnly ? (
                <CrudViewActions
                  onBack={onCancel}
                  onEdit={form.onEdit}
                  onDuplicate={onDuplicate}
                  editLabel="Editar lançamento"
                  extraActions={
                    extraActions ? (
                      <PermissionGate permission={permissionManage}>{extraActions}</PermissionGate>
                    ) : null
                  }
                />
              ) : (
                <CrudFormActions
                  busy={busy || attachmentUploadBusy}
                  busyLabel={attachmentUploadBusy && !busy ? 'Enviando anexo…' : 'Salvando…'}
                  onCancel={onCancel}
                  onDelete={onDelete}
                  showDelete={Boolean(onDelete)}
                  submitLabel={
                    recurrenceActive
                      ? `Criar ${form.recurrenceMonths} lançamentos`
                      : (form.submitLabel ?? 'Salvar')
                  }
                />
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export function CashEntryPage({
  title,
  subtitle,
  counterpartLabel,
  permissionView,
  permissionManage,
  fetchEntries,
  createEntry,
  updateEntry,
  cancelEntry,
  deleteEntry,
  settleEntry,
  enableAttachments = false,
  enableSupplierSelect = false,
  enablePayerSelect = false,
  enableReimbursement = false,
  enableRecurrence = false,
  attachmentFlow = 'outflow',
  buildPayload,
  defaultListHorizonDays = null,
  accountPlanKind,
  listStorageKey = null,
  draftStorageKey,
  uploadAttachments,
  deleteAttachment,
}) {
  const router = useCrudRouter();
  const resolvedBuildPayload = buildPayload ?? (enablePayerSelect ? buildReceivablePayload : buildPayablePayload);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const filterDefinitions = useMemo(
    () => [
      selectFilter('status', 'Status', 'status', [
        { value: 'open', label: statusLabel('open') },
        { value: 'settled', label: statusLabel('settled') },
        { value: 'cancelled', label: statusLabel('cancelled') },
      ]),
      dateFilter('dueDate', 'Vencimento', 'dueDate'),
    ],
    [],
  );

  const defaultFieldFilters = useMemo(
    () => (defaultListHorizonDays ? [buildDueDateHorizonFilter(defaultListHorizonDays)] : []),
    [defaultListHorizonDays],
  );

  const list = useCrudList(
    useMemo(
      () =>
        entries.map((entry) => ({
          ...entry,
          costCenterName: entry.costCenter
            ? `${entry.costCenter.code} — ${entry.costCenter.name}`
            : '',
          accountPlanName: accountPlanLabel(entry),
          hasPaymentReceipt: (entry.attachments ?? []).some(
            (attachment) => attachment.kind === 'payment_receipt',
          ),
          settledAtLabel: entry.settledAt ? formatDateTime(entry.settledAt) : '',
        })),
      [entries],
    ),
    {
      searchKeys: ['description', 'counterpartName', 'category', 'accountPlanName', 'costCenterName'],
      filterDefinitions,
      defaultFieldFilters,
      defaultSort: { key: 'dueDate', direction: 'asc' },
      storageKey: listStorageKey,
    },
  );

  const selected = useMemo(
    () => entries.find((entry) => entry.id === router.id) ?? null,
    [entries, router.id],
  );

  const duplicateSource = useMemo(
    () => entries.find((entry) => entry.id === router.duplicateId) ?? null,
    [entries, router.duplicateId],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await fetchEntries());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const canManage = Boolean(permissionManage);
  const createInitial = useMemo(
    () => ({ ...EMPTY_FORM, submitLabel: 'Salvar lançamento' }),
    [],
  );
  const canDeleteEntry = (entry) =>
    entry.status === 'cancelled' && Boolean(deleteEntry);
  const canCancel = (entry) =>
    entry.status !== 'settled' && entry.status !== 'cancelled' && cancelEntry;
  const canSettle = (entry) =>
    entry.status !== 'settled' && entry.status !== 'cancelled' && settleEntry;

  const handleCancel = async (entry) => {
    if (!cancelEntry) return;
    if (!(await confirmEntryCancel(entry.description))) return;
    setBusy(true);
    setError('');
    try {
      await cancelEntry(entry.id);
      setMessage('Lançamento cancelado.');
      await load();
      if (router.id === entry.id) router.goToList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (!deleteEntry) return;
    if (!(await confirmCrudDelete(entry.description))) return;
    setBusy(true);
    setError('');
    try {
      await deleteEntry(entry.id);
      setMessage('Lançamento excluído.');
      await load();
      if (router.id === entry.id) router.goToList();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRowDelete = async (entry) => {
    if (entry.status === 'cancelled') {
      await handleDeleteEntry(entry);
      return;
    }
    if (canCancel(entry)) {
      await handleCancel(entry);
    }
  };

  const canRemoveEntry = (entry) => canDeleteEntry(entry) || canCancel(entry);

  const handleSettle = async (entry) => {
    if (!settleEntry) return;
    setBusy(true);
    setError('');
    try {
      await settleEntry(entry.id);
      setMessage('Baixa registrada.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (router.isCreating) {
    if (router.duplicateId && !duplicateSource && loading) {
      return <AppLoadingPanel label="Carregando lançamento para duplicar…" />;
    }
    if (router.duplicateId && !duplicateSource) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Lançamento não encontrado para duplicação.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const duplicateInitial = duplicateSource ? buildDuplicateSeed(duplicateSource) : createInitial;

    return (
      <PermissionGate permission={permissionManage}>
        <CashEntryForm
          title={duplicateSource ? 'Duplicar lançamento' : 'Novo lançamento'}
          subtitle={
            duplicateSource
              ? `Cópia de ${duplicateSource.description}`
              : subtitle
          }
          breadcrumbs={[
            { label: title, onClick: router.goToList },
            { label: duplicateSource ? 'Duplicar' : 'Novo' },
          ]}
          counterpartLabel={counterpartLabel}
          permissionManage={permissionManage}
          accountPlanKind={accountPlanKind}
          draftStorageKey={duplicateSource ? null : draftStorageKey}
          initial={{ ...duplicateInitial, skipDraft: Boolean(duplicateSource) }}
          createEntry={createEntry}
          enableAttachments={enableAttachments}
          enableSupplierSelect={enableSupplierSelect}
          enablePayerSelect={enablePayerSelect}
          enableReimbursement={enableReimbursement}
          enableRecurrence={enableRecurrence}
          attachmentFlow={attachmentFlow}
          buildPayload={resolvedBuildPayload}
          onViewLinkedEntry={(entryId) => router.goToView(entryId)}
          uploadAttachments={uploadAttachments}
          deleteAttachment={deleteAttachment}
          onCancel={router.goToList}
          onSubmit={async (form, { pendingFiles }) => {
            if (form.id && updateEntry) {
              if (draftStorageKey) clearFormDraft(draftStorageKey);
              const updated = await updateEntry(form.id, resolvedBuildPayload(form));
              await uploadPendingPayableAttachments(uploadAttachments, form.id, pendingFiles);
              setMessage(
                updated.reimbursementPayable
                  ? 'Lançamento salvo. Reembolso pendente gerado.'
                  : pendingFiles.some((item) => item.kind === 'payment_receipt')
                    ? 'Lançamento salvo. Comprovante registrado com baixa.'
                    : 'Lançamento salvo.',
              );
              router.goToView(form.id);
              await load();
              return;
            }

            const created = await createEntry(resolvedBuildPayload(form));
            if (draftStorageKey) clearFormDraft(draftStorageKey);
            if (!form.enableRecurrence || Number(form.recurrenceMonths) < 2) {
              await uploadPendingPayableAttachments(uploadAttachments, created.id, pendingFiles);
            }
            setMessage(
              created.seriesCount > 1
                ? `${created.seriesCount} lançamentos mensais criados.`
                : duplicateSource
                  ? 'Lançamento duplicado.'
                  : created.reimbursementPayable
                    ? 'Lançamento criado. Reembolso pendente gerado.'
                    : pendingFiles.some((item) => item.kind === 'payment_receipt')
                      ? 'Lançamento criado. Comprovante registrado com baixa.'
                      : 'Lançamento criado.',
            );
            router.goToList();
            await load();
          }}
        />
      </PermissionGate>
    );
  }

  if (router.isViewing || router.isEditing) {
    if (!selected && loading) return <AppLoadingPanel label="Carregando lançamento…" />;
    if (!selected) {
      return (
        <div className="page-stack">
          <CrudAlerts error={error || 'Lançamento não encontrado.'} />
          <button type="button" className="btn-ghost" onClick={router.goToList}>
            Voltar para lista
          </button>
        </div>
      );
    }

    const settleButton =
      canSettle(selected) && router.isViewing ? (
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={() => handleSettle(selected)}
        >
          Registrar baixa
        </button>
      ) : null;

    return (
      <CashEntryForm
        title={router.isViewing ? selected.description : 'Editar lançamento'}
        subtitle={`${counterpartLabel}: ${selected.counterpartName}`}
        breadcrumbs={[{ label: title, onClick: router.goToList }, { label: selected.description }]}
        counterpartLabel={counterpartLabel}
        permissionManage={permissionManage}
        accountPlanKind={accountPlanKind}
        initial={{
          ...entryToForm(selected),
          id: selected.id,
          attachments: selected.attachments ?? [],
          readOnly: router.isViewing,
          status: selected.status,
          settledAt: selected.settledAt,
          recurrenceIndex: selected.recurrenceIndex,
          recurrenceTotal: selected.recurrenceTotal,
          reimbursementPayableId: selected.reimbursementPayableId,
          reimbursementSourcePayableId: selected.reimbursementSourcePayableId,
          reimbursementPayable: selected.reimbursementPayable,
          reimbursementSourcePayable: selected.reimbursementSourcePayable,
          onEdit:
            canManage && canCancel(selected) ? () => router.goToEdit(selected.id) : undefined,
          submitLabel: 'Salvar alterações',
        }}
        enableAttachments={enableAttachments}
        enableSupplierSelect={enableSupplierSelect}
        enablePayerSelect={enablePayerSelect}
        enableReimbursement={enableReimbursement}
        enableRecurrence={enableRecurrence}
        attachmentFlow={attachmentFlow}
        buildPayload={resolvedBuildPayload}
        onViewLinkedEntry={(entryId) => router.goToView(entryId)}
        uploadAttachments={uploadAttachments}
        deleteAttachment={deleteAttachment}
        onCancel={router.goToList}
        onDuplicate={canManage ? () => router.goToDuplicate(selected.id) : undefined}
        extraActions={settleButton}
        onDelete={
          canManage && (canCancel(selected) || canDeleteEntry(selected))
            ? () => (canDeleteEntry(selected) ? handleDeleteEntry(selected) : handleCancel(selected))
            : undefined
        }
        onSubmit={async (form, { pendingFiles, setAttachments }) => {
          if (router.isViewing || !updateEntry) return;
          const updated = await updateEntry(selected.id, resolvedBuildPayload(form));
          const uploaded = await uploadPendingPayableAttachments(
            uploadAttachments,
            selected.id,
            pendingFiles,
          );
          setAttachments((uploaded ?? updated).attachments ?? []);
          setMessage(
            updated.reimbursementPayable
              ? 'Lançamento atualizado. Reembolso pendente gerado.'
              : pendingFiles.some((item) => item.kind === 'payment_receipt')
                ? 'Lançamento atualizado. Comprovante registrado com baixa.'
                : 'Lançamento atualizado.',
          );
          router.goToView(selected.id);
          await load();
        }}
      />
    );
  }

  return (
    <PermissionGate permission={permissionView}>
      <CrudListShell
        title={title}
        subtitle={subtitle}
        addLabel="Adicionar lançamento"
        onAdd={canManage ? router.goToCreate : undefined}
        canAdd={canManage}
        loading={loading}
        error={error}
        message={message}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por descrição, contraparte ou plano de conta"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'dueDate', direction: 'desc', label: 'Vencimento (recente)' },
          { key: 'dueDate', direction: 'asc', label: 'Vencimento (antigo)' },
          { key: 'expectedSettledAt', direction: 'asc', label: 'Previsão baixa (próxima)' },
          { key: 'expectedSettledAt', direction: 'desc', label: 'Previsão baixa (distante)' },
          { key: 'amount', direction: 'desc', label: 'Valor (maior)' },
          { key: 'description', direction: 'asc', label: 'Descrição (A–Z)' },
        ]}
        filterDefinitions={filterDefinitions}
        fieldFilters={list.fieldFilters}
        onApplyFieldFilter={list.applyFieldFilter}
        onRemoveFieldFilter={list.removeFieldFilter}
        onClearFieldFilters={list.clearFieldFilters}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        panelTitle="Lançamentos"
        emptyMessage="Nenhum lançamento encontrado."
        tableClassName="data-table-cash-entries"
        columns={[
          {
            key: 'description',
            label: 'Lançamento',
            render: (row) => (
              <CashEntryListTitle
                row={row}
                enableReimbursement={enableReimbursement}
                enableAttachments={enableAttachments}
              />
            ),
          },
          {
            key: 'dates',
            label: 'Datas',
            render: (row) => <CashEntryDatesCell row={row} />,
          },
          {
            key: 'amount',
            label: 'Valor',
            render: (row) => <span className="cash-entry-amount">{formatMoney(row.amount)}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
            ),
          },
        ]}
        rows={list.rows}
        onView={(row) => router.goToView(row.id)}
        onEdit={
          canManage && updateEntry
            ? (row) => {
                if (canCancel(row)) router.goToEdit(row.id);
              }
            : undefined
        }
        onDuplicate={canManage ? (row) => router.goToDuplicate(row.id) : undefined}
        onDelete={canManage ? handleRowDelete : undefined}
        canDeleteRow={canRemoveEntry}
        canManage={canManage}
      />
    </PermissionGate>
  );
}
