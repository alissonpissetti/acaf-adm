import { PageHeader } from '../components/PageHeader.jsx';

export function UsersList({ users, onAdd, onEdit }) {
  return (
    <div className="page-stack">
      <PageHeader
        title="Usuários"
        subtitle="Todas as pessoas cadastradas na plataforma — admins, clientes e equipe."
        actions={
          <button type="button" className="btn-primary" onClick={onAdd}>
            Adicionar usuário
          </button>
        }
      />

      <section className="panel">
        <div className="panel-header">
          <h2>Usuários cadastrados</h2>
          <span className="panel-meta">{users.length} usuário(s)</span>
        </div>
        <div className="panel-body panel-body-flush">
          {users.length === 0 ? (
            <div className="empty-state">
              Nenhum usuário cadastrado. Clique em Adicionar usuário para começar.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table data-table-enterprise">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Celular</th>
                    <th>E-mail</th>
                    <th>Papéis</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th className="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="data-table-row-clickable"
                      onClick={() => onEdit(user.id)}
                    >
                      <td>
                        <strong>{user.name}</strong>
                      </td>
                      <td>{user.cpf ?? '—'}</td>
                      <td>{user.mobilePhone ?? '—'}</td>
                      <td>{user.email}</td>
                      <td>{user.roleLabels?.join(', ') ?? '—'}</td>
                      <td>
                        <span className={user.active ? 'badge badge-success' : 'badge badge-muted'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="table-actions col-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onEdit(user.id);
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
