-- Phase A of the persisted-quote work: give every instant-quote cleaning
-- and tailored quote request a real, stored, searchable reference instead
-- of one computed ad hoc in application code each time it's displayed.
--
-- Kept identical to the format already emailed to customers today
-- (SWC- + the first 4 hex characters of the row's own id, uppercased),
-- so a reference a customer already has from a past email still resolves
-- to the right row after this migration runs. Not enforced unique: it's
-- a human-friendly lookup aid over the real primary key (id), not an
-- identifier in its own right, so a rare collision just means a search
-- surfaces two rows instead of one -- never a correctness problem.
alter table public.cleanings
  add column reference text generated always as ('SWC-' || upper(substr(id::text, 1, 4))) stored;

alter table public.quote_requests
  add column reference text generated always as ('SWC-' || upper(substr(id::text, 1, 4))) stored;

create index cleanings_reference_idx on public.cleanings (reference);
create index quote_requests_reference_idx on public.quote_requests (reference);
