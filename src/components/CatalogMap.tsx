import { useEffect, useRef } from "react";
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { BBox, CatalogRecord } from "../types";

type CatalogMapProps = {
  records: CatalogRecord[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onBoundsChange: (bounds: BBox | null) => void;
  fitRequest: number;
};

function polygonPositions(record: CatalogRecord) {
  return record.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number]);
}

function createBounds(records: CatalogRecord[]) {
  const points = records.flatMap((record) => polygonPositions(record));
  return points.length ? new LatLngBounds(points) : null;
}

function MapBridge({
  records,
  selectedId,
  onBoundsChange,
  fitRequest,
}: {
  records: CatalogRecord[];
  selectedId: string | null;
  onBoundsChange: (bounds: BBox | null) => void;
  fitRequest: number;
}) {
  const map = useMap();
  const didInitialFit = useRef(false);

  useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onBoundsChange([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
    },
  });

  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (!didInitialFit.current && records.length) {
      const bounds = createBounds(records);
      if (bounds) {
        map.fitBounds(bounds.pad(0.2), { animate: false });
      }
      didInitialFit.current = true;
    }
  }, [map, records]);

  useEffect(() => {
    if (!fitRequest || !records.length) {
      return;
    }

    const bounds = createBounds(records);
    if (bounds) {
      map.fitBounds(bounds.pad(0.2), { animate: true, duration: 0.4 });
    }
  }, [fitRequest, map, records]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedRecord = records.find((record) => record.id === selectedId);
    if (!selectedRecord) {
      return;
    }

    const bounds = createBounds([selectedRecord]);
    if (bounds) {
      map.flyToBounds(bounds.pad(0.6), { duration: 0.45 });
    }
  }, [map, records, selectedId]);

  return null;
}

export function CatalogMap({
  records,
  selectedId,
  hoveredId,
  onSelect,
  onBoundsChange,
  fitRequest,
}: CatalogMapProps) {
  return (
    <section className="panel map-panel">
      <div className="map-panel-header">
        <div>
          <p className="eyebrow">Coverage viewer</p>
          <h2>Карта охватов</h2>
        </div>
        <div className="legend">
          <span>
            <i className="legend-swatch legend-swatch-default" />
            каталог
          </span>
          <span>
            <i className="legend-swatch legend-swatch-hover" />
            hover
          </span>
          <span>
            <i className="legend-swatch legend-swatch-selected" />
            выбранный
          </span>
        </div>
      </div>

      <div className="map-shell">
        <MapContainer
          className="map"
          center={[55.751244, 37.618423]}
          zoom={2}
          scrollWheelZoom
          preferCanvas
          worldCopyJump
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapBridge
            records={records}
            selectedId={selectedId}
            onBoundsChange={onBoundsChange}
            fitRequest={fitRequest}
          />
          {records.map((record) => {
            const isSelected = record.id === selectedId;
            const isHovered = record.id === hoveredId;

            return (
              <Polygon
                key={record.id}
                positions={polygonPositions(record)}
                pathOptions={{
                  color: isSelected ? "#e1793c" : isHovered ? "#0c7b6a" : "#1f5d55",
                  fillColor: isSelected ? "#e1793c" : isHovered ? "#0c7b6a" : "#1f5d55",
                  fillOpacity: isSelected ? 0.38 : isHovered ? 0.28 : 0.16,
                  weight: isSelected ? 2.4 : 1.3,
                }}
                eventHandlers={{
                  click: () => onSelect(record.id),
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}

