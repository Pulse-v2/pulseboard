import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Activity, ArrowRight, CalendarDays, CheckCircle2, CircleAlert, Clock3, Database, SlidersHorizontal, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventVolumeChart } from "@/features/dashboard/components/event-volume-chart";
import { RecentEventsTable, type RecentEvent } from "@/features/dashboard/components/recent-events-table";
import { RealtimeUpdates } from "@/features/realtime/components/realtime-updates";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type DashboardSummary = {
  total_events: number | string;
  successful_events: number | string;
  failed_events: number | string;
  pending_events: number | string;
  success_rate: number | string;
  average_duration_ms: number | string | null;
};
type TimeSeriesPoint = {
  bucket_start: string;
  successful_events: number;
  failed_events: number;
  total_events: number;
};
type RangeKey = "24h" | "7d" | "30d";

const rangeOptions: { value: RangeKey; label: string; durationMs: number }[] = [
  { value: "24h", label: "Last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "Last 7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "Last 30 days", durationMs: 30 * 24 * 60 * 60 * 1000 },
];

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatInteger(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : "0";
}

function formatPercent(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(number)}%`
    : "0%";
}

function formatDuration(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const duration = Number(value);
  if (!Number.isFinite(duration)) return "—";
  if (duration >= 1000) return `${(duration / 1000).toFixed(2)} s`;
  return `${Math.round(duration).toLocaleString("en-US")} ms`;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
  tone: "teal" | "blue" | "rose" | "amber";
}) {
  const iconTone = {
    teal: "bg-teal-50 text-teal-800",
    blue: "bg-blue-50 text-blue-800",
    rose: "bg-rose-50 text-rose-800",
    amber: "bg-amber-50 text-amber-800",
  }[tone];

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.025)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-lg ${iconTone}`}>
          <Icon aria-hidden="true" className="size-[17px]" />
        </span>
      </div>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">
        {value}
      </p>
      <p className="mt-2.5 text-xs text-slate-500">{helper}</p>
    </section>
  );
}

function EmptyWorkspace() {
  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-800">
        <Database aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">Create your first workspace</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
        Your account is ready. Add an organization to start collecting and exploring operational events.
      </p>
      <Link
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        href="/onboarding"
      >
        Set up workspace <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div className="mt-8 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900" role="alert">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Dashboard data could not be loaded</p>
        <p className="mt-1 text-rose-800">{message}</p>
      </div>
    </div>
  );
}

