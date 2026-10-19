import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  redirect(ROLE_HOME[profile?.role ?? ""] ?? "/login");
}
