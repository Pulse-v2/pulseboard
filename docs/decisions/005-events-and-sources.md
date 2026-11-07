# Events and sources decisions

## Events Explorer

The explorer reads tenant-scoped rows on the server through the signed-in
Supabase client, so row-level security remains the data boundary. Search,
filters, sort order, page, workspace, and selected event are represented in the
URL. This supports browser history and shareable views without a client cache;
each filter or page change makes a server request.

Pagination uses a fixed page size of 25 and an exact filtered count so users can
see the total and page count. This is straightforward for the current MVP but
an exact count can cost more as event volume grows. A cursor or approximate
count can replace it if the dataset warrants that trade-off.

Search currently matches event type. Source, status, and date are separate
filters. The event detail drawer uses an `eventId` query parameter and fetches
the record within the selected organization, so the drawer deep-links and
closing it preserves the active view.

## Data source management

Members can view source metadata; only organization admins can create, rename,
change the type, or activate/deactivate sources. Deactivation preserves source
history and prevents new event ingestion through the event API. Existing events
remain queryable. Deletion is omitted because event rows hold a restrictive
source reference and preserving historical attribution is safer for the MVP.

Mutations use the existing authenticated API and Zod validation. The trade-off
is a small client component for mutation feedback while initial data remains
server-rendered under RLS.
