'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import type { City, Locality } from '@/types/city';
import type { User } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Event, CreateEventDto, EventTitle } from '@/types/events';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

interface EventFormProps {
  event?: Event;
  mode: 'create' | 'edit';
}

export function EventForm({ event, mode }: EventFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isCustomTitle, setIsCustomTitle] = useState(event?.isCustomTitle ?? true);
  const [selectedTitleId, setSelectedTitleId] = useState(event?.eventTitleId || '');
  const [selectedLocalityId, setSelectedLocalityId] = useState(event?.localityId || '');

  const [formData, setFormData] = useState<CreateEventDto>({
    title: event?.title || '',
    description: event?.description || '',
    eventType: event?.eventType || 'manifestacion',
    eventDate: event?.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : '',
    address: event?.address || '',
    cityId: (event as Event & { cityId?: string })?.cityId || '',
    latitude: event?.latitude || -34.6037,
    longitude: event?.longitude || -58.3816,
    attendeeCount: event?.attendeeCount,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json() as Promise<User>;
    },
  });

  // Fetch cities
  const { data: allCities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/cities', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json() as Promise<City[]>;
    },
  });

  // Fetch localities for selected city
  const { data: localities = [] } = useQuery({
    queryKey: ['localities', formData.cityId],
    queryFn: async () => {
      const response = await fetch(`/api/cities/${formData.cityId}/localities`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json() as Promise<Locality[]>;
    },
    enabled: !!formData.cityId,
  });

  // Fetch predefined event titles
  const { data: eventTitles = [] } = useQuery({
    queryKey: ['event-titles'],
    queryFn: async () => {
      const response = await fetch('/api/event-titles', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch event titles');
      return response.json() as Promise<EventTitle[]>;
    },
  });

  // Filter cities based on user role
  const cities = currentUser?.role === 'level_4'
    ? (currentUser.assignedCities || [])
    : allCities;

  // Load GeoJSON for coordinate validation
  const geoJsonRef = useRef<FeatureCollection<Polygon | MultiPolygon> | null>(null);
  useEffect(() => {
    fetch('/buenos-aires-partidos.json')
      .then((res) => res.json())
      .then((data) => {
        geoJsonRef.current = data;
      })
      .catch(() => {
        // Silently fail - validation will be skipped
      });
  }, []);

  const NAME_EXCEPTIONS: Record<string, string> = useMemo(() => ({
    'CORONEL ROSALES': 'CORONEL DE MARINA LEONARDO ROSALES',
    'JOSE C. PAZ': 'JOSE C PAZ',
    'LEANDRO N. ALEM': 'LEANDRO N ALEM',
    'NUEVE DE JULIO': '9 DE JULIO',
    'VEINTICINCO DE MAYO': '25 DE MAYO',
  }), []);

  const [coordsWarning, setCoordsWarning] = useState('');

  function validateCoordsInPartido(lat: number, lng: number, cityId: string) {
    if (!geoJsonRef.current || !cityId) {
      setCoordsWarning('');
      return;
    }

    const selectedCity = cities.find((c) => c.id === cityId);
    if (!selectedCity) {
      setCoordsWarning('');
      return;
    }

    const upperName = selectedCity.name.toUpperCase().trim();
    const normalizedName = NAME_EXCEPTIONS[upperName] || upperName;

    const feature = geoJsonRef.current.features.find(
      (f) => (f.properties?.departamento || '').toUpperCase().trim() === normalizedName,
    );

    if (!feature) {
      setCoordsWarning('');
      return;
    }

    const pt = point([lng, lat]);
    const inside = booleanPointInPolygon(pt, feature as Feature<Polygon | MultiPolygon>);

    if (!inside) {
      setCoordsWarning(
        `Las coordenadas no parecen estar dentro de "${selectedCity.name}". Verificá que sean correctas antes de enviar.`,
      );
    } else {
      setCoordsWarning('');
    }
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateEventDto) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          eventDate: new Date(data.eventDate).toISOString(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento creado exitosamente');
      router.push('/dashboard/super-admin/events');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear el evento');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CreateEventDto) => {
      const response = await fetch(`/api/events/${event?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          eventDate: new Date(data.eventDate).toISOString(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Evento actualizado exitosamente');
      router.push('/dashboard/super-admin/events');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar el evento');
    },
  });

  const [cityError, setCityError] = useState(false);
  const [coordsInput, setCoordsInput] = useState(
    event ? `${event.latitude}, ${event.longitude}` : ''
  );
  const [coordsError, setCoordsError] = useState('');

  function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
    const cleaned = value.trim();
    if (!cleaned) return null;

    // Supports: "-38.571536, -58.735880" or "-38.571536 -58.735880"
    const match = cleaned.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (!match) return null;

    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { latitude: lat, longitude: lng };
  }

  function handleCoordsChange(value: string) {
    setCoordsInput(value);
    setCoordsError('');

    const parsed = parseCoordinates(value);
    if (parsed) {
      setFormData((prev) => ({ ...prev, latitude: parsed.latitude, longitude: parsed.longitude }));
      validateCoordsInPartido(parsed.latitude, parsed.longitude, formData.cityId);
    } else {
      setCoordsWarning('');
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cityId) {
      setCityError(true);
      return;
    }
    setCityError(false);

    const parsed = parseCoordinates(coordsInput);
    if (!parsed) {
      setCoordsError('Formato inválido. Pegá las coordenadas así: -38.571536, -58.735880');
      return;
    }
    // Block submission if coordinates are outside the selected partido
    if (coordsWarning) {
      setCoordsError('Las coordenadas no corresponden al partido seleccionado. Corregí las coordenadas o cambiá el partido.');
      return;
    }

    const submitData = {
      ...formData,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      isCustomTitle,
      ...(isCustomTitle ? {} : { eventTitleId: selectedTitleId }),
      ...(selectedLocalityId ? { localityId: selectedLocalityId } : {}),
    };
    if (mode === 'create') {
      createMutation.mutate(submitData);
    } else {
      updateMutation.mutate(submitData);
    }
  };

  const mutation = mode === 'create' ? createMutation : updateMutation;

  // Check if level_4 user has no assigned cities
  const isLevel4WithoutCities = currentUser?.role === 'level_4' && cities.length === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isLevel4WithoutCities && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No tienes ciudades asignadas.</strong> Contacta al administrador para que te asigne ciudades y puedas crear eventos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>
            Datos básicos del evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Select
              value={isCustomTitle ? '__custom__' : selectedTitleId}
              onValueChange={(value) => {
                if (value === '__custom__') {
                  setIsCustomTitle(true);
                  setSelectedTitleId('');
                  setFormData({ ...formData, title: '' });
                } else {
                  setIsCustomTitle(false);
                  setSelectedTitleId(value);
                  const selected = eventTitles.find((t) => t.id === value);
                  if (selected) {
                    setFormData({ ...formData, title: selected.name });
                  }
                }
              }}
              disabled={isLevel4WithoutCities}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar título..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {eventTitles.map((title) => (
                  <SelectItem key={title.id} value={title.id}>
                    {title.name}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Otro (personalizado)</SelectItem>
              </SelectContent>
            </Select>
            {isCustomTitle && (
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Escribí el título del evento..."
                required
                maxLength={255}
                disabled={isLevel4WithoutCities}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe el evento en detalle..."
              required
              className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLevel4WithoutCities}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Tipo de Evento *</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value as Event['eventType'] })}
                disabled={isLevel4WithoutCities}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Fecha y Hora *</Label>
              <Input
                id="eventDate"
                type="datetime-local"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
                disabled={isLevel4WithoutCities}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendeeCount">Asistentes Estimados</Label>
            <Input
              id="attendeeCount"
              type="number"
              min="0"
              value={formData.attendeeCount || ''}
              onChange={(e) => setFormData({
                ...formData,
                attendeeCount: e.target.value ? parseInt(e.target.value) : undefined
              })}
              placeholder="Número aproximado de asistentes"
              disabled={isLevel4WithoutCities}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
          <CardDescription>
            Especifica dónde se realizará el evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. de Mayo 1370"
              required
              maxLength={500}
              disabled={isLevel4WithoutCities}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad *</Label>
            {currentUser?.role === 'level_4' && cities.length > 0 && (
              <Alert className="flex flex-row items-center gap-2">
                <div className='text-red-500'>
                  <AlertCircle className="h-4 w-4 " />
                </div>
                
                <AlertDescription>
                  Solo puedes crear eventos en las ciudades asignadas a tu cuenta:{' '}
                  {cities.map((c) => c.name).join(', ')}
                </AlertDescription>
              </Alert>
            )}
            <Select
              value={formData.cityId}
              onValueChange={(value) => {
                setFormData({ ...formData, cityId: value });
                setCityError(false);
                setSelectedLocalityId(''); // Reset locality when city changes
                const parsed = parseCoordinates(coordsInput);
                if (parsed) {
                  validateCoordsInPartido(parsed.latitude, parsed.longitude, value);
                }
              }}
              disabled={isLevel4WithoutCities}
            >
              <SelectTrigger className={cityError ? 'border-destructive' : ''}>
                <SelectValue placeholder={
                  cities.length === 0
                    ? 'No hay ciudades disponibles'
                    : 'Seleccionar ciudad...'
                } />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cityError && (
              <p className="text-sm text-destructive">Se necesita agregar una localidad</p>
            )}
          </div>

          {formData.cityId && localities.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="locality">Localidad</Label>
              <Select
                value={selectedLocalityId || '__none__'}
                onValueChange={(value) => setSelectedLocalityId(value === '__none__' ? '' : value)}
                disabled={isLevel4WithoutCities}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar localidad..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="__none__">Sin especificar</SelectItem>
                  {localities.map((locality) => (
                    <SelectItem key={locality.id} value={locality.id}>
                      {locality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="coordinates">Coordenadas *</Label>
            <Input
              id="coordinates"
              value={coordsInput}
              onChange={(e) => handleCoordsChange(e.target.value)}
              placeholder="Ej: -38.571536, -58.735880"
              required
              disabled={isLevel4WithoutCities}
              className={coordsError ? 'border-destructive' : ''}
            />
            {coordsError && (
              <p className="text-sm text-destructive">{coordsError}</p>
            )}
            {coordsWarning && !coordsError && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{coordsWarning}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Copiá las coordenadas de{' '}
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Maps
              </a>
              {' '}(clic derecho en el mapa) y pegalas directamente acá.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending || isLevel4WithoutCities}>
          {mutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {mutation.isPending
            ? mode === 'create'
              ? 'Creando...'
              : 'Guardando...'
            : mode === 'create'
            ? 'Crear Evento'
            : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
