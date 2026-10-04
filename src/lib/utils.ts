import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Capitalizes the first letter of a string (e.g. a role name for
 * display). Unlike the Tailwind `capitalize` class, this changes the
 * actual text content, not just how it's painted -- so it's correct
 * for copy-paste, screen readers, etc. too.
 */
export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
