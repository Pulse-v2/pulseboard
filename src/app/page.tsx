import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CircleDot, Workflow } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { buttonVariants } from "@/components/ui/button";

const stages = ["Collect", "Understand", "Respond"];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
        <BrandMark />
        <nav aria-label="Account" className="flex items-center gap-3">
          <Link
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
            href="/login"
          >
            Sign in
          </Link>
          <Link className={buttonVariants({ className: "h-10 rounded-xl px-4" })} href="/signup">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-20 pt-12 sm:px-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900">
            <CircleDot aria-hidden="true" className="size-3.5 text-teal-600" />
            Operational analytics, made clear
          </div>
          <h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[68px]">
            Every event tells you something.
            <span className="mt-2 block text-teal-700">See the whole story.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Pulseboard brings activity from the systems you rely on into one
            focused workspace, so your team can spot issues and understand what
            happened next.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className={buttonVariants({ className: "h-11 rounded-xl px-5 text-sm" })} href="/signup">
              Create your workspace <ArrowRight aria-hidden="true" />
            </Link>
            <Link className={buttonVariants({ variant: "outline", className: "h-11 rounded-xl px-5 text-sm" })} href="/login">
              Sign in to Pulseboard
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Check aria-hidden="true" className="size-3.5 text-teal-700" />
              Built for multi-source operations
            </span>
            <span className="inline-flex items-center gap-2">
              <Check aria-hidden="true" className="size-3.5 text-teal-700" />
              Your data stays in your workspace
            </span>
          </div>
        </div>

        <div aria-label="Pulseboard event flow illustration" className="relative mx-auto w-full max-w-[560px]" role="img">
          <div className="absolute -inset-10 rounded-full bg-teal-100/70 blur-3xl" />
          <div className="relative rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_32px_80px_-40px_rgba(15,41,51,0.28)] sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Workflow aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">One connected view</p>
                  <p className="mt-0.5 text-xs text-slate-500">A simple path through complex activity</p>
                </div>
              </div>
              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Overview
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                { title: "Orders API", detail: "order.created", tone: "teal" },
                { title: "Payments API", detail: "payment.processed", tone: "blue" },
                { title: "Logistics Feed", detail: "shipment.dispatched", tone: "amber" },
              ].map((source) => (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5" key={source.title}>
                  <span
                    className={`size-2.5 rounded-full ${
                      source.tone === "teal"
                        ? "bg-teal-500"
                        : source.tone === "blue"
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{source.title}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{source.detail}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-4 text-slate-400" />
                </div>
              ))}
            </div>

            <div aria-hidden="true" className="my-4 flex justify-center">
              <span className="h-5 border-l border-dashed border-slate-300" />
            </div>
            <div className="rounded-2xl bg-[#102a32] p-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Pulseboard workspace</p>
                  <p className="mt-1 text-xs text-slate-300">Events become a useful operational picture.</p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-400/15 text-teal-200">
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                {stages.map((stage, index) => (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300 sm:text-xs" key={stage}>
                    <span className="grid size-5 place-items-center rounded-md bg-white/[0.08] text-teal-200">
                      {index + 1}
                    </span>
                    {stage}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="relative mt-4 text-center text-[11px] text-slate-400">
            Product illustration — no customer data shown
          </p>
        </div>
      </section>
    </main>
  );
}
