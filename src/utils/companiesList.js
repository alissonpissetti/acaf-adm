const PAGE_SIZE = 25;

export const COMPANIES_PAGE_SIZE = PAGE_SIZE;

export function companyMatchesSearch(company, query) {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const qText = trimmed.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const qDigits = trimmed.replace(/\D/g, '');

  const textFields = [
    company.tradeName,
    company.legalName,
    company.email,
    company.phone,
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''));

  if (textFields.some((field) => field.includes(qText))) return true;

  if (qDigits.length >= 3) {
    const cnpjDigits = (company.cnpj ?? '').replace(/\D/g, '');
    if (cnpjDigits.includes(qDigits)) return true;
  }

  return false;
}

export function filterCompanies(companies, { status, query }) {
  return companies.filter((company) => {
    if (status && company.status !== status) return false;
    return companyMatchesSearch(company, query);
  });
}

export function paginateItems(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
    pageSize,
  };
}

export function countCompaniesByStatus(companies) {
  const counts = { total: companies.length, pending: 0, active: 0, suspended: 0 };
  for (const company of companies) {
    if (company.status === 'pending') counts.pending += 1;
    if (company.status === 'active') counts.active += 1;
    if (company.status === 'suspended') counts.suspended += 1;
  }
  return counts;
}

export function companyDisplayName(company) {
  return company?.tradeName?.trim() || company?.legalName?.trim() || 'Sem nome';
}

export function companySecondaryName(company) {
  const trade = company?.tradeName?.trim();
  const legal = company?.legalName?.trim();
  if (trade && legal && trade !== legal) return legal;
  return null;
}

export function companyInitials(company) {
  return personInitials(companyDisplayName(company));
}

export function personInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function sortPeopleByName(people) {
  return [...people].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR', {
      sensitivity: 'base',
    }),
  );
}
