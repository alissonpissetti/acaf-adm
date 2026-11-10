const STORAGE_PREFIX = 'connect.list-prefs.';

export const LIST_PREFERENCE_KEYS = {
  companies: 'operacao.empresas',
  users: 'operacao.usuarios',
  networks: 'operacao.redes',
  networkUnits: 'operacao.rede.unidades',
  modalities: 'operacao.modalidades',
  connectPlans: 'operacao.planos-connect',
  commercialFunnels: 'comercial.funis',
  marketingCampaigns: 'marketing.campanhas',
  marketingLandingPages: 'marketing.formularios',
  accountPlans: 'financeiro.planos-conta',
  suppliers: 'financeiro.fornecedores',
  payables: 'financeiro.contas-pagar',
  receivables: 'financeiro.contas-receber',
  cashFlow: 'financeiro.fluxo-caixa',
  costCenters: 'financeiro.centros-custo',
  userGroups: 'config.grupos-usuario',
  modules: 'config.modulos',
  moduleItems: 'config.modulos.itens',
  jobPositions: 'config.cargos',
  departments: 'config.departamentos',
  platformSettings: 'config.parametros-plataforma',
  evolutionInstances: 'config.evolution-instancias',
  supportQueues: 'atendimento.filas',
};

function buildStorageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function normalizeDirection(value) {
  return value === 'desc' ? 'desc' : 'asc';
}

function normalizePageSize(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function normalizePage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function normalizeFieldFilters(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item.id === 'string');
}

function normalizeSuppressedIds(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string');
}

export function loadListPreferences(storageKey) {
  if (!storageKey) return null;

  try {
    const raw = localStorage.getItem(buildStorageKey(storageKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const preferences = {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      sortKey: typeof parsed.sortKey === 'string' ? parsed.sortKey : undefined,
      sortDirection: normalizeDirection(parsed.sortDirection),
      page: normalizePage(parsed.page),
      pageSize: parsed.pageSize != null ? normalizePageSize(parsed.pageSize, undefined) : undefined,
      fieldFilters: normalizeFieldFilters(parsed.fieldFilters),
      suppressedDefaultFilterIds: normalizeSuppressedIds(parsed.suppressedDefaultFilterIds),
    };

    if (parsed.apiFilters && typeof parsed.apiFilters === 'object') {
      preferences.apiFilters = {
        from: typeof parsed.apiFilters.from === 'string' ? parsed.apiFilters.from : '',
        to: typeof parsed.apiFilters.to === 'string' ? parsed.apiFilters.to : '',
        costCenterId:
          typeof parsed.apiFilters.costCenterId === 'string' ? parsed.apiFilters.costCenterId : '',
      };
    }

    return preferences;
  } catch {
    return null;
  }
}

export function saveListPreferences(storageKey, preferences) {
  if (!storageKey || !preferences) return;

  try {
    const key = buildStorageKey(storageKey);
    let existing = {};

    try {
      const raw = localStorage.getItem(key);
      if (raw) existing = JSON.parse(raw);
    } catch {
      existing = {};
    }

    const merged = { ...existing, ...preferences };
    const payload = {
      query: typeof merged.query === 'string' ? merged.query : '',
      sortKey: typeof merged.sortKey === 'string' ? merged.sortKey : '',
      sortDirection: normalizeDirection(merged.sortDirection),
      page: normalizePage(merged.page),
      pageSize: normalizePageSize(merged.pageSize, 10),
      fieldFilters: normalizeFieldFilters(merged.fieldFilters),
      suppressedDefaultFilterIds: normalizeSuppressedIds(merged.suppressedDefaultFilterIds),
    };

    if (merged.apiFilters && typeof merged.apiFilters === 'object') {
      payload.apiFilters = {
        from: typeof merged.apiFilters.from === 'string' ? merged.apiFilters.from : '',
        to: typeof merged.apiFilters.to === 'string' ? merged.apiFilters.to : '',
        costCenterId:
          typeof merged.apiFilters.costCenterId === 'string' ? merged.apiFilters.costCenterId : '',
      };
    }

    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode errors
  }
}
