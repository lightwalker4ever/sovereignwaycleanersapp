import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_NAV = [
  { href: "/dashboard/admin", label: "Staff" },
  { href: "/dashboard/admin/clients", label: "Clients" },
  { href: "/dashboard/admin/standards", label: "Standards" },
  { href: "/dashboard/admin/cleanings", label: "Cleanings" },
  { href: "/dashboard/admin/feedback", label: "Feedback" },
] as const;

/**
 * Role gate for everything under /dashboard/admin. Co-located with the
 * routes it protects rather than encoded in proxy.ts -- see
 * src/proxy.ts for why.
 */
export default async function AdminLayout({
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b border-gray-200 text-sm font-medium text-gray-600">
        {ADMIN_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="border-b-2 border-transparent pb-2 hover:border-gray-300 hover:text-gray-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
