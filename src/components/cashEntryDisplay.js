export function costCenterDisplayName(row) {
  if (row.costCenter?.name) return row.costCenter.name;
  if (row.costCenterName) {
    const parts = row.costCenterName.split(' — ');
    return parts.length > 1 ? parts.slice(1).join(' — ').trim() : row.costCenterName.trim();
  }
  return '';
}

export function accountPlanDisplayName(row) {
  if (row.accountPlan?.name) return row.accountPlan.name;
  if (row.accountPlanName) {
    const parts = row.accountPlanName.split(' — ');
    return parts.length > 1 ? parts.slice(1).join(' — ').trim() : row.accountPlanName.trim();
  }
  return row.category ?? '';
}

export function cashEntryMetaLine(row) {
  const parts = [];
  if (row.counterpartName) parts.push(row.counterpartName);
  const costCenterName = costCenterDisplayName(row);
  if (costCenterName) parts.push(costCenterName);
  const accountPlanName = accountPlanDisplayName(row);
  if (accountPlanName) parts.push(accountPlanName);
  return parts.join(' · ');
}
