import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";

/**
 * Role gate for everything under /dashboard/client. Co-located with
 * the routes it protects rather than encoded in proxy.ts -- see
 * src/proxy.ts for why, same pattern as dashboard/cleaner/layout.tsx.
 */
export default async function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "client") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
