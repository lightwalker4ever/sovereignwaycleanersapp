"use client";

import { useActionState, useState } from "react";
import { Loader2, UserPlus, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capitalize } from "@/lib/utils";
import { STAFF_ROLES, type StaffRole } from "@/lib/roles";
import { inviteUser, type InviteState } from "@/app/(dashboard)/dashboard/admin/actions";

const initialState: InviteState = null;

function generatePassword() {
  // Readable-ish random password: no email-invite flow yet, so the
  // admin shares this directly with the new staff member.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("cleaner");
  const [password, setPassword] = useState(generatePassword);

  // Keep a copy of the credentials that were submitted so the success
  // message can still show them after the action completes -- by then
  // the admin may already be editing the fields for the next invite.
  const [lastSubmitted, setLastSubmitted] = useState<{ email: string; password: string } | null>(
    null
  );

  // Reset the form after a successful invite. Done during render
  // (React's documented "adjusting state during render" pattern,
  // comparing against the previous state object) rather than in a
  // useEffect, which would cause an extra cascading render for what's
  // really just a response to this same render's new `state`.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setFullName("");
      setEmail("");
      setPassword(generatePassword());
      setRole("cleaner");
    }
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setLastSubmitted({ email, password })}
      className="flex flex-col gap-4"
    >
      {/* Single column -- this form only ever renders inside the ~400px
          Add staff member drawer now, and Tailwind's sm:/lg: breakpoints
          respond to the viewport, not the drawer's own width, so a
          multi-column grid here would overflow regardless of how wide
          the browser window is. */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">Name</Label>
          <Input
            id="invite-name"
            name="fullName"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Temporary password</Label>
          <div className="flex gap-1.5">
            <Input
              id="invite-password"
              name="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Generate a new password"
              onClick={() => setPassword(generatePassword())}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <Select value={role} onValueChange={(v) => v && setRole(v as StaffRole)}>
            <SelectTrigger id="invite-role" className="h-8 w-full">
              <SelectValue>{(value: string | null) => (value ? capitalize(value) : null)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {capitalize(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Select's value isn't guaranteed to post via native FormData
              across base-ui versions, so mirror it into a hidden input. */}
          <input type="hidden" name="role" value={role} />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create account
        </Button>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && lastSubmitted && (
        <p className="text-sm text-green-700">
          Account created for <span className="font-medium">{lastSubmitted.email}</span>.
          Share this password with them to sign in:{" "}
          <span className="font-mono font-medium">{lastSubmitted.password}</span>
        </p>
      )}
    </form>
  );
}
