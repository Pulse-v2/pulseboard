import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, Database } from "lucide-react";
import { DataSourcesManager } from "@/features/sources/components/data-sources-manager";
import { DataLoadError } from "@/components/ui/data-load-error";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function SourcesContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const requestedOrganizationId = Array.isArray(params.organizationId) ? params.organizationId[0] : params.organizationId;
  const supabase = await createClient();
  const { data: organizations, error: organizationsError } = await supabase.from("organizations").select("id, name").order("created_at", { ascending: true });

  if (organizationsError) return <DataLoadError message="Your workspace could not be loaded. Refresh the page and try again." />;
  const organization = organizations?.find((item) => item.id === requestedOrganizationId) ?? organizations?.[0];

  if (!organization) {
    return <section className="rounded-xl border border-slate-200 bg-white p-8 text-center"><Database aria-hidden="true" className="mx-auto size-6 text-slate-400" /><h1 className="mt-3 text-lg font-semibold text-slate-900">No workspace found</h1><p className="mt-1 text-sm text-slate-500">Create a workspace before adding data sources.</p><Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-teal-900" href="/onboarding">Set up workspace <ArrowRight className="size-4" /></Link></section>;
  }

  const [{ data: sources, error: sourcesError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("data_sources").select("id, name, source_type, status, created_at").eq("organization_id", organization.id).order("created_at", { ascending: false }),
    supabase.from("organization_members").select("role").eq("organization_id", organization.id).maybeSingle(),
  ]);

  if (sourcesError || membershipError) return <DataLoadError message="Data sources could not be loaded. Refresh the page and try again." />;

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-800">Workspace settings</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Data sources</h1><p className="mt-2 text-sm text-slate-600">Manage the systems that send events to {organization.name}.</p></div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50" href={`/events?organizationId=${organization.id}`}>Explore events <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <div className="mt-7"><DataSourcesManager canManage={membership?.role === "admin"} initialSources={sources ?? []} organizationId={organization.id} /></div>
    </>
  );
}

export default function SourcesPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<div className="space-y-5"><div className="h-8 w-48 animate-pulse rounded bg-slate-200" /><div className="h-40 animate-pulse rounded-xl bg-white" /><div className="h-80 animate-pulse rounded-xl bg-white" /></div>}><SourcesContent searchParams={searchParams} /></Suspense>;
}
