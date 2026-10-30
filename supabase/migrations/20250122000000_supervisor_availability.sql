create table public.supervisor_availability (
  id             uuid primary key default gen_random_uuid(),
  supervisor_id  uuid not null references public.profiles (id) on delete cascade,
  day_of_week    smallint not null check (day_of_week between 0 and 6),
  created_at     timestamptz not null default now(),
  unique (supervisor_id, day_of_week)
);

create table public.supervisor_availability_exceptions (
  id             uuid primary key default gen_random_uuid(),
  supervisor_id  uuid not null references public.profiles (id) on delete cascade,
  date           date not null,
  type           text not null check (type in ('available', 'unavailable')),
  created_at     timestamptz not null default now(),
  unique (supervisor_id, date)
);

create index supervisor_availability_supervisor_id_idx on public.supervisor_availability (supervisor_id);
create index supervisor_availability_exceptions_supervisor_id_idx on public.supervisor_availability_exceptions (supervisor_id);

alter table public.supervisor_availability enable row level security;
alter table public.supervisor_availability_exceptions enable row level security;
-- No policies at all, intentionally -- mirrors cleaner_availability. Every
-- read/write goes through createAdminClient(), gated at the application
-- level (a supervisor edits only their own row via auth.uid(), admin reads
-- everything for the combined Schedule page and the advisory hints).
