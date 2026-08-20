import { useEffect, useRef } from 'react';
import { useFlashMessage } from '../flash/FlashMessageProvider.jsx';

export function CrudAlerts({ error, message, onDismissError, onDismissMessage }) {
  const flash = useFlashMessage();
  const lastMessageRef = useRef('');

  useEffect(() => {
    const trimmed = String(message ?? '').trim();
    if (!trimmed || trimmed === lastMessageRef.current) return;
    lastMessageRef.current = trimmed;
    flash.success(trimmed);
    onDismissMessage?.();
  }, [message, flash, onDismissMessage]);

  if (!error) return null;

  return (
    <div className="alert alert-error">
      {error}
      {onDismissError ? (
        <button type="button" className="alert-dismiss" onClick={onDismissError}>
          Fechar
        </button>
      ) : null}
    </div>
  );
}
