import { z } from "zod";

/**
 * Staff roles an admin can assign -- "client" is deliberately excluded.
 * Clients always self-register (Google or email signup) and the
 * handle_new_user DB trigger always gives them that role automatically;
 * there's never a reason for an admin to hand it out or see it in the
 * staff-management UI.
 */
export const STAFF_ROLES = ["cleaner", "supervisor", "admin", "sales"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const staffRoleSchema = z.enum(STAFF_ROLES);

// "manager" is deliberately not in STAFF_ROLES (no longer assignable
// via the staff UI -- there's exactly one legacy test profile with
// this role, nothing assigns it going forward) but stays in the Role
// union so reading/comparing that one profile's existing role still
// type-checks, and the admin-dashboard access it already has keeps
// working.
export type Role = StaffRole | "manager" | "client";
