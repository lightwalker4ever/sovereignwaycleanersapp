-- cleanings.service was constrained to only the 3 instant-price
-- services (20250114000002_cleanings_service_column.sql), but
-- acceptQuoteRequest() now also creates a cleaning from an accepted
-- tailored quote request, whose service is one of the other 6 slugs.
alter table public.cleanings
  drop constraint cleanings_service_check,
  add constraint cleanings_service_check
    check (service in (
      'end_of_tenancy', 'deep_cleaning', 'office_cleaning',
      'domestic_cleaning', 'commercial_cleaning', 'carpet_cleaning',
      'after_build_clean', 'builders_sparkle_clean', 'move_in_out'
    ));
