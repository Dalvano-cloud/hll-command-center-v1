-- Only the account that created a clan may create its initial commander membership.
-- Clan invitations must use join_clan_by_invite(), which creates pending player memberships.
drop policy if exists "self create first membership" on public.clan_members;
create policy "self create first membership"
on public.clan_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'commander'::public.member_role
  and exists (
    select 1
    from public.clans c
    where c.id = clan_members.clan_id
      and c.created_by = (select auth.uid())
  )
);

-- Keep this policy scoped to signed-in users and avoid per-row auth function evaluation.
drop policy if exists "clan_squads_insert_command" on public.clan_squads;
create policy "clan_squads_insert_command"
on public.clan_squads
for insert
to authenticated
with check (
  (select public.is_clan_command(clan_id))
  and created_by = (select auth.uid())
);

drop policy if exists "authenticated create clan" on public.clans;
create policy "authenticated create clan"
on public.clans
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
