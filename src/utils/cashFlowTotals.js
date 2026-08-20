function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function summarizeCashFlowEntries(entries) {
  const months = new Map();
  let count = 0;
  let totalInflow = 0;
  let totalOutflow = 0;
  let settledInflow = 0;
  let settledOutflow = 0;
  let pendingInflow = 0;
  let pendingOutflow = 0;

  for (const entry of entries) {
    if (entry.status === 'cancelled') continue;

    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) continue;

    count += 1;
    const isInflow = entry.direction === 'inflow';
    const isSettled = entry.status === 'settled';

    if (isInflow) {
      totalInflow += amount;
      if (isSettled) settledInflow += amount;
      else pendingInflow += amount;
    } else {
      totalOutflow += amount;
      if (isSettled) settledOutflow += amount;
      else pendingOutflow += amount;
    }

    const monthKey = String(entry.dueDate ?? '').slice(0, 7);
    if (monthKey.length === 7) {
      const bucket = months.get(monthKey) ?? { inflow: 0, outflow: 0, count: 0 };
      bucket.count += 1;
      if (isInflow) bucket.inflow += amount;
      else bucket.outflow += amount;
      months.set(monthKey, bucket);
    }
  }

  const monthly = [...months.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, data]) => ({
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      inflow: data.inflow,
      outflow: data.outflow,
      result: data.inflow - data.outflow,
      count: data.count,
    }));

  return {
    count,
    totalInflow,
    totalOutflow,
    result: totalInflow - totalOutflow,
    settledInflow,
    settledOutflow,
    settledResult: settledInflow - settledOutflow,
    pendingInflow,
    pendingOutflow,
    pendingResult: pendingInflow - pendingOutflow,
    monthly,
  };
}
