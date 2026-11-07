# Backend and demo data decisions

## Route Handlers are the application API layer

The App Router exposes explicit route handlers for organization creation and
listing, source listing and creation, event listing and ingestion, and dashboard
aggregation. Request and response bodies use JSON. The API validates body and
query fields with Zod and caps event lists and JSON request bodies to keep
untrusted input bounded.

All routes support Supabase cookie sessions for the web app and bearer access
tokens for local scripts or future external clients. The bearer token is
validated with Supabase Auth before the request-scoped database client uses it.
There is no service-role fallback in an API handler.

## Authorization is checked at both layers

The API verifies that the authenticated user belongs to the requested
organization and has the required role. Admins manage sources, admins and
analysts append events, and every member can read events and dashboard data.
RLS and grants remain enabled, so an API authorization mistake does not remove
the database tenant boundary. Organization creation takes only a name; the
creator identity comes from the verified session and the database trigger
creates its first admin membership.

The duplicate checks add a small query to requests, but make endpoint behavior
clear and allow API-specific role messages. The database remains authoritative.

## Demo seeder is local-only and repeatable

The seed script uses the Supabase service-role key only because it must create a
confirmed local Auth user and bulk-load synthetic data. It rejects URLs that
are not localhost, requires the key to be provided in the ignored local env
file, and never logs it. It upserts a known demo account, organization, and
sources, then replaces only that demo organization's event history with 720
synthetic records. This makes reruns repeatable without touching other
organizations.

The service-role key is not used by the simulator or API. The simulator signs
in with the demo account and writes through the same authenticated event API
used by the app, so its activity exercises validation, role checks, and RLS.

## Smoke verification

`pnpm verify:backend` performs an authenticated local source read, inserts a
uniquely named event, reads it back, and checks the dashboard summary RPC.
It is explicitly restricted to localhost URLs. The script intentionally leaves
its uniquely named verification event in the local demo organization so that
read-after-write behavior remains inspectable.
