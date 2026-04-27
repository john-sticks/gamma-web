'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Event } from '@/types/events';
import { EVENT_TYPE_LABELS, EVENT_LIFECYCLE_STATUS_LABELS } from '@/types/events';

export interface MapEvent extends Event {
  latestUpdate?: {
    attendeeCount: number;
    policePresence: boolean;
    streetClosure: boolean;
    tireBurning: boolean;
    updateTime: string;
  } | null;
}

interface EventsMapProps {
  events: MapEvent[];
  center?: [number, number];
  zoom?: number;
}

function getLifecycleColor(status?: string): string {
  switch (status) {
    case 'ongoing': return 'text-green-600';
    case 'pending': return 'text-blue-600';
    case 'awaiting_start': return 'text-amber-600';
    case 'completed': return 'text-gray-500';
    case 'cancelled': return 'text-red-600';
    default: return 'text-gray-500';
  }
}

// Fix para los iconos de Leaflet en Next.js
const createCustomIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="${color}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle fill="white" cx="12.5" cy="12.5" r="6"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

const getEventColor = (eventType: string): string => {
  const colors: Record<string, string> = {
    manifestacion: '#ef4444', // Red
    marcha: '#f97316', // Orange
    concentracion: '#eab308', // Yellow
    asamblea: '#22c55e', // Green
    otro: '#6366f1', // Indigo
  };
  return colors[eventType] || colors.otro;
};

// Centro de la provincia de Buenos Aires
const BUENOS_AIRES_CENTER: [number, number] = [-36.6, -59.9];
const BUENOS_AIRES_ZOOM = 7;

// Componente para centrar el mapa cuando cambian los eventos
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Estilos para los partidos - solo bordes, no interactivo
const partidoStyle: PathOptions = {
  color: '#3b82f6',
  weight: 1,
  fillColor: 'transparent',
  fillOpacity: 0,
  opacity: 0.4,
  interactive: false,
};

export function EventsMap({ events, center = BUENOS_AIRES_CENTER, zoom = BUENOS_AIRES_ZOOM }: EventsMapProps) {
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount flag for client-side rendering
    setMounted(true);

    fetch('/buenos-aires-partidos.json')
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch(() => {});
  }, []);

  if (!mounted) {
    return <div className="w-full h-full bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full rounded-lg z-0"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} zoom={zoom} />

      {geoData && (
        <GeoJSON
          data={geoData}
          style={partidoStyle}
        />
      )}

      {events.map((event) => (
        <Marker
          key={event.id}
          position={[event.latitude, event.longitude]}
          icon={createCustomIcon(getEventColor(event.eventType))}
        >
          <Popup maxWidth={350} minWidth={280}>
            <div className="p-3 w-72">
              {/* Header: status badge + date */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${getLifecycleColor(event.lifecycleStatus)}`}>
                  {event.lifecycleStatus
                    ? EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus]
                    : 'Sin estado'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(event.eventDate).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-base mb-1 leading-tight">{event.title}</h3>

              {/* Type + city */}
              <p className="text-xs text-gray-500 mb-2">
                {EVENT_TYPE_LABELS[event.eventType]} &middot; {event.city?.name || 'Sin ciudad'}
              </p>

              {/* Description with scroll */}
              <div className="max-h-32 overflow-y-auto mb-3 pr-1">
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs border-t pt-2">
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span className="font-semibold">
                    {event.latestUpdate?.attendeeCount ?? event.attendeeCount ?? 0}
                  </span>
                  <span className="text-gray-500">personas</span>
                </div>
                {event.latestUpdate?.policePresence && (
                  <div className="flex items-center gap-1">
                    <span>🚔</span>
                    <span className="text-gray-500">Policía presente</span>
                  </div>
                )}
                {event.latestUpdate?.streetClosure && (
                  <div className="flex items-center gap-1">
                    <span>🚧</span>
                    <span className="text-gray-500">Corte de calle</span>
                  </div>
                )}
                {event.latestUpdate?.tireBurning && (
                  <div className="flex items-center gap-1">
                    <span>🔥</span>
                    <span className="text-gray-500">Quema de cubiertas</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <p className="text-[11px] text-gray-400 mt-2">
                {event.address} &middot; {event.createdBy.firstName} {event.createdBy.lastName}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