function DashboardFilters({
  organizations,
  sources,
  selectedOrganizationId,
  selectedSourceId,
  range,
}: {
  organizations: { id: string; name: string }[];
  sources: { id: string; name: string }[];
  selectedOrganizationId: string;
  selectedSourceId: string;
  range: RangeKey;
}) {
  return (
    <form action="/dashboard" className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4" method="get">
      {organizations.length > 1 && (
        <label className="min-w-0 flex-1 space-y-1.5 sm:max-w-[240px]">
          <span className="text-[11px] font-semibold text-slate-500">Workspace</span>
          <select className="field-input h-10 rounded-lg py-0" defaultValue={selectedOrganizationId} name="organizationId">
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>
      )}
      <label className="min-w-0 flex-1 space-y-1.5 sm:max-w-[200px]">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <CalendarDays aria-hidden="true" className="size-3.5" /> Date range
        </span>
        <select className="field-input h-10 rounded-lg py-0" defaultValue={range} name="range">
          {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="min-w-0 flex-1 space-y-1.5 sm:max-w-[240px]">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <SlidersHorizontal aria-hidden="true" className="size-3.5" /> Data source
        </span>
        <select className="field-input h-10 rounded-lg py-0" defaultValue={selectedSourceId} name="sourceId">
          <option value="">All sources</option>
          {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
        </select>
      </label>
      <button className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2" type="submit">
        Apply filters
      </button>
    </form>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const requestedRange = getParam(params, "range");
  const rangeOption = rangeOptions.find((option) => option.value === requestedRange) ?? rangeOptions[0];
  const requestedOrganizationId = getParam(params, "organizationId");
  const requestedSourceId = getParam(params, "sourceId") ?? "";
  const supabase = await createClient();

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("created_at", { ascending: true });

  if (organizationsError) {
    return <LoadError message="We could not load your workspace. Refresh the page and try again." />;
  }
  if (!organizations?.length) return <EmptyWorkspace />;

  const selectedOrganization = organizations.find((organization) => organization.id === requestedOrganizationId) ?? organizations[0];
  const { data: sourceRows, error: sourcesError } = await supabase
    .from("data_sources")
    .select("id, name")
    .eq("organization_id", selectedOrganization.id)
    .order("name", { ascending: true });

  if (sourcesError) {
    return <LoadError message="We could not load this workspace’s sources. Refresh the page and try again." />;
  }
  const sources = sourceRows ?? [];
  const selectedSourceId = sources.some((source) => source.id === requestedSourceId) ? requestedSourceId : "";
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - rangeOption.durationMs);
  const from = fromDate.toISOString();
  const to = toDate.toISOString();
  const rpcFilters = {
    p_organization_id: selectedOrganization.id,
    p_from: from,
    p_to: to,
    p_source_id: selectedSourceId || null,
    p_status: null,
    p_event_type: null,
  };

  let recentQuery = supabase
    .from("events")
    .select("id, source_id, event_type, status, occurred_at, duration_ms, value, currency")
    .eq("organization_id", selectedOrganization.id)
    .gte("occurred_at", from)
    .lt("occurred_at", to)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(8);
  if (selectedSourceId) recentQuery = recentQuery.eq("source_id", selectedSourceId);

  const [summaryResult, seriesResult, eventsResult] = await Promise.all([
    supabase.rpc("dashboard_summary", rpcFilters),
    supabase.rpc("dashboard_timeseries", rpcFilters),
    recentQuery,
  ]);

  if (summaryResult.error || seriesResult.error || eventsResult.error) {
    return <LoadError message="We could not load metrics for this period. Check your database connection and try again." />;
  }

  const summary = (summaryResult.data?.[0] ?? null) as DashboardSummary | null;
  const points = (seriesResult.data ?? []) as TimeSeriesPoint[];
  const events = (eventsResult.data ?? []) as RecentEvent[];
  const sourceNames = new Map(sources.map((source) => [source.id, source.name]));
  const updateTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(toDate);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800">
            <span aria-hidden="true" className="size-2 rounded-full bg-teal-600" />
            Operational overview
          </div>
          <h1 className="mt-2 text-[27px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[32px]">
            {selectedOrganization.name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Monitor event health, volume, and processing time.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap aria-hidden="true" className="size-3.5 text-teal-700" />
            Updated at {updateTime}
          </p>
          <RealtimeUpdates organizationId={selectedOrganization.id} />
        </div>
      </div>

      <DashboardFilters
        organizations={organizations}
        range={rangeOption.value}
        selectedOrganizationId={selectedOrganization.id}
        selectedSourceId={selectedSourceId}
        sources={sources}
      />

      <section aria-label="Key performance indicators" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Total events" value={formatInteger(summary?.total_events)} helper="Events in the selected period" tone="teal" />
        <MetricCard icon={CheckCircle2} label="Success rate" value={formatPercent(summary?.success_rate)} helper={`${formatInteger(summary?.successful_events)} successful events`} tone="blue" />
        <MetricCard icon={CircleAlert} label="Failed events" value={formatInteger(summary?.failed_events)} helper={`${formatInteger(summary?.pending_events)} pending events`} tone="rose" />
        <MetricCard icon={Clock3} label="Avg. processing time" value={formatDuration(summary?.average_duration_ms)} helper="Average reported duration" tone="amber" />
      </section>

      <section className="mt-5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]" aria-labelledby="event-volume-title">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900" id="event-volume-title">Event volume</h2>
            <p className="mt-1 text-xs text-slate-500">Event outcomes across the selected period</p>
          </div>
          <div aria-label="Chart legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal-700" />Successful</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500" />Failed</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500" />Pending</span>
          </div>
        </div>
        <div className="px-3 py-4 sm:px-6 sm:py-5">
          <EventVolumeChart points={points} range={rangeOption.value} />
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]" aria-labelledby="recent-events-title">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900" id="recent-events-title">Recent events</h2>
            <p className="mt-1 text-xs text-slate-500">Latest activity in the selected period</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {events.length} shown
          </span>
        </div>
        <RecentEventsTable events={events} sourceNames={sourceNames} />
      </section>
    </div>
  );
}

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading dashboard…</div>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
