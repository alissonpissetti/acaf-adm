import { useRef, useState } from 'react';
import { importAcafAssociates } from '../api/admin.js';
import { AppLoading } from './crud/AppLoading.jsx';
import { CrudAlerts } from './crud/CrudAlerts.jsx';

export function AcafAssociatesImportPanel({ onImported }) {
  const inputRef = useRef(null);
  const [syncMissing, setSyncMissing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const runImport = async (file) => {
    setBusy(true);
    setError('');
    setMessage('');
    setResult(null);
    try {
      const summary = await importAcafAssociates(file, { syncMissing, updateExisting });
      setResult(summary);
      const removedByStatus = summary.deactivatedByStatus ?? summary.deactivated ?? 0;
      const removedSync = summary.deactivatedSyncMissing ?? 0;
      const skippedExisting = summary.skippedExisting ?? 0;
      setMessage(
        `Importação concluída: ${summary.created} nova(s), ${summary.updated} atualizada(s)` +
          (skippedExisting ? `, ${skippedExisting} ignorada(s) (CNPJ já cadastrado)` : '') +
          (summary.reactivated ? `, ${summary.reactivated} reativada(s)` : '') +
          (removedByStatus ? `, ${removedByStatus} inativada(s) por status na planilha` : '') +
          (removedSync ? `, ${removedSync} oculta(s) (não estavam no arquivo)` : '') +
          (summary.skipped ? `, ${summary.skipped} linha(s) com aviso/erro.` : '.'),
      );
      onImported?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="panel acaf-import-panel" aria-busy={busy}>
      <div className="panel-header">
        <h2>Importar associados movly.</h2>
      </div>
      <div className="panel-body">
        <p className="muted">
          Planilha padrão (<strong>NOVA ASSINATURA</strong>): Associação, Data Assinatura, Razão Social,
          Nome Fantasia, CNPJ, logradouro (número em coluna separada ou após vírgula), complemento, bairro,
          cidade, UF, CEP, e-mail, telefone. Coluna opcional <strong>Status</strong>: valores como remoção /
          cancelamento / inativação só desativam o parceiro no app (cadastro permanece). Por padrão, CNPJs
          que já existem no cadastro são <strong>ignorados</strong> na reimportação (não sobrescreve nome, rede
          ou endereço); marque abaixo se quiser atualizar a partir da planilha.
        </p>

        <label className="checkbox-inline field-span-full">
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(ev) => setUpdateExisting(ev.target.checked)}
            disabled={busy}
          />
          Atualizar unidades já existentes (sobrescrever com os dados da planilha)
        </label>

        <label className="checkbox-inline field-span-full">
          <input
            type="checkbox"
            checked={syncMissing}
            onChange={(ev) => setSyncMissing(ev.target.checked)}
            disabled={busy}
          />
          Ocultar do app associados importados antes que não estiverem nesta planilha
        </label>

        <div className="form-actions acaf-import-file-row">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="input"
            disabled={busy}
            onChange={(ev) => {
              const file = ev.target.files?.[0];
              if (file) void runImport(file);
            }}
          />
        </div>

        {busy ? (
          <div className="acaf-import-loading">
            <AppLoading compact label="Processando planilha…" />
          </div>
        ) : null}

        <CrudAlerts error={error} message={message} />

        {result?.errors?.length ? (
          <details className="import-errors-detail">
            <summary>{result.errors.length} linha(s) com problema</summary>
            <ul className="import-errors-list">
              {result.errors.map((item) => (
                <li key={`${item.rowNumber}-${item.message}`}>
                  Linha {item.rowNumber}: {item.message}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  );
}
