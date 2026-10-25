-- Customer-facing accept/decline for a priced tailored quote request
-- (the 6 non-instant services). Accepting creates a real `cleanings`
-- row at 'awaiting_confirmation' -- the exact same status instant
-- quotes land at -- so admin's existing "Confirm & schedule" flow
-- handles everything from there with no new admin UI.
alter table public.quote_requests
  drop constraint quote_requests_status_check,
  add constraint quote_requests_status_check
    check (status in ('draft', 'awaiting_quote', 'quoted', 'declined', 'converted'));

alter table public.quote_requests
  add column cleaning_id uuid references public.cleanings (id) on delete set null;

-- Backfill: resume_token was previously only generated for requests
-- that passed through the draft-save step. Every already-quoted
-- request needs one too, so the new accept/decline link works
-- immediately for quotes already sent before this migration.
update public.quote_requests set resume_token = gen_random_uuid()::text where resume_token is null;
