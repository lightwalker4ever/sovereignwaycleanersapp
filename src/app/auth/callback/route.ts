import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkGhostClientToProfile } from "@/lib/clients";

/**
 * Supabase redirects here after Google sign-in with a `code` query
 * param. Exchanging it for a session is what actually logs the user
 * in (sets the auth cookies) -- signInWithOAuth() on its own only
 * gets them to Google and back.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Google sign-up never goes through login/actions.ts's signUp(),
      // so this is the only place to ensure a self-signup client gets
      // their clients row (password signup does this in signUp()
      // itself). Harmless/idempotent to run on every Google login, not
      // just the first.
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email, phone")
        .eq("id", data.user.id)
        .single();
      if (profile?.role === "client") {
        await linkGhostClientToProfile(data.user.id, profile.full_name, profile.email, profile.phone);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth");
  return NextResponse.redirect(loginUrl);
}
