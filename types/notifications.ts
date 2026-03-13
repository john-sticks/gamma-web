export type NotificationType =
  | 'cancellation_request'
  | 'cancellation_approved'
  | 'cancellation_rejected';

export type NotificationStatus = 'unread' | 'read' | 'resolved' | 'rejected';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  status: NotificationStatus;
  actionable: boolean;
  senderId: string;
  sender: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  recipientId: string;
  eventId: string | null;
  event: {
    id: string;
    title: string;
    eventDate: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  cancellation_request: 'Solicitud de Cancelación',
  cancellation_approved: 'Cancelación Aprobada',
  cancellation_rejected: 'Cancelación Rechazada',
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  unread: 'No leída',
  read: 'Leída',
  resolved: 'Resuelta',
  rejected: 'Rechazada',
};
