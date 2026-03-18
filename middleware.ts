import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'gamma-session';

/**
 * Decode a JWT payload without verification (for expiration check only).
 * The actual signature verification happens on the API server.
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    // Add 30s buffer to avoid edge cases
    return Date.now() >= payload.exp * 1000 - 30000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Get session cookie
  const sessionCookie = request.cookies.get(COOKIE_NAME);
  const hasSession = !!sessionCookie?.value;

  // Check if JWT is expired
  if (hasSession) {
    try {
      const session = JSON.parse(sessionCookie!.value);
      if (session.accessToken && isJwtExpired(session.accessToken)) {
        // JWT expired — clear cookie and treat as no session
        const response = isPublicPath
          ? NextResponse.next()
          : NextResponse.redirect(
              new URL(
                pathname !== '/'
                  ? `/login?redirect=${encodeURIComponent(pathname)}`
                  : '/login',
                request.url,
              ),
            );
        response.cookies.delete(COOKIE_NAME);
        return response;
      }
    } catch {
      // Invalid cookie — clear it
      const response = isPublicPath
        ? NextResponse.next()
        : NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
  }

  // Redirect to login if accessing protected route without session
  if (!isPublicPath && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    // Only add redirect if not coming from root
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing login with active session
  if (pathname === '/login' && hasSession) {
    try {
      const session = JSON.parse(sessionCookie.value);
      const dashboardRoute = getDashboardRoute(session.user.role);
      return NextResponse.redirect(new URL(dashboardRoute, request.url));
    } catch (error) {
      // If session is invalid, allow access to login
      console.error('Invalid session cookie:', error);
    }
  }

  // Role-based route protection
  if (hasSession && pathname.startsWith('/dashboard')) {
    try {
      const session = JSON.parse(sessionCookie.value);
      const userRole = session.user.role;

      // Check if user has permission to access this route
      if (!hasRoutePermission(userRole, pathname)) {
        // Redirect to user's appropriate dashboard
        const dashboardRoute = getDashboardRoute(userRole);
        return NextResponse.redirect(new URL(dashboardRoute, request.url));
      }
    } catch (error) {
      console.error('Invalid session cookie:', error);
      // If session is invalid, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Check if a user role has permission to access a specific route
 */
function hasRoutePermission(role: string, pathname: string): boolean {
  // Define which dashboard section each role can access
  const rolePermissions: Record<string, string> = {
    level_1: '/dashboard/super-admin',
    level_2: '/dashboard/admin',
    level_3: '/dashboard/moderator',
    level_4: '/dashboard/user',
    level_5: '/dashboard/readonly',
  };

  const allowedPath = rolePermissions[role];
  if (!allowedPath) return false;

  // Check if the current pathname starts with the allowed path
  return pathname.startsWith(allowedPath);
}

/**
 * Get the dashboard route based on user role
 */
function getDashboardRoute(role: string): string {
  const dashboardRoutes: Record<string, string> = {
    level_1: '/dashboard/super-admin/events/map',
    level_2: '/dashboard/admin/events/map',
    level_3: '/dashboard/moderator',
    level_4: '/dashboard/user',
    level_5: '/dashboard/readonly/events/map',
  };

  return dashboardRoutes[role] || '/dashboard/user';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
