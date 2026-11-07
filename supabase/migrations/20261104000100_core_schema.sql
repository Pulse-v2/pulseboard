-- Pulseboard's tenant-scoped operational data model.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null default auth.uid()
    references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (length(btrim(name)) > 0),
  constraint organizations_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  constraint organization_members_role_check
    check (role in ('admin', 'analyst', 'viewer')),
  constraint organization_members_org_user_unique
    unique (organization_id, user_id)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  name text not null,
  source_type text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_sources_name_not_blank check (length(btrim(name)) > 0),
  constraint data_sources_type_not_blank check (length(btrim(source_type)) > 0),
  constraint data_sources_status_check check (status in ('active', 'inactive')),
  constraint data_sources_org_name_unique unique (organization_id, name),
  -- Supports the composite event FK that prevents cross-organization sources.
  constraint data_sources_org_id_unique unique (organization_id, id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  source_id uuid,
  event_type text not null,
  status text not null default 'pending',
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  duration_ms integer,
  value numeric(14, 2),
  currency text,
  correlation_id uuid,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_event_type_not_blank check (length(btrim(event_type)) > 0),
  constraint events_status_check check (status in ('success', 'failed', 'pending')),
  constraint events_duration_non_negative check (duration_ms is null or duration_ms >= 0),
  constraint events_currency_format check (
    currency is null or currency ~ '^[A-Z]{3}$'
  ),
  constraint events_attributes_object check (jsonb_typeof(attributes) = 'object'),
  constraint events_org_source_fk
    foreign key (organization_id, source_id)
    references public.data_sources (organization_id, id)
    on delete restrict
);

create index organization_members_user_org_idx
  on public.organization_members (user_id, organization_id);

create index organization_members_org_role_idx
  on public.organization_members (organization_id, role);

create index data_sources_org_created_idx
  on public.data_sources (organization_id, created_at desc);

create index events_org_occurred_idx
  on public.events (organization_id, occurred_at desc, id desc);

create index events_org_status_occurred_idx
  on public.events (organization_id, status, occurred_at desc, id desc);

create index events_org_source_occurred_idx
  on public.events (organization_id, source_id, occurred_at desc, id desc);

create index events_org_type_occurred_idx
  on public.events (organization_id, event_type, occurred_at desc, id desc);

comment on table public.organizations is
  'Tenant boundary for Pulseboard data; each creator is automatically made an admin.';

comment on table public.events is
  'Append-only operational events scoped to one organization. Keep attributes synthetic and non-personal.';
