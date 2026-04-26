'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Eye, Ban, Users, Shield, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Pagination } from '@/components/ui/pagination';
import type { Event, EventWithLatestUpdate } from '@/types/events';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_LIFECYCLE_STATUS_LABELS, UPDATE_TYPE_LABELS } from '@/types/events';
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

export default function MyEventsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  // Fetch my events with latest update info
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['events', 'my-events', page, limit, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const response = await fetch(`/api/events/summary?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json() as Promise<PaginatedResponse<EventWithLatestUpdate>>;
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

  function handleDelete() {
    if (!selectedEvent) return;
    deleteMutation.mutate(selectedEvent.id);
  }

  function isWithin30Minutes(createdAt: string): boolean {
    const now = new Date();
    const created = new Date(createdAt);
    const minutesSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60);
    return minutesSinceCreation <= 30;
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
              <h1 className="text-3xl font-bold">Mis Eventos</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona los eventos que has creado
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/user/events/create">
                <Plus className="mr-2 h-4 w-4" />
                Crear Evento
              </Link>
            </Button>
          </div>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm">
                <strong>Nota:</strong> Los eventos que crees necesitarán ser aprobados por un moderador antes de aparecer en el mapa público.
                Recibirás una notificación cuando tu evento sea revisado.
              </p>
            </CardContent>
          </Card>

          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar</CardTitle>
              <CardDescription>Filtra tus eventos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Mis Eventos ({eventsResponse?.meta.total || 0})
              </CardTitle>
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
                        <TableHead>Ciudad</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Último Panorama</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventsResponse?.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No has creado eventos aún
                          </TableCell>
                        </TableRow>
                      ) : (
                        eventsResponse?.data.map((event) => {
                          const isCancelled = event.lifecycleStatus === 'cancelled' || event.lifecycleStatus === 'pending_cancellation';
                          return (
                            <TableRow key={event.id} className={isCancelled ? 'opacity-60' : ''}>
                              <TableCell className={`font-medium ${isCancelled ? 'line-through' : ''}`}>
                                {event.title}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="px-3 py-1 border">
                                  {EVENT_TYPE_LABELS[event.eventType]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(event.eventDate).toLocaleDateString('es-AR')}
                              </TableCell>
                              <TableCell>
                                <Badge className="px-3 py-1 font-semibold border" variant="secondary">
                                  {event.city?.name || 'Sin ciudad'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isCancelled ? (
                                  <Badge className="px-3 py-1 border" variant={event.lifecycleStatus === 'cancelled' ? 'outline' : 'secondary'}>
                                    {EVENT_LIFECYCLE_STATUS_LABELS[event.lifecycleStatus!]}
                                  </Badge>
                                ) : (
                                  <Badge className="px-3 py-1 border" variant={getStatusBadgeVariant(event.status)}>
                                    {EVENT_STATUS_LABELS[event.status]}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {event.latestUpdate ? (
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                      {UPDATE_TYPE_LABELS[event.latestUpdate.updateType]}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(event.latestUpdate.updateTime).toLocaleString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3 text-primary" />
                                        <span className="font-medium">{event.latestUpdate.attendeeCount}</span>
                                      </span>
                                      {event.latestUpdate.policePresence && (
                                        <span className="flex items-center gap-1 text-destructive">
                                          <Shield className="h-3 w-3" />
                                          Policía
                                        </span>
                                      )}
                                      {event.latestUpdate.streetClosure && (
                                        <span className="flex items-center gap-1 text-orange-500">
                                          <AlertTriangle className="h-3 w-3" />
                                          Corte
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin panorama</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    asChild
                                  >
                                    <Link href={`/dashboard/user/events/${event.id}`} target="_blank">
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                  {!isCancelled && (
                                    <>
                                      {event.status === 'pending' && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          asChild
                                        >
                                          <Link href={`/dashboard/user/events/edit/${event.id}`}>
                                            <Pencil className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      )}
                                      {isWithin30Minutes(event.createdAt) ? (
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
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => {
                                            setCancellationEventId(event.id);
                                            setCancellationDialogOpen(true);
                                          }}
                                          title="Solicitar cancelación"
                                        >
                                          <Ban className="h-4 w-4" />
                                        </Button>
                                      )}
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
      </div>

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
    </DashboardLayout>
  );
}
