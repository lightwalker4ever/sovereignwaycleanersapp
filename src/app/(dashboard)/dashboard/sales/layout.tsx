import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { capitalize } from "@/lib/utils";
import { signOut } from "@/app/(dashboard)/actions";

/**
 * Role gate for everything under /dashboard/sales. Co-located with
 * the routes it protects rather than encoded in proxy.ts -- see
 * src/proxy.ts for why, same pattern as every other role's layout.
 *
 * Sales isn't covered by the design-handoff redesign, so this keeps
 * the plain header the shared (dashboard)/layout.tsx used to render
 * for every role -- that generic chrome moved here verbatim once the
 * other roles got their own full-page shells (AppShell/MobileShell),
 * so Sales keeps looking exactly as it did before.
 */
export default async function SalesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "sales") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold"
              style={{ color: "var(--color-brand)" }}
            >
              Sovereign Way Cleaners
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              <Link href="/dashboard/sales" className="hover:text-gray-900">
                Enquiries
              </Link>
              <Link href="/dashboard/sales/quote-requests" className="hover:text-gray-900">
                Quote Requests
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.fullName ?? user.email}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {capitalize(user.role ?? "")}
              </span>
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
