import { Plus, Trash2 } from 'lucide-react';
import {
  PIX_KEY_TYPES,
  emptyPixKey,
  pixKeyPlaceholder,
  validatePixKey,
} from '../utils/pix.js';

export function SupplierPixKeysEditor({ value = [], onChange, readOnly = false, disabled = false }) {
  const rows = value.length > 0 ? value : [];

  const updateRow = (index, patch) => {
    onChange(rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...rows, emptyPixKey(rows.every((row) => !row.isPrimary))]);
  };

  const removeRow = (index) => {
    const next = rows.filter((_, idx) => idx !== index);
    if (next.length && !next.some((row) => row.isPrimary && row.active !== false)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  const setPrimary = (index) => {
    onChange(rows.map((row, idx) => ({ ...row, isPrimary: idx === index })));
  };

  return (
    <div className="supplier-pix-keys field-span-full">
      <div className="supplier-pix-keys-head">
        <div>
          <span className="field-label">Chaves PIX</span>
          <p className="muted supplier-pix-keys-help">
            Cadastre uma ou mais chaves. Marque a principal para pagamentos.
          </p>
        </div>
        {!readOnly ? (
          <button type="button" className="btn-ghost btn-sm" onClick={addRow} disabled={disabled}>
            <Plus size={16} aria-hidden="true" />
            Adicionar chave
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="muted">Nenhuma chave PIX cadastrada.</p>
      ) : (
        <div className="supplier-pix-keys-list">
          {rows.map((row, index) => {
            const validation = row.keyValue ? validatePixKey(row.type, row.keyValue) : { valid: true };
            return (
              <div key={row.id || `pix-${index}`} className="supplier-pix-key-row">
                <label>
                  <span>Tipo</span>
                  <select
                    className="input"
                    value={row.type}
                    disabled={readOnly || disabled}
                    onChange={(ev) => updateRow(index, { type: ev.target.value, keyValue: '' })}
                  >
                    {PIX_KEY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="supplier-pix-key-value">
                  <span>Chave</span>
                  <input
                    className={`input${validation.valid ? '' : ' input-invalid'}`}
                    value={row.keyValue}
                    placeholder={pixKeyPlaceholder(row.type)}
                    disabled={readOnly || disabled}
                    onChange={(ev) => updateRow(index, { keyValue: ev.target.value })}
                  />
                  {!validation.valid ? <small className="error-text">{validation.message}</small> : null}
                </label>
                <label>
                  <span>Apelido</span>
                  <input
                    className="input"
                    value={row.label ?? ''}
                    placeholder="Ex.: Conta principal"
                    disabled={readOnly || disabled}
                    onChange={(ev) => updateRow(index, { label: ev.target.value })}
                  />
                </label>
                <label className="checkbox-inline supplier-pix-key-primary">
                  <input
                    type="radio"
                    name="supplier-pix-primary"
                    checked={Boolean(row.isPrimary)}
                    disabled={readOnly || disabled || row.active === false}
                    onChange={() => setPrimary(index)}
                  />
                  Principal
                </label>
                {!readOnly ? (
                  <button
                    type="button"
                    className="supplier-pix-key-remove"
                    aria-label="Remover chave PIX"
                    disabled={disabled}
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
