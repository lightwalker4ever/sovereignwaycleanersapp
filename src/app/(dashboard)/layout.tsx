import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Defense in depth: middleware already redirects unauthenticated
  // requests away from /dashboard, but back/forward-cache can show a
  // stale page, so re-check here too.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold"
            style={{ color: "var(--color-brand)" }}
          >
            Sovereign Way Cleaners
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.full_name ?? user.email}
              {profile?.role && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                  {profile.role}
                </span>
              )}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
