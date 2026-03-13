import { UserRole, ROLE_HIERARCHY } from '@/types/auth';

/**
 * Check if a user role has minimum required permissions
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if the user has sufficient permissions
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if the current path is an authentication page
 * @param pathname - The current pathname
 * @returns true if the path is an auth page
 */
export function isAuthPage(pathname: string): boolean {
  const authPaths = ['/login'];
  return authPaths.some((path) => pathname.startsWith(path));
}

/**
 * Check if a path is public (doesn't require authentication)
 * @param pathname - The current pathname
 * @returns true if the path is public
 */
export function isPublicPath(pathname: string): boolean {
  const publicPaths = ['/login', '/api'];
  return publicPaths.some((path) => pathname.startsWith(path));
}

/**
 * Get the dashboard route based on user role
 * @param role - The user's role
 * @returns The dashboard route for the role
 */
export function getDashboardRoute(role: UserRole): string {
  const dashboardRoutes: Record<UserRole, string> = {
    level_1: '/dashboard/super-admin',
    level_2: '/dashboard/admin',
    level_3: '/dashboard/moderator',
    level_4: '/dashboard/user',
    level_5: '/dashboard/readonly',
  };

  return dashboardRoutes[role] || '/dashboard/user';
}
