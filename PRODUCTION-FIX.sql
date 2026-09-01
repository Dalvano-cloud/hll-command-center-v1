-- Run this once in Supabase SQL Editor for an existing HLL Command Center database.
-- It is safe to run more than once.

alter table public.clans
  add column if not exists created_by uuid references auth.users(id);

-- The web app stores its shared v1 workspace in this table.
create table if not exists public.clan_app_state (
  clan_id uuid primary key references public.clans(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clan_app_state enable row level security;

drop policy if exists "clan state member access" on public.clan_app_state;
create policy "clan state member access"
on public.clan_app_state
for all
using (public.is_clan_member(clan_id))
with check (public.is_clan_member(clan_id));

-- Allow a new authenticated user to create the clan that they own.
drop policy if exists "authenticated create clan" on public.clans;
create policy "authenticated create clan"
on public.clans
for insert
to authenticated
with check (created_by = auth.uid());

-- Allow the creator to see their new clan before membership is queried.
drop policy if exists "creator read clan" on public.clans;
create policy "creator read clan"
on public.clans
for select
to authenticated
using (created_by = auth.uid() or public.is_clan_member(id));

-- First membership: the creator becomes commander.
drop policy if exists "self create first membership" on public.clan_members;
create policy "self create first membership"
on public.clan_members
for insert
to authenticated
with check (user_id = auth.uid() and role = 'commander');

-- Make the profile trigger reliable for new signups.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable realtime updates for the shared workspace if it is not already enabled.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clan_app_state'
  ) then
    alter publication supabase_realtime add table public.clan_app_state;
  end if;
exception when undefined_object then
  -- Realtime publication is not available; the app still works without live updates.
  null;
end $$;
