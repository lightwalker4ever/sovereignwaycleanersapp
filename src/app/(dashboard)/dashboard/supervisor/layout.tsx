import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";

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
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "supervisor") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
