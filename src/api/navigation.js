import { fetchApi } from './client.js';
import { ACAF_ASSOCIATION_URL } from '../navigation/routeUtils.js';

const ACAF_ITEM_SLUGS = new Set(['parceiros-acaf', 'acaf']);
const LEGACY_MODULE_NAMES = new Set(['Associação movly.', 'Associacao movly.']);
const LEGACY_ITEM_LABELS = new Set(['Parceiros associados']);

function normalizeNavigationModules(modules) {
  if (!Array.isArray(modules)) return [];

  const normalized = modules.map((module) => {
    const isAssociationModule =
      module.slug === 'associacao' ||
      module.slug === 'associacoes' ||
      LEGACY_MODULE_NAMES.has(module.name);

    if (!isAssociationModule) {
      return module;
    }

    const name = 'Associações';
    const items = (module.items ?? []).map((item) => {
        if (!ACAF_ITEM_SLUGS.has(item.slug) && !LEGACY_ITEM_LABELS.has(item.label)) {
          return item;
        }
        return {
          ...item,
          label: 'ACAF',
          route: ACAF_ASSOCIATION_URL,
        };
      });

    return { ...module, name, slug: 'associacao', items };
  });

  let associationKept = false;
  return normalized.filter((module) => {
    const isAssociation =
      module.slug === 'associacao' ||
      module.slug === 'associacoes' ||
      module.name === 'Associações';
    if (!isAssociation) return true;
    if (associationKept) return false;
    associationKept = true;
    return true;
  });
}

export function fetchNavigation() {
  return fetchApi('/api/admin/navigation').then(normalizeNavigationModules);
}
