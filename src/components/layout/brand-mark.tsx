import { Activity } from "lucide-react";
import Link from "next/link";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link
      aria-label="Pulseboard home"
      className={`inline-flex items-center gap-2.5 font-semibold tracking-tight ${
        light ? "text-white" : "text-slate-950"
      }`}
      href="/"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-900/10">
        <Activity aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
      </span>
      <span className="text-[17px]">Pulseboard</span>
    </Link>
  );
}
