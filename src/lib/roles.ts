import { z } from "zod";

/**
 * Staff roles an admin can assign -- "client" is deliberately excluded.
 * Clients always self-register (Google or email signup) and the
 * handle_new_user DB trigger always gives them that role automatically;
 * there's never a reason for an admin to hand it out or see it in the
 * staff-management UI.
 */
export const STAFF_ROLES = ["cleaner", "supervisor", "manager", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const staffRoleSchema = z.enum(STAFF_ROLES);

export type Role = StaffRole | "client";
