'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Check, X, Eye, Filter, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useSession } from '@/hooks/use-session-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import type { Notification, NotificationType } from '@/types/notifications';
import { NOTIFICATION_TYPE_LABELS, NOTIFICATION_STATUS_LABELS } from '@/types/notifications';

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

export function NotificationsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const canModerate = session?.user.role === 'level_1' || session?.user.role === 'level_2' || session?.user.role === 'level_3';
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    notification: Notification | null;
  }>({ open: false, action: 'approve', notification: null });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch notifications
  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ['notifications', page, limit, filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterType !== 'all' && { type: filterType }),
      });

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json() as Promise<PaginatedResponse<Notification>>;
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Approve cancellation mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to approve');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setConfirmDialog({ open: false, action: 'approve', notification: null });
    },
  });

  // Reject cancellation mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reject');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setConfirmDialog({ open: false, action: 'reject', notification: null });
    },
  });

  function getTypeBadgeVariant(type: NotificationType): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (type === 'cancellation_request') return 'destructive';
    if (type === 'cancellation_approved') return 'default';
    if (type === 'cancellation_rejected') return 'secondary';
    return 'outline';
  }

  function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'unread') return 'destructive';
    if (status === 'read') return 'secondary';
    if (status === 'resolved') return 'default';
    if (status === 'rejected') return 'outline';
    return 'outline';
  }

  function isActionable(notification: Notification): boolean {
    return (
      canModerate &&
      notification.actionable &&
      notification.type === 'cancellation_request' &&
      (notification.status === 'unread' || notification.status === 'read')
    );
  }

  function handleConfirmAction() {
    if (!confirmDialog.notification) return;
    if (confirmDialog.action === 'approve') {
      approveMutation.mutate(confirmDialog.notification.id);
    } else {
      rejectMutation.mutate(confirmDialog.notification.id);
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notificaciones</h1>
            <p className="text-muted-foreground mt-2">
              Revisa solicitudes y notificaciones del sistema
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="hover:cursor-pointer"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="h-4 w-4" />
                {(filterStatus !== 'all' || filterType !== 'all') && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]">
                    {[filterStatus !== 'all', filterType !== 'all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="pt-0 border-t">
              <div className="flex gap-3 flex-wrap pt-4">
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="unread">No leídas</SelectItem>
                    <SelectItem value="read">Leídas</SelectItem>
                    <SelectItem value="resolved">Resueltas</SelectItem>
                    <SelectItem value="rejected">Rechazadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="requirement_created">Nuevo Requerimiento</SelectItem>
                    <SelectItem value="requirement_voided">Requerimiento Dejado Sin Efecto</SelectItem>
                    <SelectItem value="cancellation_request">Solicitud de Cancelación</SelectItem>
                    <SelectItem value="cancellation_approved">Cancelación Aprobada</SelectItem>
                    <SelectItem value="cancellation_rejected">Cancelación Rechazada</SelectItem>
                  </SelectContent>
                </Select>
                {(filterStatus !== 'all' || filterType !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterType('all'); setPage(1); }}>
                    <X className="h-4 w-4 mr-1" /> Limpiar
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Notificaciones ({notificationsResponse?.meta.total || 0})
            </CardTitle>
            <CardDescription>
              Solicitudes de cancelación y notificaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando notificaciones...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Tipo</TableHead>
                      <TableHead>Evento / Requerimiento</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay notificaciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      notificationsResponse?.data.map((notification) => (
                        <React.Fragment key={notification.id}>
                          <TableRow
                            className={notification.status === 'unread' ? 'bg-primary/5' : ''}
                          >
                            {/* Expand toggle */}
                            <TableCell className="pr-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:cursor-pointer"
                                onClick={() => setExpandedRow(expandedRow === notification.id ? null : notification.id)}
                              >
                                {expandedRow === notification.id
                                  ? <ChevronUp className="h-4 w-4" />
                                  : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getTypeBadgeVariant(notification.type)} className='w-fit whitespace-nowrap'>
                                {NOTIFICATION_TYPE_LABELS[notification.type]}
                              </Badge>
                            </TableCell>
                            {/* Evento / Requerimiento */}
                            <TableCell>
                              {notification.requirement ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">Requerimiento</p>
                                  <p className="text-sm font-medium leading-tight">{notification.requirement.title}</p>
                                  {notification.requirement.deadline && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Vence: {new Date(notification.requirement.deadline).toLocaleDateString('es-AR')}
                                    </p>
                                  )}
                                </div>
                              ) : notification.event ? (
                                <div className="space-y-0.5">
                                  <p className="text-xs text-muted-foreground">Evento</p>
                                  <p className="text-sm font-medium leading-tight">{notification.event.title}</p>
                                  {notification.event.eventDate && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(notification.event.eventDate).toLocaleDateString('es-AR')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {notification.sender.firstName} {notification.sender.lastName}
                            </TableCell>
                            <TableCell>
                              {new Date(notification.createdAt).toLocaleDateString('es-AR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(notification.status)}>
                                {NOTIFICATION_STATUS_LABELS[notification.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    setViewDialogOpen(true);
                                    if (notification.status === 'unread') {
                                      markAsReadMutation.mutate(notification.id);
                                    }
                                  }}
                                  className="hover:cursor-pointer"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isActionable(notification) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="text-green-600 hover:bg-green-400 hover:cursor-pointer"
                                      onClick={() =>
                                        setConfirmDialog({ open: true, action: 'approve', notification })
                                      }
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="text-red-600 hover:bg-red-400 hover:cursor-pointer"
                                      onClick={() =>
                                        setConfirmDialog({ open: true, action: 'reject', notification })
                                      }
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Expanded message row */}
                          {expandedRow === notification.id && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell />
                              <TableCell colSpan={6} className="py-3 pb-4 space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Mensaje</p>
                                  <p className="text-sm leading-relaxed">{notification.message}</p>
                                </div>
                                {notification.requirement?.description && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Descripción del requerimiento</p>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{notification.requirement.description}</p>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>

                {notificationsResponse && notificationsResponse.meta.totalPages > 1 && (
                  <Pagination
                    currentPage={notificationsResponse.meta.page}
                    totalPages={notificationsResponse.meta.totalPages}
                    hasNextPage={notificationsResponse.meta.hasNextPage}
                    hasPreviousPage={notificationsResponse.meta.hasPreviousPage}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Notification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedNotification ? NOTIFICATION_TYPE_LABELS[selectedNotification.type] : ''}
            </DialogTitle>
            <DialogDescription>
              Detalles de la notificación
            </DialogDescription>
          </DialogHeader>
          {selectedNotification && (
            <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-4">
              {/* Message body — prominent */}
              <div className="rounded-lg bg-muted/50 border p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mensaje</p>
                <p className="text-sm leading-relaxed">{selectedNotification.message}</p>
              </div>

              {/* Event or Requirement details */}
              {selectedNotification.requirement && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Requerimiento</p>
                  <p className="text-sm font-semibold">{selectedNotification.requirement.title}</p>
                  {selectedNotification.requirement.description && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedNotification.requirement.description}</p>
                  )}
                  {selectedNotification.requirement.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Vence: {new Date(selectedNotification.requirement.deadline).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              )}
              {selectedNotification.event && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Evento asociado</p>
                  <p className="text-sm font-semibold">{selectedNotification.event.title}</p>
                  {selectedNotification.event.eventDate && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedNotification.event.eventDate).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tipo</p>
                  <Badge variant={getTypeBadgeVariant(selectedNotification.type)}>
                    {NOTIFICATION_TYPE_LABELS[selectedNotification.type]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Estado</p>
                  <Badge variant={getStatusBadgeVariant(selectedNotification.status)}>
                    {NOTIFICATION_STATUS_LABELS[selectedNotification.status]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Enviado por</p>
                  <p className="text-sm">{selectedNotification.sender.firstName} {selectedNotification.sender.lastName} <span className="text-muted-foreground">(@{selectedNotification.sender.username})</span></p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Fecha</p>
                  <p className="text-sm">{new Date(selectedNotification.createdAt).toLocaleString('es-AR')}</p>
                </div>
              </div>
            </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedNotification && isActionable(selectedNotification) && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      action: 'reject',
                      notification: selectedNotification,
                    });
                    setViewDialogOpen(false);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setConfirmDialog({
                      open: true,
                      action: 'approve',
                      notification: selectedNotification,
                    });
                    setViewDialogOpen(false);
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Aprobar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog({ open: false, action: 'approve', notification: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === 'approve'
                ? 'Aprobar Cancelación'
                : 'Rechazar Cancelación'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === 'approve'
                ? '¿Estás seguro de que deseas aprobar esta solicitud? El evento será cancelado.'
                : '¿Estás seguro de que deseas rechazar esta solicitud?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, action: 'approve', notification: null })
              }
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className={confirmDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {(approveMutation.isPending || rejectMutation.isPending)
                ? 'Procesando...'
                : confirmDialog.action === 'approve'
                  ? 'Aprobar'
                  : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
