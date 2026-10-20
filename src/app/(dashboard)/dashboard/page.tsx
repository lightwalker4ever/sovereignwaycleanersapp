import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";

const ROLE_HOME: Record<string, string> = {
  admin: "/dashboard/admin",
  manager: "/dashboard/admin",
  supervisor: "/dashboard/supervisor",
  cleaner: "/dashboard/cleaner",
  client: "/dashboard/client",
  sales: "/dashboard/sales",
};

/**
 * No role lands on a "Welcome + one button" page (design-handoff
 * DESIGN_HANDOFF.md principle 1) -- this route only ever exists to
 * send a just-signed-in user straight to their role's real home.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  redirect(ROLE_HOME[user.role ?? ""] ?? "/login");
}
