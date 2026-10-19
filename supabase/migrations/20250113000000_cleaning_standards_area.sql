-- ============================================================
-- Carries standards.area (added in the redesign's first data-gaps
-- migration) into the cleaning_standards snapshot too -- the
-- snapshot only copied title/description at creation time, so the
-- Supervisor review screen and the Cleaner job checklist (both show
-- "Standard N of M · <area>") had nowhere to read it from for any
-- cleaning, new or old.
-- ============================================================
alter table public.cleaning_standards add column area text;
