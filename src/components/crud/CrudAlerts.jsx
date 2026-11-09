import { useEffect, useRef } from 'react';
import { useFlashMessage } from '../flash/FlashMessageProvider.jsx';

export function CrudAlerts({ error, message, onDismissError, onDismissMessage }) {
  const flash = useFlashMessage();
  const lastMessageRef = useRef('');
  const lastErrorRef = useRef('');

  useEffect(() => {
    const trimmed = String(message ?? '').trim();
    if (!trimmed || trimmed === lastMessageRef.current) return;
    lastMessageRef.current = trimmed;
    flash.success(trimmed);
    onDismissMessage?.();
  }, [message, flash, onDismissMessage]);

  useEffect(() => {
    const trimmed = String(error ?? '').trim();
    if (!trimmed) {
      lastErrorRef.current = '';
      return;
    }
    if (trimmed === lastErrorRef.current) return;
    lastErrorRef.current = trimmed;
    flash.error(trimmed);
    onDismissError?.();
  }, [error, flash, onDismissError]);

  return null;
}
