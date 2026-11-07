-- Authorization helpers live in an unexposed schema. SECURITY DEFINER is used
-- only to read membership rows without recursively re-entering their RLS policy.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    where membership.organization_id = p_organization_id
      and membership.user_id = (select auth.uid())
      and membership.role = any (p_allowed_roles)
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, text[]) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

create or replace function private.add_creator_as_org_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

revoke all on function private.add_creator_as_org_admin() from public, anon, authenticated;

create trigger organizations_add_creator_as_admin
after insert on public.organizations
for each row execute function private.add_creator_as_org_admin();

create or replace function private.update_data_source_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.update_data_source_updated_at() from public, anon, authenticated;

create trigger data_sources_set_updated_at
before update on public.data_sources
for each row execute function private.update_data_source_updated_at();

create or replace function private.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count bigint;
begin
  if old.role <> 'admin' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.role = 'admin'
     and new.organization_id = old.organization_id then
    return new;
  end if;

  -- Serialize concurrent removals so two admins can't both remove the last one.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(old.organization_id::text, 0)
  );

  select count(*)
  into admin_count
  from public.organization_members as membership
  where membership.organization_id = old.organization_id
    and membership.role = 'admin';

  if admin_count <= 1 then
    raise exception 'An organization must retain at least one admin.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_last_admin_removal() from public, anon, authenticated;

create trigger organization_members_keep_admin
before update of role, organization_id or delete
on public.organization_members
for each row execute function private.prevent_last_admin_removal();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.data_sources enable row level security;
alter table public.events enable row level security;

revoke all on table
  public.organizations,
  public.organization_members,
  public.data_sources,
  public.events
from anon;

revoke all on table
  public.organizations,
  public.organization_members,
  public.data_sources,
  public.events
from authenticated;

grant select on public.organizations to authenticated;
grant insert (name, slug) on public.organizations to authenticated;
grant update (name, slug) on public.organizations to authenticated;

grant select, insert, delete on public.organization_members to authenticated;
grant update (role) on public.organization_members to authenticated;

grant select, insert, delete on public.data_sources to authenticated;
grant update (name, source_type, status) on public.data_sources to authenticated;

grant select, insert on public.events to authenticated;

create policy organizations_read_member
  on public.organizations for select to authenticated
  using ((select private.is_org_member(id)));

create policy organizations_create_self
  on public.organizations for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy organizations_update_admin
  on public.organizations for update to authenticated
  using ((select private.has_org_role(id, array['admin']::text[])))
  with check ((select private.has_org_role(id, array['admin']::text[])));

create policy organization_members_read_member
  on public.organization_members for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy organization_members_create_admin
  on public.organization_members for insert to authenticated
  with check (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy organization_members_update_admin
  on public.organization_members for update to authenticated
  using (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  )
  with check (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy organization_members_delete_admin
  on public.organization_members for delete to authenticated
  using (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy data_sources_read_member
  on public.data_sources for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy data_sources_create_admin
  on public.data_sources for insert to authenticated
  with check (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy data_sources_update_admin
  on public.data_sources for update to authenticated
  using (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  )
  with check (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy data_sources_delete_admin
  on public.data_sources for delete to authenticated
  using (
    (select private.has_org_role(organization_id, array['admin']::text[]))
  );

create policy events_read_member
  on public.events for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy events_create_admin_or_analyst
  on public.events for insert to authenticated
  with check (
    (select private.has_org_role(
      organization_id,
      array['admin', 'analyst']::text[]
    ))
  );
