create table public.contractor_applications (
  id                          uuid primary key default gen_random_uuid(),
  full_name                   text not null,
  phone                       text not null,
  address                     text not null,
  has_dbs                     boolean not null default false,
  has_liability_insurance     boolean not null default false,
  has_iso                     boolean not null default false,
  other_evidence_notes        text,
  years_experience            integer not null check (years_experience >= 0),
  areas_of_experience         jsonb not null default '[]'::jsonb,
  other_area_of_experience    text,
  business_structure          text not null check (business_structure in ('sole_trader', 'company')),
  company_employee_count      integer check (company_employee_count is null or company_employee_count >= 0),
  notes                       text,
  status                      text not null default 'submitted'
                               check (status in ('submitted', 'evidence_requested', 'under_review', 'approved', 'rejected')),
  resume_token                uuid not null default gen_random_uuid(),
  evidence_requested_at       timestamptz,
  evidence_notes               text,
  evidence_submitted_at        timestamptz,
  reviewed_by                 uuid references public.profiles (id),
  decided_at                  timestamptz,
  created_cleaner_profile_id  uuid references public.profiles (id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  reference                   text generated always as ('SWC-' || upper(substr(id::text, 1, 4))) stored
);

create index contractor_applications_status_idx on public.contractor_applications (status);
create unique index contractor_applications_resume_token_idx on public.contractor_applications (resume_token);
create index contractor_applications_reference_idx on public.contractor_applications (reference);

create trigger contractor_applications_set_updated_at
before update on public.contractor_applications
for each row execute function public.set_updated_at();

create table public.contractor_availability (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.contractor_applications (id) on delete cascade,
  day_of_week     smallint not null check (day_of_week between 1 and 6),
  period_key      text not null check (period_key in ('early', 'day', 'evening')),
  unique (application_id, day_of_week, period_key)
);

create index contractor_availability_application_id_idx on public.contractor_availability (application_id);

create table public.contractor_evidence_documents (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references public.contractor_applications (id) on delete cascade,
  storage_path       text not null,
  original_filename  text not null,
  created_at         timestamptz not null default now()
);

create index contractor_evidence_documents_application_id_idx on public.contractor_evidence_documents (application_id);

insert into storage.buckets (id, name, public) values ('recruitment-documents', 'recruitment-documents', false);

alter table public.contractor_applications enable row level security;
alter table public.contractor_availability enable row level security;
alter table public.contractor_evidence_documents enable row level security;
-- No policies on any of these, intentionally -- mirrors quote_requests/
-- quote_request_photos. Every read/write goes through createAdminClient(),
-- gated at the application level (public insert via the apply action,
-- everything else admin-only or token-gated).
