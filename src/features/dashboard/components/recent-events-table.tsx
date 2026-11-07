import { ArrowUpRight, Check, Clock3, X } from "lucide-react";

export type RecentEvent = {
  id: string;
  event_type: string;
  status: "success" | "failed" | "pending";
  occurred_at: string;
  source_id: string | null;
  duration_ms: number | null;
  value: number | string | null;
  currency: string | null;
};

type Props = {
  events: RecentEvent[];
  sourceNames: Map<string, string>;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatValue(value: number | string | null, currency: string | null) {
  if (value === null) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}

function StatusBadge({ status }: { status: RecentEvent["status"] }) {
  const styles = {
    success: "bg-emerald-50 text-emerald-800 ring-emerald-700/10",
    failed: "bg-rose-50 text-rose-800 ring-rose-700/10",
    pending: "bg-amber-50 text-amber-800 ring-amber-700/10",
  }[status];
  const Icon = status === "success" ? Check : status === "failed" ? X : Clock3;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ring-inset ${styles}`}>
      <Icon aria-hidden="true" className="size-3" />
      {status}
    </span>
  );
}

export function RecentEventsTable({ events, sourceNames }: Props) {
  if (!events.length) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <ArrowUpRight aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-800">No recent events</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
          Events matching this time period and source filter will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <caption className="sr-only">Recent operational events</caption>
        <thead>
          <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-400">
            <th className="px-5 py-3.5 font-semibold sm:px-6" scope="col">Event</th>
            <th className="px-4 py-3.5 font-semibold" scope="col">Source</th>
            <th className="px-4 py-3.5 font-semibold" scope="col">Status</th>
            <th className="px-4 py-3.5 font-semibold" scope="col">Time</th>
            <th className="px-4 py-3.5 text-right font-semibold" scope="col">Duration</th>
            <th className="px-5 py-3.5 text-right font-semibold sm:px-6" scope="col">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/90">
          {events.map((event) => (
            <tr className="transition-colors hover:bg-slate-50/70" key={event.id}>
              <td className="max-w-[250px] px-5 py-3.5 sm:px-6">
                <p className="truncate font-medium text-slate-800">{event.event_type}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{event.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3.5 text-xs text-slate-600">
                {event.source_id ? sourceNames.get(event.source_id) ?? "Unknown source" : "Direct API"}
              </td>
              <td className="px-4 py-3.5"><StatusBadge status={event.status} /></td>
              <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{formatTime(event.occurred_at)}</td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs tabular-nums text-slate-600">
                {event.duration_ms === null ? "—" : `${event.duration_ms.toLocaleString("en-US")} ms`}
              </td>
              <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-medium tabular-nums text-slate-700 sm:px-6">
                {formatValue(event.value, event.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
