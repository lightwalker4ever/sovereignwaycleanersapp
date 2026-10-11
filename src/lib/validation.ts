import { z } from "zod";

/**
 * Shared validation rules, used by both the public contact form
 * (src/actions/contact.ts) and the auth/admin forms, so "the same
 * validations as the website" stays true by construction rather than
 * by two copies happening to agree.
 */

export const nameSchema = z
  .string()
  .regex(/^[A-Za-z]+(?:[ '][A-Za-z]+)*$/, "Invalid name provided");

export const emailSchema = z.string().email("Invalid email provided");

function isValidUkPhone(v: string) {
  const n = v.replace(/[\s\-().]/g, "");
  return (
    /^0\d{10}$/.test(n) &&
    /^0[123789]/.test(n) &&
    !/^0770[0-9]/.test(n) &&
    !/(\d)\1{4,}/.test(n) &&
    !/01234567/.test(n)
  );
}

/** Optional phone field (e.g. the contact form). */
export const phoneSchema = z
  .string()
  .optional()
  .refine((v) => !v || isValidUkPhone(v), "Invalid phone number");

/** Required phone field (e.g. account signup). */
export const requiredPhoneSchema = z.string().refine(
  isValidUkPhone,
  "Invalid phone number. Please provide a valid UK phone number"
);

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");
