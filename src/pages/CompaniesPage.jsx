import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCompanies } from '../api/admin.js';
import { CompaniesList } from './CompaniesList.jsx';
import { CompanyEditScreen } from './CompanyEditScreen.jsx';

export function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const statusFilter = searchParams.get('status') ?? '';
  const searchQuery = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') || '1');

  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    getCompanies()
      .then(setCompanies)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const buildListParams = (overrides = {}) => {
    const params = {};
    const status = overrides.status ?? statusFilter;
    const q = overrides.q ?? searchQuery;
    const nextPage = overrides.page ?? page;

    if (status) params.status = status;
    if (q.trim()) params.q = q.trim();
    if (nextPage > 1) params.page = String(nextPage);
    return params;
  };

  const goToList = () => {
    setSearchParams(buildListParams());
    load();
  };

  const goToEdit = (companyId) => {
    setSearchParams({ id: companyId });
  };

  const onFilterChange = (value) => {
    setSearchParams(buildListParams({ status: value, page: 1 }));
  };

  const onSearchChange = (value) => {
    setSearchParams(buildListParams({ q: value, page: 1 }));
  };

  const onPageChange = (nextPage) => {
    setSearchParams(buildListParams({ page: nextPage }));
  };

  if (selectedId) {
    return (
      <CompanyEditScreen
        key={selectedId}
        companyId={selectedId}
        onBack={goToList}
        onUpdated={load}
      />
    );
  }

  return (
    <CompaniesList
      companies={companies}
      statusFilter={statusFilter}
      searchQuery={searchQuery}
      page={page}
      error={error}
      onFilterChange={onFilterChange}
      onSearchChange={onSearchChange}
      onPageChange={onPageChange}
      onEdit={goToEdit}
    />
  );
}
