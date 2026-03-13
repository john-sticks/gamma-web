'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Check, X, Eye, Users, Loader2 } from 'lucide-react';
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
import { UPDATE_TYPE_LABELS } from '@/types/events';
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
  };
}

interface EditFormData {
  updateTime: string;
  updateType: EventUpdate['updateType'];
  attendeeCount: number;
  policePresence: boolean;
  streetClosure: boolean;
  notes: string;
}

export function PendingUpdatesManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<EventUpdateWithEvent | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  function openUpdateDialog(update: EventUpdateWithEvent) {
    setSelectedUpdate(update);
    setEditForm({
      updateTime: format(new Date(update.updateTime), "yyyy-MM-dd'T'HH:mm"),
      updateType: update.updateType,
      attendeeCount: update.attendeeCount ?? 0,
      policePresence: update.policePresence,
      streetClosure: update.streetClosure,
      notes: update.notes || '',
    });
    setViewDialogOpen(true);
  }

  // Fetch pending updates
  const { data: updatesResponse, isLoading } = useQuery({
    queryKey: ['events', 'pending-updates', page, limit, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

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

  function handleApprove(update: EventUpdateWithEvent) {
    updateStatusMutation.mutate({ updateId: update.id, status: 'approved' });
  }

  function handleReject(update: EventUpdateWithEvent) {
    updateStatusMutation.mutate({ updateId: update.id, status: 'rejected' });
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
    if (editForm.notes !== (selectedUpdate.notes || '')) changes.notes = editForm.notes;
    return changes;
  }

  function handleSaveAndApprove() {
    if (!selectedUpdate || !editForm) return;
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

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar</CardTitle>
            <CardDescription>Filtra panoramas pendientes por evento o notas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título de evento o notas..."
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
              Panoramas Pendientes ({updatesResponse?.meta.total || 0})
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha/Hora</TableHead>
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
                      updatesResponse?.data.map((update) => (
                        <TableRow key={update.id}>
                          <TableCell className="font-medium max-w-48 truncate">
                            {update.event?.title || 'Evento desconocido'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getUpdateTypeBadgeVariant(update.updateType)}>
                              {UPDATE_TYPE_LABELS[update.updateType]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(update.updateTime), 'dd/MM/yyyy HH:mm', { locale: es })}
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
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-1">Evento</h4>
                <p className="text-sm">{selectedUpdate.event?.title || 'Evento desconocido'}</p>
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
