import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every matched request (see
 * src/middleware.ts for the matcher config) and returns both the
 * response (with refreshed cookies attached) and the current user,
 * if any, so the caller can make coarse redirect decisions.
 *
 * This is the standard Supabase SSR pattern: without this, a signed-in
 * user's session can silently expire while browsing pages that never
 * read the session server-side.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add logic between createServerClient and this
  // call — getUser() is what actually triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
