export type RequirementStatus = 'active' | 'closed' | 'expired' | 'voided';
export type RequirementResponseType = 'positive' | 'negative';

export interface RequirementUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface RequirementReadSummary {
  seen: number;
  total: number;
}

export interface NotificationRead {
  userId: string;
  firstName: string;
  lastName: string;
  seen: boolean;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: RequirementStatus;
  targetAll: boolean;
  targetUsers: RequirementUser[];
  createdBy: RequirementUser;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  readSummary?: RequirementReadSummary;
}

export interface RequirementResponse {
  id: string;
  requirementId: string;
  type: RequirementResponseType;
  notes: string | null;
  respondedBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  respondedById: string;
  createdAt: string;
  updatedAt: string;
}

// Requirement enriched with the current user's own response (for L4 view)
export interface RequirementWithMyResponse extends Requirement {
  myResponse: RequirementResponse | null;
}

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  active: 'Activo',
  closed: 'Cerrado',
  expired: 'Vencido',
  voided: 'Sin efecto',
};

export const REQUIREMENT_RESPONSE_TYPE_LABELS: Record<RequirementResponseType, string> = {
  positive: 'Positivo',
  negative: 'Negativo',
};
