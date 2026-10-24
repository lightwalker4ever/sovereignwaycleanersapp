-- Phase B of the persisted-quote work (continued from
-- 20250115000000_quote_draft_status.sql).
--
-- cleanings.postcode: captured at step 1, now needed before a client
-- row / full address exists (a draft is saved right after step 2,
-- long before step 4 collects the property address). Nullable --
-- every admin-created cleaning and every existing website_quote row
-- predates this column.
alter table public.cleanings add column postcode text;

-- quote_requests gains 'draft': answers given (so a price can
-- eventually be worked out and the row is worth keeping), but no
-- contact details collected yet -- ahead of the existing
-- 'awaiting_quote', which now means "fully submitted, waiting on
-- staff" rather than "submitted" full stop.
alter table public.quote_requests
  drop constraint quote_requests_status_check,
  add constraint quote_requests_status_check
    check (status in ('draft', 'awaiting_quote', 'quoted', 'declined'));
