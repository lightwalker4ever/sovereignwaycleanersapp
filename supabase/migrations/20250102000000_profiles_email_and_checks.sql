-- ============================================================
-- Add email to profiles, keep it in sync, and expose a safe
-- "does this email already have an account" check for the
-- progressive sign-in/sign-up flow.
-- ============================================================

-- 1. Add the column
alter table public.profiles add column email text;

-- 2. Populate it for every existing row (new rows get it via the
--    trigger update in step 3).
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is distinct from u.email;

-- 3. Keep new signups' profiles.email populated too
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. profiles.email is a denormalized copy of auth.users.email, kept
--    in sync only by the trigger above (new rows) and the
--    updateUserEmail admin action (which updates both together).
--    Guard it the same way `role` is guarded, so a user can't make
--    their own profile.email diverge from their real login email by
--    updating it directly through the client SDK.
create or replace function public.prevent_email_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only admins can change a profile email';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_email_change
before update on public.profiles
for each row execute function public.prevent_email_self_change();

-- 5. Safe existence check for the login page's progressive sign-in
--    flow: "does this email already have an account?" -- without
--    exposing anything else about that account. Callable by anyone,
--    including signed-out visitors (anon).
create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where lower(email) = lower(check_email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
