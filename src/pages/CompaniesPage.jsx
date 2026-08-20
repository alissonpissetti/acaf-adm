import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCompanies } from '../api/admin.js';
import { CompaniesList } from './CompaniesList.jsx';
import { CompanyCreateScreen } from './CompanyCreateScreen.jsx';
import { CompanyEditScreen } from './CompanyEditScreen.jsx';
import { CompanyEmployeeProfileScreen } from './CompanyEmployeeProfileScreen.jsx';

export function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const employeeId = searchParams.get('employee');
  const mode = searchParams.get('mode');
  const isCreating = searchParams.get('new') === '1';
  const isViewing = Boolean(selectedId) && mode === 'view';

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCompanies(await getCompanies());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const goToList = () => {
    setSearchParams({});
    load();
  };

  const goToCreate = () => {
    setSearchParams({ new: '1' });
  };

  const goToEdit = (companyId) => {
    setSearchParams({ id: companyId });
  };

  const goToView = (companyId) => {
    setSearchParams({ id: companyId, mode: 'view' });
  };

  const onCompanyCreated = (company) => {
    load();
    setSearchParams({ id: company.id });
  };

  const goBackToCompany = () => {
    const params = { id: selectedId };
    if (isViewing) params.mode = 'view';
    setSearchParams(params);
  };

  const goToEmployeeProfile = (empId) => {
    const params = { id: selectedId, employee: empId };
    if (isViewing) params.mode = 'view';
    setSearchParams(params);
  };

  if (isCreating) {
    return <CompanyCreateScreen onBack={goToList} onCreated={onCompanyCreated} />;
  }

  if (selectedId && employeeId) {
    return (
      <CompanyEmployeeProfileScreen
        key={`${selectedId}-${employeeId}`}
        companyId={selectedId}
        employeeId={employeeId}
        onBack={goBackToCompany}
      />
    );
  }

  if (selectedId) {
    return (
      <CompanyEditScreen
        key={selectedId}
        companyId={selectedId}
        readOnly={isViewing}
        onBack={goToList}
        onEdit={() => goToEdit(selectedId)}
        onViewEmployee={goToEmployeeProfile}
        onUpdated={load}
        onDeleted={goToList}
      />
    );
  }

  return (
    <CompaniesList
      companies={companies}
      loading={loading}
      error={error}
      onAdd={goToCreate}
      onView={goToView}
      onEdit={goToEdit}
    />
  );
}
