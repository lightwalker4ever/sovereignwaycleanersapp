-- ============================================================
-- Quote journey, step 1: new cleaning_status enum values for the
-- /quote booking-request flow (quote-handoff/QUOTE_HANDOFF.md).
-- Kept in its own migration -- Postgres allows ALTER TYPE ... ADD
-- VALUE inside a transaction as long as the new value isn't used
-- within that same transaction, so the columns/data that reference
-- these values live in the next migration instead.
-- ============================================================

alter type public.cleaning_status add value 'awaiting_confirmation';
alter type public.cleaning_status add value 'declined';
