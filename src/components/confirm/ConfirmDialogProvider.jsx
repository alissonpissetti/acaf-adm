import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalCloseButton } from '../ModalCloseButton.jsx';
import { appAlert, appChoose, appConfirm, registerConfirmDialogHandlers } from './appConfirm.js';
import '../../styles/confirm-dialog.css';

const ConfirmDialogContext = createContext(null);

const DEFAULT_CONFIRM = {
  title: 'Confirmar ação',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  tone: 'default',
};

const DEFAULT_ALERT = {
  title: 'Atenção',
  message: '',
  okLabel: 'Entendi',
  tone: 'default',
};

function ConfirmDialogHost({ dialog, onConfirm, onCancel, onAlertOk, onChoose }) {
  if (!dialog) return null;

  const isAlert = dialog.kind === 'alert';
  const tone = dialog.tone ?? 'default';

  return (
    <div
      className="app-dialog-backdrop"
      role="presentation"
      onClick={isAlert ? onAlertOk : onCancel}
    >
      <div
        className={`app-dialog app-dialog--${tone}`}
        role={isAlert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        onClick={(ev) => ev.stopPropagation()}
      >
        <header className="app-dialog-head">
          <div className="app-dialog-head-copy">
            {tone === 'danger' ? (
              <span className="app-dialog-icon app-dialog-icon--danger" aria-hidden="true">
                <AlertTriangle size={18} />
              </span>
            ) : null}
            <h2 id="app-dialog-title">{dialog.title}</h2>
          </div>
          {!isAlert ? <ModalCloseButton onClick={onCancel} /> : null}
        </header>

        <div className="app-dialog-body">
          <p id="app-dialog-message">{dialog.message}</p>
        </div>

        <footer className="app-dialog-actions">
          {dialog.kind === 'choose' ? (
            <>
              <button type="button" className="app-dialog-btn app-dialog-btn--ghost" onClick={onCancel}>
                {dialog.cancelLabel}
              </button>
              {(dialog.choices ?? []).map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`app-dialog-btn${
                    choice.primary ? ' app-dialog-btn--confirm' : ' app-dialog-btn--ghost'
                  }`}
                  onClick={() => onChoose(choice.id)}
                >
                  {choice.label}
                </button>
              ))}
            </>
          ) : !isAlert ? (
            <button type="button" className="app-dialog-btn app-dialog-btn--ghost" onClick={onCancel}>
              {dialog.cancelLabel}
            </button>
          ) : null}
          {dialog.kind !== 'choose' ? (
            <button
              type="button"
              className={`app-dialog-btn app-dialog-btn--confirm${tone === 'danger' ? ' app-dialog-btn--danger' : ''}`}
              onClick={isAlert ? onAlertOk : onConfirm}
              autoFocus
            >
              {isAlert ? dialog.okLabel : dialog.confirmLabel}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const openDialog = useCallback((kind, options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        kind,
        ...(kind === 'alert'
          ? DEFAULT_ALERT
          : kind === 'choose'
            ? { title: 'Escolha uma opção', message: '', cancelLabel: 'Cancelar', choices: [] }
            : DEFAULT_CONFIRM),
        ...options,
      });
    });
  }, []);

  const confirm = useCallback(
    (options) => openDialog('confirm', options),
    [openDialog],
  );

  const alert = useCallback(
    (options) => openDialog('alert', options),
    [openDialog],
  );

  const choose = useCallback(
    (options) => openDialog('choose', { cancelLabel: 'Cancelar', choices: [], ...options }),
    [openDialog],
  );

  useEffect(() => {
    registerConfirmDialogHandlers({ confirm, alert, choose });
    return () => registerConfirmDialogHandlers({ confirm: null, alert: null, choose: null });
  }, [choose, confirm, alert]);

  useEffect(() => {
    if (!dialog) return undefined;

    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        if (dialog.kind === 'alert') {
          closeDialog(undefined);
        } else {
          closeDialog(false);
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, dialog]);

  const value = useMemo(() => ({ confirm, alert, choose }), [alert, choose, confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialogHost
        dialog={dialog}
        onConfirm={() => closeDialog(true)}
        onCancel={() => closeDialog(dialog?.kind === 'choose' ? null : false)}
        onAlertOk={() => closeDialog(undefined)}
        onChoose={(choiceId) => closeDialog(choiceId)}
      />
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirmDialog deve ser usado dentro de ConfirmDialogProvider.');
  }
  return context;
}

export { appAlert, appChoose, appConfirm };
