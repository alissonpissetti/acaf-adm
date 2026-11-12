/** @typedef {{ id: string; networkId: string; networkName?: string; unitName: string; city: string; state?: string; latitude?: number; longitude?: number }} MapUnit */

export function unitHasCoordinates(unit) {
  const lat = unit?.latitude;
  const lng = unit?.longitude;
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);
}

export function formatUnitCity(unit) {
  const city = String(unit?.city ?? '').trim();
  const state = String(unit?.state ?? '').trim();
  if (!city) return state || '—';
  if (state && !city.includes('/')) return `${city}/${state}`;
  return city;
}

export function cityFilterKey(unit) {
  return formatUnitCity(unit).toLowerCase();
}

/**
 * @param {MapUnit[]} units
 */
export function aggregateUnitsByCity(units) {
  /** @type {Map<string, { key: string; label: string; count: number; latSum: number; lngSum: number; units: MapUnit[] }>} */
  const byCity = new Map();

  for (const unit of units) {
    if (!unitHasCoordinates(unit)) continue;
    const key = cityFilterKey(unit);
    let row = byCity.get(key);
    if (!row) {
      row = { key, label: formatUnitCity(unit), count: 0, latSum: 0, lngSum: 0, units: [] };
      byCity.set(key, row);
    }
    row.count += 1;
    row.latSum += unit.latitude;
    row.lngSum += unit.longitude;
    row.units.push(unit);
  }

  return [...byCity.values()]
    .map((row) => ({
      key: row.key,
      label: row.label,
      count: row.count,
      latitude: row.latSum / row.count,
      longitude: row.lngSum / row.count,
      units: row.units,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

/** Centro aproximado do Brasil (fallback sem pontos). */
export const BRAZIL_MAP_CENTER = { lat: -14.235, lng: -51.925 };
export const BRAZIL_MAP_ZOOM = 4;

/**
 * @param {{ latitude: number; longitude: number }[]} points
 */
export function boundsFromPoints(points) {
  if (!points.length) return null;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

export function cityBubbleRadius(count) {
  const base = 10;
  const scaled = Math.sqrt(Math.max(1, count)) * 5;
  return Math.min(42, base + scaled);
}

/**
 * Cidades com contagem total de unidades (inclui unidades sem coordenadas).
 * @param {MapUnit[]} units
 */
export function listCityOptions(units) {
  /** @type {Map<string, { key: string; label: string; count: number }>} */
  const byCity = new Map();

  for (const unit of units ?? []) {
    const cityRaw = String(unit?.city ?? '').trim();
    if (!cityRaw) continue;
    const label = formatUnitCity(unit);
    const key = cityFilterKey(unit);
    if (!key) continue;
    let row = byCity.get(key);
    if (!row) {
      row = { key, label, count: 0 };
      byCity.set(key, row);
    }
    row.count += 1;
  }

  return [...byCity.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

/**
 * @param {MapUnit[]} units
 * @param {string} cityKey
 */
export function networkIdsInCity(units, cityKey) {
  if (!cityKey) return null;
  const ids = new Set();
  for (const unit of units ?? []) {
    if (cityFilterKey(unit) === cityKey && unit.networkId) ids.add(unit.networkId);
  }
  return ids;
}
