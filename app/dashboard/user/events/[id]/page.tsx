'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Users, Share2, Edit } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventTimeline } from '@/components/events/event-timeline';
import { EventChart } from '@/components/events/event-chart';
import { Card, CardContent} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event, EventUpdate, EventChartData, CreateEventUpdateDto, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from '@/types/events';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const queryClient = useQueryClient();

  // Fetch event details
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Error fetching event');
      return response.json();
    },
  });

  // Fetch event timeline
  const { data: updates = [], refetch: refetchUpdates } = useQuery<EventUpdate[]>({
    queryKey: ['event-updates', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/updates`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Error fetching updates');
      return response.json();
    },
    enabled: !!eventId,
  });

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery<EventChartData>({
    queryKey: ['event-chart', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/updates/chart`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Error fetching chart data');
      return response.json();
    },
    enabled: !!eventId,
  });

  // Add update mutation
  const addUpdateMutation = useMutation({
    mutationFn: async (newUpdate: CreateEventUpdateDto) => {
      // Convert updateTime to ISO string if it's not already
      const updateData = {
        ...newUpdate,
        updateTime: new Date(newUpdate.updateTime).toISOString(),
      };

      const response = await fetch(`/api/events/${eventId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al registrar la actualización');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Actualización registrada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['event-updates', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-chart', eventId] });
      refetchUpdates();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (eventLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (eventError || !event) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Evento no encontrado</h2>
            <p className="text-muted-foreground mb-4">
              El evento solicitado no existe o no tienes permisos para verlo.
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Volver
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddUpdate = (update: CreateEventUpdateDto) => {
    addUpdateMutation.mutate(update);
  };

  function getStatusBadgeVariant(status: Event['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default';
    if (status === 'pending') return 'secondary';
    if (status === 'rejected' || status === 'cancelled') return 'destructive';
    return 'outline';
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{event.title}</h1>
                <Badge variant={getStatusBadgeVariant(event.status)}>
                  {EVENT_STATUS_LABELS[event.status]}
                </Badge>
                <Badge variant="outline">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{event.description}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/user/events/edit/${event.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Event Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Fecha y Hora</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.eventDate), 'PPPp', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Ubicación</p>
                  <p className="text-sm text-muted-foreground">
                    {event.address}
                  </p>
                  <Badge variant="secondary" className="mt-1 font-semibold">
                    {event.city.name}
                  </Badge>
                </div>
              </div>

              {event.attendeeCount && (
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Asistencia Estimada</p>
                    <p className="text-sm text-muted-foreground">
                      {event.attendeeCount} personas
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Creado por <span className="font-medium text-foreground">{event.createdBy.firstName} {event.createdBy.lastName}</span>
                {' '}el {format(new Date(event.createdAt), 'PPP', { locale: es })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline and Chart Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">
              Historial ({updates.length})
            </TabsTrigger>
            <TabsTrigger value="chart">
              Gráfico de Progreso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <EventTimeline
              updates={updates}
              onAddUpdate={handleAddUpdate}
              canEdit={true}
              onRefresh={() => refetchUpdates()}
              eventId={event.id}
              userRole="level_4"
              cityName={event.city.name}
            />
          </TabsContent>

          <TabsContent value="chart">
            {chartLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
                    <div className="h-64 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : chartData ? (
              <EventChart chartData={chartData} />
            ) : (
              <Card>
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">
                    Error cargando datos del gráfico
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
