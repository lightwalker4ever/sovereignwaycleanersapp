"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy } from "lucide-react";
import { RowMenu, type RowMenuItem } from "@/components/ui/RowMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalize } from "@/lib/utils";
import { STAFF_ROLES, type StaffRole } from "@/lib/roles";
import {
  updateUserName,
  updateUserEmail,
  updateUserRole,
  regeneratePassword,
  sendPasswordResetEmail,
  setUserActive,
} from "@/app/(dashboard)/dashboard/admin/actions";

const fieldClassName = "h-11 rounded-[10px] border-dash-input-border";

/**
 * Every per-row staff action from the old inline buttons (UserActions.tsx),
 * consolidated behind one RowMenu per design-handoff DESIGN_HANDOFF.md's
 * "Shared components" -> RowMenu. "Edit details" and "Change role" open
 * the same small dialog -- splitting name/email from role into two
 * separate dialogs wouldn't add anything real, just more clicks.
 */
export function StaffRowActions({
  userId,
  fullName,
  email,
  role,
  active,
}: {
  userId: string;
  fullName: string | null;
  email: string;
  role: StaffRole;
  active: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(fullName ?? "");
  const [emailValue, setEmailValue] = useState(email);
  const [roleValue, setRoleValue] = useState<StaffRole>(role);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const [isActive, setIsActive] = useState(active);
  const [message, setMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [isActing, startActing] = useTransition();

  function handleSave() {
    setSaveError(null);
    startSaving(async () => {
      try {
        if (name.trim() !== (fullName ?? "")) await updateUserName(userId, name.trim());
        if (emailValue.trim() !== email) await updateUserEmail(userId, emailValue.trim());
        if (roleValue !== role) await updateUserRole(userId, roleValue);
        setEditOpen(false);
        // revalidatePath alone doesn't refresh this already-rendered
        // client tree's props (e.g. the table's Role/Status cells,
        // rendered by the server-component parent) -- router.refresh()
        // re-fetches them in place without a full navigation.
        router.refresh();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function run(label: string, action: () => Promise<void>) {
    setMessage(null);
    setNewPassword(null);
    startActing(async () => {
      try {
        await action();
        setMessage(label);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const items: RowMenuItem[] = [
    { label: "Edit details", onClick: () => setEditOpen(true) },
    { label: "Change role", onClick: () => setEditOpen(true) },
    {
      label: "Send password reset email",
      onClick: () => run("Reset email sent", () => sendPasswordResetEmail(email)),
    },
    {
      label: "Generate temporary password",
      onClick: () =>
        run("", async () => {
          const pw = await regeneratePassword(userId);
          setNewPassword(pw);
        }),
    },
    {
      label: isActive ? "Deactivate" : "Reactivate",
      danger: isActive,
      onClick: () =>
        run(isActive ? "Deactivated" : "Reactivated", async () => {
          await setUserActive(userId, !isActive);
          setIsActive(!isActive);
        }),
    },
  ];

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <RowMenu items={items} ariaLabel={`More actions for ${fullName || email}`} />
        {isActing && <Loader2 className="h-4 w-4 animate-spin text-dash-muted" />}
      </div>
      {newPassword && (
        <span className="flex items-center gap-1.5 text-xs text-dash-brand-700">
          New password: <span className="font-mono font-semibold">{newPassword}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(newPassword)}
            title="Copy"
            className="text-dash-muted hover:text-dash-ink"
          >
            <Copy className="h-3 w-3" />
          </button>
        </span>
      )}
      {message && !newPassword && <span className="text-xs text-dash-brand-700">{message}</span>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit staff member</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <div className="flex flex-col gap-4 p-6">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-dash-ink">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className={fieldClassName} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-dash-ink">Email</Label>
              <Input
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                type="email"
                className={fieldClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-dash-ink">Role</Label>
              <Select value={roleValue} onValueChange={(v) => v && setRoleValue(v as StaffRole)}>
                <SelectTrigger className="h-11 w-full rounded-[10px] border-dash-input-border">
                  <SelectValue>{(v: string | null) => (v ? capitalize(v) : null)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {capitalize(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {saveError && <p className="text-sm text-dash-danger">{saveError}</p>}
          </div>
          <DialogFooter className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="h-11 rounded-[10px] border border-dash-input-border bg-white px-4 text-sm font-semibold text-dash-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
