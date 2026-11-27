/**
 * CNPJs das unidades agrupados por rede (somente dígitos, únicos).
 * @param {Array<{ networkId: string, acafAssociate?: { cnpj?: string } }>} units
 */
export function unitCnpjDigitsByNetworkId(units) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  for (const unit of units ?? []) {
    const networkId = unit?.networkId;
    if (!networkId) continue;
    const digits = String(unit?.acafAssociate?.cnpj ?? '').replace(/\D/g, '');
    if (!digits) continue;
    let set = map.get(networkId);
    if (!set) {
      set = new Set();
      map.set(networkId, set);
    }
    set.add(digits);
  }
  return map;
}

/**
 * Anexa `_unitCnpjDigits` a cada rede para busca por CNPJ na listagem.
 */
export function unitLegalNamesByNetworkId(units) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  for (const unit of units ?? []) {
    const networkId = unit?.networkId;
    if (!networkId) continue;
    const legalName = String(unit?.acafAssociate?.legalName ?? '').trim();
    if (!legalName) continue;
    let set = map.get(networkId);
    if (!set) {
      set = new Set();
      map.set(networkId, set);
    }
    set.add(legalName);
  }
  return map;
}

export function enrichNetworksWithUnitCnpjs(networks, units) {
  const byNetwork = unitCnpjDigitsByNetworkId(units);
  const legalByNetwork = unitLegalNamesByNetworkId(units);
  return (networks ?? []).map((network) => ({
    ...network,
    _unitCnpjDigits: [...(byNetwork.get(network.id) ?? [])],
    _unitLegalNames: [...(legalByNetwork.get(network.id) ?? [])],
  }));
}

/**
 * @param {{
 *   name?: string,
 *   partnerContactName?: string | null,
 *   partnerContactEmail?: string | null,
 *   onboardingInviteEmail?: string | null,
 *   cnpj?: string | null,
 *   _unitCnpjDigits?: string[],
 *   _unitLegalNames?: string[],
 * }} row
 */
export function networkMatchesNameOrCnpj(row, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim();
  if (!trimmed) return true;

  const lower = trimmed.toLowerCase();
  const textFields = [
    row.name,
    row.partnerContactName,
    row.partnerContactEmail,
    row.onboardingInviteEmail,
    ...(row._unitLegalNames ?? []),
  ];
  if (textFields.some((value) => String(value ?? '').toLowerCase().includes(lower))) {
    return true;
  }

  const qDigits = trimmed.replace(/\D/g, '');
  if (!qDigits) return false;

  const unitCnps = row._unitCnpjDigits ?? [];
  if (unitCnps.some((d) => d.includes(qDigits))) {
    return true;
  }

  const legacyNetworkCnpj = String(row.cnpj ?? '').replace(/\D/g, '');
  return legacyNetworkCnpj.includes(qDigits);
}