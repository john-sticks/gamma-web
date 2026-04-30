'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';

interface DelegacionUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  assignedCities?: { id: string; name: string }[];
}

interface RequirementFormProps {
  backHref: string;
}

export function RequirementForm({ backHref }: RequirementFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [targetAll, setTargetAll] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
  });

  const { data: delegacionesResponse } = useQuery({
    queryKey: ['users', 'level_4'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=level_4&limit=100', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch delegaciones');
      return response.json() as Promise<{ data: DelegacionUser[] }>;
    },
    enabled: !targetAll,
  });

  const delegaciones = delegacionesResponse?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: object) => {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al crear el requerimiento');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      toast.success('Requerimiento creado correctamente', {
        description: 'Las delegaciones seleccionadas fueron notificadas.',
      });
      router.push(backHref);
    },
    onError: (err: Error) => {
      setError(err.message);
      toast.error('Error al crear el requerimiento', {
        description: err.message,
      });
    },
  });

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim() || !formData.description.trim() || !formData.deadline) {
      setError('Completá todos los campos obligatorios.');
      return;
    }

    if (!targetAll && selectedUserIds.length === 0) {
      setError('Seleccioná al menos una delegación destinataria.');
      return;
    }

    const deadlineDate = new Date(formData.deadline);
    if (deadlineDate <= new Date()) {
      setError('El plazo de respuesta debe ser una fecha futura.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      deadline: deadlineDate.toISOString(),
      targetAll,
      ...(!targetAll && { targetUserIds: selectedUserIds }),
    };

    createMutation.mutate(payload);
  }

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nuevo Requerimiento</h1>
          <p className="text-muted-foreground mt-2">
            Emitir un requerimiento a las delegaciones para que informen novedades
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del Requerimiento</CardTitle>
              <CardDescription>Completá la información del requerimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Informe sobre posibles exteriorizaciones"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Texto del requerimiento *</Label>
                <Textarea
                  id="description"
                  placeholder="Informar antes de las 16 hs del día 25 de mayo de 2026 sobre posibles exteriorizaciones a raíz de hecho..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Plazo de respuesta *</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Fecha y hora límite hasta la cual las delegaciones pueden responder
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destinatarios</CardTitle>
              <CardDescription>
                Elegí a qué delegaciones enviar el requerimiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetAll}
                    onChange={() => { setTargetAll(true); setSelectedUserIds([]); }}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Todas las delegaciones</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={!targetAll}
                    onChange={() => setTargetAll(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium">Delegaciones específicas</span>
                </label>
              </div>

              {!targetAll && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Seleccioná las delegaciones que deben responder:
                  </p>
                  {delegaciones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Cargando delegaciones...</p>
                  ) : (
                    <div className="border rounded-md divide-y max-h-72 overflow-y-auto">
                      {delegaciones.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                            className="accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username}
                              {user.assignedCities && user.assignedCities.length > 0 && (
                                <> · {user.assignedCities.map((c) => c.name).join(', ')}</>
                              )}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedUserIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedUserIds.length} delegación(es) seleccionada(s)
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="hover:cursor-pointer">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Requerimiento'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
