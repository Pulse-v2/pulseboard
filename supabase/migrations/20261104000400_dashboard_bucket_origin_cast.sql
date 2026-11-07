-- Replacing the function with an explicit timestamp cast removes a PL/pgSQL
-- assignment warning without rebuilding the local database.
create or replace function public.dashboard_timeseries(
  p_organization_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_source_id uuid default null,
  p_status text default null,
  p_event_type text default null
)
returns table (
  bucket_start timestamptz,
  successful_events bigint,
  failed_events bigint,
  total_events bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  bucket_interval interval;
  first_bucket timestamptz;
  last_bucket timestamptz;
  bucket_origin constant timestamptz := '2000-01-01 00:00:00+00'::timestamptz;
begin
  if p_organization_id is null
     or not private.is_org_member(p_organization_id) then
    raise exception 'Not authorized to read this organization.'
      using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'The date range must have a start before its end.'
      using errcode = '22023';
  end if;

  if p_to - p_from > interval '366 days' then
    raise exception 'The dashboard range cannot exceed 366 days.'
      using errcode = '22023';
  end if;

  if p_status is not null and p_status not in ('success', 'failed', 'pending') then
    raise exception 'Unsupported event status.' using errcode = '22023';
  end if;

  bucket_interval := case
    when p_to - p_from <= interval '1 hour' then interval '1 minute'
    when p_to - p_from <= interval '1 day' then interval '15 minutes'
    when p_to - p_from <= interval '7 days' then interval '1 hour'
    else interval '1 day'
  end;

  first_bucket := pg_catalog.date_bin(bucket_interval, p_from, bucket_origin);
  last_bucket := pg_catalog.date_bin(
    bucket_interval,
    p_to - interval '1 microsecond',
    bucket_origin
  );

  return query
  with buckets as (
    select generated.bucket_start
    from pg_catalog.generate_series(
      first_bucket,
      last_bucket,
      bucket_interval
    ) as generated(bucket_start)
  ), event_counts as (
    select
      pg_catalog.date_bin(bucket_interval, event_row.occurred_at, bucket_origin)
        as bucket_start,
      count(*) filter (where event_row.status = 'success')::bigint
        as successful_events,
      count(*) filter (where event_row.status = 'failed')::bigint
        as failed_events,
      count(*)::bigint as total_events
    from public.events as event_row
    where event_row.organization_id = p_organization_id
      and event_row.occurred_at >= p_from
      and event_row.occurred_at < p_to
      and (p_source_id is null or event_row.source_id = p_source_id)
      and (p_status is null or event_row.status = p_status)
      and (p_event_type is null or event_row.event_type = p_event_type)
    group by 1
  )
  select
    buckets.bucket_start,
    coalesce(event_counts.successful_events, 0)::bigint,
    coalesce(event_counts.failed_events, 0)::bigint,
    coalesce(event_counts.total_events, 0)::bigint
  from buckets
  left join event_counts using (bucket_start)
  order by buckets.bucket_start;
end;
$$;

revoke all on function public.dashboard_timeseries(
  uuid, timestamptz, timestamptz, uuid, text, text
) from public, anon;
grant execute on function public.dashboard_timeseries(
  uuid, timestamptz, timestamptz, uuid, text, text
) to authenticated;
