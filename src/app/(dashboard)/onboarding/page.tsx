import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Building2, ShieldCheck, Sparkles } from "lucide-react";
import { CreateWorkspaceForm } from "@/features/dashboard/components/create-workspace-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  await connection();
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);

  if (organizations?.length) redirect("/dashboard");

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 py-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-12">
      <section>
        <span className="grid size-12 place-items-center rounded-2xl bg-teal-100 text-teal-900">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">Workspace setup</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
          Bring your operations into focus.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
          Create an organization workspace to collect operational events, monitor service health, and understand what is happening across your systems.
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-teal-800 ring-1 ring-slate-200">
              <ShieldCheck aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Private to your organization</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Workspace data is isolated from other organizations.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-teal-800 ring-1 ring-slate-200">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Ready for your event streams</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Start with an empty dashboard and add data sources when you are ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-800">
            <Building2 aria-hidden="true" className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Create your workspace</h2>
            <p className="mt-0.5 text-xs text-slate-500">You will be its first administrator.</p>
          </div>
        </div>
        <CreateWorkspaceForm />
      </section>
    </div>
  );
}
