-- Cleaner-declared availability: a recurring weekly template, with
-- date-specific exceptions layered on top -- the same base+override
-- shape already used for client_standard_assignments/overrides. A
-- row's presence in the weekly table *is* "available" (no separate
-- enabled flag); an exception row for an exact date always wins over
-- the template for that date.
create table public.cleaner_availability (
  id          uuid primary key default gen_random_uuid(),
  cleaner_id  uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  window_key  text not null check (window_key in ('morning', 'midday', 'afternoon')),
  created_at  timestamptz not null default now(),
  unique (cleaner_id, day_of_week, window_key)
);

create table public.cleaner_availability_exceptions (
  id          uuid primary key default gen_random_uuid(),
  cleaner_id  uuid not null references public.profiles (id) on delete cascade,
  date        date not null,
  -- 'all_day' covers the whole date -- not a nullable column, since a
  -- Postgres unique constraint treats NULL as distinct from NULL (no
  -- "nulls not distinct" relied on here), which would silently let
  -- upsert-by-onConflict insert duplicate whole-day exception rows
  -- instead of updating the existing one.
  window_key  text not null check (window_key in ('morning', 'midday', 'afternoon', 'all_day')),
  type        text not null check (type in ('available', 'unavailable')),
  created_at  timestamptz not null default now(),
  unique (cleaner_id, date, window_key)
);

create index cleaner_availability_cleaner_idx on public.cleaner_availability (cleaner_id);
create index cleaner_availability_exceptions_cleaner_date_idx on public.cleaner_availability_exceptions (cleaner_id, date);

alter table public.cleaner_availability enable row level security;
alter table public.cleaner_availability_exceptions enable row level security;
-- No policies at all, intentionally -- mirrors contact_requests/profiles.
-- Every read/write goes through createAdminClient(), gated at the
-- application level (a cleaner may only edit their own row, checked
-- against their own auth.uid() in the Server Action; admin reads all).
