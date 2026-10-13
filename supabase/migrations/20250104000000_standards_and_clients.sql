-- ============================================================
-- Phase 1 of the cleaning job tracking system: standards
-- configuration and a clients table decoupled from auth.users
-- (so admins can create "ghost" clients who never log in).
-- ============================================================

-- 1. clients: the canonical client entity for cleanings/standards.
--    profile_id is set for a self-signup (password or Google)
--    client, null for an admin-created ghost client with no login.
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references public.profiles (id) on delete set null,
  -- Nullable to match profiles.full_name's pattern (Google OAuth could
  -- in theory omit a name); enforced as required at the form level for
  -- admin-created ghost clients, and populated from signup data for
  -- self-signup clients.
  full_name   text,
  email       text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.clients is
  'Canonical client entity for cleanings/standards, decoupled from auth.users. profile_id is set for a self-signup client, null for an admin-created ghost client with no login.';

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy "Clients can view their own client row"
on public.clients for select
to authenticated
using (profile_id = auth.uid());

create policy "Staff can view all clients"
on public.clients for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

-- 2. standard_lists / standards: the editable master configuration.
create table public.standard_lists (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger standard_lists_set_updated_at
before update on public.standard_lists
for each row execute function public.set_updated_at();

alter table public.standard_lists enable row level security;

create policy "Staff can view standard lists"
on public.standard_lists for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

create table public.standards (
  id               uuid primary key default gen_random_uuid(),
  standard_list_id uuid not null references public.standard_lists (id) on delete cascade,
  title            text not null,
  description      text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index standards_standard_list_id_idx on public.standards (standard_list_id);

create trigger standards_set_updated_at
before update on public.standards
for each row execute function public.set_updated_at();

alter table public.standards enable row level security;

create policy "Staff can view standards"
on public.standards for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

-- 3. client_standard_assignments / client_standard_overrides: which
--    list applies to a client right now, and any per-client disables.
--    Only disabled standards need an override row -- absence means
--    enabled, so adding a new standard to a list is automatically
--    "on" for every client already assigned that list.
create table public.client_standard_assignments (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null unique references public.clients (id) on delete cascade,
  standard_list_id uuid not null references public.standard_lists (id),
  created_at       timestamptz not null default now()
);

alter table public.client_standard_assignments enable row level security;

create policy "Staff can view client standard assignments"
on public.client_standard_assignments for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);

create table public.client_standard_overrides (
  id                               uuid primary key default gen_random_uuid(),
  client_standard_assignment_id    uuid not null references public.client_standard_assignments (id) on delete cascade,
  standard_id                      uuid not null references public.standards (id) on delete cascade,
  enabled                          boolean not null default true,
  unique (client_standard_assignment_id, standard_id)
);

alter table public.client_standard_overrides enable row level security;

create policy "Staff can view client standard overrides"
on public.client_standard_overrides for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'client'
  )
);
