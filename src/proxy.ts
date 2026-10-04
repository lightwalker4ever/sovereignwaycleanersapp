import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs on every request (except static assets, matcher below) to keep
 * the Supabase session cookie refreshed, plus a coarse, "logged in or
 * not" redirect:
 *   - unauthenticated -> /dashboard/** redirects to /login
 *   - authenticated   -> /login redirects to /dashboard
 *
 * This does NOT check roles. Role-based access (e.g. who can see
 * /dashboard/admin) is handled in that segment's own layout.tsx, co-located
 * with the routes it protects rather than as a growing path->role map here.
 *
 * Named/filed as "proxy" rather than "middleware" per Next.js 16's
 * renamed convention (middleware.ts is deprecated as of this version).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)",
  ],
};
