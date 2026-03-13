'use client';

import { useState } from 'react';
import { MapPin, Calendar, Users, Eye, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Event } from '@/types/events';
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from '@/types/events';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onApprove?: (event: Event) => void;
  onReject?: (event: Event) => void;
  showActions?: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    approve?: boolean;
    reject?: boolean;
  };
  editPath?: string;
}

export function EventCard({
  event,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  showActions = { view: true },
  editPath,
}: EventCardProps) {
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  function getStatusBadgeVariant(status: Event['status']): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default';
    if (status === 'pending') return 'secondary';
    if (status === 'rejected' || status === 'cancelled') return 'destructive';
    return 'outline';
  }

  function getEventTypeColor(type: Event['eventType']): string {
    const colors: Record<Event['eventType'], string> = {
      manifestacion: 'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20 dark:text-destructive-foreground',
      marcha: 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400',
      concentracion: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-400',
      asamblea: 'bg-green-500/10 text-green-700 border-green-500/30 dark:bg-green-500/20 dark:text-green-400',
      otro: 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary-foreground',
    };
    return colors[type];
  }

  const eventDate = new Date(event.eventDate);
  const isPastEvent = eventDate < new Date();

  // Truncate description to 150 characters
  const MAX_DESCRIPTION_LENGTH = 150;
  const truncatedDescription = event.description.length > MAX_DESCRIPTION_LENGTH
    ? event.description.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
    : event.description;
  const needsTruncation = event.description.length > MAX_DESCRIPTION_LENGTH;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
        <CardHeader className={`pb-3 ${getEventTypeColor(event.eventType)} border-b`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
              <CardDescription className="mt-1.5 flex items-center gap-2">
                <Badge variant="outline" className="border-current/20 bg-background/50">
                  {EVENT_TYPE_LABELS[event.eventType]}
                </Badge>
              </CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(event.status)}>
              {EVENT_STATUS_LABELS[event.status]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3 flex-1">
          <div className="text-sm text-muted-foreground">
            <p>{truncatedDescription}</p>
            {needsTruncation && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-primary"
                onClick={() => setShowDescriptionModal(true)}
              >
                Ver más
              </Button>
            )}
          </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className={isPastEvent ? 'line-through opacity-60' : 'font-medium'}>
              {eventDate.toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {eventDate.toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })} hs
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.city?.name || 'Sin ciudad'}</span>
          </div>

          {event.attendeeCount && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span>{event.attendeeCount} asistentes estimados</span>
            </div>
          )}
        </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Creado por: <span className="font-medium">{event.createdBy.firstName} {event.createdBy.lastName}</span>
            </p>
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t bg-muted/30 flex flex-wrap gap-2 mt-auto">
        {showActions?.view && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/user/events/${event.id}`}>
              <Eye className="h-4 w-4 mr-1.5" />
              Ver Detalle
            </Link>
          </Button>
        )}

        {showActions?.edit && (
          editPath ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={editPath}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Editar
              </Link>
            </Button>
          ) : onEdit ? (
            <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
          ) : null
        )}

        {showActions?.delete && onDelete && (
          <Button variant="outline" size="sm" onClick={() => onDelete(event)}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Eliminar
          </Button>
        )}

        {showActions?.approve && onApprove && (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:bg-green-50 border-green-200 dark:text-green-400 dark:hover:bg-green-950/30"
            onClick={() => onApprove(event)}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Aprobar
          </Button>
        )}

        {showActions?.reject && onReject && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => onReject(event)}
          >
            <X className="h-4 w-4 mr-1.5" />
            Rechazar
          </Button>
        )}
        </CardFooter>
      </Card>

      {/* Modal para descripción completa */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{event.title}</DialogTitle>
            <DialogDescription>Descripción completa del evento</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDescriptionModal(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
