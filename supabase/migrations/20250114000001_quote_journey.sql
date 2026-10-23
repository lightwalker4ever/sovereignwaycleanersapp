-- ============================================================
-- Quote journey, step 1: data model for the new /quote booking-
-- request flow (quote-handoff/QUOTE_HANDOFF.md).
--
-- Instant-price services (End of Tenancy, Deep Cleaning, Office
-- Cleaning) create a `cleanings` row directly, in the new
-- 'awaiting_confirmation' status -- the lifecycle becomes
-- Awaiting confirmation -> Scheduled -> In progress -> In review ->
-- (Changes requested) -> Completed, or Declined. cleaner_id and
-- supervisor_id are relaxed to nullable, since neither is known
-- until admin's "Confirm & schedule" action fills them in (at which
-- point the checklist is also generated, exactly like createCleaning()
-- already does for admin-created jobs). No existing row is affected
-- by any of this -- every existing cleaning already has both set.
--
-- Tailored services (Domestic, Commercial, Carpet, After Build,
-- Builders & Sparkle, Move In/Out) have no price or date yet, so
-- they don't fit the Cleaning model -- they get their own
-- quote_requests table instead, mirroring the existing
-- contact_requests/quote_bookings pattern (RLS enabled, zero
-- policies -- every read/write goes through createAdminClient(),
-- gated at the application level).
-- ============================================================

alter table public.cleanings
  alter column cleaner_id drop not null,
  alter column supervisor_id drop not null;

alter table public.cleanings
  add column requested_date date,
  add column requested_window text check (requested_window in ('morning', 'midday', 'afternoon')),
  add column is_flexible boolean not null default false,
  add column access_method text check (access_method in ('present', 'key_safe', 'agent_keys')),
  add column access_notes text,
  add column marketing_consent boolean not null default false,
  add column source text not null default 'admin' check (source in ('admin', 'website_quote')),
  add column property_answers jsonb,
  add column price_breakdown jsonb,
  add column decline_reason text;

comment on column public.cleanings.source is
  'How this cleaning was created: ''admin'' (New cleaning drawer, unchanged default) or ''website_quote'' (public /quote journey). Lets admin UI distinguish self-serve requests from staff-entered jobs.';
comment on column public.cleanings.requested_date is
  'The date the customer asked for at /quote step 3 -- distinct from scheduled_at, which admin sets (possibly to a different date/time) when confirming. Null for admin-created cleanings.';
comment on column public.cleanings.price_breakdown is
  'For source=''website_quote'' only: the QuoteBreakdown exactly as shown to the customer at submission time (lineItems/subtotal/VAT/total). Never recalculated later -- the record of what they were quoted.';
comment on column public.cleanings.property_answers is
  'For source=''website_quote'' only: the step-2 answers (EndOfTenancyInput / DeepCleaningInput / OfficeCleaningInput) as submitted, kept for admin reference and for generating the checklist at confirmation time.';

create table public.quote_requests (
  id                uuid primary key default gen_random_uuid(),
  -- Matches src/components/Services.tsx's existing `slug` values for
  -- the 6 non-instant-price services exactly, so no translation layer
  -- is needed between the service picker and this table.
  service           text not null check (service in ('domestic_cleaning', 'commercial_cleaning', 'carpet_cleaning', 'after_build_clean', 'builders_sparkle_clean', 'move_in_out')),
  client_id         uuid not null references public.clients (id) on delete cascade,
  postcode          text not null,
  answers           jsonb not null,
  notes             text,
  marketing_consent boolean not null default false,
  status            text not null default 'awaiting_quote' check (status in ('awaiting_quote', 'quoted', 'declined')),
  quoted_price      numeric(10, 2),
  quoted_at         timestamptz,
  decline_reason    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index quote_requests_status_idx on public.quote_requests (status);
create index quote_requests_client_id_idx on public.quote_requests (client_id);

create trigger quote_requests_set_updated_at
before update on public.quote_requests
for each row execute function public.set_updated_at();

alter table public.quote_requests enable row level security;
-- No policies at all, intentionally -- mirrors contact_requests and
-- quote_bookings. Every read/write goes through createAdminClient(),
-- gated at the application level.

insert into storage.buckets (id, name, public)
values ('quote-request-photos', 'quote-request-photos', false);

create table public.quote_request_photos (
  id                uuid primary key default gen_random_uuid(),
  quote_request_id  uuid not null references public.quote_requests (id) on delete cascade,
  storage_path      text not null,
  created_at        timestamptz not null default now()
);

create index quote_request_photos_request_id_idx on public.quote_request_photos (quote_request_id);

alter table public.quote_request_photos enable row level security;
-- No policies -- same reasoning as above; reads go through a
-- getSignedPhotoUrls()-style admin-only accessor, mirroring
-- cleaning-photos.

-- Step 1's "don't dead-end" email capture for a postcode the coverage
-- check didn't recognize. No admin UI reads this yet -- captured so
-- it isn't lost, surfaced later if it turns out to be worth building.
create table public.coverage_waitlist (
  id          uuid primary key default gen_random_uuid(),
  postcode    text not null,
  email       text not null,
  created_at  timestamptz not null default now()
);

alter table public.coverage_waitlist enable row level security;
-- No policies -- same reasoning as quote_requests/contact_requests.
