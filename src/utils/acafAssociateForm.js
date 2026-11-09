export function acafAssociateFormFromUnit(unit) {
  const a = unit?.acafAssociate;
  if (!a || a.importSource !== 'acaf_associates_xlsx') return null;
  return {
    legalName: a.legalName ?? '',
    association: a.association ?? '',
    signedAt: a.signedAt ?? '',
    contactEmail: a.contactEmail ?? '',
    contactPhone: a.contactPhone ?? '',
    complement: a.complement ?? '',
    listed: a.listed !== false,
  };
}

export function normalizePhoneDigits(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

export function payloadFromAcafForm(acaf) {
  if (!acaf) return undefined;
  return {
    legalName: acaf.legalName.trim(),
    association: acaf.association.trim(),
    signedAt: acaf.signedAt,
    contactEmail: acaf.contactEmail.trim().toLowerCase(),
    contactPhone: normalizePhoneDigits(acaf.contactPhone) || undefined,
    complement: acaf.complement.trim() || undefined,
    listed: Boolean(acaf.listed),
  };
}
