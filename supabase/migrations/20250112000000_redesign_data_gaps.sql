-- ============================================================
-- Small, additive data-model gaps needed for the UI redesign
-- (design-handoff/DESIGN_HANDOFF.md's "Gaps the design assumes").
-- Every column here is nullable or defaulted -- no existing row or
-- query breaks.
-- ============================================================

-- 1. cleanings: a real scheduled date/time, separate from when the
--    admin happened to create the row -- today's schedule, the
--    calendar view and the New cleaning drawer's "When" section all
--    need this. Backfilled from created_at for existing rows, then
--    set NOT NULL since every cleaning created from now on always
--    collects a date/time.
alter table public.cleanings
  add column scheduled_at timestamptz,
  add column ends_at timestamptz,
  add column repeat_weekly boolean not null default false,
  add column redo_count integer not null default 0;

update public.cleanings set scheduled_at = created_at where scheduled_at is null;

alter table public.cleanings
  alter column scheduled_at set not null,
  alter column scheduled_at set default now();

create index cleanings_scheduled_at_idx on public.cleanings (scheduled_at);

comment on column public.cleanings.repeat_weekly is
  'Captured from the New cleaning drawer''s "Repeat weekly" checkbox. Not yet acted on -- no automation generates future cleanings from it. Future work.';
comment on column public.cleanings.redo_count is
  'Incremented each time a supervisor sends a cleaning back to the cleaner (see sendBackToCleaner). Powers the "first-time pass rate" KPI: a completed cleaning with redo_count = 0 passed review the first time.';

-- 2. clients: an address, shown throughout the admin UI (schedule
--    table, New cleaning drawer, clients list) and useful to the
--    cleaner on site.
alter table public.clients add column address text;

-- 3. standards: which area of the home/office a standard belongs to,
--    and whether a photo is required for it (most are; a few, like
--    "floors vacuumed", can be judged without one).
alter table public.standards
  add column area text,
  add column photo_required boolean not null default true;

-- 4. cleaning_comments: a star rating (1-5) alongside the existing
--    free-text comment, so "How did we do?" can capture both in one
--    submission. Nullable -- historical comments have no rating.
alter table public.cleaning_comments add column rating smallint check (rating between 1 and 5);
