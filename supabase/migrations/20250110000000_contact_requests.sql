-- ============================================================
-- Phase 2 of the Quote-and-Book initiative: persists every
-- public contact-form submission (previously only emailed) and
-- adds the sales notification email setting.
-- ============================================================

create table public.contact_requests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null,
  phone           text,
  service         text not null,
  property_type   text,
  preferred_date  text,
  preferred_time  text,
  message         text not null,
  status          text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index contact_requests_status_idx on public.contact_requests (status);
create index contact_requests_created_at_idx on public.contact_requests (created_at desc);

comment on table public.contact_requests is
  'Every public contact-form submission. property_type/preferred_date/preferred_time are stored as raw, unvalidated strings -- same trust level they had when only interpolated into an email. RLS is enabled with zero policies; every read/write goes through createAdminClient().';

create trigger contact_requests_set_updated_at
before update on public.contact_requests
for each row execute function public.set_updated_at();

alter table public.contact_requests enable row level security;
-- No policies at all, intentionally -- mirrors profiles. Every
-- read/write goes through createAdminClient(), gated at the
-- application level (assertIsRole / the public submit action).

insert into public.app_settings (key, value) values
  ('sales_notification_email', '"nuno.m.s.teixeira@gmail.com"');
