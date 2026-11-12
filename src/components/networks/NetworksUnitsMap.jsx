import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import '../../styles/networks-map.css';
import { getUnits } from '../../api/admin.js';
import { AppLoadingPanel } from '../crud/AppLoading.jsx';
import {
  aggregateUnitsByCity,
  boundsFromPoints,
  BRAZIL_MAP_CENTER,
  BRAZIL_MAP_ZOOM,
  cityBubbleRadius,
  cityFilterKey,
  formatUnitCity,
  listCityOptions,
  unitHasCoordinates,
} from '../../utils/networksMapGeo.js';
import {
  readNetworksMapExpanded,
  writeNetworksMapExpanded,
} from '../../utils/networksPageStorage.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  iconShadow: markerShadow,
});

function MapFitBounds({ points, resetKey }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView([BRAZIL_MAP_CENTER.lat, BRAZIL_MAP_CENTER.lng], BRAZIL_MAP_ZOOM);
      return;
    }
    const bounds = boundsFromPoints(points);
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, points, resetKey]);

  return null;
}

/**
 * @param {{
 *   onOpenUnit?: (networkId: string, unitId: string) => void;
 *   units?: import('../../utils/networksMapGeo.js').MapUnit[];
 *   unitsLoading?: boolean;
 *   onReloadUnits?: () => void | Promise<void>;
 *   cityFilter?: string;
 *   onCityFilterChange?: (cityKey: string) => void;
 *   layerMode?: 'units' | 'cities';
 *   onLayerModeChange?: (mode: 'units' | 'cities') => void;
 *   networkIdsFilter?: Set<string> | null;
 * }} props
 */
