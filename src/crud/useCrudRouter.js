import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useCrudRouter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get('id');
  const mode = searchParams.get('mode');
  const duplicateId = searchParams.get('duplicate');
  const isCreating = searchParams.get('new') === '1';
  const isViewing = Boolean(id) && mode === 'view';
  const isEditing = Boolean(id) && mode !== 'view' && mode !== 'metrics';
  const isMetrics = Boolean(id) && mode === 'metrics';
  const isList = !id && !isCreating;

  const goToList = () => setSearchParams({});
  const goToCreate = () => setSearchParams({ new: '1' });
  const goToDuplicate = (recordId) => setSearchParams({ new: '1', duplicate: recordId });
  const goToEdit = (recordId) => setSearchParams({ id: recordId });
  const goToView = (recordId) => setSearchParams({ id: recordId, mode: 'view' });
  const goToMetrics = (recordId) => setSearchParams({ id: recordId, mode: 'metrics' });

  return {
    id,
    mode,
    duplicateId,
    isList,
    isCreating,
    isEditing,
    isViewing,
    isMetrics,
    goToList,
    goToCreate,
    goToDuplicate,
    goToEdit,
    goToView,
    goToMetrics,
  };
}

export function useAsyncResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, deps);

  return { data, setData, loading, error, setError, reload };
}
