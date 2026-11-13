const SPREADSHEET_SOURCES = new Set(['acaf_associates_xlsx', 'associates_xlsx']);

export function unitCadastralMode(unit) {
  const source = unit?.acafAssociate?.importSource;
  if (source && SPREADSHEET_SOURCES.has(source)) return 'spreadsheet';
  if (source === 'admin_manual') return 'manual';
  return 'new';
}

export function acafAssociateFormFromUnit(unit) {
  const mode = unitCadastralMode(unit);
  const a = unit?.acafAssociate;
  return {
    cadastralMode: mode,
    cnpj: a?.cnpj ? formatCnpjInput(a.cnpj) : '',
    associationId: a?.associationId ?? '',
    legalName: a?.legalName ?? '',
    association: a?.association ?? '',
    signedAt: a?.signedAt ?? '',
    contactEmail: a?.contactEmail ?? '',
    contactPhone: a?.contactPhone ?? '',
    complement: a?.complement ?? '',
    listed: a ? a.listed !== false : true,
  };
}

function formatCnpjInput(digits) {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function normalizeCnpjInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 14);
  return formatCnpjInput(digits);
}

export function normalizePhoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function payloadFromAcafForm(acaf) {
  if (!acaf) return undefined;
  const payload = {
    associationId: acaf.associationId?.trim() || null,
    legalName: acaf.legalName.trim(),
    association: acaf.association.trim(),
    signedAt: acaf.signedAt,
    contactEmail: acaf.contactEmail.trim().toLowerCase(),
    contactPhone: normalizePhoneDigits(acaf.contactPhone) || undefined,
    complement: acaf.complement.trim() || undefined,
    listed: Boolean(acaf.listed),
  };
  if (acaf.cadastralMode !== 'spreadsheet') {
    const digits = String(acaf.cnpj ?? '').replace(/\D/g, '');
    if (digits) payload.cnpj = digits;
  }
  return payload;
}
