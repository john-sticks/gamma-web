'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PlusCircle, Eye, X, ChevronDown, ChevronUp, Filter, CheckCircle2, Circle } from 'lucide-react';
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
import type {
  Requirement,
  RequirementStatus,
  RequirementResponse,
  NotificationRead,
} from '@/types/requirements';
import {
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_RESPONSE_TYPE_LABELS,
} from '@/types/requirements';

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

interface RequirementsManagementProps {
  role: 'super-admin' | 'admin' | 'moderator';
}

export function RequirementsManagement({ role }: RequirementsManagementProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [responsesExpanded, setResponsesExpanded] = useState(false);
  const [readsExpanded, setReadsExpanded] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [readsModalOpen, setReadsModalOpen] = useState(false);
  const [readsModalReqId, setReadsModalReqId] = useState<string | null>(null);

  const { data: requirementsResponse, isLoading } = useQuery({
    queryKey: ['requirements', page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const response = await fetch(`/api/requirements?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json() as Promise<PaginatedResponse<Requirement>>;
    },
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ['requirement-responses', selectedRequirement?.id],
    queryFn: async () => {
      const response = await fetch(`/api/requirements/${selectedRequirement!.id}/responses`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch responses');
      return response.json() as Promise<RequirementResponse[]>;
    },
    enabled: !!selectedRequirement && detailOpen,
  });

  const { data: reads, isLoading: readsLoading } = useQuery({
    queryKey: ['requirement-reads', selectedRequirement?.id],
    queryFn: async () => {
      const response = await fetch(`/api/requirements/${selectedRequirement!.id}/reads`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch reads');
      return response.json() as Promise<NotificationRead[]>;
    },
    enabled: !!selectedRequirement && detailOpen,
  });

  const { data: readsModal, isLoading: readsModalLoading } = useQuery({
    queryKey: ['requirement-reads', readsModalReqId],
    queryFn: async () => {
      const response = await fetch(`/api/requirements/${readsModalReqId}/reads`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch reads');
      return response.json() as Promise<NotificationRead[]>;
    },
    enabled: !!readsModalReqId && readsModalOpen,
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/requirements/${id}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to close requirement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      setCloseConfirmOpen(false);
      setDetailOpen(false);
    },
  });

  function getStatusVariant(status: RequirementStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'active') return 'default';
    if (status === 'expired') return 'destructive';
    if (status === 'voided') return 'outline';
    return 'secondary';
  }

  function isOverdue(deadline: string): boolean {
    return new Date() > new Date(deadline);
  }

  function openDetail(req: Requirement) {
    setSelectedRequirement(req);
    setResponsesExpanded(false);
    setReadsExpanded(false);
    setDetailOpen(true);
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Requerimientos</h1>
            <p className="text-muted-foreground mt-2">
              Gestioná los requerimientos enviados a las delegaciones
            </p>
          </div>
          <Button
            onClick={() => router.push(`/dashboard/${role}/requirements/create`)}
            className="hover:cursor-pointer"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Requerimiento
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
                {filterStatus !== 'all' && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]">1</Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="pt-0 border-t">
              <div className="flex flex-wrap gap-3 pt-4">
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="closed">Cerrados</SelectItem>
                    <SelectItem value="expired">Vencidos</SelectItem>
                    <SelectItem value="voided">Sin efecto</SelectItem>
                  </SelectContent>
                </Select>
                {filterStatus !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setPage(1); }}>
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
            <CardTitle>Requerimientos ({requirementsResponse?.meta.total ?? 0})</CardTitle>
            <CardDescription>Requerimientos emitidos a delegaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Cargando requerimientos...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Destinatarios</TableHead>
                      <TableHead>Plazo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Visto por</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirementsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay requerimientos
                        </TableCell>
                      </TableRow>
                    ) : (
                      requirementsResponse?.data.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium max-w-64 truncate">
                            {req.title}
                          </TableCell>
                          <TableCell>
                            {req.targetAll
                              ? <Badge variant="outline">Todas las delegaciones</Badge>
                              : <span className="text-sm text-muted-foreground">{req.targetUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ')}</span>
                            }
                          </TableCell>
                          <TableCell>
                            <span className={isOverdue(req.deadline) && req.status === 'active' ? 'text-destructive font-medium' : ''}>
                              {new Date(req.deadline).toLocaleString('es-AR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(req.status)}>
                              {REQUIREMENT_STATUS_LABELS[req.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {req.readSummary && req.readSummary.total > 0 ? (
                              <Badge
                                variant={req.readSummary.seen === req.readSummary.total ? 'default' : 'secondary'}
                                className="font-mono cursor-pointer hover:opacity-80"
                                onClick={() => { setReadsModalReqId(req.id); setReadsModalOpen(true); }}
                              >
                                {req.readSummary.seen}/{req.readSummary.total}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {req.createdBy.firstName} {req.createdBy.lastName}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openDetail(req)}
                              className="hover:cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {requirementsResponse && requirementsResponse.meta.totalPages > 1 && (
                  <Pagination
                    currentPage={requirementsResponse.meta.page}
                    totalPages={requirementsResponse.meta.totalPages}
                    hasNextPage={requirementsResponse.meta.hasNextPage}
                    hasPreviousPage={requirementsResponse.meta.hasPreviousPage}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequirement?.title}</DialogTitle>
            <DialogDescription>Detalle del requerimiento y respuestas de las delegaciones</DialogDescription>
          </DialogHeader>
          {selectedRequirement && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Descripción</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequirement.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Estado</h4>
                  <Badge variant={getStatusVariant(selectedRequirement.status)}>
                    {REQUIREMENT_STATUS_LABELS[selectedRequirement.status]}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Plazo de respuesta</h4>
                  <p className="text-sm">
                    {new Date(selectedRequirement.deadline).toLocaleString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Destinatarios</h4>
                  <p className="text-sm">
                    {selectedRequirement.targetAll
                      ? 'Todas las delegaciones'
                      : selectedRequirement.targetUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ')}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Emitido por</h4>
                  <p className="text-sm">
                    {selectedRequirement.createdBy.firstName} {selectedRequirement.createdBy.lastName}
                  </p>
                </div>
              </div>

              {/* Notification reads */}
              <div>
                <button
                  className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                  onClick={() => setReadsExpanded(!readsExpanded)}
                >
                  Tomaron conocimiento
                  {reads && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({reads.filter(r => r.seen).length}/{reads.length})
                    </span>
                  )}
                  {readsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {readsExpanded && (
                  <div className="mt-3">
                    {readsLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando...</p>
                    ) : reads && reads.length > 0 ? (
                      <div className="space-y-2">
                        {reads.map((r) => (
                          <div key={r.userId} className="flex items-center gap-2 text-sm">
                            {r.seen
                              ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                              : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                            }
                            <span className={r.seen ? '' : 'text-muted-foreground'}>
                              {r.firstName} {r.lastName}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin datos de lectura.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Responses */}
              <div>
                <button
                  className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                  onClick={() => setResponsesExpanded(!responsesExpanded)}
                >
                  Respuestas de delegaciones
                  {responsesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {responsesExpanded && (
                  <div className="mt-3">
                    {responsesLoading ? (
                      <p className="text-sm text-muted-foreground">Cargando respuestas...</p>
                    ) : responses && responses.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Delegación</TableHead>
                            <TableHead>Respuesta</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead>Fecha</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {responses.map((resp) => (
                            <TableRow key={resp.id}>
                              <TableCell>
                                {resp.respondedBy.firstName} {resp.respondedBy.lastName}
                              </TableCell>
                              <TableCell>
                                <Badge variant={resp.type === 'positive' ? 'default' : 'secondary'}>
                                  {REQUIREMENT_RESPONSE_TYPE_LABELS[resp.type]}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-48 truncate text-muted-foreground">
                                {resp.notes ?? '—'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(resp.createdAt).toLocaleString('es-AR', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aún no hay respuestas.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {selectedRequirement?.status === 'active' && (
              <Button
                variant="destructive"
                onClick={() => setCloseConfirmOpen(true)}
                className="hover:cursor-pointer"
              >
                <X className="mr-2 h-4 w-4" />
                Dejar sin efecto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Confirm Dialog */}
      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dejar sin efecto Requerimiento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas dejar sin efecto este requerimiento? Las delegaciones ya no podrán responder y todos sus eventos asociados quedarán sin efecto. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirmOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequirement && closeMutation.mutate(selectedRequirement.id)}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? 'Cerrando...' : 'Cerrar Requerimiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reads Modal */}
      <Dialog open={readsModalOpen} onOpenChange={(open) => { setReadsModalOpen(open); if (!open) setReadsModalReqId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Estado de lectura</DialogTitle>
            <DialogDescription>Delegaciones que tomaron conocimiento del requerimiento</DialogDescription>
          </DialogHeader>
          {readsModalLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
          ) : readsModal && readsModal.length > 0 ? (
            <div className="space-y-2 py-2">
              {readsModal.map((r) => (
                <div key={r.userId} className="flex items-center gap-3 text-sm">
                  {r.seen
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <span className={r.seen ? '' : 'text-muted-foreground'}>
                    {r.firstName} {r.lastName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin datos de lectura.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadsModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
