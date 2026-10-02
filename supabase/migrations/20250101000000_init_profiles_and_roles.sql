-- ============================================================
-- Phase 1: roles, profiles, auto-provisioning, RLS
-- ============================================================
--
-- Creates the foundational role model for the app:
--   - app_role enum: client, cleaner, supervisor, manager, admin
--   - profiles table: 1:1 with auth.users, holds role + basic info
--   - new auth.users rows automatically get a 'client' profile
--     (this is what makes Google sign-up always land as Client)
--   - RLS: users see/edit their own profile; admins see/edit all
--   - a role-escalation guard that blocks anyone but an admin (or
--     the backend service-role path) from changing the `role` column
--
-- Later phases (quotes, bookings, jobs, invoices) should reference
-- profiles(id), not auth.users directly.

-- 1. Role enum
create type public.app_role as enum ('client', 'cleaner', 'supervisor', 'manager', 'admin');

-- 2. Profiles table (1:1 with auth.users)
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'client',
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

comment on table public.profiles is
  'App-level user profile + role, 1:1 with auth.users. Later phases (quotes, bookings, jobs, invoices) should reference profiles(id), not auth.users directly.';

-- 3. Generic updated_at trigger (reusable by future tables)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4. Auto-create a profile (defaulting to 'client') whenever a new auth user appears
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. is_admin() helper — SECURITY DEFINER avoids RLS self-recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 6. Guard: only admins (or the backend service-role path) may change `role`
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only admins can change a profile role';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_change
before update on public.profiles
for each row execute function public.prevent_role_self_escalation();

-- 7. RLS — default deny, then explicit allows
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Admins can view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- No insert/delete policies: profile rows are only ever created by the
-- handle_new_user trigger (runs as SECURITY DEFINER, bypasses RLS) and
-- are never deleted directly by clients.
