import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <Card className="w-full max-w-sm rounded-2xl border-dash-border bg-dash-surface px-2 py-6 shadow-sm">
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[10px] bg-dash-brand-900 text-sm font-extrabold text-dash-gold">
          SW
        </Link>
        <CardTitle className="text-xl text-dash-ink">Sign in</CardTitle>
        <CardDescription className="text-dash-muted">
          Sign in to book, manage, and track your cleans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
