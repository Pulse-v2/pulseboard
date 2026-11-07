"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/events", label: "Events explorer", icon: BarChart3 },
  { href: "/sources", label: "Data sources", icon: Boxes },
];

export function DashboardNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  return (
    <nav aria-label={compact ? "Mobile workspace navigation" : "Main navigation"} className={compact ? "flex items-center gap-1 overflow-x-auto" : "mt-8 space-y-1"}>
      {!compact && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace</p>}
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        const target = organizationId ? `${href}?organizationId=${encodeURIComponent(organizationId)}` : href;
        return <Link aria-current={active ? "page" : undefined} className={`${compact ? "shrink-0 px-3 py-2 text-xs" : "px-3 py-2.5 text-sm"} flex items-center gap-2.5 rounded-lg font-medium transition ${active ? "bg-teal-50 font-semibold text-teal-900 ring-1 ring-inset ring-teal-900/[0.04]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`} href={target} key={href}><Icon aria-hidden="true" className="size-[17px] shrink-0" />{label}</Link>;
      })}
    </nav>
  );
}
