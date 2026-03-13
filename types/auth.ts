export type UserRole = 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  assignedCities?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface UserSession {
  accessToken: string;
  user: User;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  level_1: 5, // SUPER ADMIN
  level_2: 4, // ADMIN
  level_3: 3, // MODERATOR
  level_4: 2, // STANDARD USER
  level_5: 1, // READ ONLY USER
};

export const ROLE_NAMES: Record<UserRole, string> = {
  level_1: 'Super Admin',
  level_2: 'Admin',
  level_3: 'Moderator',
  level_4: 'Standard User',
  level_5: 'Read Only',
};
