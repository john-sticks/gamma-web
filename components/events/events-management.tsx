'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, MapPin, Eye, LayoutGrid, List, Presentation, Check, X, Filter, ChevronDown, Users, Clock } from 'lucide-react';
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
import { EventCard } from '@/components/events/event-card';
import { EventChart } from '@/components/events/event-chart';
import type { Event, EventWithLatestUpdate, EventChartData, EventUpdate as EventUpdateType } from '@/types/events';
import type { City, Locality } from '@/types/city';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_LIFECYCLE_STATUS_LABELS, UPDATE_TYPE_LABELS } from '@/types/events';
import Link from 'next/link';
import { WhatsAppShareButton } from '@/components/events/whatsapp-share-button';
import { ExportButtons } from '@/components/events/export-buttons';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface EventsManagementProps {
  basePath: string; // e.g., '/dashboard/admin' or '/dashboard/super-admin'
  defaultFilterStatus?: string; // Default status filter (e.g., 'approved', 'pending', 'all')
  readonly?: boolean; // Hide create/edit/delete actions
}

export function EventsManagement({ basePath, defaultFilterStatus = 'all', readonly = false }: EventsManagementProps) {
  const queryClient = useQueryClient();
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>(defaultFilterStatus);
  const [filterLifecycleStatus, setFilterLifecycleStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string[]>([]);
  const [filterLocality, setFilterLocality] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationEventId, setCancellationEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset pagination on filter change
    setPage(1);
  }, [filterType, filterStatus, filterLifecycleStatus, filterCity, filterLocality, dateFrom, dateTo]);

  // Reset locality when cities change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterLocality('all');
  }, [filterCity]);

  // Close city dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch cities
  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const response = await fetch('/api/cities', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json() as Promise<City[]>;
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

  // Fetch events with pagination
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'list', page, limit, debouncedSearch, filterType, filterStatus, filterLifecycleStatus, filterCity, filterLocality, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterType !== 'all' && { eventType: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterLifecycleStatus !== 'all' && { lifecycleStatus: filterLifecycleStatus }),
        ...(filterLocality !== 'all' && { locality: filterLocality }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      // Add multiple city filters
      if (filterCity.length > 0) {
        params.append('city', filterCity.join(','));
      }

      const apiPath = defaultFilterStatus === 'approved' ? '/api/events/summary' : '/api/events';
      const response = await fetch(`${apiPath}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json() as PaginatedResponse<EventWithLatestUpdate>;

      // Sort events by lifecycleStatus priority: pending_cancellation first for moderators, then ongoing, awaiting_start, etc.
      const lifecyclePriority: Record<string, number> = {
        'pending_cancellation': 1,
        'ongoing': 2,
        'awaiting_start': 3,
        'pending': 4,
        'completed': 5,
        'cancelled': 6,
      };

      data.data.sort((a, b) => {
        const priorityA = lifecyclePriority[a.lifecycleStatus || 'pending'] || 999;
        const priorityB = lifecyclePriority[b.lifecycleStatus || 'pending'] || 999;
        return priorityA - priorityB;
      });

      return data;
    },
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && errorData.canRequestCancellation) {
          setCancellationEventId(errorData.eventId);
          setDeleteDialogOpen(false);
          setSelectedEvent(null);
          setCancellationDialogOpen(true);
          return;
        }
        throw new Error(errorData.message || 'Failed to delete event');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  // Cancellation request mutation
  const cancellationMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch('/api/notifications/cancellation-request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!response.ok) throw new Error('Failed to request cancellation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setCancellationDialogOpen(false);
      setCancellationEventId(null);
    },
  });

  // Approve event mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!response.ok) throw new Error('Failed to approve event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setApproveDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  // Reject event mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setRejectDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  function handleDelete() {
    if (!selectedEvent) return;
    deleteMutation.mutate(selectedEvent.id);
  }

  function handleApprove() {
    if (!selectedEvent) return;
    approveMutation.mutate(selectedEvent.id);
  }

  function handleReject() {
    if (!selectedEvent) return;
    rejectMutation.mutate(selectedEvent.id);
  }

  function getStatusBadgeVariant(status: Event['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default';
    if (status === 'pending') return 'secondary';
    if (status === 'rejected') return 'destructive';
    return 'outline';
  }

  function getLifecycleBadgeStyle(lifecycleStatus: Event['lifecycleStatus']): string {
    if (lifecycleStatus === 'ongoing') return 'border-transparent bg-green-600 text-white dark:bg-green-600';
    if (lifecycleStatus === 'awaiting_start') return 'border-transparent bg-red-600 text-white dark:bg-red-600';
    if (lifecycleStatus === 'pending') return 'border-transparent bg-blue-600 text-white dark:bg-blue-600';
    if (lifecycleStatus === 'completed') return 'border-transparent bg-gray-400 text-white dark:bg-gray-600';
    if (lifecycleStatus === 'cancelled') return 'border-transparent bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    if (lifecycleStatus === 'pending_cancellation') return 'border-transparent bg-orange-500 text-white dark:bg-orange-600';
    return '';
  }

  function toggleCitySelection(cityId: string) {
    setFilterCity(prev =>
      prev.includes(cityId)
        ? prev.filter(id => id !== cityId)
        : [...prev, cityId]
    );
  }

  function clearCityFilters() {
    setFilterCity([]);
  }

  // Fetch metrics for approved events
  const { data: metrics, error: metricsError, isLoading: metricsLoading } = useQuery({
    queryKey: ['events', 'metrics'],
    queryFn: async () => {
      console.log('Fetching metrics...');
      const response = await fetch('/api/events/metrics', {
        method: 'GET',
        credentials: 'include',
      });
      console.log('Metrics response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Metrics error:', errorText);
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      console.log('Metrics data:', data);
      return data as {
        ongoing: number;
        awaitingStart: number;
        pending: number;
        completed: number;
        cancelled: number;
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch event updates (timeline) for selected event
  const { data: eventUpdates = [], isLoading: updatesLoading } = useQuery<EventUpdateType[]>({
    queryKey: ['event-updates', selectedEvent?.id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${selectedEvent!.id}/updates`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch event updates');
      return response.json();
    },
    enabled: !!selectedEvent && viewDialogOpen,
  });

  console.log("metrics", metrics, "error:", metricsError, "loading:", metricsLoading);

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Eventos</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
              Vista general de eventos aprobados
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButtons
              filters={{
                ...(filterType !== 'all' ? { eventType: filterType } : {}),
                ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
                ...(filterLifecycleStatus !== 'all' ? { lifecycleStatus: filterLifecycleStatus } : {}),
                ...(filterCity.length > 0 ? { city: filterCity } : {}),
                ...(filterLocality !== 'all' ? { locality: filterLocality } : {}),
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
                ...(debouncedSearch ? { search: debouncedSearch } : {}),
              }}
            />
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={`${basePath}/events/presentation`}>
                <Presentation className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Modo Presentación</span>
                <span className="sm:hidden">Presentación</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link href={`${basePath}/events/map`}>
                <MapPin className="mr-2 h-4 w-4" />
                Mapa
              </Link>
            </Button>
            {!readonly && (
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link href={`${basePath}/events/create`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Summary - Solo para eventos aprobados */}
        {defaultFilterStatus === 'approved' && (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
              <span className="text-xs text-destructive font-medium">🔴 En Curso</span>
              <span className="text-base font-bold">{metrics?.ongoing ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-1.5">
              <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">⏳ Esperando</span>
              <span className="text-base font-bold">{metrics?.awaitingStart ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5">
              <span className="text-xs text-primary font-medium">📅 Próximos</span>
              <span className="text-base font-bold">{metrics?.pending ?? '—'}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">

                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className='hover:cursor-pointer'
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className='hover:cursor-pointer'
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className='hover:cursor-pointer'
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[200px]">
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
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Aprobación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterLifecycleStatus} onValueChange={setFilterLifecycleStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Estado del evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="ongoing">🔴 En curso</SelectItem>
                    <SelectItem value="awaiting_start">⏳ Esperando panorama</SelectItem>
                    <SelectItem value="pending">📅 Próximos</SelectItem>
                    <SelectItem value="completed">✅ Finalizados</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelados</SelectItem>
                    <SelectItem value="pending_cancellation">⏳ Pendiente cancelación</SelectItem>
                  </SelectContent>
                </Select>
                {/* Multi-select City Filter */}
                <div className="relative w-[200px]" ref={cityDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowCityDropdown(!showCityDropdown); if (showCityDropdown) setCitySearch(''); }}
                    className="w-full justify-between"
                  >
                    <span className="truncate">
                      {filterCity.length === 0
                        ? 'Todas las ciudades'
                        : `${filterCity.length} ciudad${filterCity.length > 1 ? 'es' : ''}`}
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
                          <button
                            type="button"
                            onClick={clearCityFilters}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm mb-1 text-destructive"
                          >
                            Limpiar selección
                          </button>
                        )}
                        {cities
                          .filter((city) =>
                            city.name.toLowerCase().includes(citySearch.toLowerCase())
                          )
                          .map((city) => (
                            <label
                              key={city.id}
                              className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
                            >
                              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${filterCity.includes(city.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                                {filterCity.includes(city.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={filterCity.includes(city.id)}
                                onChange={() => toggleCitySelection(city.id)}
                                className="sr-only"
                              />
                              <span className={filterCity.includes(city.id) ? 'font-medium' : ''}>{city.name}</span>
                            </label>
                          ))}
                        {cities.filter((city) =>
                          city.name.toLowerCase().includes(citySearch.toLowerCase())
                        ).length === 0 && (
                          <p className="px-2 py-3 text-sm text-muted-foreground text-center">Sin resultados</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Locality Filter */}
                <Select
                  value={filterLocality}
                  onValueChange={(v) => { setFilterLocality(v); setLocalitySearch(''); }}
                  disabled={filterCity.length === 0}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={filterCity.length === 0 ? 'Seleccioná una ciudad' : 'Todas las localidades'} />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 bg-popover p-1 border-b mb-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Buscar localidad..."
                          value={localitySearch}
                          onChange={(e) => setLocalitySearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="h-8 pl-7 text-sm"
                        />
                      </div>
                    </div>
                    <SelectItem value="all">Todas las localidades</SelectItem>
                    {localities
                      .filter((l) => l.name.toLowerCase().includes(localitySearch.toLowerCase()))
                      .map((locality) => (
                        <SelectItem key={locality.id} value={locality.id}>
                          {locality.name}
                        </SelectItem>
                      ))}
                    {localities.filter((l) => l.name.toLowerCase().includes(localitySearch.toLowerCase())).length === 0 && localitySearch && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">Sin resultados</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected City Chips */}
              {filterCity.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filterCity.map((cityId) => {
                    const city = cities.find((c) => c.id === cityId);
                    if (!city) return null;
                    return (
                      <Badge key={cityId} variant="secondary" className="flex items-center gap-1 pr-1">
                        <MapPin className="h-3 w-3" />
                        <span>{city.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleCitySelection(cityId)}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {filterCity.length > 1 && (
                    <button
                      type="button"
                      onClick={clearCityFilters}
                      className="text-xs text-muted-foreground hover:text-destructive underline"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              )}

              {/* Date Filters */}
              <div className="flex gap-4 flex-wrap items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="dateFrom" className="text-sm">Desde</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="dateTo" className="text-sm">Hasta</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                  >
                    Limpiar fechas
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              Eventos ({eventsResponse?.meta.total || 0})
            </CardTitle>
            <CardDescription>
              {viewMode === 'grid' ? 'Vista de tarjetas' : 'Vista de tabla'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando eventos...</div>
            ) : eventsResponse?.data.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No se encontraron eventos con los filtros seleccionados
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventsResponse?.data.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    editPath={`${basePath}/events/edit/${event.id}`}
                    onView={(event) => {
                      setSelectedEvent(event);
                      setViewDialogOpen(true);
                    }}
                    onDelete={() => {
                      setSelectedEvent(event);
                      setDeleteDialogOpen(true);
                    }}
                    onApprove={(event) => {
                      setSelectedEvent(event);
                      setApproveDialogOpen(true);
                    }}
                    onReject={(event) => {
                      setSelectedEvent(event);
                      setRejectDialogOpen(true);
                    }}
                    showActions={{
                      view: true,
                      edit: !readonly,
                      delete: !readonly,
                      approve: !readonly && event.status === 'pending',
                      reject: !readonly && event.status === 'pending',
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Table View */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-96">Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    {defaultFilterStatus === 'approved' && (
                      <>
                        <TableHead>Personas</TableHead>
                        <TableHead className="min-w-[160px]">Última Actualización</TableHead>
                      </>
                    )}
                    <TableHead className="min-w-[120px]">Creador</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsResponse?.data.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium max-w-sm truncate">
                        {event.title.length > 30 ? (
                          <span
                            className="cursor-pointer hover:text-primary transition-colors"
                            title={expandedTitles.has(event.id) ? 'Click para colapsar' : 'Click para ver título completo'}
                            onClick={() => setExpandedTitles(prev => {
                              const next = new Set(prev);
                              if (next.has(event.id)) {
                                next.delete(event.id);
                              } else {
                                next.add(event.id);
                              }
                              return next;
                            })}
                          >
                            {expandedTitles.has(event.id)
                              ? event.title
                              : `${event.title.slice(0, 30)}...`}
                          </span>
                        ) : (
                          event.title
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(event.eventDate).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.eventDate).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="font-medium truncate">{event.city?.name || 'Sin ciudad'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.locality?.name || 'Sin localidad'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {event.status === 'approved' && event.lifecycleStatus ? (
                          <Badge className={`font-semibold whitespace-nowrap ${getLifecycleBadgeStyle(event.lifecycleStatus)}`}>
                            {EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus]}
                          </Badge>
                        ) : (
                          <Badge variant={getStatusBadgeVariant(event.status)} className="whitespace-nowrap">
                            {EVENT_STATUS_LABELS[event.status]}
                          </Badge>
                        )}
                      </TableCell>
                      {defaultFilterStatus === 'approved' && (
                        <>
                          <TableCell>
                            {(event as EventWithLatestUpdate).latestUpdate ? (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-semibold">
                                  {(event as EventWithLatestUpdate).latestUpdate!.attendeeCount ?? '—'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Sin datos</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(event as EventWithLatestUpdate).latestUpdate ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">
                                    {new Date((event as EventWithLatestUpdate).latestUpdate!.updateTime).toLocaleTimeString('es-AR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date((event as EventWithLatestUpdate).latestUpdate!.updateTime).toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                  {' · '}
                                  {UPDATE_TYPE_LABELS[(event as EventWithLatestUpdate).latestUpdate!.updateType]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Sin actualizaciones</span>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="whitespace-nowrap">
                        {event.createdBy.firstName} {event.createdBy.lastName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {event.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setApproveDialogOpen(true);
                                }}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 hover:cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setRejectDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <WhatsAppShareButton event={event} latestUpdate={(event as EventWithLatestUpdate).latestUpdate} />
                          <Button
                            variant="outline"
                            size="icon"
                            className='hover:cursor-pointer'
                            onClick={() => {
                              setSelectedEvent(event);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!readonly && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                asChild
                                className='hover:cursor-pointer'
                              >
                                <Link href={`${basePath}/events/edit/${event.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className='hover:cursor-pointer'
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {eventsResponse && eventsResponse.meta.totalPages > 1 && (
              <Pagination
                currentPage={eventsResponse.meta.page}
                totalPages={eventsResponse.meta.totalPages}
                hasNextPage={eventsResponse.meta.hasNextPage}
                hasPreviousPage={eventsResponse.meta.hasPreviousPage}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Event Dialog with Chart */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEvent?.title}
              {selectedEvent && (
                selectedEvent.status === 'approved' && selectedEvent.lifecycleStatus ? (
                  <Badge className={`font-semibold ${getLifecycleBadgeStyle(selectedEvent.lifecycleStatus)}`}>
                    {EVENT_LIFECYCLE_STATUS_LABELS[selectedEvent.lifecycleStatus]}
                  </Badge>
                ) : (
                  <Badge variant={getStatusBadgeVariant(selectedEvent.status)}>
                    {EVENT_STATUS_LABELS[selectedEvent.status]}
                  </Badge>
                )
              )}
            </DialogTitle>
            <DialogDescription>
              Historial y evolución del evento
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Info Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horario</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedEvent.eventDate).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="text-sm font-medium truncate">{selectedEvent.city?.name || 'Sin ciudad'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Asistentes est.</p>
                    <p className="text-sm font-medium">{selectedEvent.attendeeCount || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="mt-0.5">
                    {EVENT_TYPE_LABELS[selectedEvent.eventType]}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {/* Chart built from updates */}
              {(() => {
                const updatesWithAttendees = eventUpdates
                  .filter((u) => u.attendeeCount != null && u.updateType !== 'event_created')
                  .sort((a, b) => new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime());

                if (updatesWithAttendees.length === 0) return null;

                const builtChartData: EventChartData = {
                  eventId: selectedEvent.id,
                  dataPoints: updatesWithAttendees.map((u) => ({
                    timestamp: u.updateTime,
                    time: u.updateTime,
                    attendees: u.attendeeCount,
                    policePresence: u.policePresence,
                    streetClosure: u.streetClosure,
                    tireBurning: u.tireBurning,
                    type: u.updateType,
                    notes: u.notes || '',
                  })),
                  totalDataPoints: updatesWithAttendees.length,
                  duration:
                    updatesWithAttendees.length > 1
                      ? {
                          start: updatesWithAttendees[0].updateTime,
                          end: updatesWithAttendees[updatesWithAttendees.length - 1].updateTime,
                          durationMinutes: Math.round(
                            (new Date(updatesWithAttendees[updatesWithAttendees.length - 1].updateTime).getTime() -
                              new Date(updatesWithAttendees[0].updateTime).getTime()) /
                              (1000 * 60),
                          ),
                        }
                      : null,
                };

                return <EventChart chartData={builtChartData} />;
              })()}

              {/* Timeline de actualizaciones */}
              {updatesLoading ? (
                <div className="animate-pulse space-y-2 py-4">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                </div>
              ) : eventUpdates.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Historial de actualizaciones ({eventUpdates.length})</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {eventUpdates.map((update) => (
                      <div key={update.id} className="flex items-start gap-3 p-2 rounded-lg border text-sm">
                        <div className="flex-shrink-0 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">
                              {new Date(update.updateTime).toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {UPDATE_TYPE_LABELS[update.updateType]}
                            </Badge>
                            {update.attendeeCount != null && update.attendeeCount > 0 && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {update.attendeeCount}
                              </span>
                            )}
                            {update.policePresence && (
                              <Badge variant="destructive" className="text-[10px]">Policía</Badge>
                            )}
                            {update.streetClosure && (
                              <Badge variant="secondary" className="text-[10px]">Corte</Badge>
                            )}
                            {update.tireBurning && (
                              <Badge variant="secondary" className="text-[10px]">🔥 Cubiertas</Badge>
                            )}
                          </div>
                          {update.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{update.notes}</p>
                          )}
                          {update.createdBy && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              por {update.createdBy.firstName} {update.createdBy.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No hay actualizaciones registradas para este evento
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {/* {selectedEvent && (
              <ExportButtons eventId={selectedEvent.id} />
            )} */}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el evento{' '}
              <span className="font-semibold">{selectedEvent?.title}</span>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Evento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar el evento{' '}
              <span className="font-semibold">{selectedEvent?.title}</span>?
              El evento será visible para todos los usuarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? 'Aprobando...' : 'Aprobar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Evento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas rechazar el evento{' '}
              <span className="font-semibold">{selectedEvent?.title}</span>?
              Esta acción no se puede deshacer fácilmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rechazando...' : 'Rechazar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Request Dialog */}
      <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Cancelación</DialogTitle>
            <DialogDescription>
              Han pasado más de 30 minutos desde la creación del evento.
              No puedes eliminarlo directamente, pero puedes solicitar su cancelación a un moderador.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCancellationDialogOpen(false);
              setCancellationEventId(null);
            }}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (cancellationEventId) {
                  cancellationMutation.mutate(cancellationEventId);
                }
              }}
              disabled={cancellationMutation.isPending}
            >
              {cancellationMutation.isPending ? 'Enviando...' : 'Solicitar Cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
