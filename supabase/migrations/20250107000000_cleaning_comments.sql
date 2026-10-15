-- ============================================================
-- Phase 5 of the cleaning job tracking system: client comments
-- on completed cleanings, and extending RLS so the owning client
-- can read their own cleaning (cleaner/supervisor/admin already
-- could, since Phase 3's tightening).
-- ============================================================

-- 1. cleaning_comments: a client's feedback on a completed cleaning.
--    Doubles as both the client's own comment thread and the admin's
--    cross-cleaning feedback list -- one table, not two.
create table public.cleaning_comments (
  id                  uuid primary key default gen_random_uuid(),
  cleaning_id         uuid not null references public.cleanings (id) on delete cascade,
  author_profile_id   uuid not null references public.profiles (id),
  body                text not null,
  created_at          timestamptz not null default now()
);

create index cleaning_comments_cleaning_id_idx on public.cleaning_comments (cleaning_id);

alter table public.cleaning_comments enable row level security;

create policy "Client, supervisor and admin can view cleaning comments"
on public.cleaning_comments for select
to authenticated
using (
  exists (
    select 1
    from public.cleanings c
    where c.id = cleaning_comments.cleaning_id
      and (
        c.supervisor_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.clients
          where clients.id = c.client_id and clients.profile_id = auth.uid()
        )
      )
  )
);

-- 2. Extend cleanings/cleaning_standards/cleaning_photos (tightened
--    to cleaner/supervisor/admin in Phase 3) so the owning client can
--    read their own too.
drop policy "Assigned staff can view their cleanings" on public.cleanings;

create policy "Assigned staff and client can view their cleanings"
on public.cleanings for select
to authenticated
using (
  cleaner_id = auth.uid()
  or supervisor_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.clients
    where clients.id = cleanings.client_id and clients.profile_id = auth.uid()
  )
);

drop policy "Assigned staff can view their cleaning standards" on public.cleaning_standards;

create policy "Assigned staff and client can view their cleaning standards"
on public.cleaning_standards for select
to authenticated
using (
  exists (
    select 1 from public.cleanings c
    where c.id = cleaning_standards.cleaning_id
      and (
        c.cleaner_id = auth.uid()
        or c.supervisor_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.clients
          where clients.id = c.client_id and clients.profile_id = auth.uid()
        )
      )
  )
);

drop policy "Assigned staff can view cleaning photos" on public.cleaning_photos;

create policy "Assigned staff and client can view cleaning photos"
on public.cleaning_photos for select
to authenticated
using (
  exists (
    select 1
    from public.cleaning_standards cs
    join public.cleanings c on c.id = cs.cleaning_id
    where cs.id = cleaning_photos.cleaning_standard_id
      and (
        c.cleaner_id = auth.uid()
        or c.supervisor_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.clients
          where clients.id = c.client_id and clients.profile_id = auth.uid()
        )
      )
  )
);
