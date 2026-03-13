// Tipos generados automáticamente
export type { CreateEventDto, UpdateEventDto } from '@/lib/generated';

// Título predefinido de evento
export interface EventTitle {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

// Tipo para actualizaciones del historial
export interface EventUpdate {
  id: string;
  eventId: string;
  updateTime: string;
  updateType: 'attendance_update' | 'police_arrival' | 'police_departure' | 'street_closure' | 'street_reopened' | 'general_update' | 'incident' | 'event_start' | 'event_end' | 'event_created';
  attendeeCount: number;
  policePresence: boolean;
  streetClosure: boolean;
  notes?: string;
  latitude?: number;
  longitude?: number;
  createdById: string;
  createdBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Tipo para evento update con evento incluido (para pending management)
export interface EventUpdateWithEvent extends EventUpdate {
  event: Event;
}

// Tipo para datos de gráfico temporal
export interface EventChartData {
  eventId: string;
  dataPoints: {
    timestamp: string;
    time: string;
    attendees: number;
    policePresence: boolean;
    streetClosure: boolean;
    type: EventUpdate['updateType'];
    notes: string;
  }[];
  totalDataPoints: number;
  duration: {
    start: string;
    end: string;
    durationMinutes: number;
  } | null;
}

// DTO para crear actualizaciones
export interface CreateEventUpdateDto {
  updateTime: string;
  updateType: EventUpdate['updateType'];
  attendeeCount: number;
  policePresence: boolean;
  streetClosure: boolean;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

// Tipo extendido del evento con relaciones
export interface Event {
  id: string;
  title: string;
  description: string;
  eventType: 'manifestacion' | 'marcha' | 'concentracion' | 'asamblea' | 'otro';
  eventDate: string;
  address: string;
  city: {
    id: string;
    name: string;
    slug: string;
  };
  cityId: string;
  eventTitle?: EventTitle | null;
  eventTitleId?: string;
  isCustomTitle?: boolean;
  locality?: { id: string; name: string; slug: string } | null;
  localityId?: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'approved' | 'rejected';
  lifecycleStatus?: 'pending' | 'awaiting_start' | 'ongoing' | 'completed' | 'cancelled' | 'pending_cancellation';
  attendeeCount?: number;
  createdById: string;
  createdBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Evento enriquecido con la última actualización
export interface EventWithLatestUpdate extends Event {
  latestUpdate: {
    id: string;
    updateTime: string;
    updateType: EventUpdate['updateType'];
    attendeeCount: number;
    policePresence: boolean;
    streetClosure: boolean;
    notes?: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
    } | null;
  } | null;
}

export const EVENT_TYPE_LABELS: Record<Event['eventType'], string> = {
  manifestacion: 'Manifestación',
  marcha: 'Marcha',
  concentracion: 'Concentración',
  asamblea: 'Asamblea',
  otro: 'Otro',
};

export const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  pending: 'Pendiente de ser aprobado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export const EVENT_LIFECYCLE_STATUS_LABELS: Record<NonNullable<Event['lifecycleStatus']>, string> = {
  pending: 'Próximo',
  awaiting_start: 'Esperando primer panorama',
  ongoing: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
  pending_cancellation: 'Pendiente de cancelación',
};

export const EVENT_UPDATE_STATUS_LABELS: Record<EventUpdate['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export const UPDATE_TYPE_LABELS: Record<EventUpdate['updateType'], string> = {
  attendance_update: 'Actualización de asistencia',
  police_arrival: 'Llegada de policía',
  police_departure: 'Retirada de policía',
  street_closure: 'Corte de calle',
  street_reopened: 'Apertura de calle',
  general_update: 'Actualización general',
  incident: 'Incidente',
  event_start: 'Inicio del evento',
  event_end: 'Fin del evento',
  event_created: 'Evento creado',
};
