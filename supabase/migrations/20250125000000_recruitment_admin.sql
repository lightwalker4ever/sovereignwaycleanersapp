-- Phase 1 of the Careers/Recruitment initiative captured a contractor
-- applicant's name, phone, and address, but never an email address --
-- a genuine gap, since every email this phase sends (evidence request,
-- approval, rejection) and the login account created on approval both
-- need one. Added here as NOT NULL (via a temporary default so this
-- backfills cleanly against any already-submitted test rows, then the
-- default is dropped so every future insert must supply a real one).
alter table public.contractor_applications
  add column email text not null default '';
alter table public.contractor_applications
  alter column email drop default;
