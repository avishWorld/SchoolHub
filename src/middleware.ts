import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import type { UserRole } from "@/types/database";

/**
 * Route protection middleware.
 *
 * - Public routes: /, /join/*, /api/auth/*, /api/enrollment/request, /api/enrollment/invite/:token
 * - Role-specific routes: /student, /parent, /teacher, /admin
 * - API routes: require valid session (except public ones)
 */

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/student": ["student"],
  "/parent": ["parent"],
  "/teacher": ["teacher"],
  "/admin": ["admin"],
};

const PUBLIC_PATHS = [
  "/",
  "/api/auth/login",
  "/api/auth/logout",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/join/")) return true;
  if (pathname.startsWith("/api/enrollment/request")) return true;
  if (pathname.match(/^\/api\/enrollment\/invite\/[^/]+$/)) return true;
  if (pathname.startsWith("/api/notifications/unsubscribe")) return true;
  // Static assets and Next.js internals
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "לא מחובר. יש להתחבר עם קוד PIN." },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    // Expired or invalid session
    const response = pathname.startsWith("/api/")
      ? NextResponse.json(
          { error: "פג תוקף ההתחברות. יש להתחבר מחדש." },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/", request.url));

    // Clear the invalid cookie
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Check role-based access for dashboard routes
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(session.role as UserRole)) {
        // Redirect to their own dashboard
        const correctRoute = `/${session.role}`;
        return NextResponse.redirect(new URL(correctRoute, request.url));
      }
      break;
    }
  }

  // Attach session info to headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user_id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-school-id", session.school_id);
  requestHeaders.set("x-user-name", encodeURIComponent(session.name));

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
