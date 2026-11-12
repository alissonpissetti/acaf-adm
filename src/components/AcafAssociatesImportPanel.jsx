import { useCallback, useRef, useState } from 'react';
import { importAcafAssociates } from '../api/admin.js';
import { AppLoading } from './crud/AppLoading.jsx';
import { CrudAlerts } from './crud/CrudAlerts.jsx';
import '../styles/acaf-import.css';

const ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

export function AcafAssociatesImportPanel({ onImported }) {
  const inputRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [syncMissing, setSyncMissing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pendingFileName, setPendingFileName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  const collapsedSummary =
    'Planilha NOVA ASSINATURA · .xlsx · importação ao selecionar o arquivo';

  const runImport = async (file) => {
    if (!file || busy) return;
    setPendingFileName(file.name);
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
      setPendingFileName('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const pickFile = useCallback(() => {
    if (!busy) inputRef.current?.click();
  }, [busy]);

  const onFileInputChange = (ev) => {
    const file = ev.target.files?.[0];
    if (file) void runImport(file);
  };

  const onDrop = (ev) => {
    ev.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = ev.dataTransfer.files?.[0];
    if (file) void runImport(file);
  };

  return (
    <section
      className={`panel acaf-import-panel acaf-import-collapsible address-fields-collapsible ${
        expanded ? 'is-expanded' : 'is-collapsed'
      }`}
      aria-busy={busy}
      aria-label="Importar associados movly."
    >
      <button
        type="button"
        className="collapsible-header acaf-import-collapsible-trigger"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        <span className="collapsible-header-main">
          <strong>Importar associados movly.</strong>
          {!expanded ? <span className="collapsible-summary">{collapsedSummary}</span> : null}
        </span>
        <span className="collapsible-chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div className="panel-body acaf-import-panel-body">
          <p className="acaf-import-lead">
            Carregue a planilha padrão <strong>NOVA ASSINATURA</strong> para criar ou atualizar parceiros
            importados. A importação começa assim que você escolher o arquivo.
          </p>

          <details className="acaf-import-instructions">
            <summary>Formato e regras da planilha</summary>
            <div className="acaf-import-instructions-body">
              <p className="acaf-import-columns-title">Colunas esperadas</p>
              <ul className="acaf-import-columns-list">
                <li>
                  Associação, Data Assinatura, Razão Social, Nome Fantasia, <strong>CNPJ</strong>
                </li>
                <li>
                  Endereço: logradouro (número em coluna separada ou após vírgula), complemento, bairro,
                  cidade, UF, CEP
                </li>
                <li>E-mail e telefone</li>
                <li>
                  Opcional — coluna <strong>Status</strong>: valores de remoção / cancelamento / inativação
                  desativam o parceiro no app (o cadastro permanece)
                </li>
              </ul>
              <p className="acaf-import-notes">
                Por padrão, CNPJs que já existem no cadastro são <strong>ignorados</strong> na reimportação
                (não sobrescreve nome, rede ou endereço). Marque a opção abaixo se quiser atualizar a partir da
                planilha.
              </p>
            </div>
          </details>

          <fieldset className="acaf-import-options" disabled={busy}>
            <legend className="acaf-import-options-title">Opções</legend>
            <div className="acaf-import-checkboxes">
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(ev) => setUpdateExisting(ev.target.checked)}
                  disabled={busy}
                />
                Atualizar unidades já existentes (sobrescrever com os dados da planilha)
              </label>
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={syncMissing}
                  onChange={(ev) => setSyncMissing(ev.target.checked)}
                  disabled={busy}
                />
                Ocultar do app associados importados antes que não estiverem nesta planilha
              </label>
            </div>
          </fieldset>

          <div className="acaf-import-upload">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              hidden
              disabled={busy}
              onChange={onFileInputChange}
            />
            <div
              className={`acaf-import-dropzone${busy ? ' is-disabled' : ''}${dragging ? ' is-dragging' : ''}`}
              role="presentation"
              onClick={pickFile}
              onDragEnter={(ev) => {
                ev.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragOver={(ev) => {
                ev.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={(ev) => {
                ev.preventDefault();
                setDragging(false);
              }}
              onDrop={onDrop}
            >
              <strong>{busy ? 'Processando planilha…' : 'Enviar planilha'}</strong>
              <span>Arraste o arquivo aqui ou use o botão abaixo · formatos .xlsx e .xls</span>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={busy}
                onClick={(ev) => {
                  ev.stopPropagation();
                  pickFile();
                }}
              >
                {busy ? 'Importando…' : 'Escolher arquivo'}
              </button>
              {pendingFileName ? (
                <p className="acaf-import-file-name" aria-live="polite">
                  {pendingFileName}
                </p>
              ) : null}
            </div>
          </div>

          {busy ? (
            <div className="acaf-import-loading">
              <AppLoading compact label="Processando planilha…" />
            </div>
          ) : null}

          <CrudAlerts error={error} message={message} />

          {result?.errors?.length ? (
            <details className="acaf-import-errors-detail">
              <summary>{result.errors.length} linha(s) com problema</summary>
              <ul className="acaf-import-errors-list">
                {result.errors.map((item) => (
                  <li key={`${item.rowNumber}-${item.message}`}>
                    Linha {item.rowNumber}: {item.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
