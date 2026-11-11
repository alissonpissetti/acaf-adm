import { useEffect, useId, useState } from 'react';
import { ModalCloseButton } from './ModalCloseButton.jsx';

const OTHER_VALUE = '__other__';

export function LeadMarkLostModal({
  lead,
  stageLabel,
  reasons,
  busy,
  onClose,
  onConfirm,
}) {
  const groupId = useId();
  const [choice, setChoice] = useState('');
  const [otherText, setOtherText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setChoice(reasons[0]?.id ?? '');
    setOtherText('');
    setError('');
  }, [lead?.id, reasons]);

  function onSubmit(ev) {
    ev.preventDefault();
    setError('');

    if (choice === OTHER_VALUE) {
      const text = otherText.trim();
      if (!text) {
        setError('Descreva o motivo da perda.');
        return;
      }
      onConfirm({ lossReasonCustom: text });
      return;
    }

    if (!choice) {
      setError('Selecione um motivo.');
      return;
    }

    onConfirm({ lossReasonId: choice });
  }

  return (
    <div
      className="commercial-lead-modal-backdrop commercial-lead-modal-backdrop--centered"
      role="presentation"
      onClick={onClose}
    >
      <form
        className="commercial-mark-lost-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${groupId}-title`}
        onClick={(ev) => ev.stopPropagation()}
        onSubmit={onSubmit}
      >
        <ModalCloseButton onClick={onClose} />
        <h2 id={`${groupId}-title`} className="commercial-mark-lost-title">
          Motivo da perda
        </h2>
        <p className="commercial-mark-lost-lead">
          <strong>{lead?.title}</strong>
          {stageLabel ? <> → {stageLabel}</> : null}
        </p>

        <fieldset className="commercial-mark-lost-fieldset">
          <legend className="sr-only">Motivos</legend>
          <p className="field-hint">Selecione o motivo. Textos novos em «Outro» passam a aparecer na lista.</p>
          <div className="commercial-mark-lost-options">
            {reasons.map((reason) => (
              <label key={reason.id} className="commercial-mark-lost-option">
                <input
                  type="radio"
                  name={`${groupId}-reason`}
                  value={reason.id}
                  checked={choice === reason.id}
                  onChange={() => setChoice(reason.id)}
                />
                <span>{reason.label}</span>
              </label>
            ))}
            <label className="commercial-mark-lost-option">
              <input
                type="radio"
                name={`${groupId}-reason`}
                value={OTHER_VALUE}
                checked={choice === OTHER_VALUE}
                onChange={() => setChoice(OTHER_VALUE)}
              />
              <span>Outro</span>
            </label>
          </div>
        </fieldset>

        {choice === OTHER_VALUE ? (
          <div className="field-block">
            <label htmlFor={`${groupId}-other`}>Descreva o motivo</label>
            <input
              id={`${groupId}-other`}
              className="input"
              type="text"
              maxLength={120}
              value={otherText}
              onChange={(ev) => setOtherText(ev.target.value)}
              placeholder="Ex.: mudou de cidade"
              autoFocus
            />
          </div>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="commercial-mark-lost-actions">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-danger" disabled={busy}>
            {busy ? 'Salvando…' : 'Confirmar perda'}
          </button>
        </div>
      </form>
    </div>
  );
}
