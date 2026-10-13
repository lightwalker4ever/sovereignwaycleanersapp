-- ============================================================
-- Phase 3 of the cleaning job tracking system: cleaner photo
-- evidence. Also tightens cleanings/cleaning_standards RLS from
-- "any staff" to per-assignment, now that non-admin roles get
-- their own dashboard reads (Phase 1/2's admin UI never needed
-- this -- it always went through the service-role client).
-- ============================================================

-- 1. Private storage bucket for cleaning photos. All access goes
--    through Server Actions (service-role client + an explicit
--    role/assignment/status check first) rather than storage.objects
--    RLS policies -- see the architecture note in the project plan.
insert into storage.buckets (id, name, public)
values ('cleaning-photos', 'cleaning-photos', false);

-- 2. cleaning_photos: the evidence itself. author_role distinguishes
--    a cleaner's own photo from a supervisor's replacement (Phase 4);
--    included now so this table doesn't need a second migration then.
create table public.cleaning_photos (
  id                     uuid primary key default gen_random_uuid(),
  cleaning_standard_id   uuid not null references public.cleaning_standards (id) on delete cascade,
  uploaded_by            uuid not null references public.profiles (id),
  author_role            text not null check (author_role in ('cleaner', 'supervisor')),
  storage_path           text not null,
  comment                text,
  created_at             timestamptz not null default now()
);

create index cleaning_photos_cleaning_standard_id_idx on public.cleaning_photos (cleaning_standard_id);

alter table public.cleaning_photos enable row level security;

create policy "Assigned staff can view cleaning photos"
on public.cleaning_photos for select
to authenticated
using (
  exists (
    select 1
    from public.cleaning_standards cs
    join public.cleanings c on c.id = cs.cleaning_id
    where cs.id = cleaning_photos.cleaning_standard_id
      and (c.cleaner_id = auth.uid() or c.supervisor_id = auth.uid() or public.is_admin())
  )
);

-- 3. Tighten cleanings/cleaning_standards from "any staff can view
--    all" to per-assignment -- real defense-in-depth now that
--    cleaner/supervisor dashboards read these directly (still
--    behind an application-level ownership check in each Server
--    Action; RLS is the backstop here, not the primary gate).
drop policy "Staff can view all cleanings" on public.cleanings;

create policy "Assigned staff can view their cleanings"
on public.cleanings for select
to authenticated
using (
  cleaner_id = auth.uid() or supervisor_id = auth.uid() or public.is_admin()
);

drop policy "Staff can view all cleaning standards" on public.cleaning_standards;

create policy "Assigned staff can view their cleaning standards"
on public.cleaning_standards for select
to authenticated
using (
  exists (
    select 1 from public.cleanings c
    where c.id = cleaning_standards.cleaning_id
      and (c.cleaner_id = auth.uid() or c.supervisor_id = auth.uid() or public.is_admin())
  )
);
