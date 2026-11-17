-- ============================================================
-- Standards catalog: a standard (e.g. "Empty bins") becomes a
-- reusable, searchable entity instead of text owned by exactly one
-- area template -- the same catalog entry can now be attached to any
-- number of area templates, independent of bucket.
--
-- area_template_standards keeps its id (so every existing reference
-- into it -- client_area_standard_overrides.area_template_standard_id,
-- cleaning_standards.standard_id -- needs no remapping) but becomes a
-- pure junction row: area_template_id + standard_id + sort_order,
-- instead of owning title/description/photo_required directly.
-- ============================================================

create table public.standards_catalog (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  photo_required boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.standards_catalog is
  'Reusable standards (e.g. "Empty bins"), independent of any bucket/area template -- attached to one or more area templates via area_template_standards.';

create trigger standards_catalog_set_updated_at
before update on public.standards_catalog
for each row execute function public.set_updated_at();

alter table public.standards_catalog enable row level security;

create policy "Staff can view standards catalog"
on public.standards_catalog for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

-- Backfill: one catalog row per existing area_template_standards row
-- (1:1, no dedup attempt here -- real-world duplicates converge
-- naturally once the catalog/autocomplete exists going forward).
-- `mapping` generates each new catalog id once and is referenced by
-- both the insert and the update below, so the pairing between a
-- source row and its new catalog row stays consistent within this one
-- statement -- two separate inserts ordered independently by a fresh
-- random id would NOT reliably pair back up.
alter table public.area_template_standards add column standard_id uuid references public.standards_catalog (id);

with mapping as (
  select id as ats_id, gen_random_uuid() as new_standard_id, title, description, photo_required
  from public.area_template_standards
), inserted_catalog as (
  insert into public.standards_catalog (id, title, description, photo_required)
  select new_standard_id, title, description, photo_required from mapping
  returning id
)
update public.area_template_standards ats
set standard_id = mapping.new_standard_id
from mapping
where ats.id = mapping.ats_id;

alter table public.area_template_standards alter column standard_id set not null;
alter table public.area_template_standards drop column title;
alter table public.area_template_standards drop column description;
alter table public.area_template_standards drop column photo_required;

create index area_template_standards_standard_id_idx on public.area_template_standards (standard_id);
