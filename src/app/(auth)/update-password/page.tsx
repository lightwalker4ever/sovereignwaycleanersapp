import { redirect } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reached either via a real recovery-email link (a session was just
  // established by /auth/callback) or not at all -- there's no public
  // "set any password" path here.
  if (!user) {
    redirect("/login");
  }

  return (
    <Card className="w-full max-w-sm px-2 py-6 shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
