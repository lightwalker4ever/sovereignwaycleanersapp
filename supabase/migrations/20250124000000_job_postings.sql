create table public.job_postings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  summary     text not null,
  description text not null,
  location    text not null default 'Kent & surrounding areas',
  status      text not null default 'open' check (status in ('open', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger job_postings_set_updated_at
before update on public.job_postings
for each row execute function public.set_updated_at();

alter table public.job_postings enable row level security;
create policy "Anyone can view open job postings" on public.job_postings
  for select using (status = 'open');
-- This one DOES need a public select policy (unlike every other table in
-- this feature) -- the public Careers page reads it directly via the
-- anon client for a static-friendly page, same reasoning as
-- rate_card_items/location_multipliers in the quote system. Admin's own
-- management reads (including closed postings) still go through
-- createAdminClient().

create table public.job_applications (
  id              uuid primary key default gen_random_uuid(),
  job_posting_id  uuid not null references public.job_postings (id) on delete cascade,
  full_name       text not null,
  email           text not null,
  phone           text not null,
  message         text,
  cv_storage_path text,
  status          text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index job_applications_job_posting_id_idx on public.job_applications (job_posting_id);

create trigger job_applications_set_updated_at
before update on public.job_applications
for each row execute function public.set_updated_at();

alter table public.job_applications enable row level security;
-- No policies -- mirrors contact_requests exactly, every touchpoint goes
-- through createAdminClient().

insert into public.app_settings (key, value) values
  ('careers_pipeline_teaser', '"We''re growing — join our approved contractor network."');
