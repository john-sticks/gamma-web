'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, MapPin, Eye, LayoutGrid, List, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
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
import type { Event } from '@/types/events';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from '@/types/events';
import Link from 'next/link';

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

export default function EventsListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
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
  }, [filterType, filterStatus, dateFrom, dateTo]);

  // Fetch events with pagination
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'list', page, limit, debouncedSearch, filterType, filterStatus, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterType !== 'all' && { eventType: filterType }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await fetch(`/api/events?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json() as Promise<PaginatedResponse<Event>>;
    },
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete event');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
  });

  function handleDelete() {
    if (!selectedEvent) return;
    deleteMutation.mutate(selectedEvent.id);
  }

  function getStatusBadgeVariant(status: Event['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default';
    if (status === 'pending') return 'secondary';
    if (status === 'rejected' || status === 'cancelled') return 'destructive';
    return 'outline';
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
              <p className="text-muted-foreground mt-2">
                Administra todos los eventos del sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/moderator/events/map">
                  <MapPin className="mr-2 h-4 w-4" />
                  Ver Mapa
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/moderator/events/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Evento
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                 
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
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
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                    <SelectItem value="ongoing">En curso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                      editPath={`/dashboard/moderator/events/edit/${event.id}`}
                      onDelete={() => {
                        setSelectedEvent(event);
                        setDeleteDialogOpen(true);
                      }}
                      showActions={{
                        view: true,
                        edit: true,
                        delete: true,
                      }}
                    />
                  ))}
                </div>
              ) : (
                /* Table View */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creador</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsResponse?.data.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EVENT_TYPE_LABELS[event.eventType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(event.eventDate).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {event.city?.name || 'Sin ciudad'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(event.status)}>
                            {EVENT_STATUS_LABELS[event.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.createdBy.firstName} {event.createdBy.lastName}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedEvent(event);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              asChild
                            >
                              <Link href={`/dashboard/moderator/events/edit/${event.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedEvent(event);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* View Event Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Detalles del evento
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Descripción</h4>
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Tipo</h4>
                  <p className="text-sm">{EVENT_TYPE_LABELS[selectedEvent.eventType]}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Estado</h4>
                  <Badge variant={getStatusBadgeVariant(selectedEvent.status)}>
                    {EVENT_STATUS_LABELS[selectedEvent.status]}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Fecha y Hora</h4>
                  <p className="text-sm">
                    {new Date(selectedEvent.eventDate).toLocaleString('es-AR')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Asistentes Estimados</h4>
                  <p className="text-sm">{selectedEvent.attendeeCount || 'No especificado'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Ubicación</h4>
                <p className="text-sm">{selectedEvent.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.city?.name || 'Sin ciudad'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coordenadas: {selectedEvent.latitude}, {selectedEvent.longitude}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Creado por</h4>
                <p className="text-sm">
                  {selectedEvent.createdBy.firstName} {selectedEvent.createdBy.lastName} (@{selectedEvent.createdBy.username})
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedEvent.createdAt).toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
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
    </DashboardLayout>
  );
}
