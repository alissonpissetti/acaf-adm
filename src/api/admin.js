import { fetchApi, fetchApiUpload } from './client.js';

export function getAdminOverview() {
  return fetchApi('/api/admin/overview');
}

export function getNetworks() {
  return fetchApi('/api/admin/networks');
}

export function createNetwork(payload) {
  return fetchApi('/api/admin/networks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateNetwork(id, payload) {
  return fetchApi(`/api/admin/networks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteNetwork(id) {
  return fetchApi(`/api/admin/networks/${id}`, {
    method: 'DELETE',
  });
}

export function uploadNetworkLogo(id, file) {
  const formData = new FormData();
  formData.append('logo', file);
  return fetchApiUpload(`/api/admin/networks/${id}/logo`, formData);
}

export function getUnits(networkId) {
  const query = networkId ? `?networkId=${encodeURIComponent(networkId)}` : '';
  return fetchApi(`/api/admin/units${query}`);
}

export function lookupZip(zip) {
  const digits = String(zip).replace(/\D/g, '');
  return fetchApi(`/api/admin/addresses/zip/${digits}`);
}

export function createUnit(payload) {
  return fetchApi('/api/admin/units', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUnit(id, patch) {
  return fetchApi(`/api/admin/units/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function cancelUnitCheckIn(unitId, entryId) {
  return fetchApi(`/api/admin/units/${unitId}/check-ins/${entryId}`, {
    method: 'DELETE',
  });
}

export function getUnitCheckIns(unitId, { todayOnly = true } = {}) {
  const query = todayOnly ? '?today=1' : '?today=0';
  return fetchApi(`/api/admin/units/${unitId}/check-ins${query}`);
}

export function deleteUnit(id) {
  return fetchApi(`/api/admin/units/${id}`, {
    method: 'DELETE',
  });
}

export function uploadUnitHeroPhoto(id, file) {
  const formData = new FormData();
  formData.append('photo', file);
  return fetchApiUpload(`/api/admin/units/${id}/photos/hero`, formData);
}

export function uploadUnitGalleryPhotos(id, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }
  return fetchApiUpload(`/api/admin/units/${id}/photos/gallery`, formData);
}

export function removeUnitHeroPhoto(id) {
  return fetchApi(`/api/admin/units/${id}/photos/hero`, {
    method: 'DELETE',
  });
}

export function setUnitHeroFromGallery(id, galleryIndex) {
  return fetchApi(`/api/admin/units/${id}/photos/hero`, {
    method: 'PATCH',
    body: JSON.stringify({ galleryIndex }),
  });
}

export function removeUnitGalleryPhoto(id, index) {
  return fetchApi(`/api/admin/units/${id}/photos/gallery/${index}`, {
    method: 'DELETE',
  });
}

export function searchPlatformUsers(query) {
  const q = encodeURIComponent(query);
  return fetchApi(`/api/admin/platform-users/search?q=${q}`);
}

export function createPlatformUser(payload) {
  return fetchApi('/api/admin/platform-users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getUnitPartnerUsers(unitId) {
  return fetchApi(`/api/admin/units/${unitId}/partner-users`);
}

export function addUnitPartnerUser(unitId, payload) {
  return fetchApi(`/api/admin/units/${unitId}/partner-users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeUnitPartnerUser(unitId, userId) {
  return fetchApi(`/api/admin/units/${unitId}/partner-users/${userId}`, {
    method: 'DELETE',
  });
}

export function getConnectDomain() {
  return fetchApi('/api/admin/connect-domain');
}

export function updateConnectDomain(payload) {
  return fetchApi('/api/admin/connect-domain', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listModalities() {
  return fetchApi('/api/admin/modalities');
}

export function createModality(name) {
  return fetchApi('/api/admin/modalities', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function updateModality(id, payload) {
  return fetchApi(`/api/admin/modalities/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteModality(id) {
  return fetchApi(`/api/admin/modalities/${id}`, {
    method: 'DELETE',
  });
}

export function getCompanies(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return fetchApi(`/api/admin/companies${query}`);
}

export function createCompany(payload) {
  return fetchApi('/api/admin/companies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCompany(id) {
  return fetchApi(`/api/admin/companies/${id}`);
}

export function updateCompanyStatus(id, status) {
  return fetchApi(`/api/admin/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function addCompanyManager(companyId, userId) {
  return fetchApi(`/api/admin/companies/${companyId}/access`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function removeCompanyManager(companyId, userId) {
  return fetchApi(`/api/admin/companies/${companyId}/access/${userId}`, {
    method: 'DELETE',
  });
}

export function deleteCompany(id) {
  return fetchApi(`/api/admin/companies/${id}`, {
    method: 'DELETE',
  });
}

export function removeCompanyEmployee(companyId, employeeId) {
  return fetchApi(`/api/admin/companies/${companyId}/employees/${employeeId}`, {
    method: 'DELETE',
  });
}

export function getCompanyEmployeeProfile(companyId, employeeId) {
  return fetchApi(`/api/admin/companies/${companyId}/employees/${employeeId}/profile`);
}
