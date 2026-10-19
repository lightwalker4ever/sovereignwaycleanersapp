import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth passthrough only -- no visual chrome. Every role now owns its
 * own full-page shell (AppShell for admin/supervisor, MobileShell for
 * cleaner/client, and sales/layout.tsx keeps the old simple header),
 * so a shared header here would either duplicate or conflict with
 * them. This layout's only job is the defense-in-depth auth check:
 * middleware already redirects unauthenticated requests away from
 * /dashboard, but back/forward-cache can show a stale page.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
