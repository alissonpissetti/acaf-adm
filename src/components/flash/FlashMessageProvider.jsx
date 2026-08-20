import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const FlashMessageContext = createContext(null);

let flashIdCounter = 0;

const DEFAULT_DURATION = 4500;

function FlashMessageHost({ items, onDismiss }) {
  if (!items.length) return null;

  return (
    <div className="flash-message-host" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div key={item.id} className={`flash-message flash-message-${item.type}`} role="status">
          <span className="flash-message-text">{item.text}</span>
          <button
            type="button"
            className="flash-message-dismiss"
            aria-label="Fechar"
            onClick={() => onDismiss(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function FlashMessageProvider({ children }) {
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (type, text, duration = DEFAULT_DURATION) => {
      const trimmed = String(text ?? '').trim();
      if (!trimmed) return null;

      const id = ++flashIdCounter;
      setItems((prev) => [...prev, { id, type, text: trimmed }]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const flash = useMemo(
    () => ({
      success: (text, duration) => push('success', text, duration),
      error: (text, duration) => push('error', text, duration),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <FlashMessageContext.Provider value={flash}>
      {children}
      <FlashMessageHost items={items} onDismiss={dismiss} />
    </FlashMessageContext.Provider>
  );
}

export function useFlashMessage() {
  const context = useContext(FlashMessageContext);
  if (!context) {
    throw new Error('useFlashMessage deve ser usado dentro de FlashMessageProvider.');
  }
  return context;
}

export function SuccessFlashEffect({ message }) {
  const flash = useFlashMessage();
  const lastMessageRef = useRef('');

  useEffect(() => {
    const trimmed = String(message ?? '').trim();
    if (!trimmed || trimmed === lastMessageRef.current) return;
    lastMessageRef.current = trimmed;
    flash.success(trimmed);
  }, [message, flash]);

  return null;
}
