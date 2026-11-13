-- ============================================================
-- Standards overhaul: bucket -> area template -> standard, with
-- client-side area *instances* -- so a client's checklist can apply
-- an area template more than once (e.g. 2 offices + 3 toilets for one
-- commercial client), each instance independently trackable and
-- overridable on a cleaning job.
--
-- Renames/restructures the flat standard_lists/standards model from
-- the cleaning-job-tracking initiative:
--   standard_lists              -> standard_buckets
--   standards                   -> area_template_standards (now
--                                   scoped to an area_templates row,
--                                   grouped from the old free-text
--                                   `area` column, instead of
--                                   directly to a list)
--   client_standard_assignments -> client_bucket_assignments
--   client_standard_overrides   -> client_area_standard_overrides
--                                   (now keyed by a client_areas
--                                   instance, not the whole client)
-- New: area_templates, client_areas.
--
-- Table/column renames keep every row's original id, so nothing
-- downstream needs remapping. The backfill below reproduces today's
-- implicit "one of each area" model exactly (one client_areas row per
-- area_templates row under the client's bucket) -- no existing
-- client's effective checklist changes as a result of this migration.
-- ============================================================

-- 1. Bucket (renamed from standard_lists; same shape/policies).
alter table public.standard_lists rename to standard_buckets;

comment on table public.standard_buckets is
  'Top-level standards category (e.g. "Commercial Cleaning", "Domestic Cleaning"), containing reusable area templates.';

-- 2. Area templates: reusable room/area definitions within a bucket
--    (e.g. "Office", "Toilet / Washroom").
create table public.area_templates (
  id          uuid primary key default gen_random_uuid(),
  bucket_id   uuid not null references public.standard_buckets (id) on delete cascade,
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index area_templates_bucket_id_idx on public.area_templates (bucket_id);

create trigger area_templates_set_updated_at
before update on public.area_templates
for each row execute function public.set_updated_at();

alter table public.area_templates enable row level security;

create policy "Staff can view area templates"
on public.area_templates for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

-- 3. area_template_standards: renamed from `standards`, now scoped to
--    an area template instead of directly to a bucket.
alter table public.standards rename to area_template_standards;
drop index if exists standards_standard_list_id_idx;

alter table public.area_template_standards add column area_template_id uuid references public.area_templates (id) on delete cascade;

-- Backfill: one area_templates row per distinct (bucket, area) pair
-- already present on the old standards rows (null area -> "General"),
-- then point every area_template_standards row at its template.
insert into public.area_templates (bucket_id, name, sort_order)
select standard_list_id, coalesce(area, 'General'), 0
from public.area_template_standards
group by standard_list_id, coalesce(area, 'General');

update public.area_template_standards ats
set area_template_id = at.id
from public.area_templates at
where at.bucket_id = ats.standard_list_id
  and at.name = coalesce(ats.area, 'General');

alter table public.area_template_standards alter column area_template_id set not null;
alter table public.area_template_standards drop column standard_list_id;
alter table public.area_template_standards drop column area;

create index area_template_standards_area_template_id_idx on public.area_template_standards (area_template_id);

-- 4. client_bucket_assignments: renamed from client_standard_assignments.
alter table public.client_standard_assignments rename to client_bucket_assignments;
alter table public.client_bucket_assignments rename column standard_list_id to bucket_id;

-- 5. client_areas: per-client instances of an area template -- this
--    is the mechanism that lets "Office" be applied twice for one
--    company. Every existing client_bucket_assignments row gets
--    exactly one client_areas row per area_templates row under its
--    bucket (label = template name) in the backfill below.
create table public.client_areas (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  area_template_id uuid not null references public.area_templates (id),
  label            text not null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index client_areas_client_id_idx on public.client_areas (client_id);

alter table public.client_areas enable row level security;

create policy "Staff can view client areas"
on public.client_areas for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

insert into public.client_areas (client_id, area_template_id, label, sort_order)
select cba.client_id, at.id, at.name, at.sort_order
from public.client_bucket_assignments cba
join public.area_templates at on at.bucket_id = cba.bucket_id;

-- 6. client_area_standard_overrides: renamed/remapped from
--    client_standard_overrides -- was keyed by (assignment, standard),
--    now keyed by (area instance, area-template standard). Every
--    client has exactly one client_areas row per template as of step
--    5, so this remap is unambiguous.
create table public.client_area_standard_overrides (
  id                         uuid primary key default gen_random_uuid(),
  client_area_id             uuid not null references public.client_areas (id) on delete cascade,
  area_template_standard_id  uuid not null references public.area_template_standards (id) on delete cascade,
  enabled                    boolean not null default true,
  unique (client_area_id, area_template_standard_id)
);

alter table public.client_area_standard_overrides enable row level security;

create policy "Staff can view client area standard overrides"
on public.client_area_standard_overrides for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

insert into public.client_area_standard_overrides (client_area_id, area_template_standard_id, enabled)
select ca.id, cso.standard_id, cso.enabled
from public.client_standard_overrides cso
join public.client_bucket_assignments cba on cba.id = cso.client_standard_assignment_id
join public.client_areas ca on ca.client_id = cba.client_id
join public.area_template_standards ats on ats.id = cso.standard_id and ats.area_template_id = ca.area_template_id;

drop table public.client_standard_overrides;

-- 7. cleaning_standards: extend the existing per-job snapshot with
--    which client_areas instance it came from. Historical rows
--    (created before this migration) stay null here; their existing
--    `area` text already renders fine standalone. New rows get both,
--    so a cleaner/supervisor looking at "Toilet 2" can tell it apart
--    from "Toilet 1"/"Toilet 3" even though all three came from the
--    same area template.
alter table public.cleaning_standards add column client_area_id uuid references public.client_areas (id) on delete set null;

comment on column public.cleaning_standards.area is
  'Snapshotted display label at checklist-creation time -- the area TEMPLATE name for jobs created before the standards-overhaul migration, the client-chosen area INSTANCE label (e.g. "Toilet 2") for jobs created after.';
