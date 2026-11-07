# 006 — Supabase Realtime for event updates

## Decision

Use Supabase Postgres Changes for organization-scoped subscriptions to the
`public.events` table. A browser subscribes only while Live is enabled. Each
change schedules a debounced `router.refresh()`, so the existing server queries
remain the source of truth for dashboard metrics, filtered event rows, and
pagination. The Live/Paused preference is stored per organization in
`localStorage`. Resuming also refreshes immediately to catch up on missed
changes.

The `events` table is added to the `supabase_realtime` publication by a
repeatable migration. Existing authenticated select policies continue to gate
which rows a user can receive. The component removes its channel, timers, and
browser listeners on pause and unmount. Connection status reports connecting,
live, and reconnecting; a retry control is available after a sustained error.

## Trade-offs

- **Postgres Changes vs Broadcast:** Postgres Changes integrates directly with
  committed database rows and avoids a second event publishing path. Broadcast
  can scale more efficiently for high fan-out, but needs triggers or explicit
  publishing and is unnecessary for the MVP's event volume.
- **Refresh vs client-side patching:** Refreshing the server-rendered data keeps
  sorting, filters, authorization, and aggregate RPC results consistent. It
  costs an additional server read after a burst; a short debounce groups nearby
  changes. A future high-volume implementation could update local cache or use
  rollups.
- **Per-organization local preference:** The setting follows the selected
  workspace across dashboard and event pages, including browser tabs, without
  adding a user-preference table. It is device-local rather than synced across
  devices.
- **RLS vs service credentials:** Browser subscriptions use the signed-in
  client's access and table policies. The service-role key is never used in
  browser code. Realtime visibility therefore follows database authorization.

## Operational notes

Apply migrations with `pnpm exec supabase migration up` (or rebuild the local
stack using `pnpm db:reset`). Run `pnpm simulate:events` with the app open to
exercise live updates. Pausing should stop subscription work; resuming performs
a catch-up refresh and reconnects. Supabase JS handles transient socket
reconnection, while the UI exposes its channel status and manual retry.
