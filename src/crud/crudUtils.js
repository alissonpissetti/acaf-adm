import { appConfirm } from '../components/confirm/appConfirm.js';

export async function confirmCrudDelete(label) {
  return appConfirm({
    title: 'Excluir registro',
    message: `Excluir "${label}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  });
}

export async function confirmEntryCancel(label) {
  return appConfirm({
    title: 'Cancelar lançamento',
    message: `Cancelar "${label}"? O lançamento ficará com status cancelado e poderá ser excluído depois.`,
    confirmLabel: 'Cancelar lançamento',
    cancelLabel: 'Voltar',
    tone: 'danger',
  });
}

export function inactiveLabel(active) {
  return active ? 'Ativo' : 'Inativo';
}

export function inactiveBadgeClass(active) {
  return active ? 'badge badge-success' : 'badge badge-muted';
}
