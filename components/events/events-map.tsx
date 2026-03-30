'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Event } from '@/types/events';
import { EVENT_TYPE_LABELS, EVENT_LIFECYCLE_STATUS_LABELS } from '@/types/events';

interface RoutePoint {
  latitude: number;
  longitude: number;
  updateTime: string;
}

export interface MapEvent extends Event {
  latestUpdate?: {
    attendeeCount: number;
    policePresence: boolean;
    streetClosure: boolean;
    updateTime: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  route?: RoutePoint[];
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

// Icono de inicio de marcha: pin hueco con borde del color
const createStartIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="white" stroke="${color}" stroke-width="2.5" d="M12.5 1C6.1 1 1 6.1 1 12.5c0 8.4 11.5 27 11.5 27S24 20.9 24 12.5C24 6.1 18.9 1 12.5 1z"/>
        <circle fill="${color}" cx="12.5" cy="12.5" r="4"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Icono de posición actual de la marcha: pin con pulso visual
const createCurrentPositionIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
        <path fill="${color}" d="M16 0C9.4 0 4 5.4 4 12c0 9.4 12 36 12 36S28 21.4 28 12C28 5.4 22.6 0 16 0z"/>
        <circle fill="white" cx="16" cy="12" r="7"/>
        <circle fill="${color}" cx="16" cy="12" r="4"/>
      </svg>
    `)}`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [1, -40],
  });
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

      {events.map((event) => {
        const color = getEventColor(event.eventType);
        const isMarch = event.eventType === 'marcha';
        const route = event.route ?? [];
        const hasRoute = route.length >= 2;

        // Posición actual: último punto de ruta con coords, o fallback al origen
        const latestLat = event.latestUpdate?.latitude;
        const latestLng = event.latestUpdate?.longitude;
        const currentPos: [number, number] | null =
          latestLat != null && latestLng != null
            ? [Number(latestLat), Number(latestLng)]
            : null;

        const routePositions: [number, number][] = hasRoute
          ? route.map((p) => [Number(p.latitude), Number(p.longitude)])
          : [];

        const eventPopup = (
          <Popup maxWidth={350} minWidth={280}>
            <div className="p-3 w-72">
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

              <h3 className="font-bold text-base mb-1 leading-tight">{event.title}</h3>

              <p className="text-xs text-gray-500 mb-2">
                {EVENT_TYPE_LABELS[event.eventType]} &middot; {event.city?.name || 'Sin ciudad'}
              </p>

              <div className="max-h-32 overflow-y-auto mb-3 pr-1">
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>

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
                {isMarch && route.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span className="text-gray-500">{route.length} pos. registradas</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-400 mt-2">
                {event.address} &middot; {event.createdBy.firstName} {event.createdBy.lastName}
              </p>
            </div>
          </Popup>
        );

        return (
          <span key={event.id}>
            {/* Marcador de origen — para marchas usa icono de inicio, resto el normal */}
            <Marker
              position={[event.latitude, event.longitude]}
              icon={isMarch ? createStartIcon(color) : createCustomIcon(color)}
            >
              {eventPopup}
            </Marker>

            {/* Ruta recorrida */}
            {isMarch && hasRoute && (
              <Polyline
                positions={routePositions}
                pathOptions={{ color, weight: 3, opacity: 0.8, dashArray: '6 4' }}
              />
            )}

            {/* Marcador de posición actual (solo si se movió del origen) */}
            {isMarch && currentPos && (
              <Marker position={currentPos} icon={createCurrentPositionIcon(color)}>
                {eventPopup}
              </Marker>
            )}
          </span>
        );
      })}
    </MapContainer>
  );
}