export function NetworksUnitsMap({
  onOpenUnit,
  units: unitsProp,
  unitsLoading = false,
  onReloadUnits,
  cityFilter: cityFilterProp,
  onCityFilterChange,
  layerMode: layerModeProp,
  onLayerModeChange,
  networkIdsFilter = null,
}) {
  const [unitsLocal, setUnitsLocal] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(!unitsProp);
  const [error, setError] = useState('');
  const [layerModeLocal, setLayerModeLocal] = useState('units');
  const [cityFilterLocal, setCityFilterLocal] = useState('');
  const [mapExpanded, setMapExpanded] = useState(() => readNetworksMapExpanded());

  const units = unitsProp ?? unitsLocal;
  const loading = unitsProp ? unitsLoading : loadingLocal;
  const layerMode = layerModeProp ?? layerModeLocal;
  const cityFilter = cityFilterProp ?? cityFilterLocal;

  const setLayerMode = (mode) => {
    onLayerModeChange?.(mode);
    if (layerModeProp === undefined) setLayerModeLocal(mode);
  };

  const setCityFilter = (key) => {
    onCityFilterChange?.(key);
    if (cityFilterProp === undefined) setCityFilterLocal(key);
  };

  const load = useCallback(async () => {
    if (unitsProp) {
      await onReloadUnits?.();
      return;
    }
    setLoadingLocal(true);
    setError('');
    try {
      const rows = await getUnits();
      setUnitsLocal(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message ?? 'Não foi possível carregar unidades.');
      setUnitsLocal([]);
    } finally {
      setLoadingLocal(false);
    }
  }, [onReloadUnits, unitsProp]);

  useEffect(() => {
    if (unitsProp) return;
    void load();
  }, [load, unitsProp]);

  useEffect(() => {
    writeNetworksMapExpanded(mapExpanded);
  }, [mapExpanded]);

  const scopedUnits = useMemo(() => {
    if (!networkIdsFilter?.size) return units;
    return units.filter((u) => u.networkId && networkIdsFilter.has(u.networkId));
  }, [units, networkIdsFilter]);

  const withCoords = useMemo(() => scopedUnits.filter(unitHasCoordinates), [scopedUnits]);
  const missingCount = scopedUnits.length - withCoords.length;

  const cityOptions = useMemo(() => listCityOptions(scopedUnits), [scopedUnits]);

  const cityLabelByKey = useMemo(
    () => new Map(cityOptions.map((c) => [c.key, c.label])),
    [cityOptions],
  );

  const filteredUnits = useMemo(() => {
    if (!cityFilter) return withCoords;
    return withCoords.filter((u) => cityFilterKey(u) === cityFilter);
  }, [withCoords, cityFilter]);

  const cityAggregates = useMemo(() => {
    const all = aggregateUnitsByCity(withCoords);
    if (!cityFilter) return all;
    return all.filter((c) => c.key === cityFilter);
  }, [withCoords, cityFilter]);

  const fitPoints = useMemo(() => {
    if (layerMode === 'cities') {
      return cityAggregates.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
    }
    return filteredUnits.map((u) => ({ latitude: u.latitude, longitude: u.longitude }));
  }, [layerMode, cityAggregates, filteredUnits]);

  const fitKey = `${layerMode}|${cityFilter}|${networkIdsFilter?.size ?? 'all'}|${fitPoints.length}`;

  const openUnit = (unit) => {
    if (onOpenUnit && unit.networkId && unit.id) {
      onOpenUnit(unit.networkId, unit.id);
    }
  };

  const collapsedSummary = useMemo(() => {
    const parts = [
      `${withCoords.length} unidade(s) com coordenadas`,
      scopedUnits.length ? `de ${scopedUnits.length} no escopo` : null,
      layerMode === 'cities' ? 'camada: por cidade' : 'camada: unidades',
      cityFilter ? `cidade: ${cityLabelByKey.get(cityFilter) ?? cityFilter}` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [withCoords.length, scopedUnits.length, layerMode, cityFilter, cityLabelByKey]);

  return (
    <section
      className={`panel networks-map-panel networks-map-collapsible address-fields-collapsible ${
        mapExpanded ? 'is-expanded' : 'is-collapsed'
      }`}
      aria-label="Mapa de unidades"
    >
      <button
        type="button"
        className="collapsible-header networks-map-collapsible-trigger"
        onClick={() => setMapExpanded((open) => !open)}
        aria-expanded={mapExpanded}
      >
        <span className="collapsible-header-main">
          <strong>Mapa — cobertura geográfica</strong>
          {!mapExpanded ? <span className="collapsible-summary">{collapsedSummary}</span> : null}
        </span>
        <span className="collapsible-chevron" aria-hidden>
          {mapExpanded ? '▾' : '▸'}
        </span>
      </button>

      {mapExpanded ? (
        <header className="panel-header panel-header--meta-only networks-map-header">
        <div>
          <p className="panel-subtitle muted">
            {withCoords.length} unidade(s) com coordenadas
            {scopedUnits.length ? ` de ${scopedUnits.length} no escopo` : ''}
            {cityFilter ? ` · filtro: ${cityLabelByKey.get(cityFilter) ?? cityFilter}` : ''}
          </p>
        </div>
        <div className="networks-map-toolbar">
          <h3 className="visually-hidden">Camada e filtros do mapa</h3>
          <div className="networks-map-layer-toggle" role="group" aria-label="Camada do mapa">
            <button
              type="button"
              className={`btn-ghost btn-sm${layerMode === 'units' ? ' is-active' : ''}`}
              aria-pressed={layerMode === 'units'}
              onClick={() => setLayerMode('units')}
            >
              Unidades (pins)
            </button>
            <button
              type="button"
              className={`btn-ghost btn-sm${layerMode === 'cities' ? ' is-active' : ''}`}
              aria-pressed={layerMode === 'cities'}
              onClick={() => setLayerMode('cities')}
            >
              Por cidade
            </button>
          </div>
          <label className="networks-map-city-filter">
            <span className="muted">Cidade</span>
            <select
              className="input"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Filtrar por cidade"
            >
              <option value="">Todas as cidades</option>
              {cityOptions.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} ({c.count})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-ghost btn-sm" disabled={loading} onClick={() => void load()}>
            Atualizar
          </button>
        </div>
      </header>
      ) : null}

      {mapExpanded ? (
      <div className="panel-body networks-map-body">
        {error ? <p className="error-text">{error}</p> : null}
        {missingCount > 0 ? (
          <p className="muted networks-map-missing" role="status">
            {missingCount} unidade(s) sem latitude/longitude — não exibidas no mapa. Confira o endereço na ficha da
            unidade; novas unidades são geocodificadas ao salvar.
          </p>
        ) : null}

        {loading ? (
          <AppLoadingPanel label="Carregando unidades no mapa…" />
        ) : (
          <>
            <div className="networks-map-legend muted">
              {layerMode === 'units' ? (
                <span>Pins agrupados em clusters ao aproximar o zoom · clique no pin para ver rede e cidade</span>
              ) : (
                <span>Tamanho do círculo ≈ quantidade de unidades na cidade (centroide médio)</span>
              )}
            </div>
            <MapContainer
              className="networks-map-canvas"
              center={[BRAZIL_MAP_CENTER.lat, BRAZIL_MAP_CENTER.lng]}
              zoom={BRAZIL_MAP_ZOOM}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapFitBounds points={fitPoints} resetKey={fitKey} />

              {layerMode === 'units' ? (
                <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
                  {filteredUnits.map((unit) => (
                    <Marker key={unit.id} position={[unit.latitude, unit.longitude]}>
                      <Popup>
                        <div className="networks-map-popup">
                          <strong>{unit.unitName}</strong>
                          <div className="muted">{unit.networkName ?? unit.networkId}</div>
                          <div>{formatUnitCity(unit)}</div>
                          {onOpenUnit ? (
                            <button type="button" className="btn-ghost btn-sm networks-map-popup-link" onClick={() => openUnit(unit)}>
                              Abrir unidade
                            </button>
                          ) : null}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              ) : (
                cityAggregates.map((city) => (
                  <CircleMarker
                    key={city.key}
                    center={[city.latitude, city.longitude]}
                    radius={cityBubbleRadius(city.count)}
                    pathOptions={{
                      color: '#5b21b6',
                      fillColor: '#a78bfa',
                      fillOpacity: 0.55,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="networks-map-popup">
                        <strong>{city.label}</strong>
                        <div>
                          {city.count} unidade{city.count === 1 ? '' : 's'}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost btn-sm networks-map-popup-link"
                          onClick={() => setCityFilter(city.key)}
                        >
                          Focar nesta cidade
                        </button>
                        {city.units.length <= 8 ? (
                          <ul className="networks-map-city-list">
                            {city.units.map((u) => (
                              <li key={u.id}>
                                {u.unitName}
                                <span className="muted"> — {u.networkName ?? u.networkId}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">Use o filtro de cidade ou a camada de unidades para ver cada pin.</p>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))
              )}
            </MapContainer>
          </>
        )}
      </div>
      ) : null}
    </section>
  );
}
