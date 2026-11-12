import { fetchApi } from './client.js';
import { ACAF_ASSOCIATION_URL } from '../navigation/routeUtils.js';

const ACAF_ITEM_SLUGS = new Set(['parceiros-acaf', 'acaf']);
const ASSOCIACOES_CADASTRO_ROUTE = '/m/sistema/associacoes';
const ASSOCIACOES_CADASTRO_SLUGS = new Set(['associacoes', 'cadastro-associacoes']);
const LEGACY_MODULE_NAMES = new Set(['Associação movly.', 'Associacao movly.']);
const LEGACY_ITEM_LABELS = new Set(['Parceiros associados', 'Cadastro de associações']);

function isAssociacoesCadastroItem(item) {
  const routePath = String(item?.route ?? '').split('?')[0];
  return (
    ASSOCIACOES_CADASTRO_SLUGS.has(item?.slug) ||
    routePath === ASSOCIACOES_CADASTRO_ROUTE ||
    item?.label === 'Associações'
  );
}

function stripSistemaAssociacoesDuplicate(modules) {
  return modules.map((module) => {
    if (module.slug !== 'sistema') return module;
    return {
      ...module,
      items: (module.items ?? []).filter((item) => !isAssociacoesCadastroItem(item)),
    };
  });
}

function normalizeNavigationModules(modules) {
  if (!Array.isArray(modules)) return [];

  const withoutSistemaDupe = stripSistemaAssociacoesDuplicate(modules);

  const normalized = withoutSistemaDupe.map((module) => {
    const isAssociationModule =
      module.slug === 'associacao' ||
      module.slug === 'associacoes' ||
      LEGACY_MODULE_NAMES.has(module.name);

    if (!isAssociationModule) {
      return module;
    }

    const name = 'Associações';
    const items = (module.items ?? [])
      .map((item) => {
        if (isAssociacoesCadastroItem(item)) {
          return {
            ...item,
            slug: 'associacoes',
            label: 'Cadastro',
            route: ASSOCIACOES_CADASTRO_ROUTE,
          };
        }
        if (!ACAF_ITEM_SLUGS.has(item.slug) && !LEGACY_ITEM_LABELS.has(item.label)) {
          return item;
        }
        return {
          ...item,
          label: 'ACAF',
          route: ACAF_ASSOCIATION_URL,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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
