/**
 * Step 4 of the quote journey needs to accept "07… or +44…" per
 * quote-handoff/QUOTE_HANDOFF.md, but the shared requiredPhoneSchema
 * (src/lib/validation.ts) only accepts the 0-prefixed national format.
 * Rather than widen that shared schema's accepted formats for every
 * existing caller (signup, admin forms), this normalizes +44/0044 to a
 * leading 0 first and then runs the result through the existing,
 * unchanged schema -- same validation rule, just a wider local input.
 */
export function normalizeUkPhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+44")) return "0" + trimmed.slice(3);
  if (trimmed.startsWith("0044")) return "0" + trimmed.slice(4);
  return trimmed;
}
