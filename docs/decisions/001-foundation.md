# Architecture decisions: foundation

## 1. Next.js App Router as the application boundary

**Decision:** Use Next.js App Router for server-rendered pages, server actions,
and future REST-style route handlers.

**Trade-off:** The application can keep auth and later data access on the server
without a separate backend service. Framework conventions and server/client
boundaries add some learning overhead, and the UI must avoid moving secrets or
authorization logic into client components.

## 2. Supabase SSR cookie sessions

**Decision:** Use `@supabase/ssr` with distinct browser and server clients. The
Next.js 16 `proxy.ts` refreshes sessions using verified claims; protected server
layouts also verify the current user.

**Trade-off:** Cookie-backed sessions support server rendering and route
protection. The SSR helper is the current Supabase-recommended path but its API
can evolve; refresh logic must be kept aligned with supported Next.js
conventions. Proxy checks are an early redirect, not a replacement for
authorization at data-access boundaries.

## 3. Postgres RLS as the tenant security boundary

**Decision:** Supabase/Postgres will own tenant-scoped records and enforce
organization access through Row Level Security. Server code will still verify
the authenticated user and requested organization.

**Trade-off:** RLS provides defense in depth for API and realtime access, but
policy functions and roles require careful design and testing. That work is
deferred to Phase 2, before any tenant data is added.

## 4. Public Supabase publishable key in the browser

**Decision:** The app uses the publishable key for user-scoped requests. The
service-role key is reserved for future local scripts and remains server-only.

**Trade-off:** A publishable key is not a secret; security depends on correct
Auth and RLS policies. The service-role key bypasses RLS and therefore must not
be used for normal browser or user-facing requests.

## 5. Explicit phased implementation

**Decision:** Build and check the foundation before introducing schema,
business APIs, dashboard queries, and realtime behavior.

**Trade-off:** Some screens show clearly labeled setup states until their
backing database features exist. This avoids presenting synthetic metrics as
live customer data and keeps infrastructure complexity tied to working MVP
features.
