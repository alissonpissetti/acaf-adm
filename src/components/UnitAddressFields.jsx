import { useEffect, useRef, useState } from 'react';
import { lookupZip } from '../api/admin.js';
import {
  BRAZILIAN_STATES,
  formatAddressSummary,
  formatZip,
  isAddressComplete,
} from '../utils/address.js';

export function UnitAddressFields({
  value,
  onChange,
  disabled = false,
  collapsible = false,
  expanded: expandedProp,
  onExpandedChange,
  embedded = false,
}) {
  const [cepBusy, setCepBusy] = useState(false);
  const [cepError, setCepError] = useState('');
  const lastLookup = useRef('');
  const [expandedInternal, setExpandedInternal] = useState(() => !isAddressComplete(value));
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = onExpandedChange ?? setExpandedInternal;
  const complete = isAddressComplete(value);
  const initialized = useRef(false);

  useEffect(() => {
    if (!collapsible || expandedProp !== undefined || initialized.current) return;
    initialized.current = true;
    setExpanded(!complete);
  }, [collapsible, complete, expandedProp, setExpanded]);

  const patch = (fields) => {
    onChange((current) => ({ ...current, ...fields }));
  };

  useEffect(() => {
    const digits = value.zip.replace(/\D/g, '');
    if (digits.length !== 8 || digits === lastLookup.current) return;

    const timer = window.setTimeout(async () => {
      lastLookup.current = digits;
      setCepBusy(true);
      setCepError('');
      try {
        const result = await lookupZip(digits);
        patch({
          zip: result.zip,
          address: result.address,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.uf || value.state,
        });
      } catch (err) {
        setCepError(err.message);
      } finally {
        setCepBusy(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [value.zip, value.state]);

  const setField = (field, next) => {
    patch({ [field]: next });
  };

  const toggleExpanded = () => {
    if (!collapsible) return;
    setExpanded(!expanded);
  };

  const fields = (
    <div className="form-grid">
      <label>
        <span>CEP</span>
        <input
          value={value.zip}
          onChange={(e) => setField('zip', formatZip(e.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          required
          disabled={disabled || cepBusy}
        />
        {cepBusy ? <small className="muted">Buscando CEP…</small> : null}
        {cepError ? <small className="error-text">{cepError}</small> : null}
      </label>

      <label>
        <span>UF</span>
        <select
          value={value.state}
          onChange={(e) => setField('state', e.target.value)}
          required
          disabled={disabled}
        >
          <option value="">Selecione</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

      <label className="field-span-2">
        <span>Logradouro</span>
        <input
          value={value.address}
          onChange={(e) => setField('address', e.target.value)}
          placeholder="Rua, avenida…"
          required
          disabled={disabled}
        />
      </label>

      <label>
        <span>Número</span>
        <input
          value={value.number}
          onChange={(e) => setField('number', e.target.value)}
          placeholder="123"
          disabled={disabled}
        />
      </label>

      <label>
        <span>Complemento</span>
        <input
          value={value.complement}
          onChange={(e) => setField('complement', e.target.value)}
          placeholder="Sala, bloco…"
          disabled={disabled}
        />
      </label>

      <label>
        <span>Bairro</span>
        <input
          value={value.neighborhood}
          onChange={(e) => setField('neighborhood', e.target.value)}
          required
          disabled={disabled}
        />
      </label>

      <label>
        <span>Cidade</span>
        <input
          value={value.city}
          onChange={(e) => setField('city', e.target.value)}
          required
          disabled={disabled}
        />
      </label>
    </div>
  );

  if (!collapsible) {
    return (
      <div className={embedded ? 'address-fields address-fields-embedded' : 'address-fields'}>
        {!embedded ? <h3 className="address-fields-title">Endereço</h3> : null}
        {fields}
      </div>
    );
  }

  return (
    <div className={`address-fields address-fields-collapsible ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button
        type="button"
        className="collapsible-header"
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span className="collapsible-header-main">
          <strong>Endereço</strong>
          {!expanded ? (
            <span className="collapsible-summary">{formatAddressSummary(value)}</span>
          ) : null}
        </span>
        <span className="collapsible-chevron" aria-hidden>
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded ? fields : null}
    </div>
  );
}
