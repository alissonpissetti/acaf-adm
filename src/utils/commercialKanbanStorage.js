const STORAGE_KEY = 'connect.commercial.kanban-fullscreen';

export function readKanbanFullscreenPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeKanbanFullscreenPreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* storage indisponível */
  }
}
