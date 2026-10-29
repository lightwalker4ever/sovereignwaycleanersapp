create table public.cleaner_service_areas (
  id          uuid primary key default gen_random_uuid(),
  cleaner_id  uuid not null references public.profiles (id) on delete cascade,
  match_type  text not null check (match_type in ('admin_district', 'region', 'postcode_area')),
  match_value text not null,
  created_at  timestamptz not null default now(),
  unique (cleaner_id, match_type, match_value)
);

create index cleaner_service_areas_cleaner_id_idx on public.cleaner_service_areas (cleaner_id);

alter table public.cleaner_service_areas enable row level security;
-- No policies at all, intentionally -- mirrors cleaner_availability. Every
-- read/write goes through createAdminClient(), gated at the application
-- level (admin-only; a cleaner with zero rows here covers every area).
