-- ============================================================
-- Quote journey, admin step: a queryable service column for
-- website-quote-sourced cleanings. price_breakdown/property_answers
-- only carry the service implicitly (via their shape), which is too
-- fragile to build the admin request drawer's display on.
-- ============================================================

alter table public.cleanings
  add column service text check (service in ('end_of_tenancy', 'deep_cleaning', 'office_cleaning'));

comment on column public.cleanings.service is
  'Set only for source=''website_quote'' rows -- which instant-price service was requested. Null for admin-created cleanings.';
