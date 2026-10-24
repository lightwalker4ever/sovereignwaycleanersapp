-- Phase C of the persisted-quote work: a magic-link resume token,
-- generated once when a draft is first saved (Phase B), so the
-- "here's your quote" email can link straight back into the flow.
-- Nullable -- every existing row predates this. Not reused across an
-- update to the same draft (saveInstantQuoteDraft/saveTailoredQuoteDraft
-- keep it stable), so the one link already emailed stays valid for the
-- life of that draft. A partial unique index (rather than a plain
-- unique column) avoids any conflict between the many existing NULL
-- rows.
alter table public.cleanings add column resume_token text;
alter table public.quote_requests add column resume_token text;

create unique index cleanings_resume_token_idx
  on public.cleanings (resume_token) where resume_token is not null;
create unique index quote_requests_resume_token_idx
  on public.quote_requests (resume_token) where resume_token is not null;
