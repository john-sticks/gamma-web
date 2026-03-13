'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Users, Shield, MessageSquare, TrendingUp, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EventUpdate, CreateEventUpdateDto, UPDATE_TYPE_LABELS } from '@/types/events';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface EventTimelineProps {
  updates: EventUpdate[];
  eventId: string;
  onAddUpdate?: (update: CreateEventUpdateDto) => void;
  onUpdateEdited?: () => void;
  canEdit?: boolean;
  onRefresh?: () => void;
  userRole?: string;
}

function isWithin15Minutes(createdAt: string): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  const minutesSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60);
  return minutesSinceCreation <= 15;
}

export function EventTimeline({
  updates,
  eventId,
  onAddUpdate,
  onUpdateEdited,
  canEdit = false,
  onRefresh,
  userRole,
}: EventTimelineProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<EventUpdate | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreateEventUpdateDto>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [newUpdate, setNewUpdate] = useState<Partial<CreateEventUpdateDto>>({
    updateType: 'attendance_update',
    policePresence: false,
    streetClosure: false,
  });

  const handleSubmitUpdate = () => {
    if (!newUpdate.updateTime) {
      toast.error('Debes ingresar la fecha y hora de la actualización');
      return;
    }

    if (newUpdate.attendeeCount === undefined || newUpdate.attendeeCount === null) {
      toast.error('Debes ingresar el número de personas');
      return;
    }

    // Validate that the new update time is after the latest non-creation update
    // (the first panorama can be before the scheduled event time since people may gather early)
    const nonCreationUpdates = updates.filter((u) => u.updateType !== 'event_created');
    if (nonCreationUpdates.length > 0) {
      const latestUpdateTime = new Date(nonCreationUpdates[0].updateTime).getTime();
      const newUpdateTime = new Date(newUpdate.updateTime).getTime();
      if (newUpdateTime <= latestUpdateTime) {
        toast.error('La fecha y hora debe ser posterior a la última actualización');
        return;
      }
    }

    if (onAddUpdate) {
      onAddUpdate(newUpdate as CreateEventUpdateDto);
      setNewUpdate({
        updateType: 'attendance_update',
        policePresence: false,
        streetClosure: false,
      });
      setAddDialogOpen(false);
    }
  };

  const handleOpenEdit = (update: EventUpdate) => {
    setEditingUpdate(update);
    setEditForm({
      updateTime: format(new Date(update.updateTime), "yyyy-MM-dd'T'HH:mm"),
      updateType: update.updateType,
      attendeeCount: update.attendeeCount,
      policePresence: update.policePresence,
      streetClosure: update.streetClosure,
      notes: update.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleSubmitEdit = async () => {
    if (!editingUpdate) return;
    setEditLoading(true);
    try {
      const updateData = {
        ...editForm,
        ...(editForm.updateTime ? { updateTime: new Date(editForm.updateTime).toISOString() } : {}),
      };

      const response = await fetch(`/api/events/${eventId}/updates/${editingUpdate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al editar la actualización');
      }

      toast.success('Actualización editada exitosamente');
      setEditDialogOpen(false);
      setEditingUpdate(null);
      onUpdateEdited?.();
      onRefresh?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al editar la actualización');
    } finally {
      setEditLoading(false);
    }
  };

  const getUpdateIcon = (type: EventUpdate['updateType']) => {
    switch (type) {
      case 'attendance_update':
        return <Users className="h-4 w-4 text-primary" />;
      case 'police_arrival':
      case 'police_departure':
        return <Shield className="h-4 w-4 text-destructive" />;
      case 'street_closure':
      case 'street_reopened':
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
      case 'event_start':
      case 'event_end':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getUpdateTypeBadgeVariant = (type: EventUpdate['updateType']): 'default' | 'secondary' | 'outline' | 'destructive' => {
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial del Evento
          </CardTitle>
          <CardDescription>
            Seguimiento temporal con {updates.length} actualización{updates.length !== 1 ? 'es' : ''}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'level_4' && canEdit && (
            <p className="text-xs text-amber-600">Tu panorama será enviado para revisión</p>
          )}
          {canEdit && (
            <Button onClick={() => setAddDialogOpen(true)}>
              Agregar Actualización
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {updates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay actualizaciones en el historial</p>
            {canEdit && (
              <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                Agregar Primera Actualización
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => {
              const editable = canEdit && isWithin15Minutes(update.createdAt);
              const isPending = update.status === 'pending';
              const isRejected = update.status === 'rejected';
              const isNotApproved = isPending || isRejected;
              return (
                <div
                  key={update.id}
                  className={cn(
                    'relative pl-8 border-l-2 last:border-l-0',
                    isPending ? 'border-amber-400 border-dashed' :
                    isRejected ? 'border-red-400 border-dashed' :
                    'border-border'
                  )}
                  style={isNotApproved ? { opacity: 0.7 } : undefined}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute -left-3 top-1 bg-background border-4 rounded-full w-6 h-6 flex items-center justify-center',
                    isPending ? 'border-amber-400' :
                    isRejected ? 'border-red-400' :
                    'border-primary'
                  )}>
                    {getUpdateIcon(update.updateType)}
                  </div>

                  <div className={cn(
                    'bg-card border rounded-lg p-4 shadow-sm',
                    isPending ? 'border-amber-400 border-dashed' :
                    isRejected ? 'border-red-400 border-dashed' :
                    'border-border'
                  )}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getUpdateTypeBadgeVariant(update.updateType)}>
                          {UPDATE_TYPE_LABELS[update.updateType]}
                        </Badge>
                        {isPending && (
                          <Badge variant="outline" className="border-amber-400 text-amber-600 text-xs">
                            Pendiente
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="outline" className="border-red-400 text-red-600 text-xs">
                            Rechazado
                          </Badge>
                        )}
                        <span className="text-sm font-medium">
                          {format(new Date(update.updateTime), 'HH:mm', { locale: es })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(update.updateTime), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!editable}
                          onClick={() => handleOpenEdit(update)}
                          title={editable ? 'Editar actualización' : 'El tiempo de edición (15 min) ha expirado'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{update.attendeeCount}</span>
                        <span className="text-sm text-muted-foreground">
                          {update.updateType === 'event_created' ? 'personas (estimado)' : 'personas'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-destructive" />
                        <Badge variant={update.policePresence ? 'destructive' : 'outline'}>
                          {update.policePresence ? 'Policía presente' : 'Sin policía'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <Badge variant={update.streetClosure ? 'destructive' : 'outline'}>
                          {update.streetClosure ? 'Calle cortada' : 'Calle abierta'}
                        </Badge>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        por {update.createdBy.firstName} {update.createdBy.lastName}
                      </div>
                    </div>

                    {update.notes && (
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-sm">{update.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Update Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Actualización al Historial</DialogTitle>
              <DialogDescription>
                Registra el estado actual del evento para el seguimiento temporal
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Fecha y Hora</label>
                <Input
                  type="datetime-local"
                  value={newUpdate.updateTime || ''}
                  min={updates.length > 0
                    ? format(new Date(new Date(updates[0].updateTime).getTime() + 60000), "yyyy-MM-dd'T'HH:mm")
                    : undefined
                  }
                  onChange={(e) => setNewUpdate({ ...newUpdate, updateTime: e.target.value })}
                />
                {updates.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Debe ser posterior a {format(new Date(updates[0].updateTime), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Actualización</label>
                <Select
                  value={newUpdate.updateType}
                  onValueChange={(value: EventUpdate['updateType']) =>
                    setNewUpdate({ ...newUpdate, updateType: value })
                  }
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

              <div>
                <label className="text-sm font-medium">Número de Personas</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ej: 150"
                  value={newUpdate.attendeeCount ?? ''}
                  onChange={(e) => setNewUpdate({
                    ...newUpdate,
                    attendeeCount: e.target.value === '' ? undefined : parseInt(e.target.value)
                  })}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="policePresence"
                    checked={newUpdate.policePresence}
                    onChange={(e) => setNewUpdate({
                      ...newUpdate,
                      policePresence: e.target.checked
                    })}
                  />
                  <label htmlFor="policePresence" className="text-sm">
                    Presencia policial
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="streetClosure"
                    checked={newUpdate.streetClosure}
                    onChange={(e) => setNewUpdate({
                      ...newUpdate,
                      streetClosure: e.target.checked
                    })}
                  />
                  <label htmlFor="streetClosure" className="text-sm">
                    Corte de calle
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea
                  placeholder="Describe la situación actual, incidentes, clima, etc."
                  value={newUpdate.notes || ''}
                  onChange={(e) => setNewUpdate({ ...newUpdate, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitUpdate}>
                Registrar Actualización
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Update Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Actualización</DialogTitle>
              <DialogDescription>
                Modifica los datos de esta actualización (disponible por 15 minutos)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Fecha y Hora</label>
                <Input
                  type="datetime-local"
                  value={editForm.updateTime || ''}
                  onChange={(e) => setEditForm({ ...editForm, updateTime: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Actualización</label>
                <Select
                  value={editForm.updateType}
                  onValueChange={(value: EventUpdate['updateType']) =>
                    setEditForm({ ...editForm, updateType: value })
                  }
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

              <div>
                <label className="text-sm font-medium">Número de Personas</label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.attendeeCount || 0}
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
                    id="editPolicePresence"
                    checked={editForm.policePresence || false}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      policePresence: e.target.checked
                    })}
                  />
                  <label htmlFor="editPolicePresence" className="text-sm">
                    Presencia policial
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="editStreetClosure"
                    checked={editForm.streetClosure || false}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      streetClosure: e.target.checked
                    })}
                  />
                  <label htmlFor="editStreetClosure" className="text-sm">
                    Corte de calle
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea
                  placeholder="Describe la situación actual, incidentes, clima, etc."
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitEdit} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
