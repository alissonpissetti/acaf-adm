import { useEffect, useMemo, useState } from 'react';
import { fetchAccountPlanOptions } from '../api/finance.js';
import { FinanceLookupSelect } from './FinanceLookupSelect.jsx';

function sortByCode(rows) {
  return [...rows].sort((a, b) =>
    String(a.code ?? '').localeCompare(String(b.code ?? ''), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

export function AccountPlanSelect({
  value,
  onChange,
  kind,
  required = true,
  disabled = false,
  placeholder,
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountPlanOptions(kind)
      .then((rows) => setOptions(sortByCode(rows)))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [kind]);

  const searchPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (kind === 'expense') return 'Buscar plano de despesa…';
    if (kind === 'revenue') return 'Buscar plano de receita…';
    return 'Buscar plano de conta…';
  }, [kind, placeholder]);

  const emptyLabel = useMemo(() => {
    if (kind === 'expense') return 'Nenhum plano de despesa encontrado.';
    if (kind === 'revenue') return 'Nenhum plano de receita encontrado.';
    return 'Nenhum plano de conta encontrado.';
  }, [kind]);

  return (
    <FinanceLookupSelect
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      disabled={disabled}
      required={required}
      placeholder={searchPlaceholder}
      loadingPlaceholder="Carregando planos de conta…"
      emptyLabel={emptyLabel}
      listboxId={`account-plan-lookup-${kind ?? 'all'}`}
      getOptionValue={(option) => option.id}
      getOptionTitle={(option) => `${option.code} — ${option.name}`}
      getOptionMeta={(option) =>
        kind === 'expense'
          ? 'Plano de despesa'
          : kind === 'revenue'
            ? 'Plano de receita'
            : 'Plano de conta'
      }
    />
  );
}
