import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Role gate for everything under /dashboard/supervisor. Co-located
 * with the routes it protects rather than encoded in proxy.ts -- see
 * src/proxy.ts for why, same pattern as dashboard/cleaner/layout.tsx.
 */
export default async function SupervisorLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "supervisor") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
