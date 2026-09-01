-- HLL // Command Center v1
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.member_role as enum ('commander','co','squad_lead','player','recruit');
create type public.operation_status as enum ('draft','active','archived');
create type public.attendance_status as enum ('going','maybe','declined');
create type public.briefing_scope as enum ('global','squad','individual');

create table public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clan_members (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'player',
  callsign text,
  primary_role text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(clan_id,user_id)
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  number integer not null,
  name text not null,
  opponent text,
  map_name text,
  game_mode text default 'Warfare',
  side text,
  scheduled_at timestamptz,
  status public.operation_status not null default 'draft',
  commander_id uuid references public.profiles(id),
  strategy_status text not null default 'draft',
  attendance_total integer not null default 0,
  attendance_confirmed integer not null default 0,
  briefing_total integer not null default 0,
  briefing_published integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(clan_id,number)
);

create table public.squads (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  name text not null,
  color text,
  squad_lead_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.roster_assignments (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  squad_id uuid references public.squads(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text,
  attendance public.attendance_status default 'maybe',
  ready boolean default false,
  created_at timestamptz not null default now(),
  unique(operation_id,user_id)
);

create table public.strategy_phases (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  phase_no integer not null,
  title text not null,
  summary text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  unique(operation_id,phase_no)
);

create table public.strategy_tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.strategy_phases(id) on delete cascade,
  squad_id uuid references public.squads(id) on delete set null,
  title text not null,
  details text,
  priority integer default 2,
  created_at timestamptz not null default now()
);

create table public.stage_maps (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  phase_no integer not null,
  name text not null,
  map_image_url text,
  version integer not null default 1,
  published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(operation_id,phase_no)
);

create table public.map_objects (
  id uuid primary key default gen_random_uuid(),
  stage_map_id uuid not null references public.stage_maps(id) on delete cascade,
  object_type text not null,
  label text,
  x numeric not null,
  y numeric not null,
  width numeric,
  height numeric,
  rotation numeric default 0,
  squad_id uuid references public.squads(id) on delete set null,
  player_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  scope public.briefing_scope not null,
  squad_id uuid references public.squads(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete cascade,
  title text,
  body text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  check ((scope='global' and squad_id is null and player_id is null) or (scope='squad' and squad_id is not null and player_id is null) or (scope='individual' and player_id is not null))
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  event_type text not null default 'EVENT',
  starts_at timestamptz not null,
  ends_at timestamptz,
  operation_id uuid references public.operations(id) on delete set null,
  location text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.wiki_articles (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  category text not null,
  body text not null default '',
  tags text[] default '{}',
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.aars (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references public.operations(id) on delete cascade,
  result text,
  score text,
  worked text,
  failed text,
  squad_evaluations jsonb not null default '[]'::jsonb,
  lessons_learned jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Basic RLS: users can access rows for clans in which they are members.
alter table public.clans enable row level security;
alter table public.profiles enable row level security;
alter table public.clan_members enable row level security;
alter table public.operations enable row level security;
alter table public.squads enable row level security;
alter table public.roster_assignments enable row level security;
alter table public.strategy_phases enable row level security;
alter table public.strategy_tasks enable row level security;
alter table public.stage_maps enable row level security;
alter table public.map_objects enable row level security;
alter table public.briefings enable row level security;
alter table public.events enable row level security;
alter table public.wiki_articles enable row level security;
alter table public.aars enable row level security;

create or replace function public.is_clan_member(target_clan uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.clan_members cm where cm.clan_id=target_clan and cm.user_id=auth.uid() and cm.active=true);
$$;

create or replace function public.is_operation_member(target_operation uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.operations o
    join public.clan_members cm on cm.clan_id=o.clan_id
    where o.id=target_operation and cm.user_id=auth.uid() and cm.active=true
  );
$$;

-- Helper policies
create policy "profiles self read" on public.profiles for select using (id=auth.uid() or exists (select 1 from public.clan_members cm where cm.user_id=auth.uid() and cm.active=true));
create policy "profiles self update" on public.profiles for update using (id=auth.uid());
create policy "clan member read clan" on public.clans for select using (public.is_clan_member(id) or created_by=auth.uid());
create policy "clan members read" on public.clan_members for select using (public.is_clan_member(clan_id));
create policy "operations clan read" on public.operations for select using (public.is_clan_member(clan_id));
create policy "operations member write" on public.operations for all using (public.is_clan_member(clan_id)) with check (public.is_clan_member(clan_id));
create policy "squads operation access" on public.squads for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));
create policy "roster operation access" on public.roster_assignments for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));
create policy "strategy phase access" on public.strategy_phases for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));
create policy "strategy task access" on public.strategy_tasks for all using (exists (select 1 from public.strategy_phases sp where sp.id=phase_id and public.is_operation_member(sp.operation_id))) with check (exists (select 1 from public.strategy_phases sp where sp.id=phase_id and public.is_operation_member(sp.operation_id)));
create policy "stage map access" on public.stage_maps for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));
create policy "map objects access" on public.map_objects for all using (exists(select 1 from public.stage_maps sm where sm.id=stage_map_id and public.is_operation_member(sm.operation_id))) with check (exists(select 1 from public.stage_maps sm where sm.id=stage_map_id and public.is_operation_member(sm.operation_id)));
create policy "briefing access" on public.briefings for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));
create policy "event access" on public.events for all using (public.is_clan_member(clan_id)) with check (public.is_clan_member(clan_id));
create policy "wiki access" on public.wiki_articles for all using (public.is_clan_member(clan_id)) with check (public.is_clan_member(clan_id));
create policy "aar access" on public.aars for all using (public.is_operation_member(operation_id)) with check (public.is_operation_member(operation_id));

-- Auth -> profile creation trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Shared v1 application state.
-- The first production release stores the whole workspace JSON per clan so the
-- existing prototype UI becomes a shared multi-user app without requiring a
-- large migration. The relational tables above remain available for v2.
create table if not exists public.clan_app_state (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clan_app_state enable row level security;
create policy "clan state member access" on public.clan_app_state
  for all
  using (public.is_clan_member(clan_id))
  with check (public.is_clan_member(clan_id));

-- Allow an authenticated user to create their first clan.
drop policy if exists "authenticated create clan" on public.clans;
create policy "authenticated create clan" on public.clans
  for insert with check (auth.uid() is not null);

-- A newly authenticated user can create their own commander membership.
drop policy if exists "self create first membership" on public.clan_members;
create policy "self create first membership" on public.clan_members
  for insert with check (user_id = auth.uid() and role = 'commander');

-- Keep timestamps current when a workspace is written.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clan_app_state_touch on public.clan_app_state;
create trigger clan_app_state_touch before update on public.clan_app_state
for each row execute function public.touch_updated_at();
