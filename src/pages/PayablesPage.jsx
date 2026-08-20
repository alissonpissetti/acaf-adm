import {
  createPayable,
  deletePayable,
  deletePayableAttachment,
  fetchPayables,
  settlePayable,
  updatePayable,
  uploadPayableAttachments,
} from '../api/finance.js';
import { CashEntryPage } from '../components/CashEntryPage.jsx';
import { FINANCE_DRAFT_KEYS } from '../utils/formDraftStorage.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';

export function PayablesPage() {
  return (
    <CashEntryPage
      title="Contas a Pagar"
      subtitle="Lançamentos de saídas do departamento financeiro"
      counterpartLabel="Fornecedor"
      permissionView="financeiro.contas-pagar"
      permissionManage="financeiro.contas-pagar.manage"
      accountPlanKind="expense"
      draftStorageKey={FINANCE_DRAFT_KEYS.payable}
      fetchEntries={fetchPayables}
      createEntry={createPayable}
      updateEntry={updatePayable}
      cancelEntry={(id) => updatePayable(id, { status: 'cancelled' })}
      deleteEntry={deletePayable}
      settleEntry={settlePayable}
      enableAttachments
      enableSupplierSelect
      enableReimbursement
      enableRecurrence
      defaultListHorizonDays={30}
      listStorageKey={LIST_PREFERENCE_KEYS.payables}
      uploadAttachments={uploadPayableAttachments}
      deleteAttachment={deletePayableAttachment}
    />
  );
}
