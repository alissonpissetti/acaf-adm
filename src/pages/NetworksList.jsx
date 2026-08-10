import { PageHeader } from '../components/PageHeader.jsx';

export function NetworksList({ networks, onAdd, onEdit }) {
  return (
    <div className="page-stack">
      <PageHeader
        title="Redes parceiras"
        subtitle="Gerencie redes de academias parceiras do ACAF Connect."
        actions={
          <button type="button" className="btn-primary" onClick={onAdd}>
            Adicionar rede
          </button>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Redes cadastradas</h2>
          <span className="panel-meta">{networks.length} rede(s)</span>
        </div>
        <div className="panel-body panel-body-flush">
          {networks.length === 0 ? (
            <div className="empty-state">
              Nenhuma rede cadastrada. Clique em Adicionar rede para começar.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table-enterprise">
                <thead>
                  <tr>
                    <th>Logo</th>
                    <th>Rede</th>
                    <th>Unidades</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {networks.map((network) => (
                    <tr
                      key={network.id}
                      className="data-table-row-clickable"
                      onClick={() => onEdit(network.id)}
                    >
                      <td>
                        <div className="table-logo">
                          {network.logoUrl ? (
                            <img src={network.logoUrl} alt="" />
                          ) : (
                            <span className="table-logo-fallback">{network.name.slice(0, 1)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{network.name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-muted">{network.unitCount ?? 0}</span>
                      </td>
                      <td className="table-actions col-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onEdit(network.id);
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
