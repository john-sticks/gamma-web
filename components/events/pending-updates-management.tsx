'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, X, Eye, Users, Loader2, Filter, ChevronDown, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import type { EventUpdateWithEvent, EventUpdate } from '@/types/events';
import { UPDATE_TYPE_LABELS, EVENT_TYPE_LABELS, EVENT_LIFECYCLE_STATUS_LABELS } from '@/types/events';
import type { City, Locality } from '@/types/city';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  updateTime: string;
  updateType: EventUpdate['updateType'];
  attendeeCount: number;
  policePresence: boolean;
  streetClosure: boolean;
  tireBurning: boolean;
  notes: string;
}

export function PendingUpdatesManagement() {
  const queryClient = useQueryClient();
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState<string[]>([]);
  const [filterLocality, setFilterLocality] = useState('all');
  const [filterUpdateType, setFilterUpdateType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<EventUpdateWithEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [eventWarningModal, setEventWarningModal] = useState<{
    open: boolean;
    update: EventUpdateWithEvent | null;
    actionType: 'quick' | 'saveAndApprove';
  }>({ open: false, update: null, actionType: 'quick' });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [filterCity, filterLocality, filterUpdateType, dateFrom, dateTo]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFilterLocality('all'); }, [filterCity]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const r = await fetch('/api/cities', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed');
      return r.json() as Promise<City[]>;
    },
  });

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
    filterCity.length > 0,
    filterLocality !== 'all',
    filterUpdateType !== 'all',
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  function openUpdateDialog(update: EventUpdateWithEvent) {
    setSelectedUpdate(update);
    setEditForm({
      updateTime: format(new Date(update.updateTime), "yyyy-MM-dd'T'HH:mm"),
      updateType: update.updateType,
      attendeeCount: update.attendeeCount ?? 0,
      policePresence: update.policePresence,
      streetClosure: update.streetClosure,
      tireBurning: update.tireBurning,
      notes: update.notes || '',
    });
    setViewDialogOpen(true);
  }

  // Fetch pending updates
  const { data: updatesResponse, isLoading } = useQuery({
    queryKey: ['events', 'pending-updates', page, limit, debouncedSearch, filterCity, filterLocality, filterUpdateType, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterLocality !== 'all' && { locality: filterLocality }),
        ...(filterUpdateType !== 'all' && { updateType: filterUpdateType }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });
      if (filterCity.length > 0) params.append('city', filterCity.join(','));

      const response = await fetch(`/api/events/updates/pending?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pending updates');
      return response.json() as Promise<PaginatedResponse<EventUpdateWithEvent>>;
    },
  });

  // Approve/Reject mutation (quick action, no edit)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ updateId, status }: { updateId: string; status: 'approved' | 'rejected' }) => {
      const response = await fetch(`/api/events/updates/${updateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Estado actualizado');
    },
  });

  // Save edits and approve mutation
  const saveAndApproveMutation = useMutation({
    mutationFn: async ({ update, data }: { update: EventUpdateWithEvent; data: Record<string, unknown> }) => {
      // 1. Edit the update fields
      const editResponse = await fetch(`/api/events/${update.eventId}/updates/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!editResponse.ok) {
        const error = await editResponse.json().catch(() => ({}));
        throw new Error(error.message || 'Error al editar el panorama');
      }

      // 2. Approve it
      const approveResponse = await fetch(`/api/events/updates/${update.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!approveResponse.ok) {
        throw new Error('Error al aprobar el panorama');
      }

      return approveResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setViewDialogOpen(false);
      setSelectedUpdate(null);
      toast.success('Panorama editado y aprobado');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al guardar y aprobar');
    },
  });

  // Approve event mutation (used when event is still pending)
  const approveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!response.ok) throw new Error('Error al aprobar el evento');
      return response.json();
    },
  });

  function handleApprove(update: EventUpdateWithEvent) {
    if (update.event?.status === 'pending') {
      setEventWarningModal({ open: true, update, actionType: 'quick' });
      return;
    }
    updateStatusMutation.mutate({ updateId: update.id, status: 'approved' });
  }

  function handleReject(update: EventUpdateWithEvent) {
    updateStatusMutation.mutate({ updateId: update.id, status: 'rejected' });
  }

  async function handleConfirmWithEventApproval() {
    const { update, actionType } = eventWarningModal;
    if (!update) return;

    setEventWarningModal({ open: false, update: null, actionType: 'quick' });

    try {
      await approveEventMutation.mutateAsync(update.event.id);

      if (actionType === 'quick') {
        updateStatusMutation.mutate({ updateId: update.id, status: 'approved' });
      } else {
        handleSaveAndApprove();
      }
    } catch {
      toast.error('Error al aprobar el evento');
    }
  }

  // Check if form has changes compared to original
  function hasChanges(): boolean {
    if (!editForm || !selectedUpdate) return false;
    return (
      editForm.updateTime !== format(new Date(selectedUpdate.updateTime), "yyyy-MM-dd'T'HH:mm") ||
      editForm.updateType !== selectedUpdate.updateType ||
      editForm.attendeeCount !== (selectedUpdate.attendeeCount ?? 0) ||
      editForm.policePresence !== selectedUpdate.policePresence ||
      editForm.streetClosure !== selectedUpdate.streetClosure ||
      editForm.tireBurning !== selectedUpdate.tireBurning ||
      editForm.notes !== (selectedUpdate.notes || '')
    );
  }

  // Get changed fields only
  function getChangedFields(): Record<string, unknown> {
    if (!editForm || !selectedUpdate) return {};
    const changes: Record<string, unknown> = {};
    if (editForm.updateTime !== format(new Date(selectedUpdate.updateTime), "yyyy-MM-dd'T'HH:mm")) {
      changes.updateTime = new Date(editForm.updateTime).toISOString();
    }
    if (editForm.updateType !== selectedUpdate.updateType) changes.updateType = editForm.updateType;
    if (editForm.attendeeCount !== (selectedUpdate.attendeeCount ?? 0)) changes.attendeeCount = editForm.attendeeCount;
    if (editForm.policePresence !== selectedUpdate.policePresence) changes.policePresence = editForm.policePresence;
    if (editForm.streetClosure !== selectedUpdate.streetClosure) changes.streetClosure = editForm.streetClosure;
    if (editForm.tireBurning !== selectedUpdate.tireBurning) changes.tireBurning = editForm.tireBurning;
    if (editForm.notes !== (selectedUpdate.notes || '')) changes.notes = editForm.notes;
    return changes;
  }

  function handleSaveAndApprove() {
    if (!selectedUpdate || !editForm) return;
    if (selectedUpdate.event?.status === 'pending') {
      setEventWarningModal({ open: true, update: selectedUpdate, actionType: 'saveAndApprove' });
      return;
    }
    const changes = getChangedFields();
    saveAndApproveMutation.mutate({ update: selectedUpdate, data: changes });
  }

  const isMutating = updateStatusMutation.isPending || saveAndApproveMutation.isPending;

  const getUpdateTypeBadgeVariant = (type: EventUpdateWithEvent['updateType']): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (type) {
      case 'attendance_update':
        return 'default';
      case 'police_arrival':
      case 'police_departure':
      case 'incident':
        return 'destructive';
      case 'street_closure':
      case 'street_reopened':
        return 'secondary';
      case 'event_start':
      case 'event_end':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Panoramas Pendientes</h1>
          <p className="text-muted-foreground mt-2">
            Revisa y aprueba panoramas (actualizaciones) creados por usuarios
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título de evento o notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="pt-0 space-y-4 border-t">
              <div className="flex flex-wrap gap-3 pt-4">
                {/* Update type */}
                <Select value={filterUpdateType} onValueChange={setFilterUpdateType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo de panorama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(UPDATE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
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
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
                  <span className="text-muted-foreground text-sm">—</span>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterCity([]); setFilterLocality('all'); setFilterUpdateType('all'); setDateFrom(''); setDateTo(''); }}>
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
              Panoramas Pendientes ({updatesResponse?.meta.pendingCount ?? updatesResponse?.meta.total ?? 0})
            </CardTitle>
            <CardDescription>
              Estos panoramas esperan aprobación para ser visibles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando panoramas...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Ciudad / Localidad</TableHead>
                      <TableHead>Fecha evento</TableHead>
                      <TableHead>Tipo panorama</TableHead>
                      <TableHead>Hora panorama</TableHead>
                      <TableHead>Asistentes</TableHead>
                      <TableHead>Creador</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updatesResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay panoramas pendientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      updatesResponse?.data.map((update) => {
                        const isResolved = update.status === 'approved' || update.status === 'rejected';
                        return (
                        <TableRow key={update.id} className={isResolved ? 'opacity-50' : ''}>
                          <TableCell className="font-medium max-w-48">
                            <div className="flex flex-col gap-0.5">
                              {isResolved && (
                                <Badge variant={update.status === 'approved' ? 'default' : 'destructive'} className="text-[10px] w-fit">
                                  {update.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                </Badge>
                              )}
                              <span className={`truncate ${isResolved ? 'line-through text-muted-foreground' : ''}`}>
                                {update.event?.title || 'Evento desconocido'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{update.event?.city?.name || '-'}</p>
                              <p className="text-muted-foreground text-xs">{update.event?.locality?.name || 'Sin localidad'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {update.event?.eventDate
                              ? format(new Date(update.event.eventDate), 'dd/MM/yyyy HH:mm', { locale: es })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getUpdateTypeBadgeVariant(update.updateType)}>
                              {UPDATE_TYPE_LABELS[update.updateType]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(update.updateTime), 'HH:mm', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {update.attendeeCount ?? '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {update.createdBy?.firstName} {update.createdBy?.lastName}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openUpdateDialog(update)}
                                className="hover:cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!isResolved && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-green-600 hover:bg-green-400 hover:cursor-pointer"
                                    onClick={() => handleApprove(update)}
                                    disabled={isMutating}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-red-600 hover:bg-red-400 hover:cursor-pointer"
                                    onClick={() => handleReject(update)}
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

                {updatesResponse && updatesResponse.meta.totalPages > 1 && (
                  <Pagination
                    currentPage={updatesResponse.meta.page}
                    totalPages={updatesResponse.meta.totalPages}
                    hasNextPage={updatesResponse.meta.hasNextPage}
                    hasPreviousPage={updatesResponse.meta.hasPreviousPage}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event pending warning modal */}
      <Dialog open={eventWarningModal.open} onOpenChange={(open) => !open && setEventWarningModal({ open: false, update: null, actionType: 'quick' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Evento pendiente de aprobación
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-foreground">
              El evento{' '}
              <span className="font-semibold">
                &ldquo;{eventWarningModal.update?.event?.title}&rdquo;
              </span>{' '}
              aún no fue aprobado y no aparece en el mapa.
              <br /><br />
              Si aprobás este panorama, el evento también será aprobado automáticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEventWarningModal({ open: false, update: null, actionType: 'quick' })}
            >
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmWithEventApproval}
              disabled={approveEventMutation.isPending}
            >
              {approveEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Aprobar evento y panorama
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Approve Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar Panorama</DialogTitle>
            <DialogDescription>
              Puedes editar los campos antes de aprobar o rechazar
            </DialogDescription>
          </DialogHeader>
          {selectedUpdate && editForm && (
            <div className="space-y-4">
              {/* Event info (read-only) */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold">Evento</h4>
                <p className="text-sm font-medium">{selectedUpdate.event?.title || 'Evento desconocido'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo: </span>
                    <span className="font-medium">
                      {selectedUpdate.event?.eventType ? EVENT_TYPE_LABELS[selectedUpdate.event.eventType] : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado: </span>
                    <span className="font-medium">
                      {selectedUpdate.event?.lifecycleStatus ? EVENT_LIFECYCLE_STATUS_LABELS[selectedUpdate.event.lifecycleStatus] : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ciudad: </span>
                    <span className="font-medium">{selectedUpdate.event?.city?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Localidad: </span>
                    <span className="font-medium">{selectedUpdate.event?.locality?.name || 'Sin localidad'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Dirección: </span>
                    <span className="font-medium">{selectedUpdate.event?.address || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Fecha del evento: </span>
                    <span className="font-medium">
                      {selectedUpdate.event?.eventDate
                        ? format(new Date(selectedUpdate.event.eventDate), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-updateTime">Fecha y Hora</Label>
                  <Input
                    id="edit-updateTime"
                    type="datetime-local"
                    value={editForm.updateTime}
                    onChange={(e) => setEditForm({ ...editForm, updateTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Actualización</Label>
                  <Select
                    value={editForm.updateType}
                    onValueChange={(value) => setEditForm({ ...editForm, updateType: value as EventUpdate['updateType'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UPDATE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-attendeeCount">Número de Personas</Label>
                <Input
                  id="edit-attendeeCount"
                  type="number"
                  min="0"
                  value={editForm.attendeeCount}
                  onChange={(e) => setEditForm({
                    ...editForm,
                    attendeeCount: parseInt(e.target.value) || 0
                  })}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-policePresence"
                    checked={editForm.policePresence}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      policePresence: e.target.checked
                    })}
                  />
                  <Label htmlFor="edit-policePresence">Presencia policial</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-streetClosure"
                    checked={editForm.streetClosure}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      streetClosure: e.target.checked
                    })}
                  />
                  <Label htmlFor="edit-streetClosure">Corte de calle</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-tireBurning"
                    checked={editForm.tireBurning}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      tireBurning: e.target.checked
                    })}
                  />
                  <Label htmlFor="edit-tireBurning">Quema de cubiertas</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observaciones</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Notas sobre la situación actual..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {/* Metadata (read-only) */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold">Creado por:</span>{' '}
                    {selectedUpdate.createdBy?.firstName} {selectedUpdate.createdBy?.lastName}
                  </div>
                  <div>
                    <span className="font-semibold">Fecha de creación:</span>{' '}
                    {format(new Date(selectedUpdate.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                </div>
              </div>

              {hasChanges() && (
                <div className="text-sm text-amber-600 font-medium">
                  Se detectaron cambios en el panorama
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedUpdate && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReject(selectedUpdate);
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
                      handleApprove(selectedUpdate);
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
