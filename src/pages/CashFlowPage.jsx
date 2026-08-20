import { useEffect, useMemo, useState } from 'react';
import { fetchCashFlow } from '../api/finance.js';
import { CashFlowTotalsPanel } from '../components/CashFlowTotalsPanel.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { CostCenterSelect } from '../components/CostCenterSelect.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import { summarizeCashFlowEntries } from '../utils/cashFlowTotals.js';
import { formatDate, formatMoney, statusClass, statusLabel } from '../utils/finance.js';
import { LIST_PREFERENCE_KEYS, loadListPreferences, saveListPreferences } from '../utils/listPreferencesStorage.js';

const EMPTY_FILTERS = { from: '', to: '', costCenterId: '' };

function loadApiFilters() {
  const saved = loadListPreferences(LIST_PREFERENCE_KEYS.cashFlow);
  return saved?.apiFilters ?? EMPTY_FILTERS;
}

function formatFilterPeriod(filters) {
  if (filters.from && filters.to) {
    return `${formatDate(filters.from)} a ${formatDate(filters.to)}`;
  }
  if (filters.from) return `a partir de ${formatDate(filters.from)}`;
  if (filters.to) return `até ${formatDate(filters.to)}`;
  return 'todo o histórico';
}

export function CashFlowPage() {
  const [filters, setFilters] = useState(loadApiFilters);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const list = useCrudList(entries, {
    searchKeys: ['description', 'counterpartName', 'type'],
    defaultSort: { key: 'dueDate', direction: 'desc' },
    storageKey: LIST_PREFERENCE_KEYS.cashFlow,
  });

  const displayedTotals = useMemo(() => summarizeCashFlowEntries(list.allRows), [list.allRows]);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => Boolean(value)),
      );
      const data = await fetchCashFlow(params);
      setEntries(
        (data.entries ?? []).map((entry) => ({
          ...entry,
          type: entry.direction === 'inflow' ? 'Entrada' : 'Saída',
        })),
      );
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    saveListPreferences(LIST_PREFERENCE_KEYS.cashFlow, { apiFilters: filters });
  }, [filters]);

  const filterControls = (
    <>
      <label className="crud-toolbar-field">
        <span className="crud-toolbar-label">De</span>
        <input
          className="crud-toolbar-input"
          type="date"
          value={filters.from}
          onChange={(ev) => setFilters({ ...filters, from: ev.target.value })}
        />
      </label>
      <label className="crud-toolbar-field">
        <span className="crud-toolbar-label">Até</span>
        <input
          className="crud-toolbar-input"
          type="date"
          value={filters.to}
          onChange={(ev) => setFilters({ ...filters, to: ev.target.value })}
        />
      </label>
      <label className="crud-toolbar-field">
        <span className="crud-toolbar-label">Centro de custo</span>
        <CostCenterSelect
          value={filters.costCenterId}
          onChange={(value) => setFilters({ ...filters, costCenterId: value })}
          required={false}
        />
      </label>
      <button type="button" className="btn-primary btn-sm" onClick={() => load()}>
        Aplicar filtros
      </button>
    </>
  );

  return (
    <div className="page-stack">
      {summary ? (
        <div className="cash-flow-period-summary">
          <p className="cash-flow-period-label">Período filtrado: {formatFilterPeriod(filters)}</p>
          <div className="metrics-grid">
            <div className="metric-card">
              <span>Entradas liquidadas</span>
              <strong className="flow-in">{formatMoney(summary.totalInflow)}</strong>
            </div>
            <div className="metric-card">
              <span>Saídas liquidadas</span>
              <strong className="flow-out">{formatMoney(summary.totalOutflow)}</strong>
            </div>
            <div className="metric-card">
              <span>Saldo realizado</span>
              <strong>{formatMoney(summary.balance)}</strong>
            </div>
            <div className="metric-card">
              <span>Pendências no período</span>
              <strong>
                +{formatMoney(summary.pendingInflow)} / -{formatMoney(summary.pendingOutflow)}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      <CrudListShell
        title="Fluxo de Caixa"
        subtitle="Consulta somente leitura — use Contas a Pagar/Receber para editar lançamentos."
        error={error}
        loading={loading}
        query={list.query}
        onQueryChange={list.onQueryChange}
        searchPlaceholder="Buscar por descrição ou contraparte"
        sortKey={list.sortKey}
        sortDirection={list.sortDirection}
        onSortChange={list.setSort}
        sortOptions={[
          { key: 'dueDate', direction: 'desc', label: 'Vencimento (recente)' },
          { key: 'amount', direction: 'desc', label: 'Valor (maior)' },
          { key: 'type', direction: 'asc', label: 'Tipo' },
        ]}
        filters={filterControls}
        page={list.page}
        pageSize={list.pageSize}
        totalItems={list.totalItems}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        onPageSizeChange={list.onPageSizeChange}
        panelTitle="Movimentações"
        emptyMessage="Nenhum lançamento no período."
        canManage={false}
        tableFooter={<CashFlowTotalsPanel totals={displayedTotals} />}
        columns={[
          {
            key: 'type',
            label: 'Tipo',
            render: (row) => (
              <span className={row.direction === 'inflow' ? 'flow-in' : 'flow-out'}>{row.type}</span>
            ),
          },
          { key: 'description', label: 'Descrição' },
          { key: 'counterpartName', label: 'Contraparte' },
          {
            key: 'dueDate',
            label: 'Vencimento',
            render: (row) => formatDate(row.dueDate),
          },
          {
            key: 'amount',
            label: 'Valor',
            render: (row) => formatMoney(row.amount),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => (
              <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
            ),
          },
        ]}
        rows={list.rows}
      />
    </div>
  );
}
