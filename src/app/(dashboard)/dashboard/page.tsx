import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Signed in as <span className="font-medium">{user.email}</span>,
          role <span className="font-medium capitalize">{profile?.role ?? "client"}</span>.
        </p>
      </div>

      {profile?.role === "admin" && (
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          Manage users
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
