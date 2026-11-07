import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RealtimeUpdates } from "@/features/realtime/components/realtime-updates";
import { DataLoadError } from "@/components/ui/data-load-error";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type EventStatus = "success" | "failed" | "pending";
type SortKey = "occurred_at" | "event_type" | "status" | "duration_ms" | "value";
type EventRow = {
  id: string;
  source_id: string | null;
  event_type: string;
  status: EventStatus;
  occurred_at: string;
  received_at: string;
  duration_ms: number | null;
  value: number | string | null;
  currency: string | null;
  correlation_id: string | null;
  attributes: Record<string, unknown>;
};

const pageSize = 25;
const sortOptions: { value: SortKey; label: string }[] = [
  { value: "occurred_at", label: "Occurred at" },
  { value: "event_type", label: "Event type" },
  { value: "status", label: "Status" },
  { value: "duration_ms", label: "Duration" },
  { value: "value", label: "Value" },
];

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function makeHref(current: URLSearchParams, updates: Record<string, string | undefined>) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/events?${query}` : "/events";
}

function statusClass(status: EventStatus) {
  return {
    success: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
    failed: "bg-rose-50 text-rose-800 ring-rose-700/10",
    pending: "bg-amber-50 text-amber-800 ring-amber-700/10",
  }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function EventDrawer({ event, sourceName, closeHref }: { event: EventRow | null; sourceName: string; closeHref: string }) {
  if (!event) return null;
  const details: [string, string][] = [
    ["Event ID", event.id],
    ["Source", sourceName],
    ["Occurred at", formatDate(event.occurred_at)],
    ["Received at", formatDate(event.received_at)],
    ["Duration", event.duration_ms === null ? "Not reported" : `${event.duration_ms.toLocaleString()} ms`],
    ["Value", event.value === null ? "Not reported" : `${event.value}${event.currency ? ` ${event.currency}` : ""}`],
    ["Correlation ID", event.correlation_id ?? "Not provided"],
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35" role="presentation">
      <Link aria-label="Close event details" className="absolute inset-0 cursor-default" href={closeHref} />
      <aside aria-labelledby="event-detail-title" aria-modal="true" className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl" role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">Event detail</p>
            <h2 className="mt-2 break-all text-xl font-semibold tracking-tight text-slate-950" id="event-detail-title">{event.event_type}</h2>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(event.status)}`}>{event.status}</span>
          </div>
          <Link aria-label="Close event details" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30" href={closeHref}><X aria-hidden="true" className="size-4" /></Link>
        </div>
        <div className="space-y-7 px-6 py-6 sm:px-7">
          <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
            {details.map(([label, value]) => <div className="border-b border-slate-100 py-3" key={label}><dt className="text-[11px] font-medium text-slate-500">{label}</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{value}</dd></div>)}
          </dl>
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Attributes</h3>
            <pre className="mt-3 max-h-[45vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(event.attributes, null, 2)}</pre>
          </section>
        </div>
      </aside>
    </div>
  );
}

