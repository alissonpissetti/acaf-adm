import { useEffect, useState } from 'react';
import { fetchCostCenters } from '../api/finance.js';
import { FinanceLookupSelect } from './FinanceLookupSelect.jsx';

function sortByName(rows) {
  return [...rows].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR', {
      sensitivity: 'base',
    }),
  );
}

export function CostCenterSelect({ value, onChange, required = true, disabled = false }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostCenters()
      .then((rows) => setOptions(sortByName(rows.filter((row) => row.active !== false))))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <FinanceLookupSelect
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      disabled={disabled}
      required={required}
      placeholder="Buscar centro de custo…"
      loadingPlaceholder="Carregando centros de custo…"
      emptyLabel="Nenhum centro de custo encontrado."
      listboxId="cost-center-lookup-listbox"
      getOptionValue={(option) => option.id}
      getOptionTitle={(option) => `${option.code} — ${option.name}`}
      getOptionMeta={(option) => `Código ${option.code}`}
    />
  );
}
