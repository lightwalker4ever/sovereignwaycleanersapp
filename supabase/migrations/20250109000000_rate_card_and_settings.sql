-- ============================================================
-- Phase 1 of the Quote-and-Book initiative: admin-editable
-- rate card, a generic app_settings table (first use:
-- contact_form_enabled), and an admin-maintained location
-- pricing multiplier table.
-- ============================================================

-- 1. rate_card_items: one generic, flat table. Rows are fixed by
--    the formulas that consume them (src/lib/rate-card.ts) -- the
--    admin UI only ever edits `value`, never adds/removes rows.
create table public.rate_card_items (
  id          uuid primary key default gen_random_uuid(),
  service     text not null check (service in ('general', 'end_of_tenancy', 'deep_cleaning', 'office_cleaning')),
  group_label text not null,
  key         text not null unique,
  label       text not null,
  sublabel    text,
  value       numeric(10, 4) not null check (value >= 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index rate_card_items_service_idx on public.rate_card_items (service);

comment on table public.rate_card_items is
  'Admin-editable rate card values. Rows are fixed at migration time (seeded below); only `value` is edited via the admin UI. App code in src/lib/rate-card.ts reads known `key` strings per formula -- never interpret this table generically.';

create trigger rate_card_items_set_updated_at
before update on public.rate_card_items
for each row execute function public.set_updated_at();

alter table public.rate_card_items enable row level security;

create policy "Anyone can view rate card items"
on public.rate_card_items for select
to anon, authenticated
using (true);

create policy "Admins can update rate card items"
on public.rate_card_items for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert/delete policies -- all writes go through
-- createAdminClient() in Server Actions (same pattern as
-- profiles/clients), and the admin UI only ever updates `value`.


-- 2. app_settings: a generic key/value settings store. First use is
--    contact_form_enabled; future toggles reuse this table rather
--    than each getting a dedicated boolean column somewhere.
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

comment on table public.app_settings is
  'Generic admin-editable settings store, keyed by name. First use: contact_form_enabled (jsonb boolean).';

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

create policy "Anyone can view app settings"
on public.app_settings for select
to anon, authenticated
using (true);

create policy "Admins can update app settings"
on public.app_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_settings (key, value) values
  ('contact_form_enabled', 'true');


-- 3. location_multipliers: unlike rate_card_items, this list
--    genuinely grows over time (admin adds a new area whenever they
--    want a different rate there), so admins get insert/delete too,
--    not just update.
create table public.location_multipliers (
  id          uuid primary key default gen_random_uuid(),
  match_type  text not null check (match_type in ('admin_district', 'region', 'postcode_area', 'default')),
  match_value text,
  multiplier  numeric(5, 4) not null default 1.0 check (multiplier > 0),
  label       text not null,
  priority    integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.location_multipliers is
  'Admin-maintained price multipliers by postcode-resolved area. Resolved at quote time (Phase 3) via postcodes.io -- not stored per-client ahead of time. Exactly one match_type=''default'' row must always exist as the fallback.';

create trigger location_multipliers_set_updated_at
before update on public.location_multipliers
for each row execute function public.set_updated_at();

alter table public.location_multipliers enable row level security;

create policy "Anyone can view location multipliers"
on public.location_multipliers for select
to anon, authenticated
using (true);

create policy "Admins can manage location multipliers"
on public.location_multipliers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.location_multipliers (match_type, match_value, multiplier, label, priority) values
  ('default', null, 1.0, 'Standard rate', 1000);


-- 4. Seed rate_card_items -- transcribed from the Rate Card (Admin)
--    spreadsheet tab.

-- sort_order is a continuous running count *within each service*
-- (not reset per group) so that ordering purely by (service,
-- sort_order) -- as src/lib/rate-card.ts's admin page query does --
-- naturally keeps each group's rows together in spreadsheet order,
-- rather than interleaving groups that both start at 0.
insert into public.rate_card_items (service, group_label, key, label, sublabel, value, sort_order) values
  -- GENERAL
  ('general', 'General', 'general.vat_rate', 'VAT Rate', 'Applied to all quotes (Sovereign Way is VAT registered)', 0.20, 0),

  -- END OF TENANCY -- base price
  ('end_of_tenancy', 'Base Price', 'eot.base.studio_1bed', 'Studio / 1 Bedroom', 'incl. 1 bathroom, 1 kitchen, 1 lounge', 185.00, 0),
  ('end_of_tenancy', 'Base Price', 'eot.base.2bed', '2 Bedroom', 'incl. 1 bathroom, 1 kitchen, 1 lounge', 245.00, 1),
  ('end_of_tenancy', 'Base Price', 'eot.base.3bed', '3 Bedroom', 'incl. 1 bathroom, 1 kitchen, 1 lounge', 305.00, 2),
  ('end_of_tenancy', 'Base Price', 'eot.base.4bed', '4 Bedroom', 'incl. 1 bathroom, 1 kitchen, 1 lounge', 385.00, 3),
  ('end_of_tenancy', 'Base Price', 'eot.base.5plus_bed', '5+ Bedroom', 'incl. 1 bathroom, 1 kitchen, 1 lounge', 465.00, 4),
  ('end_of_tenancy', 'Base Price', 'eot.extra_bathroom_fee', 'Extra Bathroom', 'per bathroom beyond the first', 35.00, 5),

  -- END OF TENANCY -- optional add-ons
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.carpet_cleaning', 'Carpet Cleaning', 'whole property', 65.00, 6),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.oven_clean', 'Interior Oven Deep Clean', 'per oven', 40.00, 7),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.fridge_freezer_clean', 'Fridge / Freezer Clean', 'per unit', 30.00, 8),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.washing_machine_clean', 'Washing Machine Clean', 'per unit', 20.00, 9),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.dishwasher_clean', 'Dishwasher Clean', 'per unit', 18.00, 10),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.microwave_clean', 'Microwave Clean', 'per unit', 12.00, 11),
  ('end_of_tenancy', 'Optional Add-ons', 'eot.addon.exterior_window_clean', 'Exterior Window Clean', 'whole property', 35.00, 12),

  -- DEEP CLEANING -- base rates
  ('deep_cleaning', 'Base Rates', 'deep.callout_fee', 'Callout / First Hour', 'fixed base charge per job', 40.00, 0),
  ('deep_cleaning', 'Base Rates', 'deep.per_bedroom', 'Per Bedroom', null, 22.00, 1),
  ('deep_cleaning', 'Base Rates', 'deep.per_toilet', 'Per Toilet', 'bathroom w/ bath or shower', 18.00, 2),
  ('deep_cleaning', 'Base Rates', 'deep.per_wc', 'Per WC', 'separate cloakroom', 10.00, 3),
  ('deep_cleaning', 'Base Rates', 'deep.per_kitchen', 'Per Kitchen', null, 30.00, 4),
  ('deep_cleaning', 'Base Rates', 'deep.per_lounge', 'Per Lounge / Reception Room', null, 18.00, 5),

  -- DEEP CLEANING -- appliance add-ons
  ('deep_cleaning', 'Appliance Add-ons', 'deep.addon.fridge', 'Fridge', null, 30.00, 6),
  ('deep_cleaning', 'Appliance Add-ons', 'deep.addon.oven', 'Oven', null, 40.00, 7),
  ('deep_cleaning', 'Appliance Add-ons', 'deep.addon.washing_machine', 'Washing Machine', null, 15.00, 8),
  ('deep_cleaning', 'Appliance Add-ons', 'deep.addon.microwave', 'Microwave', null, 10.00, 9),
  ('deep_cleaning', 'Appliance Add-ons', 'deep.addon.dishwasher', 'Dishwasher', null, 15.00, 10),

  -- OFFICE CLEANING -- rates
  ('office_cleaning', 'Rates', 'office.hourly_rate', 'Hourly Rate', 'per cleaner, per hour', 22.00, 0),
  ('office_cleaning', 'Rates', 'office.min_hours', 'Minimum Hours per Visit', 'applied if fewer hours are entered', 2.00, 1),
  ('office_cleaning', 'Rates', 'office.rate_per_sqm', 'Rate per sqm', 'per clean', 0.12, 2),
  ('office_cleaning', 'Rates', 'office.min_charge_sqm', 'Minimum Charge', 'floor for small offices (sqm option)', 45.00, 3),

  -- OFFICE CLEANING -- frequency multipliers (2 rows per frequency:
  -- the formula needs both the multiplier and the est. visits/month).
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.oneoff.multiplier', 'One-off / Ad-hoc', 'multiplier', 1.15, 4),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.oneoff.visits_per_month', 'One-off / Ad-hoc', 'est. visits/month', 1.00, 5),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.weekly.multiplier', 'Weekly', 'multiplier', 1.00, 6),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.weekly.visits_per_month', 'Weekly', 'est. visits/month', 4.33, 7),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.fortnightly.multiplier', 'Fortnightly', 'multiplier', 1.05, 8),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.fortnightly.visits_per_month', 'Fortnightly', 'est. visits/month', 2.17, 9),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.monthly.multiplier', 'Monthly', 'multiplier', 1.10, 10),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.monthly.visits_per_month', 'Monthly', 'est. visits/month', 1.00, 11),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.daily.multiplier', 'Daily (5x/week)', 'multiplier', 0.90, 12),
  ('office_cleaning', 'Frequency Multipliers', 'office.freq.daily.visits_per_month', 'Daily (5x/week)', 'est. visits/month', 21.67, 13);
