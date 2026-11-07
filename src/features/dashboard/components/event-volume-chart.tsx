type TimeSeriesPoint = {
  bucket_start: string;
  successful_events: number;
  failed_events: number;
  total_events: number;
};

type Props = {
  points: TimeSeriesPoint[];
  range: "24h" | "7d" | "30d";
};

const width = 760;
const height = 250;
const left = 38;
const right = 750;
const top = 18;
const bottom = 198;

function makeLine(values: number[], maximum: number) {
  if (!values.length) return "";
  return values.map((value, index) => {
    const x = left + (values.length === 1 ? 0 : (index / (values.length - 1)) * (right - left));
    const y = bottom - (value / maximum) * (bottom - top);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function makeArea(values: number[], maximum: number) {
  const line = makeLine(values, maximum);
  if (!line || !values.length) return "";
  const endX = values.length === 1 ? left : right;
  return `${line} L${endX},${bottom} L${left},${bottom} Z`;
}

function formatBucket(value: string, range: Props["range"]) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", range === "30d"
    ? { month: "short", day: "numeric" }
    : range === "7d"
      ? { weekday: "short" }
    : { hour: "numeric", minute: "2-digit" }).format(date);
}

export function EventVolumeChart({ points, range }: Props) {
  const maximumObserved = Math.max(0, ...points.map((point) => point.total_events));
  const maximum = Math.max(1, maximumObserved);
  const successful = points.map((point) => point.successful_events);
  const failed = points.map((point) => point.failed_events);
  const pending = points.map((point) => Math.max(0, point.total_events - point.successful_events - point.failed_events));
  const xLabels = points.length
    ? [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]]
    : [];

  if (!points.length || maximumObserved === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-xl bg-slate-50/70 px-6 text-center text-sm text-slate-500">
        No event activity in this period. New events will appear here.
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg
        aria-label="Successful, failed, and pending events over time"
        className="h-auto max-h-[270px] w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Event volume over time</title>
        <desc>Time series of successful, failed, and pending events for the selected period.</desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = top + (tick / 4) * (bottom - top);
          const value = Math.round(maximum * (1 - tick / 4));
          return (
            <g key={tick}>
              <line x1={left} x2={right} y1={y} y2={y} stroke="#e8edf0" strokeDasharray={tick === 4 ? undefined : "3 5"} />
              <text x={left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{value}</text>
            </g>
          );
        })}
        <path d={makeArea(successful, maximum)} fill="url(#successFill)" />
        <path d={makeLine(successful, maximum)} fill="none" stroke="#0f8f83" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makeLine(failed, maximum)} fill="none" stroke="#e56f65" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={makeLine(pending, maximum)} fill="none" stroke="#d6a448" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="successFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f8f83" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0f8f83" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {xLabels.map((point, index) => {
          const x = xLabels.length === 1 ? left : left + (index / (xLabels.length - 1)) * (right - left);
          return <text key={`${point.bucket_start}-${index}`} x={x} y={height - 12} textAnchor={index === 0 ? "start" : index === xLabels.length - 1 ? "end" : "middle"} fill="#94a3b8" fontSize="10">{formatBucket(point.bucket_start, range)}</text>;
        })}
      </svg>
    </div>
  );
}
