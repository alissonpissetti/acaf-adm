import { fetchApi, fetchApiUpload } from './client.js';

export function fetchCostCenters() {
  return fetchApi('/api/admin/finance/cost-centers');
}

export function createCostCenter(body) {
  return fetchApi('/api/admin/finance/cost-centers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchSuppliers() {
  return fetchApi('/api/admin/finance/suppliers');
}

export function fetchSupplierOptions() {
  return fetchApi('/api/admin/finance/suppliers/options');
}

export function createSupplier(body) {
  return fetchApi('/api/admin/finance/suppliers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSupplier(id, body) {
  return fetchApi(`/api/admin/finance/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function updateCostCenter(id, body) {
  return fetchApi(`/api/admin/finance/cost-centers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchAccountPlans(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/api/admin/finance/account-plans${query ? `?${query}` : ''}`);
}

export function fetchAccountPlanOptions(kind) {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  return fetchApi(`/api/admin/finance/account-plans/options${query}`);
}

export function createAccountPlan(body) {
  return fetchApi('/api/admin/finance/account-plans', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateAccountPlan(id, body) {
  return fetchApi(`/api/admin/finance/account-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function fetchPayables(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/api/admin/finance/payables${query ? `?${query}` : ''}`);
}

export function createPayable(body) {
  return fetchApi('/api/admin/finance/payables', { method: 'POST', body: JSON.stringify(body) });
}

export function updatePayable(id, body) {
  return fetchApi(`/api/admin/finance/payables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deletePayable(id) {
  return fetchApi(`/api/admin/finance/payables/${id}`, {
    method: 'DELETE',
  });
}

export function settlePayable(id, settledAt) {
  return fetchApi(`/api/admin/finance/payables/${id}/settle`, {
    method: 'PATCH',
    body: JSON.stringify({ settledAt }),
  });
}

export function uploadPayableAttachments(id, files, options = {}) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('attachments', file);
  }
  if (options.kind) formData.append('kind', options.kind);
  if (options.settledAt) formData.append('settledAt', options.settledAt);
  return fetchApiUpload(`/api/admin/finance/payables/${id}/attachments`, formData);
}

export function deletePayableAttachment(id, attachmentId) {
  return fetchApi(`/api/admin/finance/payables/${id}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

export function fetchReceivables(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/api/admin/finance/receivables${query ? `?${query}` : ''}`);
}

export function createReceivable(body) {
  return fetchApi('/api/admin/finance/receivables', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateReceivable(id, body) {
  return fetchApi(`/api/admin/finance/receivables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteReceivable(id) {
  return fetchApi(`/api/admin/finance/receivables/${id}`, {
    method: 'DELETE',
  });
}

export function settleReceivable(id, settledAt) {
  return fetchApi(`/api/admin/finance/receivables/${id}/settle`, {
    method: 'PATCH',
    body: JSON.stringify({ settledAt }),
  });
}

export function fetchPayerOptions() {
  return fetchApi('/api/admin/finance/payers/options');
}

export function uploadReceivableAttachments(id, files, options = {}) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('attachments', file);
  }
  if (options.kind) formData.append('kind', options.kind);
  if (options.settledAt) formData.append('settledAt', options.settledAt);
  return fetchApiUpload(`/api/admin/finance/receivables/${id}/attachments`, formData);
}

export function deleteReceivableAttachment(id, attachmentId) {
  return fetchApi(`/api/admin/finance/receivables/${id}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

export function fetchCashFlow(params = {}) {
  const query = new URLSearchParams(params).toString();
  return fetchApi(`/api/admin/finance/cash-flow${query ? `?${query}` : ''}`);
}
