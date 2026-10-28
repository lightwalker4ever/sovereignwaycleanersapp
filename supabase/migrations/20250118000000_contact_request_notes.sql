-- Mandatory action-taken notes when an enquiry is marked Contacted or
-- Closed. A small append-only log (not a single overwritten column)
-- since the request was for these to accumulate on the card as the
-- enquiry moves through multiple status changes over time.
create table public.contact_request_notes (
  id                  uuid primary key default gen_random_uuid(),
  contact_request_id  uuid not null references public.contact_requests (id) on delete cascade,
  status              text not null check (status in ('contacted', 'closed')),
  note                text not null,
  author_name         text,
  created_at          timestamptz not null default now()
);

create index contact_request_notes_request_id_idx on public.contact_request_notes (contact_request_id);

alter table public.contact_request_notes enable row level security;
-- No policies at all, intentionally -- mirrors contact_requests itself.
-- Every read/write goes through createAdminClient(), gated at the
-- application level (assertIsRole(["sales", "admin"])).
