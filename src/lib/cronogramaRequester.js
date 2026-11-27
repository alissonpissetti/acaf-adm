const DEFAULT_PREFIX = 'alisson';

/**
 * Usuário solicitante padrão do cronograma (nome começa com Alisson).
 */
export function defaultCronogramaRequesterId(adminUsers) {
  if (!Array.isArray(adminUsers) || !adminUsers.length) return null;
  return (
    adminUsers.find((u) => u?.name?.trim().toLowerCase().startsWith(DEFAULT_PREFIX))?.id ?? null
  );
}