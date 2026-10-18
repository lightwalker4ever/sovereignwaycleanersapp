create table public.quote_bookings (
  id               uuid primary key default gen_random_uuid(),
  service          text not null check (service in ('end_of_tenancy', 'deep_cleaning', 'office_cleaning')),
  client_id        uuid not null references public.clients (id) on delete cascade,
  postcode         text not null,
  selected_inputs  jsonb not null,
  price_breakdown  jsonb not null,
  status           text not null default 'pending' check (status in ('pending', 'converted', 'declined')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index quote_bookings_status_idx on public.quote_bookings (status);
create index quote_bookings_created_at_idx on public.quote_bookings (created_at desc);
create index quote_bookings_client_id_idx on public.quote_bookings (client_id);

create trigger quote_bookings_set_updated_at
before update on public.quote_bookings
for each row execute function public.set_updated_at();

alter table public.quote_bookings enable row level security;
-- No policies at all, intentionally -- mirrors contact_requests/profiles.
-- Every read/write goes through createAdminClient(), gated at the
-- application level (submitBooking / assertIsRole(["admin"])).
