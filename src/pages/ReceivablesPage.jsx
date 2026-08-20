import {
  createReceivable,
  deleteReceivable,
  deleteReceivableAttachment,
  fetchReceivables,
  settleReceivable,
  updateReceivable,
  uploadReceivableAttachments,
} from '../api/finance.js';
import { CashEntryPage } from '../components/CashEntryPage.jsx';
import { FINANCE_DRAFT_KEYS } from '../utils/formDraftStorage.js';
import { LIST_PREFERENCE_KEYS } from '../utils/listPreferencesStorage.js';

export function ReceivablesPage() {
  return (
    <CashEntryPage
      title="Contas a Receber"
      subtitle="Lançamentos de entradas com pagador vinculado a clientes, empresas ou parceiros"
      counterpartLabel="Pagador / Cliente"
      permissionView="financeiro.contas-receber"
      permissionManage="financeiro.contas-receber.manage"
      accountPlanKind="revenue"
      draftStorageKey={FINANCE_DRAFT_KEYS.receivable}
      fetchEntries={fetchReceivables}
      createEntry={createReceivable}
      updateEntry={updateReceivable}
      cancelEntry={(id) => updateReceivable(id, { status: 'cancelled' })}
      deleteEntry={deleteReceivable}
      settleEntry={settleReceivable}
      enableAttachments
      enablePayerSelect
      enableRecurrence
      attachmentFlow="inflow"
      defaultListHorizonDays={30}
      listStorageKey={LIST_PREFERENCE_KEYS.receivables}
      uploadAttachments={uploadReceivableAttachments}
      deleteAttachment={deleteReceivableAttachment}
    />
  );
}
