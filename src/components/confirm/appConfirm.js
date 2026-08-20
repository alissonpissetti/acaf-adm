let confirmHandler = null;
let alertHandler = null;
let chooseHandler = null;

export function registerConfirmDialogHandlers(handlers) {
  confirmHandler = handlers.confirm;
  alertHandler = handlers.alert;
  chooseHandler = handlers.choose;
}

export function appConfirm(options = {}) {
  if (!confirmHandler) {
    console.warn('ConfirmDialogProvider não montado.');
    return Promise.resolve(false);
  }
  return confirmHandler(options);
}

export function appAlert(options = {}) {
  if (!alertHandler) {
    console.warn('ConfirmDialogProvider não montado.');
    return Promise.resolve();
  }
  return alertHandler(options);
}

export function appChoose(options = {}) {
  if (!chooseHandler) {
    console.warn('ConfirmDialogProvider não montado.');
    return Promise.resolve(null);
  }
  return chooseHandler(options);
}
