# Database and security decisions

## Tenant boundary is enforced in PostgreSQL

Every customer-owned row carries `organization_id`. Row-level security (RLS)
is enabled on all four public tables, and policies default to denying users who
are not organization members. This keeps the boundary active for direct
Supabase client requests as well as server-side queries. The cost is extra
policy and index maintenance; every new tenant-owned table must receive both.

## Membership roles and helper functions

Roles are `admin`, `analyst`, and `viewer`. Members can read their
organization's data. Admins manage organization settings, memberships, and
sources; admins and analysts can insert events; events cannot be updated or
deleted through the authenticated API.

Membership checks use small `SECURITY DEFINER` functions in the unexposed
`private` schema. They use an empty `search_path`, fully qualified object names,
and restricted execution grants. This avoids recursive evaluation of the
membership RLS policy. The trade-off is that these functions require careful
review whenever authorization rules change.

The organization creator is inserted as its first admin by a trigger. Another
trigger prevents deleting or demoting the last admin and takes a transaction
advisory lock so concurrent removals cannot both succeed. This adds database
logic but protects an invariant that client-side validation cannot reliably
enforce.

## Tenant-safe references and event history

Events reference sources with a composite `(organization_id, source_id)`
foreign key. This prevents an event from one tenant from pointing at another
tenant's source, even if a caller supplies a valid source UUID. Source deletion
is restricted while events refer to it, preserving historical meaning. The
trade-off is that sources with event history must be marked inactive rather
than deleted.

Events are append-only for authenticated users. This supports reliable
operational history; future retention or correction workflows will need a
separately designed privileged path. JSON attributes are constrained to an
object. No GIN index is added yet because MVP queries filter on typed columns;
adding a broad JSON index would cost storage and write performance without a
current query that benefits from it.

## Dashboard aggregation RPCs

`dashboard_summary` and `dashboard_timeseries` are `SECURITY INVOKER`
functions, so caller grants and RLS remain in force. Both validate organization
membership, date bounds, and event status. The RPCs keep aggregate queries and
bucket generation in PostgreSQL, avoiding transfer of raw events to the
browser. Time-series intervals are selected from the requested span and capped
at 366 days to bound bucket generation. Success rate uses all matching events
(including pending events) as its denominator; duration averages only rows
with a duration.

The fixed aggregation surface is simpler and easier to optimize than exposing
arbitrary SQL filters, but new dashboard dimensions require a migration and
function update. Optional source, status, and event type filters are included
for the MVP.

## Initialization and verification

The ordered migrations in `supabase/migrations/` are the source of truth. Use
the Supabase CLI to apply them to the local stack. The pgTAP tests in
`supabase/tests/` exercise member visibility, non-member isolation, RPC access,
and viewer write restrictions. See the repository README for local and hosted
migration commands.
