begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, aud, role, email, email_confirmed_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@pulseboard.test', now()),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'analyst@pulseboard.test', now()),
  ('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'viewer@pulseboard.test', now()),
  ('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'outsider@pulseboard.test', now());

insert into public.organizations (id, name, slug, created_by)
values
  ('20000000-0000-4000-8000-000000000001', 'Test Organization', 'test-organization', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'Other Organization', 'other-organization', '10000000-0000-4000-8000-000000000004');

insert into public.organization_members (organization_id, user_id, role)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'analyst'),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'viewer');

insert into public.data_sources (id, organization_id, name, source_type)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Test source', 'webhook');

insert into public.events (organization_id, source_id, event_type, status, duration_ms)
values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'checkout.completed', 'success', 120),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'checkout.failed', 'failed', 240);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select is((select count(*)::integer from public.organizations), 1, 'admin sees only their organization');
select is((select count(*)::integer from public.events), 2, 'organization member can read events');
select is((select total_events from public.dashboard_summary('20000000-0000-4000-8000-000000000001', now() - interval '1 day', now() + interval '1 day')), 2::bigint, 'summary RPC returns scoped event count');
select ok(
  (select count(*) between 60 and 61 from public.dashboard_timeseries('20000000-0000-4000-8000-000000000001', now() - interval '1 hour', now())),
  'time series returns minute buckets across an hour, including partial edge buckets'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select lives_ok(
  $$insert into public.events (organization_id, event_type, status) values ('20000000-0000-4000-8000-000000000001', 'analyst.write', 'success')$$,
  'analyst can insert events'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::integer from public.events), 3, 'viewer can read organization events');
select throws_ok(
  $$insert into public.events (organization_id, event_type, status) values ('20000000-0000-4000-8000-000000000001', 'viewer.write', 'success')$$,
  '42501', null, 'viewer cannot insert events'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
select is((select count(*)::integer from public.events), 0, 'non-member cannot read another organization events');
select throws_ok(
  $$select * from public.dashboard_summary('20000000-0000-4000-8000-000000000001', now() - interval '1 day', now())$$,
  '42501', 'Not authorized to read this organization.', 'dashboard RPC rejects non-members'
);

select * from finish();
rollback;
