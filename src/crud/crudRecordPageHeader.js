/**
 * Títulos e breadcrumbs padronizados para criar / visualizar / editar registro.
 * Evita repetir o nome do registro no `h1` (fica no breadcrumb + subtítulo).
 *
 * @see docs/PREMISSAS-VISUAIS.md — Padrão CRUD universal
 */

/**
 * @param {{
 *   listLabel: string,
 *   goToList: () => void,
 *   /** Ex.: "modalidade", "plano de assinatura" *\/
 *   entityLabel: string,
 *   recordName: string,
 *   mode: 'view' | 'edit',
 *   /** Linha abaixo do h1; padrão = nome do registro *\/
 *   subtitle?: string,
 *   /** Itens antes do link para a lista (ex.: módulo pai). *\/
 *   breadcrumbPrefix?: Array<{ label: string, onClick?: () => void, to?: string }>,
 * }} opts
 */
export function buildCrudRecordPageHeader({
  listLabel,
  goToList,
  entityLabel,
  recordName,
  mode,
  subtitle,
  breadcrumbPrefix,
}) {
  const verb = mode === 'view' ? 'Visualizar' : 'Editar';
  const name = String(recordName ?? '').trim() || '—';
  return {
    title: `${verb} ${entityLabel}`,
    subtitle: subtitle ?? name,
    breadcrumbs: [
      ...(breadcrumbPrefix ?? []),
      { label: listLabel, onClick: goToList },
      { label: name },
    ],
  };
}

/**
 * @param {{
 *   listLabel: string,
 *   goToList: () => void,
 *   entityLabel: string,
 *   subtitle: string,
 *   /** Padrão `Novo`; use `Nova` quando a entidade for feminina. *\/
 *   createBreadcrumbLabel?: string,
 * }} opts
 */
export function buildCrudCreatePageHeader({
  listLabel,
  goToList,
  entityLabel,
  subtitle,
  createBreadcrumbLabel = 'Novo',
}) {
  return {
    title: `Adicionar ${entityLabel}`,
    subtitle,
    breadcrumbs: [
      { label: listLabel, onClick: goToList },
      { label: createBreadcrumbLabel },
    ],
  };
}