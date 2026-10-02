# Supabase

This directory holds the SQL migrations for the app's database, applied to a
Supabase project (Postgres + Auth).

## Applying a migration

**For now (no Supabase CLI set up yet):** open the Supabase dashboard →
**SQL Editor**, paste the contents of the migration file, and run it.

**Once the CLI is wired up (a later step):**
```
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## Migrations

- `20250101000000_init_profiles_and_roles.sql` — creates the `app_role` enum
  (`client`, `cleaner`, `supervisor`, `manager`, `admin`), the `profiles`
  table (1:1 with `auth.users`), a trigger that auto-creates a `client`
  profile for every new `auth.users` row, Row Level Security policies, and a
  guard that blocks anyone but an admin (or the backend service-role) from
  changing a profile's `role`.

  After applying it, verify by adding a test user in the dashboard's
  **Authentication → Users** screen and confirming a matching row appears in
  **Table Editor → profiles** with `role = client`.
