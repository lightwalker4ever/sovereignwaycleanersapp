import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EmailPasswordSignInForm } from "@/components/auth/EmailPasswordSignInForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <Card className="w-full max-w-sm px-2 py-6 shadow-sm">
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-2 text-sm font-semibold" style={{ color: "var(--color-brand)" }}>
          Sovereign Way Cleaners
        </Link>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Sign in to book, manage, and track your cleans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <GoogleSignInButton redirectTo={redirectTo} />

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          Staff sign-in
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <EmailPasswordSignInForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
