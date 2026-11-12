const MAP_EXPANDED_KEY = 'acaf_adm_networks_map_expanded';
const VIEW_MODE_KEY = 'acaf_adm_networks_view_mode';

const VIEW_MODES = new Set(['both', 'list', 'map']);

/** @returns {boolean} */
export function readNetworksMapExpanded() {
  try {
    const value = localStorage.getItem(MAP_EXPANDED_KEY);
    if (value === '1') return true;
    if (value === '0') return false;
    return false;
  } catch {
    return false;
  }
}

/** @param {boolean} expanded */
export function writeNetworksMapExpanded(expanded) {
  try {
    localStorage.setItem(MAP_EXPANDED_KEY, expanded ? '1' : '0');
  } catch {
    /* storage indisponível */
  }
}

/** @returns {'both' | 'list' | 'map'} */
export function readNetworksViewMode() {
  try {
    const value = localStorage.getItem(VIEW_MODE_KEY);
    if (typeof value === 'string' && VIEW_MODES.has(value)) return value;
    return 'both';
  } catch {
    return 'both';
  }
}

/** @param {'both' | 'list' | 'map'} mode */
export function writeNetworksViewMode(mode) {
  if (!VIEW_MODES.has(mode)) return;
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* storage indisponível */
  }
}