async function EventsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: organizations, error: organizationsError } = await supabase.from("organizations").select("id, name").order("created_at", { ascending: true });
  if (organizationsError) return <DataLoadError message="Workspaces could not be loaded. Refresh the page and try again." />;
  const organizationId = param(params, "organizationId");
  const organization = organizations?.find((item) => item.id === organizationId) ?? organizations?.[0];
  if (!organization) {
    return <section className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Create a workspace before exploring events.</section>;
  }

  const { data: sources, error: sourcesError } = await supabase.from("data_sources").select("id, name").eq("organization_id", organization.id).order("name");
  if (sourcesError) return <DataLoadError message="Data sources could not be loaded. Refresh the page and try again." />;
  const sourceNames = new Map((sources ?? []).map((source) => [source.id, source.name]));
  const query = new URLSearchParams();
  for (const key of ["organizationId", "search", "status", "sourceId", "from", "to", "sort", "order"]) {
    const value = param(params, key);
    if (value) query.set(key, value);
  }
  const rawPage = Number(param(params, "page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = (param(params, "search") ?? "").trim().slice(0, 100);
  const statusValue = param(params, "status");
  const status = ["success", "failed", "pending"].includes(statusValue ?? "") ? statusValue as EventStatus : "";
  const sourceId = sourceNames.has(param(params, "sourceId") ?? "") ? param(params, "sourceId")! : "";
  const sortValue = param(params, "sort");
  const sort = sortOptions.some((option) => option.value === sortValue) ? sortValue as SortKey : "occurred_at";
  const order = param(params, "order") === "asc" ? "asc" : "desc";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(param(params, "from") ?? "") ? param(params, "from")! : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(param(params, "to") ?? "") ? param(params, "to")! : "";
  const filters = new URLSearchParams(query);
  filters.set("organizationId", organization.id);
  if (search) filters.set("search", search);
  if (status) filters.set("status", status);
  if (sourceId) filters.set("sourceId", sourceId);
  if (from) filters.set("from", from);
  if (to) filters.set("to", to);
  filters.set("sort", sort);
  filters.set("order", order);
  filters.delete("page");
  filters.delete("eventId");

  let eventQuery = supabase.from("events")
    .select("id, source_id, event_type, status, occurred_at, received_at, duration_ms, value, currency, correlation_id, attributes", { count: "exact" })
    .eq("organization_id", organization.id)
    .order(sort, { ascending: order === "asc", nullsFirst: false })
    .order("id", { ascending: order === "asc" })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (search) eventQuery = eventQuery.ilike("event_type", `%${safeSearch(search)}%`);
  if (status) eventQuery = eventQuery.eq("status", status);
  if (sourceId) eventQuery = eventQuery.eq("source_id", sourceId);
  if (from) eventQuery = eventQuery.gte("occurred_at", `${from}T00:00:00.000Z`);
  if (to) {
    const exclusiveEnd = new Date(`${to}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    eventQuery = eventQuery.lt("occurred_at", exclusiveEnd.toISOString());
  }
  const [{ data: firstPageEvents, count, error }, selectedResult] = await Promise.all([
    eventQuery,
    param(params, "eventId")
      ? supabase.from("events").select("id, source_id, event_type, status, occurred_at, received_at, duration_ms, value, currency, correlation_id, attributes").eq("organization_id", organization.id).eq("id", param(params, "eventId")!).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  let events = firstPageEvents;
  if (!error && currentPage !== page) {
    const correctedQuery = supabase.from("events")
      .select("id, source_id, event_type, status, occurred_at, received_at, duration_ms, value, currency, correlation_id, attributes")
      .eq("organization_id", organization.id);
    if (search) correctedQuery.ilike("event_type", `%${safeSearch(search)}%`);
    if (status) correctedQuery.eq("status", status);
    if (sourceId) correctedQuery.eq("source_id", sourceId);
    if (from) correctedQuery.gte("occurred_at", `${from}T00:00:00.000Z`);
    if (to) {
      const exclusiveEnd = new Date(`${to}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      correctedQuery.lt("occurred_at", exclusiveEnd.toISOString());
    }
    const { data, error: correctedPageError } = await correctedQuery.order(sort, { ascending: order === "asc", nullsFirst: false }).order("id", { ascending: order === "asc" }).range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    if (correctedPageError) return <DataLoadError message="Events could not be loaded. Try refreshing the page." />;
    events = data;
  }
  if (error) {
    return <DataLoadError message="Events could not be loaded. Try refreshing the page." />;
  }
  if (selectedResult.error) return <DataLoadError message="Event details could not be loaded. Try refreshing the page." />;
  const selectedEvent = selectedResult.data as EventRow | null;
  const closeHref = `/events?${filters.toString()}${currentPage > 1 ? `&page=${currentPage}` : ""}`;

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">Workspace activity</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Events explorer</h1>
          <p className="mt-2 text-sm text-slate-600">Search and inspect events in {organization.name}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <RealtimeUpdates organizationId={organization.id} />
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" href={`/sources?organizationId=${organization.id}`}><Activity className="size-4 text-teal-800" /> Manage sources</Link>
        </div>
      </div>

      <form action="/events" className="mt-7 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:p-5" method="get">
        <input name="organizationId" type="hidden" value={organization.id} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 xl:col-span-2"><span className="text-[11px] font-semibold text-slate-500">Search event type</span><span className="relative block"><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="field-input h-10 pl-9" maxLength={100} name="search" placeholder="e.g. payment.authorized" defaultValue={search} /></span></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Status</span><select className="field-input h-10 py-0" defaultValue={status} name="status"><option value="">All statuses</option><option value="success">Success</option><option value="failed">Failed</option><option value="pending">Pending</option></select></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Data source</span><select className="field-input h-10 py-0" defaultValue={sourceId} name="sourceId"><option value="">All sources</option>{(sources ?? []).map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">From date</span><input className="field-input h-10" defaultValue={from} name="from" type="date" /></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">To date</span><input className="field-input h-10" defaultValue={to} name="to" type="date" /></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Sort by</span><select className="field-input h-10 py-0" defaultValue={sort} name="sort">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-500">Order</span><select className="field-input h-10 py-0" defaultValue={order} name="order"><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Dates use UTC. Search matches event type.</p>
          <div className="flex items-center gap-2"><Link className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900" href={`/events?organizationId=${organization.id}`}>Clear filters</Link><button className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" type="submit"><Search aria-hidden="true" className="size-3.5" /> Apply filters</button></div>
        </div>
      </form>

      <section aria-labelledby="events-table-title" className="mt-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-slate-900" id="events-table-title">All events</h2><p className="mt-1 text-xs text-slate-500">{total.toLocaleString()} matching {total === 1 ? "event" : "events"}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="size-3.5" /> Page {currentPage} of {pageCount}</span></div>
        {events?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><caption className="sr-only">Filtered events for {organization.name}</caption><thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Event</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Occurred at</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Value</th><th className="px-4 py-3"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y divide-slate-100">{(events as EventRow[]).map((event) => { const href = makeHref(filters, { eventId: event.id, page: currentPage > 1 ? String(currentPage) : undefined }); return <tr className="transition hover:bg-slate-50/70" key={event.id}><td className="px-5 py-3.5"><Link className="font-semibold text-slate-900 hover:text-teal-800 focus-visible:outline-none focus-visible:underline" href={href}>{event.event_type}</Link><p className="mt-1 font-mono text-[10px] text-slate-400">{event.id.slice(0, 8)}</p></td><td className="px-4 py-3.5 text-slate-600">{event.source_id ? sourceNames.get(event.source_id) ?? "Unknown source" : "Direct API"}</td><td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${statusClass(event.status)}`}>{event.status}</span></td><td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">{formatDate(event.occurred_at)}</td><td className="px-4 py-3.5 whitespace-nowrap text-xs tabular-nums text-slate-600">{event.duration_ms === null ? "—" : `${event.duration_ms.toLocaleString()} ms`}</td><td className="px-4 py-3.5 whitespace-nowrap text-xs tabular-nums text-slate-600">{event.value === null ? "—" : `${event.value}${event.currency ? ` ${event.currency}` : ""}`}</td><td className="px-4 py-3.5"><Link aria-label={`View ${event.event_type} details`} className="inline-flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800" href={href}><ArrowRight aria-hidden="true" className="size-4" /></Link></td></tr>; })}</tbody></table></div> : <div className="px-6 py-16 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><Search aria-hidden="true" className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-slate-900">No events match these filters</h3><p className="mt-1 text-sm text-slate-500">Adjust the search or clear some filters to see more activity.</p></div>}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><span className="text-xs text-slate-500">Showing {total ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, total)} of {total.toLocaleString()}</span><div className="flex items-center gap-2"><Link aria-disabled={currentPage <= 1} className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium ${currentPage <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} href={makeHref(filters, { page: currentPage > 2 ? String(currentPage - 1) : undefined })}><ArrowLeft className="size-3.5" /> Previous</Link><Link aria-disabled={currentPage >= pageCount} className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium ${currentPage >= pageCount ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} href={makeHref(filters, { page: currentPage < pageCount ? String(currentPage + 1) : undefined })}>Next <ArrowRight className="size-3.5" /></Link></div></div>
      </section>
      {selectedEvent && <EventDrawer event={selectedEvent} sourceName={selectedEvent.source_id ? sourceNames.get(selectedEvent.source_id) ?? "Unknown source" : "Direct API"} closeHref={closeHref} />}
    </>
  );
}

export default function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<div className="space-y-5"><div className="h-8 w-56 animate-pulse rounded bg-slate-200" /><div className="h-52 animate-pulse rounded-xl bg-white" /><div className="h-96 animate-pulse rounded-xl bg-white" /></div>}><EventsContent searchParams={searchParams} /></Suspense>;
}
