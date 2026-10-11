"use client";

import { useState, useTransition } from "react";
import { Ban, Copy, Loader2, Mail, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  regeneratePassword,
  sendPasswordResetEmail,
  setUserActive,
} from "@/app/(dashboard)/dashboard/admin/actions";

export function UserActions({
  userId,
  email,
  initialActive,
}: {
  userId: string;
  email: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(label: string, action: () => Promise<void>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(label);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleRegenerate() {
    setError(null);
    setMessage(null);
    setNewPassword(null);
    startTransition(async () => {
      try {
        const password = await regeneratePassword(userId);
        setNewPassword(password);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to regenerate password");
      }
    });
  }

  function handleToggleActive() {
    const next = !active;
    run(next ? "Reactivated" : "Deactivated", async () => {
      await setUserActive(userId, next);
      setActive(next);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isPending}
          onClick={handleRegenerate}
          title="Generate a new password for this user"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate password
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isPending}
          onClick={() =>
            run("Reset email sent", () => sendPasswordResetEmail(email))
          }
          title="Email them a link to set their own new password"
        >
          <Mail className="h-3.5 w-3.5" />
          Send reset email
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isPending}
          onClick={handleToggleActive}
          title={active ? "Prevent this user from signing in" : "Allow this user to sign in again"}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : active ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          {active ? "Deactivate" : "Reactivate"}
        </Button>
      </div>

      {newPassword && (
        <p className="flex items-center gap-1.5 text-xs text-green-700">
          New password:{" "}
          <span className="font-mono font-medium">{newPassword}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(newPassword)}
            title="Copy"
            className="text-gray-400 hover:text-gray-600"
          >
            <Copy className="h-3 w-3" />
          </button>
        </p>
      )}
      {message && !newPassword && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
