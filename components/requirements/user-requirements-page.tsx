'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
//import { useSession } from '@/hooks/use-session-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
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
import { PlusCircle, Eye, Filter, X } from 'lucide-react';
import type { RequirementWithMyResponse, RequirementStatus } from '@/types/requirements';
import { REQUIREMENT_STATUS_LABELS, REQUIREMENT_RESPONSE_TYPE_LABELS } from '@/types/requirements';

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

export function UserRequirementsPage() {
  const router = useRouter();
  // const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequirementWithMyResponse | null>(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState<'positive' | 'negative'>('negative');
  const [responseNotes, setResponseNotes] = useState('');
  const [respondError, setRespondError] = useState<string | null>(null);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  const [amendNotes, setAmendNotes] = useState('');
  const [amendError, setAmendError] = useState<string | null>(null);

  const { data: requirementsResponse, isLoading } = useQuery({
    queryKey: ['requirements-my', page, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filterStatus !== 'all' && { status: filterStatus }),
      });
      const response = await fetch(`/api/requirements/my?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch requirements');
      return response.json() as Promise<PaginatedResponse<RequirementWithMyResponse>>;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, type, notes }: { id: string; type: string; notes?: string }) => {
      const response = await fetch(`/api/requirements/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, notes: notes || undefined }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al responder');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements-my'] });
      queryClient.invalidateQueries({ queryKey: ['requirements-pending-count'] });
      setRespondDialogOpen(false);
      setDetailOpen(false);
      setResponseNotes('');
      setRespondError(null);
    },
    onError: (err: Error) => {
      setRespondError(err.message);
    },
  });

  function isOverdue(deadline: string) {
    return new Date() > new Date(deadline);
  }

  function getStatusVariant(status: RequirementStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'active') return 'default';
    if (status === 'expired') return 'destructive';
    return 'secondary';
  }

  function openRespond(req: RequirementWithMyResponse) {
    setSelectedReq(req);
    setResponseType('negative');
    setResponseNotes('');
    setRespondError(null);
    setRespondDialogOpen(true);
  }

  function handleRespond() {
    if (!selectedReq) return;
    respondMutation.mutate({
      id: selectedReq.id,
      type: responseType,
      notes: responseNotes,
    });
  }

  const amendMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await fetch(`/api/requirements/${id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: notes || undefined }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al ampliar la respuesta');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements-my'] });
      setAmendDialogOpen(false);
      setDetailOpen(false);
      setAmendNotes('');
      setAmendError(null);
    },
    onError: (err: Error) => {
      setAmendError(err.message);
    },
  });

  function canRespond(req: RequirementWithMyResponse) {
    return req.status === 'active' && !req.myResponse && !isOverdue(req.deadline);
  }

  function canAmend(req: RequirementWithMyResponse) {
    const overdue = isOverdue(req.deadline);
    return (
      req.myResponse?.type === 'negative' &&
      (req.status === 'expired' || (req.status === 'active' && overdue))
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Requerimientos</h1>
          <p className="text-muted-foreground mt-2">
            Requerimientos emitidos a tu delegación. Respondé antes del plazo indicado.
          </p>
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
            <CardDescription>Requerimientos dirigidos a tu delegación</CardDescription>
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
                      <TableHead>Plazo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mi respuesta</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requirementsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay requerimientos para tu delegación
                        </TableCell>
                      </TableRow>
                    ) : (
                      requirementsResponse?.data.map((req) => (
                        <TableRow
                          key={req.id}
                          className={canRespond(req) ? 'bg-primary/5' : ''}
                        >
                          <TableCell className="font-medium max-w-64 truncate">
                            {req.title}
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
                            {req.myResponse ? (
                              <Badge variant={req.myResponse.type === 'positive' ? 'default' : 'secondary'}>
                                {REQUIREMENT_RESPONSE_TYPE_LABELS[req.myResponse.type]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin respuesta</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSelectedReq(req); setDetailOpen(true); }}
                                className="hover:cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canRespond(req) && (
                                <Button
                                  size="sm"
                                  onClick={() => openRespond(req)}
                                  className="hover:cursor-pointer"
                                >
                                  Responder
                                </Button>
                              )}
                              {canAmend(req) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setSelectedReq(req); setAmendNotes(''); setAmendError(null); setAmendDialogOpen(true); }}
                                  className="hover:cursor-pointer"
                                >
                                  Ampliar respuesta
                                </Button>
                              )}
                              {req.myResponse?.type === 'positive' && (req.status === 'active' || req.status === 'expired') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/dashboard/user/events/create?requirementId=${req.id}`)}
                                  className="hover:cursor-pointer"
                                >
                                  <PlusCircle className="mr-1 h-4 w-4" />
                                  Cargar Evento
                                </Button>
                              )}
                            </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReq?.title}</DialogTitle>
            <DialogDescription>Requerimiento emitido por moderación</DialogDescription>
          </DialogHeader>
          {selectedReq && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Descripción</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReq.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Plazo de respuesta</h4>
                  <p className="text-sm">
                    {new Date(selectedReq.deadline).toLocaleString('es-AR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Mi respuesta</h4>
                  {selectedReq.myResponse ? (
                    <div className="space-y-1">
                      <Badge variant={selectedReq.myResponse.type === 'positive' ? 'default' : 'secondary'}>
                        {REQUIREMENT_RESPONSE_TYPE_LABELS[selectedReq.myResponse.type]}
                      </Badge>
                      {selectedReq.myResponse.notes && (
                        <p className="text-xs text-muted-foreground">{selectedReq.myResponse.notes}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin respuesta</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {selectedReq && canRespond(selectedReq) && (
              <Button onClick={() => { setDetailOpen(false); openRespond(selectedReq); }}>
                Responder
              </Button>
            )}
            {selectedReq && canAmend(selectedReq) && (
              <Button
                variant="outline"
                onClick={() => { setDetailOpen(false); setAmendNotes(''); setAmendError(null); setAmendDialogOpen(true); }}
              >
                Ampliar respuesta
              </Button>
            )}
            {selectedReq?.myResponse?.type === 'positive' && (selectedReq.status === 'active' || selectedReq.status === 'expired') && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/user/events/create?requirementId=${selectedReq.id}`)}
              >
                <PlusCircle className="mr-1 h-4 w-4" />
                Cargar Evento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Requerimiento</DialogTitle>
            <DialogDescription>{selectedReq?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {respondError && (
              <Alert variant="destructive"><p>{respondError}</p></Alert>
            )}
            <div className="space-y-2">
              <Label>Tipo de respuesta *</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="responseType"
                    value="negative"
                    checked={responseType === 'negative'}
                    onChange={() => setResponseType('negative')}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Negativo — No hay concentraciones en mi jurisdicción</span>
                </label>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="responseType"
                    value="positive"
                    checked={responseType === 'positive'}
                    onChange={() => setResponseType('positive')}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Positivo — Hay concentraciones, cargaré los eventos</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Información adicional sobre la respuesta..."
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                rows={3}
              />
            </div>
            {responseType === 'positive' && (
              <Alert>
                <p className="text-sm">
                  Después de confirmar tu respuesta positiva, podrás cargar los eventos correspondientes desde la tabla de requerimientos.
                </p>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleRespond}
              disabled={respondMutation.isPending}
              className="hover:cursor-pointer"
            >
              {respondMutation.isPending ? 'Enviando...' : 'Confirmar Respuesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amend Dialog */}
      <Dialog open={amendDialogOpen} onOpenChange={(open) => { setAmendDialogOpen(open); if (!open) { setAmendNotes(''); setAmendError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ampliar respuesta</DialogTitle>
            <DialogDescription>
              Estás ampliando tu respuesta a <strong>positivo</strong> — confirmás que hay concentraciones en tu jurisdicción que no habías registrado al momento del vencimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {amendError && <Alert variant="destructive"><p>{amendError}</p></Alert>}
            <div className="space-y-2">
              <Label>Notas adicionales (opcional)</Label>
              <Textarea
                placeholder="Describí brevemente la situación..."
                value={amendNotes}
                onChange={(e) => setAmendNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmendDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => selectedReq && amendMutation.mutate({ id: selectedReq.id, notes: amendNotes })}
              disabled={amendMutation.isPending}
              className="hover:cursor-pointer"
            >
              {amendMutation.isPending ? 'Guardando...' : 'Confirmar ampliación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
