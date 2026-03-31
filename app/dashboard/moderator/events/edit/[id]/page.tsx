'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { EventForm } from '@/components/events/event-form';
import type { Event } from '@/types/events';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json() as Promise<Event>;
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Editar Evento</h1>
            <p className="text-muted-foreground mt-2">
              Modifica los datos del evento
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Cargando evento...</p>
            </div>
          ) : event ? (
            <EventForm mode="edit" event={event} />
          ) : (
            <div className="text-center py-12">
              <p className="text-destructive">No se pudo cargar el evento</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
