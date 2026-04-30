'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, X, Eye, Loader2, Filter, ChevronDown, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import type { Event } from '@/types/events';
import { EVENT_TYPE_LABELS } from '@/types/events';
import { WhatsAppShareButton } from '@/components/events/whatsapp-share-button';
import type { City, Locality } from '@/types/city';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    pendingCount?: number;
  };
}

interface EditFormData {
  title: string;
  description: string;
  eventType: Event['eventType'];
  eventDate: string;
  address: string;
  attendeeCount: number | undefined;
  latitude: number;
  longitude: number;
}

export function PendingEventsManagement() {
  const queryClient = useQueryClient();
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState<string[]>([]);
  const [filterLocality, setFilterLocality] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [coordsInput, setCoordsInput] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on filter change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [filterType, filterCity, filterLocality, dateFrom, dateTo]);

  // Reset locality when city changes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFilterLocality('all'); }, [filterCity]);

  // Close city dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch cities
  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const r = await fetch('/api/cities', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<City[]>;
    },
  });

  // Fetch localities for selected cities
  const { data: localities = [] } = useQuery({
    queryKey: ['localities-filter', filterCity],
    queryFn: async () => {
      const results = await Promise.all(
        filterCity.map((cityId) =>
          fetch(`/api/cities/${cityId}/localities`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() as Promise<Locality[]> : [])
        )
      );
      return results.flat();
    },
    enabled: filterCity.length > 0,
  });

  function toggleCitySelection(cityId: string) {
    setFilterCity((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  }

  const activeFiltersCount = [
    filterType !== 'all',
    filterCity.length > 0,
    filterLocality !== 'all',
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  function openEventDialog(event: Event) {
    setSelectedEvent(event);
    setEditForm({
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      address: event.address,
      attendeeCount: event.attendeeCount,
      latitude: event.latitude,
      longitude: event.longitude,
    });
    setCoordsInput(`${event.latitude}, ${event.longitude}`);
    setViewDialogOpen(true);
  }

  // Fetch pending events
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'pending', page, limit, debouncedSearch, filterType, filterCity, filterLocality, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterType !== 'all' && { eventType: filterType }),
        ...(filterLocality !== 'all' && { locality: filterLocality }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      if (filterCity.length > 0) params.append('city', filterCity.join(','));

      const response = await fetch(`/api/events/pending?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pending events');
      return response.json() as Promise<PaginatedResponse<Event>>;
    },
  });

  // Approve/Reject mutation (simple status change)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update event status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Estado actualizado');
    },
  });

  // Save and approve mutation (edit fields + approve)
  const saveAndApproveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...data, status: 'approved' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save and approve event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setViewDialogOpen(false);
      setSelectedEvent(null);
      toast.success('Evento editado y aprobado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al guardar y aprobar');
    },
  });

  function handleApprove(event: Event) {
    updateStatusMutation.mutate({ id: event.id, status: 'approved' });
  }

  function handleReject(event: Event) {
    updateStatusMutation.mutate({ id: event.id, status: 'rejected' });
  }

  // Check if form has changes compared to original event
  function hasChanges(): boolean {
    if (!editForm || !selectedEvent) return false;
    return (
      editForm.title !== selectedEvent.title ||
      editForm.description !== selectedEvent.description ||
      editForm.eventType !== selectedEvent.eventType ||
      editForm.eventDate !== new Date(selectedEvent.eventDate).toISOString().slice(0, 16) ||
      editForm.address !== selectedEvent.address ||
      editForm.attendeeCount !== selectedEvent.attendeeCount ||
      editForm.latitude !== selectedEvent.latitude ||
      editForm.longitude !== selectedEvent.longitude
    );
  }

  // Get changed fields only
  function getChangedFields(): Record<string, unknown> {
    if (!editForm || !selectedEvent) return {};
    const changes: Record<string, unknown> = {};
    if (editForm.title !== selectedEvent.title) changes.title = editForm.title;
    if (editForm.description !== selectedEvent.description) changes.description = editForm.description;
    if (editForm.eventType !== selectedEvent.eventType) changes.eventType = editForm.eventType;
    if (editForm.eventDate !== new Date(selectedEvent.eventDate).toISOString().slice(0, 16)) {
      changes.eventDate = new Date(editForm.eventDate).toISOString();
    }
    if (editForm.address !== selectedEvent.address) changes.address = editForm.address;
    if (editForm.attendeeCount !== selectedEvent.attendeeCount) changes.attendeeCount = editForm.attendeeCount;
    if (editForm.latitude !== selectedEvent.latitude) changes.latitude = editForm.latitude;
    if (editForm.longitude !== selectedEvent.longitude) changes.longitude = editForm.longitude;
    return changes;
  }

  function handleCoordsChange(value: string) {
    setCoordsInput(value);
    const match = value.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setEditForm((prev) => prev ? { ...prev, latitude: lat, longitude: lng } : prev);
      }
    }
  }

  function handleSaveAndApprove() {
    if (!selectedEvent || !editForm) return;
    const changes = getChangedFields();
    saveAndApproveMutation.mutate({ id: selectedEvent.id, data: changes });
  }

  const isMutating = updateStatusMutation.isPending || saveAndApproveMutation.isPending;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Eventos Pendientes</h1>
          <p className="text-muted-foreground mt-2">
            Revisa y aprueba eventos creados por usuarios
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0 relative"
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="pt-0 space-y-4 border-t">
              <div className="flex flex-wrap gap-3 pt-4">
                {/* Event Type */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="manifestacion">Manifestación</SelectItem>
                    <SelectItem value="marcha">Marcha</SelectItem>
                    <SelectItem value="concentracion">Concentración</SelectItem>
                    <SelectItem value="asamblea">Asamblea</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>

                {/* City multi-select */}
                <div className="relative w-[200px]" ref={cityDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowCityDropdown(!showCityDropdown); if (showCityDropdown) setCitySearch(''); }}
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filterCity.length === 0 ? 'Todas las ciudades' : `${filterCity.length} ciudad${filterCity.length > 1 ? 'es' : ''}`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                  {showCityDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Buscar ciudad..."
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-8 pl-7 text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto p-1">
                        {filterCity.length > 0 && (
                          <button type="button" onClick={() => setFilterCity([])} className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm mb-1 text-destructive">
                            Limpiar selección
                          </button>
                        )}
                        {cities.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase())).map((city) => (
                          <label key={city.id} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer">
                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${filterCity.includes(city.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                              {filterCity.includes(city.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <input type="checkbox" checked={filterCity.includes(city.id)} onChange={() => toggleCitySelection(city.id)} className="sr-only" />
                            <span className={filterCity.includes(city.id) ? 'font-medium' : ''}>{city.name}</span>
                          </label>
                        ))}
                        {cities.filter((c) => c.name.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                          <p className="px-2 py-3 text-sm text-muted-foreground text-center">Sin resultados</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Locality */}
                <Select value={filterLocality} onValueChange={(v) => { setFilterLocality(v); setLocalitySearch(''); }} disabled={filterCity.length === 0}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={filterCity.length === 0 ? 'Seleccioná una ciudad' : 'Todas las localidades'} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 bg-popover p-1 border-b mb-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Buscar localidad..." value={localitySearch} onChange={(e) => setLocalitySearch(e.target.value)} onKeyDown={(e) => e.stopPropagation()} className="h-8 pl-7 text-sm" />
                      </div>
                    </div>
                    <SelectItem value="all">Todas las localidades</SelectItem>
                    {localities.filter((l) => l.name.toLowerCase().includes(localitySearch.toLowerCase())).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date range */}
                <div className="flex items-center gap-2">
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" placeholder="Desde" />
                  <span className="text-muted-foreground text-sm">—</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" placeholder="Hasta" />
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterCity([]); setFilterLocality('all'); setDateFrom(''); setDateTo(''); }}>
                    <X className="h-4 w-4 mr-1" /> Limpiar
                  </Button>
                )}
              </div>

              {/* City chips */}
              {filterCity.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterCity.map((cityId) => {
                    const city = cities.find((c) => c.id === cityId);
                    if (!city) return null;
                    return (
                      <Badge key={cityId} variant="secondary" className="flex items-center gap-1 pr-1">
                        <MapPin className="h-3 w-3" />
                        <span>{city.name}</span>
                        <button type="button" onClick={() => toggleCitySelection(cityId)} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Eventos Pendientes ({eventsResponse?.meta.pendingCount ?? eventsResponse?.meta.total ?? 0})
            </CardTitle>
            <CardDescription>
              Estos eventos esperan aprobación para ser publicados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando eventos...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Creador</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay eventos pendientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventsResponse?.data.map((event) => {
                        const isResolved = event.status === 'approved' || event.status === 'rejected';
                        return (
                        <TableRow key={event.id} className={isResolved ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {isResolved && (
                                <Badge variant={event.status === 'approved' ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                                  {event.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                </Badge>
                              )}
                              <span className={isResolved ? 'line-through text-muted-foreground' : ''}>{event.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {EVENT_TYPE_LABELS[event.eventType]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(event.eventDate).toLocaleDateString('es-AR')}
                          </TableCell>
                          <TableCell className="max-w-50 truncate">
                            {event.city?.name || 'Sin ciudad'}
                            {event.locality && (
                              <span className="text-xs text-muted-foreground block">
                                {event.locality.name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {event.createdBy.firstName} {event.createdBy.lastName}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!isResolved && <WhatsAppShareButton event={event} />}
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openEventDialog(event)}
                                className='hover:cursor-pointer'
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isResolved && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-green-600 hover:bg-green-400 hover:cursor-pointer"
                                    onClick={() => handleApprove(event)}
                                    disabled={isMutating}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-red-600 hover:bg-red-400 hover:cursor-pointer"
                                    onClick={() => handleReject(event)}
                                    disabled={isMutating}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {eventsResponse && eventsResponse.meta.totalPages > 1 && (
                  <Pagination
                    currentPage={eventsResponse.meta.page}
                    totalPages={eventsResponse.meta.totalPages}
                    hasNextPage={eventsResponse.meta.hasNextPage}
                    hasPreviousPage={eventsResponse.meta.hasPreviousPage}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit & Approve Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Evento</DialogTitle>
            <DialogDescription>
              Puedes editar los campos antes de aprobar o rechazar
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md bg-background text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={editForm.eventType}
                    onValueChange={(value) => setEditForm({ ...editForm, eventType: value as Event['eventType'] })}
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
                  <Label htmlFor="edit-date">Fecha y Hora</Label>
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    value={editForm.eventDate}
                    onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Dirección</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-coords">Coordenadas</Label>
                <Input
                  id="edit-coords"
                  value={coordsInput}
                  onChange={(e) => handleCoordsChange(e.target.value)}
                  placeholder="-34.6037, -58.3816"
                />
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold">Ciudad:</span>{' '}
                    {selectedEvent.city?.name || 'Sin ciudad'}
                  </div>
                  <div>
                    <span className="font-semibold">Creado por:</span>{' '}
                    {selectedEvent.createdBy.firstName} {selectedEvent.createdBy.lastName}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">Fecha de creación:</span>{' '}
                    {new Date(selectedEvent.createdAt).toLocaleString('es-AR')}
                  </div>
                </div>
              </div>

              {hasChanges() && (
                <div className="text-sm text-amber-600 font-medium">
                  Se detectaron cambios en el evento
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedEvent && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReject(selectedEvent);
                    setViewDialogOpen(false);
                  }}
                  disabled={isMutating}
                >
                  <X className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
                {hasChanges() ? (
                  <Button
                    onClick={handleSaveAndApprove}
                    disabled={isMutating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {saveAndApproveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Guardar y Aprobar
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      handleApprove(selectedEvent);
                      setViewDialogOpen(false);
                    }}
                    disabled={isMutating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprobar
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
