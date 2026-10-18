-- ============================================================
-- Phase 1 of the Quote-and-Book initiative: adds the 'sales'
-- role. Must be its own migration -- a new enum value isn't
-- visible to other statements in the same transaction that
-- added it (Postgres rule), so nothing else can reference
-- 'sales' until this has committed on its own.
-- ============================================================

alter type public.app_role add value 'sales';
