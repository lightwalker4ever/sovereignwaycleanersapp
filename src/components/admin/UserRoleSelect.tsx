"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalize } from "@/lib/utils";
import { updateUserRole } from "@/app/(dashboard)/dashboard/admin/actions";

const ALL_ROLES = ["client", "cleaner", "supervisor", "manager", "admin"] as const;

export function UserRoleSelect({
  userId,
  initialRole,
}: {
  userId: string;
  initialRole: string;
}) {
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === role) return;
    const previous = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateUserRole(userId, next);
      } catch (e) {
        setRole(previous);
        setError(e instanceof Error ? e.message : "Failed to update role");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={handleChange} disabled={isPending}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue>{(value: string | null) => (value ? capitalize(value) : null)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {capitalize(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
