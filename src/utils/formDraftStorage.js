const DRAFT_FIELDS = [
  'description',
  'amount',
  'dueDate',
  'expectedSettledAt',
  'costCenterId',
  'supplierId',
  'counterpartName',
  'accountPlanId',
  'category',
  'notes',
  'generateReimbursement',
  'reimbursementSupplierId',
  'reimbursementCounterpartName',
  'enableRecurrence',
  'recurrenceMonths',
];

export const FINANCE_DRAFT_KEYS = {
  payable: 'acaf.finance.payables.create-draft',
  receivable: 'acaf.finance.receivables.create-draft',
};

function pickDraftFields(form) {
  return DRAFT_FIELDS.reduce((acc, key) => {
    if (key === 'generateReimbursement') {
      acc[key] = Boolean(form?.[key]);
      return acc;
    }
    if (key === 'enableRecurrence') {
      acc[key] = Boolean(form?.[key]);
      return acc;
    }
    if (key === 'amount') {
      const value = Number(form?.[key]);
      acc[key] = Number.isFinite(value) ? value : 0;
      return acc;
    }
    acc[key] = form?.[key] ?? '';
    return acc;
  }, {});
}

function hasDraftContent(draft) {
  if (draft.generateReimbursement || draft.enableRecurrence) return true;
  return DRAFT_FIELDS.some((key) => String(draft[key] ?? '').trim() !== '');
}

export function loadFormDraft(storageKey) {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const draft = pickDraftFields(parsed);
    return hasDraftContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveFormDraft(storageKey, form) {
  if (!storageKey) return;
  const draft = pickDraftFields(form);
  if (!hasDraftContent(draft)) {
    localStorage.removeItem(storageKey);
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(draft));
}

export function clearFormDraft(storageKey) {
  if (!storageKey) return;
  localStorage.removeItem(storageKey);
}
