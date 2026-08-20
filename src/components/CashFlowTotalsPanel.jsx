import { formatMoney } from '../utils/finance.js';

function ResultValue({ value, className = '' }) {
  const tone = value > 0 ? 'flow-in' : value < 0 ? 'flow-out' : '';
  return <strong className={`cash-flow-result-value ${tone} ${className}`.trim()}>{formatMoney(value)}</strong>;
}

export function CashFlowTotalsPanel({ totals, compact = false }) {
  if (!totals || totals.count === 0) return null;

  return (
    <div className={`cash-flow-totals${compact ? ' cash-flow-totals--compact' : ''}`}>
      <div className="cash-flow-totals-header">
        <h3>Resultado das movimentações exibidas</h3>
        <span className="panel-meta">{totals.count} lançamento(s)</span>
      </div>

      <div className="cash-flow-totals-summary">
        <div className="cash-flow-totals-metric">
          <span>Entradas</span>
          <strong className="flow-in">{formatMoney(totals.totalInflow)}</strong>
          <small>
            Liquidado {formatMoney(totals.settledInflow)} · Pendente {formatMoney(totals.pendingInflow)}
          </small>
        </div>
        <div className="cash-flow-totals-metric">
          <span>Saídas</span>
          <strong className="flow-out">{formatMoney(totals.totalOutflow)}</strong>
          <small>
            Liquidado {formatMoney(totals.settledOutflow)} · Pendente {formatMoney(totals.pendingOutflow)}
          </small>
        </div>
        <div className="cash-flow-totals-metric cash-flow-totals-metric--result">
          <span>Resultado do período</span>
          <ResultValue value={totals.result} className="cash-flow-totals-result" />
          <small>
            Realizado {formatMoney(totals.settledResult)} · Previsto {formatMoney(totals.pendingResult)}
          </small>
        </div>
      </div>

      {totals.monthly.length > 0 ? (
        <div className="cash-flow-monthly-wrap">
          <h4 className="cash-flow-monthly-title">Totalizador mensal</h4>
          <div className="table-wrap">
            <table className="data-table data-table-compact cash-flow-monthly-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="col-money">Entradas</th>
                  <th className="col-money">Saídas</th>
                  <th className="col-money">Resultado</th>
                  <th className="col-count">Lanç.</th>
                </tr>
              </thead>
              <tbody>
                {totals.monthly.map((row) => (
                  <tr key={row.monthKey}>
                    <td>{row.monthLabel}</td>
                    <td className="col-money flow-in">{formatMoney(row.inflow)}</td>
                    <td className="col-money flow-out">{formatMoney(row.outflow)}</td>
                    <td className="col-money">
                      <ResultValue value={row.result} />
                    </td>
                    <td className="col-count">{row.count}</td>
                  </tr>
                ))}
              </tbody>
              {totals.monthly.length > 1 ? (
                <tfoot>
                  <tr>
                    <th>Total do período</th>
                    <th className="col-money flow-in">{formatMoney(totals.totalInflow)}</th>
                    <th className="col-money flow-out">{formatMoney(totals.totalOutflow)}</th>
                    <th className="col-money">
                      <ResultValue value={totals.result} />
                    </th>
                    <th className="col-count">{totals.count}</th>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
