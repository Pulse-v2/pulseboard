import { Suspense } from "react";
import { Activity, ArrowUpRight, Building2, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BrandMark } from "@/components/layout/brand-mark";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { signOutAction } from "@/features/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login?setup=1");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("created_at", { ascending: true });

  const organizationCount = organizations?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-slate-200/80 bg-white px-4 py-5 lg:flex">
        <div className="px-2">
          <BrandMark />
        </div>

        <Link
          aria-label="Open workspace overview"
          className="mt-9 block rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30"
          href={organizationCount ? "/dashboard" : "/onboarding"}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-800">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">Your workspace</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {organizationCount} {organizationCount === 1 ? "organization" : "organizations"}
              </p>
            </div>
            <ArrowUpRight aria-hidden="true" className="ml-auto size-4 text-slate-400" />
          </div>
        </Link>

        <DashboardNav />

        <div className="mt-auto border-t border-slate-100 px-1 pt-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {(user.email?.[0] ?? "U").toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600" title={user.email ?? "Signed-in user"}>
              {user.email ?? "Signed-in user"}
            </p>
          </div>
          <form action={signOutAction} className="mt-1">
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30" type="submit">
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-sm sm:px-8">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 lg:flex">
            <Activity aria-hidden="true" className="size-4 text-teal-700" />
            Operational workspace
          </div>
          <span className="hidden max-w-[240px] truncate text-xs text-slate-500 sm:block lg:hidden" title={user.email ?? undefined}>
            {user.email}
          </span>
          <form action={signOutAction} className="lg:hidden">
            <button aria-label="Sign out" className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/30" type="submit">
              <LogOut aria-hidden="true" className="size-4" />
            </button>
          </form>
        </header>
        <div className="border-b border-slate-200/80 bg-white px-3 py-2 lg:hidden">
          <DashboardNav compact />
        </div>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f7f8]" />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
