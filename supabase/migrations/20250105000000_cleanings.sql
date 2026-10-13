-- ============================================================
-- Phase 2 of the cleaning job tracking system: cleaning jobs,
-- admin-created, with a checklist snapshotted from the client's
-- currently-enabled standards at creation time.
-- ============================================================

create type public.cleaning_status as enum ('assigned', 'in_progress', 'in_review', 'completed');

create table public.cleanings (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id),
  cleaner_id     uuid not null references public.profiles (id),
  supervisor_id  uuid not null references public.profiles (id),
  status         public.cleaning_status not null default 'assigned',
  notes          text,
  started_at     timestamptz,
  submitted_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index cleanings_client_id_idx on public.cleanings (client_id);
create index cleanings_cleaner_id_idx on public.cleanings (cleaner_id);
create index cleanings_supervisor_id_idx on public.cleanings (supervisor_id);

create trigger cleanings_set_updated_at
before update on public.cleanings
for each row execute function public.set_updated_at();

alter table public.cleanings enable row level security;

create policy "Staff can view all cleanings"
on public.cleanings for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

-- cleaning_standards: the checklist, snapshotted (title/description
-- copied) from the client's currently-enabled standards when the
-- cleaning is created -- see src/lib/standards.ts's
-- resolveClientStandardState(). standard_id is kept for traceability
-- only; "on delete set null" so deleting a master standard later
-- doesn't disturb historical cleanings.
create table public.cleaning_standards (
  id                  uuid primary key default gen_random_uuid(),
  cleaning_id         uuid not null references public.cleanings (id) on delete cascade,
  standard_id         uuid references public.standards (id) on delete set null,
  title               text not null,
  description         text,
  sort_order          integer not null default 0,
  review_status       text not null default 'pending' check (review_status in ('pending', 'met', 'not_met')),
  supervisor_comment  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index cleaning_standards_cleaning_id_idx on public.cleaning_standards (cleaning_id);

create trigger cleaning_standards_set_updated_at
before update on public.cleaning_standards
for each row execute function public.set_updated_at();

alter table public.cleaning_standards enable row level security;

create policy "Staff can view all cleaning standards"
on public.cleaning_standards for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);
